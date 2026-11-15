"""Simplifiers of the C dialect: simplify an expression by ISO/IEC 9899's rules, which ISO/IEC 14882's share where C++
has C's kinds (`Cpp`'s simplifier is `simplifier(Cpp.Expressions.DIALECT, ...)`, its own kinds' rules added by
`rules(..., extend)`), under the ABI the expression's holder names.

`Simplifiers.OfAny(term, scope)` simplifies a term value (or anything `Terms.term` reads one from, an `Expression`) in a
`Scope(variables, functions, packs)` (see `mbse.Expressions.Framework.Simplifiers`). Values carry their C type while
folding (`Typed`), and a value folds into the literal of its type, its suffix as C writes it, where its type has one
(`Domains.literal_suffix`): an `int`, `long` or `long long`, signed or not (`5u`; a typedef's value as the standard type
it is, an `int64_t`'s `5l`), a `bool`, a string, `nullptr`, a floating value of a type with a suffix whose binary64
literal rounds back to it exactly (`2.5f`, `3.0L`, `0.3dd`, `1.5f16`; a non-finite one has none), and a bit-precise
integer's whose narrowest literal is of its type (`7wb`). A value of any other type has no literal, and stays, its
subterms simplified: a `char`, a `short`, a `wchar_t` in C++, a `long double` that no binary64 literal spells, a
`_BitInt(N)` wider than its value's literal, an array, `void`, an object. Its arithmetic folds all the same, its
operands promoted: `(char)200 + 0` is the `int` -56 under x86-64's System V ABI. A simplification whose root is a
literal gives its native as its value: an int, a float, a bool, a string, None for `nullptr`. A literal's type is what
its text encodes (`Domains.literal`: `5u` an `unsigned int`, `1.5f` a `float`, `'a'` C's `int` and C++'s `char`, `5wb` a
`_BitInt(4)`), else its value's; a variable's type is its value's: a bool is a `bool`, an int an `int`, `long` or
`unsigned long` as the first that holds it, a float a `double`, None `nullptr` (a value carries no domain: a variable of
another type waits for domain inference, mbse-basis [CAP-232: domains inferred for
terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)). Every named type it computes in is a stored domain, read through
the term's holder (`Domains.Types`): among its dialect's domains, then its holder's ABI's, so the same term folds as
each ABI says (`(char)200` is -56 under x86-64's System V ABI, where `char` is signed, and 200 under AAPCS64's; `long
double` is x87's format under the one and `binary128` under the other; `sizeof(long double)` 16 under both, mbse-basis
[CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md)). A lone
term is refused where it reads a type (mbse-schemas' TypeError), and so is a type neither dialect defines, by name. C's
rules apply:

- The integer promotions and the usual arithmetic conversions decide the type an operator computes in (see `Domains`); a
  bit-precise integer type is not promoted, and ranks below a standard type of its width (C23, 6.3.1.1); unsigned
  arithmetic wraps, and floating arithmetic rounds to nearest, ties to even, as IEEE 754 specifies, in the type's
  format, decimal ones too; a decimal floating operand with a binary one is refused (`TypeError`), as C's constraint has
  it.
- What C leaves undefined raises: a signed result outside its type (`OverflowError`), an integer divided by zero
  (`ZeroDivisionError`), a shift by a negative count or by the width or more, a left shift of a negative value, and a
  cast of a floating value outside the target type (`OverflowError`) or of NaN (`ValueError`).
- Division truncates toward zero, and `%` takes the dividend's sign; `>>` of a negative value is arithmetic.
- Comparisons and `&&`, `||` and `!` give `bool`, as in C++ (C's `int` results compute alike once promoted); `&&` and
  `||` evaluate their second operand only when the first does not decide. `nullptr` (C23's and C++'s) is false, equals
  `nullptr` and the integer literal 0, and is the operand of nothing else.
- A cast converts, to an arithmetic type: to an integer type by wrapping into its width (as C++20 defines), from a
  floating value by truncation; to a floating type by rounding; to `bool` by comparing with zero; to `void`, its operand
  evaluated, to no value; to `_BitInt(N)` as to any integer type.
- `condition ? a : b` evaluates only the operand it chooses, converted to the type the usual arithmetic conversions give
  the two (ISO/IEC 9899, 6.5.15), where the other's type is known without evaluating it (its declaration's otherwise,
  the chosen one's kept); GNU's `a ?: b` is `a`, evaluated once, unless it is zero. `a, b` evaluates `a`, then is `b`:
  where `a` is known, `b` is the residual.
- Parentheses and GNU's `__extension__` are their operand; adjacent string literals one string.
- `sizeof` and `alignof` (`_Alignof`) give a `size_t`, of a type name or of an operand's type, unevaluated: a scalar's
  size and alignment are its ABI's (`Domains.layout`), an array's its elements'. `_Generic` chooses the association
  whose type is its controlling operand's (its value unevaluated), by C's identity of types (`Domains.Types.identity`:
  `int64_t` is `long`, `char` is neither `signed char` nor `unsigned char`), or its `default`. A compound literal of an
  arithmetic type is its initializer's value converted; of an array of one, an array (designators and string
  initializers of a character array among its items), whose elements a subscript reads, with no literal of its own.
- `object.name` and `object->name` read a member (a property of a data object, read through mbse-schemas' readers
  (`Framework.Objects`), or a key of a mapping); `array[index]` an element of a list, of a container or of a compound
  literal; `f(args)` calls a function the scope provides, by its name, and nothing else, a pack expansion's values
  spliced among its arguments.

`FOLDED` names the kinds its rules fold, every kind of class (a) in the evaluation inventory (mbse-expressions' [the
evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#c-and-c), C and C++). What stays, named,
with its class (`CATEGORIES`): writes, statements, the object model (`*`, `&`, a cast to a type that is not arithmetic,
a call of a callee that is not a function's name), class `d`; an initializer list alone, class `b`; an operand whose
type its declaration gives (`sizeof(x.a)`), class `c`; a layout no ABI dialect stores (a bit-precise integer's,
`nullptr_t`'s), nested braces and an array of arrays in a compound literal, class `a`; a term of `C Types` or `C
Preprocessor`, by the dialect that owns it; and invalid syntax ("C error is not simplified"), where a cast's type stands
too. A name the scope does not bind, or a function it does not provide, stays.

"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Patterns.Expressions import Ieee754
from mbse.Expressions.Framework import Objects, Simplifiers as F, Symbolics as S, Terms

from . import Domains, Expressions, Kinds
from .Domains import CType

__all__ = ["OfAny", "Scope", "RULES", "SIMPLIFIER", "FOLDED", "CATEGORIES", "VOID", "Typed", "ArrayType", "Pack",
           "Untyped", "Rules", "language", "describe", "native", "convert", "common", "order", "truth", "zero", "typed",
           "rules", "simplifier"]

_EVEN, _ZERO = "roundTiesToEven", "roundTowardZero"


class _Void:
    """`void`: the value of an expression of type `void`, and that type."""

    def __repr__(self) -> str:
        return "void"


VOID = _Void()
"""The value of an expression of type `void` (a cast to `void`), and the type `void` a type name names."""


@dataclass(frozen=True)
class Typed:
    """A value while folding: its C type (None for `nullptr`, a string, an array, `void` or an object) and its native
    (None for `nullptr`)."""

    ctype: CType | None
    value: Any


@dataclass(frozen=True)
class ArrayType:
    """An array type: its `element` type and its `length` (None where an initializer gives it)."""

    element: Any
    length: int | None


@dataclass(frozen=True)
class Pack:
    """A pack expansion's values, which a call's arguments splice."""

    items: tuple[Typed, ...]


class Untyped(Exception):
    """An operand whose type its declaration gives (a member, a call's result), not its value: raised by the typing
    of an operand left unevaluated."""


def language(dialect: Any) -> str:
    """The language a dialect of the family writes: `C`, or `C++` for `Cpp`."""
    return "C" if dialect.name() == "C" else "C++"


def describe(value: Typed) -> str:
    if value.ctype is not None:
        return value.ctype.name()
    if value.value is None:
        return "nullptr_t"
    return "void" if value.value is VOID else type(value.value).__name__


def _null(value: Typed) -> bool:
    """Whether a value is `nullptr`."""
    return value.ctype is None and value.value is None


def _untyped(value: Any) -> Typed:
    """A value no type holds, an int beyond every type: refused."""
    raise OverflowError(f"integer {value} is too large for any type")


def typed(value: Any, types: Domains.Types) -> Typed:
    """A variable's or a member's value, with its type, read through `types`: a bool, an int or a float by its value
    (`Domains.of`); any other, None (`nullptr`) among them, with none."""
    if type(value) not in (bool, int, float):
        return Typed(None, value)
    name = Domains.of(value, types)
    return _untyped(value) if name is None else Typed(types.named(name), value)


def _types(node: Any, dialect: Any) -> Domains.Types:
    """The types a term of `dialect` reads, through its holder."""
    return Domains.Types(node, dialect.path)


def _bool(ctype: CType) -> CType:
    """`bool`, read through the `Types` a type was read through."""
    return ctype.types.named("bool")  # type: ignore[union-attr]


def _refuse(dialect: Any, what: str) -> F.NoRule:
    return F.NoRule(dialect.name(), what)


def _literal(dialect: Any) -> Any:
    """A literal of the type its text encodes: an integer that its type holds, a floating value rounded to its
    type; a type no rule has values of stays, named."""
    def typed_(domain: Any, value: Any) -> Typed:
        if not isinstance(domain, CType):
            if domain is Domains.String:
                return Typed(None, value)
            raise _refuse(dialect, f"literal of {domain.name()}")
        if domain.kind == "floating":  # a literal's value is a binary64 float, rounded to its type
            return Typed(domain, Ieee754.convert("binary64", value, domain.format, _EVEN))
        if not domain.contains(value):
            raise OverflowError(f"integer literal {value} does not fit '{domain.name()}'")
        return Typed(domain, value)

    return typed_


def _arithmetic(value: Typed, operator: str) -> CType:
    if value.ctype is None:
        raise TypeError(f"invalid operand to {operator}: '{describe(value)}'")
    return value.ctype


# --- Conversions ---


def _wrap(ctype: CType, value: int) -> int:
    """An integer wrapped into a type's width, two's complement."""
    low = -(1 << (ctype.width - 1)) if ctype.signed else 0
    return (value - low) % (1 << ctype.width) + low


def convert(value: Typed, target: CType) -> Typed:
    """A value converted to `target` implicitly or by a cast: integers wrap, floats truncate toward an integer and round
    toward a floating type, and anything nonzero is true (`nullptr` false)."""
    if _null(value) and target.kind == "bool":
        return Typed(target, False)
    source = _arithmetic(value, "a conversion")
    native = value.value
    if target.kind == "bool":
        if source.kind == "floating":  # true unless a zero of either sign; NaN is true
            datum = Ieee754.decode(source.format, native)
            return Typed(target, datum.special is not None or datum.coefficient != 0)
        return Typed(target, native != 0)
    if source.kind != "floating":
        number = int(native)
        if target.kind == "integer":
            return Typed(target, _wrap(target, number))
        return Typed(target, Ieee754.from_integer(number, target.format, _EVEN))
    if target.kind == "floating":
        return Typed(target, Ieee754.convert(source.format, native, target.format, _EVEN))
    whole = Ieee754.to_integer(source.format, native, _ZERO)
    if isinstance(whole, float) or not target.contains(whole):
        shown = native if type(native) is str else repr(native)
        raise OverflowError(f"{shown} is out of range of '{target.name()}'")
    return Typed(target, whole)


def common(left: Typed, right: Typed, operator: str) -> tuple[CType, Typed, Typed]:
    a, b = _arithmetic(left, operator), _arithmetic(right, operator)
    ctype = Domains.common(a, b)
    if ctype is None:  # a decimal floating type and a binary one: a constraint C's usual arithmetic conversions impose
        raise TypeError(f"invalid operands to binary {operator} ('{a.name()}' and '{b.name()}')")
    return ctype, convert(left, ctype), convert(right, ctype)


def _integer_result(ctype: CType, operator: str, value: int) -> Typed:
    """An integer result: wrapped when unsigned; outside a signed type, undefined."""
    if not ctype.signed:
        return Typed(ctype, _wrap(ctype, value))
    if not ctype.contains(value):
        raise OverflowError(f"signed overflow in {operator}: {value} does not fit '{ctype.name()}'")
    return Typed(ctype, value)


def truth(value: Typed, operator: str, node: Any, dialect: Any) -> Typed:
    """A scalar's truth, a `bool` (`nullptr`'s false, its `bool` read through the holder of `node`)."""
    if _null(value):
        return Typed(_types(node, dialect).named("bool"), False)
    return convert(value, _bool(_arithmetic(value, operator)))


# --- Operators ---

_FLOATING_OPERATORS = {"+": "add", "-": "sub", "*": "mul", "/": "div"}


def _binary_arithmetic(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        ctype, a, b = common(arguments[0](), arguments[1](), operator)
        if ctype.kind == "floating":
            if operator not in _FLOATING_OPERATORS:
                raise TypeError(f"invalid operands to binary {operator} ('{ctype.name()}' and '{ctype.name()}')")
            return Typed(ctype, Ieee754.operate(_FLOATING_OPERATORS[operator], ctype.format, _EVEN, [a.value,
                b.value]))
        x, y = a.value, b.value
        if operator in "/%" and y == 0:
            raise ZeroDivisionError("integer division by zero")
        if operator in "/%":
            quotient = abs(x) // abs(y) * (1 if (x < 0) == (y < 0) else -1)  # truncated toward zero
            result = quotient if operator == "/" else x - y * quotient
        else:
            result = {"+": x + y, "-": x - y, "*": x * y, "&": x & y, "^": x ^ y, "|": x | y}[operator]
        return _integer_result(ctype, operator, result)

    return apply


def _shift(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        left, right = arguments[0](), arguments[1]()
        ctype, count_type = Domains.promoted(_arithmetic(left, operator)), Domains.promoted(_arithmetic(right,
            operator))
        if ctype.kind == "floating" or count_type.kind == "floating":
            raise TypeError(f"invalid operands to binary {operator} ('{describe(left)}' and '{describe(right)}')")
        value, count = int(left.value), int(right.value)
        if count < 0 or count >= ctype.width:
            raise ValueError(f"shift by {count} is undefined for '{ctype.name()}'")
        if operator == ">>":
            return Typed(ctype, value >> count)
        if value < 0:
            raise ValueError("left shift of a negative value is undefined")
        return _integer_result(ctype, operator, value << count)

    return apply


def zero(term: Any, dialect: Any) -> bool:
    """Whether a term is the integer literal 0, in parentheses or not: a null pointer constant, and what an ordering is
    compared with."""
    if term is None:
        return False
    tag, record, _ = dialect.kind(term)
    while tag == Kinds.PARENTHESIZEDEXPRESSION:
        tag, record, _ = dialect.kind(Terms.arguments_of(record)[0])
    value = Terms.attributes_of(record).get("value")
    return tag == Kinds.LITERAL and type(value) is int and value == 0


def _comparison(operator: str, dialect: Any) -> F.Implementation:
    tests: dict[str, Callable[[int], bool]] = {"<": lambda o: o < 0, "<=": lambda o: o <= 0, ">": lambda o: o > 0,
                                               ">=": lambda o: o >= 0, "==": lambda o: o == 0, "!=": lambda o: o != 0}

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        left, right = arguments[0](), arguments[1]()
        if _null(left) or _null(right):  # nullptr equals nullptr, and a null pointer constant
            terms = Terms.arguments_of(Terms.kind_of(node)[1])
            if operator not in ("==", "!=") or not all(
                    _null(value) or zero(term, dialect) for value, term in zip((left, right), terms)):
                raise TypeError(f"invalid operands to binary {operator} ('{describe(left)}' and '{describe(right)}')")
            return Typed(_types(node, dialect).named("bool"), operator == "==")
        ctype, a, b = common(left, right, operator)
        if ctype.kind == "floating":
            x, y = Ieee754.decode(ctype.format, a.value), Ieee754.decode(ctype.format, b.value)
            if x.special == "nan" or y.special == "nan":
                return Typed(_bool(ctype), operator == "!=")
            found = order(ctype.format, a.value, b.value)
        else:
            found = (a.value > b.value) - (a.value < b.value)
        return Typed(_bool(ctype), tests[operator](found))

    return apply


def order(format: Ieee754.Format, a: Any, b: Any) -> int:
    """How two non-NaN floating values compare by value: -0 equals 0."""
    x, y = Ieee754.decode(format, a), Ieee754.decode(format, b)
    if x.special is None and y.special is None and x.coefficient == 0 and y.coefficient == 0:
        return 0
    return Ieee754.compare(format, a, b)  # type: ignore[return-value]


def _logical(operator: str, dialect: Any) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        first = truth(arguments[0](), operator, node, dialect)
        if first.value == (operator == "||"):
            return first
        return truth(arguments[1](), operator, node, dialect)

    return apply


def _comma(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    """`a, b`: `a` evaluated, then `b`'s value."""
    arguments[0]()
    return arguments[1]()


