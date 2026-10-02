# Adding a dialect or a translator

The framework derives most of a dialect from declarations: builders, meta-schemas, snapshots, validation, domain
inference and traversal. A new dialect writes its kinds, its domains, its evaluator and its source text.

## A dialect

Declare each kind as a `Term` whose class variables say what it is. Its role tells validation, inference, evaluation
and translation how to treat it without knowing the dialect:

| Role | Is | Declares |
|---|---|---|
| `LITERAL` | a native value | `VALUE`: the natives it may hold, by property name |
| `REFERENCE` | what the scope resolves | its name property; `LEXICAL = False` for references that need no binding (Excel cells), `AMBIENT` for names always bound (Python's builtins) |
| `APPLICATION` | an operator applied to arguments | `OPERATOR` (the property naming it, or none), `VOCABULARY` (names to signatures) or `SIGNATURE` for an open vocabulary |
| `BINDING` | a let | its name property; `SLOTS` value, then body |
| `IMPORT` | makes something available within its body | `binds()`, the names it binds; the scope resolves it with `enter` |

```python fragment
from dataclasses import dataclass
from typing import Any
from mbse.Expressions.Framework import Domains as D, Terms as F

@dataclass(eq=False)
class _Frac(F.Term):                                   # LaTeX's \frac{numerator}{denominator}
    KIND = "frac"
    ROLE = F.APPLICATION
    SLOTS = ("numerator", "denominator")
    SIGNATURE = D.Function((D.Anything, D.Anything), D.Anything)
    numerator: Any = None
    denominator: Any = None

DIALECT = F.Declared("Latex", (_Constant, _Symbol, _Frac), domain_of=Domains.of)
```

Then write its `Text` module, with `ToText(expression)`, and an evaluator on `Framework.Evaluators.Interpreter` with one implementation per operator (each
takes thunks for its arguments, so it decides what to evaluate) and a scope derived from
`Framework.Symbolics.Variables`. Evaluation is optional: a dialect may only render and translate.

## A translator

Add a module per pair to `Translators/`, declaring `TRANSLATOR = Pairwise(left, right, rules)` with patterns from
`_Patterns`, and list it in `Translators/__init__.py` so `between` finds it (see [translating.md](translating.md)).

## Obligations in this repository

- Change Python and TypeScript together, with the same names, messages and JSON. A difference not listed in
  `docs/EQUIVALENCE.md` is a bug.
- Add a conformance case for a new dialect, so both implementations are checked to write the same JSON.
- Keep coverage at 100% in both, with assertions in shared test cases.
- See [AGENTS.md](https://github.com/pitaman71/mbse-expressions/blob/main/AGENTS.md) for the commands and invariants.

## Go deeper

| Topic | Read |
|---|---|
| The framework: terms and roles, symbolics and scopes, domains, the interpreter | [EXPRESSIONS.md, The framework](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#the-framework) |
| A complete dialect to copy | [the Excel dialect](https://github.com/pitaman71/mbse-expressions/blob/main/python3/mbse/Expressions/Dialects/Excel) |
| The framework, case by case | [FRM, the framework's test suite](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/05_Framework.ipynb) |
