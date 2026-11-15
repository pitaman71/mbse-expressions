"""Simplifiers of the TypeScript5 dialect: simplify an expression by ECMAScript's semantics, in a scope that decides what
it may reach.

`Simplifiers.OfAny(expression, scope)` simplifies in a `Scope`, or in one made from a mapping of variables (see
`mbse.Expressions.Framework.Simplifiers`). ECMAScript's values and abstract operations are `Abstract`'s, modeled alike
in both implementations (ECMA-262, 7): `+` concatenating or adding by ToPrimitive, `==` loosely and `===` strictly,
`<` by IsLessThan, a string's code units, bigints and their errors, `typeof`, objects by identity. What the scope
determines is folded into the literal of its value: a boolean's, a number's, a bigint's or a string's, a negative
number as the negation of its magnitude and NaN, Infinity and -0 by their names (`NaN`, `Infinity`, `-0`, as ECMAScript
spells them), `undefined` by its name, `null` and a regular expression as TypeScript5's `constant`; an array or an
object of such values into its display (`[1, , "a"]`, `{ a: 1 }`). A function (a closure an arrow makes, or one the
scope provides), a data object and a host value have no literal: such a subterm stays, its own subterms simplified, as
does a name the scope does not bind. The rest stays a TypeScript5 expression. A short circuit decides what does not
depend on what stays: `true && x` is `x`, `c ? a : b` its chosen branch when `c` is known, and `(1, x)` is `x`.

A `Scope(variables)` resolves names innermost first: names bound by an arrow's parameters, then `variables` (`this`
among them, by that name), then the global object's values, `undefined`, `NaN` and `Infinity` (ECMA-262, 19.1). A
name it does not bind stays in the residual. Nothing else is reachable from an expression, since expressions may come
from data: a call calls only a function the scope provides or an arrow the expression makes, and `new` only a class
the scope provides; a built-in method is read but not modeled (`"a".toUpperCase` stays, "TypeScript5
String.prototype.toUpperCase is not simplified"), nor is a host value's property.

Its rules fold every kind the evaluation inventory gives class (a) (mbse-expressions'
[the evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#typescript), TypeScript), `FOLDED`:
names and `this`, `null` and a regular expression, templates (a tagged one's tag called with its strings and their
`raw`), arrays (holes and spreads), objects (computed keys, shorthands, spreads), member access (`?.` short-circuiting
its chain), calls and `new`, arrows with an expression body (closures binding their parameters by TypeScript
Patterns' destructuring, with defaults and rests), the unary, binary, logical, conditional and sequence operators, and
TypeScript's own assertions, erased to their operand. What stays, named: `delete`, writes, `await`, `yield`, `import()`,
`super`, `#x`, `new.target`, and an arrow's block or an async arrow's call (class `d`: statements, a coroutine, a
class, a write, mbse-programs'); a function's or a class's expression (`d`); a signature without a body and JSX (`b`);
a built-in method and a host value (`c`: the language's own runtime, mbse-basis
[CAP-301: simplification delegated to a surrogate dialect](mbse:mbse-basis/docs/capabilities/README.md#CAP-301)); a
term of `TypeScript Types`, `TypeScript Patterns` or `TypeScript RegExp`, by the dialect that owns it (`b`); and
invalid syntax. `CATEGORIES` gives each the evaluation inventory's class.
"""

from __future__ import annotations

import math
import re
from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Simplifiers as F, Symbolics as S, Terms

from . import Abstract as A, Expressions as T, Text

__all__ = ["OfAny", "RULES", "SIMPLIFIER", "Scope", "GLOBALS", "FOLDED", "CATEGORIES"]

GLOBALS: dict[str, Any] = {"undefined": A.UNDEFINED, "NaN": math.nan, "Infinity": math.inf}
"""The global object's values a scope provides (ECMA-262, 19.1): `undefined`, `NaN` and `Infinity`."""


class Scope(S.Variables):
    """ECMAScript's scope for an expression: `variables` (`this` among them), then `GLOBALS`."""

    def lookup(self, reference: Any) -> Any:
        name = Terms.name_of(reference)
        if name in self.values or name not in GLOBALS:
            return self.value(name)
        return GLOBALS[name]


class _ShortCircuit(Exception):
    """An optional chain's `?.` met `null` or `undefined`: its chain is undefined."""


def _node(term: Any) -> T.Node:
    return Terms.node(*Terms.kind_of(term))


def _tag(term: Any) -> str:
    return Terms.kind_of(term)[0]


def _evaluate(term: Any, scope: Any) -> Any:
    return RULES.evaluate(term, scope)


