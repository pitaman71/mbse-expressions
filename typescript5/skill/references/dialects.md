# Dialects

A dialect is an expression language: its term kinds, its vocabulary of operators, the domains of its values, its
source text (its `Text` module: `ToText`, and for Python `FromText`), its evaluator, and the scope that resolves its names. Every dialect serializes, validates,
infers domains and traverses the same way (see `DIALECT.schema_of`, `validate`, `DIALECT.infer`, `Framework.Terms.walk`),
and `Framework.Symbolics.free(expression)` tells which names it needs from its scope.

## Which dialect

| Use | For |
|---|---|
| **Basic** (`mbse.Expressions`) | the rule itself: the neutral form to store, share and analyze. rules every binding evaluates are Basic, over `this`, using only the core vocabulary |
| **Python** | Python source, to run the rule in Python or read one from Python code; NumPy style evaluates over columns |
| **Matlab** | MATLAB source, for rules that live in MATLAB code or Simulink models |
| **Excel** | worksheet formulas, for rules that live in spreadsheets, over cells and records |
| **Latex** | notation, for rules in documents and specifications; it has no evaluator: translate to evaluate |
| **Ccpp** | C and C++ source, for rules over the types of embedded software and interface control documents (`uint8_t`, `float`) |
| **SystemVerilog** | SystemVerilog source, for rules over hardware signals and registers: assertions, constraints and checks on vectors whose bits may be x or z |

Write a rule in Basic, and translate it where it must run; read one written elsewhere back into Basic to analyze it.

## Constructors and source text

```python fragment
from mbse.Expressions.Dialects.Python import Expressions as P, Text as PT
P.compare(">=", P.attribute(P.name("this"), "age"), 18)      # ast-shaped: name, attribute, subscript, call, compare,
P.call("np.greater_equal", P.subscript(P.name("t"), "age"), 18)  # boolop, binop, unaryop, ifexp, let, import, importfrom
P.import_("numpy", body, alias="np"); PT.ToText(e); PT.FromText("import numpy as np\nnp.add(x, 1)")  # Python only

from mbse.Expressions.Dialects.Matlab import Expressions as M, Text as MT
M.binary("&&", M.binary(">=", M.field(M.identifier("s"), "age"), 18), M.call("isfield", M.identifier("s"), "email"))
M.import_("pkg.*", body); MT.ToText(e)                   # s.age >= 18 && isfield(s, "email")

from mbse.Expressions.Dialects.Excel import Expressions as X, Text as XT
X.let_("a", X.field(X.name("r"), "age"), X.function("AND", X.infix(">=", X.name("a"), 18), X.cell("B2", "Sheet1")))
XT.ToText(e)                                             # =LET(a, r.age, AND(a >= 18, Sheet1!B2))

from mbse.Expressions.Dialects.Latex import Expressions as L, Text as LT
L.where("a", L.member(L.symbol("r"), "age"), L.binary("\\geq", L.symbol("a"), L.frac(36, 2)))
LT.ToText(e)                                             # a \geq \frac{36}{2} \quad \text{where } a = r.\mathit{age}
```

## Each evaluates by its language's rules

| | Missing property | `1 == 1.0` | Logic | Other |
|---|---|---|---|---|
| Basic | unknown (`None`) | unknown: no coercion | Kleene, short-circuit | only the core vocabulary evaluates |
| Python | `AttributeError` | `True` | `and`/`or` give an operand | NumPy style: vectorized, missing values masked |
| Matlab | error (`isfield` tests first) | true | two-valued, short-circuit | numbers are doubles; `+` concatenates strings |
| Excel | `#FIELD!` | TRUE | `AND`/`OR` evaluate every argument | errors are values that propagate; text compares ignoring case |
| Latex | no evaluator | | | translate to a dialect that evaluates |
| Ccpp | `KeyError` (no member) | true, after the usual conversions | `&&`/`\|\|` short-circuit, give `bool` | unsigned wraps; undefined behavior (signed overflow, ...) raises |
| SystemVerilog | `KeyError` (no member) | `1'b1`, compared as reals | 1, 0 or x (`1'bx`) by the truth of each operand | values are sized vectors; x and z propagate; division by zero gives x |

## Scopes: names, imports and references

An evaluator takes a mapping of variables, or a scope, which resolves names the dialect's way. A scope reaches only
what the caller gives it, so expressions from untrusted data cannot import or call other code.

```python fragment
Python.Evaluators.Scope(variables, modules={"numpy": numpy}, builtins=None)   # imports: only these modules
Matlab.Evaluators.Scope(variables, functions={"twice": f}, packages={"geo": {"dist": d}})   # path, import pkg.*
Excel.Evaluators.Workbook(names, {"Sheet1": {"A1": 2}}, name="Book1", books={"Rates.xlsx": other}, add_ins={"DOUBLE": f})
```

- Python resolves a let or import, then a variable, then a builtin (`abs`, `hasattr`, `len`, ...). Attributes whose
  names start with `_` are refused, and a call may call only a builtin, a variable's value or a function of an allowed
  module.
- MATLAB resolves a function as a built-in (`isfield`), then imported, then on the path, then qualified (`pkg.fn`).
- Excel resolves a name as a `LET`, then a defined name, else `#NAME?`; a cell as its value, 0 when empty, `#REF!`
  when its sheet or book does not exist; a function as a built-in, then an add-in.

## Go deeper

| Topic | Read |
|---|---|
| Every dialect's kinds, values and evaluation, and how scopes resolve | [EXPRESSIONS.md, Dialects](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#dialects) |
| Each dialect's rules, case by case | [DIA, the dialects' test suite](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/06_Dialects.ipynb) |
