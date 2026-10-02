"""Evaluators of the SystemVerilog dialect: compute an expression by IEEE 1800's rules, in Python.

`Evaluators.OfAny(expression, scope)` evaluates in a `Scope(variables, functions)` and gives a `Domains.Logic` for an
integral result or a float for a real one. A variable's type is its value's: a `Logic` its own, a bool a `bit`, an int
an `integer` (or a `longint` beyond 32 bits), a float a `real`, a string a vector of its bytes (in UTF-8), and a Basic typed value
(`Domains.Value`) of an integer domain a 2-state vector of its width and signedness, of bits a 2-state vector, of
std_logic a `logic` bit (U, X, W and - as x, L as 0, H as 1), and of a binary IEEE 754 format a `real` or `shortreal`.
IEEE 1800's rules apply:

- Sizing: an operator's operands are context-determined or self-determined (11.6); the context-determined ones are
  extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
  context-determined operands are), and zero-extended otherwise. A real operand makes the expression real.
- 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the bitwise
  operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and `!=?`
  treat x and z in the right operand as wildcards. Division by zero gives x.
- `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
  otherwise x); a conditional with an x condition merges its operands bit by bit.
- `inside` holds when the value equals (`==?`) an item, an element of an array among the items, or lies in a span;
  otherwise it is x when a comparison is.
- A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a 2-state
  type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), and an integer becomes a real.
- `select` gives a bit (x out of range, or for an x index) or an array's element; `range` bits `[msb:lsb]`.
- System functions: `$signed`, `$unsigned`, `$clog2`, `$bits`, `$countones`, `$onehot`, `$onehot0`, `$isunknown`;
  other functions are the scope's, and nothing else.
- Array methods: `size()` is an `int`; `sum()`, `product()`, `and()`, `or()` and `xor()` reduce the items, or the
  values of a `with` clause, in their common type by `+`, `*`, `&`, `|` and `^` (x and z as those operators take
  them); of no items they give 0, 1, `1'b1`, `1'b0` and `1'b0`. `min()` and `max()` give a queue of the least or
  greatest item (none when there are none), and `unique()` a queue of the first of each set of identical (`===`) items.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Dialects.Basic import Domains as BD, Ieee754
from mbse.Expressions.Framework import Errors, Symbolics as S
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions as X
from .Domains import Logic, SvType

__all__ = ["OfAny", "Scope"]

_EVEN = "roundTiesToEven"
_ONE = Domains.vector(1)


class Scope(S.Variables):
    """SystemVerilog's scope for an expression: `variables`, and the `functions` it may call."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None):
        super().__init__(variables)
        self.functions = dict(functions or {})

    def unbound(self, reference: Any) -> Any:
        raise Errors.NameError(f"identifier '{reference.name}' is not declared")

    def function(self, name: str) -> Callable[..., Any]:
        if name not in self.functions:
            raise Errors.NameError(f"function '{name}' is not declared")
        return self.functions[name]


_STD_LOGIC = {"0": "0", "1": "1", "Z": "z", "L": "0", "H": "1"}


def typed(value: Any) -> Any:
    """A variable's value as SystemVerilog has it: a `Logic`, a float, or an object."""
    if isinstance(value, (Logic, float)):
        return value
    if type(value) is bool:
        return Logic(Domains.Bit, int(value))
    if type(value) is int:
        ctype = Domains.of(value)
        if not isinstance(ctype, SvType):
            raise OverflowError(f"integer {value} is too large for any type")
        return Logic.number(ctype, value)
    if type(value) is str:  # its bytes, in UTF-8
        data = value.encode()
        return Logic(Domains.vector(8 * max(len(data), 1)), int.from_bytes(data, "big"))
    if isinstance(value, BD.Value):
        domain = value.domain
        if isinstance(domain, BD.OfInteger.Data) and domain.width:
            return Logic.number(Domains.vector(domain.width, domain.signed, 2), value.value)
        if isinstance(domain, BD.OfBits.Data):
            return Logic(Domains.vector(domain.width, False, 2), int.from_bytes(value.value, "big"))
        if isinstance(domain, BD.OfIeee1164.Data):
            return Logic.of(_STD_LOGIC.get(value.value, "x"))
        if isinstance(domain, BD.OfIeee754.Data) and domain.format in ("binary32", "binary64"):
            return value.value
        raise TypeError(f"{domain.name()} has no SystemVerilog type")
    return value


