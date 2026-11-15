"""Simplifiers of the Cpp dialect: simplify an expression by ISO/IEC 14882's rules, which are C's for the kinds C++
shares with C (see `C.Simplifiers`, `Scope` among them), under the ABI the expression's holder names:
`Simplifiers.OfAny(term, scope)` simplifies a term value in a `Scope(variables, functions, packs)`.

A name used as an expression is an `idexpression`: an identifier's value is the scope's variable of its name, a
qualified name's (`ns::x`, `::x`) the variable of its spelling; `this` is the scope's variable `this`. C++'s own kinds
fold by its rules:

- `T(x)` and `T{x}`, a functional cast to an arithmetic type, convert as a cast does (`T()` and `T{}` its zero), a
  braced one refusing a narrowing conversion, one that does not keep its value (`TypeError`); `static_cast<T>(x)` is a
  cast. `const_cast`, `dynamic_cast` and `reinterpret_cast`, and a cast to a class type, stay (class `d`).
- `12_km` calls the literal operator `operator""_km` the scope provides, by that name, with its literal's value, the
  standard library's (`1s`, `"a"s`) among them; one the scope does not provide stays.
- `a <=> b` compares two arithmetic values, after the usual arithmetic conversions (refusing one that narrows an
  integer's value, as C++ refuses a narrowing conversion there), into a value of `<compare>`'s comparison categories
  (`Ordering`): `std::strong_ordering` for integers, `std::partial_ordering` for floating values, unordered where one is
  NaN. An ordering has no literal; it compares with the literal 0 (`(a <=> b) < 0`), and with an ordering of its
  category by `==`.
- A parameter pack is the scope's `packs`, by its name: `sizeof...(p)` is its size; `f(p...)` and `f((p + 1)...)` expand
  a pattern over its packs' values into a call's arguments; `(p + ...)`, `(... + p)`, `(p + ... + i)` and `(i + ... +
  p)` fold its values by a binary operator, an empty one by `&&` (`true`), `||` (`false`) and `,` (`void`). A fold over
  an assignment operator, `.*` or `->*` stays (class `d`).
- `throw x` evaluates `x` and raises `Thrown`, carrying its value (`c ? x : throw e` raises only where `c` is false); a
  rethrow, `throw` alone, stays (class `d`: a handler's).

What stays, named, with its class (`CATEGORIES`): a lambda, `new` and `delete`, `noexcept`, coroutines, statements,
writes, pointers to members and names that are not identifiers or qualified identifiers (`f<int>`, `operator+`), class
`d`; `requires` and `typeid`, class `c`; C's own (see `C.Simplifiers`); a term of `Cpp Types` or `Cpp RegExp`.

"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.C.Expressions import Domains, Kinds
from mbse.Expressions.C.Expressions.Simplifiers import (CATEGORIES as C_CATEGORIES, FOLDED as C_FOLDED, VOID, Pack,
                                                         Rules, Scope, Typed, Untyped, common, convert, describe,
                                                         native, order, simplifier, typed, zero)
from mbse.Expressions.Framework import Simplifiers as F, Symbolics as S, Terms
from mbse.Expressions.Patterns.Expressions import Ieee754

from . import Expressions

__all__ = ["OfAny", "Scope", "RULES", "SIMPLIFIER", "FOLDED", "CATEGORIES", "Ordering", "Thrown"]


@dataclass(frozen=True)
class Ordering:
    """A value of one of `<compare>`'s comparison categories ([cmp.categories]): its `category`, `strong_ordering` or
    `partial_ordering`, and its `order`, -1 less, 0 equal or equivalent, 1 greater, None unordered."""

    category: str
    order: int | None

    def __repr__(self) -> str:
        names = {-1: "less", 0: "equal" if self.category == "strong_ordering" else "equivalent", 1: "greater",
                 None: "unordered"}
        return f"std::{self.category}::{names[self.order]}"


class Thrown(Exception):
    """A `throw`'s exception, carrying its operand's `value`, its native."""

    def __init__(self, value: Any):
        super().__init__("an exception is thrown")
        self.value = value


def _refuse(what: str) -> F.NoRule:
    return F.NoRule(Expressions.DIALECT.name(), what)


def _bool(node: Any) -> Any:
    return Domains.Types(node, Expressions.DIALECT.path).named("bool")


def _shown(value: Typed) -> str:
    return f"std::{value.value.category}" if isinstance(value.value, Ordering) else describe(value)


# --- <=> and the comparisons of orderings ---


def _three_way(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    left, right = arguments[0](), arguments[1]()
    if isinstance(left.value, Ordering) or isinstance(right.value, Ordering):
        ordering, flipped = _with_zero(left, right, node, "<=>")
        return Typed(None, ordering if not flipped else Ordering(ordering.category, None if ordering.order is None
                                                                  else -ordering.order))
    ctype, a, b = common(left, right, "<=>")
    for value in (left, right):  # a narrowing conversion, but an integer's to a floating type, is refused
        if value.ctype is not None and value.ctype.kind != "floating" and ctype.kind != "floating" and \
                not ctype.contains(value.value):
            raise TypeError(f"invalid operands to binary <=>: narrowing conversion of {value.value} from "
                            f"'{value.ctype.name()}' to '{ctype.name()}'")
    if ctype.kind == "floating":  # unordered where either is NaN
        if any(Ieee754.decode(ctype.format, operand.value).special == "nan" for operand in (a, b)):
            return Typed(None, Ordering("partial_ordering", None))
        return Typed(None, Ordering("partial_ordering", order(ctype.format, a.value, b.value)))
    return Typed(None, Ordering("strong_ordering", (a.value > b.value) - (a.value < b.value)))


def _with_zero(left: Typed, right: Typed, node: Any, operator: str) -> tuple[Ordering, bool]:
    """An ordering compared with the literal 0, and whether it is the right operand (`0 < o`); anything else is
    refused."""
    terms = Terms.arguments_of(Terms.kind_of(node)[1])
    if isinstance(left.value, Ordering) and zero(terms[1], Expressions.DIALECT):
        return left.value, False
    if isinstance(right.value, Ordering) and zero(terms[0], Expressions.DIALECT):
        return right.value, True
    raise TypeError(f"invalid operands to binary {operator} ('{_shown(left)}' and '{_shown(right)}')")


_TESTS: dict[str, Callable[[int], bool]] = {"<": lambda o: o < 0, "<=": lambda o: o <= 0, ">": lambda o: o > 0,
                                            ">=": lambda o: o >= 0, "==": lambda o: o == 0, "!=": lambda o: o != 0}


def _ordered(operator: str, comparison: F.Implementation) -> F.Implementation:
    """A comparison, of an ordering with the literal 0 or with an ordering of its category by `==` and `!=`, else C's."""

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        left, right = arguments[0](), arguments[1]()
        if not isinstance(left.value, Ordering) and not isinstance(right.value, Ordering):
            return comparison([lambda: left, lambda: right], node, scope)
        if operator in ("==", "!=") and isinstance(left.value, Ordering) and isinstance(right.value, Ordering) and \
                left.value.category == right.value.category:
            return Typed(_bool(node), (left.value == right.value) == (operator == "=="))
        ordering, flipped = _with_zero(left, right, node, operator)
        if ordering.order is None:  # unordered: only `!=` holds
            return Typed(_bool(node), operator == "!=")
        return Typed(_bool(node), _TESTS[operator](-ordering.order if flipped else ordering.order))

    return apply


