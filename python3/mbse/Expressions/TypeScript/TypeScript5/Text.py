"""Text of the TypeScript family: `ToText(expression)` is a term of TypeScript5, `TypeScript Types` or `TypeScript
Patterns` (or anything `Terms.term` reads one from) as TypeScript source, as mbse-programs' printer writes it
(`mbse:mbse-programs/python3/mbse/Programs/TypeScript/_Printer.py`): its types, patterns and JSX within it, parentheses
written in the term printed, and those its precedence needs added (for an expression, also where `??` meets `||` or
`&&`, where an arrow's body is an object, around a `new`'s callee that calls, and around a number's member access; for a
type, where a function, conditional or union type is an operand). It is written as an expression statement holds it:
parenthesized where it would start with `{`, `function`, `class` or `let [`. A literal is written in its spelling where it
has one (`text`), else in its value's default spelling: a number as JavaScript's `String(number)` writes it, a bigint
with its `n`, a string in its quote (a double quote by default) with its escapes. Invalid syntax is written as written
(`Terms.invalid_text`), refused by the name of the dialect whose `Term` holds it. A body of statements, not part of the
term, is written `{}`, where mbse-programs writes the statements it relates. An arrow's lone type parameter without a
constraint is written `<T,>`, so that the text reads alike in a `.ts` and a `.tsx` file. Its `Printer` writes
TypeScript5's kinds and helpers itself, and dispatches the types' and the patterns' to their dialects' `Text.TEXTS`, as
SystemVerilog's family printer does. Reading TypeScript (`FromText`) is mbse-programs' (the dialects proposal, Decided,
6)."""

from __future__ import annotations

import math
from decimal import Decimal
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Expressions as T

__all__ = ["ToText", "Printer"]

(SEQUENCE, ASSIGN, CONDITIONAL, COALESCE, OR, AND, BOR, BXOR, BAND, EQUALITY, RELATIONAL, SHIFT, ADD, MULTIPLY, POWER,
 UNARY, POSTFIX, NEW, MEMBER, PRIMARY) = range(20)
"""Expressions' precedence, loosest first: an operand is parenthesized when its precedence is below what its place
needs. `new` is written with its arguments, so it binds as a member does."""

_BINARY = {"==": EQUALITY, "!=": EQUALITY, "===": EQUALITY, "!==": EQUALITY, "<": RELATIONAL, "<=": RELATIONAL,
           ">": RELATIONAL, ">=": RELATIONAL, "in": RELATIONAL, "instanceof": RELATIONAL, "<<": SHIFT, ">>": SHIFT,
           ">>>": SHIFT, "+": ADD, "-": ADD, "*": MULTIPLY, "/": MULTIPLY, "%": MULTIPLY, "**": POWER, "|": BOR,
           "^": BXOR, "&": BAND, "&&": AND, "||": OR, "??": COALESCE}
_PRECEDENCE = {
    T.SEQUENCEEXPRESSION: SEQUENCE, T.ASSIGNMENTEXPRESSION: ASSIGN, T.ARROWFUNCTIONEXPRESSION: ASSIGN,
    T.YIELDEXPRESSION: ASSIGN, T.CONDITIONALEXPRESSION: CONDITIONAL, T.TSASEXPRESSION: RELATIONAL,
    T.TSSATISFIESEXPRESSION: RELATIONAL, T.UNARYEXPRESSION: UNARY, T.AWAITEXPRESSION: UNARY,
    T.TSTYPEASSERTION: UNARY, T.UPDATEEXPRESSION: POSTFIX, T.TSNONNULLEXPRESSION: MEMBER, T.NEWEXPRESSION: MEMBER,
    T.CALLEXPRESSION: MEMBER, T.MEMBEREXPRESSION: MEMBER, T.CHAINEXPRESSION: MEMBER,
    T.TAGGEDTEMPLATEEXPRESSION: MEMBER, T.TSINSTANTIATIONEXPRESSION: MEMBER, T.IMPORTEXPRESSION: MEMBER,
}

