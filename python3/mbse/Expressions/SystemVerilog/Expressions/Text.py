"""Text of the SystemVerilog dialect: `ToText(expression)` is a term of the SystemVerilog family (or anything
`Terms.term` reads one from) as SystemVerilog source, as mbse-programs' printer writes it
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`): IEEE 1800's precedence (Table 11-2), parentheses
written in the term printed and those its precedence needs added, every kind of `Expressions` and the helpers it holds.

The family's printer prints a tree that mixes its dialects' terms from any of their holders: each sublanguage's kinds
are written by its own package's `Text` module, which `Printer` dispatches to by tag: `Types.Text`, `Patterns.Text`,
`Assertions.Text`, `Constraints.Text` and `Preprocessor.Text`, each with its `TEXTS` (a kind's tag to the function
that writes it, given the printer and its `Terms.Node`), its `PRECEDENCE` (a kind's tag to its precedence, or to a
function of its node and its text giving it, where it is not a primary's) and its `INLINE` (a kind's tag to how
`randomize() with` writes it among its constraints, given its text, where it is not as written).

A literal is written in its spelling where it has one (`text`), else in its value's default spelling: an unsized
integer in its base (`'hff`), a real with a point or an exponent, a time with its unit, a string with its escapes, and a
float that has no literal as a division (`1.0 / 0.0`); a constant's vector in its base wherever the base can write its
bits (`8'hff`, `4'b10x1`), a fill as `'0`, `null`. Invalid syntax is written as written (`Terms.invalid_text`). Reading
SystemVerilog (`FromText`) is mbse-programs' (the dialects proposal, Decided, 6)."""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Expressions as E

__all__ = ["ToText", "Printer", "IMPLY", "CONDITIONAL", "OR", "AND", "BOR", "BXOR", "BAND", "EQUALITY", "RELATIONAL",
           "SHIFT", "ADDITIVE", "MULTIPLICATIVE", "POWER", "UNARY", "PRIMARY", "BINARY", "RIGHT"]

IMPLY, CONDITIONAL, OR, AND, BOR, BXOR, BAND, EQUALITY, RELATIONAL, SHIFT, ADDITIVE, MULTIPLICATIVE, POWER, UNARY, \
    PRIMARY = range(1, 16)
"""Precedence (IEEE 1800, Table 11-2), as mbse-programs' printer numbers it: higher binds tighter. An operand is
parenthesized where its precedence is below what its place needs; an assignment, a min:typ:max, a tagged value, a
`matches` and a `&&&` have 0, and the Assertions' sequences and properties bind looser than any expression operator."""

BINARY = {
    "->": IMPLY, "<->": IMPLY, "||": OR, "&&": AND, "|": BOR, "^": BXOR, "^~": BXOR, "~^": BXOR, "&": BAND,
    "==": EQUALITY, "!=": EQUALITY, "===": EQUALITY, "!==": EQUALITY, "==?": EQUALITY, "!=?": EQUALITY,
    "<": RELATIONAL, "<=": RELATIONAL, ">": RELATIONAL, ">=": RELATIONAL, "<<": SHIFT, ">>": SHIFT, "<<<": SHIFT,
    ">>>": SHIFT, "+": ADDITIVE, "-": ADDITIVE, "*": MULTIPLICATIVE, "/": MULTIPLICATIVE, "%": MULTIPLICATIVE,
    "**": POWER,
}
"""Each binary operator's precedence."""

RIGHT = {IMPLY, CONDITIONAL}
"""The right-associative levels of expressions; the Assertions' add theirs."""

_ESCAPES = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t"}


def _number(value: Any, attributes: Mapping[str, Any]) -> str:
    """A number's default spelling: an int in its base (`'hff`, `'sd5`), a real with a point or an exponent, a time with
    its unit, and a float that has no literal as a division."""
    if type(value) is float:
        if not math.isfinite(value):
            return "0.0 / 0.0" if math.isnan(value) else "1.0 / 0.0" if value > 0 else "-1.0 / 0.0"
        if "unit" in attributes:
            magnitude = str(int(value)) if value.is_integer() else repr(value)
            return magnitude + attributes["unit"]
        return repr(value)  # with a point or an exponent
    base = attributes.get("base")
    if base is None:
        return str(value)
    digits = {"b": "b", "o": "o", "d": "d", "h": "x"}[base]
    return ("-" if value < 0 else "") + f"'{'s' if attributes.get('signed') else ''}{base}" + format(abs(value), digits)


