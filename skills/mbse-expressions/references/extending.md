# Adding a dialect or a translator

A dialect's terms are values in an mbse-schemas store: its install defines its kinds, and the framework reads them,
validates them, infers their domains and traverses them from a declaration of how each is read. A new dialect writes
its install, its kinds' declarations, its writers, its domains, its evaluator and its source text.

## A dialect

Its `install(txn)` defines its `Term`, the value union of its kinds, `Expressions.Latex.Term`, and adds it to
`Expressions.Framework.Term` by schema extension, as the branch named after it (`latex`): a value object schema per kind
of its own (a term carries no domain), named plainly in its `Term` (`frac`), a slot a property holding its `Term`, variadic
arguments a container of it by an int index, attributes any other scalar property; and its dialect, the singleton
`Expressions.Latex` of its own reference object schema `Expressions.Latex.Dialect`, a branch (`latex`) of the kind union
`Expressions.Framework.Dialect`, which names its operations (`Expressions.Framework.Operates`) and owns its domains by
name (`Expressions.Framework.Defines`), all written in the builders' fluent syntax. Its `Term` lists the framework's
kinds it reuses, `literal`, `variable`, `let` and `call` (`callable` by name, positional `arguments`), and the container
constructors `list` and `mapping`, wherever its kind has that shape exactly, whose slots hold any dialect's term, and
the framework's `error` and `missing`; it keeps a kind of its own only where the shape differs (C's constant has C's
`type`; Python3's call has a term for its callee); a restriction of its own on a reused kind ("no bytes") is its
`Kind`'s check. Its `Terms.Dialect` declares how each kind is read, a
`Terms.Kind` by tag, whose role tells validation, inference, evaluation and translation how to treat it:

| Role | Is | Declares |
|---|---|---|
| `LITERAL` | a value, its `value` (and its spelling, `text`, and `problems`) | `typed(record)`, the domain its own attributes give it (C's `type`) |
| `REFERENCE` | what the scope resolves, by its `name` | `lexical=False` for references that need no binding (Excel cells), `ambient` for names always bound (Python's builtins) |
| `APPLICATION` | an operator applied to arguments | `operator` (the property naming it, or None when the tag does), `vocabulary` (names to signatures) or `signature` for an open vocabulary; `closed=True` refuses names outside the vocabulary |
| `BINDING` | a let: binds its `name` | its slots, value then body |
| `QUANTIFIER` | binds its `name` to each item of a collection | `operator`, `vocabulary`, as an application |
| `IMPORT` | makes something available within its body | `names(attributes)`, the names it binds; the scope resolves it with `enter` |
| `INVALID` | invalid syntax, the framework's `error` and `missing`, which every dialect reads | nothing: validation reports it, evaluation refuses it |

```python fragment
from mbse.Expressions.Framework import Terms as F

def install(txn):                                      # LaTeX's \frac{numerator}{denominator}, among its kinds
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Latex/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Dialects": S.OfUnion, "Dialect": S.OfObject,
                  "Frac": S.OfObject})  # FrameworkTerm and Dialects: the framework's unions, by name
        .spec([
            lambda _: _.Dialect.name("Expressions.Latex.Dialect").ref(True).singleton("Expressions.Latex").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("latex").schema([_.Dialect])]),
            lambda _: _.Term.name("Expressions.Latex.Term").branches([  # its Term, the union of its kinds
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("frac").schema([_.Frac]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing])]),  # ... and its other kinds
            lambda _: _.Frac.name("Expressions.Latex.Frac").properties({
                "numerator": _.Term, "denominator": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([lambda t: t.name("latex").schema([_.Term])]),
        ])]))])

DIALECT = F.Dialect("Latex", {"frac": F.Kind(F.APPLICATION, signature=Domains.FRAC), ...},
                    domain_of=Domains.of, literal=_native)  # its Term, "Expressions.Latex.Term"; its tag, "latex"

class Writer(F.Writer):                                # a writer of its terms: in a Term, its branch first
    def __init__(self, write):
        super().__init__(write, DIALECT.tag)

def frac(numerator, denominator):                      # a writer: writes the kind wherever a term is written
    numerator, denominator = DIALECT.spec(numerator), DIALECT.spec(denominator)
    return Writer(lambda u: u.frac(lambda r: r.numerator(numerator).denominator(denominator)))
```

Then write its `Text` module, with `ToText(term)` reading each term through its `DIALECT.kind` (which refuses another
dialect's terms), a literal's `text` where it has one, and `Terms.invalid_text` for `error` and `missing`, and an evaluator on
`Framework.Evaluators.Interpreter` with one implementation per operator (each takes thunks for its arguments, so it
decides what to evaluate) and a scope derived from `Framework.Symbolics.Variables`. Evaluation is optional: a dialect
may only render and translate.

## A translator

Add a module per pair to `Translators/`, declaring `TRANSLATOR = Pairwise(left, right, rules)` with patterns from
`_Patterns`, and list it in `Translators/__init__.py` so `between` finds it (see [translating.md](translating.md)).

## Obligations in this repository

- Change Python and TypeScript together, with the same names, messages and JSON. A difference not listed in
  `docs/EQUIVALENCE.md` is a bug.
- Add a conformance case for a new dialect, with its install in the corpus's store and its `DIALECTS` entry, so both
  implementations are checked to write the same JSON.
- Keep coverage at 100% in both, with assertions in shared test cases.
- See [AGENTS.md](https://github.com/pitaman71/mbse-expressions/blob/main/AGENTS.md) for the commands and invariants.

## Go deeper

| Topic | Read |
|---|---|
| The framework: terms and roles, symbolics and scopes, domains, the interpreter | [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#the-framework), in mbse-basis |
| A complete dialect to copy | [the Excel dialect](https://github.com/pitaman71/mbse-expressions/blob/main/python3/mbse/Expressions/Dialects/Excel) |
| The framework, case by case | [FRM, the framework's test suite](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/05_Framework.ipynb) |
