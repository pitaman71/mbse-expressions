# mbse-expressions in Python

Install `mbse-expressions` (the `numpy` extra lets Python expressions import numpy), then import the Basic dialect
from `mbse.Expressions`, the others from `mbse.Expressions.Dialects.<Name>`, and the framework from
`mbse.Expressions.Framework`.

## A complete program

A rule about contacts, evaluated, stored, translated to Excel and Python, and applied to a union value.

```python
from mbse.Expressions import Evaluators, Expressions as E, Translators
from mbse.Expressions.Dialects.Excel import Evaluators as ExcelEvaluators, Expressions as Excel, Text as ExcelText
from mbse.Expressions.Dialects.Python import Expressions as Python, Text as PythonText
from mbse.Schemas.Framework import JSON, Proxies, Schemas as S, Validators


def native(name, type_):
    return lambda p: p.name(name).of(lambda t: t.as_native(type_))


Contact = S.OfObject.Builder().name("Contact").ref().properties(native("name", str), native("age", int), native("email", str)).create()
store = Proxies.OfStore()  # an mbse-schemas store: the program's schemas, and the objects built with them
store.register(Contact)
B = store
ada = B.Contact().name("Ada").age(70).email("ada@example.com").create()
bob = B.Contact().name("Bob").age(30).create()
eve = B.Contact().name("Eve").email("eve@example.com").create()  # no age

# A rule, read from a Python lambda into data. Writers build the same: contact.age.ge(65).and_(contact.has("email")).
senior = PythonText.FromFunction(lambda contact: contact.age >= 65 and contact.email is not None).data
assert senior.validate(bound={"contact"}, core=True) == []

# Basic evaluates with three-valued logic: an absent property is unknown (None), and nothing is coerced.
assert Evaluators.OfAny(senior, {"contact": ada}) is True
assert Evaluators.OfAny(senior, {"contact": bob}) is False
assert Evaluators.OfAny(senior, {"contact": eve}) is None

# It is data: store it and read it back.
schema = E.DIALECT.schema_of(senior)
text = JSON.ToJSON(E.Builders).Reachable(schema, senior)  # E.Builders: the store of Basic's expression classes
rule = JSON.FromJSON(E.Builders).Reachable(schema, text)

# Translate it into other languages; each evaluates by its own rules.
formula = Translators.between(E.DIALECT, Excel.DIALECT).forward(rule)
assert ExcelText.ToText(formula) == "=AND(contact.age >= 65, NOT(ISERROR(contact.email)))"
assert ExcelEvaluators.OfAny(formula, {"contact": eve}) == ExcelEvaluators.Error("#FIELD!")  # an error value, not unknown
code = Translators.between(E.DIALECT, Python.DIALECT).forward(rule)
assert PythonText.ToText(code) == "contact.age >= 65 and hasattr(contact, 'email')"

# A union value is a record of its one branch, by name, so a rule reads it like any object.
this = E.variable("this")
Phone = S.OfObject.Builder().properties(native("number", str)).create()
Email = S.OfObject.Builder().properties(native("address", str)).create()
Reach = S.OfUnion.Builder().branches(lambda b: b.name("phone").of(Phone), lambda b: b.name("email").of(Email)).create()
Card = S.OfObject.Builder().name("Card").ref().properties(lambda p: p.name("reach").of(Reach)).create()
store.register(Card)
card = B.Card().reach(lambda u: u.email(lambda r: r.address("ada@example.com"))).create()
assert Validators.Validate(B)(Card, card) == []
assert Evaluators.predicate(this.reach.has("email"), card) is True
```

## Cheat sheet

```python fragment
# Writers: methods that build expressions. .data is the expression; a writer is accepted wherever an expression is.
this = E.variable("this"); E.literal(1); E.let_("a", value, body); E.operation("name", *arguments)
E.literal(200, Domains.OfInteger.Builder().width(8).signed(False).create())   # a literal of a value domain
Domains.register("uint8", domain)          # a registered domain is written by name
Domains.Value(domain, 200)                 # a value of a non-default domain, as evaluation gives it; overflow applies
this.age; this.get("eq"); this.has("email")                 # .name is get(this, 'name'); get() for names like eq
t.eq(x) .ne .lt .le .gt .ge .and_(x) .or_(x) .not_() .implies(x) .add(x) .sub(x) .mul(x) .neg()
t.bitand(x) .bitor(x) .bitxor(x) .bitnot() .shl(n) .shr(n)  # on integers and bits of one domain
t.convert(domain) .reinterpret(domain) .pack() .unpack(packed)  # an operation's domain is its result's
this.ports.all("p", E.variable("p").width.ge(8))   # .any .count_where; .count() .item(i) .in_(xs) .sum() .min() .max() .unique()
this.entries("wires")                              # an object's entries in an adjacency, as records that get reads
PythonText.FromFunction(lambda this: this.age >= 18 and this.email is not None)  # a lambda, or a def of one return

# Data and builders: create() / clone() / update(), none validate.
E.OfOperation.Builder().name("f").arguments(1, "x").create(); E.OfLet.Builder(let).body(2).clone()
expression.validate(bound={"this"}, core=True)              # problems, [] when valid
E.DIALECT.infer(expression, {"this": Domains.Object})       # from mbse.Expressions.Dialects.Basic import Domains

# Evaluation: a scope, or a mapping of variables.
Evaluators.OfAny(expression, {"this": value})               # True, False, a value, or None when unknown
Evaluators.predicate(rule, value)                           # binds this; True, False, or None when unknown
Partials.OfAny(rule, {"this": value})                       # the residual: what is known evaluated, the rest an expression

# Storage, traversal, translation: the same calls in every dialect.
JSON.ToJSON(E.Builders).Reachable(E.DIALECT.schema_of(e), e); JSON.FromJSON(E.Builders).Reachable(schema, text)
register(Proxies.OfStore())                 # from mbse.Expressions import register: a store with every dialect's schemas
F.walk(e); F.fold(e, lambda term, results: ...); F.same(a, b)   # from mbse.Expressions.Framework import Terms as F
Symbolics.free(e); Symbolics.imports(e)     # the names e needs from its scope, and the imports it declares
Translators.between(E.DIALECT, Excel.DIALECT).forward(e, trace=[]); Translators.Basic_Python.NUMPY.forward(e)
ExcelText.ToText(e); PythonText.ToText(e); PythonText.FromText("import math\nmath.floor(x)")  # FromText: Python only
```

## Traps

- `FromFunction` reads the function's source file, so it fails in `python -c`, `eval` and some REPLs. Use writers there.
- `1 == 1.0` is unknown in Basic, and `True` is not an `int`. Write literals of the type the data has.
- In `FromFunction`, `x.email is not None` means `has(x, 'email')`; `x.email` alone is `get`, unknown when absent.
- Evaluating an operation outside the core raises `NotImplementedError`: validate with `core=True` first.
- Each mbse-schemas store has its own schemas: register a schema name once per store.
- A Python-dialect scope imports nothing by default: `Python.Evaluators.Scope(variables, modules={"numpy": numpy})`.

## Go deeper

| Topic | Read |
|---|---|
| Learning it by example: rules as data, unknowns, collections, value domains, partial evaluation, analysis and rewriting, translation, and C and SystemVerilog | [the tutorial, eight case studies](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tutorials/README.md) |
| The Basic dialect: kinds, core vocabulary, evaluation, meta-schemas, writers, `Python.Text.FromFunction` | [EXPRESSIONS.md, The Basic dialect](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#the-basic-dialect) |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/TestPlan.md) |