# --- Casts ---


def _specified(specifier: Terms.Node, node: Any) -> Any:
    """The type a functional cast's simple type specifier names: an arithmetic type, `VOID`, or None."""
    if specifier.kind == "primitivetypespecifier":
        word = specifier.attributes.get("keyword")
    elif specifier.kind == "namedtypespecifier":
        word = Kinds._spelling(specifier.helpers.get("name"))
    else:
        return None
    if word == "void":
        return VOID
    return Kinds.cast_type(Domains.arithmetic([word]), Domains.Types(node, Expressions.DIALECT.path))


def _narrowing(value: Typed, result: Typed) -> bool:
    """Whether converting a value is a narrowing conversion, its value a constant's ([dcl.init.list]): to `bool`, from a
    floating type to an integer type, or one that does not keep its value."""
    source, target = value.ctype, result.ctype
    if source is None or target is None or source == target:
        return False
    if target.kind == "bool" or source.kind == "floating" and target.kind != "floating":
        return True
    return convert(result, source).value != value.value


def _functional(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    tree = Terms.node(*Terms.kind_of(node))
    target = _specified(tree.helpers["type"], node)
    if target is None:
        raise _refuse("functionalcastexpression to a type that is not arithmetic")
    initializer = tree.helpers["initializer"]
    values = [argument() for argument in arguments[len(arguments) - len(initializer.many):]]
    if target is VOID:
        return Typed(None, VOID)
    if len(values) > 1:
        raise TypeError(f"a functional cast to '{target.name()}' of {len(values)} values")
    if not values:  # value-initialized: its zero
        return convert(Typed(Domains.Types(node, Expressions.DIALECT.path).named("int"), 0), target)
    result = convert(values[0], target)
    if initializer.kind == "initializerlist" and _narrowing(values[0], result):
        raise TypeError(f"narrowing conversion of {values[0].value!r} from '{describe(values[0])}' to "
                        f"'{target.name()}'")
    return result


def _static(rules: Rules) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        target = rules.declared(Terms.arguments_of(Terms.kind_of(node)[1])[0], node, scope)
        if target is VOID:
            arguments[1]()
            return Typed(None, VOID)
        if not isinstance(target, Domains.CType):
            raise _refuse("namedcastexpression to a type that is not arithmetic")
        return convert(arguments[1](), target)

    return apply


def _user_defined(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    """A user-defined literal: its literal operator, the scope's, called with its literal's value."""
    attributes = Terms.attributes_of(Terms.kind_of(node)[1])
    function = scope.function(f'operator""{attributes["suffix"]}')
    return typed(function(attributes["literal"].attributes.get("value")), Domains.Types(node,
                                                                                         Expressions.DIALECT.path))


# --- Packs ---


def _pack_name(node: Any) -> str:
    return Kinds._spelling(Terms.attributes_of(Terms.kind_of(node)[1]).get("pack"))  # type: ignore[return-value]


def _expanded(rules: Rules, pattern: Any, scope: Any) -> list[F.Thunk]:
    """A pattern's expansion: one thunk for each value of the packs it names, each its pattern with each pack's name
    bound to its value; a name neither a pack nor bound raises `Unbound`."""
    names = sorted(S.free(pattern, Expressions.DIALECT))
    packs = [name for name in names if name in scope.packs]
    unbound = [name for name in names if name not in scope.packs and not scope.bound(name)]
    if unbound:
        raise S.Unbound(unbound[0])
    if not packs:
        raise TypeError("a pack expansion's pattern names no parameter pack")
    lengths = {len(scope.pack(name)) for name in packs}
    if len(lengths) > 1:
        raise TypeError("the packs a pattern expands are of different lengths")

    def element(i: int) -> F.Thunk:
        within = scope
        for name in packs:
            within = within.bind(name, scope.pack(name)[i])
        return lambda: rules.evaluate(pattern, within)

    return [element(i) for i in range(lengths.pop())]


def _expansion(rules: Rules) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        pattern = Terms.arguments_of(Terms.kind_of(node)[1])[0]
        return Typed(None, Pack(tuple(thunk() for thunk in _expanded(rules, pattern, scope))))

    return apply


_EMPTY = {"&&": True, "||": False}


def _fold(operator: str, implementation: F.Implementation, rules: Rules) -> F.Implementation:
    """A fold of a pack's values by a binary operator, right (`(p op ...)`, `(p op ... op i)`) or left."""

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
        left, right = Terms.arguments_of(Terms.kind_of(node)[1])
        holds = left is not None and any(name in scope.packs for name in S.free(left, Expressions.DIALECT))
        pattern, initial = (left, right) if holds or right is None else (right, left)
        thunks = _expanded(rules, pattern, scope)
        if initial is not None:
            first = (lambda: rules.evaluate(initial, scope))  # noqa: E731
            thunks = thunks + [first] if pattern is left else [first] + thunks
        if not thunks:
            if operator == ",":
                return Typed(None, VOID)
            if operator not in _EMPTY:
                raise TypeError(f"a fold of an empty pack over '{operator}'")
            return Typed(_bool(node), _EMPTY[operator])

        def folded(i: int) -> Typed:  # right: thunks[i] op (... op thunks[-1]); left: (thunks[0] op ...) op thunks[i]
            if pattern is left:
                if i == len(thunks) - 1:
                    return thunks[i]()  # type: ignore[no-any-return]
                return implementation([thunks[i], lambda: folded(i + 1)], node, scope)  # type: ignore[no-any-return]
            if i == 0:
                return thunks[0]()  # type: ignore[no-any-return]
            return implementation([lambda: folded(i - 1), thunks[i]], node, scope)  # type: ignore[no-any-return]

        return folded(0 if pattern is left else len(thunks) - 1)

    return apply


def _size_of_pack(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    size = len(scope.pack(_pack_name(node)))
    return Typed(Domains.Types(node, Expressions.DIALECT.path).named("size_t"), size)


def _throw(arguments: list[F.Thunk], node: Any, scope: Any) -> Typed:
    if Terms.arguments_of(Terms.kind_of(node)[1])[0] is None:
        raise _refuse("throwexpression without an operand")
    raise Thrown(native(arguments[0]()))


def _extend(operations: dict[str, Any], rules: Rules) -> None:
    """C++'s own kinds' rules, and its operators', added to C's."""
    binary = operations[Kinds.BINARYEXPRESSION]
    binary.update({op: _ordered(op, binary[op]) for op in ("<", "<=", ">", ">=", "==", "!=")})
    binary["<=>"] = _three_way
    operations.update({
        Expressions.USERDEFINEDLITERAL: _user_defined, Expressions.FUNCTIONALCASTEXPRESSION: _functional,
        Expressions.NAMEDCASTEXPRESSION: {"static_cast": _static(rules)},
        Expressions.SIZEOFPACKEXPRESSION: _size_of_pack, Expressions.PACKEXPANSION: _expansion(rules),
        Expressions.THROWEXPRESSION: _throw,
        Expressions.FOLDEXPRESSION: {op: _fold(op, binary[op], rules) for op in Domains.FOLD if op in binary},
    })  # a fold over an assignment, `.*` or `->*` stays

    def functional_type(term: Any, scope: Any) -> Any:
        found = _specified(Terms.node(*Terms.kind_of(term)).helpers["type"], term)
        if found is None:
            raise Untyped(Expressions.FUNCTIONALCASTEXPRESSION)
        return found

    def static_type(term: Any, scope: Any) -> Any:
        record = Terms.kind_of(term)[1]
        found = rules.declared(Terms.arguments_of(record)[0], term, scope)
        if Terms.attributes_of(record)["operator"] != "static_cast" or not (
                found is VOID or isinstance(found, Domains.CType)):
            raise Untyped(Expressions.NAMEDCASTEXPRESSION)
        return found

    rules.typings.update({Expressions.FUNCTIONALCASTEXPRESSION: functional_type,
                          Expressions.NAMEDCASTEXPRESSION: static_type})


FOLDED = C_FOLDED - {"variable", "genericselection", "compoundliteralexpression"} | {
    Expressions.IDEXPRESSION, Expressions.THISEXPRESSION, Expressions.USERDEFINEDLITERAL,
    Expressions.FUNCTIONALCASTEXPRESSION, Expressions.NAMEDCASTEXPRESSION, Expressions.SIZEOFPACKEXPRESSION,
    Expressions.FOLDEXPRESSION, Expressions.PACKEXPANSION, Expressions.THROWEXPRESSION}
"""The kinds C++'s rules fold: C's that C++ has, a name used as an expression an `idexpression`, as C++'s grammar makes
it, and C++'s own kinds of class (a)."""

_D = "d"
CATEGORIES: dict[str, dict[str, str]] = {
    **C_CATEGORIES,
    "Cpp": {**C_CATEGORIES["C"], "initializerlist": "b", "designatedinitializer": "b", "requiresexpression": "c",
            "typeidexpression": "c",
            **dict.fromkeys(("lambdaexpression", "newexpression", "deleteexpression", "noexceptexpression",
                             "awaitexpression", "yieldexpression", "statementexpression", "assignmentexpression",
                             "postfixexpression", "binaryexpression '.*'", "binaryexpression '->*'",
                             "memberexpression of a member that is not an identifier",
                             "subscriptexpression of several indices", "idexpression of a name that is not an identifier",
                             "namedcastexpression 'const_cast'", "namedcastexpression 'dynamic_cast'",
                             "namedcastexpression 'reinterpret_cast'", "namedcastexpression to a type that is not arithmetic",
                             "functionalcastexpression to a type that is not arithmetic",
                             "throwexpression without an operand", "foldexpression '.*'", "foldexpression '->*'",
                             *(f"foldexpression {op!r}" for op in Domains.ASSIGNMENT)), _D)},
    "Cpp Types": {"*": "b"}, "Cpp RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect C++ reads has no rule for (`a` where none is given)."""

SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal, _extend)
"""The simplifier of the Cpp dialect; its values carry their C++ types, its residual's literals theirs."""

RULES = SIMPLIFIER.rules
"""The folding rules of the Cpp dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a term in `scope`, or with the variables in a mapping bound."""
    return SIMPLIFIER(expression, scope)
