"""Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.

An expression refers to names: its references. A binding (a let, or any binder: `Terms.is_binder`) binds a name
within its body, an import binds the names it declares (its kind's `names`) within its body, a kind with `scopes` binds
the names it gives each argument (a binder's, a comprehension's targets, a lambda's parameters), and some names are ambient, bound without a declaration (Python's
builtins). `free(term, dialect)` is the set of names an expression needs from outside: its lexical references that
nothing within it binds. `imports(term, dialect)` lists the imports it declares: what it needs its scope to provide.

A `Scope` is where references are resolved at simplification, in the dialect's own way: `lookup(reference)` gives a
reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
packages or workbooks derive their own. A simplifier given a mapping instead of a scope makes its dialect's scope from
it, so `Simplifiers.OfAny(expression, {'person': value})` binds `person`. A scope decides what an import may bring in:
imports resolve only what the caller's scope allows, never by loading code.

A scope resolves parameter references apart from its variables, so that a parameter and a variable of one name never
collide (mbse-basis [CAP-296: simplification over literals, variables and
parameters](mbse:mbse-basis/docs/capabilities/CAP-296.md)). `within(context)` gives a scope whose parameters are those of
a context, a `Contexts.OfContext` of mbse-schemas (mbse-basis [CAP-319: contexts as schema
data](mbse:mbse-basis/docs/capabilities/README.md#CAP-319)), each assigned a value or bound to an object; a scope within a
context within another is within a copy of the outer context, the inner one's parameters replacing the outer one's of
their names, as `Contexts.within` copies a sub-context. A scope's `lookup` gives a parameter reference to `value`, as it
gives a variable's name (`Terms.name_of`), so that each dialect's scope lifts a parameter's value as it lifts a variable's.
`given(scope, name)` tells what a scope's context gives a parameter, and `context_scope(context, make)` makes a scope of a
context's variables and parameters.

What a scope does not bind is not an error: a reference it cannot resolve (an unbound name, a function or an import it
does not provide) raises `Unbound`, which the simplifier catches, leaving the reference in the residual (see
`Simplifiers`); a name bound to `UNKNOWN` is unbound too, as a binding hides a name its simplifier does not know the
value of. `Unbound` never leaves a simplifier. `scopes(node, dialect)` gives the names a term binds for each of its
arguments, which `free` and the simplifier read alike.
"""

from __future__ import annotations

from collections import ChainMap
from collections.abc import Mapping
from typing import Any, Protocol, runtime_checkable

from . import Objects, Terms

__all__ = ["Scope", "Variables", "Unbound", "UNKNOWN", "free", "imports", "option", "scopes", "given", "is_context",
           "context_scope", "held"]

CONTEXT = "Contexts.OfContext"


class Unbound(Exception):
    """Raised by a scope for a reference it does not resolve: a name it does not bind (or binds to `UNKNOWN`), a
    function or an import it does not provide. The simplifier catches it, leaving the reference in the residual."""


UNKNOWN: Any = object()
"""The value a scope binds a name to whose value is not known: looking it up raises `Unbound`."""


@runtime_checkable
class Scope(Protocol):
    """Where references are resolved."""

    def lookup(self, reference: Any) -> Any:
        """The value of a reference."""
        ...

    def bind(self, name: str, value: Any) -> Scope:
        """This scope, with `name` bound to `value`."""
        ...

    def enter(self, declaration: Any) -> Scope:
        """This scope, with what an import declares."""
        ...


class Variables:
    """A scope of named values: a reference's value is its name's innermost binding, then the variable of that name;
    a reference to neither, or to a name bound to `UNKNOWN`, raises `Unbound`. It has no imports: entering one raises
    `Unbound` too, the import left in the residual. Its `options` are the parameters of simplification that its caller
    chooses up front (mbse-basis [CAP-305: simplification's options, chosen up
    front](mbse:mbse-basis/docs/capabilities/CAP-305.md)), by name; `option(name, default)` reads one."""

    def __init__(self, variables: Mapping[str, Any] | None = None, options: Mapping[str, Any] | None = None):
        self.values: ChainMap[str, Any] = ChainMap({}, dict(variables or {}))
        self.options: dict[str, Any] = dict(options or {})
        self.parameters: dict[str, tuple[str, Any]] = {}  # what its context gives each parameter, read once

    def option(self, name: str, default: Any) -> Any:
        """The value of the option `name`, or `default` where the scope does not set it."""
        return self.options.get(name, default)

    def lookup(self, reference: Any) -> Any:
        return self.value(Terms.name_of(reference))

    def value(self, name: Any) -> Any:
        """The value bound to `name`; raises `Unbound` when there is none, or it is `UNKNOWN`. Given a parameter
        reference (`Terms.is_parameter`), the value its context assigns its parameter, a value to compute with; raises
        `Unbound` where it assigns none, or assigns a term (which a reader puts in the reference's place instead,
        `Terms.substituting`), or binds the parameter to an object, which no term's place takes."""
        if Terms.is_parameter(name):
            parameter = Terms.parameter_name(name)
            found = self.parameters.get(parameter)
            if found is None or found[0] != "value" or Terms.is_term(found[1]):
                raise Unbound(parameter)
            return found[1]
        value = self.values.get(name, UNKNOWN)
        if value is UNKNOWN:
            raise Unbound(name)
        return value

    def bind(self, name: str, value: Any) -> Variables:
        inner = self._copy()
        inner.values = self.values.new_child({name: value})
        return inner

    def enter(self, declaration: Any) -> Variables:
        raise Unbound(Terms.kind_of(declaration)[0])

    def within(self, context: Any) -> Variables:
        """This scope within a context, a `Contexts.OfContext`: its parameters, each the value assigned to it or the
        object bound to it, replacing this scope's of their names. Its variables and options are this scope's."""
        inner = self._copy()
        inner.parameters = {**self.parameters, **_parameters(context)}
        return inner

    def _copy(self) -> Any:
        inner = object.__new__(type(self))
        inner.__dict__.update(self.__dict__)
        return inner


