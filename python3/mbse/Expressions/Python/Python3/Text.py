"""Text of the Python3 dialect, its source text in both directions, as every mbse framework names it:
`ToText(expression)` is a term of the Python family (or anything `Terms.term` reads one from) as Python source,
parenthesized only where precedence requires, with its imports as the lines before it, a literal in its spelling where it has one and
invalid syntax as written (`Terms.invalid_text`); and `FromText(source)` is the `Writer` of the term Python source
writes, imports then one expression, read by CPython's `ast`, every expression kind of it, each literal with its
spelling: its text as written and what the text encodes (a string's prefix and quotes, an int's base, digit
separators), adjacent strings as a `concatenatedstring`, and an f-string's or a t-string's text and fields as written.
`ast` keeps no parentheses, so `FromText` writes no `parenthesized`: printing parenthesizes by precedence. It reads
`(lambda name: body)(value)`, one name bound to one value, as a `let`, the idiom the extension writes, and any other
lambda as a `lambda`. A writer is written where a caller writes a term, within a transaction:
`store.Expressions.Framework.Term(FromText("a + 1"))`.

The family's printer prints a tree that mixes its dialects' terms from any of their holders: each sublanguage's kinds
are written by its own package's `Text` module, which the printer dispatches to by tag (`Types.Text`, `Patterns.Text`),
each with its `TEXTS` (a kind's tag to the function that writes it, given the printer and its `Terms.Node`, giving its
text and its precedence, on this module's scale).

`FromText` is the Python implementation's alone (mbse-expressions' EQUIVALENCE.md): Python's own parser reads the text,
until mbse-programs reads `Python3` (the dialects proposal, Decided, 6). An f-string's parts are located as Python 3.12
and later locate them."""

from __future__ import annotations

import ast
import io
import math
import tokenize
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Expressions as P

__all__ = ["ToText", "FromText"]


# --- Rendering ---

(_YIELD, _NAMED, _LAMBDA, _IF, _OR, _AND, _NOT, _COMPARE, _BITOR, _BITXOR, _BITAND, _SHIFT, _SUM, _PRODUCT, _UNARY,
 _POWER, _AWAIT, _PRIMARY) = range(18)
"""Python's precedence, loosest first (its language reference, 6.17)."""

_BINOP_LEVELS = {"+": _SUM, "-": _SUM, "*": _PRODUCT, "@": _PRODUCT, "/": _PRODUCT, "//": _PRODUCT, "%": _PRODUCT,
                 "**": _POWER, "|": _BITOR, "^": _BITXOR, "&": _BITAND, "<<": _SHIFT, ">>": _SHIFT}
_IMPORTS = (P.IMPORT, P.IMPORTFROM)


def _constant(value: Any) -> tuple[str, int]:
    if type(value) is float and not math.isfinite(value):
        text = "float('nan')" if math.isnan(value) else "float('inf')" if value > 0 else "-float('inf')"
    else:
        text = repr(value)
    return text, _UNARY if text.startswith("-") else _PRIMARY


def _import_line(tag: str, attributes: dict[str, Any]) -> str:
    alias = f" as {attributes['alias']}" if attributes.get("alias") else ""
    if tag == P.IMPORT:
        return f"import {attributes['module']}{alias}"
    return f"from {attributes['module']} import {attributes['name']}{alias}"


def _parts(held: Any) -> tuple[F.Part, ...]:
    """A container's helpers, in order."""
    return () if held is None else held


