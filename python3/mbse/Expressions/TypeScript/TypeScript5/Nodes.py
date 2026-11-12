"""How the TypeScript family reads a node, shared by its three dialects, `TypeScript5`, `TypeScript Types` and
`TypeScript Patterns` (the dialects proposal, Retrofit's design): a node's own checks, as mbse-programs has them, and its
helpers' in turn; the names a pattern binds; and the names each of a kind's arguments has bound. It imports only the
framework, so that the family's dialects, which read each other's terms, each import it without a cycle."""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from typing import Any

from mbse.Expressions.Framework import Terms as F

__all__ = ["QUOTES", "SIGNATURES", "Node", "nodes", "bound_names", "check", "bound", "scopes"]

IDENTIFIER, PRIVATEIDENTIFIER, LITERAL, PROPERTY, MEMBEREXPRESSION = (
    "identifier", "privateidentifier", "literal", "property", "memberexpression")
TEMPLATELITERAL, SEQUENCEEXPRESSION = "templateliteral", "sequenceexpression"
FUNCTIONS = ("arrowfunctionexpression", "functionexpression", "tsemptybodyfunctionexpression")
"""`TypeScript5`'s functions, which bind their parameters within them."""

FUNCTION_TYPES = ("tsfunctiontype", "tsconstructortype")
"""`TypeScript Types`' function types, which bind their type parameters and parameters within them."""

SIGNATURES = ("tsmethodsignature", "tscallsignaturedeclaration", "tsconstructsignaturedeclaration", "tsindexsignature")
"""An object type's signatures, helpers that bind their parameters within them, through the kind that holds them."""

QUOTES = ("'", '"')
"""A string's quotes, as TypeScript writes them."""

Node = F.Node
"""A term or a helper, its helpers nested (`Terms.Node`)."""


def nodes(value: Any) -> tuple[Any, ...]:
    """A helper property's nodes, or a container's: none where it is absent, one, or each of many."""
    if value is None:
        return ()
    return value if isinstance(value, tuple) else (value,)


def node_of(value: Any) -> Node:
    """A term's `Node` (`Terms.node`), or a `Node` as it is."""
    return value if isinstance(value, Node) else F.node(*F.kind_of(value))


# --- What a pattern binds ---


def bound_names(node: Any) -> frozenset[str]:
    """The names a pattern binds, a term's or a `Node`'s: an identifier's, and those within an array, an object, a
    default, a rest or a parameter property; a member, or any other target, binds none."""
    if node is None:
        return frozenset()
    node = node_of(node)
    if node.kind == IDENTIFIER:
        return frozenset({node.attributes["name"]}) if "name" in node.attributes else frozenset()
    if node.kind == PROPERTY:
        return bound_names(node.subterms.get("value"))
    found: frozenset[str] = frozenset()
    for inner in (*node.lists.get("elements", ()), *node.lists.get("properties", ()),
                  *(node.subterms.get(name) for name in ("left", "argument", "parameter"))):
        found |= bound_names(inner)
    return found


def _parameters(node: Node) -> frozenset[str]:
    """The names a function's, a function type's or a signature's parameters bind."""
    found: frozenset[str] = frozenset()
    for parameter in (*node.lists.get("params", ()), *node.lists.get("parameters", ())):
        found |= bound_names(parameter)
    return found


def _type_parameters(node: Node) -> frozenset[str]:
    """The names a node's type parameters declare (each a `TSTypeParameter`'s `name`)."""
    declaration = node.helpers.get("typeParameters")
    if declaration is None:
        return frozenset()
    return frozenset(parameter.helpers["name"].attributes["name"] for parameter in nodes(declaration.helpers.get("params"))
                     if "name" in parameter.helpers and "name" in parameter.helpers["name"].attributes)


def _infers(value: Any) -> frozenset[str]:
    """The names the `infer` types within a conditional type's `extendsType` declare, but those of a conditional type
    within it, which binds its own."""
    if value is None:
        return frozenset()
    node = node_of(value)
    if node.kind == "tsconditionaltype":
        return frozenset()
    if node.kind == "tsinfertype":
        name = node.helpers["typeParameter"].helpers.get("name") if "typeParameter" in node.helpers else None
        return frozenset({name.attributes["name"]}) if name is not None and "name" in name.attributes else frozenset()
    found: frozenset[str] = frozenset()
    for inner in (*node.subterms.values(), *node.many):
        found |= _infers(inner)
    return found


# --- Checks ---


def _identifier_problems(what: str, value: Any) -> list[str]:
    """A name, if a non-empty str, is an identifier (`$` among its letters), as mbse-programs checks it."""
    if type(value) is str and value and not value.replace("$", "_").isidentifier():
        return [f"{F._article(what)}'s name cannot be {value!r}"]
    return []


