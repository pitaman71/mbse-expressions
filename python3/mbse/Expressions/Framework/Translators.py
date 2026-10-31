"""Translators: bidirectional, pairwise translation between dialects, by co-traversal.

A `Translator` between two dialects, `left` and `right`, translates `forward` (left to right) and `backward`. Each pair
of dialects has its own, specialized to what the two have in common, and is declared as a list of rules:

- `Rule(left, right)` pairs two `Pattern`s, each a form with `Hole`s: `Pattern('call', A, B, callable='eq')` matches
  the Basic `eq(a, b)` and binds the holes `A` and `B` to its arguments. A hole in an attribute binds the attribute's
  native value, and may restrict its type: `Hole('K', str)`. A rule applies in both directions unless its
  `direction` is 'forward' or 'backward'.
- `Inline(kind, side)` translates a binding of one side, which the other has no counterpart for, by substituting its
  value for its name in its body. The value is translated once, and written at every use.
- `Elide(kind, side)` translates an import of one side, which the other has no counterpart for, as its body: what the
  import brought in must be translated by other rules (a NumPy call, say), or it has no counterpart.
- `Convert(left_kind, right_kind, forward, backward)` translates literals whose values the two sides write
  differently: a `left_kind` literal is the `right_kind` literal of the attributes `forward(attributes)` gives, and
  `backward` maps the other way. A function gives None for the attributes it has no counterpart for (a value domain
  the other side lacks, say). Conversions are tried after the rules of their kind.
- `Elementwise(left_kind, right_kind, left_attributes, right_attributes)` translates a term of any number of arguments,
  a container constructor, into the other side's, its arguments translated in order: a `left_kind` term whose
  attributes are `left_attributes` is the `right_kind` term of `right_attributes` (Basic's `list(a, b)` is Excel's
  `HSTACK(a, b)`), both ways unless its `direction` says otherwise.
- `Prelude(pattern, side)` adds an import to what is translated to `side`: `pattern` is the import with its body as
  its one argument, a hole, and it wraps the translation if the translation refers to a name the import binds, e.g.
  `import numpy as np` around an expression that uses `np`.

A pattern names a kind by its branch's tag (`call`, `python_binop`) and its attributes and arguments as `Terms.form`
reads them: a hole in an argument binds the term in that place, slots then variadic arguments, and a fixed attribute
must be set to an equal scalar, with every attribute of the term matched (an attribute that is not set is absent).

Translating co-traverses: at each term, the first rule whose source pattern matches (the most specific first: the one
with the most terms and fixed attributes) is applied by traversing the pattern and the term in lockstep, binding holes
to arguments and attributes, a hole bound twice to equal terms (`Terms.same`) or values; then its target pattern is
instantiated with the bound attributes and the translations of the bound arguments. A translation is a `Terms.Writer`
of the target dialect's term, which its caller writes where it wants it, in a transaction: `store.Expressions.Framework.
Term(translator.forward(term))`. A term is a nested value, so a let's value inlined at each use of its name is written
at each. Pairs of corresponding source terms and target writers are appended to `trace`, if given, each term after the
terms within it. A term that no rule matches raises `ValueError` naming it. A translation preserves the expression's
form, not always its value: dialects evaluate by their own rules (see each dialect's `Evaluators`).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from typing import Any, Protocol, runtime_checkable

from . import Symbolics, Terms

__all__ = ["Translator", "Pairwise", "Rule", "Inline", "Elide", "Convert", "Elementwise", "Prelude", "Pattern", "Hole",
           "holes", "renames"]


@runtime_checkable
class Translator(Protocol):
    """Translates expressions between two dialects, in both directions."""

    def left(self) -> Terms.Dialect: ...

    def right(self) -> Terms.Dialect: ...

    def forward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Terms.Writer:
        """`expression` (a term, or what `Terms.term` reads one from), of the left dialect, in the right one: a
        writer."""
        ...

    def backward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Terms.Writer:
        """`expression`, of the right dialect, in the left one: a writer."""
        ...

    def inverse(self) -> Translator:
        """The same translator with its sides swapped."""
        ...


class Hole:
    """A named hole in a pattern. In an argument position it matches an expression; in an attribute it matches a
    native value, of one of `types` if any are given."""

    def __init__(self, name: str, *types: type):
        self.name, self.types = name, types

    def __repr__(self) -> str:
        return self.name


def holes(*names: str) -> tuple[Hole, ...]:
    """One untyped hole per name."""
    return tuple(Hole(name) for name in names)


class Pattern:
    """A form with holes: `kind`, `arguments` (patterns or holes) and `attributes` (natives or holes)."""

    def __init__(self, kind: str, *arguments: Pattern | Hole, **attributes: Any):
        self.kind, self.arguments, self.attributes = kind, arguments, attributes

    def size(self) -> int:
        """How specific the pattern is: its terms and fixed attributes."""
        fixed = sum(not isinstance(value, Hole) for value in self.attributes.values())
        return 1 + fixed + sum(a.size() for a in self.arguments if isinstance(a, Pattern))

    def holes(self) -> dict[str, str]:
        """The holes in the pattern, by name: 'argument' or 'attribute'."""
        found = {value.name: "attribute" for value in self.attributes.values() if isinstance(value, Hole)}
        for argument in self.arguments:
            found.update(argument.holes() if isinstance(argument, Pattern) else {argument.name: "argument"})
        return found

    def __repr__(self) -> str:
        parts = [*map(repr, self.arguments), *(f"{k}={v!r}" for k, v in self.attributes.items())]
        return f"{self.kind}({', '.join(parts)})"


class Rule:
    """Two patterns that translate into each other; `direction` 'both', 'forward' (left to right only) or
    'backward'."""

    def __init__(self, left: Pattern, right: Pattern, direction: str = "both"):
        if direction not in ("both", "forward", "backward"):
            raise ValueError(f"direction must be 'both', 'forward' or 'backward', got {direction!r}")
        self.left, self.right, self.direction = left, right, direction
        sides = {"forward": (left, right), "backward": (right, left)}
        for name, (source, target) in sides.items():
            if direction in ("both", name):
                given, needed = source.holes(), target.holes()
                for hole, role in needed.items():
                    if given.get(hole) != role:
                        raise ValueError(f"{target!r} needs the {role} hole {hole}, which {source!r} does not bind")


class Inline:
    """Translates the bindings of `kind`, on `side` ('left' or 'right'), by substituting their values."""

    def __init__(self, kind: str, side: str):
        if side not in ("left", "right"):
            raise ValueError(f"side must be 'left' or 'right', got {side!r}")
        self.kind, self.side = kind, side


class Elide:
    """Translates the imports of `kind`, on `side` ('left' or 'right'), as their bodies."""

    def __init__(self, kind: str, side: str):
        if side not in ("left", "right"):
            raise ValueError(f"side must be 'left' or 'right', got {side!r}")
        self.kind, self.side = kind, side


class Convert:
    """Translates `left_kind` literals into `right_kind` ones by `forward(attributes)`, and back by `backward`; each
    gives the other side's attributes, or None where it has no counterpart."""

    def __init__(self, left_kind: str, right_kind: str, forward: Callable[[dict[str, Any]], dict[str, Any] | None],
                 backward: Callable[[dict[str, Any]], dict[str, Any] | None]):
        self.left_kind, self.right_kind, self.forward, self.backward = left_kind, right_kind, forward, backward


