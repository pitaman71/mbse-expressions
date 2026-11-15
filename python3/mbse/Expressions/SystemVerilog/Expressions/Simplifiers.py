"""Simplifiers of the SystemVerilog dialect: simplify an expression by IEEE 1800-2023's rules, in Python.

`Simplifiers.OfAny(expression, scope)` simplifies a term (or anything `Terms.term` reads one from) in a `Scope` (see
`mbse.Expressions.Framework.Simplifiers`): what the scope determines folds into the literal of its value, and what it
does not stays, the residual, its subterms folded wherever that keeps its meaning. A value is a `Domains.Logic` for an
integral result, a float for a real one, None for the null class handle, a list for an array or a queue, or an object
(a mapping, a data object) for a structure or a class handle. A variable's type is its value's: a `Logic` its own, a
bool a `bit`, an int an `integer` (or a `longint` beyond 32 bits), a float a `real`, and a string a vector of its bytes
(in UTF-8). Every named type it computes in (a literal's, a cast's, `===`'s `bit`, `size()`'s `int`, `$bits`'
`integer`, ...) is the domain SystemVerilog defines by that name in the store of the term's holder (`Domains.named`),
read once per folding when it is first needed: a lone term is refused where it needs one (mbse-schemas' TypeError), and
a store where SystemVerilog's `define` has not run defines none.

A `Scope(variables, functions, packages=..., types=..., timeunit=..., timeprecision=..., mintypmax=...)` gives what an
expression may reach, and nothing else is reachable: `variables` (`this` among them, by that name); the `functions` it
may call, each a callable or a `Subroutine` that names its formals and their defaults; its `packages`, each a `Scope`
of a package's variables and functions, which a scoped name reads (`pkg::x`, `pkg::f(x)`, `$unit::x`); the `types` of
names it does not bind, as a declaration gives them, which size what stays around them; the time unit and precision a
time literal scales to (`"1ns"`, `"100ps"`: `timeunit`, 3.14.2.2, and its precision, the unit's own by default), without
which a time literal stays; and which of `min:typ:max` is chosen (11.11; `typ` by default).

The rules (`RULES`) fold every kind the evaluation inventory gives a value (mbse-expressions'
[the evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#systemverilog), SystemVerilog),
`FOLDED`: literals (an unsized integer, decimal or based, a real, a string, and a time literal in the scope's time unit,
rounded to its precision) and constants (a vector, sized or not, a fill in its context's width, and `null`); a name, a
package's scoped name and `this`; members, indexes and range selects (`[msb:lsb]`, `[base+:width]`, `[base-:width]`, of a
vector or of an array or a queue, whose last index `$` is); the unary, binary and conditional operators, `inside`
(with value ranges, `$` bounding a range by its type, and the tolerances `[a +/- b]` and `[a +%- b]`), `matches` and
`&&&` (a constant, a wildcard or a variable pattern, its variable bound in the conditional's consequence), concatenation,
replication and streaming (11.4.14); `min:typ:max`; the empty queue; casts (to a type SystemVerilog's keywords name, a
vector of constant dimensions, a signing, a width or a `string`); the system functions `SYSTEM` (sizes and signs, the
math functions, the conversions between reals and bits, `$countbits`, the array queries, `$sformatf`); calls of the
scope's functions, by position, by name (`.b(2)`) and with defaults (`f(1, , 3)`); and the methods of strings (6.16)
and arrays (7.12: `size()`, the reductions and the locators, with or without `with`, and `item.index()`). What it
has no rule for stays in the residual, named ("SystemVerilog incrementexpression is not simplified"): a kind the
inventory gives no value (`b`), one waiting on domain inference (`c`: an assignment pattern, a tagged union, an
enumeration's methods, a cast to a structure), and one only a simulator or mbse-programs can give a value (`d`: a
write, a class, the design hierarchy, a system function reading a simulator's state or acting); `CATEGORIES` gives each
its class.

IEEE 1800's rules apply:

- Sizing (11.6, 11.8): an operator's operands are context-determined or self-determined; the context-determined ones
  are extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
  context-determined operands are), and zero-extended otherwise. A real operand makes the expression real. An unsized
  based integer is unsigned, unless written signed, of 32 bits; an unsized vector is extended to 32 bits by its leftmost
  bit where it is x or z, else by 0; a fill (`'1`) fills its context's width. A cast to an integral type takes its
  operand as an assignment would (6.24.1): the operand is computed in the wider of the two widths, by its own
  signedness, then converted.
- 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the bitwise
  operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and `!=?`
  treat x and z in the right operand as wildcards. Division by zero gives x.
- `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
  otherwise x); a conditional with an x condition merges its operands bit by bit. Class handles compare by identity,
  `null` with them.
- A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a 2-state
  type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), an integer becomes a real, and a
  vector becomes a `string` of its bytes, NUL bytes dropped.

What stays keeps its meaning: a subterm folds only into a literal that means what it meant there. A self-determined
subterm (a concatenation's operand, a shift's count, a condition, an index, a function's argument) folds alone, into the
literal of its own type; a context-determined one (an operand of `+`, of a comparison, a conditional's branch), whose
width and signedness are its context's, folds once its context is known, as 11.6 sizes it from the whole expression:
the types of the scope's values, and of the names it does not bind as its `types` declare them. A subterm whose
context's type is not known, or whose type has no literal in SystemVerilog (a 2-state type, `shortreal`), where its
states or format could still change what stays around it, is kept, its own subterms simplified; it is the rule, not a
gap, and names no residue. The root, whose context is no expression's, always folds; an `integer`'s value is written as
an unsized decimal integer, any other integral value as a sized vector of its bits and signedness, a real as a real and
`null` as itself. `&&` and `||` are decided by an operand that decides them (`y && 0` is `1'b0`), and a conditional by a
known condition, where the branch it keeps has the conditional's own type.
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Patterns.Expressions import Ieee754
from mbse.Expressions.Framework import Objects, Simplifiers as FS, Symbolics as S, Terms as F
from mbse.Schemas.Framework import Proxies

from . import Domains, Expressions as X, Formats
from .Domains import Logic, SvType

__all__ = ["OfAny", "Scope", "Subroutine", "RULES", "SIMPLIFIER", "FOLDED", "CATEGORIES", "SYSTEM", "METHODS",
           "STRING_METHODS", "LOCATORS"]

_EVEN = "roundTiesToEven"
_ONE = Domains.vector(1)

# The sublanguages' kinds the rules read, by tag (their modules import this one's dialect).
_VECTOR, _ATOM, _NONINTEGER, _KEYWORD, _IMPLICIT = (
    "integervectortype", "integeratomtype", "nonintegertype", "keywordtype", "implicittype")
_VARIABLE, _WILDCARD, _PARENTHESIZED_PATTERN = "variablepattern", "wildcardpattern", "parenthesizedpattern"

MATH = ("$ln", "$log10", "$exp", "$sqrt", "$pow", "$floor", "$ceil", "$sin", "$cos", "$tan", "$asin", "$acos",
        "$atan", "$atan2", "$hypot", "$sinh", "$cosh", "$tanh", "$asinh", "$acosh", "$atanh")
"""The math functions (20.8.2), each C's, over reals."""
CONVERSIONS = ("$rtoi", "$itor", "$realtobits", "$bitstoreal", "$shortrealtobits", "$bitstoshortreal")
"""The conversions between reals, integers and their bits (20.5)."""
QUERIES = ("$left", "$right", "$low", "$high", "$increment", "$size", "$dimensions", "$unpacked_dimensions")
"""The array query functions (20.7), over a value's packed width or a list's length, or a type's dimensions."""
SYSTEM = (*X.SYSTEM, "$countbits", "$isunbounded", *CONVERSIONS, *MATH, *QUERIES, "$sformatf")
"""The system functions its rules fold: `Expressions.SYSTEM`, then those clauses 20 and 21 define a value of."""
LOCATORS = ("find", "find_index", "find_first", "find_first_index", "find_last", "find_last_index")
"""The array locator methods that need a `with` clause (7.12.1)."""
METHODS = (*X.METHODS, "unique_index")
"""The array methods of no arguments its rules fold."""
_WITH = (*X.REDUCTIONS, *LOCATORS, "min", "max", "unique", "unique_index")
STRING_METHODS = ("len", "getc", "toupper", "tolower", "compare", "icompare", "substr", "atoi", "atohex", "atooct",
                  "atobin", "atoreal")
"""The string methods its rules fold (6.16), those that write the string aside."""
_UNITS = {"s": 0, "ms": -3, "us": -6, "ns": -9, "ps": -12, "fs": -15}
_REAL = re.compile(r"[+-]?(\d[\d_]*)?(\.[\d_]*)?([eE][+-]?\d[\d_]*)?")


class Subroutine:
    """A function a scope provides, with the names of its `formals` and the `defaults` some have, so that a call may
    connect an argument by name (`f(.b(2))`) or leave it to its default (`f(1, , 3)`, `f(1)`) (13.5); it is called with
    its arguments in its formals' order."""

    def __init__(self, implementation: Callable[..., Any], formals: tuple[str, ...] = (),
                 defaults: Mapping[str, Any] | None = None):
        self.implementation, self.formals, self.defaults = implementation, tuple(formals), dict(defaults or {})

    def __call__(self, *arguments: Any) -> Any:
        return self.implementation(*arguments)


def _time_unit(text: str, what: str) -> tuple[int, int]:
    """A time unit's magnitude and its unit's power of ten, from its text: 1, 10 or 100 of s, ms, us, ns, ps or fs."""
    for magnitude in ("100", "10", "1"):
        unit = text[len(magnitude):]
        if text.startswith(magnitude) and unit in _UNITS:
            return int(magnitude), _UNITS[unit]
    raise ValueError(f"a {what} is 1, 10 or 100 of s, ms, us, ns, ps or fs, got {text!r}")


