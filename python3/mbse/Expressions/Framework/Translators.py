"""Translators: bidirectional, pairwise translation between dialects, by co-traversal.

A `Translator` between two dialects, `left` and `right`, translates `forward` (left to right) and `backward`. Each pair
of dialects has its own, specialized to what the two have in common, and is declared as a list of rules:

- `Rule(left, right)` pairs two `Pattern`s, each a form with `Hole`s: `Pattern('operation', A, B, name='eq')` matches
  the Basic `eq(a, b)` and binds the holes `A` and `B` to its arguments. A hole in an attribute binds the attribute's
  native value, and may restrict its type: `Hole('K', str)`. A rule applies in both directions unless its
  `direction` is 'forward' or 'backward'.
- `Inline(kind, side)` translates a binding of one side, which the other has no counterpart for, by substituting its
  value for its name in its body. The value's translation is shared by every use, so sharing is kept.
- `Elide(kind, side)` translates an import of one side, which the other has no counterpart for, as its body: what the
  import brought in must be translated by other rules (a NumPy call, say), or it has no counterpart.
- `Convert(left_kind, right_kind, forward, backward)` translates literals whose values the two sides write
  differently: a `left_kind` literal is the `right_kind` literal of the attributes `forward(attributes)` gives, and
  `backward` maps the other way. A function gives None for the attributes it has no counterpart for (a value domain
  the other side lacks, say). Conversions are tried after the rules of their kind.
- `Prelude(pattern, side)` adds an import to what is translated to `side`: `pattern` is the import with its body as
  its one argument, a hole, and it wraps the translation if the translation refers to a name the import binds, e.g.
  `import numpy as np` around an expression that uses `np`.

Translating co-traverses: at each term, the first rule whose source pattern matches (the most specific first: the one
with the most terms and fixed attributes) is applied by traversing the pattern and the expression in lockstep, binding
holes to arguments and attributes; then its target pattern is instantiated with the bound attributes and the
translations of the bound arguments. Every term is translated once, so shared sub-expressions stay shared, and pairs of
corresponding source and target terms are appended to `trace`, if given. A term that no rule matches raises
`ValueError` naming it. A translation preserves the expression's form, not always its value: dialects evaluate by their
own rules (see each dialect's `Evaluators`).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from typing import Any, Protocol, runtime_checkable

from . import Symbolics, Terms

__all__ = ["Translator", "Pairwise", "Rule", "Inline", "Elide", "Convert", "Prelude", "Pattern", "Hole", "holes", "renames"]


@runtime_checkable
class Translator(Protocol):
    """Translates expressions between two dialects, in both directions."""

    def left(self) -> Terms.Dialect: ...

    def right(self) -> Terms.Dialect: ...

    def forward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Any:
        """`expression`, of the left dialect, in the right one."""
        ...

    def backward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Any:
        """`expression`, of the right dialect, in the left one."""
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
    name applied to the same arguments, e.g. `renames('operation', 'name', 'call', 'function', {'eq': 'equal'}, 2)`."""
    arguments = holes(*(f"A{i}" for i in range(arity)))
    return [Rule(Pattern(left_kind, *arguments, **{left_attribute: a}),
                 Pattern(right_kind, *arguments, **{right_attribute: b})) for a, b in names.items()]


def _same_native(a: Any, b: Any) -> bool:
    return Terms._same_native(a, b)


def _describe(dialect: Terms.Dialect, node: Any) -> str:
    kind = type(node)
    if kind.ROLE in (Terms.APPLICATION, Terms.QUANTIFIER) and kind.OPERATOR is not None:
        return f"{dialect.name()} {kind.KIND} {Terms._operator(node)!r}"
    if kind.ROLE == Terms.LITERAL:
        typed = node.typed()
        return f"{dialect.name()} {kind.KIND} {node.value!r}" + ("" if typed is None else f" of {typed.name()}")
    return f"{dialect.name()} {kind.KIND}"


class _Direction:
    """Translation in one direction: the co-traversal."""

    def __init__(self, source: Terms.Declared, target: Terms.Declared,
                 rules: Sequence[tuple[Pattern, Pattern]], inlines: Iterable[str], elides: Iterable[str] = (),
                 preludes: Sequence[Pattern] = (), converts: Sequence[tuple[str, str, Callable[..., Any]]] = ()):
        self.source, self.target, self.inlines = source, target, frozenset(inlines)
        self.elides, self.preludes = frozenset(elides), list(preludes)
        self.converts: dict[str, list[tuple[str, Callable[..., Any]]]] = {}
        for kind, target_kind, convert in converts:
            for dialect, name in ((source, kind), (target, target_kind)):
                literal = dialect.kinds().get(name)
                if literal is None or literal.ROLE != Terms.LITERAL:
                    raise ValueError(f"a conversion translates literals, and {dialect.name()} {name!r} is not one")
            self.converts.setdefault(kind, []).append((target_kind, convert))
        self.rules: dict[str, list[tuple[Pattern, Pattern]]] = {}
        for pair in sorted(rules, key=lambda pair: -pair[0].size()):
            self.rules.setdefault(pair[0].kind, []).append(pair)

    def __call__(self, expression: Any, trace: list[tuple[Any, Any]] | None) -> Any:
        result = _Run(self, trace).translate(self.source.resolve(expression), {})
        for pattern in reversed(self.preludes):
            declared = self.target.make(Terms.Form(pattern.kind, dict(pattern.attributes), (result,)))
            if set(declared.binds()) & Symbolics.free(result):
                result = declared
        return result


