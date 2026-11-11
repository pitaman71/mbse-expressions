"""Text of the TypeScript Types dialect: how its kinds and helpers are written, as mbse-programs' printer writes types
(`mbse:mbse-programs/python3/mbse/Programs/TypeScript/_Printer.py`), which the family's printer
(`TypeScript5.Text.ToText`) dispatches to: `TEXTS`, each kind's or helper's writer, given the printer and its
`Terms.Node`; and `PRECEDENCE`, a type's precedence by its kind, loosest first (`FUNCTION` to `PRIMARY`), a type
parenthesized where it binds less than its place needs (a function, conditional or union type as an operand). An object
type is written on one line, or with comments on its members' lines. `ToText` writes a term of the family, as
`TypeScript5.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..TypeScript5 import Text as X
from ..TypeScript5.Text import ToText

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "FUNCTION", "CONDITIONAL", "UNION", "INTERSECTION", "OPERATOR", "POSTFIX",
           "PRIMARY"]

FUNCTION, CONDITIONAL, UNION, INTERSECTION, OPERATOR, POSTFIX, PRIMARY = range(7)
"""Types' precedence, loosest first."""

PRECEDENCE = {
    "tsfunctiontype": FUNCTION, "tsconstructortype": FUNCTION, "tsconditionaltype": CONDITIONAL,
    "tsuniontype": UNION, "tsintersectiontype": INTERSECTION, "tstypeoperator": OPERATOR,
    "tsinfertype": OPERATOR, "tsarraytype": POSTFIX, "tsindexedaccesstype": POSTFIX,
    "tstypepredicate": FUNCTION,
}
"""A type's precedence, by its kind, where it is not a primary's."""

_KEYWORDS = {
    "tsanykeyword": "any", "tsunknownkeyword": "unknown", "tsnumberkeyword": "number", "tsbigintkeyword": "bigint",
    "tsbooleankeyword": "boolean", "tsstringkeyword": "string", "tssymbolkeyword": "symbol",
    "tsobjectkeyword": "object", "tsneverkeyword": "never", "tsvoidkeyword": "void",
    "tsundefinedkeyword": "undefined", "tsnullkeyword": "null", "tsintrinsickeyword": "intrinsic",
    "tsthistype": "this",
}
"""The kinds written as one word."""


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _qualifiedname(p: X.Printer, node: F.Node) -> str:
    return f"{p.text(node.slots['left'])}.{p.text(node.helpers['right'])}"


def _typereference(p: X.Printer, node: F.Node) -> str:
    return p.text(node.slots["typeName"]) + p.type_arguments(node)


def _parenthesizedtype(p: X.Printer, node: F.Node) -> str:
    return f"({p.t(node.slots['typeAnnotation'], FUNCTION)})"


def _literaltype(p: X.Printer, node: F.Node) -> str:
    return p.text(node.slots["literal"])


def _templateliteraltype(p: X.Printer, node: F.Node) -> str:
    quasis = _nodes(node.helpers.get("quasis"))
    written = [quasis[0].attributes.get("raw", "")] if quasis else []
    for held, quasi in zip(node.lists.get("types", ()), quasis[1:]):
        written.append("${" + p.t(held, FUNCTION) + "}" + quasi.attributes.get("raw", ""))
    return "`" + "".join(written) + "`"


def _arraytype(p: X.Printer, node: F.Node) -> str:
    return p.t(node.slots["elementType"], POSTFIX) + "[]"


def _tupletype(p: X.Printer, node: F.Node) -> str:
    return "[" + ", ".join(p.t(held, FUNCTION) for held in node.lists.get("elementTypes", ())) + "]"


def _namedtuplemember(p: X.Printer, node: F.Node) -> str:
    optional = "?" if node.attributes.get("optional") else ""
    return f"{p.text(node.helpers['label'])}{optional}: {p.t(node.slots['elementType'], FUNCTION)}"


def _optionaltype(p: X.Printer, node: F.Node) -> str:
    return p.t(node.slots["typeAnnotation"], POSTFIX) + "?"


def _resttype(p: X.Printer, node: F.Node) -> str:
    return "..." + p.t(node.slots["typeAnnotation"], FUNCTION)


def _uniontype(p: X.Printer, node: F.Node) -> str:
    operator, level = (" | ", INTERSECTION) if node.kind == "tsuniontype" else (" & ", OPERATOR)
    return operator.join(p.t(held, level) for held in node.lists.get("types", ()))


def _functiontype(p: X.Printer, node: F.Node) -> str:
    return p.signature(node, arrow=True)


def _constructortype(p: X.Printer, node: F.Node) -> str:
    return ("abstract " if node.attributes.get("abstract") else "") + "new " + p.signature(node, arrow=True)


def _member(p: X.Printer, node: F.Node) -> str:
    """An object type's member on its line: a signature with its `;`, a comment as written."""
    if node.kind == "comment":
        return f"/*{node.attributes.get('text', '')}*/" if node.attributes.get("block") else f"//{node.attributes.get('text', '')}"
    return p.text(node) + ";"


def _typeliteral(p: X.Printer, node: F.Node) -> str:
    """`{ a: A; b(): B }` on one line, or with comments its members' lines, a trailing comment on its member's."""
    members = _nodes(node.helpers.get("members"))
    if not members:
        return "{}"
    if all(member.kind != "comment" for member in members):
        return "{ " + " ".join(_member(p, member) for member in members) + " }"
    lines: list[str] = []
    for member in members:
        if member.kind == "comment" and member.attributes.get("trailing") and lines:
            lines[-1] += " " + _member(p, member)
        else:
            lines.append("    " + _member(p, member))
    return "{\n" + "\n".join(lines) + "\n}"


