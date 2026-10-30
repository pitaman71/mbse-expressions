# Translating

Every pair of dialects has its own bidirectional translator. `Translators.between(source, target)` finds it, whichever
way round it is declared, and `forward(term)` translates it into a writer of the target dialect's term, which you write
where you want it, in a transaction (with the target dialect installed in the store). `Translators.Basic_Python.NUMPY`
is a second translator between Basic and Python that writes NumPy's functions over columns and adds
`import numpy as np`.

```python fragment
from mbse.Expressions import Expressions as E, Translators
from mbse.Expressions.Dialects.Excel import Expressions as X
trace = []
writer = Translators.between(E.DIALECT, X.DIALECT).forward(constraint, trace)   # trace: (source term, target writer) pairs
with store.transaction():
    formula = store.Expressions.Framework.Term(writer)                          # the Excel term, written
back = Translators.between(X.DIALECT, E.DIALECT).forward(formula)
```

## What a translation keeps

- **The form, not always the value.** Each dialect evaluates by its own rules (see [dialects.md](dialects.md)), so a
  translated constraint can give a different answer on the same data: missing values, `1 == 1.0`, case in text.
- **Each term once.** A term is a nested value, so a let's value inlined at each use of its name is translated once and
  written at each use.
- **Round trips, where both dialects can say it.** The exceptions:

| Source | Target | What changes |
|---|---|---|
| a let (Basic, Python, Excel, Latex `where`) | Matlab, Ccpp, SystemVerilog, which have no let | its value is substituted for its name at every use; it comes back without the let |
| `implies(a, b)` | Matlab | written `~a \|\| b`, which reads back as `or(not(a), b)` |
| an import (Python, Matlab) | a dialect that cannot declare it | dropped; what it brought in must translate by other rules |
| bytes | Matlab, Excel, Latex | no counterpart |
| a Latex `\frac` | any dialect but Python, where it is `/` | no counterpart |
| an Excel cell, a Python conditional other than `b if a else True`, an extension | a dialect without it | no counterpart |
| a quantifier or a collection operation | Python | a generator expression or a builtin (`all(p > 0 for p in xs)`, `len(xs)`, `xs[i]`); `unique(xs)` is written `len(set(xs)) == len(xs)`, which does not read back |
| a quantifier or a collection operation | SystemVerilog | an array method (`xs.and(p) with (p > 0)`, `xs.size()`, `x inside {xs}`); `unique(xs)` is written `xs.unique().size() == xs.size()`, which does not read back |
| a quantifier or a collection operation | Matlab | `arrayfun` and array functions (`all(arrayfun(@(p) p > 0, xs))`, `numel(xs)`, `xs(i + 1)`); `unique(xs)` is written `numel(unique(xs)) == numel(xs)`, which does not read back |
| a quantifier or a collection operation | Excel | `MAP` and `LAMBDA` and array functions (`AND(MAP(xs, LAMBDA(p, p > 0)))`, `ROWS(xs)`, `INDEX(xs, i + 1)`); `unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back |
| a quantifier or a collection operation | Latex, Ccpp | no counterpart; Python, MATLAB and Excel also translate collections into each other directly |

A term with no counterpart raises `ValueError` naming it, by its kind without its dialect's prefix: "Excel cell has no
Matlab counterpart", "Basic call 'entries' has no Python counterpart". Translating directly
or through a third dialect gives the same expression, so pick the pair you need.

## How translators are written

A translator is a list of rules pairing two patterns: forms whose arguments and attributes may be holes. A pattern
names a kind by its branch's tag in `Expressions.Framework.Term` (`call`, `excel_field`) and its attributes and
arguments as `Terms.form` reads them.

```python fragment
from mbse.Expressions.Framework.Translators import Hole, Pairwise, Pattern as P, Rule, holes, renames
X_, K = Hole("X"), Hole("K", str)
Rule(P("call", X_, P("literal", value=K), callable="has"),                   # Basic has(x, 'k') <->
     P("call", P("call", P("excel_field", X_, name=K), callable="ISERROR"), callable="NOT"))  # Excel NOT(ISERROR(x.k))
renames("call", "callable", "excel_infix", "operator", {"eq": "=", "ne": "<>"}, 2)
```

Applying a rule co-traverses its pattern with the term, binding the holes (a hole bound twice to equal terms), then
writes the other pattern. The most specific rule wins. `Inline`, `Elide` and `Prelude` declare substituting lets, dropping imports and adding them;
`Convert` maps literals whose values the dialects write differently (a `uint8` literal is C's `(uint8_t)200`).
A translator between a dialect and itself is a rewriting: `Pairwise(E.DIALECT, E.DIALECT, rules)`.

## Go deeper

| Topic | Read |
|---|---|
| Rules, patterns, holes and co-traversal | [CAP-101: translation between dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-101.md#translators), in mbse-basis |
| The rules of every pair | [python3/mbse/Expressions/Translators/](https://github.com/pitaman71/mbse-expressions/blob/main/python3/mbse/Expressions/Translators) |
| Round trips, routes, sharing, refusals and evaluation, case by case | [TRN, the translators' test suite](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/07_Translators.ipynb) |