class Elementwise:
    """Translates `left_kind` terms of `left_attributes` into `right_kind` terms of `right_attributes`, and back, each
    argument translated in turn, whatever their number; `direction` 'both', 'forward' or 'backward'."""

    def __init__(self, left_kind: str, right_kind: str, left_attributes: Mapping[str, Any] | None = None,
                 right_attributes: Mapping[str, Any] | None = None, direction: str = "both"):
        if direction not in ("both", "forward", "backward"):
            raise ValueError(f"direction must be 'both', 'forward' or 'backward', got {direction!r}")
        self.left_kind, self.right_kind, self.direction = left_kind, right_kind, direction
        self.left_attributes, self.right_attributes = dict(left_attributes or {}), dict(right_attributes or {})


class Prelude:
    """Wraps translations to `side` ('left' or 'right') in the import `pattern` when they refer to a name it binds."""

    def __init__(self, pattern: Pattern, side: str):
        if side not in ("left", "right"):
            raise ValueError(f"side must be 'left' or 'right', got {side!r}")
        if len(pattern.arguments) != 1 or not isinstance(pattern.arguments[0], Hole) or any(
                isinstance(value, Hole) for value in pattern.attributes.values()):
            raise ValueError(f"a prelude is an import whose one argument is a hole, got {pattern!r}")
        self.pattern, self.side = pattern, side