def _type(value: Any) -> SvType | None:
    if isinstance(value, Logic):
        return value.type
    return Domains.TYPES["real"] if type(value) is float else None


# --- 4-state bits ---


def _mask(width: int) -> int:
    return (1 << width) - 1


def _parts(value: Logic) -> tuple[int, int]:
    """The bits that are 1 and those that are 0."""
    known = ~value.bval & _mask(value.type.width)
    return value.aval & known, ~value.aval & known


def _make(ctype: SvType, ones: int, zeros: int) -> Logic:
    """The value whose bits are 1 in `ones`, 0 in `zeros`, and x elsewhere (0 in a 2-state type)."""
    unknown = _mask(ctype.width) & ~(ones | zeros)
    if ctype.states == 2:
        return Logic(ctype, ones)
    return Logic(ctype, ones | unknown, unknown)


def _unknown(ctype: SvType) -> Logic:
    """Every bit x, or 0 in a 2-state type."""
    return _make(ctype, 0, 0)


def _extend(value: Logic, ctype: SvType, signed: bool) -> Logic:
    """A value resized to `ctype`: sign-extended (its top bit's state repeated) when `signed`, zero-extended otherwise,
    or truncated; x and z become 0 in a 2-state type."""
    width, target = value.type.width, ctype.width
    aval, bval = value.aval & _mask(target), value.bval & _mask(target)
    if target > width and signed:
        fill = _mask(target) & ~_mask(width)
        if value.aval >> (width - 1) & 1:
            aval |= fill
        if value.bval >> (width - 1) & 1:
            bval |= fill
    if ctype.states == 2:
        aval, bval = aval & ~bval, 0
    return Logic(ctype, aval, bval)


def _to_real(value: Any, ctype: SvType) -> float:
    """A value as a real of `ctype`'s format: an integral one by its integer (x and z as 0)."""
    if isinstance(value, Logic):
        number = Logic(value.type, value.aval & ~value.bval).integer()
        result = Ieee754.from_integer(number, "binary64", _EVEN)
    else:
        result = value
    return Ieee754.convert("binary64", result, ctype.format, _EVEN) if ctype.format == "binary32" else result


def _round(value: float) -> int:
    """A real rounded to the nearest integer, ties away from zero."""
    if math.isnan(value) or math.isinf(value):
        raise OverflowError(f"{value!r} has no integer value")
    return int(Ieee754.to_integer("binary64", value, "roundTiesToAway"))


def _convert(value: Any, ctype: SvType, signed: bool | None = None) -> Any:
    """A value converted to `ctype`, an integral one extended by `signed` (by default, its own signedness)."""
    if ctype.kind == "real":
        return _to_real(value, ctype)
    if isinstance(value, float):
        return Logic.number(ctype, _round(value))
    return _extend(value, ctype, value.type.signed if signed is None else signed)


def _truth(value: Any) -> int | None:
    """1, 0, or None for x: any 1 bit is true, all 0 bits false."""
    if isinstance(value, float):
        return int(value != 0)
    if not isinstance(value, Logic):
        raise TypeError(f"a {type(value).__name__} has no truth value")
    ones, zeros = _parts(value)
    if ones:
        return 1
    return 0 if zeros == _mask(value.type.width) else None


def _bit(truth: int | None) -> Logic:
    return Logic.of("x" if truth is None else str(truth))


def _number(value: Logic) -> int:
    return value.integer()


# --- The evaluation ---