class Scope(S.Variables):
    """SystemVerilog's scope for an expression: its `variables`, `functions` and `packages`, the declared `types` of
    names it does not bind, a time literal's unit and precision, and the choice of `min:typ:max`."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None, *,
                 packages: Mapping[str, Scope] | None = None, types: Mapping[str, SvType] | None = None,
                 timeunit: str | None = None, timeprecision: str | None = None, mintypmax: str = "typ"):
        super().__init__(variables)
        self.functions = dict(functions or {})
        self.packages, self.types = dict(packages or {}), dict(types or {})
        if mintypmax not in ("min", "typ", "max"):
            raise ValueError(f"min:typ:max's choice is min, typ or max, got {mintypmax!r}")
        self.mintypmax = mintypmax
        self.timeunit = None if timeunit is None else _time_unit(timeunit, "time unit")
        self.timeprecision = self.timeunit if timeprecision is None else _time_unit(timeprecision, "time precision")
        if self.timeunit is not None:
            (unit, power), (precision, finer) = self.timeunit, self.timeprecision
            if precision * 10 ** (finer + 15) > unit * 10 ** (power + 15):
                raise ValueError(f"a time precision is at most its unit, got {timeprecision} for {timeunit}")
        elif timeprecision is not None:
            raise ValueError("a time precision needs a time unit")

    def function(self, name: str) -> Callable[..., Any]:
        if name not in self.functions:
            raise S.Unbound(name)
        return self.functions[name]

    def declared(self, name: str) -> SvType | None:
        """The type a name the scope does not bind is declared with, or None."""
        return None if name in self.values else self.types.get(name)


class _InContext(S.Unbound):
    """Raised for a subterm whose value is its context's to compute (an operand whose context is not known, `$` outside
    the select it indexes): the simplifier leaves it as it is, its own subterms simplified, and names no residue."""


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


def _representable(ctype: SvType) -> bool:
    """Whether a literal has the type: a 4-state integral type's (a sized vector, or an unsized decimal integer's), or a
    real's; no literal has a 2-state type, nor `shortreal`."""
    return ctype.states == 4 if ctype.kind == "integral" else ctype.format == "binary64"


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


def _handle(value: Any) -> bool:
    """Whether a value is a class handle: `null`, or an object."""
    return value is None or isinstance(value, Mapping) or Objects.is_object(value)


# --- The terms, read once ---

FOLDED = frozenset({
    X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION, X.INDEXEXPRESSION, X.RANGESELECT, X.UNARYEXPRESSION,
    X.BINARYEXPRESSION, X.CONDITIONALEXPRESSION, X.PARENTHESIZEDEXPRESSION, X.INSIDEEXPRESSION, X.CONCATENATION,
    X.REPLICATION, X.CASTEXPRESSION, X.SYSTEMCALL, X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION, X.THISEXPRESSION,
    X.DOLLAREXPRESSION, X.EMPTYQUEUE, X.STREAMINGCONCATENATION, X.MINTYPMAXEXPRESSION, X.MATCHESEXPRESSION,
    X.PREDICATEEXPRESSION, X.NAMEDCONNECTION, X.EMPTYARGUMENT})
"""The kinds its rules fold: those it folded before the dialect was complete, and the nine more the evaluation
inventory gives a value; a `namedconnection` and an `emptyargument` within a call, a `dollarexpression` within a select
or a range; any other kind stays in the residual, named."""

_OWN_KINDS = frozenset({
    X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION, X.INDEXEXPRESSION, X.CALLEXPRESSION,
    X.ARRAYMETHODWITHEXPRESSION, X.CONCATENATION, X.REPLICATION, X.RANGESELECT, X.SYSTEMCALL, X.THISEXPRESSION,
    X.EMPTYQUEUE, X.STREAMINGCONCATENATION})
"""The kinds whose type is their value's."""
_PROPAGATING = ("+", "-", "*", "/", "%", "**", "&", "|", "^", "^~", "~^", "<<", ">>", "<<<", ">>>")
_COMPARISONS = ("<", "<=", ">", ">=", "==", "!=", "===", "!==", "==?", "!=?")
_LOGICAL = ("&&", "||", "->", "<->")
_SHIFTS = ("<<", ">>", "<<<", ">>>")


def _owner(node: Any) -> str:
    """The name of the dialect of the family that owns a node's kind (`Terms.Dialect.owner`): SystemVerilog's own, or a
    sublanguage's."""
    return X.DIALECT.owner(node.term).name()


class _Part:
    """A helper read once: its `kind`, its `attributes`, and its members as attributes, its subterms `_Node`s."""

    def __init__(self, part: F.Node):
        self.kind, self.attributes = part.kind, dict(part.attributes)
        self.__dict__.update(part.attributes)
        self.__dict__.update({name: None if a is None else _Node(a) for name, a in part.subterms.items()})
        self.__dict__.update({name: _parts_of(value) for name, value in part.helpers.items()})

    def __getattr__(self, name: str) -> Any:  # a member it does not hold
        return None


def _parts_of(value: Any) -> Any:
    return tuple(_Part(p) for p in value) if isinstance(value, tuple) else None if value is None else _Part(value)


class _Node:
    """A term read once for one evaluation: its `kind` (as `Expressions.DIALECT` reads it, a term of any of its family's
    dialects), and its members as attributes, its attributes (None where not set), its helpers (`_Part`s), its subterms
    (a `_Node`, None where empty) and its variadic arguments (each container's, a tuple of `_Node`s). `term` is the term
    value read."""

    def __init__(self, term: Any):
        tag, record, _ = X.DIALECT.kind(term)
        node = F.node(tag, record)
        _, _, names = F._parts(record.as_schema())
        members: dict[str, Any] = dict.fromkeys(names)
        members.update(node.attributes)
        members.update({name: _parts_of(value) for name, value in node.helpers.items()})
        members.update({name: None if a is None else _Node(a) for name, a in node.subterms.items()})
        members.update({name: tuple(_Node(a) for a in terms) for name, terms in node.lists.items()})
        self.__dict__.update(members)
        self.term, self.kind = term, tag


def _spelling(name: Any) -> str:
    return name.attributes["spelling"]


def _transparent(node: Any) -> bool:
    """Whether a term passes its context to its operands, so that its value is its context's (11.6.1): parentheses,
    `min:typ:max`, the conditional, unary `+`, `-` and `~`, and the binary arithmetic, bitwise and shift operators."""
    if node.kind in (X.PARENTHESIZEDEXPRESSION, X.MINTYPMAXEXPRESSION, X.CONDITIONALEXPRESSION):
        return True
    if node.kind == X.UNARYEXPRESSION:
        return node.operator in ("+", "-", "~")
    return node.kind == X.BINARYEXPRESSION and node.operator in _PROPAGATING


_NOT_SET = object()