def renames(left_kind: str, left_attribute: str, right_kind: str, right_attribute: str, names: Mapping[str, str],
            arity: int) -> list[Rule]:
    """Rules for operators that differ only in name: each `left` name applied to `arity` arguments is the `right`
    name applied to the same arguments, e.g. `renames('call', 'callable', 'python_compare', 'operator', {'eq': '=='}, 2)`."""
    arguments = holes(*(f"A{i}" for i in range(arity)))
    return [Rule(Pattern(left_kind, *arguments, **{left_attribute: a}),
                 Pattern(right_kind, *arguments, **{right_attribute: b})) for a, b in names.items()]


def _same_native(a: Any, b: Any) -> bool:
    return Terms._same_native(a, b)


def _label(dialect: Terms.Dialect, tag: str) -> str:
    """A kind's tag as a message names it: without its dialect's prefix (`python_call` is Python's `call`)."""
    prefix = dialect.name().lower() + "_"
    return tag[len(prefix):] if tag.startswith(prefix) else tag


def _describe(dialect: Terms.Dialect, node: Any) -> str:
    tag, record, kind = dialect.kind(node)
    label = f"{dialect.name()} {_label(dialect, tag)}"
    if kind.role in (Terms.APPLICATION, Terms.QUANTIFIER) and kind.operator is not None:
        return f"{label} {Terms.operator_of(node, kind)!r}"
    if kind.role == Terms.LITERAL:
        typed = kind.typed(record) if kind.typed is not None else None
        return f"{label} {Terms.attributes_of(record).get('value')!r}" + ("" if typed is None else f" of {typed.name()}")
    return label


class _Built:
    """A translated term: the writer of its target term, and the names it needs from its scope."""

    __slots__ = ("writer", "free")

    def __init__(self, writer: Terms.Writer, free: frozenset[str]):
        self.writer, self.free = writer, free


class _Direction:
    """Translation in one direction: the co-traversal."""

    def __init__(self, source: Terms.Dialect, target: Terms.Dialect,
                 rules: Sequence[tuple[Pattern, Pattern]], inlines: Iterable[str], elides: Iterable[str] = (),
                 preludes: Sequence[Pattern] = (), converts: Sequence[tuple[str, str, Callable[..., Any]]] = (),
                 elementwise: Sequence[tuple[str, dict[str, Any], str, dict[str, Any]]] = ()):
        self.source, self.target, self.inlines = source, target, frozenset(inlines)
        self.elementwise: dict[str, list[tuple[dict[str, Any], str, dict[str, Any]]]] = {}
        for kind, attributes, target_kind, target_attributes in elementwise:
            self.elementwise.setdefault(kind, []).append((attributes, target_kind, target_attributes))
        self.elides, self.preludes = frozenset(elides), list(preludes)
        self.converts: dict[str, list[tuple[str, Callable[..., Any]]]] = {}
        for kind, target_kind, convert in converts:
            for dialect, name in ((source, kind), (target, target_kind)):
                literal = dialect.kinds().get(name)
                if literal is None or literal.role != Terms.LITERAL:
                    raise ValueError(f"a conversion translates literals, and {dialect.name()} {name!r} is not one")
            self.converts.setdefault(kind, []).append((target_kind, convert))
        self.rules: dict[str, list[tuple[Pattern, Pattern]]] = {}
        for pair in sorted(rules, key=lambda pair: -pair[0].size()):
            self.rules.setdefault(pair[0].kind, []).append(pair)

    def __call__(self, expression: Any, trace: list[tuple[Any, Any]] | None) -> Terms.Writer:
        result = _Run(self, trace).translate(Terms.term(expression), {})
        for pattern in reversed(self.preludes):
            kind = self.target.kinds()[pattern.kind]
            names = kind.names(pattern.attributes) if kind.names is not None else ()
            if set(names) & result.free:
                result = self.build(Terms.Form(pattern.kind, dict(pattern.attributes), (result,)))
        return result.writer

    def build(self, form: Terms.Form) -> _Built:
        """The target term of a form whose arguments are translated terms, and the names it needs, as
        `Symbolics.free` reads them."""
        kind = self.target.kinds()[form.kind]
        name = form.attributes.get("name")
        frees = [argument.free for argument in form.arguments]
        if kind.role == Terms.REFERENCE:
            free = frozenset({name} if kind.lexical and name not in kind.ambient else ())
        elif kind.role in (Terms.BINDING, Terms.QUANTIFIER):
            free = frozenset(frees[0]).union(*(f - {name} for f in frees[1:]))
        else:
            names = kind.names(form.attributes) if kind.role == Terms.IMPORT and kind.names is not None else ()
            free = frozenset().union(*frees) - set(names)
        writer = self.target.make(Terms.Form(form.kind, form.attributes, tuple(a.writer for a in form.arguments)))
        return _Built(writer, free)


