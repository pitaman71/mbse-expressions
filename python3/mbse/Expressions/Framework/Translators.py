"""Translators: bidirectional, pairwise translation between dialects, by co-traversal.

A `Translator` between two dialects, `left` and `right`, translates `forward` (left to right) and `backward`. Each pair
of dialects has its own, specialized to what the two have in common, and is declared as a list of rules:

- `Rule(left, right)` pairs two `Pattern`s, each a form with `Hole`s: `Pattern('call', A, B, callable='eq')` matches
  the Patterns `eq(a, b)` and binds the holes `A` and `B` to its arguments. A hole in an attribute binds the attribute's
  native value, and may restrict its type: `Hole('K', str)`; so does a hole within a helper's attributes (a
  `Terms.Part`), such as a Python3 comprehension's target, a pattern. A rule applies in both directions unless its
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
  attributes are `left_attributes` is the `right_kind` term of `right_attributes` (Patterns' `list(a, b)` is Excel's
  `VSTACK(a, b)`), both ways unless its `direction` says otherwise.
- `Prelude(pattern, side)` adds an import to what is translated to `side`: `pattern` is the import with its body as
  its one argument, a hole, and it wraps the translation if the translation refers to a name the import binds, e.g.
  `import numpy as np` around an expression that uses `np`.

A pattern names a kind by its branch's tag in its dialect's `Term` (`call`, `binop`) and its attributes and arguments
as `Terms.form` reads them: a hole in an argument binds the term in that place, subterms then variadic arguments, and a
fixed attribute must be set to an equal scalar, with every attribute of the term matched (an attribute that is not set
is absent), but a literal's spelling (its kind's `spelling`: `text` and `problems`, and a Python literal's prefix,
quotes, base and digit separators), which is its own dialect's: a literal translates by its value, and one with no
value has no counterpart. A helper's structure is among a form's attributes (`Terms.Part`), so a pattern matches a
Python comparison's operators or a comprehension's clauses as attributes, and its terms as arguments.

Translating co-traverses: at each term, the first rule whose source pattern matches (the most specific first: the one
with the most terms and fixed attributes) is applied by traversing the pattern and the term in lockstep, binding holes
to arguments and attributes, a hole bound twice to equal terms (`Terms.same`) or values; then its target pattern is
instantiated with the bound attributes and the translations of the bound arguments. A translation is a `Terms.Writer`
of the target dialect's term, which its caller writes where it wants it, in a transaction: `store.Expressions.Framework.
Term(translator.forward(term))`. A term is a nested value, so a let's value inlined at each use of its name is written
at each. A term that no rule matches is read as its kind's `unfold` gives it, where it gives one: an equivalent `Form`
of simpler terms (a Python comparison chain as the `and` of its links, its middle operands written in each), translated
as a term is. Pairs of corresponding source terms (or unfolded forms) and target writers are appended to `trace`, if
given, each term after the terms within it. A term that no rule matches raises `ValueError` naming it. A translation preserves the expression's
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
    """A named hole in a pattern. In an argument it matches an expression; in an attribute it matches a
    native value, of one of `types` if any are given."""

    def __init__(self, name: str, *types: type):
        self.name, self.types = name, types

    def __repr__(self) -> str:
        return self.name


def holes(*names: str) -> tuple[Hole, ...]:
    """One untyped hole per name."""
    return tuple(Hole(name) for name in names)


class Pattern:
    """A form with holes: `kind`, `arguments` (patterns, holes, or None for an empty subterm: a binder's `value` it
    leaves unset) and `attributes` (natives or holes)."""

    def __init__(self, kind: str, *arguments: Pattern | Hole | None, **attributes: Any):
        self.kind, self.arguments, self.attributes = kind, arguments, attributes

    def size(self) -> int:
        """How specific the pattern is: its terms and fixed attributes."""
        fixed = sum(not isinstance(value, Hole) for value in self.attributes.values())
        return 1 + fixed + sum(a.size() for a in self.arguments if isinstance(a, Pattern))

    def holes(self) -> dict[str, str]:
        """The holes in the pattern, by name: 'argument' or 'attribute' (a helper's among them)."""
        found = {hole.name: "attribute" for value in self.attributes.values() for hole in _attribute_holes(value)}
        for argument in self.arguments:
            if argument is not None:
                found.update(argument.holes() if isinstance(argument, Pattern) else {argument.name: "argument"})
        return found

    def __repr__(self) -> str:
        parts = [*map(repr, self.arguments), *(f"{k}={v!r}" for k, v in self.attributes.items())]
        return f"{self.kind}({', '.join(parts)})"


def _attribute_holes(value: Any) -> list[Hole]:
    """The holes in an attribute's pattern: itself, or those within a helper's (`Terms.Part`) or a container of them."""
    if isinstance(value, Hole):
        return [value]
    if isinstance(value, Terms.Part):
        return [hole for inner in value.attributes.values() for hole in _attribute_holes(inner)]
    if isinstance(value, tuple):
        return [hole for inner in value for hole in _attribute_holes(inner)]
    return []


def _filled(value: Any, bindings: Mapping[str, Any]) -> Any:
    """An attribute's pattern with its holes filled, a helper's among them."""
    if isinstance(value, Hole):
        return bindings[value.name]
    if isinstance(value, Terms.Part):
        return Terms.Part(value.kind, {k: _filled(v, bindings) for k, v in value.attributes.items()}, value.size)
    if isinstance(value, tuple):
        return tuple(_filled(inner, bindings) for inner in value)
    return value


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
    """Wraps translations to `side` ('left' or 'right') in the import `pattern` when they refer to a name it binds: its
    last argument, its body, a hole, and its others empty (an import refining `Let` leaves Let's `value` empty)."""

    def __init__(self, pattern: Pattern, side: str):
        if side not in ("left", "right"):
            raise ValueError(f"side must be 'left' or 'right', got {side!r}")
        if not pattern.arguments or not isinstance(pattern.arguments[-1], Hole) or any(
                argument is not None for argument in pattern.arguments[:-1]) or any(
                isinstance(value, Hole) for value in pattern.attributes.values()):
            raise ValueError(f"a prelude is an import whose body, its last argument, is a hole, and its others empty, "
                             f"got {pattern!r}")
        self.pattern, self.side = pattern, side


def renames(left_kind: str, left_attribute: str, right_kind: str, right_attribute: str, names: Mapping[str, str],
            arity: int) -> list[Rule]:
    """Rules for operators that differ only in name: each `left` name applied to `arity` arguments is the `right`
    name applied to the same arguments, e.g. `renames('call', 'callable', 'compare', 'operator', {'eq': '=='}, 2)`."""
    arguments = holes(*(f"A{i}" for i in range(arity)))
    return [Rule(Pattern(left_kind, *arguments, **{left_attribute: a}),
                 Pattern(right_kind, *arguments, **{right_attribute: b})) for a, b in names.items()]


def _same_native(a: Any, b: Any) -> bool:
    return Terms._same_native(a, b)


def _form(node: Any) -> Terms.Form:
    """A term's form, or an unfolded form itself."""
    return node if isinstance(node, Terms.Form) else Terms.form(node)


def _kind(dialect: Terms.Dialect, node: Any) -> tuple[str, Any, Terms.Kind]:
    """A term's tag, record and kind, or an unfolded form's, which has no record."""
    if isinstance(node, Terms.Form):
        return node.kind, None, dialect.kind_named(node.kind)
    return dialect.kind(node)


def _describe(dialect: Terms.Dialect, node: Any) -> str:
    tag, record, kind = dialect.kind(node)
    label = f"{dialect.name()} {tag}"
    if kind.role in (Terms.APPLICATION, Terms.QUANTIFIER) and kind.operator is not None:
        return f"{label} {Terms.operator_of(node, kind)!r}"
    if kind.role == Terms.LITERAL:
        typed = kind.typed(record) if kind.typed is not None else None
        attributes = Terms.attributes_of(record)
        shown = kind.shown(attributes) if kind.shown is not None else repr(attributes.get("value"))
        return f"{label} {shown}" + ("" if typed is None else f" of {typed.name()}")
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
            kind = self.target.kind_named(pattern.kind)
            names = kind.names(pattern.attributes) if kind.names is not None else ()
            if set(names) & result.free:
                result = self.build(Terms.Form(pattern.kind, dict(pattern.attributes), (*pattern.arguments[:-1], result)))
        return result.writer

    def build(self, form: Terms.Form) -> _Built:
        """The target term of a form whose arguments are translated terms, and the names it needs, as
        `Symbolics.free` reads them."""
        kind = self.target.kind_named(form.kind)
        name = Terms.reference_name(form.attributes.get("name"))
        frees = [frozenset() if argument is None else argument.free for argument in form.arguments]
        if kind.role == Terms.REFERENCE:  # its name, and a name node's terms' names (a template's arguments)
            free = frozenset({name} if kind.lexical and name not in kind.ambient else ()).union(*frees)
        elif kind.scopes is not None:  # what its arguments bind is read from a record, which a writer is not yet:
            free = frozenset().union(*frees)  # its arguments' names, the names it binds among them
        elif kind.role in (Terms.BINDING, Terms.QUANTIFIER):
            free = frozenset(frees[0]).union(*(f - {name} for f in frees[1:]))
        else:
            names = kind.names(form.attributes) if kind.role == Terms.IMPORT and kind.names is not None else ()
            free = frozenset().union(*frees) - set(names)
        writer = self.target.make(Terms.Form(form.kind, form.attributes,
                                             tuple(None if a is None else a.writer for a in form.arguments)))
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
        tag, record, kind = _kind(self.direction.source, node)
        if record is None:  # an unfolded form: a rule reads it, or its kind unfolds it further
            return self._rules(node, tag, kind, environment) or self._unfolded(node, kind, environment)
        name = Terms.name_of(node)
        if kind.role == Terms.REFERENCE and kind.lexical and name in environment:
            return environment[name]
        if tag in self.direction.elides:
            body = Terms.arguments_of(record)[-1]
            if body is None:
                raise ValueError(f"{Terms._article(tag)} needs a body")
            return self.translate(body, environment)
        if tag in self.direction.inlines:
            value, body = Terms.arguments_of(record)
            if value is None or body is None:
                raise ValueError(f"{Terms._article(tag)} needs a "
                                 f"{'value' if value is None else 'body'}")
            inner = {**environment, name: self.translate(value, environment)}
            return self.translate(body, inner)
        ruled = self._rules(node, tag, kind, environment)
        if ruled is not None:
            return ruled
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
        return self._unfolded(node, kind, environment)

    def _rules(self, node: Any, tag: str, kind: Terms.Kind, environment: dict[str, _Built]) -> _Built | None:
        """The translation of the first rule whose source pattern matches `node`, or None."""
        for source, target in self.direction.rules.get(tag, []):
            bindings: dict[str, Any] = {}
            if self._match(source, node, bindings):
                return self._instantiate(target, bindings, environment)
        return None

    def _unfolded(self, node: Any, kind: Terms.Kind, environment: dict[str, _Built]) -> _Built:
        """The translation of the form `node`'s kind unfolds it into; raises naming the term where it has none."""
        unfolded = kind.unfold(_form(node)) if kind.unfold is not None else None
        if unfolded is not None:
            return self.translate(unfolded, environment)
        described = _describe(self.direction.source, node) if not isinstance(node, Terms.Form) else \
            f"{self.direction.source.name()} {node.kind}"
        raise ValueError(f"{described} has no {self.direction.target.name()} counterpart")

    def _match(self, pattern: Pattern | Hole | None, node: Any, bindings: dict[str, Any]) -> bool:
        """Co-traverses `pattern` and `node`, binding the pattern's holes; None matches an empty subterm."""
        if pattern is None:
            return node is None
        if isinstance(pattern, Hole):
            if node is None:
                return False
            if pattern.name in bindings:
                return Terms.same(bindings[pattern.name], node)
            bindings[pattern.name] = node
            return True
        if node is None:
            return False
        form = _form(node)
        attributes = form.attributes
        kind = _kind(self.direction.source, node)[2]
        if kind.role == Terms.LITERAL:  # a literal's spelling is its dialect's own
            attributes = {k: v for k, v in attributes.items() if k not in kind.spelling}
        if form.kind != pattern.kind or attributes.keys() != pattern.attributes.keys():
            return False
        if not all(self._attribute(pattern.attributes[name], attributes[name], bindings) for name in pattern.attributes):
            return False
        return len(form.arguments) == len(pattern.arguments) and all(
            self._match(p, argument, bindings) for p, argument in zip(pattern.arguments, form.arguments))

    def _attribute(self, expected: Any, value: Any, bindings: dict[str, Any]) -> bool:
        """Matches an attribute's pattern: a hole binds its native value; a helper's pattern (`Terms.Part`, or a
        container of them) matches a helper of its kind and size, its attributes in turn; anything else is equal."""
        if isinstance(expected, Hole):
            if expected.types and type(value) not in expected.types:
                return False
            if expected.name in bindings:
                return _same_native(bindings[expected.name], value)
            bindings[expected.name] = value
            return True
        if isinstance(expected, Terms.Part) and _attribute_holes(expected):
            return (isinstance(value, Terms.Part) and value.kind == expected.kind and value.size == expected.size
                    and value.attributes.keys() == expected.attributes.keys()
                    and all(self._attribute(expected.attributes[k], value.attributes[k], bindings) for k in expected.attributes))
        if isinstance(expected, tuple) and _attribute_holes(expected):
            return isinstance(value, tuple) and len(value) == len(expected) and all(
                self._attribute(e, v, bindings) for e, v in zip(expected, value))
        return _same_native(expected, value)

    def _instantiate(self, pattern: Pattern | Hole | None, bindings: dict[str, Any],
                     environment: dict[str, _Built]) -> _Built | None:
        if pattern is None:  # an empty subterm
            return None
        if isinstance(pattern, Hole):
            return self.translate(bindings[pattern.name], environment)
        attributes = {name: _filled(value, bindings) for name, value in pattern.attributes.items()}
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