_KEYWORDS = {
    T.THISEXPRESSION: "this", T.SUPER: "super", T.ELISION: "", T.JSXEMPTYEXPRESSION: "",
}
"""The kinds written as one word, or as nothing."""

_ESCAPES = {"\\": "\\\\", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\v": "\\v"}


def number(value: float) -> str:
    """A number as JavaScript's `String(number)` writes it: the shortest digits that read back as it, in fixed notation
    from 1e-6 to below 1e21, else with an exponent; `NaN`, `Infinity`, and -0 as `0`."""
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "Infinity" if value > 0 else "-Infinity"
    if value == 0:
        return "0"
    sign = "-" if value < 0 else ""
    _, digits, exponent = Decimal(repr(abs(value))).normalize().as_tuple()
    text, k = "".join(map(str, digits)), len(digits)
    n = k + int(exponent)  # the value is 0.digits times 10 ** n
    if k <= n <= 21:
        return sign + text + "0" * (n - k)
    if 0 < n <= 21:
        return sign + text[:n] + "." + text[n:]
    if -6 < n <= 0:
        return sign + "0." + "0" * -n + text
    e = n - 1
    mantissa = text if k == 1 else text[0] + "." + text[1:]
    return f"{sign}{mantissa}e{'+' if e >= 0 else '-'}{abs(e)}"


def string(value: str, quote: str) -> str:
    """A string in `quote`, with its escapes: a backslash, the quote, the C0 controls and DEL, and the line and paragraph
    separators."""
    written = []
    for character in value:
        code = ord(character)
        if character in _ESCAPES:
            written.append(_ESCAPES[character])
        elif character == quote:
            written.append("\\" + quote)
        elif code < 0x20 or code == 0x7F:
            written.append(f"\\x{code:02x}")
        elif code in (0x2028, 0x2029):
            written.append(f"\\u{code:04x}")
        else:
            written.append(character)
    return quote + "".join(written) + quote


def _literal(attributes: Any) -> str:
    """A literal's default spelling, of its value."""
    value = attributes["value"]
    if type(value) is bool:
        return "true" if value else "false"
    if type(value) is int:
        return f"{value}n"
    if type(value) is float:
        return number(value)
    return string(value, attributes.get("quote", '"'))


def _nodes(value: Any) -> tuple[T.Node, ...]:
    """A helper property's nodes, a container's: none where it is absent."""
    return () if value is None else value


class Printer:
    """Writes a term's source, of any dialect of the family: its kind as TypeScript writes it, its helpers from its
    `Node`; a `TypeScript Types`' or a `TypeScript Patterns`' kind or helper as its dialect's `Text.TEXTS` writes it."""

    def __init__(self) -> None:
        from ..Patterns import Text as Patterns
        from ..Types import Text as Types
        self.texts = {**Types.TEXTS, **Patterns.TEXTS}
        self.types = Types
        self.invalid: dict[int, tuple[T.Node, Any]] = {}  # each node of invalid syntax read, and the dialect holding it

    def node(self, value: Any) -> T.Node:
        """A term's `Node`, or a `Node` as it is; a node of invalid syntax remembers the dialect that owns it, whose
        name its refusal gives."""
        if isinstance(value, T.Node):
            return value
        node = T.tree(value)
        if node.kind in F.INVALID_KINDS:
            self.invalid[id(node)] = (node, T.DIALECT.owner(value))  # its owner (`Terms.Dialect.owner`)
        return node

    def precedence(self, node: T.Node) -> int:
        kind, attributes = node.kind, node.attributes
        if kind in (T.BINARYEXPRESSION, T.LOGICALEXPRESSION):
            operator = attributes.get("operator")
            if operator not in _BINARY:
                raise ValueError(f"TypeScript5 {kind} has no operator {operator!r}")
            return _BINARY[operator]
        if kind == T.UPDATEEXPRESSION and attributes.get("prefix"):
            return UNARY
        if kind in (T.LITERAL, T.CONSTANT):
            return UNARY if self.text(node).startswith("-") else PRIMARY
        return _PRECEDENCE.get(kind, PRIMARY)

    def e(self, value: Any, needed: int) -> str:
        """An expression's text, parenthesized if it binds less than its place needs."""
        node = self.node(value)
        text = self.text(node)
        return f"({text})" if self.precedence(node) < needed else text

    def t(self, value: Any, needed: int) -> str:
        """A type's text, parenthesized if it binds less than its place needs (`TypeScript Types`' `Text.PRECEDENCE`)."""
        node = self.node(value)
        text = self.text(node)
        return f"({text})" if self.types.PRECEDENCE.get(node.kind, self.types.PRIMARY) < needed else text

    def text(self, value: Any) -> str:
        node = self.node(value)
        kind = node.kind
        if kind in _KEYWORDS:
            return _KEYWORDS[kind]
        if kind in ("error", "missing"):
            return F.invalid_text(self.invalid[id(node)][1], kind, node.attributes)
        if kind in self.texts:
            return self.texts[kind](self, node)
        return getattr(self, f"_{kind}")(node)

    # Names and literals

    def decorators(self, node: T.Node) -> str:
        return "".join(f"@{self.e(expression, MEMBER)} " for expression in node.lists.get("decorators", ()))

    def annotation(self, node: T.Node) -> str:
        held = node.helpers.get("typeAnnotation")
        return "" if held is None else ": " + self.t(held.slots["typeAnnotation"], self.types.FUNCTION)

    def _identifier(self, node: T.Node) -> str:
        optional = "?" if node.attributes.get("optional") else ""
        return self.decorators(node) + node.attributes.get("name", "") + optional + self.annotation(node)

    def _privateidentifier(self, node: T.Node) -> str:
        return "#" + node.attributes["name"]

    def _literal(self, node: T.Node) -> str:
        return node.attributes["text"] if "text" in node.attributes else _literal(node.attributes)

    def _constant(self, node: T.Node) -> str:
        return T.constant_text(node.attributes)

    def _templateliteral(self, node: T.Node) -> str:
        quasis = _nodes(node.helpers.get("quasis"))
        written = [quasis[0].attributes.get("raw", "")] if quasis else []
        for expression, quasi in zip(node.many, quasis[1:]):
            written.append("${" + self.e(expression, SEQUENCE) + "}" + quasi.attributes.get("raw", ""))
        return "`" + "".join(written) + "`"

    def type_arguments(self, node: T.Node, name: str = "typeArguments") -> str:
        held = node.helpers.get(name)
        return "" if held is None else self.text(held)

    def _taggedtemplateexpression(self, node: T.Node) -> str:
        return self.e(node.slots["tag"], MEMBER) + self.type_arguments(node) + self.text(node.helpers["quasi"])

    def _parenthesizedexpression(self, node: T.Node) -> str:
        return f"({self.e(node.slots['expression'], SEQUENCE)})"

    def _spreadelement(self, node: T.Node) -> str:
        return "..." + self.e(node.slots["argument"], ASSIGN)

    # Displays

    def elements(self, elements: tuple[Any, ...]) -> str:
        """An array's or an array pattern's elements, a hole as nothing, a last hole kept: `[a, , b, ,]`."""
        nodes = [self.node(element) for element in elements]
        texts = ["" if node.kind == T.ELISION else self.e(node, ASSIGN) for node in nodes]
        if nodes and nodes[-1].kind == T.ELISION:
            texts.append("")
        return "[" + ",".join((" " if i > 0 and text else "") + text for i, text in enumerate(texts)) + "]"

    def _arrayexpression(self, node: T.Node) -> str:
        return self.elements(node.many)

    def key(self, key: Any, computed: bool) -> str:
        return f"[{self.e(key, ASSIGN)}]" if computed else self.text(key)

    def _property(self, node: T.Node) -> str:
        attributes = node.attributes
        key = self.key(node.slots["key"], attributes.get("computed", False))
        value = self.node(node.slots["value"])
        if attributes.get("shorthand"):
            if value.kind == T.ASSIGNMENTPATTERN:
                return f"{self.text(value.slots['left'])} = {self.e(value.slots['right'], ASSIGN)}"
            return key
        accessor = attributes.get("propertyKind") in ("get", "set")
        if accessor or attributes.get("method"):
            prefix = (attributes["propertyKind"] + " ") if accessor else ""
            prefix += ("async " if value.attributes.get("isAsync") else "") + ("*" if value.attributes.get("generator") else "")
            if value.kind == T.TSEMPTYBODYFUNCTIONEXPRESSION:
                return f"{prefix}{key}{self.signature(value)}"
            return f"{prefix}{key}{'?' if attributes.get('optional') else ''}{self.signature(value)} {{}}"
        return f"{key}: {self.e(value, ASSIGN)}"

    def _objectexpression(self, node: T.Node) -> str:
        if not node.many:
            return "{}"
        return "{ " + ", ".join(self.text(member) for member in node.many) + " }"

    # Functions and classes: a body of statements is not the term's, and is written `{}`

    def signature(self, node: T.Node, arrow: bool = False) -> str:
        """`<typeParameters>(params): returnType`, or with `arrow` `... => returnType` for a function type."""
        parameters = self.type_arguments(node, "typeParameters")
        params = ", ".join(self.text(parameter) for parameter in node.lists.get("params", ()))
        returned = node.helpers.get("returnType")
        returns = "" if returned is None else (" => " if arrow else ": ") + self.t(
            returned.slots["typeAnnotation"], self.types.FUNCTION)
        return f"{parameters}({params}){returns}"

    def _functionexpression(self, node: T.Node) -> str:
        attributes = node.attributes
        keyword = ("async " if attributes.get("isAsync") else "") + "function" + ("*" if attributes.get("generator") else "")
        name = "" if "id" not in node.helpers else " " + self.text(node.helpers["id"])
        return f"{keyword}{name}{self.signature(node)} {{}}"

    def _tsemptybodyfunctionexpression(self, node: T.Node) -> str:
        attributes = node.attributes
        return ("async " if attributes.get("isAsync") else "") + ("*" if attributes.get("generator") else "") + self.signature(node)

    def _arrowfunctionexpression(self, node: T.Node) -> str:
        head = ("async " if node.attributes.get("isAsync") else "") + self.signature(node)
        parameters = node.helpers.get("typeParameters")
        if parameters is not None:
            params = _nodes(parameters.helpers.get("params"))
            if len(params) == 1 and params[0].slots["constraint"] is None:  # `<T>(` would open an element in a .tsx file
                written = self.text(parameters)
                head = head.replace(written, written[:-1] + ",>", 1)
        body = node.slots["body"]
        if body is None:
            return head + " => {}"
        text = self.e(body, ASSIGN)
        if self.leftmost(body).kind in (T.OBJECTEXPRESSION, T.OBJECTPATTERN):
            text = f"({text})"
        return f"{head} => {text}"

    def heritage(self, node: T.Node) -> str:
        return self.e(node.slots["expression"], MEMBER) + self.type_arguments(node)

    def _classexpression(self, node: T.Node) -> str:
        head = "class"
        if "id" in node.helpers:
            head += " " + self.text(node.helpers["id"])
        head += self.type_arguments(node, "typeParameters")
        if node.slots["superClass"] is not None:
            head += f" extends {self.e(node.slots['superClass'], MEMBER)}" + self.type_arguments(node, "superTypeArguments")
        implements = _nodes(node.helpers.get("implements"))
        if implements:
            head += " implements " + ", ".join(self.heritage(heritage) for heritage in implements)
        return self.decorators(node) + head + " {}"

    def _metaproperty(self, node: T.Node) -> str:
        return f"{self.text(node.helpers['meta'])}.{self.text(node.helpers['property'])}"

    # Operations

    def _memberexpression(self, node: T.Node) -> str:
        attributes = node.attributes
        target = self.e(node.slots["object"], MEMBER)
        if self.node(node.slots["object"]).kind == T.LITERAL and target.strip("0123456789_") == "":
            target = f"({target})"  # `1.toString()` would be a number
        if attributes.get("computed"):
            return f"{target}{'?.' if attributes.get('optional') else ''}[{self.e(node.slots['property'], SEQUENCE)}]"
        return f"{target}{'?.' if attributes.get('optional') else '.'}{self.text(node.slots['property'])}"

    def arguments(self, arguments: tuple[Any, ...]) -> str:
        return ", ".join(self.e(argument, ASSIGN) for argument in arguments)

    def _callexpression(self, node: T.Node) -> str:
        optional = "?." if node.attributes.get("optional") else ""
        return f"{self.e(node.slots['callee'], MEMBER)}{optional}{self.type_arguments(node)}({self.arguments(node.many)})"

    def _chainexpression(self, node: T.Node) -> str:
        return self.text(node.slots["expression"])

    def calls(self, value: Any) -> bool:
        """Whether a `new`'s callee holds a call, a `new` or a non-null assertion outside parentheses, which would end
        the callee: `new a!.b()` reads as `(new a)!.b()`."""
        node = self.node(value)
        while node.kind == T.MEMBEREXPRESSION:
            node = self.node(node.slots["object"])
        return node.kind in (T.CALLEXPRESSION, T.CHAINEXPRESSION, T.IMPORTEXPRESSION, T.TSNONNULLEXPRESSION,
                             T.NEWEXPRESSION)

    def _newexpression(self, node: T.Node) -> str:
        callee = self.e(node.slots["callee"], NEW)
        if self.calls(node.slots["callee"]):
            callee = f"({callee})"  # `new f()()` would call `f`'s instance
        return f"new {callee}{self.type_arguments(node)}({self.arguments(node.many)})"

    def _importexpression(self, node: T.Node) -> str:
        held = [node.slots["source"]] + ([] if node.slots["options"] is None else [node.slots["options"]])
        return "import" + (".defer" if node.attributes.get("phase") == "defer" else "") + f"({self.arguments(tuple(held))})"

    def _updateexpression(self, node: T.Node) -> str:
        operator, argument = node.attributes["operator"], node.slots["argument"]
        if node.attributes.get("prefix"):
            return operator + self.e(argument, UNARY)
        return self.e(argument, POSTFIX + 1) + operator

    def _unaryexpression(self, node: T.Node) -> str:
        operator, argument = node.attributes["operator"], self.e(node.slots["argument"], UNARY)
        if operator in ("typeof", "void", "delete") or (operator in ("+", "-") and argument.startswith(operator)):
            return f"{operator} {argument}"  # `--a` and `++a` would be updates
        return operator + argument

    def _awaitexpression(self, node: T.Node) -> str:
        return "await " + self.e(node.slots["argument"], UNARY)

    def _binaryexpression(self, node: T.Node) -> str:
        operator = node.attributes["operator"]
        level = self.precedence(node)
        left_node, right_node = self.node(node.slots["left"]), self.node(node.slots["right"])
        if operator == "**":
            left = self.e(left_node, POWER + 1)
            if left_node.kind in (T.UNARYEXPRESSION, T.AWAITEXPRESSION, T.TSTYPEASSERTION) or (
                    left_node.kind in (T.LITERAL, T.CONSTANT) and left.startswith("-")):
                left = f"({self.text(left_node)})"  # `-a ** b` is not JavaScript, nor a negative value's `-1 ** b`
            return f"{left} ** {self.e(right_node, POWER)}"
        left, right = self.e(left_node, level), self.e(right_node, level + 1)
        if node.kind == T.LOGICALEXPRESSION:  # `??` does not mix with `||` and `&&` without parentheses
            if left_node.kind == T.LOGICALEXPRESSION and (left_node.attributes["operator"] == "??") != (operator == "??"):
                left = f"({self.text(left_node)})"
            if right_node.kind == T.LOGICALEXPRESSION and (right_node.attributes["operator"] == "??") != (operator == "??"):
                right = f"({self.text(right_node)})"
        if left_node.kind == T.PRIVATEIDENTIFIER:
            left = self.text(left_node)
        return f"{left} {operator} {right}"

    _logicalexpression = _binaryexpression

    def _conditionalexpression(self, node: T.Node) -> str:
        slots = node.slots
        return (f"{self.e(slots['test'], COALESCE)} ? {self.e(slots['consequent'], ASSIGN)} : "
                f"{self.e(slots['alternate'], ASSIGN)}")

    def _assignmentexpression(self, node: T.Node) -> str:
        target = self.node(node.slots["left"])
        left = self.text(target) if target.kind in (T.OBJECTPATTERN, T.ARRAYPATTERN) else self.e(target, MEMBER)
        return f"{left} {node.attributes['operator']} {self.e(node.slots['right'], ASSIGN)}"

    def _sequenceexpression(self, node: T.Node) -> str:
        return ", ".join(self.e(expression, ASSIGN) for expression in node.many)

    def _yieldexpression(self, node: T.Node) -> str:
        argument = node.slots["argument"]
        return ("yield*" if node.attributes.get("delegate") else "yield") + (
            "" if argument is None else " " + self.e(argument, ASSIGN))

    def _tsasexpression(self, node: T.Node) -> str:
        return f"{self.e(node.slots['expression'], RELATIONAL)} as {self.t(node.slots['typeAnnotation'], 0)}"

    def _tssatisfiesexpression(self, node: T.Node) -> str:
        return f"{self.e(node.slots['expression'], RELATIONAL)} satisfies {self.t(node.slots['typeAnnotation'], 0)}"

    def _tstypeassertion(self, node: T.Node) -> str:
        return f"<{self.t(node.slots['typeAnnotation'], 0)}>{self.e(node.slots['expression'], UNARY)}"

    def _tsnonnullexpression(self, node: T.Node) -> str:
        return self.e(node.slots["expression"], MEMBER) + "!"

    def _tsinstantiationexpression(self, node: T.Node) -> str:
        return self.e(node.slots["expression"], MEMBER) + self.type_arguments(node)

    def leftmost(self, value: Any) -> T.Node:
        """The expression a statement made of `value` starts with."""
        node = self.node(value)
        while True:
            kind, slots = node.kind, node.slots
            if kind in (T.BINARYEXPRESSION, T.LOGICALEXPRESSION):
                node = self.node(slots["left"])
            elif kind == T.ASSIGNMENTEXPRESSION:
                node = self.node(slots["left"])
            elif kind == T.MEMBEREXPRESSION:
                node = self.node(slots["object"])
            elif kind in (T.CALLEXPRESSION, T.TAGGEDTEMPLATEEXPRESSION):
                node = self.node(slots["callee" if kind == T.CALLEXPRESSION else "tag"])
            elif kind == T.CONDITIONALEXPRESSION:
                node = self.node(slots["test"])
            elif kind == T.SEQUENCEEXPRESSION:
                node = self.node(node.many[0])
            elif kind in (T.TSASEXPRESSION, T.TSSATISFIESEXPRESSION, T.TSNONNULLEXPRESSION, T.CHAINEXPRESSION,
                          T.TSINSTANTIATIONEXPRESSION):
                node = self.node(slots["expression"])
            elif kind == T.UPDATEEXPRESSION and not node.attributes.get("prefix"):
                node = self.node(slots["argument"])
            else:
                return node

    # Modifiers, type parameters and type arguments, which expressions and types hold alike

    def modifiers(self, node: T.Node) -> str:
        """A parameter property's or a signature's modifiers, in the order TypeScript requires."""
        attributes = node.attributes
        words = [attributes["accessibility"]] if attributes.get("accessibility") else []
        words += [word for word in ("static", "override", "readonly") if attributes.get(word)]
        return "".join(word + " " for word in words)

    def _tstypeparameter(self, node: T.Node) -> str:
        attributes, helpers = node.attributes, node.helpers
        text = "".join(word + " " for word, flag in (("const", "const"), ("in", "isIn"), ("out", "isOut"))
                       if attributes.get(flag))
        text += self.text(helpers["name"])
        if node.slots["constraint"] is not None:
            text += f" extends {self.t(node.slots['constraint'], self.types.FUNCTION)}"
        if node.slots["default"] is not None:
            text += f" = {self.t(node.slots['default'], self.types.FUNCTION)}"
        return text

    def _tstypeparameterdeclaration(self, node: T.Node) -> str:
        return "<" + ", ".join(self.text(p) for p in _nodes(node.helpers.get("params"))) + ">"

    def _tstypeparameterinstantiation(self, node: T.Node) -> str:
        return "<" + ", ".join(self.t(p, self.types.FUNCTION) for p in node.many) + ">"

    # JSX

    def _jsxidentifier(self, node: T.Node) -> str:
        return node.attributes.get("name", "")

    def _jsxnamespacedname(self, node: T.Node) -> str:
        return f"{self.text(node.helpers['namespace'])}:{self.text(node.helpers['name'])}"

    def _jsxmemberexpression(self, node: T.Node) -> str:
        return f"{self.text(node.helpers['object'])}.{self.text(node.helpers['property'])}"

    def _jsxexpressioncontainer(self, node: T.Node) -> str:
        return "{" + self.text(node.slots["expression"]) + "}"

    def _jsxspreadchild(self, node: T.Node) -> str:
        return "{..." + self.text(node.slots["expression"]) + "}"

    def _jsxtext(self, node: T.Node) -> str:
        return node.attributes.get("raw", "")

    def _jsxattribute(self, node: T.Node) -> str:
        value = node.helpers.get("value")
        return self.text(node.helpers["name"]) + ("" if value is None else "=" + self.text(value))

    def _jsxspreadattribute(self, node: T.Node) -> str:
        return "{..." + self.e(node.slots["argument"], ASSIGN) + "}"

    def children(self, node: T.Node) -> str:
        return "".join(self.text(child) for child in _nodes(node.helpers.get("children")))

    def _jsxelement(self, node: T.Node) -> str:
        opening = node.helpers["openingElement"]
        name = self.text(opening.helpers["name"])
        attributes = "".join(" " + self.text(a) for a in _nodes(opening.helpers.get("attributes")))
        head = f"<{name}{self.type_arguments(opening)}{attributes}"
        if opening.attributes.get("selfClosing"):
            return head + " />"
        closing = node.helpers.get("closingElement")
        return f"{head}>{self.children(node)}</{name if closing is None else self.text(closing.helpers['name'])}>"

    def _jsxfragment(self, node: T.Node) -> str:
        return "<>" + self.children(node) + "</>"


def ToText(expression: Any) -> str:
    """The expression as TypeScript source, as an expression statement holds it."""
    printer = Printer()
    node = printer.node(F.term(expression))
    text = printer.e(node, SEQUENCE)
    start = printer.leftmost(node)
    if start.kind in (T.OBJECTEXPRESSION, T.FUNCTIONEXPRESSION, T.CLASSEXPRESSION, T.OBJECTPATTERN) or (
            start.kind == T.IDENTIFIER and start.attributes.get("name") == "let" and text.startswith("let[")):
        text = f"({text})"
    return text