class _Run:
    """One translation: its trace."""

    def __init__(self, direction: _Direction, trace: list[tuple[Any, Any]] | None):
        self.direction, self.trace = direction, trace

    def translate(self, node: Any, environment: dict[str, _Built]) -> _Built:
        result = self._translate(node, environment)
        if self.trace is not None:
            self.trace.append((node, result.writer))
        return result

    def _translate(self, node: Any, environment: dict[str, _Built]) -> _Built:
        tag, record, kind = self.direction.source.kind(node)
        name = Terms.name_of(node)
        if kind.role == Terms.REFERENCE and kind.lexical and name in environment:
            return environment[name]
        if tag in self.direction.elides:
            body = Terms.arguments_of(record)[-1]
            if body is None:
                raise ValueError(f"{Terms._article(_label(self.direction.source, tag))} needs a body")
            return self.translate(body, environment)
        if tag in self.direction.inlines:
            value, body = Terms.arguments_of(record)
            if value is None or body is None:
                raise ValueError(f"{Terms._article(_label(self.direction.source, tag))} needs a "
                                 f"{'value' if value is None else 'body'}")
            inner = {**environment, name: self.translate(value, environment)}
            return self.translate(body, inner)
        for source, target in self.direction.rules.get(tag, []):
            bindings: dict[str, Any] = {}
            if self._match(source, node, bindings):
                return self._instantiate(target, bindings, environment)
        for attributes, target_kind, target_attributes in self.direction.elementwise.get(tag, []):
            form = Terms.form(node)
            if None not in form.arguments and form.attributes.keys() == attributes.keys() and all(
                    _same_native(attributes[k], form.attributes[k]) for k in attributes):  # a mapping's empty key: none
                arguments = tuple(self.translate(argument, environment) for argument in form.arguments)
                return self.direction.build(Terms.Form(target_kind, dict(target_attributes), arguments))
        for target_kind, convert in self.direction.converts.get(tag, []):
            attributes = convert(Terms.attributes_of(record))
            if attributes is not None:
                return self.direction.build(Terms.Form(target_kind, attributes, ()))
        raise ValueError(f"{_describe(self.direction.source, node)} has no {self.direction.target.name()} counterpart")

    def _match(self, pattern: Pattern | Hole, node: Any, bindings: dict[str, Any]) -> bool:
        """Co-traverses `pattern` and `node`, binding the pattern's holes."""
        if isinstance(pattern, Hole):
            if node is None:
                return False
            if pattern.name in bindings:
                return Terms.same(bindings[pattern.name], node)
            bindings[pattern.name] = node
            return True
        if node is None:
            return False
        form = Terms.form(node)
        if form.kind != pattern.kind or form.attributes.keys() != pattern.attributes.keys():
            return False
        for name, expected in pattern.attributes.items():
            value = form.attributes[name]
            if not isinstance(expected, Hole):
                if not _same_native(expected, value):
                    return False
            elif expected.types and type(value) not in expected.types:
                return False
            elif expected.name in bindings and not _same_native(bindings[expected.name], value):
                return False
            else:
                bindings[expected.name] = value
        return len(form.arguments) == len(pattern.arguments) and all(
            self._match(p, argument, bindings) for p, argument in zip(pattern.arguments, form.arguments))

    def _instantiate(self, pattern: Pattern | Hole, bindings: dict[str, Any], environment: dict[str, _Built]) -> _Built:
        if isinstance(pattern, Hole):
            return self.translate(bindings[pattern.name], environment)
        attributes = {name: bindings[value.name] if isinstance(value, Hole) else value
                      for name, value in pattern.attributes.items()}
        arguments = tuple(self._instantiate(argument, bindings, environment) for argument in pattern.arguments)
        return self.direction.build(Terms.Form(pattern.kind, attributes, arguments))


