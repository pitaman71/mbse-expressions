# mbse-expressions in Python

Install `mbse-expressions` (the `numpy` extra lets Python expressions import numpy), then import the Basic dialect
from `mbse.Expressions`, the others from `mbse.Expressions.Dialects.<Name>`, and the framework from
`mbse.Expressions.Framework`.

## A complete program

A rule about contacts, evaluated, stored, translated to Excel and Python, and used as a union predicate.

```python
from mbse.Expressions import Evaluators, Expressions as E, Translators
from mbse.Expressions.Dialects.Excel import Evaluators as ExcelEvaluators, Expressions as Excel
from mbse.Expressions.Dialects.Python import Expressions as Python
from mbse.Schemas.Framework import JSON, Proxies, Schemas as S, Validators


def native(name, type_):
    return lambda p: p.name(name).of(lambda t: t.as_native(type_))


Contact = S.OfObject.Builder().properties(native("name", str), native("age", int), native("email", str)).create()
Proxies.register("Contact", Contact)
B = Proxies.Builders
ada = B.Contact().name("Ada").age(70).email("ada@example.com").create()
bob = B.Contact().name("Bob").age(30).create()
eve = B.Contact().name("Eve").email("eve@example.com").create()  # no age

# A rule, read from a Python lambda into data. Terms write the same: contact.age.ge(65).and_(contact.has("email")).
senior = E.from_(lambda contact: contact.age >= 65 and contact.email is not None).data
assert senior.validate(bound={"contact"}, core=True) == []

# Basic evaluates with three-valued logic: an absent property is unknown (None), and nothing is coerced.
assert Evaluators.OfAny(senior, {"contact": ada}) is True
assert Evaluators.OfAny(senior, {"contact": bob}) is False
assert Evaluators.OfAny(senior, {"contact": eve}) is None

# It is data: store it and read it back.
schema = E.DIALECT.schema_of(senior)
text = JSON.ToJSON.Reachable(schema, senior)
rule = JSON.FromJSON(E.Builders).Reachable(schema, text)

# Translate it into other languages; each evaluates by its own rules.
formula = Translators.between(E.DIALECT, Excel.DIALECT).forward(rule)
assert Excel.render(formula) == "=AND(contact.age >= 65, NOT(ISERROR(contact.email)))"
assert ExcelEvaluators.OfAny(formula, {"contact": eve}) == ExcelEvaluators.Error("#FIELD!")  # an error value, not unknown
code = Translators.between(E.DIALECT, Python.DIALECT).forward(rule)
assert Python.render(code) == "contact.age >= 65 and hasattr(contact, 'email')"

# Union predicates for mbse-schemas are Basic expressions over `this`.
this = E.variable("this")
Phone = S.OfObject.Builder().properties(native("kind", str), native("number", str)).create()
Email = S.OfObject.Builder().properties(native("kind", str), native("address", str)).create()
Reach = S.OfUnion.Builder().branches(lambda b: b.of(Phone).when(this.kind.eq("phone")),
                                     lambda b: b.of(Email).when(this.kind.eq("email"))).create()
Card = S.OfObject.Builder().properties(lambda p: p.name("reach").of(Reach)).create()
Proxies.register("Card", Card)
card = B.Card().reach(lambda u: u.of(Email, lambda r: r.kind("email").address("ada@example.com"))).create()
assert Validators.Validate(B, Evaluators.predicate)(Card, card) == []
```

## Cheat sheet

```python fragment
# Terms: methods that build expressions. .data is the expression; a term is accepted wherever an expression is.
this = E.variable("this"); E.literal(1); E.let_("a", value, body); E.operation("name", *arguments)
this.age; this.get("eq"); this.has("email")                 # .name is get(this, 'name'); get() for names like eq
t.eq(x) .ne .lt .le .gt .ge .and_(x) .or_(x) .not_() .implies(x) .add(x) .sub(x) .mul(x) .neg()
E.from_(lambda this: this.age >= 18 and this.email is not None)    # a lambda, or a def whose body is one return

# Data and builders: create() / clone() / update(), none validate.
E.OfOperation.Builder().name("f").arguments(1, "x").create(); E.OfLet.Builder(let).body(2).clone()
expression.validate(bound={"this"}, core=True)              # problems, [] when valid
E.DIALECT.infer(expression, {"this": Domains.Object})       # from mbse.Expressions.Dialects.Basic import Domains

# Evaluation: a scope, or a mapping of variables.
Evaluators.OfAny(expression, {"this": value})               # True, False, a value, or None when unknown
Evaluators.predicate(predicate, value)                      # binds this; for Validators.Validate(registry, predicate)

# Storage, traversal, translation: the same calls in every dialect.
JSON.ToJSON.Reachable(E.DIALECT.schema_of(e), e); JSON.FromJSON(E.Builders).Reachable(schema, text)
F.walk(e); F.fold(e, lambda node, results: ...); F.same(a, b)   # from mbse.Expressions.Framework import Terms as F
Symbolics.free(e); Symbolics.imports(e)     # the names e needs from its scope, and the imports it declares
Translators.between(E.DIALECT, Excel.DIALECT).forward(e, trace=[]); Translators.Basic_Python.NUMPY.forward(e)
Excel.render(e); Python.render(e); Python.parse("import math\nmath.floor(x)")    # parse is Python's only
```

## Traps

- `from_` reads the function's source file, so it fails in `python -c`, `eval` and some REPLs. Use terms there.
- `1 == 1.0` is unknown in Basic, and `True` is not an `int`. Write literals of the type the data has.
- In `from_`, `x.email is not None` means `has(x, 'email')`; `x.email` alone is `get`, unknown when absent.
- Evaluating an operation outside the core raises `NotImplementedError`: validate with `core=True` first.
- mbse-schemas' proxy registry is global to the process: register each schema name once.
- A Python-dialect scope imports nothing by default: `Python.Evaluators.Scope(variables, modules={"numpy": numpy})`.

## Go deeper

| Topic | Read |
|---|---|
| Rules as data: building, evaluating, saving, analyzing and rewriting | [the tutorial](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tutorials/01_Rules_As_Data.ipynb) |
| The Basic dialect: kinds, core vocabulary, evaluation, meta-schemas, terms, `from_` | [EXPRESSIONS.md, The Basic dialect](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#the-basic-dialect) |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/TestPlan.md) |
