"""Text of the C dialect: `ToText(expression)` is a term of C (or anything `Terms.term` reads one from) as C source, as
mbse-programs' printer writes it (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/_Printer.py`): every kind of the C
family, its type names and the other helpers it holds, parentheses written in the term printed, and those C's
precedence needs added (and around a template argument that holds `>`). `text(expression, dialect)` writes a term of
any dialect of the C family, `Cpp`'s, `C Types`', `Cpp Types`' and `C Preprocessor`'s too, with the same precedence,
C++'s being C's and its own: the family's one printer, which its dialects' `Text` modules write through.

A literal is written in its spelling where it has one (`text`), else in its value's default spelling, with what it
encodes: its prefix, its base and its suffix (`5u`, `0x1fu`, `1.5f`, `u8"s"`), a character as its code's character
(`'a'`), a string with C's escapes, a raw string between its delimiter's parentheses, and a float that has no literal as
`INFINITY` or `NAN`. A body of statements or declarations, not part of the term (a lambda's, a statement expression's,
a struct's), is written `{}`, where mbse-programs writes what it relates. An enumeration's body, its data, is written as
mbse-programs writes it, its enumerators, directives and comments each on lines of its own, one level deeper, an
enumerator followed by a comma but the last, unless it has a trailing comma, and a trailing comment ending the line
before it. A directive starts its line, a conditional one each of its branches (`#if`, `#ifdef`, `#elif`, `#elifdef`,
`#else`) on a line of its own, its items on the lines between, and `#endif`. Invalid syntax is written as written
(`Terms.invalid_text`), refused by the name of the dialect that owns it (`Terms.Dialect.owner`). Reading C (`FromText`) is mbse-programs' (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The model and printers here, the parsers mbse-programs'")."""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Expressions as E

__all__ = ["ToText", "text"]

COMMA, ASSIGNMENT, CONDITIONAL, UNARY, POSTFIX, PRIMARY = 0, 1, 2, 15, 16, 17
"""Precedence, loosest first, as mbse-programs' printer numbers it: an operand is parenthesized when its precedence is
below what its place needs; the binary operators' are between, by `_BINARY`."""

_BINARY = {",": COMMA, "||": 3, "&&": 4, "|": 5, "^": 6, "&": 7, "==": 8, "!=": 8, "<": 9, ">": 9, "<=": 9, ">=": 9,
           "<=>": 10, "<<": 11, ">>": 11, "+": 12, "-": 12, "*": 13, "/": 13, "%": 13, ".*": 14, "->*": 14}

_PRECEDENCE = {
    "assignmentexpression": ASSIGNMENT, "throwexpression": ASSIGNMENT, "yieldexpression": ASSIGNMENT,
    "conditionalexpression": CONDITIONAL, "unaryexpression": UNARY, "castexpression": UNARY,
    "sizeofexpression": UNARY, "alignofexpression": UNARY, "newexpression": UNARY, "deleteexpression": UNARY,
    "awaitexpression": UNARY, "noexceptexpression": UNARY, "extensionexpression": UNARY,
    "sizeofpackexpression": UNARY, "callexpression": POSTFIX, "subscriptexpression": POSTFIX,
    "memberexpression": POSTFIX, "postfixexpression": POSTFIX, "namedcastexpression": POSTFIX,
    "typeidexpression": POSTFIX, "functionalcastexpression": POSTFIX, "compoundliteralexpression": POSTFIX,
    "packexpansion": POSTFIX,
}

_ESCAPES = {"\\": "\\\\", "\n": "\\n", "\t": "\\t", "\r": "\\r", "\0": "\\0"}

_MACROS = {"nan": "NAN", "inf": "INFINITY", "-inf": "-INFINITY"}

_PREFIXES = {16: "0x", 8: "0", 2: "0b"}

_INDENT = "    "
"""A level of indentation, as mbse-programs writes an enumeration's items."""


def _quoted(value: str, quote: str) -> str:
    """Characters between quotes, with C's escapes: a backslash, the quote, a newline, a tab, a carriage return, a
    null."""
    return quote + "".join(_ESCAPES.get(c, "\\" + c if c == quote else c) for c in value) + quote


def _number(value: Any, base: Any) -> str:
    """A number as C writes it: an int's digits in its base; a float's shortest text, with a point or an exponent."""
    if type(value) is int:
        if base in _PREFIXES:
            digits = format(abs(value), {16: "x", 8: "o", 2: "b"}[base])
            return ("-" if value < 0 else "") + _PREFIXES[base] + ("" if digits == "0" and base == 8 else digits)
        return str(value)
    return repr(value)  # a float's shortest text, with a point or an exponent


