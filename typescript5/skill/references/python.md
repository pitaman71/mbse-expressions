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

# A constraint, built with writers, written as an expression's root in a transaction.
contact = E.variable("contact")
with store.transaction():
    senior = store.Expressions.Framework.Expression(lambda e: e.root(contact.age.ge(65).and_(contact.has("email"))))
assert E.DIALECT.validate(senior, bound={"contact"}) == []

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
    ada_card = store.Card(lambda c: c.reach(lambda p: p.as_value(lambda a: a.as_union(
        lambda u: u.email(lambda r: r.address("ada@example.com"))))))
assert Validators.Validate(store)(store.registered("Card"), ada_card) == []
card = E.variable("card")
assert Evaluators.OfAny(written(card.reach.has("email")), {"card": ada_card}) is True
assert Evaluators.OfAny(written(card.reach.has("phone")), {"card": ada_card}) is False
```

## Cheat sheet

```python fragment
# Installs: one transaction each, the framework's first; a dialect's adds its kinds to Expressions.Framework.Term.
store = Builders.Store(); store.transaction(Framework.install); store.transaction(Basic.install)  # then Python.install, ...
Term = store.registered("Expressions.Framework.Term")

# Writers: methods that write terms where they are given, within a transaction.
person = E.variable("person"); E.literal(1); E.let_("a", value, body); E.operation("name", *arguments)
E.list_(1, person.age); E.mapping(("lo", 0.5), ("hi", 2.0))  # container constructors: a list, a mapping of key to value
with store.transaction():
    expression = store.Expressions.Framework.Expression(lambda e: e.root(person.age.ge(18)))  # an expression, by its root
    term = store.Expressions.Framework.Term(E.DIALECT.spec(person.age.ge(18)))               # a term value alone
person.age; person.get("eq"); person.has("email")         # .name is get(person, 'name'); get() for names like eq
t.eq(x) .ne .lt .le .gt .ge .and_(x) .or_(x) .not_() .implies(x) .add(x) .sub(x) .mul(x) .neg()
t.bitand(x) .bitor(x) .bitxor(x) .bitnot() .shl(n) .shr(n)  # on ints, two's complement of infinite width
block.ports.all("p", E.variable("p").width.ge(8))  # .any .count_where; .count() .item(i) .in_(xs) .sum() .min() .max() .unique()
block.entries("wires")                             # an object's entries in an adjacency, as records that get reads

# Reading: a term is read through mbse-schemas' readers; Terms gives the generic reads.
Terms.term(expression)                     # the root term of an Expression (or a term itself)
Terms.kind_of(term); Terms.form(term)      # ("call", record); Form(kind, attributes, arguments)
E.DIALECT.validate(term, bound={"person"})                   # problems, [] when valid; a call Basic doesn't define is one
E.DIALECT.infer(term, {"person": Domains.Object})            # from mbse.Expressions.Dialects.Basic import Domains

# Evaluation: a scope, or a mapping of variables.
Evaluators.OfAny(expression, {"person": value})             # True, False, a value, or None when unknown
Partials.OfAny(constraint, {"person": value})               # the residual: a writer, what is known evaluated, the rest kept

# Dialects, operations and domains are data: a dialect is a singleton owning its domains by name.
store.transaction(Basic.define)            # Basic's dialect's data, after its install: its operations and domains
basic = store.singleton("Expressions.Basic"); [str(e.name) for e in basic.operations]   # "get", "has", "eq", ...
store.registered("Expressions.Basic.add").pattern.variables   # its arguments, in order: a, b; .result its return
Domains.read(next(e.domain for e in basic.domains if str(e.name) == "uint8"))   # its kind's data: width 8, unsigned

# Storage, traversal, translation: the same calls in every dialect.
JSON.ToJSON(store)(Term, term); JSON.FromJSON(store)(Term, text)   # YAML likewise; a term reads back as a term value
Terms.walk(e); Terms.fold(e, lambda term, results: ...); Terms.same(a, b)   # from mbse.Expressions.Framework import Terms
Symbolics.free(e, E.DIALECT); Symbolics.imports(e, P.DIALECT)  # the names e needs from its scope, and the imports it declares
Translators.between(E.DIALECT, Excel.DIALECT).forward(e, trace=[])   # a writer of the Excel term; write it in a transaction
Translators.Basic_Python.NUMPY.forward(e)
ExcelText.ToText(e); PythonText.ToText(e); PythonText.FromText("import math\nmath.floor(x)")  # FromText: Python only, a writer
```

## Traps

- `1 == 1.0` is unknown in Basic, and `True` is not an `int`. Write literals of the type the data has.
- `x.email` is `get`, unknown when absent; whether it is present is `x.has("email")`.
- Evaluating an operation Basic does not define raises `NotImplementedError`: validate first. Widths, overflow and the
  conversions wait for type inference: a term carries no domain.
- Each mbse-schemas store has its own schemas: run each install once per store, and an install and what uses it in
  separate transactions. Transactions do not nest: build what a writer needs (a translation's source term, say) before
  opening the one that writes it.
- A translation and a residual give writers, not terms: write them (`store.Expressions.Framework.Term(w)`
  in a transaction) before rendering or evaluating them.
- A Python-dialect scope imports nothing by default: `Python.Evaluators.Scope(variables, modules={"numpy": numpy})`.

## Go deeper

| Topic | Read |
|---|---|
| Learning it by example: constraints as data, unknowns, collections, partial evaluation, analysis and rewriting, translation, and C and SystemVerilog | [the tutorial, seven case studies](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tutorials/README.md) |
| The Basic dialect: kinds, core vocabulary, evaluation, installs and writers | [CAP-095: Basic terms as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-095.md), in mbse-basis |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/python3/tests/TestPlan.md) |