def _literal(attributes: Mapping[str, Any]) -> str:
    """A literal's default spelling, of its value and what it encodes."""
    value = attributes["value"]
    if type(value) is str:
        if attributes.get("triple"):
            return '"""' + value + '"""'
        return '"' + "".join(_ESCAPES.get(c, c) for c in value) + '"'
    return _number(value, attributes)


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


class Printer:
    """Writes a term of the SystemVerilog family as its source, from its `Node`: its kind as mbse-programs writes it,
    by the `Text` module of the dialect that defines it."""

    def __init__(self, texts: Mapping[str, Callable[[Printer, F.Node], str]],
                 precedence: Mapping[str, Any], inline: Mapping[str, Callable[[Printer, F.Node, str], str]]):
        self.texts, self._precedence, self._inline = texts, precedence, inline

    def node(self, value: Any) -> F.Node:
        """A term's `Node`, read through the family's dialects, which refuse another dialect's term."""
        tag, record, _ = E.DIALECT.kind(value)
        return F.node(tag, record)

    def text(self, value: Any) -> str:
        """A term's source, as its kind writes it; invalid syntax as written, by the dialect that owns it."""
        node = self.node(value)
        if node.kind in ("error", "missing"):
            return F.invalid_term_text(E.DIALECT, value)
        return self.texts[node.kind](self, node)

    def precedence(self, node: F.Node, written: str) -> int:
        """A node's precedence, by its kind's (`PRECEDENCE`), a primary's where its kind gives none."""
        level = self._precedence.get(node.kind, PRIMARY)
        return level(node, written) if callable(level) else level

    def operand(self, value: Any, level: int) -> str:
        """A term where one of at least `level` precedence is needed, parenthesized if it binds less."""
        node, written = self.node(value), self.text(value)
        return f"({written})" if self.precedence(node, written) < level else written

    def spelling(self, node: Any) -> str:
        """An identifier's spelling."""
        return node.attributes["spelling"]

    def name(self, node: F.Node) -> str:
        """A name: a scoped, local, parameterized or interface's name, `$unit`, or an identifier."""
        if node.kind == "scopedname":
            return f"{self.name(node.helpers['scope'])}::{self.name(node.helpers['name'])}"
        if node.kind == "localname":
            return f"local::{self.spelling(node.helpers['name'])}"
        if node.kind == "unitname":
            return "$unit"
        if node.kind == "interfacetypename":
            return f"{self.spelling(node.helpers['interface'])}.{self.spelling(node.helpers['name'])}"
        if node.kind == "interfacemethodname":
            return f"{self.spelling(node.helpers['port'])}.{self.spelling(node.helpers['name'])}"
        if node.kind == "parameterizedname":
            return self.spelling(node.helpers["name"]) + self.parameter_values(node.many)
        return self.spelling(node)

    def parameter_values(self, parameters: Any) -> str:
        """` #(values)`, or nothing without values."""
        return " #(" + ", ".join(self.text(p) for p in parameters) + ")" if parameters else ""

    def attribute_text(self, instances: Any) -> str:
        """`(* name = value, ... *) (* ... *)`."""
        return " ".join("(* " + ", ".join(self.spelling(s.helpers["name"]) + (
            f" = {self.text(s.slots['value'])}" if s.slots["value"] is not None else "")
            for s in _nodes(i.helpers.get("specs"))) + " *)" for i in instances)

    def is_type(self, node: F.Node) -> bool:
        """Whether a node is a data type, of the Types dialect."""
        from ..Types import Expressions as Types
        return node.kind in Types.TAGS

    def inline(self, items: Any) -> str:
        """`{ constraints }` on one line, as `randomize() with` writes them: each item as its kind writes it on one line, or
        as its kind's `INLINE` says (an expression held as a constraint ended by `;`; a line comment, a directive, its
        line), a space between them but not at a line's end or start, as mbse-programs writes them."""
        parts: list[str] = []
        for item in items:
            node, written = self.node(item), self.text(item)
            parts.append(self._inline[node.kind](self, node, written) if node.kind in self._inline else written)
        text = "{"
        for part in [*parts, "}"]:
            text += part if text.endswith("\n") or part.startswith("\n") else " " + part
        return text if parts else "{}"

    # Expressions

    def literal(self, node: F.Node) -> str:
        if "text" in node.attributes:
            return node.attributes["text"]
        if "value" not in node.attributes:
            raise ValueError("SystemVerilog literal has no value to print")
        return _literal(node.attributes)

    def constant(self, node: F.Node) -> str:
        return E.constant_text(node.attributes)

    def unary(self, node: F.Node) -> str:
        operand = self.operand(node.slots["operand"], UNARY + 1)
        if self.node(node.slots["operand"]).kind in (E.UNARYEXPRESSION, E.INCREMENTEXPRESSION):
            operand = f"({self.text(node.slots['operand'])})"
        attributes = _nodes(node.helpers.get("attributes"))
        if attributes:  # `- (* a *) x`: apart, so that `(*` starts the attributes
            return f"{node.attributes['operator']} {self.attribute_text(attributes)} {operand}"
        return f"{node.attributes['operator']}{operand}"

    def increment(self, node: F.Node) -> str:
        operand, operator = self.operand(node.slots["operand"], PRIMARY), node.attributes["operator"]
        attributes = _nodes(node.helpers.get("attributes"))
        if attributes:
            written = self.attribute_text(attributes)
            return f"{operand} {written}{operator}" if node.attributes.get("postfix") else \
                f"{operator} {written} {operand}"
        return f"{operand}{operator}" if node.attributes.get("postfix") else f"{operator}{operand}"

    def binary(self, node: F.Node) -> str:
        operator = node.attributes["operator"]
        level = BINARY[operator]
        left_level, right_level = (level + 1, level) if level in RIGHT else (level, level + 1)
        attributes = _nodes(node.helpers.get("attributes"))
        written = f" {self.attribute_text(attributes)}" if attributes else ""
        return (f"{self.operand(node.slots['left'], left_level)} {operator}{written} "
                f"{self.operand(node.slots['right'], right_level)}")

    def assignment(self, node: F.Node) -> str:
        return f"{self.text(node.slots['target'])} {node.attributes['operator']} {self.text(node.slots['value'])}"

    def conditional(self, node: F.Node) -> str:
        attributes = _nodes(node.helpers.get("attributes"))
        written = f"{self.attribute_text(attributes)} " if attributes else ""
        condition = node.slots["condition"]
        matching = self.node(condition).kind in (E.MATCHESEXPRESSION, E.PREDICATEEXPRESSION)  # never parenthesized
        test = self.text(condition) if matching else self.operand(condition, CONDITIONAL + 1)
        return (f"{test} ? {written}{self.operand(node.slots['consequence'], CONDITIONAL + 1)} : "
                f"{self.operand(node.slots['alternative'], CONDITIONAL)}")

    def tagged(self, node: F.Node) -> str:
        member = self.spelling(node.helpers["member"])
        if node.slots["value"] is None:
            return f"tagged {member}"
        value = node.slots["value"]
        nested = self.node(value).kind == E.TAGGEDEXPRESSION  # `tagged a tagged b 1` needs no parentheses
        return f"tagged {member} {self.text(value) if nested else self.operand(value, UNARY)}"

    def inside(self, node: F.Node) -> str:
        ranges = ", ".join(self.text(r) for r in node.many)
        return f"{self.operand(node.slots['value'], RELATIONAL + 1)} inside {{{ranges}}}"

    def value_range(self, node: F.Node) -> str:
        operator = node.attributes.get("operator")
        between = f" {operator} " if operator is not None else ":"
        return f"[{self.text(node.slots['left'])}{between}{self.text(node.slots['right'])}]"

    def replication(self, node: F.Node) -> str:
        return f"{{{self.operand(node.slots['count'], PRIMARY)}{{{', '.join(self.text(i) for i in node.many)}}}}}"

    def assignment_pattern(self, node: F.Node) -> str:
        prefix = self.text(node.slots["type"]) if node.slots["type"] is not None else ""
        items = ", ".join(self.text(i) for i in node.many)
        if node.slots["count"] is not None:
            return f"{prefix}'{{{self.operand(node.slots['count'], PRIMARY)}{{{items}}}}}"
        return f"{prefix}'{{{items}}}"

    def pattern_item(self, node: F.Node) -> str:
        key = "default" if node.slots["key"] is None else self.text(node.slots["key"])
        return f"{key}: {self.text(node.slots['value'])}"

    def call(self, node: F.Node) -> str:
        attributes = _nodes(node.helpers.get("attributes"))
        written = f" {self.attribute_text(attributes)} " if attributes else ""
        return (f"{self.operand(node.slots['callee'], PRIMARY)}{written}"
                f"({', '.join(self.text(a) for a in node.many)})")

    def system_call(self, node: F.Node) -> str:
        name, arguments = node.attributes["name"], ", ".join(self.text(a) for a in node.many)
        attributes = _nodes(node.helpers.get("attributes"))
        if attributes:  # the parentheses follow the attributes even without arguments
            return f"{name} {self.attribute_text(attributes)} ({arguments})"
        return f"{name}({arguments})" if node.many else name

    def cast(self, node: F.Node) -> str:
        target = node.slots["type"]
        written = self.text(target) if self.is_type(self.node(target)) else self.operand(target, PRIMARY)
        return f"{written}'({self.text(node.slots['value'])})"

    def streaming(self, node: F.Node) -> str:
        slice_ = f" {self.text(node.slots['slice'])} " if node.slots["slice"] is not None else ""
        items = ", ".join(self.stream_item(i) for i in _nodes(node.helpers.get("items")))
        return f"{{{node.attributes['operator']}{slice_}{{{items}}}}}"

    def stream_item(self, node: F.Node) -> str:
        if node.slots["left"] is None:
            return self.text(node.slots["expression"])
        operator = node.attributes.get("operator")
        between = "" if operator is None else operator if operator == ":" else f" {operator} "
        right = self.text(node.slots["right"]) if node.slots["right"] is not None else ""
        return f"{self.text(node.slots['expression'])} with [{self.text(node.slots['left'])}{between}{right}]"

    def new(self, node: F.Node) -> str:
        scope, written = node.helpers.get("scope"), ""
        if scope is not None:
            written = "super." if scope.kind == E.SUPEREXPRESSION else self.name(scope) + "::"
        arguments = f"({', '.join(self.text(a) for a in node.many)})" if node.many else \
            "(default)" if node.attributes.get("defaulted") else ""
        return f"{written}new{arguments}"

    def new_array(self, node: F.Node) -> str:
        value = f"({self.text(node.slots['value'])})" if node.slots["value"] is not None else ""
        return f"new[{self.text(node.slots['size'])}]{value}"

    def randomize_with(self, node: F.Node) -> str:
        variables = ""
        if node.attributes.get("restricted"):
            variables = f" ({', '.join(self.spelling(v) for v in _nodes(node.helpers.get('variables')))})"
        return f"{self.operand(node.slots['call'], PRIMARY)} with{variables} {self.inline(node.many)}"

    def named_connection(self, node: F.Node) -> str:
        name = self.spelling(node.helpers["name"])
        if node.attributes.get("implicit"):
            return f".{name}"
        value = "" if node.slots["value"] is None else self.text(node.slots["value"])
        return f".{name}({value})"


