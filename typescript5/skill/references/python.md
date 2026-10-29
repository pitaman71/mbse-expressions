# mbse-expressions in Python

Install `mbse-expressions` (the `numpy` extra lets Python expressions import numpy), then import the Basic dialect
from `mbse.Expressions`, the others from `mbse.Expressions.Dialects.<Name>`, and the framework from
`mbse.Expressions.Framework`. Expressions are stored in an mbse-schemas store (`Builders.Store()`), whose schemas the
framework's install and each dialect's define.

## A complete program

A constraint about contacts, evaluated, stored, translated to Excel and Python, and applied to a union value.

```python
from mbse.Expressions import Evaluators, Expressions as E, Framework, Translators
from mbse.Expressions.Dialects import Basic, Excel, Python
from mbse.Expressions.Dialects.Excel import Evaluators as ExcelEvaluators, Text as ExcelText
from mbse.Expressions.Dialects.Python import Text as PythonText
from mbse.Expressions.Framework import Terms
from mbse.Schemas.Framework import Builders, JSON, Validators


def contacts(txn):
    """The program's schemas, defined in the store as mbse-schemas defines any: a contact, and a card that reaches one
    by phone or by email (a union)."""
    S = txn.Schemas
    return txn.uid("example.contacts/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Contact": S.OfObject, "Card": S.OfObject, "Reach": S.OfUnion, "Phone": S.OfObject, "Email": S.OfObject})
        .spec([
            lambda _: _.Contact.name("Contact").ref(True).properties({"name": S.OfStr, "age": S.OfInt, "email": S.OfStr}),
            lambda _: _.Phone.name("Phone").properties({"number": S.OfStr}),
            lambda _: _.Email.name("Email").properties({"address": S.OfStr}),
            lambda _: _.Reach.name("Reach").branches([lambda t: t.name("phone").schema([_.Phone]),
                                                      lambda t: t.name("email").schema([_.Email])]),
            lambda _: _.Card.name("Card").ref(True).properties({"reach": _.Reach}),
        ])]))])


store = Builders.Store()  # an mbse-schemas store: the schemas, the objects, and the expressions about them
for install in (Framework.install, Basic.install, Excel.install, Python.install, contacts):
    store.transaction(install)  # each dialect's install adds its kinds of term; run again, an install writes nothing
with store.transaction():
    ada = store.Contact(lambda c: c.name("Ada").age(70).email("ada@example.com"))
    bob = store.Contact(lambda c: c.name("Bob").age(30))
    eve = store.Contact(lambda c: c.name("Eve").email("eve@example.com"))  # no age

# A constraint, read from a Python lambda into a writer, and written as an expression's root in a transaction. Writers
# build the same: contact.age.ge(65).and_(contact.has("email")), with contact = E.variable("contact").
with store.transaction():
    senior = store.Expressions.Framework.Expression(lambda e: e.root(
        PythonText.FromFunction(lambda contact: contact.age >= 65 and contact.email is not None)))
assert E.DIALECT.validate(senior, bound={"contact"}, core=True) == []

# Basic evaluates with three-valued logic: an absent property is unknown (None), and nothing is coerced.
assert Evaluators.OfAny(senior, {"contact": ada}) is True
assert Evaluators.OfAny(senior, {"contact": bob}) is False
assert Evaluators.OfAny(senior, {"contact": eve}) is None

# It is data: a term is a value of Expressions.Framework.Term; store it and read it back.
Term = store.registered("Expressions.Framework.Term")
text = JSON.ToJSON(store)(Term, Terms.term(senior))
constraint = JSON.FromJSON(store)(Term, text)
assert Terms.same(constraint, senior)

# Translate it into other languages: a translation is a writer, written in a transaction. Each evaluates by its own rules.
def written(writer):
    with store.transaction():
        return store.Expressions.Framework.Term(writer)


formula = written(Translators.between(E.DIALECT, Excel.Expressions.DIALECT).forward(constraint))
assert ExcelText.ToText(formula) == "=AND(contact.age >= 65, NOT(ISERROR(contact.email)))"
assert ExcelEvaluators.OfAny(formula, {"contact": eve}) == ExcelEvaluators.Error("#FIELD!")  # an error value, not unknown
code = written(Translators.between(E.DIALECT, Python.Expressions.DIALECT).forward(constraint))
assert PythonText.ToText(code) == "contact.age >= 65 and hasattr(contact, 'email')"

# A union value is a record of its one branch, by name, so a constraint reads it like any object.
with store.transaction():
    card = store.Card(lambda c: c.reach(lambda p: p.as_value(lambda a: a.as_union(
        lambda u: u.email(lambda r: r.address("ada@example.com"))))))
assert Validators.Validate(store)(store.registered("Card"), card) == []
this = E.variable("this")
assert Evaluators.OfAny(written(this.reach.has("email")), {"this": card}) is True
assert Evaluators.OfAny(written(this.reach.has("phone")), {"this": card}) is False
```

## Cheat sheet