class _Evaluation:
    """One evaluation in a scope: each term's self-determined type, then its value in a context."""

    def __init__(self, scope: Any, types: _Types, iterators: Mapping[str, int] | None = None):
        self.scope, self.stored = scope, types
        self._iterators = dict(iterators or {})  # a `with` clause's iterator, and its item's index
        self._types: dict[int, SvType | None] = {}
        self._values: dict[int, Any] = {}
        self._branches: dict[int, _Evaluation] = {}
        self._last: list[Any] = []  # the last index of each array a select indexes, innermost last

    def within(self, bindings: Mapping[str, Any], hidden: bool = False) -> _Evaluation:
        """An evaluation with names bound to values, or hidden (bound to `UNKNOWN`)."""
        scope = self.scope
        for name, value in bindings.items():
            scope = scope.bind(name, S.UNKNOWN if hidden else value)
        return _Evaluation(scope, self.stored, self._iterators)

    def type(self, node: Any) -> SvType | None:
        """The term's self-determined type (None for an object); a kind it does not fold is refused by name."""
        if node.kind not in FOLDED:
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
        kind = node.kind
        if kind == X.CONSTANT and node.fill is not None:
            return _ONE  # self-determined, a fill is a bit
        if kind == X.DOLLAREXPRESSION:
            return self.stored.named("integer")
        if kind == X.SYSTEMCALL and node.name == "$bitstoshortreal":
            return self.stored.named("shortreal")
        if kind == X.NAMEEXPRESSION:
            try:
                return _type(self.own(node), self.stored)
            except S.Unbound:
                declared = self.scope.declared(F.name_of(node.term))
                if declared is None:
                    raise
                return declared
        if kind in _OWN_KINDS:
            return _type(self.own(node), self.stored)
        if kind == X.PARENTHESIZEDEXPRESSION:
            return self.type(node.expression)
        if kind == X.MINTYPMAXEXPRESSION:
            return self.type(self._chosen(node))
        if kind == X.UNARYEXPRESSION:
            if node.operator in ("+", "-"):
                return self.type(node.operand)
            if node.operator == "~":
                return self._integral(node.operand, "~")
            return _ONE
        if kind == X.BINARYEXPRESSION:
            op = node.operator
            if op in _COMPARISONS[:6] or op in _LOGICAL or op in ("==?", "!=?"):
                return _ONE
            if op in ("===", "!=="):
                return self.stored.named("bit")
            if op in _SHIFTS:
                return self._integral(node.left, op)
            left, right = self._numeric(node.left, op), self._numeric(node.right, op)
            if op == "**" and "real" not in (left.kind, right.kind):
                return left  # its exponent is self-determined
            return Domains.common([left, right])
        if kind == X.CONDITIONALEXPRESSION:  # its condition first: one it does not fold is refused by name before the
            self.type(node.condition)  # branches, which may name what its pattern binds, are sized
            branch = self._branch(node.condition)
            return Domains.common([branch._numeric(node.consequence, "?:"), self._numeric(node.alternative, "?:")])
        if kind == X.MATCHESEXPRESSION:
            self._pattern(node.pattern)
            return _ONE
        if kind in (X.INSIDEEXPRESSION, X.PREDICATEEXPRESSION):
            return _ONE
        if kind in (X.NAMEDCONNECTION, X.EMPTYARGUMENT):  # a call's: alone, no value
            raise FS.NoRule("SystemVerilog", kind, kind)
        return self._cast_type(node)  # a cast

    # Types a cast and a system function name

    def _type_term(self, target: Any, what: str) -> SvType | None:
        """The type a term of `SystemVerilog Types` names: a type SystemVerilog's keywords name, with a signing; a
        vector of constant packed dimensions; a real; or a `string` (None). Any other stays, named (`what` of its
        kind)."""
        kind = target.kind
        if kind == _VECTOR:
            if not target.dimensions and target.signing is None:
                return self.stored.named(target.keyword)
            width = 1
            for dimension in target.dimensions:
                if dimension.kind != "rangedimension":  # an unpacked or a queue's dimension: no vector's
                    raise FS.NoRule("SystemVerilog Types", dimension.kind, dimension.kind)
                left, right = (self._constant(bound, "a dimension's bound") for bound in (dimension.left, dimension.right))
                width *= abs(left - right) + 1
            return Domains.vector(width, target.signing == "signed", 2 if target.keyword == "bit" else 4)
        if kind == _ATOM:
            named = self.stored.named(target.keyword)
            return named if target.signing is None else Domains.vector(named.width, target.signing == "signed",
                                                                        named.states)
        if kind == _NONINTEGER:  # `realtime` is `real` (6.12)
            return self.stored.named("real" if target.keyword == "realtime" else target.keyword)
        if kind == _KEYWORD and target.keyword == "string":
            return None
        raise FS.NoRule("SystemVerilog", f"{what} {kind}", X.CASTEXPRESSION)

    def _cast_type(self, cast: Any) -> SvType:
        """A cast's type: a width's, sized by its operand; a signing's, of its operand's width; a string's, its
        value's; or the type its type names."""
        target = cast.type
        operand = self._numeric(cast.value, "a cast")
        if target.kind == _IMPLICIT and target.signing is not None and not target.dimensions:
            integral = self._integral(cast.value, f"{target.signing}'")
            return Domains.vector(integral.width, target.signing == "signed", integral.states)
        if X.DIALECT.owner(target.term) is X.DIALECT:  # a width: a known positive integer
            width = self._constant(target, "a cast's width")
            if width < 1:
                raise ValueError(f"a cast's width must be positive, got {width}")
            return Domains.vector(width, operand.signed, operand.states)
        named = self._type_term(target, "castexpression to")
        return named if named is not None else _type(self._string(cast), self.stored)

    def _cast_context(self, cast: Any) -> SvType | None:
        """The context a cast gives its operand: an integral type's, as an assignment does (the wider width, by the
        operand's own signedness and states); none for a signing, a real or a string, or a real operand."""
        if cast.type.kind in (_IMPLICIT, _KEYWORD):
            return None
        ctype, operand = self.type(cast), self.type(cast.value)
        if ctype.kind == "real" or operand.kind == "real":
            return None
        return Domains.vector(max(ctype.width, operand.width), operand.signed, operand.states)

    # Values

    def own(self, node: Any) -> Any:
        """A self-determined term's value, of its own type, once."""
        if id(node) not in self._values:
            self._values[id(node)] = self._own(node)
        return self._values[id(node)]

    def _own(self, node: Any) -> Any:
        kind = node.kind
        if kind == X.LITERAL:
            return self._literal(node)
        if kind == X.CONSTANT:
            return self._vector(node)
        if kind == X.NAMEEXPRESSION:
            return self._name(node)
        if kind == X.THISEXPRESSION:
            return typed(self.scope.value("this"), self.stored)
        if kind == X.EMPTYQUEUE:
            return []
        if kind == X.DOLLAREXPRESSION:
            return self._dollar()
        if kind == X.MEMBEREXPRESSION:
            return self._member(node)
        if kind == X.INDEXEXPRESSION:
            return self._select(node)
        if kind == X.RANGESELECT:
            return self._range(node)
        if kind == X.CONCATENATION:
            return self._concatenation([self.value(item) for item in node.items])
        if kind == X.REPLICATION:
            return self._replication(node)
        if kind == X.STREAMINGCONCATENATION:
            return self._stream(node)
        if kind == X.ARRAYMETHODWITHEXPRESSION:
            return self._with(node)
        if kind == X.SYSTEMCALL:
            return self._system_call(node)
        return self._call(node)

    def _literal(self, node: Any) -> Any:
        """A literal's value: an unsized based integer of its own type, a decimal one an `integer` or a `longint`, a
        real, a string's bytes, or a time literal's magnitude in the scope's time unit."""
        if node.unit is not None:
            return self._time(node.value, node.unit)
        if node.base is not None:
            return Logic.number(Domains.unsized(node.value, bool(node.signed)), node.value)
        return typed(node.value, self.stored)

    def _time(self, magnitude: float, unit: str) -> float:
        """A time literal's value: its magnitude in the scope's time unit, rounded to its time precision (3.14.2)."""
        if self.scope.timeunit is None:
            raise FS.NoRule("SystemVerilog", "time literal without a time unit", X.LITERAL)
        (scale, power), (precision, finer) = self.scope.timeunit, self.scope.timeprecision
        steps = magnitude
        shift = _UNITS[unit] - finer
        steps = steps * 10 ** shift if shift >= 0 else steps / 10 ** -shift
        count = _round(steps / precision)  # a whole number of precision steps
        numerator, denominator = count * precision, scale
        shift = finer - power
        if shift >= 0:
            numerator *= 10 ** shift
        else:
            denominator *= 10 ** -shift
        return float(numerator) / float(denominator)

    def _vector(self, node: Any) -> Any:
        """A constant's value: `null`, or its vector, of its size or, unsized, extended to 32 bits by its leftmost bit
        where x or z."""
        if node.bits is None:  # `null`
            return None
        bits = node.bits
        if node.size is None and len(bits) < 32:
            bits = (bits[0] if bits[0] in "xz" else "0") * (32 - len(bits)) + bits
        return Logic.of(bits, bool(node.signed))

    def _name(self, node: Any) -> Any:
        """A name's value: an identifier's, the scope's; a package's scoped name's (`p::x`), its package's."""
        name = node.name
        if name.kind == "identifier":
            return typed(self.scope.lookup(node.term), self.stored)
        if name.kind == "scopedname":
            package, member = self._package(name)
            return typed(package.value(member), self.stored)
        raise FS.NoRule("SystemVerilog", f"nameexpression of a {name.kind}", X.NAMEEXPRESSION)

    def _package(self, name: Any) -> tuple[Any, str]:
        """The package a scoped name names, as the scope provides it (`$unit` the compilation unit's), and its member's
        name; a scoped name of a class, or of a package the scope does not provide, stays, named."""
        scope, member = name.scope, name.name
        package = _spelling(scope) if scope.kind == "identifier" else "$unit" if scope.kind == "unitname" else None
        packages = self.scope.packages
        if package not in packages or member.kind != "identifier":
            raise FS.NoRule("SystemVerilog", "scopedname", X.NAMEEXPRESSION)
        return packages[package], _spelling(member)

    def value(self, node: Any, context: SvType | None = None) -> Any:
        """The term's value in a context: its own type's, unless the context gives another."""
        ctype = self.type(node)
        target = context if context is not None else ctype
        kind = node.kind
        if kind == X.PARENTHESIZEDEXPRESSION:
            return self.value(node.expression, context)
        if kind == X.MINTYPMAXEXPRESSION:
            return self.value(self._chosen(node), context)
        if kind == X.CONSTANT and node.fill is not None:  # every bit of its context's width
            filled = Logic.of(node.fill * (target.width if target.kind == "integral" else 1))
            return _convert(filled, target, False)
        if kind == X.UNARYEXPRESSION and node.operator in ("+", "-", "~"):
            return self._unary(node.operator, self.value(node.operand, target), target)
        if kind == X.BINARYEXPRESSION:
            return self._binary(node, target)
        if kind == X.CONDITIONALEXPRESSION:
            return self._conditional(node, target)
        result = self._self_determined(node)
        if ctype is None:  # an object, an array
            return result
        return _convert(result, target, ctype.signed and target.signed)  # sign-extended only in a signed context

    def _self_determined(self, node: Any) -> Any:
        kind = node.kind
        if kind == X.UNARYEXPRESSION:
            return self._reduction(node.operator, self.value(node.operand))
        if kind == X.INSIDEEXPRESSION:
            return self._inside(node)
        if kind == X.MATCHESEXPRESSION:
            return _bit(self._matches(node))
        if kind == X.PREDICATEEXPRESSION:
            return _bit(self._predicate(node))
        if kind == X.CASTEXPRESSION:
            ctype = self.type(node)
            if node.type.kind == _KEYWORD:
                return self._string(node)
            return _convert(self.value(node.value, self._cast_context(node)), ctype)
        return self.own(node)

    def _string(self, cast: Any) -> Logic:
        """A cast to `string`: its operand's bytes, NUL bytes dropped."""
        value = self.value(cast.value)
        if not isinstance(value, Logic):
            raise TypeError(f"string' expects an integral operand, got {type(value).__name__}")
        return Formats.vector(Formats.text(value))

    def _chosen(self, node: Any) -> Any:
        """The expression of `min:typ:max` the scope chooses."""
        return {"min": node.min, "typ": node.typ, "max": node.max}[self.scope.mintypmax]

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
        if op in _LOGICAL:
            return _convert(self._logical(op, node), target, False)
        if op in _COMPARISONS:
            left_type, right_type = self.type(node.left), self.type(node.right)
            if None in (left_type, right_type) and op in ("==", "!=", "===", "!=="):  # class handles, by identity
                left, right = self.value(node.left), self.value(node.right)
                if not (_handle(left) and _handle(right)):
                    self._numeric(node.left if left_type is None else node.right, op)
                    raise TypeError(f"{op} compares a class handle with a class handle")
                same = int((left is right) == (op in ("==", "===")))
                return _convert(Logic(self.stored.named("bit"), same) if op in ("===", "!==") else _bit(same),
                                target, False)
            shared = Domains.common([self._numeric(node.left, op), self._numeric(node.right, op)])
            left, right = self.value(node.left, shared), self.value(node.right, shared)
            return _convert(self._compare(op, left, right, shared), target, False)
        if op in _SHIFTS:
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

    # Conditions, and the patterns `matches` compares a value with (12.6)

    def _conditional(self, node: Any, target: SvType) -> Any:
        truth = self._condition(node.condition)
        if truth == 0:
            return self.value(node.alternative, target)
        branch = self._branch(node.condition)
        if truth == 1:
            return branch.value(node.consequence, target)
        a, b = branch.value(node.consequence, target), self.value(node.alternative, target)
        if target.kind == "real":
            return a if a == b else 0.0
        (a1, a0), (b1, b0) = _parts(a), _parts(b)
        return _make(target, a1 & b1, a0 & b0)  # bits that agree keep their value; the others are x

    def _condition(self, condition: Any) -> int | None:
        """A condition's truth: a `matches`', a `&&&`'s, or its value's."""
        if condition.kind == X.MATCHESEXPRESSION:
            return self._matches(condition)
        if condition.kind == X.PREDICATEEXPRESSION:
            return self._predicate(condition)
        return _truth(self.value(condition))

    def _branch(self, condition: Any) -> _Evaluation:
        """The evaluation of a conditional's consequence: this one, with what its condition's patterns bind bound."""
        if not X._matched(condition.term):
            return self
        if id(condition) not in self._branches:
            self._branches[id(condition)] = self.within(self._bindings(condition))
        return self._branches[id(condition)]

    def _bindings(self, condition: Any) -> dict[str, Any]:
        """What a condition's variable patterns bind, each the value its `matches` compares (12.6.2); those of a `&&&`'s
        conditions, each in the scope the conditions before it bind."""
        if condition.kind == X.MATCHESEXPRESSION:
            pattern = self._pattern(condition.pattern)
            return {_spelling(pattern.name): self.value(condition.value)} if pattern.kind == _VARIABLE else {}
        found: dict[str, Any] = {}
        evaluation = self
        for inner in condition.conditions if condition.kind == X.PREDICATEEXPRESSION else ():
            bound = evaluation._bindings(inner)
            if bound:
                found.update(bound)
                evaluation = evaluation.within(bound)
        return found

    def _pattern(self, pattern: Any) -> Any:
        """A pattern within its parentheses; a tagged or a structure pattern stays, named."""
        while pattern.kind == _PARENTHESIZED_PATTERN:
            pattern = pattern.pattern
        if pattern.kind in ("taggedpattern", "structurepattern"):
            raise FS.NoRule("SystemVerilog", f"matchesexpression {pattern.kind}", X.MATCHESEXPRESSION)
        return pattern

    def _matches(self, node: Any) -> int:
        """Whether a value matches a pattern: a variable or a wildcard pattern any value, a constant pattern a value
        identical to it (`===`)."""
        pattern = self._pattern(node.pattern)
        if pattern.kind in (_VARIABLE, _WILDCARD):
            return 1
        shared = Domains.common([self._numeric(node.value, "matches"), self._numeric(pattern, "matches")])
        return int(_truth(self._compare("===", self.value(node.value, shared), self.value(pattern, shared),
                                         shared)) == 1)

    def _predicate(self, node: Any) -> int | None:
        """A `&&&`'s truth: its conditions' and, left to right, each in the scope the conditions before it bind."""
        evaluation, result = self, 1
        for condition in node.conditions:
            truth = evaluation._condition(condition)
            if truth == 0:
                return 0
            if truth is None:
                result = None
            bound = evaluation._bindings(condition)
            if bound:
                evaluation = evaluation.within(bound)
        return result

    # inside (11.4.13)

    def _inside_items(self, node: Any) -> list[tuple[str, Any]]:
        """An `inside`'s items: a value, a range, or an element of an array among them."""
        items: list[tuple[str, Any]] = []
        for item in node.set:
            if item.kind == X.VALUERANGE:
                items.append(("range", item))
            elif self.type(item) is None and isinstance(self.own(item), list):  # an array: each of its elements
                items.extend(("element", element) for element in self._items(self.own(item), "inside"))
            else:
                items.append(("value", item))
        return items

    def _inside_type(self, node: Any, items: list[tuple[str, Any]]) -> SvType:
        """The type an `inside`'s value and items share; a range's `$` bound takes it, and adds nothing to it."""
        types = [self._numeric(node.value, "inside")]
        for what, item in items:
            if what == "element":
                types.append(self._element_type(item))
            elif what == "value":
                types.append(self._numeric(item, "inside"))
            else:
                types += [self._numeric(end, "inside") for end in (item.left, item.right)
                          if end.kind != X.DOLLAREXPRESSION]
        return Domains.common(types)

    def _inside(self, node: Any) -> Logic:
        items = self._inside_items(node)
        shared = self._inside_type(node, items)
        value = self.value(node.value, shared)
        found: int | None = 0
        for what, item in items:
            if what == "element":
                signed = isinstance(item, Logic) and item.type.signed and shared.signed
                match = self._compare("==?", value, _convert(item, shared, signed), shared)
            elif what == "value":
                match = self._compare("==?", value, self.value(item, shared), shared)
            else:
                low, high = self._span(item, shared)
                truths = (_truth(self._compare(">=", value, low, shared)), _truth(self._compare("<=", value, high, shared)))
                match = _bit(0 if 0 in truths else None if None in truths else 1)
            truth = _truth(match)
            if truth == 1:
                return _bit(1)
            if truth is None:
                found = None
        return _bit(found)

    def _span(self, item: Any, shared: SvType) -> tuple[Any, Any]:
        """A value range's bounds: `[low:high]`, `$` the least or the greatest value of their type; `[a +/- b]` from
        `a - b` to `a + b`; `[a +%- b]` from `a - a * b / 100` to `a + a * b / 100` (1800-2023)."""
        if item.operator is None:
            return self._bound(item.left, shared, False), self._bound(item.right, shared, True)
        a, b = self.value(item.left, shared), self.value(item.right, shared)
        if item.operator == "+%-":
            hundred = _convert(Logic.number(self.stored.named("integer"), 100), shared)
            b = self._arithmetic("/", self._arithmetic("*", a, b, shared), hundred, shared)
        return self._arithmetic("-", a, b, shared), self._arithmetic("+", a, b, shared)

    def _bound(self, end: Any, shared: SvType, high: bool) -> Any:
        if end.kind != X.DOLLAREXPRESSION:
            return self.value(end, shared)
        if shared.kind == "real":
            return math.inf if high else -math.inf
        least = -(1 << (shared.width - 1)) if shared.signed else 0
        return Logic.number(shared, least - 1 if high else least)  # the greatest wraps from one below the least

    # Arrays and their methods (7.12)

    def _items(self, value: Any, what: str) -> list[Any]:
        """An array's items, typed."""
        if not isinstance(value, list):
            raise TypeError(f"{what} is a method of arrays, not of {type(value).__name__}")
        return [typed(item, self.stored) for item in value]

    def _array_method(self, array: Any, name: str) -> Any:
        """An array's method of no arguments: its size, a reduction, or a locator."""
        items = self._items(self.value(array), f"{name}()")
        if name == "size":
            return Logic.number(self.stored.named("int"), len(items))
        if name in X.REDUCTIONS:
            return self._reduce(name, items)
        return self._locate(name, items, items)

    def _with(self, node: Any) -> Any:
        """An array method with a `with` clause: its call's array's items, each bound to its iterator (its index its
        `index()`), reduced or located by its method over its `with` expression's values."""
        call = node.value
        callee = call.callee if call.kind == X.CALLEXPRESSION else None
        if callee is None or callee.kind != X.MEMBEREXPRESSION or _spelling(callee.member) not in _WITH:
            raise FS.NoRule("SystemVerilog", "arraymethodwithexpression of a call that is not an array method's",
                            node.kind)
        method = _spelling(callee.member)
        iterator = next(iter(X._array_method_scopes(F.kind_of(node.term)[1])[1]))
        items = self._items(self.value(callee.value), f"{method}()")
        values = [_Evaluation(self.scope.bind(iterator, item), self.stored, {**self._iterators, iterator: i}).value(
            node.body) for i, item in enumerate(items)]
        if method in X.REDUCTIONS:
            return self._reduce(method, values)
        return self._locate(method, items, values)

    def _locate(self, method: str, items: list[Any], keys: list[Any]) -> list[Any]:
        """A locator's queue: the items (or their indexes, `int`s) whose keys hold (`find`...), or the first with the
        least or the greatest key (`min`, `max`), or the first of each set of identical keys (`unique`)."""
        index = self.stored.named("int")
        if method in LOCATORS:
            chosen = [i for i, key in enumerate(keys) if _truth(key) == 1]
            if "first" in method:
                chosen = chosen[:1]
            elif "last" in method:
                chosen = chosen[-1:]
        elif method in ("min", "max"):
            chosen = []
            if keys:
                shared = Domains.common([self._element_type(key) for key in keys])
                best = 0
                for i in range(1, len(keys)):
                    if _truth(self._compare("<" if method == "min" else ">", _convert(keys[i], shared),
                                            _convert(keys[best], shared), shared)) == 1:
                        best = i
                chosen = [best]
        else:  # unique, unique_index
            chosen = []
            for i, key in enumerate(keys):
                if not any(_identical(key, keys[j]) for j in chosen):
                    chosen.append(i)
        if method.endswith("index"):
            return [Logic.number(index, i) for i in chosen]
        return [items[i] for i in chosen]

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

    # Strings' methods (6.16)

    def _string_method(self, value: Any, name: str, arguments: tuple[Any, ...]) -> Any:
        if not isinstance(value, Logic):
            raise TypeError(f"{name}() is a method of strings, not of {type(value).__name__}")
        text = Formats.text(value)
        counts = {"len": 0, "toupper": 0, "tolower": 0, "atoi": 0, "atohex": 0, "atooct": 0, "atobin": 0, "atoreal": 0,
                  "getc": 1, "compare": 1, "icompare": 1, "substr": 2}
        if len(arguments) != counts[name]:
            raise TypeError(f"{name}() takes {counts[name]} arguments, got {len(arguments)}")
        if name == "len":
            return Logic.number(self.stored.named("int"), len(text))
        if name == "toupper":  # ASCII's letters, as C's toupper and tolower change them
            return Formats.vector("".join(c.upper() if "a" <= c <= "z" else c for c in text))
        if name == "tolower":
            return Formats.vector("".join(c.lower() if "A" <= c <= "Z" else c for c in text))
        if name == "getc":
            i = self._constant(arguments[0], "getc's index")
            return Logic.number(self.stored.named("byte"), ord(text[i]) if 0 <= i < len(text) else 0)
        if name == "substr":
            i, j = (self._constant(argument, "substr's index") for argument in arguments)
            return Formats.vector(text[i:j + 1] if 0 <= i <= j < len(text) else "")
        if name in ("compare", "icompare"):
            other = self.value(arguments[0])
            if not isinstance(other, Logic):
                raise TypeError(f"{name}() compares strings, not a {type(other).__name__}")
            a, b = text, Formats.text(other)
            if name == "icompare":
                a, b = a.lower(), b.lower()
            return Logic.number(self.stored.named("int"), (a > b) - (a < b))
        if name == "atoreal":
            return _atoreal(text)
        return Logic.number(self.stored.named("integer"), _atoi(text, {"atoi": 10, "atohex": 16, "atooct": 8,
                                                                         "atobin": 2}[name]))

    # Calls

    def _call(self, node: Any) -> Any:
        """A call: of a function the scope provides, by its name or its package's (`p::f`), of an array's or a string's
        method, or of a `with` clause's iterator's `index()`."""
        callee = node.callee
        if callee.kind == X.NAMEEXPRESSION:
            if callee.name.kind == "scopedname":
                package, name = self._package(callee.name)
            elif callee.name.kind == "identifier":
                package, name = self.scope, _spelling(callee.name)
            else:
                raise FS.NoRule("SystemVerilog", f"callexpression of a {callee.name.kind}", node.kind)
            function = package.function(name)
            return typed(function(*self._arguments(name, function, node.arguments)), self.stored)
        if callee.kind != X.MEMBEREXPRESSION:
            raise FS.NoRule("SystemVerilog", f"callexpression of a {callee.kind}", node.kind)
        name, target = _spelling(callee.member), callee.value
        if (name == "index" and not node.arguments and target.kind == X.NAMEEXPRESSION
                and F.name_of(target.term) in self._iterators):
            return Logic.number(self.stored.named("int"), self._iterators[F.name_of(target.term)])
        if name in METHODS and not node.arguments:
            return self._array_method(target, name)
        if name in STRING_METHODS:
            return self._string_method(self.value(target), name, node.arguments)
        value = self.value(target)
        if isinstance(value, Mapping) or Objects.is_object(value):
            raise FS.NoRule("SystemVerilog", "callexpression of a class handle's method", node.kind)
        raise FS.NoRule("SystemVerilog", f"callexpression method {name!r}", node.kind)

    def _arguments(self, name: str, function: Any, arguments: tuple[Any, ...]) -> list[Any]:
        """A call's arguments, in its function's formals' order: by position, by name (`.b(2)`, `.b` the caller's `b`),
        an empty one (`f(1, , 3)`, `.b()`) or one left out its default's."""
        special = [a.kind for a in arguments if a.kind in (X.NAMEDCONNECTION, X.EMPTYARGUMENT)]
        if not isinstance(function, Subroutine):
            if special:
                raise FS.NoRule("SystemVerilog", f"callexpression with an {special[0]}"
                                if special[0] == X.EMPTYARGUMENT else f"callexpression with a {special[0]}",
                                X.CALLEXPRESSION)
            return [self.value(argument) for argument in arguments]
        formals, bound = function.formals, {}
        named = False
        for i, argument in enumerate(arguments):
            if argument.kind == X.NAMEDCONNECTION:
                named, formal = True, _spelling(argument.name)
                if formal not in formals or formal in bound:
                    raise TypeError(f"{name} has no formal {formal!r}, or connects it twice")
                bound[formal] = (self.value(argument.value) if argument.value is not None else
                                 typed(self.scope.value(formal), self.stored) if argument.implicit else _NOT_SET)
            elif named or i >= len(formals):
                raise TypeError(f"{name} takes {len(formals)} arguments, its positional ones first")
            else:
                bound[formals[i]] = _NOT_SET if argument.kind == X.EMPTYARGUMENT else self.value(argument)
        values = []
        for formal in formals:
            value = bound.get(formal, _NOT_SET)
            if value is _NOT_SET:
                if formal not in function.defaults:
                    raise TypeError(f"{name}'s argument {formal!r} has no default")
                value = typed(function.defaults[formal], self.stored)
            values.append(value)
        return values

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

    # Selects (11.5)

    def _indexed(self, target: Any, node: Any, what: str) -> int:
        """A select's known index, `$` its array's last index (7.10.1)."""
        self._last.append(len(target) - 1 if isinstance(target, list) else None)
        try:
            return self._constant(node, what)
        finally:
            self._last.pop()

    def _dollar(self) -> Logic:
        """`$`: the last index of the array the innermost select indexes."""
        if not self._last:
            raise _InContext("$")
        if self._last[-1] is None:
            raise TypeError("$ is the last index of a queue or an array, not of a vector")
        return Logic.number(self.stored.named("integer"), self._last[-1])

    def _select(self, node: Any) -> Any:
        target = self.value(node.value)
        self._last.append(len(target) - 1 if isinstance(target, list) else None)
        try:
            index = self.value(node.index)
        finally:
            self._last.pop()
        if isinstance(target, list):
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

    def _range(self, node: Any) -> Any:
        """A range select: `[msb:lsb]`, or an indexed part-select of a constant width, `[base+:width]` (bits base and
        up) or `[base-:width]` (bits base and down); of a vector its bits (x out of range, all x at an x base), of an
        array or a queue its items (7.10.1: none where the range is reversed, clipped to its indexes)."""
        target = self.value(node.value)
        if not isinstance(target, (Logic, list)):
            raise TypeError(f"a {type(target).__name__} cannot be selected from")
        if node.operator == ":":
            msb = self._indexed(target, node.left, "a range's msb")
            lsb = self._indexed(target, node.right, "a range's lsb")
        else:
            width = self._constant(node.right, "a part-select's width")
            if width < 1:
                raise ValueError(f"a part-select's width must be positive, got {width}")
            self._last.append(len(target) - 1 if isinstance(target, list) else None)
            try:
                base = self.value(node.left)
            finally:
                self._last.pop()
            if not (isinstance(base, Logic) and base.known):
                if isinstance(target, list):
                    raise ValueError(f"a part-select's base must be known, got {base!r}")
                return _unknown(Domains.vector(width, False, target.type.states))
            msb, lsb = (_number(base) + width - 1, _number(base)) if node.operator == "+:" else (
                _number(base), _number(base) - width + 1)
        if isinstance(target, list):
            low, high = (msb, lsb) if node.operator == ":" else (lsb, msb)
            return [typed(item, self.stored) for item in target[max(low, 0):high + 1]] if low <= high else []
        if msb < lsb:
            raise ValueError(f"a range's msb must be at least its lsb, got [{msb}:{lsb}]")
        bits = "".join(target.bits[target.type.width - 1 - i] if 0 <= i < target.type.width else "x"
                       for i in range(msb, lsb - 1, -1))
        return Logic.of(bits, False, target.type.states)  # out of range, x

    # Concatenations (11.4.12, 11.4.14)

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

    def _stream(self, node: Any) -> Logic:
        """A streaming concatenation (11.4.14): its items' bits, an array's items' in order, `with [range]` its range of
        items; `{>> {...}}` as they stand, `{<< n {...}}` with each slice of `n` bits, taken from the right, placed left
        to right (`n` a constant or a type's width, 1 by default)."""
        size = 1
        if node.slice is not None:
            owned = X.DIALECT.owner(node.slice.term) is X.DIALECT
            size = self._constant(node.slice, "a stream's slice") if owned else self._type_term(
                node.slice, "streamingconcatenation of").width
            if size < 1:
                raise ValueError(f"a stream's slice must be positive, got {size}")
        values: list[Any] = []
        for item in node.items:
            value = self.value(item.expression)
            if item.operator is not None:
                if not isinstance(value, list):
                    raise TypeError(f"a stream's `with` selects from an array, not a {type(value).__name__}")
                left = self._indexed(value, item.left, "a stream's range")
                right = self._indexed(value, item.right, "a stream's range")
                low, high = (left, right) if item.operator == ":" else (left, left + right - 1) if (
                    item.operator == "+:") else (left - right + 1, left)
                value = value[max(low, 0):high + 1]
            values += [typed(element, self.stored) for element in value] if isinstance(value, list) else [value]
        stream = self._concatenation(values)
        if node.operator == ">>":
            return stream
        bits, reordered = stream.bits, []
        for end in range(len(bits), 0, -size):
            reordered.append(bits[max(end - size, 0):end])
        return Logic.of("".join(reordered), False, stream.type.states)

    # System functions (20, 21)

    def _system_call(self, node: Any) -> Any:
        """A system function's call: one of `SYSTEM`."""
        name, arguments = node.name, node.arguments
        if name not in SYSTEM:
            raise FS.NoRule("SystemVerilog", f"systemcall {name!r}", node.kind)
        if name == "$sformatf":
            return self._sformatf(arguments)
        if name in QUERIES:
            return self._query(name, arguments)
        if name == "$countbits":
            return self._countbits(arguments)
        expected = 2 if name in ("$pow", "$atan2", "$hypot") else 1
        if len(arguments) != expected:
            raise TypeError(f"{name} takes {expected} argument{'s' if expected > 1 else ''}, got {len(arguments)}")
        argument = arguments[0]
        if name == "$isunbounded":  # whether its argument is `$`
            return Logic(self.stored.named("bit"), int(argument.kind == X.DOLLAREXPRESSION))
        if name == "$bits":  # its argument's type's width, or a type's; the argument is not evaluated
            if X.DIALECT.owner(argument.term) is not X.DIALECT:
                ctype = self._type_term(argument, "systemcall '$bits' of")
                if ctype is None:
                    raise FS.NoRule("SystemVerilog", "systemcall '$bits' of keywordtype", node.kind)
            else:
                ctype = self._numeric(argument, name)
            return Logic.number(self.stored.named("integer"), ctype.width)
        values = [self.value(argument) for argument in arguments]
        if name in MATH:
            return self._math(name, values)
        if name in CONVERSIONS:
            return self._conversion(name, values[0])
        return self._system(name, values[0])

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

    def _reals(self, name: str, values: list[Any]) -> list[float]:
        real = self.stored.named("real")
        for value in values:
            if not isinstance(value, (Logic, float)):
                raise TypeError(f"{name} expects a number, got {type(value).__name__}")
        return [_to_real(value, real) for value in values]

    def _math(self, name: str, values: list[Any]) -> float:
        """A math function (20.8.2), as C's library computes it: a domain error NaN, a pole an infinity."""
        x = self._reals(name, values)
        if name == "$pow":
            return _real_power(x[0], x[1], self.stored.named("real"))
        if name in ("$floor", "$ceil"):
            if not math.isfinite(x[0]):
                return x[0]
            return math.copysign(float((math.floor if name == "$floor" else math.ceil)(x[0])), x[0])
        return _c_math(name[1:], x)

    def _conversion(self, name: str, value: Any) -> Any:
        """A conversion (20.5): `$rtoi` truncates a real to an `integer`, `$itor` an integer to a real; `$realtobits`
        and `$shortrealtobits` a real's encoding, of 64 and 32 bits, and `$bitstoreal` and `$bitstoshortreal` back."""
        if name in ("$bitstoreal", "$bitstoshortreal"):
            if not isinstance(value, Logic):
                raise TypeError(f"{name} expects an integral argument, got real")
            format = "binary64" if name == "$bitstoreal" else "binary32"
            return Ieee754.from_bits(format, value.aval & ~value.bval & _mask(Ieee754.WIDTHS[format]))
        if name == "$itor":
            return _to_real(_convert(value, self.stored.named("integer")), self.stored.named("real"))
        (real,) = self._reals(name, [value])
        if name == "$rtoi":
            if not math.isfinite(real):
                raise OverflowError(f"{real!r} has no integer value")
            return Logic.number(self.stored.named("integer"), int(real))
        format = "binary64" if name == "$realtobits" else "binary32"
        encoded = real if format == "binary64" else Ieee754.convert("binary64", real, "binary32", _EVEN)
        return Logic(Domains.vector(Ieee754.WIDTHS[format]), Ieee754.to_bits(format, encoded))

    def _countbits(self, arguments: tuple[Any, ...]) -> Logic:
        """`$countbits(value, control...)`: how many of a value's bits are in the states its control bits name, each the
        least significant bit of its control (20.9)."""
        if len(arguments) < 2:
            raise TypeError(f"$countbits takes 2 arguments or more, got {len(arguments)}")
        value, *controls = (self.value(argument) for argument in arguments)
        for item in (value, *controls):
            if not isinstance(item, Logic):
                raise TypeError(f"$countbits expects integral arguments, got {type(item).__name__}")
        states = {control.bits[-1] for control in controls}
        return Logic.number(self.stored.named("integer"), sum(bit in states for bit in value.bits))

    def _query(self, name: str, arguments: tuple[Any, ...]) -> Logic:
        """An array query (20.7) of a value or a type: its dimensions, an array's or a queue's (its indexes from 0) then
        its items', then a vector's packed `[width-1:0]`, or a type's as declared; a scalar has none. Of a dimension
        beyond them, x."""
        if not 1 <= len(arguments) <= 2:
            raise TypeError(f"{name} takes 1 or 2 arguments, got {len(arguments)}")
        subject = arguments[0]
        if X.DIALECT.owner(subject.term) is not X.DIALECT:
            dimensions, unpacked = self._declared_dimensions(subject, name), 0
        else:
            dimensions, unpacked = _dimensions(self.value(subject), self.stored)
        integer = self.stored.named("integer")
        if name in ("$dimensions", "$unpacked_dimensions"):
            return Logic.number(integer, len(dimensions) if name == "$dimensions" else unpacked)
        dimension = self._constant(arguments[1], f"{name}'s dimension") if len(arguments) == 2 else 1
        if not 1 <= dimension <= len(dimensions):
            return _unknown(integer)
        left, right, size = dimensions[dimension - 1]
        increment = 1 if left >= right else -1
        found = {"$left": left, "$right": right, "$low": right if increment == 1 else left,
                 "$high": left if increment == 1 else right, "$increment": increment, "$size": size}[name]
        return Logic.number(integer, found)

    def _declared_dimensions(self, target: Any, name: str) -> list[tuple[int, int, int]]:
        """A type's packed dimensions, as declared (a keyword's `[width-1:0]`; a scalar's, none)."""
        if target.kind == _VECTOR and target.dimensions:
            found = []
            for dimension in target.dimensions:
                if dimension.kind != "rangedimension":  # an unpacked or a queue's dimension: no vector's
                    raise FS.NoRule("SystemVerilog Types", dimension.kind, dimension.kind)
                left, right = (self._constant(bound, "a dimension's bound") for bound in (dimension.left, dimension.right))
                found.append((left, right, abs(left - right) + 1))
            return found
        ctype = self._type_term(target, f"systemcall {name!r} of")
        if ctype is None or ctype.kind == "real" or target.kind == _VECTOR:
            return []
        return [(ctype.width - 1, 0, ctype.width)]

    def _sformatf(self, arguments: tuple[Any, ...]) -> Logic:
        """`$sformatf(format, ...)`: the string its format writes of its arguments (21.3.3, see `Formats`)."""
        if not arguments:
            raise TypeError("$sformatf takes 1 argument or more, got 0")
        values = [self.value(argument) for argument in arguments]
        if not isinstance(values[0], Logic):
            raise TypeError(f"$sformatf's format is a string, not a {type(values[0]).__name__}")
        format = Formats.text(values[0])
        letter = Formats.unwritten(format)
        if letter is not None:
            raise FS.NoRule("SystemVerilog", f"systemcall '$sformatf' %{letter}", X.SYSTEMCALL)
        for value in values[1:]:
            if not isinstance(value, (Logic, float)):
                raise TypeError(f"$sformatf writes numbers and strings, not a {type(value).__name__}")
        return Formats.vector(Formats.sformatf(format, values[1:]))

    def _element_type(self, value: Any) -> SvType:
        """An array element's type: it must be integral or real."""
        ctype = _type(value, self.stored)
        if ctype is None:
            raise TypeError(f"an array's elements must be numbers, got {type(value).__name__}")
        return ctype