def _literal(attributes: Mapping[str, Any]) -> str:
    """A literal's default spelling, of its value and what it encodes."""
    value, prefix = attributes["value"], attributes.get("prefix") or ""
    if type(value) is bool:
        return "true" if value else "false"
    if type(value) is str:
        if attributes.get("raw"):
            delimiter = attributes.get("delimiter", "")
            return f'{prefix}R"{delimiter}({value}){delimiter}"'
        return prefix + _quoted(value, '"')
    if type(value) is int and attributes.get("quote") == "'":
        return prefix + _quoted(chr(value), "'")
    if type(value) is float and not math.isfinite(value):
        return _MACROS[repr(value)]
    return _number(value, attributes.get("base")) + (attributes.get("suffix") or "")


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value


def _abstract(declarator: F.Node | None) -> bool:
    """Whether a declarator declares no name."""
    while declarator is not None:
        if declarator.kind == "iddeclarator":
            return False
        declarator = declarator.helpers.get("declarator")
    return True


def _declared(specifiers: str, declarator: str, abstract: bool) -> str:
    """Specifiers and a declarator: separated by a space, unless the declarator is abstract and starts with a pointer,
    reference, bracket or parenthesis."""
    if not specifiers or not declarator:
        return specifiers + declarator
    if declarator.startswith("..."):
        return specifiers + "..." + (" " + declarator[3:] if len(declarator) > 3 else "")
    if abstract and declarator[0] in "*&[(":
        return specifiers + declarator
    return f"{specifiers} {declarator}"