def _spread(terms: tuple[Any, ...], scope: Any) -> list[Any]:
    """The values of a list of terms, each spread element's iterated in place."""
    values: list[Any] = []
    for term in terms:
        if _tag(term) == T.SPREADELEMENT:
            values += A.iterate(_evaluate(_node(term).subterms["argument"], scope))
        else:
            values.append(_evaluate(term, scope))
    return values


def _key(node: T.Node, scope: Any) -> str:
    """A property's key: computed, its expression's property key; else its identifier's name, or its literal's
    property key."""
    key = node.subterms["key"]
    if node.attributes.get("computed"):
        return A.to_property_key(_evaluate(key, scope))
    if _tag(key) == T.IDENTIFIER:
        return Terms.name_of(key)
    return A.to_property_key(_evaluate(key, scope))


# --- Closures and their parameters ---


def _bind(pattern: Any, value: Any, scope: Any) -> Any:
    """The scope with a pattern bound to a value, as ECMAScript destructures (14.3.3): a name, a default where the value
    is undefined, an array's items by iteration, an object's properties, a rest the items or properties left."""
    tag, node = _tag(pattern), _node(pattern)
    if tag == T.IDENTIFIER:
        return scope.bind(Terms.name_of(pattern), value)
    if tag == T.ASSIGNMENTPATTERN:
        if value is A.UNDEFINED:
            value = _evaluate(node.subterms["right"], scope)
        return _bind(node.subterms["left"], value, scope)
    if tag == T.ARRAYPATTERN:
        items = A.iterate(value)
        for i, element in enumerate(node.lists["elements"]):
            if _tag(element) == T.RESTELEMENT:
                scope = _bind(_node(element).subterms["argument"], items[i:], scope)
            elif _tag(element) != T.ELISION:
                scope = _bind(element, items[i] if i < len(items) else A.UNDEFINED, scope)
        return scope
    if tag == T.OBJECTPATTERN:
        if value is A.UNDEFINED or value is None:
            raise TypeError(f"Cannot destructure '{A.to_string(value)}' as it is {A.to_string(value)}.")
        taken: list[str] = []
        for member in node.lists["properties"]:
            if _tag(member) == T.RESTELEMENT:
                rest = {key: item for key, item in A.own_entries(value) if key not in taken}
                scope = _bind(_node(member).subterms["argument"], rest, scope)
            else:
                inner = _node(member)
                key = _key(inner, scope)
                taken.append(key)
                scope = _bind(inner.subterms["value"], A.get(value, key), scope)
        return scope
    raise ValueError(f"{Terms._article(tag)} is not a parameter")


def _arrow(arguments: list[F.Thunk], node: Any, scope: Any) -> A.Closure:
    """An arrow's closure: called, its parameters bound to the arguments in the scope it was made in, its body's
    value. An async arrow's call, and a block body's, stay: a promise and statements are mbse-programs'."""
    arrow = _node(node)
    body, parameters = arrow.subterms["body"], arrow.lists["params"]
    asynchronous = bool(arrow.attributes.get("isAsync"))

    def call(values: list[Any]) -> Any:
        if asynchronous:
            raise F.NoRule(A.DIALECT, "async arrowfunctionexpression")
        if body is None:
            raise F.NoRule(A.DIALECT, "arrowfunctionexpression block")
        inner = scope
        for i, parameter in enumerate(parameters):
            if _tag(parameter) == T.RESTELEMENT:
                inner = _bind(_node(parameter).subterms["argument"], values[i:], inner)
            else:
                inner = _bind(parameter, values[i] if i < len(values) else A.UNDEFINED, inner)
        return _evaluate(body, inner)

    return A.Closure(call)


# --- Kinds ---


def _constant(node: Any) -> Any:
    """A constant's value: `null`, or a new regular expression of its source and flags, as written."""
    attributes = Terms.attributes_of(Terms.kind_of(node)[1])
    if attributes.get("singleton") == "null":
        return None
    text = Text.ToText(node)
    end = text.rindex("/")
    return A.RegExp(text[1:end], text[end + 1:])


def _template(node: T.Node, cooked: bool = True) -> list[Any]:
    """A template's strings, cooked (TV) or raw (TRV), its line terminators LF."""
    raws = [quasi.attributes.get("raw", "").replace("\r\n", "\n").replace("\r", "\n")
            for quasi in node.helpers["quasis"]]
    if not cooked:
        return raws
    return [A.UNDEFINED if text is None else text for text in map(A.cook, raws)]