class _Run:
    """One translation: its memo, its cycle check and its trace."""

    def __init__(self, direction: _Direction, trace: list[tuple[Any, Any]] | None):
        self.direction, self.trace = direction, trace
        self.memo: dict[tuple[int, int], Any] = {}
        self.environments: list[dict[str, Any]] = []  # kept alive, so that their ids stay unique
        self.active: set[int] = set()

    def translate(self, node: Any, environment: dict[str, Any]) -> Any:
        key = (id(node), id(environment))
        if key in self.memo:
            return self.memo[key]
        if not isinstance(node, self.direction.source.classes):
            raise TypeError(f"not an expression: {node!r}")
        if id(node) in self.active:
            raise ValueError("the expression contains a cycle")
        self.active.add(id(node))
        try:
            result = self._translate(node, environment)
        finally:
            self.active.discard(id(node))
        self.memo[key] = result
        if self.trace is not None:
            self.trace.append((node, result))
        return result

    def _translate(self, node: Any, environment: dict[str, Any]) -> Any:
        kind = type(node)
        name = Terms.name_of(node)
        if kind.ROLE == Terms.REFERENCE and kind.LEXICAL and name in environment:
            return environment[name]
        if kind.KIND in self.direction.elides:
            body = node._arguments()[-1]
            if body is None:
                raise ValueError(f"{Terms._article(kind.KIND)} needs a body")
            return self.translate(body, environment)
        if kind.KIND in self.direction.inlines:
            value, body = node._arguments()
            if value is None or body is None:
                raise ValueError(f"{Terms._article(kind.KIND)} needs a {'value' if value is None else 'body'}")
            inner = {**environment, name: self.translate(value, environment)}
            self.environments.append(inner)
            return self.translate(body, inner)
        for source, target in self.direction.rules.get(kind.KIND, []):
            bindings: dict[str, Any] = {}
            if self._match(source, node, bindings):
                return self._instantiate(target, bindings, environment)
        for target_kind, convert in self.direction.converts.get(kind.KIND, []):
            attributes = convert(dict(node.form().attributes))
            if attributes is not None:
                return self.direction.target.make(Terms.Form(target_kind, attributes, ()))
        raise ValueError(f"{_describe(self.direction.source, node)} has no {self.direction.target.name()} counterpart")

    def _match(self, pattern: Pattern | Hole, node: Any, bindings: dict[str, Any]) -> bool:
        """Co-traverses `pattern` and `node`, binding the pattern's holes."""
        if isinstance(pattern, Hole):
            if node is None:
                return False
            if pattern.name in bindings:
                return bindings[pattern.name] is node
            bindings[pattern.name] = node
            return True
        if not isinstance(node, self.direction.source.classes):
            return False
        form = node.form()
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

    def _instantiate(self, pattern: Pattern | Hole, bindings: dict[str, Any], environment: dict[str, Any]) -> Any:
        if isinstance(pattern, Hole):
            return self.translate(bindings[pattern.name], environment)
        attributes = {name: bindings[value.name] if isinstance(value, Hole) else value
                      for name, value in pattern.attributes.items()}
        arguments = tuple(self._instantiate(argument, bindings, environment) for argument in pattern.arguments)
        return self.direction.target.make(Terms.Form(pattern.kind, attributes, arguments))


class Pairwise:
    """A `Translator` between `left` and `right`, declared by `rules` (`Rule`s, `Inline`s, `Elide`s, `Convert`s and
    `Prelude`s)."""

    def __init__(self, left: Terms.Declared, right: Terms.Declared,
                 rules: Sequence[Rule | Inline | Elide | Convert | Prelude]):
        self._left, self._right, self._rules = left, right, list(rules)
        pairs = [rule for rule in rules if isinstance(rule, Rule)]
        converts = [rule for rule in rules if isinstance(rule, Convert)]

        def of(kind: type, side: str) -> list[Any]:
            return [rule for rule in rules if isinstance(rule, kind) and rule.side == side]

        self._forward = _Direction(left, right, [(r.left, r.right) for r in pairs if r.direction != "backward"],
                                   [i.kind for i in of(Inline, "left")], [e.kind for e in of(Elide, "left")],
                                   [p.pattern for p in of(Prelude, "right")],
                                   [(c.left_kind, c.right_kind, c.forward) for c in converts])
        self._backward = _Direction(right, left, [(r.right, r.left) for r in pairs if r.direction != "forward"],
                                    [i.kind for i in of(Inline, "right")], [e.kind for e in of(Elide, "right")],
                                    [p.pattern for p in of(Prelude, "left")],
                                    [(c.right_kind, c.left_kind, c.backward) for c in converts])

    def left(self) -> Terms.Declared:
        return self._left

    def right(self) -> Terms.Declared:
        return self._right

    def forward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Any:
        return self._forward(expression, trace)

    def backward(self, expression: Any, trace: list[tuple[Any, Any]] | None = None) -> Any:
        return self._backward(expression, trace)

    def inverse(self) -> Pairwise:
        swapped = {"both": "both", "forward": "backward", "backward": "forward"}
        other = {"left": "right", "right": "left"}
        rules: list[Rule | Inline | Elide | Convert | Prelude] = [
            Rule(r.right, r.left, swapped[r.direction]) if isinstance(r, Rule)
            else Prelude(r.pattern, other[r.side]) if isinstance(r, Prelude)
            else Convert(r.right_kind, r.left_kind, r.backward, r.forward) if isinstance(r, Convert)
            else type(r)(r.kind, other[r.side]) for r in self._rules
        ]
        return Pairwise(self._right, self._left, rules)

    def __repr__(self) -> str:
        return f"<translator {self._left.name()} <-> {self._right.name()}>"