def _dimensions(value: Any, types: _Types) -> tuple[list[tuple[int, int, int]], int]:
    """A value's dimensions, each its left and right bounds and its size, and how many are unpacked: an array's or a
    queue's first (`[0:n-1]`, `[0:-1]` empty), then its first item's; a vector's `[width-1:0]`, but a scalar's (a `bit`,
    a `logic`, a `reg`) none."""
    value = typed(value, types)
    if isinstance(value, list):
        inner, unpacked = _dimensions(value[0], types) if value else ([], 0)
        return [(0, len(value) - 1, len(value)), *inner], unpacked + 1
    if isinstance(value, Logic) and value.type.label not in ("bit", "logic", "reg"):
        return [(value.type.width - 1, 0, value.type.width)], 0
    return [], 0


def _c_math(name: str, x: list[float]) -> float:
    """A math function of C's library over finite and infinite reals: a domain error NaN, a pole or an overflow an
    infinity, where Python raises."""
    functions: dict[str, Callable[..., float]] = {
        "ln": math.log, "log10": math.log10, "exp": math.exp, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
        "tan": math.tan, "asin": math.asin, "acos": math.acos, "atan": math.atan, "atan2": math.atan2,
        "hypot": math.hypot, "sinh": math.sinh, "cosh": math.cosh, "tanh": math.tanh, "asinh": math.asinh,
        "acosh": math.acosh, "atanh": math.atanh}
    try:
        return functions[name](*x)
    except OverflowError:  # exp, sinh, cosh: beyond the largest finite real
        return math.copysign(math.inf, x[0]) if name == "sinh" else math.inf
    except ValueError:  # a pole (an infinity) or outside the domain (NaN)
        if name in ("ln", "log10") and x[0] == 0:
            return -math.inf
        if name == "atanh" and abs(x[0]) == 1:
            return math.copysign(math.inf, x[0])
        return math.nan