```python fragment
# Installs: one transaction each, the framework's first; a dialect's adds its kinds to Expressions.Framework.Term.
store = Builders.Store(); store.transaction(Framework.install); store.transaction(Basic.install)  # then Python.install, ...
Term = store.registered("Expressions.Framework.Term")

# Writers: methods that write terms where they are given, within a transaction.
this = E.variable("this"); E.literal(1); E.let_("a", value, body); E.operation("name", *arguments)
with store.transaction():
    expression = store.Expressions.Framework.Expression(lambda e: e.root(this.age.ge(18)))  # an expression, by its root
    term = store.Expressions.Framework.Term(E.DIALECT.spec(this.age.ge(18)))               # a term value alone
Domains.register("uint8", Domains.OfInteger.Builder().width(8).signed(False).create())  # a literal names its domain
E.literal(200, "uint8"); E.literal(200, domain)            # by name, or a domain registered under one
Domains.Value(domain, 200)                 # a value of a non-default domain, as evaluation gives it; overflow applies
this.age; this.get("eq"); this.has("email")                 # .name is get(this, 'name'); get() for names like eq
t.eq(x) .ne .lt .le .gt .ge .and_(x) .or_(x) .not_() .implies(x) .add(x) .sub(x) .mul(x) .neg()
t.bitand(x) .bitor(x) .bitxor(x) .bitnot() .shl(n) .shr(n)  # on integers and bits of one domain
t.convert(domain) .reinterpret(domain) .pack() .unpack(packed)  # a call's domain is its result's
this.ports.all("p", E.variable("p").width.ge(8))   # .any .count_where; .count() .item(i) .in_(xs) .sum() .min() .max() .unique()
this.entries("wires")                              # an object's entries in an adjacency, as records that get reads
PythonText.FromFunction(lambda this: this.age >= 18 and this.email is not None)  # a writer, from a lambda or a def of one return
PythonText.FromFunction(lambda this: all(p.width >= 8 for p in this.ports) and len(this.ports) > 0)  # collections too

# Reading: a term is read through mbse-schemas' readers; Terms gives the generic reads.
Terms.term(expression)                     # the root term of an Expression (or a term itself)
Terms.kind_of(term); Terms.form(term)      # ("call", record); Form(kind, attributes, arguments)
E.DIALECT.validate(term, bound={"this"}, core=True)          # problems, [] when valid
E.DIALECT.infer(term, {"this": Domains.Object})              # from mbse.Expressions.Dialects.Basic import Domains

# Evaluation: a scope, or a mapping of variables.
Evaluators.OfAny(expression, {"this": value})               # True, False, a value, or None when unknown
Partials.OfAny(constraint, {"this": value})                 # the residual: a writer, what is known evaluated, the rest kept

# Storage, traversal, translation: the same calls in every dialect.
JSON.ToJSON(store)(Term, term); JSON.FromJSON(store)(Term, text)   # YAML likewise; a term reads back as a term value
Terms.walk(e); Terms.fold(e, lambda term, results: ...); Terms.same(a, b)   # from mbse.Expressions.Framework import Terms
Symbolics.free(e, E.DIALECT); Symbolics.imports(e, P.DIALECT)  # the names e needs from its scope, and the imports it declares
Translators.between(E.DIALECT, Excel.DIALECT).forward(e, trace=[])   # a writer of the Excel term; write it in a transaction
Translators.Basic_Python.NUMPY.forward(e)
ExcelText.ToText(e); PythonText.ToText(e); PythonText.FromText("import math\nmath.floor(x)")  # FromText: Python only, a writer
```

## Traps

- `FromFunction` reads the function's source file, so it fails in `python -c`, `eval` and some REPLs. Use writers there.
- `1 == 1.0` is unknown in Basic, and `True` is not an `int`. Write literals of the type the data has.
- In `FromFunction`, `x.email is not None` means `has(x, 'email')`; `x.email` alone is `get`, unknown when absent.
- Evaluating an operation outside the core raises `NotImplementedError`: validate with `core=True` first.
- Each mbse-schemas store has its own schemas: run each install once per store, and an install and what uses it in
  separate transactions. Transactions do not nest: build what a writer needs (a translation's source term, say) before
  opening the one that writes it.
- A translation, a residual and `FromFunction` give writers, not terms: write them (`store.Expressions.Framework.Term(w)`
  in a transaction) before rendering or evaluating them.
- A Python-dialect scope imports nothing by default: `Python.Evaluators.Scope(variables, modules={"numpy": numpy})`.

## Go deeper

| Topic | Read |
|---|---|
| Learning it by example: constraints as data, unknowns, collections, value domains, partial evaluation, analysis and rewriting, translation, and C and SystemVerilog | [the tutorial, eight case studies](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tutorials/README.md) |
| The Basic dialect: kinds, core vocabulary, evaluation, installs and writers, `Python.Text.FromFunction` | [EXPRESSIONS.md, The Basic dialect](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EXPRESSIONS.md#the-basic-dialect) |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/TestPlan.md) |