def _unary(operator: str, dialect: Any) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        value = arguments[0]()
        if operator == "!":
            held = truth(value, operator, node, dialect)
            return Typed(held.ctype, not held.value)
        ctype = Domains.promoted(_arithmetic(value, operator))
        promoted = convert(value, ctype)
        if ctype.kind == "floating":
            if operator == "~":
                raise TypeError(f"invalid argument type '{ctype.name()}' to unary expression")
            return promoted if operator == "+" else Typed(ctype, Ieee754.operate("neg", ctype.format, _EVEN,
                [promoted.value]))
        number = promoted.value
        return _integer_result(ctype, operator, {"+": number, "-": -number, "~": ~number}[operator])

    return apply


def _attributes(node: Any) -> dict[str, Any]:
    return Terms.attributes_of(Terms.kind_of(node)[1])


def _array(value: Any) -> Any:
    """A member's value: a list as a list of its items, lists of lists too."""
    return [_array(item) for item in value.values] if isinstance(value, Objects.Listed) else value


def _element(array: Typed, index: Typed, types: Domains.Types) -> Typed:
    if not isinstance(array.value, (list, tuple)):
        raise TypeError(f"subscripted value is not an array: '{describe(array)}'")
    if index.ctype is None or index.ctype.kind == "floating":
        raise TypeError(f"array subscript is not an integer: '{describe(index)}'")
    position = int(index.value)
    if not 0 <= position < len(array.value):
        raise ValueError(f"index {position} is out of bounds of an array of {len(array.value)}")
    item = array.value[position]
    return item if isinstance(item, Typed) else typed(item, types)  # a compound literal's element keeps its type