class _Evaluation:
    """One evaluation in a scope: each term's self-determined type, then its value in a context."""

    def __init__(self, scope: Scope):
        self.scope = scope
        self._types: dict[int, SvType | None] = {}
        self._values: dict[int, Any] = {}

    def type(self, node: Any) -> SvType | None:
        """The term's self-determined type (None for an object)."""
        if id(node) not in self._types:
            self._types[id(node)] = self._type_of(node)
        return self._types[id(node)]

    def _integral(self, node: Any, what: str) -> SvType:
        ctype = self._numeric(node, what)
        if ctype.kind != "integral":
            raise TypeError(f"{what} expects an integral operand, got {ctype.name()}")
        return ctype

    def _numeric(self, node: Any, what: str) -> SvType:
        ctype = self.type(node)
        if ctype is None:
            raise TypeError(f"{what} expects a number, got {type(self.own(node)).__name__}")
        return ctype

    def _type_of(self, node: Any) -> SvType | None:
        if isinstance(node, (X._Constant, X._Vector, X._Identifier, X._Member, X._Select, X._Call, X._Method, X._Iterate)):
            return _type(self.own(node))
        if isinstance(node, X._Unary):
            if node.operator in ("+", "-"):
                return self.type(node.operand)
            if node.operator == "~":
                return self._integral(node.operand, "~")
            return _ONE
        if isinstance(node, X._Binary):
            op = node.operator
            if op in ("<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->", "==?", "!=?"):
                return _ONE
            if op in ("===", "!=="):
                return Domains.Bit
            if op in ("<<", ">>", "<<<", ">>>"):
                return self._integral(node.left, op)
            left, right = self._numeric(node.left, op), self._numeric(node.right, op)
            if op == "**" and "real" not in (left.kind, right.kind):
                return left  # its exponent is self-determined
            return Domains.common([left, right])
        if isinstance(node, X._Conditional):
            return Domains.common([self._numeric(node.consequent, "?:"), self._numeric(node.alternative, "?:")])
        if isinstance(node, (X._Concatenation, X._Replication, X._Range)):
            return _type(self.own(node))
        if isinstance(node, X._Inside):
            return _ONE
        cast = node  # a cast
        operand = self._numeric(cast.operand, "a cast")
        if cast.width is not None:
            return Domains.vector(cast.width, operand.signed, operand.states)
        if cast.type in ("signed", "unsigned"):
            integral = self._integral(cast.operand, f"{cast.type}'")
            return Domains.vector(integral.width, cast.type == "signed", integral.states)
        return Domains.TYPES[cast.type]

    def own(self, node: Any) -> Any:
        """A self-determined term's value, of its own type, once."""
        if id(node) not in self._values:
            self._values[id(node)] = self._own(node)
        return self._values[id(node)]

    def _own(self, node: Any) -> Any:
        if isinstance(node, X._Constant):
            return typed(node.value)
        if isinstance(node, X._Vector):
            return Logic.of(node.value, bool(node.signed))
        if isinstance(node, X._Identifier):
            return typed(self.scope.lookup(node))
        if isinstance(node, X._Member):
            return self._member(node)
        if isinstance(node, X._Select):
            return self._select(node)
        if isinstance(node, X._Range):
            return self._range(node)
        if isinstance(node, X._Concatenation):
            return self._concatenation([self.value(part) for part in node.parts])
        if isinstance(node, X._Replication):
            return self._replication(node)
        if isinstance(node, X._Method):
            return self._method(node)
        if isinstance(node, X._Iterate):
            items = self._items(self.value(node.array), f"{node.method}()")
            return self._reduce(node.method, [_Evaluation(self.scope.bind(node.name, item)).value(node.body) for item in items])
        return self._call(node)

    def value(self, node: Any, context: SvType | None = None) -> Any:
        """The term's value in a context: its own type's, unless the context gives another."""
        ctype = self.type(node)
        target = context if context is not None else ctype
        if isinstance(node, X._Unary) and node.operator in ("+", "-", "~"):
            return self._unary(node.operator, self.value(node.operand, target), target)
        if isinstance(node, X._Binary):
            return self._binary(node, target)
        if isinstance(node, X._Conditional):
            return self._conditional(node, target)
        result = self._self_determined(node)
        if ctype is None:  # an object, an array
            return result
        return _convert(result, target, ctype.signed and target.signed)  # sign-extended only in a signed context

    def _self_determined(self, node: Any) -> Any:
        if isinstance(node, X._Unary):
            return self._reduction(node.operator, self.value(node.operand))
        if isinstance(node, X._Inside):
            return self._inside(node)
        if isinstance(node, X._Cast):
            return self._cast(node)
        return self.own(node)

    # Operators

    def _unary(self, operator: str, value: Any, ctype: SvType) -> Any:
        if isinstance(value, float):  # `~` takes integral operands only, as typing found
            return value if operator == "+" else Ieee754.operate("neg", ctype.format, _EVEN, [value])
        if operator == "+":
            return value
        if operator == "~":
            ones, zeros = _parts(value)
            return _make(ctype, zeros, ones)
        if not value.known:
            return _unknown(ctype)
        return Logic.number(ctype, -value.aval)

    def _reduction(self, operator: str, value: Any) -> Logic:
        if operator == "!":
            truth = _truth(value)
            return _bit(None if truth is None else 1 - truth)
        if isinstance(value, float):
            raise TypeError(f"the reduction {operator} expects an integral operand, got real")
        ones, zeros = _parts(value)
        full = _mask(value.type.width)
        if operator in ("&", "~&"):
            result = 0 if zeros else 1 if ones == full else None
        elif operator in ("|", "~|"):
            result = 1 if ones else 0 if zeros == full else None
        else:
            result = None if not value.known else bin(value.aval).count("1") % 2
        if operator.startswith("~") or operator == "^~":
            result = None if result is None else 1 - result
        return _bit(result)

    def _binary(self, node: Any, target: SvType) -> Any:
        op = node.operator
        if op in ("&&", "||", "->", "<->"):
            return _convert(self._logical(op, node), target, False)
        if op in ("<", "<=", ">", ">=", "==", "!=", "===", "!==", "==?", "!=?"):
            shared = Domains.common([self.type(node.left), self.type(node.right)])
            left, right = self.value(node.left, shared), self.value(node.right, shared)
            return _convert(self._compare(op, left, right, shared), target, False)
        if op in ("<<", ">>", "<<<", ">>>"):
            return self._shift(op, self.value(node.left, target), self.value(node.right), target)
        if op == "**":
            right = self.type(node.right)
            exponent = self.value(node.right, target if target.kind == "real" else right)
            return self._arithmetic(op, self.value(node.left, target), exponent, target)
        return self._arithmetic(op, self.value(node.left, target), self.value(node.right, target), target)

    def _logical(self, op: str, node: Any) -> Logic:
        left = _truth(self.value(node.left))
        if op == "&&" and left == 0 or op == "||" and left == 1:
            return _bit(left)
        if op == "->" and left == 0:
            return _bit(1)
        right = _truth(self.value(node.right))
        if op == "&&":
            return _bit(0 if right == 0 else None if None in (left, right) else 1)
        if op == "||":
            return _bit(1 if right == 1 else None if None in (left, right) else 0)
        if op == "->":
            return _bit(1 if right == 1 else None if None in (left, right) else 0)
        return _bit(None if None in (left, right) else int(left == right))

    def _compare(self, op: str, left: Any, right: Any, shared: SvType) -> Logic:
        if shared.kind == "real":
            if math.isnan(left) or math.isnan(right):
                return _bit(int(op in ("!=", "!==", "!=?")))
            order = (left > right) - (left < right)
        elif op in ("===", "!=="):
            same = left.aval == right.aval and left.bval == right.bval
            return Logic(Domains.Bit, int(same == (op == "===")))
        elif op in ("==?", "!=?"):
            care = ~right.bval & _mask(shared.width)  # x and z in the right operand match anything
            if left.bval & care:
                return _bit(None)
            same = (left.aval & care) == (right.aval & care)
            return _bit(int(same == (op == "==?")))
        else:
            if not (left.known and right.known):
                return _bit(None)
            x, y = _number(left), _number(right)
            order = (x > y) - (x < y)
        tests = {"<": order < 0, "<=": order <= 0, ">": order > 0, ">=": order >= 0, "==": order == 0, "!=": order != 0,
                 "===": order == 0, "!==": order != 0, "==?": order == 0, "!=?": order != 0}
        return _bit(int(tests[op]))

    def _shift(self, op: str, value: Any, count: Any, ctype: SvType) -> Logic:
        if isinstance(value, float) or isinstance(count, float):
            raise TypeError(f"{op} expects integral operands, got real")
        if not count.known:
            return _unknown(ctype)
        n, width = min(count.aval, ctype.width), ctype.width  # the count is unsigned; the width or more shifts every bit out
        if op in ("<<", "<<<"):
            return Logic(ctype, value.aval << n & _mask(width), value.bval << n & _mask(width))
        aval, bval = value.aval >> n, value.bval >> n
        if op == ">>>" and ctype.signed and n:
            fill = _mask(width) & ~_mask(max(width - n, 0))
            aval |= fill if value.aval >> (width - 1) & 1 else 0
            bval |= fill if value.bval >> (width - 1) & 1 else 0
        return Logic(ctype, aval, bval)

    def _arithmetic(self, op: str, left: Any, right: Any, ctype: SvType) -> Any:
        if ctype.kind == "real":
            names = {"+": "add", "-": "sub", "*": "mul", "/": "div"}
            if op == "**":
                return _real_power(left, right, ctype)
            if op not in names:
                raise TypeError(f"{op} expects integral operands, got real")
            return Ieee754.operate(names[op], ctype.format, _EVEN, [left, right])
        if op in ("&", "|", "^", "^~", "~^"):
            (a1, a0), (b1, b0) = _parts(left), _parts(right)
            if op == "&":
                return _make(ctype, a1 & b1, a0 | b0)
            if op == "|":
                return _make(ctype, a1 | b1, a0 & b0)
            known = (a1 | a0) & (b1 | b0)
            odd = (a1 ^ b1) & known
            ones = odd if op == "^" else known & ~odd
            return _make(ctype, ones, known & ~ones)
        if not (left.known and right.known):
            return _unknown(ctype)
        x, y = _number(left), _number(right)
        if op in ("/", "%") and y == 0:
            return _unknown(ctype)
        if op == "**":
            return self._power(x, y, ctype)
        if op in ("/", "%"):
            quotient = abs(x) // abs(y) * (1 if (x < 0) == (y < 0) else -1)  # truncated toward zero
            return Logic.number(ctype, quotient if op == "/" else x - y * quotient)
        return Logic.number(ctype, {"+": x + y, "-": x - y, "*": x * y}[op])

    def _power(self, base: int, exponent: int, ctype: SvType) -> Logic:
        """IEEE 1800's table 11-4 for a negative exponent; otherwise the power, in the width."""
        if exponent >= 0:
            return Logic.number(ctype, pow(base, exponent, 1 << ctype.width))
        if base == 0:
            return _unknown(ctype)
        if base == 1 or base == -1:
            return Logic.number(ctype, base ** (exponent % 2))
        return Logic.number(ctype, 0)

    def _conditional(self, node: Any, target: SvType) -> Any:
        truth = _truth(self.value(node.condition))
        if truth == 1:
            return self.value(node.consequent, target)
        if truth == 0:
            return self.value(node.alternative, target)
        a, b = self.value(node.consequent, target), self.value(node.alternative, target)
        if target.kind == "real":
            return a if a == b else 0.0
        (a1, a0), (b1, b0) = _parts(a), _parts(b)
        return _make(target, a1 & b1, a0 & b0)  # bits that agree keep their value; the others are x

    def _inside(self, node: Any) -> Logic:
        items: list[tuple[Any, ...]] = []  # a term, a span's ends, or an array's element
        for item in node.items:
            if isinstance(item, X._Span):
                items.append((item.low, item.high))
            elif self.type(item) is None and isinstance(self.own(item), list):  # an array: each of its elements
                items.extend(("element", element) for element in self._items(self.own(item), "inside"))
            else:
                items.append((item,))
        types = [self._numeric(node.value, "inside")]
        for item in items:
            types += [_element_type(item[1])] if item[0] == "element" else [self._numeric(end, "inside") for end in item]
        shared = Domains.common(types)
        value = self.value(node.value, shared)
        found: int | None = 0
        for item in items:
            if item[0] == "element":
                element = item[1]
                signed = isinstance(element, Logic) and element.type.signed and shared.signed
                match = self._compare("==?", value, _convert(element, shared, signed), shared)
            elif len(item) == 1:
                match = self._compare("==?", value, self.value(item[0], shared), shared)
            else:
                low = self._compare(">=", value, self.value(item[0], shared), shared)
                high = self._compare("<=", value, self.value(item[1], shared), shared)
                match = _bit(0 if 0 in (_truth(low), _truth(high)) else None if None in (_truth(low), _truth(high)) else 1)
            truth = _truth(match)
            if truth == 1:
                return _bit(1)
            if truth is None:
                found = None
        return _bit(found)

    def _items(self, value: Any, what: str) -> list[Any]:
        """An array's items, typed."""
        if not isinstance(value, list):
            raise TypeError(f"{what} is a method of arrays, not of {type(value).__name__}")
        return [typed(item) for item in value]

    def _method(self, node: Any) -> Any:
        items = self._items(self.value(node.array), f"{node.name}()")
        if node.name == "size":
            return Logic.number(Domains.TYPES["int"], len(items))
        if node.name in ("min", "max"):
            if not items:
                return []
            shared = Domains.common([_element_type(item) for item in items])
            best = items[0]
            for item in items[1:]:
                if _truth(self._compare("<" if node.name == "min" else ">", _convert(item, shared), _convert(best, shared),
                                        shared)) == 1:
                    best = item
            return [best]
        if node.name == "unique":
            distinct: list[Any] = []
            for item in items:
                if not any(_identical(item, other) for other in distinct):
                    distinct.append(item)
            return distinct
        return self._reduce(node.name, items)

    def _reduce(self, method: str, values: list[Any]) -> Any:
        """The values reduced by a reduction method, in their common type."""
        if not values:
            return {"sum": Logic.number(Domains.Integer, 0), "product": Logic.number(Domains.Integer, 1)}.get(
                method, _bit(int(method == "and")))
        ctype = Domains.common([_element_type(value) for value in values])
        operator = {"sum": "+", "product": "*", "and": "&", "or": "|", "xor": "^"}[method]
        result = _convert(values[0], ctype)
        for value in values[1:]:
            result = self._arithmetic(operator, result, _convert(value, ctype), ctype)
        return result

    def _cast(self, node: Any) -> Any:
        operand = self.value(node.operand)
        ctype = self.type(node)
        return _convert(operand, ctype)

    def _member(self, node: Any) -> Any:
        target = self.value(node.object)
        if isinstance(target, Mapping):
            members = target
        elif callable(getattr(target, "accept", None)):
            members = Validators.properties_of(target)
        else:
            raise TypeError(f"a {type(target).__name__} has no members")
        if node.name not in members:
            raise KeyError(f"no member named '{node.name}'")
        return typed(_array(members[node.name]))

    def _select(self, node: Any) -> Any:
        target, index = self.value(node.value), self.value(node.index)
        if isinstance(target, (list, tuple)):
            if not (isinstance(index, Logic) and index.known):
                raise ValueError(f"an array's index must be known, got {index!r}")
            position = _number(index)
            if not 0 <= position < len(target):
                raise ValueError(f"index {position} is out of bounds of an array of {len(target)}")
            return typed(target[position])
        if not isinstance(target, Logic):
            raise TypeError(f"a {type(target).__name__} cannot be selected from")
        states = target.type.states
        if not (isinstance(index, Logic) and index.known) or not 0 <= _number(index) < target.type.width:
            return _unknown(Domains.vector(1, False, states))
        position = _number(index)
        return Logic(Domains.vector(1, False, states), target.aval >> position & 1, target.bval >> position & 1)

    def _constant(self, node: Any, what: str) -> int:
        value = self.value(node)
        if not (isinstance(value, Logic) and value.known):
            raise ValueError(f"{what} must be a known integer, got {value!r}")
        return _number(value)

    def _range(self, node: Any) -> Logic:
        target = self.value(node.value)
        if not isinstance(target, Logic):
            raise TypeError(f"a {type(target).__name__} cannot be selected from")
        msb, lsb = self._constant(node.msb, "a range's msb"), self._constant(node.lsb, "a range's lsb")
        if msb < lsb:
            raise ValueError(f"a range's msb must be at least its lsb, got [{msb}:{lsb}]")
        bits = "".join(target.bits[target.type.width - 1 - i] if 0 <= i < target.type.width else "x"
                       for i in range(msb, lsb - 1, -1))
        return Logic.of(bits, False, target.type.states)  # out of range, x

    def _concatenation(self, values: list[Any]) -> Logic:
        for value in values:
            if not isinstance(value, Logic):
                raise TypeError(f"a concatenation's parts must be integral, got {type(value).__name__}")
        bits = "".join(value.bits for value in values)
        return Logic.of(bits, False, max(value.type.states for value in values))

    def _replication(self, node: Any) -> Logic:
        count = self._constant(node.count, "a replication's count")
        if count < 1:
            raise ValueError(f"a replication's count must be positive, got {count}")
        return self._concatenation([self.value(node.value)] * count)

    def _call(self, node: Any) -> Any:
        name = node.function
        if name in X.SYSTEM:
            if len(node.arguments) != 1:
                raise TypeError(f"{name} takes 1 argument, got {len(node.arguments)}")
            if name == "$bits":  # its argument's type's width; the argument is not evaluated
                return Logic.number(Domains.Integer, self._numeric(node.arguments[0], name).width)
            return _system(name, self.value(node.arguments[0]))
        return typed(self.scope.function(name)(*[self.value(argument) for argument in node.arguments]))


