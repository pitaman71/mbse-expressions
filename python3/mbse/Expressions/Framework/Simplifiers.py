"""Simplifiers: the one procedure every dialect implements, simplifying an expression in a scope that binds some, all or
none of its names, to a residual expression of the same dialect.

As expressions are value objects, and value objects are immutable, simplification is recursive substitution: it never
changes a term, it writes a new one (mbse-basis [PRI-046: simplification, not
evaluation](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-046)). A reference the scope binds is replaced by the literal of its
value, and a subterm the scope closes is folded, by its dialect's rules, into the literal of its value; a subterm the
dialect has no rule for, or whose value has no literal (a closure, an object, a collection), stays, its subterms
simplified in turn. If the residual's root is a literal, simplification evaluated the expression: `Simplified.evaluate()`
gives its value, or raises `NotEvaluated` naming why it is not a literal. Nothing is refused: where a dialect has no rule
for a kind or an operator, the subterm stays in the residual, and a `Residue` names it, its dialect, its kind and the
class the evaluation inventory gives it (`a` statement-free with a value its language defines, `b` no value of its own,
`c` waiting on an open capability, `d` needing what only mbse-programs or a simulator has; see mbse-expressions'
[the evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#evaluation-what-is-refused-and-why)).
Errors the dialect's own semantics define (an operand of the wrong type, a division by zero) still raise, as the
expression would raise in its language.

A `Simplifier(rules, literal=..., simplify=..., categories=..., native=..., folds=...)` simplifies the terms of one
dialect; each dialect's `Simplifiers.OfAny` is one. Its `rules` are the dialect's folding rules: what the dialect
computes over values, `rules.evaluate(node, scope)` giving a subterm's value or raising `NoRule` where it has none, over
a scope `rules.scope(mapping)` makes. `Interpreter` is the rules most dialects build theirs on (its tables, by kind
and operator, are the folding rules); a dialect whose rules need the whole term (SystemVerilog's sizing by context)
gives its own, and says by `folds(node, root)` which subterms may fold. `literal(value)` writes the literal of a value,
or gives None where the dialect has none; `simplify(node, results)` decides what does not depend on an unsimplified
subterm, as Kleene's logic does in Patterns (`false and x` is `false`); `native(value)` gives the value a caller sees of
a value of the rules (C's, its native without its type); `display(value)` writes a container of values that have
literals as a term of their literals, a display (Python's `[1, 2]`), not a literal.

`Interpreter` folds a term by its kind's role (see `Terms`): a literal gives its value (through `literal`, or `typed`
when its kind's attributes give it a domain of its own, as C's type does a constant), a reference what the scope
resolves, a binding its body in the scope with its name bound, and an import its body in the scope it declares. An
application calls its operator's implementation from `operations`, with one thunk per argument, so that implementations
decide which arguments to fold and when, and so does a quantifier, whose second thunk takes an item and folds the body
with the name bound to it; the implementation of a kind whose vocabulary is open is one callable for every name, and
operators outside a closed vocabulary go to `extension`, if given. It raises `NoRule` for invalid syntax (`error`,
`missing`), for a kind outside `folded`, where it is given the kinds it folds, for a kind of a dialect it reads, and for
an operator without an implementation, each by the name of the dialect that owns it (`Terms.Dialect.owner`: "Python
Types typevar is not simplified", "Python3 binop '@' is not simplified"); it raises on what `Dialect.validate`
reports: wrong numbers of arguments and missing values.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from mbse.Schemas.Framework import Schemas

from . import Symbolics, Terms
from .Symbolics import Scope, Variables

__all__ = ["Simplifier", "Simplified", "Residue", "NotEvaluated", "NoRule", "Rules", "Interpreter", "Result", "Thunk",
           "Implementation", "natives"]

Thunk = Callable[[], Any]
Implementation = Callable[[list[Thunk], Any, Any], Any]
"""Computes an operation's value from thunks for its arguments, the term (for its attributes) and the scope."""


class NoRule(NotImplementedError):
    """Raised by a dialect's rules where it has no rule for a term: `what` names its kind, and the operator or the
    shape it has no rule for ("lambda", "binop '@'", "call keyword"), after the name of the dialect that owns it."""

    def __init__(self, dialect: str, what: str, kind: str | None = None):
        super().__init__(f"{dialect} {what} is not simplified")
        self.dialect, self.what, self.kind = dialect, what, kind


