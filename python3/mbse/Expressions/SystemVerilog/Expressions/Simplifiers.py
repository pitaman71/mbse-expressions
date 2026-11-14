"""Evaluators of the SystemVerilog dialect: compute an expression by IEEE 1800's rules, in Python.

`Evaluators.OfAny(expression, scope)` evaluates a term (or anything `Terms.term` reads one from) in a
`Scope(variables, functions)` and gives a `Domains.Logic` for an integral result or a float for a real one. A variable's
type is its value's: a `Logic` its own, a bool a `bit`, an int an `integer` (or a `longint` beyond 32 bits), a float a
`real`, and a string a vector of its bytes (in UTF-8) (a value carries no domain: a variable of another type waits for
domain inference). Every named type it computes in (a literal's, a cast's, `===`'s `bit`, `size()`'s `int`, `$bits`'
`integer`, ...) is the domain SystemVerilog defines by that name in the store of the term's holder (`Domains.named`),
read once per evaluation when it is first needed: a lone term is refused where it needs one (mbse-schemas' TypeError),
and a store where SystemVerilog's `define` has not run defines none.

It keeps what it evaluated before the dialect was complete, over the kinds that replaced its own (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Stage 6 extends no evaluator", Q11: "stage 6 extends no evaluator"): a `literal` (an unsized integer, decimal or based,
a real, a string) and a `constant` (a vector, sized or not, and a fill in its context's width); a `nameexpression` of an
identifier; `memberexpression`, `indexexpression`, `rangeselect` (`[msb:lsb]`), `unaryexpression`,
`binaryexpression`, `conditionalexpression`, `parenthesizedexpression`, `insideexpression` with `valuerange`s,
`concatenation`, `replication`, `castexpression` (to a type SystemVerilog defines by its keyword, a signing, or a
width), `systemcall` (the system functions `SYSTEM`), `callexpression` (of a function the scope provides, or of an
array's method of no arguments, `a.size()`) and `arraymethodwithexpression` (a reduction with a `with` clause). Every
other kind, the other dialects' of its family among them, is refused by name, `NotImplementedError` ("SystemVerilog
incrementexpression is not evaluated", "SystemVerilog Types structtype is not evaluated"), and so is what an evaluated
kind holds beyond what it evaluated before (a scoped name, an indexed part select, a time literal, `null`). IEEE
1800's rules apply:

- Sizing: an operator's operands are context-determined or self-determined (11.6); the context-determined ones are
  extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
  context-determined operands are), and zero-extended otherwise. A real operand makes the expression real. An unsized
  based integer is unsigned, unless written signed, of 32 bits; an unsized vector is extended to 32 bits by its leftmost
  bit where it is x or z, else by 0; a fill (`'1`) fills its context's width.
- 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the bitwise
  operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and `!=?`
  treat x and z in the right operand as wildcards. Division by zero gives x.
- `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
  otherwise x); a conditional with an x condition merges its operands bit by bit.
- `inside` holds when the value equals (`==?`) an item, an element of an array among the items, or lies in a range;
  otherwise it is x when a comparison is.
- A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a 2-state
  type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), and an integer becomes a real.
- An index gives a bit (x out of range, or for an x index) or an array's element; a range select bits `[msb:lsb]`.
- System functions: `$signed`, `$unsigned`, `$clog2`, `$bits` (of a value's type, or of a type SystemVerilog defines),
  `$countones`, `$onehot`, `$onehot0`, `$isunknown`; other functions are the scope's, and nothing else.
- Array methods: `size()` is an `int`; `sum()`, `product()`, `and()`, `or()` and `xor()` reduce the items, or the
  values of a `with` clause, its iterator its call's argument (`item` by default), in their common type by `+`, `*`,
  `&`, `|` and `^` (x and z as those operators take them); of no items they give 0, 1, `1'b1`, `1'b0` and `1'b0`.
  `min()` and `max()` give a queue of the least or greatest item (none when there are none), and `unique()` a queue of
  the first of each set of identical (`===`) items.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Patterns.Expressions import Ieee754
from mbse.Expressions.Framework import Objects, Simplifiers as FS, Symbolics as S, Terms as F
from mbse.Schemas.Framework import Proxies

from . import Domains, Expressions as X
from .Domains import Logic, SvType

__all__ = ["OfAny", "Scope", "SIMPLIFIER", "CATEGORIES"]

_EVEN = "roundTiesToEven"
_ONE = Domains.vector(1)


class Scope(S.Variables):
    """SystemVerilog's scope for an expression: `variables`, and the `functions` it may call."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None):
        super().__init__(variables)
        self.functions = dict(functions or {})

    def function(self, name: str) -> Callable[..., Any]:
        if name not in self.functions:
            raise S.Unbound(name)
        return self.functions[name]