def _atoi(text: str, base: int) -> int:
    """A string's leading integer in a base (6.16.9): an optional sign, then its digits and underscores, up to the first
    other character; 0 if it has none."""
    digits = "0123456789abcdef"[:base]
    sign, rest = (-1, text[1:]) if text[:1] == "-" else (1, text[1:]) if text[:1] == "+" else (1, text)
    value = 0
    for character in rest:
        if character == "_":
            continue
        if character.lower() not in digits:
            break
        value = value * base + digits.index(character.lower())
    return sign * value


def _atoreal(text: str) -> float:
    """A string's leading real (6.16.9): a decimal number with an optional fraction and exponent, underscores ignored; 0
    if it has none."""
    written = _REAL.match(text)[0].replace("_", "")  # type: ignore[index]
    return float(written) if any(c.isdigit() for c in written.split("e")[0].split("E")[0]) else 0.0


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


# --- What may fold, sized from the whole expression (11.6) ---

_UNKNOWN: Any = object()
"""A type the scope does not determine."""
_OWN: Any = object()
"""How a subterm folds whose literal of its own type means what it does wherever it stands."""
_DEFAULT: Any = object()
"""How a subterm of a term no rule reads folds: alone, where its own type's literal is its value wherever it stands."""
_ROOT: Any = object()
"""How a term folds that is not a subterm of the expression being simplified: as a root."""
_NEVER = frozenset({X.NAMEDCONNECTION, X.EMPTYARGUMENT, X.VALUERANGE, X.DOLLAREXPRESSION, X.PATTERNITEM})
"""The kinds that have no value of their own, but within the kind that holds them."""
_ERRORS = (S.Unbound, NotImplementedError, TypeError, ValueError, KeyError, OverflowError)