class NotEvaluated(ValueError):
    """Raised by `Simplified.evaluate()` where the residual's root is not a literal, naming why."""


@dataclass(frozen=True)
class Residue:
    """Why a subterm stayed in the residual for want of a rule: the `dialect` that owns it, its `kind`, `what` it has no
    rule for (its kind, and the operator or the shape), and its `category`, the evaluation inventory's class of it
    (`a`, `b`, `c` or `d`)."""

    dialect: str
    kind: str
    what: str
    category: str

    @property
    def reason(self) -> str:
        """"Python3 lambda is not simplified"."""
        return f"{self.dialect} {self.what} is not simplified"


@dataclass(frozen=True)
class Simplified:
    """What simplification gives: the `residual`, a `Writer` of a term of the dialect, which its caller writes where it
    wants it (in a transaction); whether its root is a `literal`, simplification having evaluated the expression, and
    then its `value` (None otherwise: three-valued, a residual reads as unknown); the names it still needs (`free`);
    and the `residues`, each subterm that stayed for want of a rule, in the order they were found."""

    residual: Terms.Writer
    literal: bool
    value: Any
    free: frozenset[str]
    residues: tuple[Residue, ...]

    def evaluate(self) -> Any:
        """The value of the literal at the residual's root; raises `NotEvaluated` naming why the root is not a
        literal: a subterm the dialect has no rule for, a name the scope does not bind, or a value with no literal."""
        if self.literal:
            return self.value
        if self.residues:
            why = self.residues[0].reason
        elif self.free:
            why = f"{sorted(self.free)[0]} is not bound"
        else:
            why = "its value has no literal"
        raise NotEvaluated(f"the root is not a literal: {why}")


class Rules(Protocol):
    """A dialect's folding rules: its `dialect`, the value of a term in a scope (`evaluate`, raising `NoRule` where it
    has no rule and `Symbolics.Unbound` where the scope does not resolve a reference), and the scope a mapping of
    variables makes (`scope`)."""

    dialect: Terms.Dialect

    def evaluate(self, node: Any, scope: Any) -> Any: ...

    def scope(self, variables: Mapping[str, Any]) -> Scope: ...


@dataclass(frozen=True)
class Result:
    """A simplified subterm: its `expression` (a term value, or a `Writer`), whether it is `known`, a value its
    dialect computed, and then its `value`; whether it is a `literal`; the names it refers to that nothing within it
    binds (`free`); and whether it differs from the subterm it simplified (`changed`)."""

    expression: Any
    known: bool = False
    value: Any = None
    literal: bool = False
    free: frozenset[str] = frozenset()
    changed: bool = True