def _literal_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A literal's spelling: a string's quote, a number's base."""
    quote, base = attributes.get("quote"), attributes.get("base")
    problems = [] if quote is None or quote in QUOTES else [f"a literal's quote cannot be {quote!r}"]
    return problems + ([] if base is None or base in (2, 8, 10, 16) else [f"a literal's base cannot be {base!r}"])


def _needs(node: Node, many: Iterable[Any], least: int, what: str) -> list[str]:
    return [] if len(tuple(many)) >= least else [f"{F._article(node.kind)} needs {what}"]


def _node_problems(node: Node) -> list[str]:
    """A node's own checks, as mbse-programs has them: names, quasis, unions and lists that need members."""
    kind, attributes = node.kind, node.attributes
    if kind in F.INVALID_KINDS:  # invalid syntax where a helper holds it
        return F.invalid_problems(kind, attributes)
    if kind in (IDENTIFIER, PRIVATEIDENTIFIER):
        return _identifier_problems(kind, attributes.get("name"))
    if kind == LITERAL:
        return _literal_problems(attributes)
    if kind == TEMPLATELITERAL or kind == "tstemplateliteraltype":
        quasis = len(nodes(node.helpers.get("quasis")))
        what = "expressions" if kind == TEMPLATELITERAL else "types"
        return [] if quasis == len(node.many) + 1 else [f"{F._article(kind)} needs one more quasi than {what}"]
    if kind == SEQUENCEEXPRESSION:
        return _needs(node, node.many, 2, "two expressions")
    if kind in ("tsuniontype", "tsintersectiontype"):
        return _needs(node, node.many, 2, "two types")
    if kind == "tstypeparameterdeclaration":
        return _needs(node, nodes(node.helpers.get("params")), 1, "a type parameter")
    return []


def _problems(node: Node, deep: bool) -> list[str]:
    """A node's checks, and its helpers' in turn: what the framework's validation does not read within a helper; with
    `deep`, the terms its helpers hold too, which validation does not reach within a reference (an identifier's type
    annotation)."""
    problems = _node_problems(node)
    for value in node.helpers.values():
        for inner in nodes(value):
            problems += _problems(inner, deep)
            if deep:
                for held in (*inner.subterms.values(), *inner.many):
                    problems += [] if held is None else _problems(node_of(held), deep)
    return problems


def check(tag: str, more: Callable[[Mapping[str, Any]], list[str]] | None = None) -> Callable[[Any], list[str]]:
    """A kind's check: its node's and its helpers' (`_problems`), and `more`, of its attributes, where given; an
    identifier's reaches the terms its helpers hold, a reference's arguments, which validation does not read."""
    def kind_check(record: Any) -> list[str]:
        node = F.node(tag, record)
        return _problems(node, tag == IDENTIFIER) + (more(node.attributes) if more is not None else [])

    return kind_check


# --- What each kind binds ---


def bound(node: Node, inner: frozenset[str]) -> list[frozenset[str]]:
    """The names each of a node's arguments has bound, in order: a member's property and a key, where not computed, its
    own name, since it names what it reads rather than refers to a binding; then its helpers' arguments in turn, a
    signature's parameters bound within it."""
    found = []
    for name, argument in node.subterms.items():
        named = (name == "property" and node.kind == MEMBEREXPRESSION) or (
            name == "key" and node.kind in (PROPERTY, "tspropertysignature", "tsmethodsignature"))
        if named and not node.attributes.get("computed") and argument is not None and F.kind_of(argument)[0] == IDENTIFIER:
            found.append(inner | {F.name_of(argument)})
        else:
            found.append(inner)
    found += [inner] * len(node.many)
    for value in node.helpers.values():
        for helper in nodes(value):
            found += bound(helper, inner | _parameters(helper) if helper.kind in SIGNATURES else inner)
    return found


def scopes(tag: str) -> Callable[[Any], list[frozenset[str]]]:
    """What each argument of a kind has bound (`Kind.scopes`): a function's or an arrow's parameters within it (its
    parameters' defaults among it); a function type's type parameters and parameters within it; a mapped type's `key`
    in its `nameType` and its `body`; a conditional type's `infer` declarations in its `trueType`; and names that are
    not references (`bound`)."""
    def kind_scopes(record: Any) -> list[frozenset[str]]:
        node = F.node(tag, record)
        inner: frozenset[str] = frozenset()
        if tag in FUNCTIONS:
            inner = _parameters(node)
        elif tag in FUNCTION_TYPES:
            inner = _parameters(node) | _type_parameters(node)
        found = bound(node, inner)
        names: dict[str, frozenset[str]] = {}
        if tag == "tsmappedtype" and "key" in node.helpers and "name" in node.helpers["key"].attributes:
            key = frozenset({node.helpers["key"].attributes["name"]})
            names = {"body": key, "nameType": key}
        elif tag == "tsconditionaltype":
            names = {"trueType": _infers(node.subterms.get("extendsType"))}
        for i, subterm in enumerate(node.subterms):
            found[i] |= names.get(subterm, frozenset())
        return found

    return kind_scopes