class Pairwise:
    """A `Translator` between `left` and `right`, declared by `rules` (`Rule`s, `Inline`s, `Elide`s, `Convert`s,
    `Elementwise`s and `Prelude`s)."""

    def __init__(self, left: Terms.Dialect, right: Terms.Dialect,
                 rules: Sequence[Rule | Inline | Elide | Convert | Elementwise | Prelude]):
        self._left, self._right, self._rules = left, right, list(rules)
        pairs = [rule for rule in rules if isinstance(rule, Rule)]
        converts = [rule for rule in rules if isinstance(rule, Convert)]
        each = [rule for rule in rules if isinstance(rule, Elementwise)]

        def of(kind: type, side: str) -> list[Any]:
            return [rule for rule in rules if isinstance(rule, kind) and rule.side == side]

        self._forward = _Direction(left, right, [(r.left, r.right) for r in pairs if r.direction != "backward"],
                                   [i.kind for i in of(Inline, "left")], [e.kind for e in of(Elide, "left")],
                                   [p.pattern for p in of(Prelude, "right")],
                                   [(c.left_kind, c.right_kind, c.forward) for c in converts],
                                   [(e.left_kind, e.left_attributes, e.right_kind, e.right_attributes)
                                    for e in each if e.direction != "backward"])
        self._backward = _Direction(right, left, [(r.right, r.left) for r in pairs if r.direction != "forward"],
                                    [i.kind for i in of(Inline, "right")], [e.kind for e in of(Elide, "right")],
                                    [p.pattern for p in of(Prelude, "left")],
                                    [(c.right_kind, c.left_kind, c.backward) for c in converts],
                                    [(e.right_kind, e.right_attributes, e.left_kind, e.left_attributes)
                                     for e in each if e.direction != "forward"])

    def left(self) -> Terms.Dialect:
        return self._left

    def right(self) -> Terms.Dialect:
        return self._right

    def forward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Terms.Writer:
        return self._forward(expression, trace)

    def backward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Terms.Writer:
        return self._backward(expression, trace)

    def inverse(self) -> Pairwise:
        swapped = {"both": "both", "forward": "backward", "backward": "forward"}
        other = {"left": "right", "right": "left"}
        rules: list[Rule | Inline | Elide | Convert | Elementwise | Prelude] = [
            Rule(r.right, r.left, swapped[r.direction]) if isinstance(r, Rule)
            else Prelude(r.pattern, other[r.side]) if isinstance(r, Prelude)
            else Convert(r.right_kind, r.left_kind, r.backward, r.forward) if isinstance(r, Convert)
            else Elementwise(r.right_kind, r.left_kind, r.right_attributes, r.left_attributes, swapped[r.direction])
            if isinstance(r, Elementwise)
            else type(r)(r.kind, other[r.side]) for r in self._rules
        ]
        return Pairwise(self._right, self._left, rules)

    def __repr__(self) -> str:
        return f"<translator {self._left.name()} <-> {self._right.name()}>"