def native(value: Typed) -> Any:
    """A value's native, an array's a list of its elements' natives."""
    held = value.value
    return [native(item) for item in held] if isinstance(held, list) and held and isinstance(held[0], Typed) else held


class Scope(S.Variables):
    """C's and C++'s scope for an expression: `variables` (C++'s `this` among them, by that name, and a qualified name's
    value by its spelling, `ns::x`), the `functions` it may call, and C++'s `packs`, each a function parameter pack's
    values by its name, which a pack expansion, a fold and `sizeof...` read."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None,
                 packs: Mapping[str, Sequence[Any]] | None = None):
        super().__init__(variables)
        self.functions = dict(functions or {})
        self.packs = {name: tuple(values) for name, values in (packs or {}).items()}

    def lookup(self, reference: Any) -> Any:
        path = Terms.dialect_of(reference)[len("Expressions."):-len(".Term")]
        tag, record = Terms.kind_of(reference)
        types = Domains.Types(reference, path)
        if tag == "thisexpression":  # C++'s `this`, bound by that name
            return typed(self.value("this"), types)
        name = Terms.name_of(reference)
        if name is None:  # C++'s idexpression of a name that is not an identifier: its spelling, where it is qualified
            name = _qualified(Terms.attributes_of(record).get("name"))
            if name is None:
                raise F.NoRule(Terms.dialect_name(path), f"{tag} of a name that is not an identifier")
        return typed(self.value(name), types)

    def function(self, name: str) -> Callable[..., Any]:
        if name not in self.functions:
            raise S.Unbound(name)
        return self.functions[name]

    def bound(self, name: str) -> bool:
        """Whether `name` is bound to a value (not to `Symbolics.UNKNOWN`)."""
        return self.values.get(name, S.UNKNOWN) is not S.UNKNOWN

    def pack(self, name: str) -> tuple[Any, ...]:
        """The values of the pack `name`; raises `Unbound` where it binds none."""
        if name not in self.packs:
            raise S.Unbound(name)
        return self.packs[name]


def _qualified(name: Any) -> str | None:
    """A qualified name's spelling (`ns::x`, `::x`), where its qualifiers and its name are identifiers; None
    otherwise."""
    if not isinstance(name, Terms.Part) or name.kind != "qualifiedname":
        return None
    parts = [*name.attributes.get("qualifiers", ()), name.attributes.get("name")]
    if any(part is None or part.kind != "identifier" for part in parts):
        return None
    return ("::" if name.attributes.get("global_scope") else "") + "::".join(
        part.attributes["spelling"] for part in parts)


# --- Types read from type names, and the types of operands left unevaluated ---


class Rules(F.Interpreter):
    """The folding rules of a dialect of the family: the framework's interpreter, with `nullptr`'s value, which its
    kind's role does not give; `declared(type, node, scope)`, the type a type name names; `type_of(term, scope)`, an
    unevaluated operand's type; and `typings`, how each kind a dialect adds is typed (C++'s casts)."""

    def __init__(self, dialect: Any, operations: Mapping[str, Any], **options: Any):
        super().__init__(dialect, operations, **options)
        self.typings: dict[str, Callable[[Any, Any], Any]] = {}

    def evaluate(self, node: Any, scope: Any) -> Any:
        tag, record = Terms.kind_of(node)
        if tag == Kinds.CONSTANT and self.dialect.owner(node) is self.dialect:
            if Terms.attributes_of(record).get("singleton") != "nullptr":
                raise ValueError("a constant needs the singleton nullptr")
            return Typed(None, None)
        return super().evaluate(node, scope)

    def declared(self, term: Any, node: Any, scope: Any) -> Any:
        """The type a type name names (a C Types or Cpp Types term): an arithmetic type, a bit-precise integer type,
        `VOID`, or an array of one (`ArrayType`); None for any other (a pointer, a structure, a function, a type a
        program declares). Invalid syntax stays, named by its owner."""
        tag = Terms.kind_of(term)[0]
        if tag in Terms.INVALID_KINDS:
            raise F.NoRule(self.dialect.owner(term).name(), tag)
        tree = Terms.node(*Terms.kind_of(term))  # a typeid, or an enumerator, which names none
        base = self._specified(tree.helpers.get("specifiers", ()), _types(node, self.dialect), scope)
        return None if base is None else self._derived(tree.helpers.get("declarator"), base, scope)

    def _specified(self, specifiers: Sequence[Terms.Node], types: Domains.Types, scope: Any) -> Any:
        words: list[Any] = []
        width = None
        for specifier in specifiers:
            if specifier.kind in ("primitivetypespecifier", "cvqualifier"):
                words.append(specifier.attributes.get("keyword"))
            elif specifier.kind == "namedtypespecifier":
                words.append(Kinds._spelling(specifier.helpers.get("name")))
            elif specifier.kind == "bitintspecifier":
                width = specifier.subterms["width"]
            else:
                return None
        rest = [word for word in words if word not in Domains.QUALIFIERS]
        if width is not None:  # C23's `_BitInt(N)`, signed or not
            if rest not in ([], ["signed"], ["unsigned"]):
                raise TypeError(f"invalid type specifiers with '_BitInt': {' '.join(rest)}")
            signed, bits = rest != ["unsigned"], self.evaluate(width, scope)
            named = f"{'' if signed else 'unsigned '}_BitInt"
            if bits.ctype is None or bits.ctype.kind != "integer":
                raise TypeError(f"width of '{named}' has non-integer type '{describe(bits)}'")
            if bits.value < (2 if signed else 1):
                raise TypeError(f"width of '{named}' is too small: {bits.value}")
            return Domains.bit_precise(bits.value, signed, types)
        if rest == ["void"]:
            return VOID
        return Kinds.cast_type(Domains.arithmetic(words), types)

    def _derived(self, declarator: Terms.Node | None, base: Any, scope: Any) -> Any:
        """The type an abstract declarator derives from `base`: arrays, each of its size (`int[2][3]` an array of 2
        arrays of 3); None for any other (a pointer, a function)."""
        if declarator is None:
            return base
        if declarator.kind != "arraydeclarator" or base is VOID:
            return None
        size, length = declarator.subterms.get("size"), None
        if size is not None:
            counted = self.evaluate(size, scope)
            if counted.ctype is None or counted.ctype.kind != "integer":
                raise TypeError(f"size of an array has non-integer type '{describe(counted)}'")
            if counted.value <= 0:
                raise TypeError(f"size of an array is not positive: {counted.value}")
            length = counted.value
        return self._derived(declarator.helpers.get("declarator"), ArrayType(base, length), scope)

    def type_of(self, term: Any, scope: Any) -> Any:
        """The type of an operand C leaves unevaluated (`sizeof`'s, `_Generic`'s, the conditional's other one): a
        `CType`, an `ArrayType` (a string literal's, a compound literal's), `VOID` or `Domains.NULLPTR`, by its kind, a
        variable's by its value; raises `Untyped` where its declaration gives it (a member, a call's result)."""
        dialect = self.dialect
        tag, record, kind = dialect.kind(term)
        owner = dialect.owner(term)
        if kind.role == Terms.INVALID or owner is not dialect:
            raise F.NoRule(owner.name(), tag)
        arguments = Terms.arguments_of(record)
        if tag == Kinds.LITERAL and type(Terms.attributes_of(record).get("value")) is str:
            return _string_type(Terms.attributes_of(record), _types(term, dialect))
        if tag in (Kinds.LITERAL, Kinds.CONSTANT) or kind.role == Terms.REFERENCE:
            value = self.evaluate(term, scope)
            if value.ctype is None and not _null(value):
                raise Untyped(tag)
            return Domains.NULLPTR if _null(value) else value.ctype
        if tag == Kinds.CONCATENATEDSTRING:
            parts = [Terms.attributes_of(Terms.kind_of(part)[1]) for part in arguments]
            if any(type(part.get("value")) is not str for part in parts):
                raise Untyped(tag)
            prefixes = {part.get("prefix") for part in parts} - {None}
            joined = {"value": "".join(part["value"] for part in parts), "prefix": min(prefixes, default=None)}
            return _string_type(joined, _types(term, dialect))
        if tag in (Kinds.PARENTHESIZEDEXPRESSION, Kinds.EXTENSIONEXPRESSION):
            return self.type_of(arguments[0], scope)
        if tag == Kinds.CASTEXPRESSION:
            return self._scalar(self.declared(arguments[0], term, scope), tag)
        if tag == Kinds.UNARYEXPRESSION:
            return self._unary_type(Terms.attributes_of(record)["operator"], arguments[0], term, scope)
        if tag == Kinds.BINARYEXPRESSION:
            return self._binary_type(Terms.attributes_of(record)["operator"], arguments, term, scope)
        if tag == Kinds.CONDITIONALEXPRESSION:
            first = self.type_of(arguments[1] if arguments[1] is not None else arguments[0], scope)
            return self.arms_type(first, self.type_of(arguments[2], scope), tag)
        if tag in (Kinds.SIZEOFEXPRESSION, Kinds.ALIGNOFEXPRESSION, "sizeofpackexpression"):
            return _types(term, dialect).named("size_t")
        if tag == Kinds.GENERICSELECTION:
            return self.type_of(arguments[self.select(term, scope)], scope)
        if tag == Kinds.COMPOUNDLITERALEXPRESSION:
            declared = self.declared(arguments[0], term, scope)
            if isinstance(declared, ArrayType) and declared.length is None:
                return ArrayType(declared.element, len(self.evaluate(term, scope).value))
            return self._scalar(declared, tag) if not isinstance(declared, ArrayType) else declared
        if tag in self.typings:
            return self.typings[tag](term, scope)
        raise Untyped(tag)

    @staticmethod
    def _scalar(declared: Any, tag: str) -> Any:
        if declared is VOID or isinstance(declared, CType):
            return declared
        raise Untyped(tag)

    def _truth_type(self, term: Any) -> CType:
        """The type of a comparison and of `&&`, `||` and `!`: C's `int`, C++'s `bool`."""
        return _types(term, self.dialect).named("int" if language(self.dialect) == "C" else "bool")

    def _arithmetic_type(self, operand: Any, operator: str, scope: Any) -> CType:
        found = self.type_of(operand, scope)
        if not isinstance(found, CType):
            raise TypeError(f"invalid operand to {operator}: '{_type_name(found)}'")
        return found

    def _unary_type(self, operator: str, operand: Any, term: Any, scope: Any) -> CType:
        if operator == "!":
            return self._truth_type(term)
        if operator not in ("+", "-", "~"):  # `*` and `&`: the object model's
            raise Untyped(Kinds.UNARYEXPRESSION)
        return Domains.promoted(self._arithmetic_type(operand, operator, scope))

    def _binary_type(self, operator: str, arguments: tuple[Any, ...], term: Any, scope: Any) -> Any:
        if operator == ",":  # its right operand's, an array's converted to a pointer
            right = self.type_of(arguments[1], scope)
            if isinstance(right, ArrayType):
                raise Untyped(Kinds.BINARYEXPRESSION)
            return right
        if operator in ("<", "<=", ">", ">=", "==", "!=", "&&", "||"):
            return self._truth_type(term)
        if operator not in ("+", "-", "*", "/", "%", "&", "^", "|", "<<", ">>"):  # C++'s `<=>`, `.*` and `->*`
            raise Untyped(Kinds.BINARYEXPRESSION)
        left, right = (self._arithmetic_type(argument, operator, scope) for argument in arguments)
        if operator in ("<<", ">>"):
            return Domains.promoted(left)
        found = Domains.common(left, right)
        if found is None:
            raise TypeError(f"invalid operands to binary {operator} ('{left.name()}' and '{right.name()}')")
        return found

    def arms_type(self, first: Any, second: Any, tag: str) -> Any:
        """The type of a conditional whose operands' types are `first` and `second`: the usual arithmetic conversions'
        of two arithmetic types (in C++, one type where both are it), `nullptr_t` or `void` where both are."""
        if isinstance(first, CType) and isinstance(second, CType):
            if language(self.dialect) == "C++" and self.identity(first) == self.identity(second):
                return first
            found = Domains.common(first, second)
            if found is None:
                raise TypeError(f"invalid operands to conditional expression ('{first.name()}' and '{second.name()}')")
            return found
        if first is second and first in (VOID, Domains.NULLPTR):
            return first
        raise Untyped(tag)

    def identity(self, type_: Any) -> str:
        """The name of the type a type is (`Domains.Types.identity`), `void` or `nullptr_t`."""
        if isinstance(type_, CType):
            return type_.types.identity(type_, language(self.dialect))  # type: ignore[union-attr]
        return "void" if type_ is VOID else "nullptr_t"

    def select(self, term: Any, scope: Any) -> int:
        """The position among a generic selection's arguments of the value its controlling operand's type chooses."""
        arguments = Terms.arguments_of(Terms.kind_of(term)[1])
        controlling = arguments[0]
        try:
            if Terms.kind_of(controlling)[0] == Kinds.TYPEID:  # a type name (C2y)
                found = self.declared(controlling, term, scope)
                if found is None or isinstance(found, ArrayType):
                    raise _refuse(self.dialect, "genericselection of a type that is not arithmetic")
            else:
                found = self.type_of(controlling, scope)
                if isinstance(found, ArrayType):  # converted to a pointer
                    raise Untyped(Kinds.GENERICSELECTION)
        except Untyped:
            raise _refuse(self.dialect, "genericselection of an operand of unknown type") from None
        identity = self.identity(found)
        chosen = default = None
        for i in range(1, len(arguments), 2):
            association = arguments[i]
            if association is None:  # `default`
                default = i + 1
                continue
            tree = Terms.node(*Terms.kind_of(association))
            if tree.kind == Kinds.TYPEID and any(s.kind == "cvqualifier" for s in tree.helpers.get("specifiers", ())):
                continue  # a qualified type, which no operand's type is after its lvalue conversion
            declared = self.declared(association, term, scope)
            if declared is None or isinstance(declared, ArrayType):
                if tree.kind == Kinds.TYPEID and "declarator" not in tree.helpers and not any(
                        s.kind == "classspecifier" for s in tree.helpers.get("specifiers", ())):
                    raise _refuse(self.dialect, "genericselection of an association of a type a declaration names")
                continue  # a pointer, an array, a structure or a union: not an operand's arithmetic type
            if self.identity(declared) == identity:
                if chosen is not None:
                    raise TypeError(f"'_Generic' specifies two associations of type '{identity}'")
                chosen = i + 1
        if chosen is None and default is None:
            raise TypeError(f"'_Generic' selector of type '{identity}' is not compatible with any association")
        return chosen if chosen is not None else default  # type: ignore[return-value]


def _type_name(type_: Any) -> str:
    if isinstance(type_, ArrayType):
        return "array"
    return "void" if type_ is VOID else type_.name()


_ENCODED = {None: "char", "u8": "char8_t", "u": "char16_t", "U": "char32_t", "L": "wchar_t"}
"""The type of a string literal's elements, by its encoding prefix."""