class _Types:
    """The types SystemVerilog defines in the store of an evaluated term's holder, by name, each read once, when first
    needed: a lone term reaches no store, and is refused only where it needs a type."""

    def __init__(self, term: Any):
        self._term, self._read = term, {}

    def named(self, name: str) -> SvType:
        if name not in self._read:
            self._read[name] = Domains.named(Proxies.store_of(self._term), name)
        return self._read[name]


def typed(value: Any, types: _Types) -> Any:
    """A variable's value as SystemVerilog has it: a `Logic`, a float, or an object."""
    if isinstance(value, (Logic, float)):
        return value
    if type(value) is bool:
        return Logic(types.named("bit"), int(value))
    if type(value) is int:
        name = Domains.of(value)
        if name is None:
            raise OverflowError(f"integer {value} is too large for any type")
        return Logic.number(types.named(name), value)
    if type(value) is str:  # its bytes, in UTF-8
        data = value.encode()
        return Logic(Domains.vector(8 * max(len(data), 1)), int.from_bytes(data, "big"))
    return value


def _type(value: Any, types: _Types) -> SvType | None:
    if isinstance(value, Logic):
        return value.type
    return types.named("real") if type(value) is float else None


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


_EVALUATED = frozenset({
    X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION, X.INDEXEXPRESSION, X.RANGESELECT, X.UNARYEXPRESSION,
    X.BINARYEXPRESSION, X.CONDITIONALEXPRESSION, X.PARENTHESIZEDEXPRESSION, X.INSIDEEXPRESSION, X.CONCATENATION, X.REPLICATION, X.CASTEXPRESSION, X.SYSTEMCALL, X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION})
"""The kinds it evaluates: those that replaced the kinds it evaluated before the dialect was complete."""


def _owner(node: Any) -> str:
    """The name of the dialect of the family that owns a node's kind (`Terms.Dialect.owner`): SystemVerilog's own, or a
    sublanguage's."""
    return X.DIALECT.owner(node.term).name()


class _Node:
    """A term read once for one evaluation: its `kind` (as `Expressions.DIALECT` reads it, a term of any of its family's
    dialects), and its members as attributes, its attributes (None where not set), its helpers (`Terms.Node`s), its
    subterms (a `_Node`, None where empty) and its variadic arguments (each container's, a tuple of `_Node`s). `term` is the term value
    read."""

    def __init__(self, term: Any):
        tag, record, _ = X.DIALECT.kind(term)
        node = F.node(tag, record)
        _, _, names = F._parts(record.as_schema())
        members: dict[str, Any] = dict.fromkeys(names)
        members.update(node.attributes)
        members.update(node.helpers)
        members.update({name: None if a is None else _Node(a) for name, a in node.subterms.items()})
        members.update({name: tuple(_Node(a) for a in terms) for name, terms in node.lists.items()})
        self.__dict__.update(members)
        self.term, self.kind = term, tag


def _spelling(name: Any) -> str:
    return name.attributes["spelling"]


