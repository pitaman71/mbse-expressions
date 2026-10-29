# Adding a dialect or a translator

A dialect's terms are values in an mbse-schemas store: its install defines its kinds, and the framework reads them,
validates them, infers their domains and traverses them from a declaration of how each is read. A new dialect writes
its install, its kinds' declarations, its writers, its domains, its evaluator and its source text.

## A dialect

Its `install(txn)` adds its kinds to `Expressions.Framework.Term` by schema extension: a value object schema per kind,
each with a `domain` (by name), a slot a property of the framework's `Term`, variadic arguments a container of `Term`
by an int index, attributes any other scalar property. Branch tags carry the dialect's name (`latex_frac`), since every
dialect adds its kinds to the one union; a dialect reuses the framework's `literal`, `variable`, `let` and `call`
(`callable`, `arguments`) where its kind has that shape. Its `Terms.Dialect` declares how each kind is read, a
`Terms.Kind` by tag, whose role tells validation, inference, evaluation and translation how to treat it:

| Role | Is | Declares |
|---|---|---|
| `LITERAL` | a basic scalar, its `value` | `typed(record)`, the domain of its own when it carries one |
| `REFERENCE` | what the scope resolves, by its `name` | `lexical=False` for references that need no binding (Excel cells), `ambient` for names always bound (Python's builtins) |
| `APPLICATION` | an operator applied to arguments | `operator` (the property naming it, or None when the tag does), `vocabulary` (names to signatures) or `signature` for an open vocabulary |
| `BINDING` | a let: binds its `name` | its slots, value then body |
| `QUANTIFIER` | binds its `name` to each item of a collection | `operator`, `vocabulary`, as an application |
| `IMPORT` | makes something available within its body | `names(attributes)`, the names it binds; the scope resolves it with `enter` |

```python fragment
from mbse.Expressions.Framework import Terms as F

def install(txn):                                      # LaTeX's \frac{numerator}{denominator}, among its kinds
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Latex/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Frac": S.OfObject})   # the framework's union, found by its name
        .spec([
            lambda _: _.Frac.name("Expressions.Latex.Frac").properties({
                "numerator": _.Term, "denominator": _.Term, "domain": S.OfStr}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([lambda t: t.name("latex_frac").schema([_.Frac])]),
        ])]))])

DIALECT = F.Dialect("Latex", {"latex_frac": F.Kind(F.APPLICATION, signature=Domains.FRAC), ...},
                    domain_of=Domains.of, literal=_native)

def frac(numerator, denominator):                      # a writer: writes the kind wherever a term is written
    numerator, denominator = DIALECT.spec(numerator), DIALECT.spec(denominator)
    return F.Writer(lambda u: u.latex_frac(lambda r: r.numerator(numerator).denominator(denominator)))
```

Then write its `Text` module, with `ToText(term)` over `Terms.form`, and an evaluator on
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
| The framework: terms and roles, symbolics and scopes, domains, the interpreter | [EXPRESSIONS.md, The framework](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#the-framework) |
| A complete dialect to copy | [the Excel dialect](https://github.com/pitaman71/mbse-expressions/blob/main/python3/mbse/Expressions/Dialects/Excel) |
| The framework, case by case | [FRM, the framework's test suite](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/05_Framework.ipynb) |