class _Sizing:
    """How each subterm of an expression may fold, as 11.6 sizes it from the whole expression in a scope: `how` gives,
    by its term's identity, None (it stays), `_OWN` (into its own type's literal), a type (into the literal of its value
    in that context), or `_DEFAULT`; `own` its self-determined type, where the scope determines it."""

    def __init__(self, root: _Node, evaluation: _Evaluation):
        self.how: dict[int, tuple[Any, Any]] = {}
        self.own: dict[int, tuple[Any, Any]] = {}
        self._visit(root, evaluation, None, False)
        for term in F.walk(root.term):  # a type or a pattern has no value of its own: it stays, as what reads it
            valueless = X.DIALECT.owner(term).name() in ("SystemVerilog Types", "SystemVerilog Patterns")
            self.how.setdefault(id(term), (term, None if valueless else _DEFAULT))

    @staticmethod
    def _type(evaluation: _Evaluation, node: Any) -> Any:
        try:
            return evaluation.type(node)
        except _ERRORS:
            return _UNKNOWN

    def _visit(self, node: Any, evaluation: _Evaluation, context: Any, sensitive: bool) -> None:
        """Note how a term at a position may fold, and visit its subterms: `context` the type its context gives it (None
        where it is self-determined, `_UNKNOWN` where the scope does not determine it), `sensitive` whether its type's
        states or format could change what stays around it (where it is self-determined)."""
        own = self._type(evaluation, node)
        self.own[id(node.term)] = (node.term, own)
        self.how[id(node.term)] = (node.term, self._decide(node, own, context, sensitive))
        target = own if context is None else context
        for child, inner, position, delicate in self._children(node, evaluation, own, target, context, sensitive):
            if child is not None:
                self._visit(child, inner, position, delicate)

    @staticmethod
    def _decide(node: Any, own: Any, context: Any, sensitive: bool) -> Any:
        if node.kind in _NEVER or own is _UNKNOWN or X._matched(node.term):  # a `matches` that binds stays
            return None
        if _transparent(node):  # its value is its context's: of the context's type, when it is known
            folded = own if context is None else context
            return folded if folded not in (_UNKNOWN, None) and (_representable(folded) or not sensitive) else None
        if own is None or _representable(own) or context is None and not sensitive:
            return _OWN
        return context if context not in (None, _UNKNOWN) and _representable(context) else None

    def _shared(self, evaluation: _Evaluation, nodes: list[Any]) -> Any:
        """The type context-determined operands share, if the scope determines each one's."""
        types = [self._type(evaluation, node) for node in nodes]
        return _UNKNOWN if _UNKNOWN in types or None in types else Domains.common(types)

    def _children(self, node: Any, evaluation: _Evaluation, own: Any, target: Any, context: Any,
                  sensitive: bool) -> list[tuple[Any, _Evaluation, Any, bool]]:
        """A term's subterms, each with the evaluation it is read in, the context it takes, and its sensitivity."""
        kind, ev = node.kind, evaluation
        self_determined = lambda *children: [(child, ev, None, False) for child in children]  # noqa: E731
        if kind == X.PARENTHESIZEDEXPRESSION:
            return [(node.expression, ev, context, sensitive)]
        if kind == X.MINTYPMAXEXPRESSION:
            return [(child, ev, context if child is ev._chosen(node) else _UNKNOWN, True)
                    for child in (node.min, node.typ, node.max)]
        if kind == X.UNARYEXPRESSION:
            if node.operator in ("+", "-", "~"):
                return [(node.operand, ev, context, sensitive)]
            return self_determined(node.operand)
        if kind == X.BINARYEXPRESSION:
            op = node.operator
            if op in _LOGICAL:
                return self_determined(node.left, node.right)
            if op in _COMPARISONS:
                shared = self._shared(ev, [node.left, node.right])
                return [(node.left, ev, shared, True), (node.right, ev, shared, True)]
            if op in _SHIFTS or op == "**" and target is not _UNKNOWN and target.kind == "integral":
                return [(node.left, ev, target, True), *self_determined(node.right)]
            return [(node.left, ev, target, True), (node.right, ev, target, True)]
        if kind == X.CONDITIONALEXPRESSION:
            try:
                branch = ev._branch(node.condition)
            except _ERRORS:
                branch = ev.within(dict.fromkeys(X._matched(node.condition.term)), hidden=True)
            return [*self_determined(node.condition), (node.consequence, branch, target, True),
                    (node.alternative, ev, target, True)]
        if kind == X.INSIDEEXPRESSION:
            try:
                shared = ev._inside_type(node, ev._inside_items(node))
            except _ERRORS:
                shared = _UNKNOWN
            ends = [end for item in node.set if item.kind == X.VALUERANGE for end in (item.left, item.right)]
            return [(child, ev, shared, True) for child in (node.value, *node.set, *ends)]
        if kind in (X.CONCATENATION, X.REPLICATION):
            return [*self_determined(node.count if kind == X.REPLICATION else None),
                    *[(item, ev, None, True) for item in node.items]]
        if kind == X.INDEXEXPRESSION:
            return [(node.value, ev, None, True), *self_determined(node.index)]
        if kind == X.RANGESELECT:
            return [(node.value, ev, None, True), *self_determined(node.left, node.right)]
        if kind == X.MEMBEREXPRESSION:
            return [(node.value, ev, None, True)]
        if kind == X.CASTEXPRESSION:
            try:
                position = ev._cast_context(node)
            except _ERRORS:
                position = _UNKNOWN
            return [*self._types(node.type, ev), (node.value, ev, position, True)]
        if kind == X.SYSTEMCALL:
            sensitive_ = node.name in ("$signed", "$unsigned")
            found: list[tuple[Any, _Evaluation, Any, bool]] = []
            for argument in node.arguments:
                found += [(argument, ev, None, sensitive_), *self._types(argument, ev)]
            return found
        if kind == X.CALLEXPRESSION:
            callee = node.callee  # a function's name or a method's member: no value of its own
            self.how[id(callee.term)] = (callee.term, None)
            found = [(callee.value, ev, None, True)] if callee.kind == X.MEMBEREXPRESSION else []
            for argument in node.arguments:
                held = argument.value if argument.kind == X.NAMEDCONNECTION else argument
                found += [(argument, ev, None, True), (held, ev, None, True)] if held is not argument else [
                    (argument, ev, None, True)]
            return found
        if kind == X.ARRAYMETHODWITHEXPRESSION:
            iterator = X._array_method_scopes(F.kind_of(node.term)[1])[1]
            call = node.value
            self.how[id(call.term)] = (call.term, None)  # the method's call, its iterator its argument
            inner = ev.within(dict.fromkeys(iterator), hidden=True)
            found = []
            if call.kind == X.CALLEXPRESSION:
                self.how[id(call.callee.term)] = (call.callee.term, None)
                if call.callee.kind == X.MEMBEREXPRESSION:
                    found.append((call.callee.value, ev, None, True))
            return [*found, (node.body, inner, None, True)]
        if kind == X.MATCHESEXPRESSION:
            pattern = node.pattern
            while pattern.kind == _PARENTHESIZED_PATTERN:
                self.how[id(pattern.term)] = (pattern.term, None)
                pattern = pattern.pattern
            if X.DIALECT.owner(pattern.term) is not X.DIALECT:  # a variable, a wildcard, a tagged or structure pattern
                return self_determined(node.value)
            shared = self._shared(ev, [node.value, pattern])
            return [*self_determined(node.value), (pattern, ev, shared, True)]
        if kind == X.PREDICATEEXPRESSION:
            found, inner = [], ev
            for condition in node.conditions:
                found.append((condition, inner, None, False))
                try:
                    bound = inner._bindings(condition)
                except _ERRORS:
                    bound = dict.fromkeys(X._matched(condition.term))
                    inner = inner.within(bound, hidden=True)
                    continue
                inner = inner.within(bound) if bound else inner
            return found
        if kind == X.STREAMINGCONCATENATION:
            found = self._types(node.slice, ev) if node.slice is not None else []
            if node.slice is not None and X.DIALECT.owner(node.slice.term) is X.DIALECT:
                found = self_determined(node.slice)
            for item in node.items:
                found += [(item.expression, ev, None, True), *self_determined(item.left, item.right)]
            return found
        if kind == X.NAMEDCONNECTION:
            return [(node.value, ev, None, True)]
        return self._types(node, ev) if X.DIALECT.owner(node.term) is not X.DIALECT else []

    def _types(self, node: Any, evaluation: _Evaluation) -> list[tuple[Any, _Evaluation, Any, bool]]:
        """A type's terms: its dimensions' bounds, each self-determined; a type stays, as the term that reads it."""
        if X.DIALECT.owner(node.term) is X.DIALECT:
            return []
        self.how[id(node.term)] = (node.term, None)
        bounds = [bound for dimension in (node.dimensions or ()) if dimension.kind == "rangedimension"
                  for bound in (dimension.left, dimension.right)] if hasattr(node, "dimensions") else []
        return [(bound, evaluation, None, False) for bound in bounds]