class _Evaluation:
    """One evaluation in a scope: each term's self-determined type, then its value in a context."""

    def __init__(self, scope: Scope, types: _Types):
        self.scope, self.stored = scope, types
        self._types: dict[int, SvType | None] = {}
        self._values: dict[int, Any] = {}

    def type(self, node: Any) -> SvType | None:
        """The term's self-determined type (None for an object); a kind it does not evaluate is refused by name."""
        if node.kind not in _EVALUATED:
            raise FS.NoRule(_owner(node), node.kind, node.kind)
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
        if node.kind == X.CONSTANT and node.fill is not None:
            return _ONE  # self-determined, a fill is a bit
        if node.kind in (X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION, X.INDEXEXPRESSION,
                         X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION, X.CONCATENATION, X.REPLICATION,
                         X.RANGESELECT, X.SYSTEMCALL):
            return _type(self.own(node), self.stored)
        if node.kind == X.PARENTHESIZEDEXPRESSION:
            return self.type(node.expression)
        if node.kind == X.UNARYEXPRESSION:
            if node.operator in ("+", "-"):
                return self.type(node.operand)
            if node.operator == "~":
                return self._integral(node.operand, "~")
            return _ONE
        if node.kind == X.BINARYEXPRESSION:
            op = node.operator
            if op in ("<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->", "==?", "!=?"):
                return _ONE
            if op in ("===", "!=="):
                return self.stored.named("bit")
            if op in ("<<", ">>", "<<<", ">>>"):
                return self._integral(node.left, op)
            left, right = self._numeric(node.left, op), self._numeric(node.right, op)
            if op == "**" and "real" not in (left.kind, right.kind):
                return left  # its exponent is self-determined
            return Domains.common([left, right])
        if node.kind == X.CONDITIONALEXPRESSION:  # its condition first: one it does not evaluate (a `matches`) is refused
            self.type(node.condition)  # by name before the branches, which may name what its pattern binds, are sized
            return Domains.common([self._numeric(node.consequence, "?:"), self._numeric(node.alternative, "?:")])
        if node.kind == X.INSIDEEXPRESSION:
            return _ONE
        return self._cast_type(node)  # a cast

    def _cast_type(self, cast: Any) -> SvType:
        """A cast's type: a width's, sized by its operand; a signing's, of its operand's width; or the type
        SystemVerilog defines by the keyword its type names."""
        target = cast.type
        operand = self._numeric(cast.value, "a cast")
        if target.kind == "implicittype" and target.signing is not None and not target.dimensions:
            integral = self._integral(cast.value, f"{target.signing}'")
            return Domains.vector(integral.width, target.signing == "signed", integral.states)
        name = X.type_name(target.term)
        if name in Domains.NAMES:
            return self.stored.named(name)
        if target.kind in _EVALUATED:  # a width: a known positive integer
            width = self._constant(target, "a cast's width")
            if width < 1:
                raise ValueError(f"a cast's width must be positive, got {width}")
            return Domains.vector(width, operand.signed, operand.states)
        raise FS.NoRule(_owner(target), target.kind, target.kind)

    def own(self, node: Any) -> Any:
        """A self-determined term's value, of its own type, once."""
        if id(node) not in self._values:
            self._values[id(node)] = self._own(node)
        return self._values[id(node)]

    def _own(self, node: Any) -> Any:
        if node.kind == X.LITERAL:
            return self._literal(node)
        if node.kind == X.CONSTANT:
            return self._vector(node)
        if node.kind == X.NAMEEXPRESSION:
            if F.name_of(node.term) is None:
                raise FS.NoRule("SystemVerilog", "nameexpression of a name that is not an identifier", node.kind)
            return typed(self.scope.lookup(node.term), self.stored)
        if node.kind == X.MEMBEREXPRESSION:
            return self._member(node)
        if node.kind == X.INDEXEXPRESSION:
            return self._select(node)
        if node.kind == X.RANGESELECT:
            return self._range(node)
        if node.kind == X.CONCATENATION:
            return self._concatenation([self.value(item) for item in node.items])
        if node.kind == X.REPLICATION:
            return self._replication(node)
        if node.kind == X.ARRAYMETHODWITHEXPRESSION:
            return self._with(node)
        if node.kind == X.SYSTEMCALL:
            return self._system_call(node)
        return self._call(node)

    def _literal(self, node: Any) -> Any:
        """A literal's value: an unsized based integer of its own type, a decimal one an `integer` or a `longint`, a
        real, or a string's bytes."""
        if node.unit is not None:
            raise FS.NoRule("SystemVerilog", "time literal", node.kind)
        if node.base is not None:
            return Logic.number(Domains.unsized(node.value, bool(node.signed)), node.value)
        return typed(node.value, self.stored)

    def _vector(self, node: Any) -> Logic:
        """A constant's vector: of its size, or, unsized, extended to 32 bits by its leftmost bit where x or z."""
        if node.bits is None:
            raise FS.NoRule("SystemVerilog", f"constant {node.singleton}", node.kind)
        bits = node.bits
        if node.size is None and len(bits) < 32:
            bits = (bits[0] if bits[0] in "xz" else "0") * (32 - len(bits)) + bits
        return Logic.of(bits, bool(node.signed))

    def value(self, node: Any, context: SvType | None = None) -> Any:
        """The term's value in a context: its own type's, unless the context gives another."""
        ctype = self.type(node)
        target = context if context is not None else ctype
        if node.kind == X.PARENTHESIZEDEXPRESSION:
            return self.value(node.expression, context)
        if node.kind == X.CONSTANT and node.fill is not None:  # every bit of its context's width
            filled = Logic.of(node.fill * (target.width if target.kind == "integral" else 1))
            return _convert(filled, target, False)
        if node.kind == X.UNARYEXPRESSION and node.operator in ("+", "-", "~"):
            return self._unary(node.operator, self.value(node.operand, target), target)
        if node.kind == X.BINARYEXPRESSION:
            return self._binary(node, target)
        if node.kind == X.CONDITIONALEXPRESSION:
            return self._conditional(node, target)
        result = self._self_determined(node)
        if ctype is None:  # an object, an array
            return result
        return _convert(result, target, ctype.signed and target.signed)  # sign-extended only in a signed context

    def _self_determined(self, node: Any) -> Any:
        if node.kind == X.UNARYEXPRESSION:
            return self._reduction(node.operator, self.value(node.operand))
        if node.kind == X.INSIDEEXPRESSION:
            return self._inside(node)
        if node.kind == X.CASTEXPRESSION:
            return _convert(self.value(node.value), self.type(node))
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
            return Logic(self.stored.named("bit"), int(same == (op == "===")))
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
            return self.value(node.consequence, target)
        if truth == 0:
            return self.value(node.alternative, target)
        a, b = self.value(node.consequence, target), self.value(node.alternative, target)
        if target.kind == "real":
            return a if a == b else 0.0
        (a1, a0), (b1, b0) = _parts(a), _parts(b)
        return _make(target, a1 & b1, a0 & b0)  # bits that agree keep their value; the others are x

    def _inside(self, node: Any) -> Logic:
        items: list[tuple[Any, ...]] = []  # a term, a range's ends, or an array's element
        for item in node.set:
            if item.kind == X.VALUERANGE:
                if item.operator is not None:
                    raise FS.NoRule("SystemVerilog", f"valuerange {item.operator!r}", item.kind)
                items.append((item.left, item.right))
            elif self.type(item) is None and isinstance(self.own(item), list):  # an array: each of its elements
                items.extend(("element", element) for element in self._items(self.own(item), "inside"))
            else:
                items.append((item,))
        types = [self._numeric(node.value, "inside")]
        for item in items:
            types += ([self._element_type(item[1])] if item[0] == "element"
                      else [self._numeric(end, "inside") for end in item])
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
        return [typed(item, self.stored) for item in value]

    def _method(self, array: Any, name: str) -> Any:
        """An array's method of no arguments: its size, a reduction, or a locator."""
        items = self._items(self.value(array), f"{name}()")
        if name == "size":
            return Logic.number(self.stored.named("int"), len(items))
        if name in ("min", "max"):
            if not items:
                return []
            shared = Domains.common([self._element_type(item) for item in items])
            best = items[0]
            for item in items[1:]:
                if _truth(self._compare("<" if name == "min" else ">", _convert(item, shared), _convert(best, shared),
                                        shared)) == 1:
                    best = item
            return [best]
        if name == "unique":
            distinct: list[Any] = []
            for item in items:
                if not any(_identical(item, other) for other in distinct):
                    distinct.append(item)
            return distinct
        return self._reduce(name, items)

    def _with(self, node: Any) -> Any:
        """A reduction with a `with` clause: its call's array's items, each bound to its iterator, reduced by its
        method over its `with` expression's values."""
        call = node.value
        callee = call.callee if call.kind == X.CALLEXPRESSION else None
        if callee is None or callee.kind != X.MEMBEREXPRESSION or _spelling(callee.member) not in X.REDUCTIONS:
            raise FS.NoRule("SystemVerilog", "arraymethodwithexpression of a call that is not a reduction's", node.kind)
        method = _spelling(callee.member)
        iterator = next(iter(X._array_method_scopes(F.kind_of(node.term)[1])[1]))
        items = self._items(self.value(callee.value), f"{method}()")
        return self._reduce(method, [_Evaluation(self.scope.bind(iterator, item), self.stored).value(node.body)
                                     for item in items])

    def _reduce(self, method: str, values: list[Any]) -> Any:
        """The values reduced by a reduction method, in their common type."""
        if not values:
            if method in ("sum", "product"):
                return Logic.number(self.stored.named("integer"), int(method == "product"))
            return _bit(int(method == "and"))
        ctype = Domains.common([self._element_type(value) for value in values])
        operator = {"sum": "+", "product": "*", "and": "&", "or": "|", "xor": "^"}[method]
        result = _convert(values[0], ctype)
        for value in values[1:]:
            result = self._arithmetic(operator, result, _convert(value, ctype), ctype)
        return result

    def _member(self, node: Any) -> Any:
        target, name = self.value(node.value), _spelling(node.member)
        if isinstance(target, Mapping):
            members = target
        elif Objects.is_object(target):
            members = Objects.properties(target)
        else:
            raise TypeError(f"a {type(target).__name__} has no members")
        if name not in members:
            raise KeyError(f"no member named '{name}'")
        return typed(_array(members[name]), self.stored)

    def _select(self, node: Any) -> Any:
        target, index = self.value(node.value), self.value(node.index)
        if isinstance(target, (list, tuple)):
            if not (isinstance(index, Logic) and index.known):
                raise ValueError(f"an array's index must be known, got {index!r}")
            position = _number(index)
            if not 0 <= position < len(target):
                raise ValueError(f"index {position} is out of bounds of an array of {len(target)}")
            return typed(target[position], self.stored)
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
        if node.operator != ":":
            raise FS.NoRule("SystemVerilog", f"rangeselect {node.operator!r}", node.kind)
        target = self.value(node.value)
        if not isinstance(target, Logic):
            raise TypeError(f"a {type(target).__name__} cannot be selected from")
        msb, lsb = self._constant(node.left, "a range's msb"), self._constant(node.right, "a range's lsb")
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
        return self._concatenation([self.value(item) for item in node.items] * count)

    def _system_call(self, node: Any) -> Any:
        """A system function's call: one of `SYSTEM`, of one argument."""
        name = node.name
        if name not in X.SYSTEM:
            raise FS.NoRule("SystemVerilog", f"systemcall {name!r}", node.kind)
        if len(node.arguments) != 1:
            raise TypeError(f"{name} takes 1 argument, got {len(node.arguments)}")
        argument = node.arguments[0]
        if name == "$bits":  # its argument's type's width, or a type's; the argument is not evaluated
            typed_name = X.type_name(argument.term)
            width = (self.stored.named(typed_name) if typed_name in Domains.NAMES else self._numeric(argument, name)).width
            return Logic.number(self.stored.named("integer"), width)
        return self._system(name, self.value(argument))

    def _call(self, node: Any) -> Any:
        """A call: of a function the scope provides, by its name, or of an array's method of no arguments."""
        callee = node.callee
        if callee.kind == X.NAMEEXPRESSION and F.name_of(callee.term) is not None:
            name = F.name_of(callee.term)
            return typed(self.scope.function(name)(*[self.value(argument) for argument in node.arguments]),
                         self.stored)
        if callee.kind == X.MEMBEREXPRESSION and _spelling(callee.member) in X.METHODS and not node.arguments:
            return self._method(callee.value, _spelling(callee.member))
        raise FS.NoRule("SystemVerilog", f"callexpression of a {callee.kind}", node.kind)

    def _element_type(self, value: Any) -> SvType:
        """An array element's type: it must be integral or real."""
        ctype = _type(value, self.stored)
        if ctype is None:
            raise TypeError(f"an array's elements must be numbers, got {type(value).__name__}")
        return ctype

    def _system(self, name: str, value: Any) -> Logic:
        if not isinstance(value, Logic):
            raise TypeError(f"{name} expects an integral argument, got real")
        if name in ("$signed", "$unsigned"):
            return Logic(Domains.vector(value.type.width, name == "$signed", value.type.states), value.aval, value.bval)
        if name == "$isunknown":
            return Logic(self.stored.named("bit"), int(not value.known))
        ones, _ = _parts(value)
        count = bin(ones).count("1")
        if name == "$countones":
            return Logic.number(self.stored.named("integer"), count)
        if name in ("$onehot", "$onehot0"):
            return Logic(self.stored.named("bit"), int(count == 1 or (name == "$onehot0" and count == 0)))
        if not value.known:  # $clog2
            return _unknown(self.stored.named("integer"))
        return Logic.number(self.stored.named("integer"), max(value.aval - 1, 0).bit_length())