def _string_type(attributes: Mapping[str, Any], types: Domains.Types) -> ArrayType:
    """A string literal's type: an array of its encoding's code units, and its terminating zero."""
    element = types.named(_ENCODED[attributes.get("prefix")])
    text = attributes["value"]
    units = {8: len(text.encode("utf-8")), 16: len(text.encode("utf-16-le")) // 2}.get(element.width, len(text))
    return ArrayType(element, units + 1)


# --- Kinds ---


def _conditional(dialect: Any, rules: Rules) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        terms = Terms.arguments_of(Terms.kind_of(node)[1])
        condition = arguments[0]()
        if terms[1] is None:  # GNU's `a ?: b`: `a` once, `b` where it is zero
            chosen, other = (condition, terms[2]) if truth(condition, "?:", node, dialect).value else (
                arguments[2](), terms[0])
        elif truth(condition, "?:", node, dialect).value:
            chosen, other = arguments[1](), terms[2]
        else:
            chosen, other = arguments[2](), terms[1]
        if chosen.ctype is None:
            return chosen
        try:  # the other operand's type, unevaluated: the usual arithmetic conversions of the two
            found = rules.type_of(other, scope)
        except (Untyped, S.Unbound, F.NoRule):
            return chosen  # its declaration's: the chosen one's type kept
        if not isinstance(found, CType):
            return chosen
        return convert(chosen, rules.arms_type(chosen.ctype, found, Kinds.CONDITIONALEXPRESSION))

    return apply


def _cast(dialect: Any, rules: Rules) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        target = rules.declared(Terms.arguments_of(Terms.kind_of(node)[1])[0], node, scope)  # read, not folded
        if target is VOID:  # its operand evaluated, to no value
            arguments[1]()
            return Typed(None, VOID)
        if not isinstance(target, CType):
            raise _refuse(dialect, "castexpression to a type that is not arithmetic")
        return convert(arguments[1](), target)

    return apply


def _member(dialect: Any) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        attributes = _attributes(node)
        name = Kinds._spelling(attributes["member"])
        if name is None or attributes.get("template_keyword"):
            raise _refuse(dialect, "memberexpression of a member that is not an identifier")
        target = arguments[0]().value
        if isinstance(target, Mapping):
            members = target
        elif Objects.is_object(target):
            members = Objects.properties(target)
        else:
            raise TypeError(f"member reference base type '{type(target).__name__}' is not a structure")
        if name not in members:
            raise KeyError(f"no member named '{name}'")
        return typed(_array(members[name]), _types(node, dialect))

    return apply


def _subscript(dialect: Any) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        if len(arguments) != 2:
            raise _refuse(dialect, "subscriptexpression of several indices")
        return _element(arguments[0](), arguments[1](), _types(node, dialect))

    return apply


def _call(dialect: Any) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Scope) -> Typed:
        callee = Terms.arguments_of(Terms.kind_of(node)[1])[0]
        if dialect.kind(callee)[2].role != Terms.REFERENCE or Terms.name_of(callee) is None:
            raise _refuse(dialect, "callexpression of a callee that is not a function's name")
        function = scope.function(Terms.name_of(callee))
        values: list[Typed] = []
        for argument in arguments[1:]:
            value = argument()
            values.extend(value.value.items if isinstance(value.value, Pack) else (value,))  # a pack expansion spliced
        return typed(function(*(native(value) for value in values)), _types(node, dialect))

    return apply