def _propertysignature(p: X.Printer, node: F.Node) -> str:
    attributes = node.attributes
    text = ("readonly " if attributes.get("readonly") else "") + p.key(node.slots["key"], attributes.get("computed", False))
    return text + ("?" if attributes.get("optional") else "") + p.annotation(node)


def _methodsignature(p: X.Printer, node: F.Node) -> str:
    attributes = node.attributes
    prefix = (attributes["methodKind"] + " ") if attributes.get("methodKind") in ("get", "set") else ""
    key = p.key(node.slots["key"], attributes.get("computed", False))
    return f"{prefix}{key}{'?' if attributes.get('optional') else ''}{p.signature(node)}"


def _indexsignature(p: X.Printer, node: F.Node) -> str:
    parameters = ", ".join(p.text(parameter) for parameter in node.lists.get("parameters", ()))
    return f"{p.modifiers(node)}[{parameters}]{p.annotation(node)}"


def _mappedtype(p: X.Printer, node: F.Node) -> str:
    attributes, slots = node.attributes, node.slots
    readonly = attributes["readonly"] + " " if "readonly" in attributes else ""
    name = f" as {p.t(slots['nameType'], FUNCTION)}" if slots["nameType"] is not None else ""
    value = f": {p.t(slots['body'], FUNCTION)}" if slots["body"] is not None else ""
    constraint = p.t(slots["value"], FUNCTION)
    return f"{{ {readonly}[{p.text(node.helpers['key'])} in {constraint}{name}]{attributes.get('optional', '')}{value} }}"


def _indexedaccesstype(p: X.Printer, node: F.Node) -> str:
    return f"{p.t(node.slots['objectType'], POSTFIX)}[{p.t(node.slots['indexType'], FUNCTION)}]"


def _typeoperator(p: X.Printer, node: F.Node) -> str:
    operator = node.attributes["operator"]
    if node.slots["typeAnnotation"] is None:
        return operator
    return f"{operator} {p.t(node.slots['typeAnnotation'], OPERATOR)}"


def _typequery(p: X.Printer, node: F.Node) -> str:
    return "typeof " + p.text(node.slots["exprName"]) + p.type_arguments(node)


def _importtype(p: X.Printer, node: F.Node) -> str:
    slots = node.slots
    options = ", " + p.text(slots["options"]) if slots["options"] is not None else ""
    text = f"import({p.text(slots['source'])}{options})"
    if slots["qualifier"] is not None:
        text += "." + p.text(slots["qualifier"])
    return text + p.type_arguments(node)


def _conditionaltype(p: X.Printer, node: F.Node) -> str:
    slots = node.slots
    extends = p.node(slots["extendsType"])  # a function type needs no parentheses, unless it returns a conditional type
    returned = extends.helpers.get("returnType") if extends.kind in ("tsfunctiontype", "tsconstructortype") else None
    if extends.kind == "tsconditionaltype" or (
            returned is not None and p.node(returned.slots["typeAnnotation"]).kind == "tsconditionaltype"):
        extended = f"({p.text(extends)})"
    else:
        extended = p.t(extends, FUNCTION)
    return (f"{p.t(slots['checkType'], UNION)} extends {extended} ? "
            f"{p.t(slots['trueType'], FUNCTION)} : {p.t(slots['falseType'], FUNCTION)}")


def _infertype(p: X.Printer, node: F.Node) -> str:
    return "infer " + p.text(node.helpers["typeParameter"])


def _typepredicate(p: X.Printer, node: F.Node) -> str:
    text = ("asserts " if node.attributes.get("asserts") else "") + p.text(node.slots["parameterName"])
    if "typeAnnotation" in node.helpers:
        text += f" is {p.t(node.helpers['typeAnnotation'].slots['typeAnnotation'], FUNCTION)}"
    return text


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    **{tag: lambda p, n, word=word: word for tag, word in _KEYWORDS.items()},
    "tsqualifiedname": _qualifiedname, "tstypereference": _typereference, "tsparenthesizedtype": _parenthesizedtype,
    "tsliteraltype": _literaltype, "tstemplateliteraltype": _templateliteraltype, "tsarraytype": _arraytype,
    "tstupletype": _tupletype, "tsnamedtuplemember": _namedtuplemember, "tsoptionaltype": _optionaltype,
    "tsresttype": _resttype, "tsuniontype": _uniontype, "tsintersectiontype": _uniontype,
    "tsfunctiontype": _functiontype, "tsconstructortype": _constructortype, "tstypeliteral": _typeliteral,
    "tsmappedtype": _mappedtype, "tsindexedaccesstype": _indexedaccesstype, "tstypeoperator": _typeoperator,
    "tstypequery": _typequery, "tsimporttype": _importtype, "tsconditionaltype": _conditionaltype,
    "tsinfertype": _infertype, "tstypepredicate": _typepredicate,
    # its helpers: an object type's signatures
    "tspropertysignature": _propertysignature, "tsmethodsignature": _methodsignature,
    "tscallsignaturedeclaration": lambda p, n: p.signature(n),
    "tsconstructsignaturedeclaration": lambda p, n: "new " + p.signature(n),
    "tsindexsignature": _indexsignature,
}
"""How each of its kinds and helpers is written, by its tag."""