TEXTS: dict[str, Callable[[Printer, F.Node], str]] = {
    E.LITERAL: Printer.literal, E.CONSTANT: Printer.constant,
    E.NAMEEXPRESSION: lambda p, n: p.name(n.helpers["name"]),
    E.MEMBEREXPRESSION: lambda p, n: f"{p.operand(n.slots['value'], PRIMARY)}.{p.spelling(n.helpers['member'])}",
    E.INDEXEXPRESSION: lambda p, n: f"{p.operand(n.slots['value'], PRIMARY)}[{p.text(n.slots['index'])}]",
    E.RANGESELECT: lambda p, n: (f"{p.operand(n.slots['value'], PRIMARY)}[{p.text(n.slots['left'])}"
                                 f"{n.attributes['operator'] if n.attributes['operator'] == ':' else ' ' + n.attributes['operator'] + ' '}"
                                 f"{p.text(n.slots['right'])}]"),
    E.UNARYEXPRESSION: Printer.unary, E.INCREMENTEXPRESSION: Printer.increment, E.BINARYEXPRESSION: Printer.binary,
    E.ASSIGNMENTEXPRESSION: Printer.assignment, E.CONDITIONALEXPRESSION: Printer.conditional,
    E.INSIDEEXPRESSION: Printer.inside, E.VALUERANGE: Printer.value_range,
    E.CONCATENATION: lambda p, n: "{" + ", ".join(p.text(i) for i in n.many) + "}",
    E.REPLICATION: Printer.replication, E.ASSIGNMENTPATTERN: Printer.assignment_pattern,
    E.PATTERNITEM: Printer.pattern_item,
    E.THISEXPRESSION: lambda p, n: "this", E.SUPEREXPRESSION: lambda p, n: "super", E.NEWEXPRESSION: Printer.new,
    E.NEWCOPYEXPRESSION: lambda p, n: f"new {p.operand(n.slots['value'], PRIMARY)}",
    E.NEWARRAYEXPRESSION: Printer.new_array, E.RANDOMIZEWITHEXPRESSION: Printer.randomize_with,
    E.ARRAYMETHODWITHEXPRESSION: lambda p, n: f"{p.operand(n.slots['value'], PRIMARY)} with ({p.text(n.slots['body'])})",
    E.CALLEXPRESSION: Printer.call, E.SYSTEMCALL: Printer.system_call, E.CASTEXPRESSION: Printer.cast,
    E.PARENTHESIZEDEXPRESSION: lambda p, n: f"({p.text(n.slots['expression'])})",
    E.DOLLAREXPRESSION: lambda p, n: "$", E.TAGGEDEXPRESSION: Printer.tagged,
    E.MATCHESEXPRESSION: lambda p, n: f"{p.text(n.slots['value'])} matches {p.text(n.slots['pattern'])}",
    E.PREDICATEEXPRESSION: lambda p, n: " &&& ".join(p.text(c) for c in n.many),
    E.STREAMINGCONCATENATION: Printer.streaming,
    E.MINTYPMAXEXPRESSION: lambda p, n: f"{p.text(n.slots['min'])}:{p.text(n.slots['typ'])}:{p.text(n.slots['max'])}",
    E.ROOTEXPRESSION: lambda p, n: "$root", E.EMPTYQUEUE: lambda p, n: "{}",
    E.NAMEDCONNECTION: Printer.named_connection, E.EMPTYARGUMENT: lambda p, n: "",
}
"""How each of its kinds is written."""