def _concatenated(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    """Adjacent string literals: one string."""
    parts = [argument() for argument in arguments]
    for part in parts:
        if type(part.value) is not str:
            raise TypeError(f"invalid operand to a string concatenation: '{describe(part)}'")
    return Typed(None, "".join(part.value for part in parts))


def _size(dialect: Any, rules: Rules) -> F.Implementation:
    """`sizeof` and `alignof` of a type name or of an operand's type, unevaluated, as the ABI lays it out."""

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        tag, record = Terms.kind_of(node)
        operand = Terms.arguments_of(record)[0]
        if Terms.kind_of(operand)[0] == Kinds.TYPEID:
            found = rules.declared(operand, node, scope)
            if found is None:
                raise _refuse(dialect, f"{tag} of a type that is not arithmetic")
        else:
            try:
                found = rules.type_of(operand, scope)
            except Untyped:
                raise _refuse(dialect, f"{tag} of an operand of unknown type") from None
        keyword = Terms.attributes_of(record).get("keyword", "sizeof")
        return Typed(_types(node, dialect).named("size_t"), _bytes(found, keyword, tag, dialect))

    return apply


def _bytes(type_: Any, keyword: str, tag: str, dialect: Any) -> int:
    """A type's size (`sizeof`) or its alignment (`alignof`), in bytes."""
    if type_ is VOID:
        raise TypeError(f"invalid application of '{keyword}' to a void type")
    if isinstance(type_, ArrayType):
        if tag != Kinds.SIZEOFEXPRESSION:
            return _bytes(type_.element, keyword, tag, dialect)
        if type_.length is None:
            raise TypeError(f"invalid application of '{keyword}' to an incomplete type")
        return type_.length * _bytes(type_.element, keyword, tag, dialect)
    if not isinstance(type_, CType):
        raise _refuse(dialect, f"{tag} of nullptr_t")  # a pointer's layout, which no ABI dialect stores
    size = Domains.layout(type_)
    if size is None:
        raise _refuse(dialect, f"{tag} of a bit-precise integer type")
    return size


def _generic(rules: Rules) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        return arguments[rules.select(node, scope)]()

    return apply


def _compound(dialect: Any, rules: Rules) -> F.Implementation:
    """A compound literal of an arithmetic type, or of an array of one: its initializer's value, converted."""

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        tree = Terms.node(*Terms.kind_of(node))
        declared = rules.declared(tree.subterms["type"], node, scope)
        items = tree.helpers["initializer"].many
        zero = Typed(_types(node, dialect).named("int"), 0)
        if isinstance(declared, CType):
            if len(items) > 1:
                raise TypeError("excess elements in a scalar initializer")
            return convert(_item(rules, items[0], scope, dialect) if items else zero, declared)
        if not isinstance(declared, ArrayType):
            raise _refuse(dialect, "compoundliteralexpression of a type that is not arithmetic")
        if not isinstance(declared.element, CType):
            raise _refuse(dialect, "compoundliteralexpression of an array of arrays")
        values = _elements(rules, declared, items, scope, dialect)
        length = declared.length if declared.length is not None else max(values, default=-1) + 1
        return Typed(None, [values.get(i, convert(zero, declared.element)) for i in range(length)])

    return apply


def _item(rules: Rules, item: Any, scope: Any, dialect: Any) -> Typed:
    """An initializer's item's value; nested braces stay."""
    if Terms.kind_of(item)[0] in (Kinds.INITIALIZERLIST, Kinds.DESIGNATEDINITIALIZER):
        raise _refuse(dialect, "compoundliteralexpression of nested braces")
    return rules.evaluate(item, scope)


def _elements(rules: Rules, array: ArrayType, items: tuple[Any, ...], scope: Any, dialect: Any) -> dict[int, Typed]:
    """An array's initialized elements by position: each item in turn, or where its designator says (`[2] = 5`, GNU's
    `[0 ... 2] = 5`); a character array's string, its code units and its terminating zero."""
    element = array.element
    first = Terms.kind_of(items[0])[0] if len(items) == 1 else None
    if first in (Kinds.LITERAL, Kinds.CONCATENATEDSTRING) and element.kind == "integer" and element.width == 8:
        text = rules.evaluate(items[0], scope).value
        if type(text) is str:  # its terminating zero dropped where the array's length leaves no room for it
            codes = [*text.encode("utf-8"), 0]
            if array.length is not None and len(codes) - 1 > array.length:
                raise TypeError("initializer-string for an array is too long")
            int_ = _types(items[0], dialect).named("int")
            return {i: convert(Typed(int_, code), element) for i, code in enumerate(codes[:array.length])}
    values: dict[int, Typed] = {}
    position = 0
    for item in items:
        first = last = position
        if Terms.kind_of(item)[0] == Kinds.DESIGNATEDINITIALIZER:
            designated = Terms.node(*Terms.kind_of(item))
            designators = designated.helpers.get("designators", ())
            if len(designators) != 1 or designators[0].kind != "indexdesignator":
                raise TypeError("an array's element is designated by its index")
            first = last = _index(rules, designators[0].subterms["index"], scope)
            if designators[0].subterms.get("last") is not None:
                last = _index(rules, designators[0].subterms["last"], scope)
            initializer = designated.helpers["initializer"]
            if initializer.kind != "equalinitializer":
                raise _refuse(dialect, "compoundliteralexpression of nested braces")
            item = initializer.subterms["value"]
        value = convert(_item(rules, item, scope, dialect), element)
        for index in range(first, last + 1):
            if array.length is not None and index >= array.length:
                raise TypeError("excess elements in an array initializer")
            values[index] = value
        position = last + 1
    return values


def _index(rules: Rules, term: Any, scope: Any) -> int:
    found = rules.evaluate(term, scope)
    if found.ctype is None or found.ctype.kind != "integer":
        raise TypeError(f"array index in an initializer has non-integer type '{describe(found)}'")
    if found.value < 0:
        raise TypeError(f"array index in an initializer is negative: {found.value}")
    return found.value  # type: ignore[no-any-return]


FOLDED = frozenset({Expressions.LITERAL, Kinds.CONSTANT, Kinds.CONCATENATEDSTRING, Expressions.VARIABLE,
                    Kinds.PARENTHESIZEDEXPRESSION, Kinds.GENERICSELECTION, Expressions.SUBSCRIPTEXPRESSION,
                    Expressions.CALLEXPRESSION, Expressions.MEMBEREXPRESSION, Expressions.UNARYEXPRESSION,
                    Kinds.SIZEOFEXPRESSION, Kinds.ALIGNOFEXPRESSION, Expressions.CASTEXPRESSION,
                    Expressions.BINARYEXPRESSION, Expressions.CONDITIONALEXPRESSION, Kinds.COMPOUNDLITERALEXPRESSION,
                    Kinds.EXTENSIONEXPRESSION})
"""The kinds its rules fold: a literal and a variable, and every kind of class (a); any other stays in the residual,
named."""

_D = "d"
CATEGORIES: dict[str, dict[str, str]] = {
    "C": {"initializerlist": "b", "designatedinitializer": "b",
          **dict.fromkeys(("sizeofexpression of an operand of unknown type",
                           "alignofexpression of an operand of unknown type",
                           "genericselection of an operand of unknown type"), "c"),
          **dict.fromkeys(("statementexpression", "assignmentexpression", "postfixexpression", "unaryexpression '*'",
                           "unaryexpression '&'", "unaryexpression '++'", "unaryexpression '--'",
                           "castexpression to a type that is not arithmetic",
                           "callexpression of a callee that is not a function's name",
                           "sizeofexpression of a type that is not arithmetic",
                           "alignofexpression of a type that is not arithmetic",
                           "genericselection of a type that is not arithmetic",
                           "genericselection of an association of a type a declaration names",
                           "compoundliteralexpression of a type that is not arithmetic"), _D)},
    "C Types": {"*": "b"}, "C Preprocessor": {"*": "b", "definedexpression": "a"},
}
"""The evaluation inventory's class of what each dialect C reads has no rule for (`a` where none is given): an operand
whose declaration gives its type `c` (mbse-basis [CAP-232: domains inferred for
terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)); the object model, a type a declaration names, writes and
statements `d`; a layout no ABI dialect stores, nested braces and an array of arrays in a compound literal `a`."""


def _literal_of(write: Callable[..., Any], dialect: Any) -> Callable[[Typed], Any]:
    """The literal of a value of its type, written by `write`, `nullptr` C's or C++'s `constant`; None for a type no
    literal has, a floating value no binary64 literal spells exactly, or an object."""
    written = language(dialect)

    def literal(value: Typed) -> Any:
        native, ctype = value.value, value.ctype
        if ctype is None:
            if native is None:
                return dialect.make(Terms.Form(Kinds.CONSTANT, {"singleton": "nullptr"}, ()))
            return write(native) if type(native) is str else None
        types: Domains.Types = ctype.types  # type: ignore[assignment]
        if ctype.precise:  # its narrowest literal, where that is of its type
            suffix = "wb" if ctype.signed else "uwb"
            narrowest = Domains.literal({"value": native, "suffix": suffix}, written, types)
            return write(native, suffix) if narrowest == ctype else None
        own = Domains.literal_suffix(ctype.label, written) is not None  # its own name's suffix, else its identity's
        name = ctype.label if own else types.identity(ctype, written)
        suffix = Domains.literal_suffix(name, written)
        if suffix is None:
            return None
        if ctype.kind != "floating":
            return write(native, suffix or None)
        binary64 = native if type(native) is float else Ieee754.convert(ctype.format, native, "binary64", _EVEN)
        if not math.isfinite(binary64) or Ieee754.convert("binary64", binary64, ctype.format, _EVEN) != native:
            return None
        return write(binary64, suffix or None)

    return literal


def _simplify(node: Any, results: list[F.Result]) -> F.Result | None:
    """What does not depend on a subterm that stays: `a, b` where `a` is known, `b`."""
    tag, record = Terms.kind_of(node)
    if tag == Kinds.BINARYEXPRESSION and Terms.attributes_of(record)["operator"] == "," and results[0].known:
        return results[1]
    return None


def rules(dialect: Any, folded: frozenset[str] = FOLDED,
          extend: Callable[[dict[str, Any], Rules], None] | None = None) -> Rules:
    """The folding rules of a dialect of the C family, `C`'s or `Cpp`'s, folding the kinds `folded` names, its values
    carrying their C types; `extend(operations, rules)` adds a dialect's own kinds' rules (C++'s)."""
    operations: dict[str, Any] = {}
    found = Rules(dialect, operations, literal=_untyped, typed=_literal(dialect), scope=Scope, folded=folded)
    operations.update({
        Expressions.BINARYEXPRESSION: {
            **{op: _binary_arithmetic(op) for op in ("+", "-", "*", "/", "%", "&", "^", "|")},
            **{op: _shift(op) for op in ("<<", ">>")},
            **{op: _comparison(op, dialect) for op in ("<", "<=", ">", ">=", "==", "!=")},
            **{op: _logical(op, dialect) for op in ("&&", "||")}, ",": _comma,
        },
        Expressions.UNARYEXPRESSION: {op: _unary(op, dialect) for op in ("+", "-", "~", "!")},
        Expressions.CONDITIONALEXPRESSION: _conditional(dialect, found),
        Expressions.CASTEXPRESSION: _cast(dialect, found),
        Expressions.MEMBEREXPRESSION: _member(dialect), Expressions.SUBSCRIPTEXPRESSION: _subscript(dialect),
        Expressions.CALLEXPRESSION: _call(dialect), Kinds.CONCATENATEDSTRING: _concatenated,
        Kinds.PARENTHESIZEDEXPRESSION: lambda arguments, node, scope: arguments[0](),
        Kinds.EXTENSIONEXPRESSION: lambda arguments, node, scope: arguments[0](),
        Kinds.SIZEOFEXPRESSION: _size(dialect, found), Kinds.ALIGNOFEXPRESSION: _size(dialect, found),
        Kinds.GENERICSELECTION: _generic(found), Kinds.COMPOUNDLITERALEXPRESSION: _compound(dialect, found),
    })
    if extend is not None:
        extend(operations, found)
    return found


def simplifier(dialect: Any, folded: frozenset[str], categories: Mapping[str, Mapping[str, str]],
               write: Callable[..., Any],
               extend: Callable[[dict[str, Any], Rules], None] | None = None) -> F.Simplifier:
    """The simplifier of a dialect of the C family, by `rules(dialect, folded, extend)`, its literals written by
    `write`."""
    return F.Simplifier(rules(dialect, folded, extend), literal=_literal_of(write, dialect), categories=categories,
                        native=native, simplify=_simplify)


SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal)
"""The simplifier of the C dialect."""

RULES = SIMPLIFIER.rules
"""The folding rules of the C dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a term in `scope`, or with the variables in a mapping bound."""
    return SIMPLIFIER(expression, scope)