def _identical(a: Any, b: Any) -> bool:
    """Whether two elements are identical, as `===` compares them: of one value, bit for bit, x and z too."""
    if isinstance(a, Logic) and isinstance(b, Logic):
        return a.aval == b.aval and a.bval == b.bval
    return type(a) is type(b) and a == b


def _array(value: Any) -> Any:
    """A member's value: a list as a list of its items, lists of lists too."""
    return [_array(item) for item in value.values] if isinstance(value, Objects.Listed) else value


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


class _Rules:
    """SystemVerilog's folding rules: a term's value in a scope, by IEEE 1800's rules, the term's structure validated
    first (its references resolve as they go)."""

    dialect = X.DIALECT

    def scope(self, variables: Mapping[str, Any]) -> Scope:
        return Scope(variables)

    def evaluate(self, node: Any, scope: Any) -> Any:
        problems = X.DIALECT.validate(node, bound=S.free(node, X.DIALECT))
        if problems:
            raise ValueError(f"cannot simplify an invalid expression: {problems[0]}")
        return _Evaluation(scope, _Types(node)).value(_Node(node))


def _folds(node: Any, root: bool) -> bool:
    """Whether a subterm folds: the root, and a name, which a literal of its value's type replaces. An operand's width
    is its context's (11.6), so an operand folded alone, at its own width, would compute otherwise: it stays."""
    return root or X.DIALECT.kind(node)[2].role == F.REFERENCE