class _Printer:
    """Writes a term's source from its `Node`: its kind as C and C++ write it, its type names and other helpers
    nested."""

    def __init__(self, dialect: F.Dialect):
        self.dialect, self.depth = dialect, 0  # the depth of the enumeration being written
        self.owners: dict[int, tuple[F.Node, F.Dialect]] = {}  # each node of invalid syntax read, and the dialect that owns it

    def node(self, value: Any) -> F.Node:
        """A term's `Node`, read through the dialect (which refuses another dialect's term), or a `Node` as it is."""
        if isinstance(value, F.Node):
            return value
        tag, record, _ = self.dialect.kind(value)
        node = F.node(tag, record)
        if tag in F.INVALID_KINDS:  # its owner, whose name its refusal gives (`Terms.Dialect.owner`)
            self.owners[id(node)] = (node, self.dialect.owner(value))
        return node

    def precedence(self, node: F.Node, written: str) -> int:
        if node.kind == E.BINARYEXPRESSION:
            return _BINARY[node.attributes["operator"]]
        if node.kind == E.LITERAL and written.startswith("-"):  # a negative value's sign binds as a unary operator does
            return UNARY
        return _PRECEDENCE.get(node.kind, PRIMARY)

    def expression(self, value: Any, needed: int) -> str:
        """A term where an expression of at least `needed` precedence is needed, parenthesized if it binds less."""
        node = self.node(value)
        written = self.text(node)
        return f"({written})" if self.precedence(node, written) < needed else written

    def operand(self, value: Any, needed: int) -> str:
        """A term that may be a type name (`sizeof(int)`, a template's argument): a type as written, else an
        expression."""
        node = self.node(value)
        return self.text(node) if node.kind == E.TYPEID else self.expression(node, needed)

    def text(self, node: F.Node) -> str:
        return self.TEXTS[node.kind](self, node)

    def term(self, value: Any) -> str:
        """A subterm, as written: a type name where the subterm is a type."""
        return self.text(self.node(value))

    def name(self, node: F.Node, property: str) -> str:
        """A node's name, by its property: a `Name`, or an identifier, a helper."""
        return self.text(node.helpers[property])

    def list(self, values: Any) -> str:
        """Arguments: expressions or type names, separated by commas."""
        return ", ".join(self.operand(value, ASSIGNMENT) for value in values)

    def constraint(self, value: Any, needed: int = _BINARY["||"]) -> str:
        """A requires clause: primary expressions joined by `&&` and `||`."""
        node = self.node(value)
        if node.kind == E.BINARYEXPRESSION and node.attributes["operator"] in ("&&", "||"):
            level = _BINARY[node.attributes["operator"]]
            written = (f"{self.constraint(node.subterms['left'], level)} {node.attributes['operator']} "
                       f"{self.constraint(node.subterms['right'], level + 1)}")
            return f"({written})" if level < needed else written
        return self.expression(node, PRIMARY)

    def template_arguments(self, values: Any) -> str:
        """Template arguments, parenthesized where a `>` would end the list."""
        written = []
        for value in values:
            node = self.node(value)
            if node.kind == E.TYPEID:
                written.append(self.text(node))
                continue
            text = self.expression(node, CONDITIONAL)
            if self.precedence(node, text) <= _BINARY[">"] and ">" in text and not text.startswith("("):
                text = f"({text})"
            written.append(text)
        return "<" + ", ".join(written) + ">"

    def keyword_call(self, keyword: str, operand: Any) -> str:
        node = self.node(operand)
        return f"{keyword}({self.text(node) if node.kind == E.TYPEID else self.expression(node, COMMA)})"

    def attributes_after(self, node: F.Node) -> str:
        return "".join(" " + self.text(a) for a in _nodes(node.helpers.get("attributes")))

    def initializer(self, node: F.Node) -> str:
        if node.kind == "equalinitializer":
            return " = " + self.expression(node.subterms["value"], ASSIGNMENT)
        if node.kind == "parenthesizedinitializer":
            return "(" + self.list(node.many) + ")"
        return self.text(node)

    # Expressions

    def invalid(self, node: F.Node) -> str:
        # by the dialect that owns it; within a helper, which holds no term, by the dialect printing it
        return F.invalid_text(self.owners.get(id(node), (node, self.dialect))[1], node.kind, node.attributes)

    def literal(self, node: F.Node) -> str:
        if "text" in node.attributes:
            return node.attributes["text"]
        if "value" not in node.attributes:
            raise ValueError(f"{self.dialect.name()} literal has no value to print")
        return _literal(node.attributes)

    def unary(self, node: F.Node) -> str:
        operand, operator = self.expression(node.subterms["operand"], UNARY), node.attributes["operator"]
        space = " " if operand[:1] in ("+", "-", "&", "*") and operand[:1] == operator[-1:] else ""
        return operator + space + operand  # `- -x`, not the decrement `--x`

    def binary(self, node: F.Node) -> str:
        operator = node.attributes["operator"]
        level = _BINARY[operator]
        left, right = self.expression(node.subterms["left"], level), self.expression(node.subterms["right"], level + 1)
        if operator in (".*", "->*"):
            return left + operator + right
        return f"{left}, {right}" if operator == "," else f"{left} {operator} {right}"

    def assignment(self, node: F.Node) -> str:
        return (f"{self.expression(node.subterms['left'], _BINARY['||'])} {node.attributes['operator']} "
                f"{self.expression(node.subterms['right'], ASSIGNMENT)}")

    def conditional(self, node: F.Node) -> str:
        condition = self.expression(node.subterms["condition"], _BINARY["||"])
        alternative = self.expression(node.subterms["alternative"], ASSIGNMENT)
        if node.subterms["consequence"] is None:  # GNU's
            return f"{condition} ?: {alternative}"
        return f"{condition} ? {self.expression(node.subterms['consequence'], COMMA)} : {alternative}"

    def call(self, node: F.Node) -> str:
        return self.expression(node.subterms["function"], POSTFIX) + "(" + self.list(node.many) + ")"

    def subscript(self, node: F.Node) -> str:
        indices = ", ".join(self.expression(index, ASSIGNMENT) for index in node.many)
        return f"{self.expression(node.subterms['object'], POSTFIX)}[{indices}]"

    def member(self, node: F.Node) -> str:
        return (self.expression(node.subterms["object"], POSTFIX) + node.attributes["operator"]
                + ("template " if node.attributes.get("template_keyword") else "") + self.name(node, "member"))

    def postfix(self, node: F.Node) -> str:
        return self.expression(node.subterms["operand"], POSTFIX) + node.attributes["operator"]

    def sizeof(self, node: F.Node) -> str:
        operand = self.node(node.subterms["operand"])
        if operand.kind == E.TYPEID:
            return f"sizeof({self.text(operand)})"
        written = self.expression(operand, UNARY)
        return "sizeof" + ("" if written.startswith("(") else " ") + written

    def cast(self, node: F.Node) -> str:
        return f"({self.term(node.subterms['type'])}){self.expression(node.subterms['operand'], UNARY)}"

    def initializer_list(self, node: F.Node) -> str:
        items = ", ".join(self.expression(item, ASSIGNMENT) for item in node.many)
        return "{" + items + ("," if node.attributes.get("trailing_comma") else "") + "}"

    def designated(self, node: F.Node) -> str:
        return "".join(self.text(d) for d in _nodes(node.helpers.get("designators"))) + self.initializer(
            node.helpers["initializer"])

    def designator(self, node: F.Node) -> str:
        if node.kind == "fielddesignator":
            return "." + self.name(node, "name")
        last = node.subterms["last"]
        range_ = f" ... {self.expression(last, CONDITIONAL)}" if last is not None else ""
        return f"[{self.expression(node.subterms['index'], CONDITIONAL)}{range_}]"

    def generic(self, node: F.Node) -> str:
        pairs = zip(node.many[0::2], node.many[1::2])  # each association's type, absent for `default`, and value
        associations = [(self.term(type_) if type_ is not None else "default") + ": "
                        + self.expression(value, ASSIGNMENT) for type_, value in pairs]
        return f"_Generic({', '.join([self.operand(node.subterms['controlling'], ASSIGNMENT), *associations])})"

    def new(self, node: F.Node) -> str:
        written = ("::" if node.attributes.get("global_scope") else "") + "new "
        if node.many:
            written += "(" + self.list(node.many) + ") "
        type_ = self.term(node.subterms["type"])
        written += f"({type_})" if node.attributes.get("parenthesized_type") else type_
        return written + (self.initializer(node.helpers["initializer"]) if "initializer" in node.helpers else "")

    def delete(self, node: F.Node) -> str:
        return (("::" if node.attributes.get("global_scope") else "") + "delete"
                + ("[]" if node.attributes.get("array") else "") + " " + self.expression(node.subterms["operand"], UNARY))

    def fold(self, node: F.Node) -> str:
        operator, left, right = node.attributes["operator"], node.subterms["left"], node.subterms["right"]
        written_left = self.expression(left, UNARY) + f" {operator} " if left is not None else ""
        written_right = f" {operator} " + self.expression(right, UNARY) if right is not None else ""
        return f"({written_left}...{written_right})"

    def lambda_(self, node: F.Node) -> str:
        written = "[" + ", ".join(self.text(c) for c in _nodes(node.helpers.get("captures"))) + "]"
        parameters = _nodes(node.helpers.get("template_parameters"))
        if parameters:
            written += "<" + ", ".join(self.text(p) for p in parameters) + ">"
        requires = node.subterms["template_requires"]
        if requires is not None:
            written += " requires " + self.constraint(requires)
        written += self.attributes_after(node)
        if "declarator" in node.helpers:  # without a declarator, the lambda has no parameter list: `[] { ... }`
            written += (" " if requires is not None else "") + self.text(node.helpers["declarator"])
        return written + " {}"  # its body of statements, not part of the term

    def lambda_declarator(self, node: F.Node) -> str:
        written = "(" + ", ".join(self.text(p) for p in _nodes(node.helpers.get("parameters"))) + ")"
        written += "".join(" " + s.attributes["keyword"] for s in _nodes(node.helpers.get("specifiers")))
        if "exception" in node.helpers:
            written += " " + self.text(node.helpers["exception"])
        written += self.attributes_after(node)
        if node.subterms["trailing_return"] is not None:
            written += " -> " + self.term(node.subterms["trailing_return"])
        if node.subterms["requires"] is not None:
            written += " requires " + self.constraint(node.subterms["requires"])
        return written

    def capture(self, node: F.Node) -> str:
        attributes = node.attributes
        if node.kind == "defaultcapture":
            return attributes["mode"]
        if node.kind == "thiscapture":
            return "*this" if attributes.get("copy") else "this"
        reference = "&" if attributes.get("by_reference") else ""
        if node.kind == "simplecapture":
            return reference + self.name(node, "name") + ("..." if attributes.get("pack") else "")
        return (reference + ("..." if attributes.get("pack") else "") + self.name(node, "name")
                + self.initializer(node.helpers["initializer"]))

    def requires(self, node: F.Node) -> str:
        written = "requires "
        parameters = _nodes(node.helpers.get("parameters"))
        if parameters:
            written += "(" + ", ".join(self.text(p) for p in parameters) + ") "
        requirements = _nodes(node.helpers.get("requirements"))
        if not requirements:
            return written + "{}"
        return written + "{ " + " ".join(self.text(r) for r in requirements) + " }"

    def requirement(self, node: F.Node) -> str:
        if node.kind == "simplerequirement":
            return self.expression(node.subterms["expression"], COMMA) + ";"
        if node.kind == "typerequirement":
            return f"typename {self.text(node.helpers['name'])};"
        if node.kind == "nestedrequirement":
            return f"requires {self.constraint(node.subterms['constraint'])};"
        written = "{ " + self.expression(node.subterms["expression"], COMMA) + " }"
        if node.attributes.get("noexcept"):
            written += " noexcept"
        if "return_type" in node.helpers:
            written += " -> " + self.text(node.helpers["return_type"])
        return written + ";"

    def pack_expansion(self, node: F.Node) -> str:
        pattern = self.node(node.subterms["pattern"])
        return (self.text(pattern) if pattern.kind == E.TYPEID else self.expression(pattern, POSTFIX)) + "..."

    # Names

    def name_text(self, node: F.Node) -> str:
        attributes, kind = node.attributes, node.kind
        if kind == "identifier":
            return attributes["spelling"]
        if kind == "operatorname":
            operator = attributes["operator"]
            return "operator" + (" " if operator[0].isalpha() else "") + operator
        if kind == "conversionname":
            return "operator " + self.term(node.subterms["type"])
        if kind == "literaloperatorname":
            return f'operator""{attributes["suffix"]}'
        if kind == "destructorname":
            return "~" + self.text(node.helpers["type"])
        if kind == "templateid":
            return (("template " if attributes.get("template_keyword") else "") + self.text(node.helpers["name"])
                    + self.template_arguments(node.many))
        return (("::" if attributes.get("global_scope") else "")
                + "".join(self.text(q) + "::" for q in _nodes(node.helpers.get("qualifiers")))
                + self.text(node.helpers["name"]))

    # Specifiers

    def specifier(self, node: F.Node) -> str:
        kind = node.kind
        if kind == "namedtypespecifier":
            return self.name(node, "name")
        if kind == "typenamespecifier":
            return "typename " + self.text(node.helpers["name"])
        if kind == "decltypespecifier":
            return f"decltype({self.expression(node.subterms['expression'], COMMA)})"
        if kind == "placeholdertypespecifier":
            constraint = self.text(node.helpers["constraint"]) + " " if "constraint" in node.helpers else ""
            return constraint + ("decltype(auto)" if node.attributes.get("decltype") else "auto")
        if kind == "typeofspecifier":
            return self.keyword_call(node.attributes["keyword"], node.subterms["operand"])
        if kind == "atomictypespecifier":
            return f"_Atomic({self.term(node.subterms['type'])})"
        return f"_BitInt({self.expression(node.subterms['width'], ASSIGNMENT)})"

    def class_(self, node: F.Node) -> str:
        attributes = node.attributes
        written = attributes["key"] + self.attributes_after(node)
        if "name" in node.helpers:
            written += " " + self.name(node, "name")
        if attributes.get("final"):
            written += " final"
        bases = _nodes(node.helpers.get("bases"))
        if bases:
            written += " : " + ", ".join(self.text(b) for b in bases)
        return written + (" {}" if attributes.get("body") else "")  # its member declarations, not part of the term

    def base(self, node: F.Node) -> str:
        attributes = node.attributes
        parts = [" ".join(self.text(a) for a in node.helpers["attributes"])] if "attributes" in node.helpers else []
        parts += ["virtual"] if attributes.get("virtual") else []
        parts += [attributes["access"]] if "access" in attributes else []
        return " ".join([*parts, self.text(node.helpers["type"]) + ("..." if attributes.get("pack") else "")])

    def enum(self, node: F.Node) -> str:
        written = node.attributes["key"] + self.attributes_after(node)
        if "name" in node.helpers:
            written += " " + self.name(node, "name")
        if node.subterms["base"] is not None:
            written += " : " + self.term(node.subterms["base"])
        return written + (" " + self.enumerators(node) if node.attributes.get("body") else "")

    def enumerators(self, node: F.Node) -> str:
        """An enumeration's body, `{ enumerators }`, as mbse-programs writes it: each enumerator, directive or comment on
        lines of its own, one level deeper, each enumerator but its last followed by a comma, and its last too where it
        has a trailing comma (`trailing_comma`)."""
        items = [self.node(item) for item in node.many]
        if not items:
            return "{}"
        last = max((i for i, item in enumerate(items) if item.kind == "enumerator"), default=-1)
        depth = self.depth + 1

        def render(i: int, item: F.Node) -> str:
            written = self.item(item, depth, True)
            return written[:-1] if i == last and not node.attributes.get("trailing_comma") else written

        return "{\n" + "\n".join(self.lines(items, render)) + "\n" + _INDENT * self.depth + "}"

    # Items: an enumeration's enumerators, and the directives and comments among them, each on lines of its own

    def item(self, node: F.Node, depth: int, enumerators: bool) -> str:
        """An item, starting with its indentation (a directive, at its line's start); among `enumerators`, an enumerator
        ends with a comma."""
        if node.kind in ("comment", *F.INVALID_KINDS):  # a comment, or invalid syntax as written
            return _INDENT * depth + self.text(node)
        if node.kind != "enumerator":
            return self.directive(node, depth, enumerators)
        outer, self.depth = self.depth, depth
        try:
            return _INDENT * depth + self.enumerator(node) + ("," if enumerators else "")
        finally:
            self.depth = outer

    def lines(self, items: list[F.Node], render: Any) -> list[str]:
        """Each item rendered on lines of its own, but a trailing comment, which ends the line before it."""
        out: list[str] = []
        for i, item in enumerate(items):
            if item.kind == "comment" and item.attributes.get("trailing") and out:
                out[-1] += " " + self.comment(item)
            else:
                out.append(render(i, item))
        return out

    def enumerator(self, node: F.Node) -> str:
        written = self.name(node, "name") + self.attributes_after(node)
        value = node.subterms["value"]
        return written + (f" = {self.expression(value, CONDITIONAL)}" if value is not None else "")

    def comment(self, node: F.Node) -> str:
        text = node.attributes.get("text", "")
        return f"/*{text}*/" if node.attributes.get("block") else f"//{text}"

    # Directives, as mbse-programs writes them: each starting its line, a conditional one's items on the lines between

    def directive(self, node: F.Node, depth: int, enumerators: bool) -> str:
        kind, attributes = node.kind, node.attributes
        if kind == "includedirective":
            macro = node.subterms["macro"]
            if macro is not None:
                target = self.expression(macro, COMMA)
            elif "path" not in attributes:
                raise ValueError(f"{self.dialect.name()} includedirective has no path or macro to print")
            else:
                target = f"<{attributes['path']}>" if attributes.get("system") else f'"{attributes["path"]}"'
            return f"#{attributes.get('directive', 'include')} {target}"
        if kind == "definedirective":
            head = "#define " + self.name(node, "name")
            if attributes.get("function_like"):
                names = [self.text(p) for p in node.helpers.get("parameters", ())]
                head += "(" + ", ".join(names + ["..."] * bool(attributes.get("variadic"))) + ")"
            return head + (f" {attributes['replacement']}" if "replacement" in attributes else "")
        if kind == "otherdirective":
            return "#" + attributes.get("directive", "") + (f" {attributes['text']}" if "text" in attributes else "")
        return self.branch(node, depth, enumerators) + "\n#endif"

    def branch(self, node: F.Node, depth: int, enumerators: bool) -> str:
        """A conditional directive's branch, its items, and the branches after it (`alternative`)."""
        kind = node.kind
        if kind in ("ifdirective", "elifdirective"):
            head = f"#{'if' if kind == 'ifdirective' else 'elif'} {self.expression(node.subterms['condition'], COMMA)}"
        elif kind in ("ifdefdirective", "elifdefdirective"):
            keyword = "if" if kind == "ifdefdirective" else "elif"
            head = f"#{keyword}{'ndef' if node.attributes.get('negated') else 'def'} {self.name(node, 'name')}"
        else:
            head = "#else"
        items = [self.node(item) for item in node.many]
        body = "".join("\n" + line for line in self.lines(items, lambda i, item: self.item(item, depth, enumerators)))
        alternative = node.subterms.get("alternative")
        tail = "" if alternative is None else "\n" + self.branch(self.node(alternative), depth, enumerators)
        return head + body + tail

    # Declarators

    def declarator(self, node: F.Node | None) -> str:
        if node is None:
            return ""
        kind, attributes = node.kind, node.attributes
        inner = self.declarator(node.helpers.get("declarator"))
        if kind == "iddeclarator":
            return self.name(node, "name") + self.attributes_after(node)
        if kind == "packdeclarator":
            return "..." + inner
        if kind in ("pointerdeclarator", "referencedeclarator"):
            parts = [self.text(a) for a in _nodes(node.helpers.get("attributes"))]
            if kind == "pointerdeclarator":
                written = self.text(node.helpers["scope"]) + "::*" if "scope" in node.helpers else "*"
                parts += [q.attributes["keyword"] for q in _nodes(node.helpers.get("qualifiers"))]
            else:
                written = "&&" if attributes.get("rvalue") else "&"
            return written + " ".join(parts) + (" " + inner if parts and inner else inner)
        if kind == "parenthesizeddeclarator":
            return f"({inner})"
        if node.helpers.get("declarator") is not None and node.helpers["declarator"].kind in (
                "pointerdeclarator", "referencedeclarator"):
            inner = f"({inner})"
        if kind == "arraydeclarator":
            inside = " ".join(["static"] * bool(attributes.get("static"))
                              + [q.attributes["keyword"] for q in _nodes(node.helpers.get("qualifiers"))])
            size = node.subterms["size"]
            written_size = "*" if attributes.get("star") else self.expression(size,
                ASSIGNMENT) if size is not None else ""
            inside = inside + " " + written_size if inside and written_size else inside + written_size
            return inner + f"[{inside}]" + self.attributes_after(node)
        written = inner + "(" + ", ".join(self.text(p) for p in _nodes(node.helpers.get("parameters"))) + ")"
        written += "".join(" " + q.attributes["keyword"] for q in _nodes(node.helpers.get("qualifiers")))
        if "ref_qualifier" in attributes:
            written += " " + attributes["ref_qualifier"]
        if "exception" in node.helpers:
            written += " " + self.text(node.helpers["exception"])
        written += self.attributes_after(node)
        if node.subterms.get("trailing_return") is not None:  # C++'s
            written += " -> " + self.term(node.subterms["trailing_return"])
        return written

    def specifiers(self, node: F.Node) -> str:
        return " ".join(self.text(s) for s in _nodes(node.helpers.get("specifiers")))

    def type_id(self, node: F.Node) -> str:
        return _declared(self.specifiers(node), self.declarator(node.helpers.get("declarator")), True)

    def parameter(self, node: F.Node) -> str:
        if node.kind == "ellipsisparameter":
            return "..."
        attributes = node.helpers.get("attributes")
        written = (" ".join(self.text(a) for a in attributes) + " " if attributes else "") + (
            "this " if node.attributes.get("this_keyword") else "")
        declarator = node.helpers.get("declarator")
        written += _declared(self.specifiers(node), self.declarator(declarator), _abstract(declarator))
        default = node.subterms.get("default")
        return written + (f" = {self.expression(default, ASSIGNMENT)}" if default is not None else "")

    def template_parameter(self, node: F.Node) -> str:
        attributes = node.attributes
        if node.kind == "typeparameter":
            written = self.text(node.helpers["constraint"]) if "constraint" in node.helpers else attributes.get(
                "key", "typename")
        else:
            written = "template <" + ", ".join(self.text(p) for p in _nodes(node.helpers.get("parameters"))) + ">"
            if node.subterms["requires"] is not None:
                written += " requires " + self.constraint(node.subterms["requires"])
            written += " " + attributes["key"]
        written += "..." if attributes.get("pack") else ""
        if "name" in node.helpers:
            written += " " + self.name(node, "name")
        if node.kind == "typeparameter":  # a type, or a template template parameter's name
            return written + (" = " + self.term(node.subterms["default"]) if node.subterms["default"] is not None else "")
        return written + (" = " + self.text(node.helpers["default"]) if "default" in node.helpers else "")

    def exception(self, node: F.Node) -> str:
        if node.kind == "noexceptspecifier":
            condition = node.subterms["condition"]
            return "noexcept" + (f"({self.expression(condition, COMMA)})" if condition is not None else "")
        return "throw(" + self.list(node.many) + ")"

    # Attributes

    def attribute_specifier(self, node: F.Node) -> str:
        kind, attributes = node.kind, node.attributes
        held = _nodes(node.helpers.get("attributes"))
        if kind == "standardattributespecifier":
            using = f"using {attributes['using_namespace']}: " if "using_namespace" in attributes else ""
            return "[[" + using + ", ".join(self.text(a) for a in held) + "]]"
        if kind == "alignasspecifier":
            operand = self.keyword_call(attributes["keyword"], node.subterms["operand"])
            return operand[:-1] + "...)" if attributes.get("pack") else operand
        if kind == "gnuattributespecifier":
            return attributes["keyword"] + "((" + ", ".join(self.text(a) for a in held) + "))"
        return "__declspec(" + " ".join(self.text(a) for a in held) + ")"

    def attribute(self, node: F.Node) -> str:
        attributes = node.attributes
        written = (f"{attributes['namespace']}::" if "namespace" in attributes else "") + attributes["name"]
        if node.many:
            written += "(" + self.list(node.many) + ")"
        return written + ("..." if attributes.get("pack") else "")

    TEXTS: dict[str, Any] = {
        "error": invalid, "missing": invalid, "literal": literal,
        "constant": lambda self, node: E.constant_text(node.attributes),
        "userdefinedliteral": lambda self, node: self.literal(node.helpers["literal"]) + node.attributes["suffix"],
        "concatenatedstring": lambda self, node: " ".join(self.expression(p, PRIMARY) for p in node.many),
        "variable": lambda self, node: node.attributes["name"],
        "idexpression": lambda self, node: self.text(node.helpers["name"]),
        "thisexpression": lambda self, node: "this",
        "parenthesizedexpression": lambda self, node: f"({self.expression(node.subterms['expression'], COMMA)})",
        "lambdaexpression": lambda_, "lambdadeclarator": lambda_declarator,
        "defaultcapture": capture, "simplecapture": capture, "thiscapture": capture, "initcapture": capture,
        "foldexpression": fold, "requiresexpression": requires,
        "simplerequirement": requirement, "typerequirement": requirement, "compoundrequirement": requirement,
        "nestedrequirement": requirement,
        "genericselection": generic, "subscriptexpression": subscript, "callexpression": call,
        "functionalcastexpression": lambda self, node: (self.text(node.helpers["type"])
                                                        + self.initializer(node.helpers["initializer"])),
        "memberexpression": member, "postfixexpression": postfix,
        "namedcastexpression": lambda self, node: (f"{node.attributes['operator']}<{self.term(node.subterms['type'])}>"
                                                   f"({self.expression(node.subterms['operand'], COMMA)})"),
        "typeidexpression": lambda self, node: self.keyword_call("typeid", node.subterms["operand"]),
        "unaryexpression": unary,
        "awaitexpression": lambda self, node: "co_await " + self.expression(node.subterms["operand"], UNARY),
        "sizeofexpression": sizeof,
        "sizeofpackexpression": lambda self, node: f"sizeof...({self.name(node, 'pack')})",
        "alignofexpression": lambda self, node: self.keyword_call(node.attributes["keyword"], node.subterms["operand"]),
        "noexceptexpression": lambda self, node: self.keyword_call("noexcept", node.subterms["operand"]),
        "newexpression": new, "deleteexpression": delete, "castexpression": cast, "binaryexpression": binary,
        "conditionalexpression": conditional, "assignmentexpression": assignment,
        "throwexpression": lambda self, node: "throw" + (
            " " + self.expression(node.subterms["operand"], ASSIGNMENT) if node.subterms["operand"] is not None else ""),
        "yieldexpression": lambda self, node: "co_yield " + self.expression(node.subterms["operand"], ASSIGNMENT),
        "packexpansion": pack_expansion, "initializerlist": initializer_list, "designatedinitializer": designated,
        "fielddesignator": designator, "indexdesignator": designator,
        "compoundliteralexpression": lambda self, node: (f"({self.term(node.subterms['type'])})"
                                                         + self.initializer_list(node.helpers["initializer"])),
        "statementexpression": lambda self, node: "({})",  # its body of statements, not part of the term
        "extensionexpression": lambda self, node: "__extension__ " + self.expression(node.subterms["operand"], UNARY),
        "typeid": type_id,
        "identifier": name_text, "operatorname": name_text, "conversionname": name_text,
        "literaloperatorname": name_text, "destructorname": name_text, "templateid": name_text,
        "qualifiedname": name_text,
        "declspecifier": lambda self, node: node.attributes["keyword"],
        "cvqualifier": lambda self, node: node.attributes["keyword"],
        "primitivetypespecifier": lambda self, node: node.attributes["keyword"],
        "namedtypespecifier": specifier, "typenamespecifier": specifier, "decltypespecifier": specifier,
        "placeholdertypespecifier": specifier, "typeofspecifier": specifier, "atomictypespecifier": specifier,
        "bitintspecifier": specifier, "classspecifier": class_, "basespecifier": base, "enumspecifier": enum,
        "iddeclarator": declarator, "packdeclarator": declarator, "pointerdeclarator": declarator,
        "referencedeclarator": declarator, "arraydeclarator": declarator, "functiondeclarator": declarator,
        "parenthesizeddeclarator": declarator,
        "parameterdeclaration": parameter, "ellipsisparameter": parameter,
        "typeparameter": template_parameter, "templatetemplateparameter": template_parameter,
        "noexceptspecifier": exception, "throwspecifier": exception,
        "standardattributespecifier": attribute_specifier, "alignasspecifier": attribute_specifier,
        "gnuattributespecifier": attribute_specifier, "declspecspecifier": attribute_specifier,
        "attribute": attribute,
        "enumerator": enumerator, "comment": comment, "definedexpression": lambda self, node: (
            f"defined({self.name(node, 'name')})"),
        **{kind: lambda self, node: self.directive(node, 0, False) for kind in (
            "includedirective", "definedirective", "ifdirective", "ifdefdirective", "elifdirective", "elifdefdirective",
            "elsedirective", "otherdirective")},
        "equalinitializer": initializer, "parenthesizedinitializer": initializer,
    }


def ToText(expression: Any) -> str:
    """The expression as C source, parenthesized only where precedence requires."""
    return text(expression, E.DIALECT)


def text(expression: Any, dialect: F.Dialect) -> str:
    """A term of `dialect`, a dialect of the C family, as its source, parenthesized only where precedence requires."""
    printer = _Printer(dialect)
    return printer.text(printer.node(F.term(expression)))