def _templateliteral(arguments: list[F.Thunk], node: Any, scope: Any) -> str:
    strings = _template(_node(node))
    if A.UNDEFINED in strings:
        raise ValueError("a templateliteral's quasi has an invalid escape")
    written = strings[0]
    for argument, string in zip(arguments, strings[1:]):
        written = A.binary("+", A.binary("+", written, A.to_string(argument())), string)
    return written


def _taggedtemplate(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    tagged = _node(node)
    function = arguments[0]()
    quasi = tagged.helpers["quasi"]
    strings = A.TemplateStrings(_template(quasi), _template(quasi, cooked=False))
    values = [_evaluate(term, scope) for term in quasi.many]
    return _called(function, [strings, *values], tagged.subterms["tag"])


def _called(function: Any, values: list[Any], callee: Any) -> Any:
    if A.kind(function) != "function":
        raise TypeError(f"{Text.ToText(callee)} is not a function")
    return A.call(function, values)


def _call(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    called = _node(node)
    function = arguments[0]()
    if called.attributes.get("optional") and (function is None or function is A.UNDEFINED):
        raise _ShortCircuit()
    return _called(function, _spread(called.lists["arguments"], scope), called.subterms["callee"])


def _new(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    made = _node(node)
    constructor = arguments[0]()
    values = _spread(made.lists["arguments"], scope)
    made_value = A.construct(constructor, values) if A.kind(constructor) == "function" else None
    if made_value is None:
        raise TypeError(f"{Text.ToText(made.subterms['callee'])} is not a constructor")
    return made_value


def _member(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    member = _node(node)
    value = arguments[0]()
    if member.attributes.get("optional") and (value is None or value is A.UNDEFINED):
        raise _ShortCircuit()
    property_ = member.subterms["property"]
    if member.attributes.get("computed"):
        key = A.to_property_key(arguments[1]())
    elif _tag(property_) == T.IDENTIFIER:
        key = Terms.name_of(property_)
    else:  # `#x`, a class's
        raise F.NoRule(A.DIALECT, _tag(property_))
    return A.get(value, key)


def _chain(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    try:
        return arguments[0]()
    except _ShortCircuit:
        return A.UNDEFINED


def _array(arguments: list[F.Thunk], node: Any, scope: Any) -> list[Any]:
    values: list[Any] = []
    for element in Terms.arguments_of(Terms.kind_of(node)[1]):
        if _tag(element) == T.ELISION:
            values.append(A.HOLE)
        else:
            values += _spread((element,), scope)
    return values


def _object(arguments: list[F.Thunk], node: Any, scope: Any) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    for member in _node(node).lists["properties"]:
        inner = _node(member)
        if _tag(member) == T.SPREADELEMENT:
            properties.update(A.own_entries(_evaluate(inner.subterms["argument"], scope)))
            continue
        key = _key(inner, scope)
        if key == "__proto__" and not inner.attributes.get("computed") and not inner.attributes.get("shorthand"):
            raise F.NoRule(A.DIALECT, "objectexpression __proto__")  # an object's prototype, which no value models
        properties[key] = _evaluate(inner.subterms["value"], scope)
    return A.ordered(properties)


def _property(arguments: list[F.Thunk], node: Any, scope: Any) -> tuple[str, Any]:
    """A property alone, as an object's simplification meets it: its key and its value, no object of its own."""
    inner = _node(node)
    return _key(inner, scope), _evaluate(inner.subterms["value"], scope)


def _operand(name: str) -> F.Implementation:
    """A TypeScript assertion's value, its operand's: the type is erased."""
    return lambda arguments, node, scope: _evaluate(_node(node).subterms[name], scope)


def _logical(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        left = arguments[0]()
        if operator == "&&":
            return arguments[1]() if A.to_boolean(left) else left
        if operator == "||":
            return left if A.to_boolean(left) else arguments[1]()
        return arguments[1]() if left is None or left is A.UNDEFINED else left

    return apply


def _strict(function: Any) -> F.Implementation:
    return lambda arguments, node, scope: function(*(argument() for argument in arguments))


def _relation(operator: str) -> Any:
    def compare(left: Any, right: Any) -> bool:
        if operator == "<":
            return A.is_less_than(left, right) is True
        if operator == ">":
            return A.is_less_than(right, left, False) is True
        if operator == "<=":
            return A.is_less_than(right, left, False) is False
        return A.is_less_than(left, right) is False

    return compare


_BINARY: dict[str, Any] = {
    **{operator: (lambda operator: lambda x, y: A.binary(operator, x, y))(operator)
       for operator in ("+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "&", "|", "^")},
    **{operator: _relation(operator) for operator in ("<", ">", "<=", ">=")},
    "==": A.is_loosely_equal, "!=": lambda x, y: not A.is_loosely_equal(x, y),
    "===": A.is_strictly_equal, "!==": lambda x, y: not A.is_strictly_equal(x, y),
    "in": lambda x, y: A.has_property(y, x), "instanceof": A.instance_of,
}

_UNARY: dict[str, Any] = {
    **{operator: (lambda operator: lambda x: A.unary(operator, x))(operator) for operator in ("-", "+", "~", "!")},
    "typeof": A.type_of, "void": lambda x: A.UNDEFINED,
}

FOLDED = frozenset({
    T.LITERAL, T.CONSTANT, T.IDENTIFIER, T.THISEXPRESSION, T.TEMPLATELITERAL, T.TAGGEDTEMPLATEEXPRESSION,
    T.PARENTHESIZEDEXPRESSION, T.SEQUENCEEXPRESSION, T.ELISION, T.SPREADELEMENT, T.ARRAYEXPRESSION, T.PROPERTY,
    T.OBJECTEXPRESSION, T.MEMBEREXPRESSION, T.CHAINEXPRESSION, T.CALLEXPRESSION, T.NEWEXPRESSION,
    T.ARROWFUNCTIONEXPRESSION, T.UNARYEXPRESSION, T.BINARYEXPRESSION, T.LOGICALEXPRESSION, T.CONDITIONALEXPRESSION,
    T.TSASEXPRESSION, T.TSSATISFIESEXPRESSION, T.TSTYPEASSERTION, T.TSNONNULLEXPRESSION, T.TSINSTANTIATIONEXPRESSION})
"""The kinds its rules fold: a literal, and every kind of class (a); any other stays in the residual, named."""

_D = "d"
CATEGORIES: dict[str, dict[str, str]] = {
    "TypeScript5": {
        "tsemptybodyfunctionexpression": "b", "jsxelement": "b", "jsxfragment": "b", "jsxemptyexpression": "b",
        **dict.fromkeys(("functionexpression", "classexpression", "super", "privateidentifier", "metaproperty",
                         "awaitexpression", "yieldexpression", "importexpression", "assignmentexpression",
                         "updateexpression", "unaryexpression 'delete'", "async arrowfunctionexpression",
                         "arrowfunctionexpression block"), _D),
        **dict.fromkeys((*A.BUILTINS, "host value"), "c")},
    "TypeScript Types": {"*": "b"}, "TypeScript Patterns": {"*": "b"}, "TypeScript RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given): a
built-in method and a host value `c`, the language's runtime being a surrogate dialect's (mbse-basis
[CAP-301: simplification delegated to a surrogate dialect](mbse:mbse-basis/docs/capabilities/README.md#CAP-301))."""


class _Rules(F.Interpreter):
    """The framework's interpreter, with what it does not fold by a kind's role: a constant's value, which its spelling
    gives, and `this`, which the scope binds by that name."""

    def evaluate(self, node: Any, scope: Any) -> Any:
        tag = Terms.kind_of(node)[0]
        if tag in (T.CONSTANT, T.THISEXPRESSION) and self.dialect.owner(node) is self.dialect:
            return _constant(node) if tag == T.CONSTANT else scope.value("this")
        return super().evaluate(node, scope)


RULES = _Rules(T.DIALECT, {
    T.TEMPLATELITERAL: _templateliteral, T.TAGGEDTEMPLATEEXPRESSION: _taggedtemplate,
    T.PARENTHESIZEDEXPRESSION: lambda arguments, node, scope: arguments[0](),
    T.SEQUENCEEXPRESSION: lambda arguments, node, scope: [argument() for argument in arguments][-1],
    T.ELISION: lambda arguments, node, scope: A.HOLE,
    T.SPREADELEMENT: lambda arguments, node, scope: tuple(A.iterate(arguments[0]())),  # spread where it stands
    T.ARRAYEXPRESSION: _array, T.PROPERTY: _property, T.OBJECTEXPRESSION: _object,
    T.MEMBEREXPRESSION: _member, T.CHAINEXPRESSION: _chain, T.CALLEXPRESSION: _call, T.NEWEXPRESSION: _new,
    T.ARROWFUNCTIONEXPRESSION: _arrow,
    T.UNARYEXPRESSION: {operator: _strict(function) for operator, function in _UNARY.items()},
    T.BINARYEXPRESSION: {operator: _strict(function) for operator, function in _BINARY.items()},
    T.LOGICALEXPRESSION: {operator: _logical(operator) for operator in ("&&", "||", "??")},
    T.CONDITIONALEXPRESSION: lambda arguments, node, scope: (
        arguments[1]() if A.to_boolean(arguments[0]()) else arguments[2]()),
    T.TSASEXPRESSION: _operand("expression"), T.TSSATISFIESEXPRESSION: _operand("expression"),
    T.TSTYPEASSERTION: _operand("expression"), T.TSNONNULLEXPRESSION: _operand("expression"),
    T.TSINSTANTIATIONEXPRESSION: _operand("expression"),
}, scope=Scope, folded=FOLDED)
"""The folding rules of the TypeScript5 dialect."""


# --- Literals and displays ---


def _make(kind: str, attributes: Mapping[str, Any], *arguments: Any) -> Terms.Writer:
    return T.DIALECT.make(Terms.Form(kind, dict(attributes), arguments))


def _name(name: str) -> Terms.Writer:
    return _make(T.IDENTIFIER, {"name": name})


def _negated(written: Any) -> Terms.Writer:
    return _make(T.UNARYEXPRESSION, {"operator": "-"}, written)


def _literal(value: Any) -> Any:
    """The literal of a value: a boolean's, a string's, a non-negative number's or bigint's, a negative one's negated;
    NaN, Infinity and `undefined` by name; `null` and a regular expression a constant. None for any other value."""
    found = A.kind(value)
    if found in ("boolean", "string"):
        return T.DIALECT.spec(value)
    if found == "bigint":
        return T.DIALECT.spec(value) if value >= 0 else _negated(T.DIALECT.spec(-value))
    if found == "number":
        if math.isnan(value):
            return _name("NaN")
        magnitude = _name("Infinity") if math.isinf(value) else T.DIALECT.spec(abs(value))
        return _negated(magnitude) if math.copysign(1.0, value) < 0 else magnitude
    if found == "undefined":
        return _name("undefined")
    if found == "null":
        return _make(T.CONSTANT, {"singleton": "null"}, None)
    if found == "regexp":
        return _make(T.CONSTANT, {"pattern": value.source, **({"flags": value.flags} if value.flags else {})}, None)
    return None


_NAME = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")


def _written_key(key: str) -> Terms.Writer:
    """A property's key as written: an identifier where it is one, an array index a number, else a string."""
    if _NAME.fullmatch(key) and key != "__proto__":
        return _name(key)
    return T.DIALECT.spec(float(key) if A.is_array_index(key) else key)


def _display(value: Any) -> Any:
    """An array's or an object's display, of its items' literals and displays, a hole an elision; None where an item
    has neither, or for any other value (a tagged template's strings among them)."""
    found = A.kind(value)
    if found == "array" and not isinstance(value, A.TemplateStrings):
        items = [_make(T.ELISION, {}) if item is A.HOLE else _literal(item) or _display(item) for item in value]
        return None if None in items else _make(T.ARRAYEXPRESSION, {}, *items)
    if found == "object":
        written = [(key, _literal(item) or _display(item)) for key, item in A.ordered(value).items()]
        if any(item is None for _, item in written):
            return None
        return _make(T.OBJECTEXPRESSION, {}, *(_make(T.PROPERTY, {  # `__proto__` computed, a property, no prototype
            "propertyKind": "init", "computed": key == "__proto__", "method": False, "shorthand": False},
            _written_key(key), item) for key, item in written))
    return None


def _simplify(node: Any, results: list[F.Result]) -> F.Result | None:
    """What does not depend on a subterm that stays: `&&`, `||` and `??` by a known left operand, the conditional by a
    known test, and a sequence whose leading terms are known, by its last."""
    tag = Terms.kind_of(node)[0]
    if tag == T.LOGICALEXPRESSION and results[0].known:
        operator, left = Terms.attributes_of(Terms.kind_of(node)[1])["operator"], results[0].value
        if (operator == "&&" and A.to_boolean(left)) or (operator == "||" and not A.to_boolean(left)) or (
                operator == "??" and (left is None or left is A.UNDEFINED)):
            return results[1]
    if tag == T.CONDITIONALEXPRESSION and results[0].known:
        return results[1] if A.to_boolean(results[0].value) else results[2]
    if tag == T.SEQUENCEEXPRESSION and all(result.known for result in results[:-1]):
        return results[-1]
    return None


SIMPLIFIER = F.Simplifier(RULES, literal=_literal, categories=CATEGORIES, display=_display, simplify=_simplify)
"""The simplifier of the TypeScript5 dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a TypeScript5 term (or anything `Terms.term` reads one from) in `scope`, or with the
    variables in a mapping bound."""
    return SIMPLIFIER(expression, scope)