def _literal(value: Any) -> Any:
    """The literal of a value: a real's; an `integer`'s or a `longint`'s, an unsized decimal integer; any other
    integral value's, a sized vector of its bits and signedness (of 4 states: a 2-state value's type is not kept); none
    for an object."""
    if type(value) is float:
        return X.literal(value)
    if not isinstance(value, Logic):
        return None
    if value.known and value.type.label in ("integer", "longint"):
        return X.literal(value.integer())
    return X.vector(value.bits(), value.type.signed)


CATEGORIES: dict[str, dict[str, str]] = {
    "SystemVerilog": {
        "valuerange": "b", "patternitem": "b", "assignmentpattern": "c", "taggedexpression": "c",
        "newarrayexpression": "c", "randomizewithexpression": "c",
        **dict.fromkeys(("superexpression", "newexpression", "newcopyexpression", "rootexpression",
                         "incrementexpression", "assignmentexpression"), "d")},
    "SystemVerilog Types": {"*": "b"}, "SystemVerilog Patterns": {"*": "b"}, "SystemVerilog Assertions": {"*": "d"},
    "SystemVerilog Constraints": {"solvebeforeconstraint": "b", "disablesoftconstraint": "b"},
    "SystemVerilog Preprocessor": {"*": "b", "macrousage": "d"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given)."""

SIMPLIFIER = FS.Simplifier(_Rules(), literal=_literal, categories=CATEGORIES, folds=_folds)
"""The simplifier of the SystemVerilog dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> FS.Simplified:
    """The simplification of an expression in `scope`, or with the variables in a mapping bound: folded into a literal
    when the scope determines it, its value a `Logic` or a float."""
    return SIMPLIFIER(expression, scope)