def _literal_precedence(node: F.Node, written: str) -> int:
    """A literal's: a negative value's sign binds as a unary operator does, and a float with no literal is a division."""
    return MULTIPLICATIVE if " / " in written else UNARY if written.startswith("-") else PRIMARY


PRECEDENCE: dict[str, Any] = {
    E.LITERAL: _literal_precedence, E.BINARYEXPRESSION: lambda node, written: BINARY[node.attributes["operator"]],
    E.INSIDEEXPRESSION: RELATIONAL, E.CONDITIONALEXPRESSION: CONDITIONAL, E.UNARYEXPRESSION: UNARY,
    E.INCREMENTEXPRESSION: UNARY, E.ASSIGNMENTEXPRESSION: 0, E.MINTYPMAXEXPRESSION: 0, E.TAGGEDEXPRESSION: 0,
    E.MATCHESEXPRESSION: 0, E.PREDICATEEXPRESSION: 0,
}
"""Each of its kinds' precedence, where it is not a primary's."""

INLINE: dict[str, Callable[[Printer, F.Node, str], str]] = {tag: lambda p, n, written: written + ";" for tag in E.TAGS}
"""How `randomize() with` writes its kinds among its constraints, where not as written: an expression held as a
constraint, ended by `;`."""

_PRINTER: list[Printer] = []


def printer() -> Printer:
    """The family's printer: its dialects' `Text` modules' tables, merged, read when first needed."""
    if not _PRINTER:
        from ..Assertions import Text as Assertions
        from ..Constraints import Text as Constraints
        from ..Patterns import Text as Patterns
        from ..Preprocessor import Text as Preprocessor
        from ..Types import Text as Types
        modules = (Types, Patterns, Assertions, Constraints, Preprocessor)
        texts, precedence, inline = dict(TEXTS), dict(PRECEDENCE), dict(INLINE)
        for module in modules:
            texts.update(module.TEXTS)
            precedence.update(module.PRECEDENCE)
            inline.update(module.INLINE)
        _PRINTER.append(Printer(texts, precedence, inline))
    return _PRINTER[0]


def ToText(expression: Any) -> str:
    """The expression, a term of any dialect of the SystemVerilog family, as SystemVerilog source, parenthesized only
    where precedence requires."""
    return printer().text(F.term(expression))