class _Rules:
    """SystemVerilog's folding rules: a term's value in a scope, by IEEE 1800's rules, the term's structure validated
    first (its references resolve as they go). The root of a simplification is computed at its own type; each other
    subterm as its sizing in the whole expression allows (`_Sizing`), computed once the root has not folded."""

    dialect = X.DIALECT

    def __init__(self) -> None:
        self._fresh = False  # whether the next term evaluated is a simplification's root
        self._root: tuple[_Node, _Evaluation] | None = None
        self._sizing: _Sizing | None = None

    def scope(self, variables: Mapping[str, Any]) -> Scope:
        return Scope(variables)

    def folds(self, node: Any, root: bool) -> bool:
        """Whether a subterm may fold: the root, and a subterm whose literal would mean what it does where it stands."""
        if root:
            self._fresh, self._root, self._sizing = True, None, None
            return True
        return self._how(node) is not None

    def _how(self, node: Any) -> Any:
        if self._root is None:
            return _ROOT
        if self._sizing is None:
            self._sizing = _Sizing(*self._root)
        entry = self._sizing.how.get(id(node))
        return _ROOT if entry is None or entry[0] is not node else entry[1]

    def evaluate(self, node: Any, scope: Any) -> Any:
        if self._fresh:  # the root of a simplification, its evaluation kept for its sizing
            self._fresh = False
            wrapped, evaluation = self._read(node, scope)
            self._root = (wrapped, evaluation)
            return evaluation.value(wrapped)
        how = self._how(node)
        wrapped, evaluation = self._read(node, scope)
        if how is _ROOT:
            return evaluation.value(wrapped)
        if how is _DEFAULT:
            own = evaluation.type(wrapped)
            if _transparent(wrapped) or own is not None and not _representable(own):
                raise _InContext(node)
            how = _OWN
        return _plain(evaluation.value(wrapped, None if how is _OWN else how))

    @staticmethod
    def _read(node: Any, scope: Any) -> tuple[_Node, _Evaluation]:
        invalid = next((n for n in F.walk(node) if F.kind_of(n)[0] in F.INVALID_KINDS), None)
        if invalid is not None:  # invalid syntax: no rule, named by its owner, as every dialect names it
            raise FS.NoRule(X.DIALECT.owner(invalid).name(), F.kind_of(invalid)[0], F.kind_of(invalid)[0])
        problems = X.DIALECT.validate(node, bound=S.free(node, X.DIALECT))
        if problems:
            raise ValueError(f"cannot simplify an invalid expression: {problems[0]}")
        return _Node(node), _Evaluation(scope, _Types(node))

    def simplify(self, node: Any, results: list[FS.Result]) -> FS.Result | None:
        """What does not depend on a subterm that stays: `&&` and `||` by an operand that decides them, `->` by a true
        consequent, and a conditional by a known condition that binds nothing, where the branch it keeps has its own
        type."""
        tag, record = F.kind_of(node)
        attributes = F.attributes_of(record)
        if tag == X.BINARYEXPRESSION and attributes["operator"] in ("&&", "||", "->"):
            decisive = {"&&": (0, 0), "||": (1, 1), "->": (1, 1)}[attributes["operator"]]
            operands = results if attributes["operator"] != "->" else results[1:]
            if any(result.known and _truth(result.value) == decisive[0] for result in operands):
                return SIMPLIFIER.known(node, _bit(decisive[1]))
        if tag == X.CONDITIONALEXPRESSION and results[0].known and self._sizing is not None:
            condition, consequence, alternative = F.arguments_of(record)[:3]
            truth = _truth(results[0].value)
            own = {id(term): self._sizing.own.get(id(term), (None, _UNKNOWN))[1]
                   for term in (node, consequence, alternative)}
            kept = consequence if truth == 1 else alternative if truth == 0 else None
            if kept is not None and not X._matched(condition) and own[id(kept)] is not _UNKNOWN and (
                    own[id(kept)] == own[id(node)]):
                return results[1] if truth == 1 else results[2]
        return None