class _Printer:
    """Writes a term's source: each kind as Python writes it, its helpers read from its attributes and its terms from
    its arguments, in order."""

    def write(self, node: Any, level: int) -> str:
        """`node`'s source, parenthesized where its precedence is looser than `level`."""
        text, precedence = self.text(node)
        return text if precedence >= level else f"({text})"

    def element(self, node: Any) -> str:
        """An element of a display, an argument, an index: any expression but a named expression or a yield."""
        return self.write(node, _LAMBDA)

    def text(self, node: Any) -> tuple[str, int]:
        tag, record, _ = P.DIALECT.kind(node)
        attributes = F.attributes_of(record)
        arguments = F.arguments_of(record)
        if tag in (P.LITERAL, P.CONSTANT):
            if "text" in attributes:  # its spelling, as written
                return attributes["text"], _UNARY if attributes["text"].startswith("-") else _PRIMARY
            if tag == P.LITERAL:
                return _constant(attributes["value"])
            if "singleton" in attributes:
                return attributes["singleton"], _PRIMARY
            parts = attributes["complex"].attributes  # a complex number's, `Expressions.Python.Python3.Complex`
            return _constant(complex(parts.get("real", 0.0), parts["imag"]))
        if tag in ("error", "missing"):
            return F.invalid_text(P.DIALECT, tag, attributes), _PRIMARY
        if tag in _IMPORTS:
            raise ValueError("an import can only enclose the whole expression")
        family = _texts()
        if tag in family:  # a kind of a sublanguage of its family, as its dialect's `Text` writes it
            return family[tag](self, F.node(tag, record))
        return getattr(self, f"_{tag}")(attributes, arguments)

    def _variable(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return attributes["name"], _PRIMARY

    def _concatenatedstring(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return " ".join(self.write(argument, _PRIMARY) for argument in arguments), _PRIMARY

    def _string(self, attributes: dict[str, Any], arguments: tuple[Any, ...], prefix: str) -> tuple[str, int]:
        quote = attributes.get("quote", "'")
        return f"{attributes.get('prefix', prefix)}{quote}{self.values(attributes, list(arguments))}{quote}", _PRIMARY

    def _joinedstr(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._string(attributes, arguments, "f")

    def _templatestr(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._string(attributes, arguments, "t")

    def values(self, attributes: dict[str, Any], terms: list[Any]) -> str:
        """An f-string's, a t-string's or a format spec's text and fields, as written: each field's terms taken from
        `terms` in turn."""
        written = []
        for part in _parts(attributes.get("values")):
            if part.kind == "stringtext":
                written.append(part.attributes["spelling"])
                continue
            value, mine = terms[0], terms[1:part.size]
            del terms[:part.size]
            field = part.attributes
            if "text" in field:  # the field's expression as written, `=` among it where it is a debug field
                expression = field["text"]
            else:
                expression = self.write(value, _IF) + ("=" if field.get("debug") else "")
                expression = f" {expression}" if expression.startswith("{") else expression
            conversion = f"!{field['conversion']}" if "conversion" in field else ""
            spec = f":{self.values(field['format_spec'].attributes, mine)}" if "format_spec" in field else ""
            written.append(f"{{{expression}{conversion}{spec}}}")
        return "".join(written)

    def _parenthesized(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"({self.write(arguments[0], _YIELD)})", _PRIMARY

    def _tuple(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"({self.elements(arguments)})", _PRIMARY

    def elements(self, arguments: tuple[Any, ...]) -> str:
        """A tuple's elements, a trailing comma after one alone."""
        texts = [self.element(argument) for argument in arguments]
        return f"{texts[0]}," if len(texts) == 1 else ", ".join(texts)

    def _list(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"[{', '.join(self.element(argument) for argument in arguments)}]", _PRIMARY

    def _set(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"{{{', '.join(self.element(argument) for argument in arguments)}}}", _PRIMARY

    def _dict(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        items = [f"**{self.write(arguments[i + 1], _BITOR)}" if arguments[i] is None
                 else f"{self.element(arguments[i])}: {self.element(arguments[i + 1])}"
                 for i in range(0, len(arguments), 2)]
        return f"{{{', '.join(items)}}}", _PRIMARY

    def clauses(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> str:
        """A comprehension's `for` clauses, after its element: each `async for target in iter if condition ...`."""
        written, i = [], 0
        for part in _parts(attributes.get("generators")):
            target = part.attributes.get("target")
            size = 0 if target is None else target.size
            iterable, conditions = arguments[i], arguments[i + 1:i + part.size - size]
            terms = arguments[i + part.size - size:i + part.size]
            i += part.size
            asynchronous = "async " if part.attributes.get("is_async") else ""
            target_text = self.target(target, terms, bare=True)
            written.append(f" {asynchronous}for {target_text} in {self.write(iterable, _OR)}"
                           + "".join(f" if {self.write(condition, _OR)}" for condition in conditions))
        return "".join(written)

    def _comprehension(self, attributes: dict[str, Any], arguments: tuple[Any, ...], lead: int, opening: str,
                       closing: str) -> tuple[str, int]:
        element = arguments[1]  # its body, after Let's empty value
        if lead == 3:  # a dictcomp: its value, its body, then its key
            head = f"**{self.write(arguments[2], _BITOR)}" if element is None else \
                f"{self.element(arguments[2])}: {self.element(element)}"
        else:
            head = self.element(element)
        return f"{opening}{head}{self.clauses(attributes, arguments[lead:])}{closing}", _PRIMARY

    def _listcomp(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._comprehension(attributes, arguments, 2, "[", "]")

    def _setcomp(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._comprehension(attributes, arguments, 2, "{", "}")

    def _dictcomp(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._comprehension(attributes, arguments, 3, "{", "}")

    def _generatorexp(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return self._comprehension(attributes, arguments, 2, "(", ")")

    def _yield(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return ("yield" if arguments[0] is None else f"yield {self.element(arguments[0])}"), _YIELD

    def _yieldfrom(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"yield from {self.element(arguments[0])}", _YIELD

    def _await(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"await {self.write(arguments[0], _PRIMARY)}", _AWAIT

    def _attribute(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        value = self.write(arguments[0], _PRIMARY)
        if value.isdigit():  # an int's `.` would be its decimal point
            value = f"({value})"
        return f"{value}.{attributes['attr']}", _PRIMARY

    def index(self, node: Any) -> str:
        """A subscript's index: a slice, or a tuple of indices without its parentheses."""
        tag, record = F.kind_of(node)
        if tag == P.SLICE:
            return self._slice({}, F.arguments_of(record))[0]
        if tag == P.TUPLE:
            texts = [self.index(argument) for argument in F.arguments_of(record)]
            return f"{texts[0]}," if len(texts) == 1 else ", ".join(texts) if texts else "()"
        return self.element(node)

    def _subscript(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"{self.write(arguments[0], _PRIMARY)}[{self.index(arguments[1])}]", _PRIMARY

    def _slice(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        lower, upper, step = (self.element(a) if a is not None else "" for a in arguments)
        return f"{lower}:{upper}" + (f":{step}" if step else ""), _PRIMARY

    def _call(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        keywords = _parts(attributes.get("keywords"))
        positional = arguments[1:len(arguments) - len(keywords)]
        values = arguments[len(arguments) - len(keywords):]
        if len(positional) == 1 and not keywords and F.kind_of(positional[0])[0] == P.GENERATOREXP:
            texts = [self.text(positional[0])[0][1:-1]]  # a generator, the only argument, without its parentheses
        else:
            texts = [self.element(argument) for argument in positional]
        texts += [f"**{self.write(value, _BITOR)}" if "arg" not in part.attributes else
                  f"{part.attributes['arg']}={self.element(value)}" for part, value in zip(keywords, values)]
        return f"{self.write(arguments[0], _PRIMARY)}({', '.join(texts)})", _PRIMARY

    def _starred(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"*{self.write(arguments[0], _BITOR)}", _LAMBDA

    def _unaryop(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        if attributes["op"] == "not":
            return f"not {self.write(arguments[0], _NOT)}", _NOT
        return f"{attributes['op']}{self.write(arguments[0], _UNARY)}", _UNARY

    def _binop(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        op = attributes["op"]
        if op == "**":  # right-associative, binding tighter than unary operators on its left
            return f"{self.write(arguments[0], _AWAIT)} ** {self.write(arguments[1], _UNARY)}", _POWER
        level = _BINOP_LEVELS[op]
        return f"{self.write(arguments[0], level)} {op} {self.write(arguments[1], level + 1)}", level

    def _compare(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        links = [f" {part.attributes['op']} {self.write(argument, _COMPARE + 1)}"
                 for part, argument in zip(_parts(attributes["comparisons"]), arguments[1:])]
        return self.write(arguments[0], _COMPARE + 1) + "".join(links), _COMPARE

    def _boolop(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        level = _AND if attributes["op"] == "and" else _OR
        return f" {attributes['op']} ".join(self.write(argument, level + 1) for argument in arguments), level

    def target(self, target: F.Part | None, terms: tuple[Any, ...], bare: bool = False) -> str:
        """A target, a pattern as a form reads it (its part and its terms), written as the term of its kind; with
        `bare`, a tuple without its parentheses, as a `for` clause writes it."""
        if target is None:
            return ""
        if target.kind in F.INVALID_KINDS:  # invalid syntax where a target stands, as written
            return F.invalid_text(P.DIALECT, target.kind, target.attributes)
        if bare and target.kind == P.TUPLE:
            return self.elements(terms)
        text, precedence = getattr(self, f"_{target.kind}")(target.attributes, terms)
        return text if precedence >= _BITOR else f"({text})"

    def _namedexpr(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        target = attributes.get("target")
        return f"{self.target(target, arguments[2:])} := {self.element(arguments[0])}", _NAMED  # its value, Let's empty body

    def _ifexp(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        body, test, orelse = arguments
        return f"{self.write(body, _OR)} if {self.write(test, _OR)} else {self.write(orelse, _LAMBDA)}", _IF

    def parameters(self, attributes: dict[str, Any], defaults: list[Any]) -> str:
        """A lambda's parameters, `a, /, b=1, *c, d, **e`, each default taken from `defaults` in turn (after its
        annotation, which a lambda's parameter has none of)."""
        held = attributes.get("args")
        if held is None:
            return ""
        groups = held.attributes

        def parameter(part: F.Part, prefix: str = "") -> str:
            default = defaults[1]
            del defaults[:part.size]
            return prefix + part.attributes.get("arg", "") + ("" if default is None else f"={self.element(default)}")

        written = [parameter(part) for part in _parts(groups.get("posonlyargs"))]
        written += ["/"] if written else []
        written += [parameter(part) for part in _parts(groups.get("args"))]
        if "vararg" in groups:
            written.append(parameter(groups["vararg"], "*"))
        elif "kwonlyargs" in groups:
            written.append("*")
        written += [parameter(part) for part in _parts(groups.get("kwonlyargs"))]
        if "kwarg" in groups:
            written.append(parameter(groups["kwarg"], "**"))
        return " " + ", ".join(written)

    def _lambda(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        parameters = self.parameters(attributes, list(arguments[2:]))  # Let's empty value, its body, then its defaults
        return f"lambda{parameters}: {self.write(arguments[1], _LAMBDA)}", _LAMBDA

    def _let(self, attributes: dict[str, Any], arguments: tuple[Any, ...]) -> tuple[str, int]:
        return f"(lambda {attributes['name']}: {self.write(arguments[1], _LAMBDA)})({self.element(arguments[0])})", _PRIMARY


_TEXTS: list[dict[str, Any]] = []


def _texts() -> dict[str, Any]:
    """How the kinds of its family's sublanguages are written: each dialect's `Text` module's `TEXTS`, merged, read when
    first needed."""
    if not _TEXTS:
        from ..Patterns import Text as Patterns
        from ..Types import Text as Types
        _TEXTS.append({**Types.TEXTS, **Patterns.TEXTS})
    return _TEXTS[0]


def ToText(expression: Any) -> str:
    """The expression, a term of any dialect of the Python family, as Python source: one line per import around it,
    then the expression; a pattern as a `case` writes it, an open sequence bare."""
    lines = []
    node = F.term(expression)
    tag, record, _ = P.DIALECT.kind(node)
    while tag in _IMPORTS:
        lines.append(_import_line(tag, F.attributes_of(record)))
        node = F.arguments_of(record)[-1]  # its body
        tag, record, _ = P.DIALECT.kind(node)
    return "\n".join([*lines, _Printer().write(node, _LAMBDA)])  # a named expression or a yield in parentheses


# --- Parsing ---

_AST_OPERATORS: dict[type, str] = {
    ast.Eq: "==", ast.NotEq: "!=", ast.Lt: "<", ast.LtE: "<=", ast.Gt: ">", ast.GtE: ">=", ast.And: "and",
    ast.Or: "or", ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.MatMult: "@", ast.Div: "/", ast.FloorDiv: "//",
    ast.Mod: "%", ast.Pow: "**", ast.Not: "not", ast.USub: "-", ast.UAdd: "+", ast.BitAnd: "&", ast.BitOr: "|",
    ast.BitXor: "^", ast.LShift: "<<", ast.RShift: ">>", ast.Invert: "~", ast.In: "in", ast.NotIn: "not in",
    ast.Is: "is", ast.IsNot: "is not",
}
_TEMPLATE = getattr(ast, "TemplateStr", None)  # Python 3.14 on
_STRINGS = tuple(kind for kind in (ast.JoinedStr, _TEMPLATE) if kind is not None)


def _unsupported(node: ast.AST, reason: str) -> ValueError:
    return ValueError(f"cannot parse {ast.unparse(node)!r}: {reason}")


class _Source:
    """Source text, and the offsets in it of `ast`'s positions (lines from 1, columns in UTF-8 bytes)."""

    def __init__(self, text: str):
        self.text = text
        self.starts = [0]
        for line in text.splitlines(keepends=True):
            self.starts.append(self.starts[-1] + len(line))

    def offset(self, line: int, column: int) -> int:
        start = self.starts[line - 1]
        return start + len(self.text[start:].encode("utf-8")[:column].decode("utf-8"))

    def span(self, node: ast.AST) -> tuple[int, int]:
        return self.offset(node.lineno, node.col_offset), self.offset(node.end_lineno, node.end_col_offset)  # type: ignore[attr-defined, arg-type]

    def segment(self, node: ast.AST) -> str:
        start, end = self.span(node)
        return self.text[start:end]


def _pieces(segment: str) -> list[str]:
    """The string literals adjacent in `segment`, each as written: a string or bytes, an f-string or a t-string."""
    wrapped = f"({segment})"  # within parentheses, lines join and indentation is not read
    lines = _Source(wrapped)
    pieces, depth, start = [], 0, 0
    for token in tokenize.generate_tokens(io.StringIO(wrapped).readline):
        name = tokenize.tok_name[token.type]
        if name in ("FSTRING_START", "TSTRING_START"):
            depth += 1
            start = lines.offset(*token.start) if depth == 1 else start
        elif name in ("FSTRING_END", "TSTRING_END"):
            depth -= 1
            if depth == 0:
                pieces.append(wrapped[start:lines.offset(*token.end)])
        elif name == "STRING" and depth == 0:
            pieces.append(token.string)
    return pieces


def _quoted(text: str) -> dict[str, Any]:
    """A string literal's prefix and quotes, as written."""
    prefix = text[:len(text) - len(text.lstrip("rRbBuUfFtT"))]
    body = text[len(prefix):]
    quote = body[:3] if body[:3] in ("'''", '"""') else body[0]
    return {"prefix": prefix, "quote": quote} if prefix else {"quote": quote}


def _number(text: str, value: Any) -> dict[str, Any]:
    """What a number's text encodes: an int's base, and digit separators."""
    attributes: dict[str, Any] = {}
    if type(value) is int:
        attributes["base"] = {"0x": 16, "0o": 8, "0b": 2}.get(text[:2].lower(), 10)
    if "_" in text:
        attributes["separators"] = True
    return attributes


def _literal(value: Any, text: str) -> P.Writer:
    """A constant with its spelling: a literal of a basic scalar, with what its text encodes, or Python3's own."""
    if value is None or value is Ellipsis or type(value) is complex:
        spelling = {"text": text, "separators": True if "_" in text else None}
        if type(value) is complex:
            return P._kind(P.CONSTANT, spelling, {}, None, {"complex": P._complex(value)})
        return P._kind(P.CONSTANT, {"singleton": "None" if value is None else "...", **spelling}, {})
    encoded = _quoted(text) if type(value) in (str, bytes) else _number(text, value) if type(value) is not bool else {}

    def record(r: Any) -> Any:
        r.value(lambda p: p.as_scalar(value)).text(text)
        for name, held in encoded.items():
            getattr(r, name)(held)
        return r

    return P.Writer(lambda u: getattr(u, P.LITERAL)(record))


class _Reader:
    """Reads `ast`'s expressions into Python3's writers, keeping each literal's spelling from `source`."""

    def __init__(self, source: _Source):
        self.source = source

    def expression(self, node: ast.expr) -> Any:
        if isinstance(node, (ast.Constant, *_STRINGS)) and (
                isinstance(node, _STRINGS) or type(node.value) in (str, bytes)):
            pieces = _pieces(self.source.segment(node))
            if len(pieces) > 1:
                return P.concatenatedstring(*(_piece(piece) for piece in pieces))
        if isinstance(node, ast.Constant):
            return _literal(node.value, self.source.segment(node))
        if isinstance(node, _STRINGS):
            return self.string(node, self.source)
        return getattr(self, f"_{type(node).__name__}")(node)  # every other kind of `ast.expr`

    def string(self, node: Any, source: _Source) -> P.Writer:
        """An f-string or a t-string: its prefix and quotes, and its text and fields as written."""
        text = source.segment(node)
        encoded = _quoted(text)
        start, end = source.span(node)
        start += len(encoded.get("prefix", "")) + len(encoded["quote"])
        values = self.values(node.values, start, end - len(encoded["quote"]))
        write = P.joinedstr if isinstance(node, ast.JoinedStr) else P.templatestr
        return write(values, encoded.get("prefix", ""), encoded["quote"])

    def values(self, values: list[ast.expr], start: int, end: int) -> list[Any]:
        """The text and fields between `start` and `end`: each field located by `ast`, the text between them as
        written."""
        found: list[Any] = []
        for value in values:
            if isinstance(value, ast.Constant):
                continue  # the text: read as written, between the fields
            field_start, field_end = self.source.span(value)
            if field_start > start:
                found.append(self.source.text[start:field_start])
            found.append(self.field(value, field_start, field_end))
            start = field_end
        if end > start:
            found.append(self.source.text[start:end])
        return found

    def field(self, node: Any, start: int, end: int) -> P.Helper:
        """`{value=!conversion:format_spec}`: its expression as written, with `=` where it is a debug field."""
        text = self.source.text
        position = end_of_value = self.source.span(node.value)[1]
        while text[position] in " \t\n=":  # whitespace, and a debug field's `=`
            position += 1
        written = text[start + 1:position]
        debug = "=" in text[end_of_value:position]
        conversion = text[position + 1] if text[position] == "!" else None
        spec = None
        if node.format_spec is not None:
            spec_start, spec_end = self.source.span(node.format_spec)
            spec = tuple(self.values(node.format_spec.values, spec_start + 1 if text[spec_start] == ":" else spec_start,
                                     spec_end))
        write = P.formattedvalue if isinstance(node, ast.FormattedValue) else P.interpolation
        return write(self.expression(node.value), conversion, spec, debug, written)

    def _Name(self, node: ast.Name) -> Any:
        return P.name(node.id)

    def _Attribute(self, node: ast.Attribute) -> Any:
        return P.attribute(self.expression(node.value), node.attr)

    def _Subscript(self, node: ast.Subscript) -> Any:
        return P.subscript(self.expression(node.value), self.expression(node.slice))

    def _Slice(self, node: ast.Slice) -> Any:
        return P.slice_(*(None if part is None else self.expression(part) for part in (node.lower, node.upper, node.step)))

    def _Starred(self, node: ast.Starred) -> Any:
        return P.starred(self.expression(node.value))

    def _Tuple(self, node: ast.Tuple) -> Any:
        return P.tuple_(*(self.expression(element) for element in node.elts))

    def _List(self, node: ast.List) -> Any:
        return P.list_(*(self.expression(element) for element in node.elts))

    def _Set(self, node: ast.Set) -> Any:
        return P.set_(*(self.expression(element) for element in node.elts))

    def _Dict(self, node: ast.Dict) -> Any:
        return P.dict_(*((None if key is None else self.expression(key), self.expression(value))
                         for key, value in zip(node.keys, node.values)))

    def comprehensions(self, generators: list[ast.comprehension]) -> list[P.Helper]:
        return [P.comprehension(self.expression(clause.target), self.expression(clause.iter),
                                [self.expression(condition) for condition in clause.ifs], bool(clause.is_async))
                for clause in generators]

    def _ListComp(self, node: ast.ListComp) -> Any:
        return P.listcomp(self.expression(node.elt), *self.comprehensions(node.generators))

    def _SetComp(self, node: ast.SetComp) -> Any:
        return P.setcomp(self.expression(node.elt), *self.comprehensions(node.generators))

    def _DictComp(self, node: ast.DictComp) -> Any:
        value = None if node.value is None else self.expression(node.value)  # type: ignore[redundant-expr]
        return P.dictcomp(self.expression(node.key), value, *self.comprehensions(node.generators))

    def _GeneratorExp(self, node: ast.GeneratorExp) -> Any:
        return P.generatorexp(self.expression(node.elt), *self.comprehensions(node.generators))

    def _Yield(self, node: ast.Yield) -> Any:
        return P.yield_(None if node.value is None else self.expression(node.value))

    def _YieldFrom(self, node: ast.YieldFrom) -> Any:
        return P.yieldfrom(self.expression(node.value))

    def _Await(self, node: ast.Await) -> Any:
        return P.await_(self.expression(node.value))

    def _Call(self, node: ast.Call) -> Any:
        if isinstance(node.func, ast.Lambda) and len(node.args) == 1 and not node.keywords:  # the let's idiom
            parameters = node.func.args
            if len(parameters.args) == 1 and not (parameters.vararg or parameters.kwarg or parameters.kwonlyargs
                                                  or parameters.posonlyargs or parameters.defaults):
                return P.let_(parameters.args[0].arg, self.expression(node.args[0]), self.expression(node.func.body))
        return P.call(self.expression(node.func), *(self.expression(argument) for argument in node.args),
                      *(P.keyword(keyword.arg, self.expression(keyword.value)) for keyword in node.keywords))

    def _Compare(self, node: ast.Compare) -> Any:
        operands = [self.expression(operand) for operand in node.comparators]
        ops = [_AST_OPERATORS[type(op)] for op in node.ops]
        return P.compare(ops[0], self.expression(node.left), operands[0], *zip(ops[1:], operands[1:]))

    def _BoolOp(self, node: ast.BoolOp) -> Any:
        return P.boolop(_AST_OPERATORS[type(node.op)], *(self.expression(value) for value in node.values))

    def _BinOp(self, node: ast.BinOp) -> Any:
        return P.binop(_AST_OPERATORS[type(node.op)], self.expression(node.left), self.expression(node.right))

    def _UnaryOp(self, node: ast.UnaryOp) -> Any:
        return P.unaryop(_AST_OPERATORS[type(node.op)], self.expression(node.operand))

    def _IfExp(self, node: ast.IfExp) -> Any:
        return P.ifexp(self.expression(node.test), self.expression(node.body), self.expression(node.orelse))

    def _NamedExpr(self, node: ast.NamedExpr) -> Any:
        return P.namedexpr(self.expression(node.target), self.expression(node.value))

    def _Lambda(self, node: ast.Lambda) -> Any:
        parameters = node.args
        positional = [*parameters.posonlyargs, *parameters.args]
        defaults = [None] * (len(positional) - len(parameters.defaults)) + list(parameters.defaults)

        def arg(parameter: ast.arg, default: Any) -> P.Helper:
            return P.arg(parameter.arg, None if default is None else self.expression(default))

        written = [arg(parameter, default) for parameter, default in zip(positional, defaults)]
        return P.lambda_(self.expression(node.body), written[len(parameters.posonlyargs):],
                         posonlyargs=written[:len(parameters.posonlyargs)],
                         vararg=None if parameters.vararg is None else arg(parameters.vararg, None),
                         kwonlyargs=tuple(arg(parameter, default) for parameter, default in
                                          zip(parameters.kwonlyargs, parameters.kw_defaults)),
                         kwarg=None if parameters.kwarg is None else arg(parameters.kwarg, None))


def _piece(piece: str) -> Any:
    """One of adjacent string literals, read alone."""
    source = _Source(piece)
    node = ast.parse(piece, mode="eval").body
    if isinstance(node, ast.Constant):
        return _literal(node.value, piece)
    return _Reader(source).string(node, source)


def FromText(source: str) -> P.Writer:
    """The writer of the expression that Python `source` writes: `import` and `from ... import` statements, then one
    expression, every literal with its spelling."""
    statements = ast.parse(source).body
    if not statements or not isinstance(statements[-1], ast.Expr):
        raise ValueError("the source must end with an expression")
    result = _Reader(_Source(source)).expression(statements[-1].value)
    for statement in reversed(statements[:-1]):
        if isinstance(statement, ast.Import):
            for alias in reversed(statement.names):
                result = P.import_(alias.name, result, alias.asname)
        elif isinstance(statement, ast.ImportFrom) and statement.level == 0 and statement.module:
            for alias in reversed(statement.names):
                if alias.name == "*":
                    raise _unsupported(statement, "import * binds names that cannot be known")
                result = P.importfrom(statement.module, alias.name, result, alias.asname)
        else:
            raise _unsupported(statement, "only imports may precede the expression")
    return result