class Simplifier:
    """Simplifies the terms of a dialect by its `rules` (see the module's description)."""

    def __init__(self, rules: Rules, *, literal: Callable[[Any], Any],
                 simplify: Callable[[Any, list[Result]], Result | None] | None = None,
                 categories: Mapping[str, Mapping[str, str]] | None = None,
                 native: Callable[[Any], Any] = lambda value: value,
                 folds: Callable[[Any, bool], bool] | None = None,
                 display: Callable[[Any], Any] | None = None):
        self.rules, self.dialect = rules, rules.dialect
        self._literal, self._simplify, self._native, self._folds = literal, simplify, native, folds
        self._display = display
        self._categories = dict(categories or {})

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Simplified:
        """The simplification of a term (see `Terms.term`) in `scope`, or with the variables in a mapping bound."""
        if not isinstance(scope, Symbolics.Scope):
            scope = self.rules.scope(dict(scope or {}))
        residues: dict[Residue, None] = {}
        result = self.reduce(Terms.term(expression), scope, residues, True)
        literal = result.literal
        return Simplified(self.dialect.spec(result.expression), literal,
                          self._native(result.value) if literal else None, result.free, tuple(residues))

    def category(self, dialect: str, what: str, kind: str) -> str:
        """The evaluation inventory's class of what a dialect has no rule for: by `what`, then by its kind, then `b` for
        invalid syntax, which has no value of its own, then the dialect's default (`*`), else `a`."""
        table = self._categories.get(dialect, {})
        default = "b" if kind in Terms.INVALID_KINDS or what in Terms.INVALID_KINDS else table.get("*", "a")
        return table.get(what, table.get(kind, default))

    def known(self, expression: Any, value: Any) -> Result:
        """The result of a subterm whose value is known: its literal, when the dialect has one."""
        written = self._literal(value)
        if written is None:
            return Result(expression, True, value, free=frozenset(Symbolics.free(expression, self.dialect)))
        return Result(written, True, value, True)

    def reduce(self, node: Any, scope: Any, residues: dict[Residue, None], root: bool = False) -> Result:
        """A subterm simplified in `scope`, noting in `residues` each subterm its dialect has no rule for."""
        tag, record, kind = self.dialect.kind(node)
        known, value = False, None  # a value its rules computed, with no literal
        if self._folds is None or self._folds(node, root):
            try:
                value, known = self.rules.evaluate(node, scope), True
            except Symbolics.Unbound:
                pass
            except NoRule as refusal:
                self._note(refusal, residues)
            if known:
                if kind.role == Terms.LITERAL:  # already a literal: kept as written
                    return Result(node, True, value, True, changed=False)
                written = self._literal(value)
                if written is not None:
                    return Result(written, True, value, True)
                shown = self._display(value) if self._display is not None else None
                if shown is not None:  # a container of values that have literals: its display
                    return Result(shown, True, value)
        if kind.role in (Terms.LITERAL, Terms.REFERENCE, Terms.INVALID) and not Terms.arguments_of(record):
            free = frozenset(Symbolics.free(node, self.dialect))
            return Result(node, known, value, free=free, changed=False)
        # a subterm of a term its rules computed (a cast's type) needs no rule of its own: what it lacks is not noted
        return self._rebuild(node, record, kind, scope, {} if known else residues, known, value)

    def _rebuild(self, node: Any, record: Any, kind: Terms.Kind, scope: Any, residues: dict[Residue, None],
                 known: bool, value: Any) -> Result:
        """A term rebuilt from its simplified arguments, each in the scope its names are bound in: a let's of a known
        value bound to it, any other name hidden (`Symbolics.UNKNOWN`), an import's among them (its root having not
        folded, its module is not entered again). A let whose body no longer refers to its name is its body."""
        arguments = Terms.arguments_of(record)
        bound = Symbolics.scopes(node, self.dialect)
        lets = Terms._lets(kind, record)
        results: list[Result | None] = []
        for i, (argument, names) in enumerate(zip(arguments, bound)):
            if argument is None:
                results.append(None)
                continue
            within = scope
            if lets and i > 0 and results[0] is not None and results[0].known:
                within = scope.bind(Terms.name_of(node), results[0].value)
            elif names:
                within = self._hide(scope, names)
            results.append(self.reduce(argument, within, residues))
        name = Terms.name_of(node)
        if lets and len(results) > 1 and results[1] is not None and name not in results[1].free:
            return results[1]
        free = frozenset().union(*(r.free - names for r, names in zip(results, bound) if r is not None))
        simplified = self._simplify(node, [r for r in results if r is not None]) if self._simplify else None
        if simplified is not None:
            return simplified
        if not any(r is not None and r.changed for r in results):
            return Result(node, known, value, free=free, changed=False)
        form = Terms.form(node)
        reader = self.dialect._reader(node)  # the dialect whose `Term` holds it: this one, or one it reads
        written = reader.make(Terms.Form(form.kind, form.attributes,
                                         tuple(None if r is None else r.expression for r in results)))
        return Result(written, known, value, free=free)

    @staticmethod
    def _hide(scope: Any, names: frozenset[str]) -> Any:
        for name in sorted(names):
            scope = scope.bind(name, Symbolics.UNKNOWN)
        return scope

    def _note(self, refusal: NoRule, residues: dict[Residue, None]) -> None:
        kind, what = refusal.kind or "", refusal.what  # its kind set by the rules, for the term they have no rule for
        residues.setdefault(Residue(refusal.dialect, kind, what, self.category(refusal.dialect, what, kind)), None)


def natives(dialect: Terms.Dialect) -> Callable[[Any], Any]:
    """The literal of a native value (a basic scalar), as `dialect` writes one (`Terms.Dialect.spec`); None for any
    other value, or a native it has no literal of: a simplifier's `literal`, where a dialect's values are natives."""
    return lambda value: dialect._literal(value) if type(value) in Schemas.SCALAR_TYPES else None