def is_context(value: Any) -> bool:
    """Whether `value` is a context, a value of mbse-schemas' `Contexts.OfContext`."""
    schema = getattr(value, "as_schema", None)
    return callable(schema) and not isinstance(value, type) and getattr(schema(), "name", None) == CONTEXT


def _entries(context: Any, container: str) -> dict[str, Any]:
    """The entries of a context's `variables` or `parameters`, by name, each as its visitor."""
    pairs: list[tuple[Any, Any]] = []
    getattr(context, container).as_value(lambda a: a.as_container(lambda c: c.as_entries(pairs.extend)))
    found: dict[str, Any] = {}
    for name, element in pairs:
        element.as_object(lambda entry, name=name: found.setdefault(name, entry))
    return found


def _reference(prop: Any) -> Any:
    """The reference an entry's property holds (a `References.OfValue` or `References.OfObject`), or None."""
    found: list[Any] = []
    prop.as_value(lambda a: a.as_object(lambda o: found.extend([o] if o.as_schema() is not None else []) or o))
    return found[0] if found else None


def _assigned(entry: Any) -> Any:
    """The value an entry's `References.OfValue` holds, as evaluators read it (`Objects.held`); None where it holds none."""
    held = _reference(entry.value)
    found: list[Any] = []
    if held is not None:
        held.value.as_value(lambda a: found.append(Objects.held(a)) or a)
    return found[0] if found else None


def _parameters(context: Any) -> dict[str, tuple[str, Any]]:
    """What a context gives each parameter it names: `("object", reference)`, where it binds the parameter to an
    object, else `("value", value)`, where it assigns it one; a parameter it names but neither assigns nor binds is
    left out."""
    if not is_context(context):
        raise TypeError(f"a scope is within a context ({CONTEXT}), not {context!r}")
    found: dict[str, tuple[str, Any]] = {}
    for name, entry in _entries(context, "parameters").items():
        bound, value = _reference(entry.object), _assigned(entry)
        if bound is not None:
            found[name] = ("object", bound)
        elif value is not None:
            found[name] = ("value", value)
    return found


def given(scope: Any, name: str) -> tuple[str, Any] | None:
    """What a scope's context gives the parameter `name`: `("value", value)`, `("object", reference)`, or None where it
    neither assigns nor binds it, or the scope has no context."""
    return getattr(scope, "parameters", {}).get(name)


def held(scope: Any, parameter: Any) -> Any:
    """What a parameter reference standing in a place of any value (a literal's `value`) holds in a scope: the value its
    context assigns it, or the reference (`References.OfObject`) of the object its context binds it to, as it is, the
    object neither resolved nor read; raises `Unbound` where its context does neither."""
    name = Terms.parameter_name(parameter)
    found = given(scope, name)
    if found is None:
        raise Unbound(name)
    return found[1]


def context_scope(context: Any, make: Any) -> Any:
    """The scope of a context: the scope that `make(variables)` makes of the values its variables are assigned, within
    the context, so that its parameters are the context's."""
    variables = {name: _assigned(entry) for name, entry in _entries(context, "variables").items()}
    return make({name: value for name, value in variables.items() if value is not None}).within(context)


def option(scope: Any, name: str, default: Any) -> Any:
    """The value of the option `name` that `scope` sets, or `default` where it sets none or has no options."""
    read = getattr(scope, "option", None)
    return default if read is None else read(name, default)


def scopes(node: Any, dialect: Terms.Dialect) -> list[frozenset[str]]:
    """The names a term binds for each of its arguments (`Terms.arguments_of`), its kind read as `dialect` reads it: a
    kind's `scopes` (a comprehension's targets, a lambda's parameters); a let's or a quantifier's name, after its first
    argument; an import's names, for every argument; none, for any other."""
    _, record, kind = dialect.kind(node)
    arguments = Terms.arguments_of(record)
    if kind.scopes is not None:
        return [frozenset(names) for names in kind.scopes(record)]
    if kind.role == Terms.QUANTIFIER or Terms._lets(kind, record):
        return [frozenset(), *[frozenset({Terms.name_of(node)})] * (len(arguments) - 1)]
    if kind.role == Terms.IMPORT:
        return [frozenset(kind.names(Terms.attributes_of(record)) if kind.names is not None else ())] * len(arguments)
    return [frozenset()] * len(arguments)


def free(term: Any, dialect: Terms.Dialect) -> set[str]:
    """The names a term needs from its scope: its lexical references that no binding or import within it binds, and that
    are not ambient, its kinds read as `dialect` reads them."""
    found: set[str] = set()

    def visit(node: Any, bound: frozenset[str]) -> None:
        tag, record, kind = dialect.kind(node)
        name = Terms.name_of(node)
        if kind.role == Terms.REFERENCE:
            if kind.lexical and name is not None and name not in bound and name not in kind.ambient:
                found.add(name)
            if not isinstance(Terms.attributes_of(record).get("name"), Terms.Part):
                return  # a name node's terms (a template's arguments) are its arguments, as an application's
        for argument, names in zip(Terms.arguments_of(record), scopes(node, dialect)):
            if argument is not None:
                visit(argument, bound | names)

    visit(Terms.term(term), frozenset())
    return found


def imports(term: Any, dialect: Terms.Dialect) -> list[Any]:
    """The imports a term declares, in the order `Terms.walk` visits them."""
    return [node for node in Terms.walk(term) if dialect.kind(node)[2].role == Terms.IMPORT]