def _plain(value: Any) -> Any:
    """A subterm's value, its type's name dropped, so that its literal is of its type's width, signedness and states."""
    if isinstance(value, Logic) and value.type.label:
        return Logic(Domains.vector(value.type.width, value.type.signed, value.type.states), value.aval, value.bval)
    return value


def _literal(value: Any) -> Any:
    """The literal of a value: a real's; an `integer`'s (a signed 4-state value of 32 bits), or a `longint`'s, an
    unsized decimal integer; any other integral value's, a sized vector of its bits and signedness (of 4 states: a
    2-state value's type is not kept); `null`'s, the constant; none for an object or an array."""
    if type(value) is float:
        return X.literal(value)
    if value is None:
        return X.Writer(lambda u: u.constant(lambda r: r.singleton("null")))
    if not isinstance(value, Logic):
        return None
    integer = value.type.width == 32 and value.type.signed and value.type.states == 4  # `integer`'s, by any name
    if value.known and (integer or value.type.label == "longint"):
        return X.literal(value.integer())
    return X.vector(value.bits, value.type.signed)


def _what(prefix: str, *kinds: str) -> list[str]:
    return [f"{prefix} {kind}" for kind in kinds]


CATEGORIES: dict[str, dict[str, str]] = {
    "SystemVerilog": {
        **dict.fromkeys((f"systemcall '$sformatf' %{letter}" for letter in ("u", "z", "p")), "a"),
        **dict.fromkeys(("valuerange", "patternitem", "namedconnection", "emptyargument",
                         "castexpression to implicittype",
                         "systemcall '$bits' of keywordtype"), "b"),
        **dict.fromkeys(("assignmentpattern", "taggedexpression", "newarrayexpression", "randomizewithexpression",
                         "matchesexpression taggedpattern", "matchesexpression structurepattern", "systemcall '$typename'",
                         *_what("castexpression to", "structtype", "enumtype", "typereference"),
                         *_what("systemcall '$bits' of", "structtype", "enumtype", "typereference", "namedtype"),
                         *(f"callexpression method {name!r}" for name in ("first", "last", "next", "prev", "num",
                                                                          "name"))), "c"),
        **dict.fromkeys(("superexpression", "newexpression", "newcopyexpression", "rootexpression",
                         "incrementexpression", "assignmentexpression", "scopedname", "systemcall", "systemcall '$cast'",
                         "callexpression of a class handle's method",
                         *(f"{kind} of a {name}" for kind in ("nameexpression", "callexpression") for name in (
                             "localname", "parameterizedname", "interfacetypename", "interfacemethodname", "unitname",
                             "superexpression")),
                         *_what("castexpression to", "namedtype", "virtualinterfacetype", "keywordtype"),
                         *(f"systemcall '$sformatf' %{letter}" for letter in ("t", "m", "l", "v")),
                         *(f"callexpression method {name!r}" for name in (
                             "sort", "rsort", "reverse", "shuffle", "push_back", "push_front", "pop_back", "pop_front",
                             "insert", "delete", "putc", "itoa", "hextoa", "octtoa", "bintoa", "realtoa"))), "d")},
    "SystemVerilog Types": {"*": "b"}, "SystemVerilog Patterns": {"*": "b"}, "SystemVerilog Assertions": {"*": "d"},
    "SystemVerilog Constraints": {"solvebeforeconstraint": "b", "disablesoftconstraint": "b"},
    "SystemVerilog Preprocessor": {"*": "b", "macrousage": "d"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given): what
has no value of its own (`b`: a part of the kind that holds it, a type, a pattern, a directive); what waits on domain
inference (`c`: an assignment pattern, a tagged union, a structure's or an enumeration's type, an enumeration's
methods); what needs mbse-programs or a simulator (`d`: a write, a class, the design hierarchy, a typedef's name, a
system function that reads a simulator's state or acts, an array's or a string's method that writes it). What stays by
the rules, not for want of one, names no residue: a name or a function the scope does not provide; a time literal with
no time unit in the scope is a residue of class `a`, its unit a parameter of simplification the scope may give; and a
subterm whose context's type is not known, or whose own type has no literal (a 2-state type, `shortreal`) where its
states or format could change what stays around it, stays as written, since a literal of another type would change
the residual's meaning (11.6)."""

RULES = _Rules()
"""The folding rules of the SystemVerilog dialect."""

SIMPLIFIER = FS.Simplifier(RULES, literal=_literal, categories=CATEGORIES, folds=RULES.folds, simplify=RULES.simplify)
"""The simplifier of the SystemVerilog dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> FS.Simplified:
    """The simplification of an expression in `scope`, or with the variables in a mapping bound: folded into a literal
    when the scope determines it, its value a `Logic`, a float, None (`null`), a list or an object."""
    return SIMPLIFIER(expression, scope)