def _element_type(value: Any) -> SvType:
    """An array element's type: it must be integral or real."""
    ctype = _type(value)
    if ctype is None:
        raise TypeError(f"an array's elements must be numbers, got {type(value).__name__}")
    return ctype


def _identical(a: Any, b: Any) -> bool:
    """Whether two elements are identical, as `===` compares them: of one value, bit for bit, x and z too."""
    if isinstance(a, Logic) and isinstance(b, Logic):
        return a.aval == b.aval and a.bval == b.bval
    return type(a) is type(b) and a == b


def _array(value: Any) -> Any:
    """A member's value: a list as a list of its items, lists of lists too."""
    return [_array(item) for item in value.values] if isinstance(value, Validators.ListRecord) else value


def _real_power(base: float, exponent: float, ctype: SvType) -> float:
    """A real power as C's `pow` gives it, in the format of `ctype`."""
    odd = math.isfinite(exponent) and exponent.is_integer() and exponent % 2 == 1
    try:
        result = math.pow(base, exponent)
    except ValueError:  # a zero to a negative power, or a negative one to a fraction
        result = (math.copysign(math.inf, base) if odd else math.inf) if base == 0 else math.nan
    except OverflowError:
        result = math.copysign(math.inf, base) if odd else math.inf
    return Ieee754.convert("binary64", result, "binary32", _EVEN) if ctype.format == "binary32" else result