class Interpreter:
    """Folds the terms of `dialect`. `operations` maps each application kind's tag to its implementations by operator
    name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value into the
    dialect's domain of values, and `typed(domain, value)` gives the value of a literal whose kind gives it a domain of
    its own (`Kind.typed`; without it, folding one raises `NoRule`); `scope` makes the dialect's scope from a mapping of
    variables, and `extension(operator, arguments, node, scope)` folds operators outside a kind's vocabulary.
    `folded`, where given, names the kinds it folds: any other raises `NoRule`, as does a kind of a dialect it reads,
    and invalid syntax, each by the name of the dialect that owns it (`Terms.Dialect.owner`)."""

    def __init__(self, dialect: Terms.Dialect, operations: Mapping[str, Any], *,
                 literal: Callable[[Any], Any] = lambda value: value,
                 typed: Callable[[Any, Any], Any] | None = None,
                 scope: Callable[[Mapping[str, Any]], Scope] = Variables,
                 extension: Callable[[str, list[Thunk], Any, Any], Any] | None = None,
                 folded: frozenset[str] | None = None):
        self.dialect, self.operations, self._literal, self._typed = dialect, operations, literal, typed
        self.scope, self._extension, self._folded = scope, extension, folded

    def evaluate(self, node: Any, scope: Any) -> Any:
        """The value of a term in `scope`; a refusal of this term's own rules is raised as `NoRule` naming it."""
        try:
            return self._evaluate(node, scope)
        except NoRule as refusal:
            if refusal.kind is None:  # raised for this term: its kind
                refusal.kind = Terms.kind_of(node)[0]
            raise

    def _evaluate(self, node: Any, scope: Any) -> Any:
        tag, record, kind = self.dialect.kind(node)
        owner = self.dialect.owner(node)  # whose name a refusal gives
        if kind.role == Terms.INVALID or owner is not self.dialect or self._folded is not None and tag not in self._folded:
            raise NoRule(owner.name(), tag)
        if kind.role == Terms.LITERAL:
            value = Terms.attributes_of(record).get("value")
            if value is None:
                raise ValueError(f"{Terms._article(tag)} needs a value")
            typed = kind.typed(record) if kind.typed is not None else None
            if typed is None:
                return self._literal(value)
            if self._typed is None:
                raise NoRule(owner.name(), f"literal of {typed.name()}")
            return self._typed(typed, value)
        if kind.role == Terms.REFERENCE:
            return scope.lookup(node)
        arguments = Terms.arguments_of(record)
        if kind.role in (Terms.BINDING, Terms.IMPORT, Terms.QUANTIFIER):
            subterms, _, _ = Terms._parts(record.as_schema())
            for subterm, argument in zip(subterms, arguments):
                if argument is None and subterm not in kind.optional:  # an import's `value`, which it leaves unset
                    raise ValueError(f"{Terms._article(tag)} needs {Terms._article(subterm)}")
            if kind.role == Terms.QUANTIFIER:
                return self._apply(node, tag, kind, arguments, scope)
            if kind.role == Terms.IMPORT:  # its body, its last argument
                return self.evaluate(arguments[-1], scope.enter(node))
            bound = self.evaluate(arguments[0], scope)
            return self.evaluate(arguments[1], scope.bind(Terms.name_of(node), bound))
        return self._apply(node, tag, kind, arguments, scope)

    def _apply(self, node: Any, tag: str, kind: Terms.Kind, arguments: tuple[Any, ...], scope: Any) -> Any:
        operator = Terms.operator_of(node, kind)
        implementations = self.operations[tag]
        thunks = [lambda argument=argument: self.evaluate(argument, scope) for argument in arguments]
        if kind.role == Terms.QUANTIFIER:  # the arguments after the collection, of an item: folded with the name bound
            name = Terms.name_of(node)
            for i in range(1, len(arguments)):
                thunks[i] = lambda item, argument=arguments[i]: self.evaluate(  # type: ignore[assignment]
                    argument, scope.bind(name, item))
        if kind.vocabulary is None or kind.operators is not None:  # one implementation for every operator
            return implementations(thunks, node, scope)
        if operator not in implementations:
            if self._extension is not None:
                return self._extension(operator, thunks, node, scope)
            raise NoRule(self.dialect.owner(node).name(), f"{tag} {operator!r}")
        arity = kind.vocabulary[operator].arity()
        if arity >= 0 and len(arguments) != arity:  # a negative arity takes any number
            raise TypeError(f"{operator} takes {arity} arguments, got {len(arguments)}")
        return implementations[operator](thunks, node, scope)