def _system(name: str, value: Any) -> Logic:
    if not isinstance(value, Logic):
        raise TypeError(f"{name} expects an integral argument, got real")
    if name in ("$signed", "$unsigned"):
        return Logic(Domains.vector(value.type.width, name == "$signed", value.type.states), value.aval, value.bval)
    if name == "$isunknown":
        return Logic(Domains.Bit, int(not value.known))
    ones, _ = _parts(value)
    count = bin(ones).count("1")
    if name == "$countones":
        return Logic.number(Domains.Integer, count)
    if name in ("$onehot", "$onehot0"):
        return Logic(Domains.Bit, int(count == 1 or (name == "$onehot0" and count == 0)))
    if not value.known:  # $clog2
        return _unknown(Domains.Integer)
    return Logic.number(Domains.Integer, max(value.aval - 1, 0).bit_length())


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of an expression in `scope`, or with the variables in a mapping bound: a `Logic` or a float."""
    if not isinstance(scope, S.Scope):
        scope = Scope(dict(scope or {}))
    expression = X.DIALECT.resolve(expression)
    problems = X.DIALECT.validate(expression, bound=S.free(expression))  # its structure: references resolve as they go
    if problems:
        raise ValueError(f"cannot evaluate an invalid expression: {problems[0]}")
    return _Evaluation(scope).value(expression)
