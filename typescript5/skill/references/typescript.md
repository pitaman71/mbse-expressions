# mbse-expressions in TypeScript

Import the Basic dialect from `@mbse/expressions`, the others from `@mbse/expressions/Dialects/<Name>`, the
translators from `@mbse/expressions/Translators`, and the framework from `@mbse/expressions/Framework`. The API
mirrors Python name for name, snake_case included (`Domains.items_of`), except the framework's reads of terms, in
camelCase (`Terms.nameOf`, `Terms.kindOf`), and writes the same JSON byte for byte.

## A complete program

The same constraint as in Python, built with the same writers.

```typescript
import { Evaluators, Expressions as E, Framework } from "@mbse/expressions";
import * as Basic from "@mbse/expressions/Dialects/Basic";
import * as Excel from "@mbse/expressions/Dialects/Excel";
import * as Python from "@mbse/expressions/Dialects/Python";
import { Terms } from "@mbse/expressions/Framework";
import * as Translators from "@mbse/expressions/Translators";
import { Builders, JSON, Validators } from "@mbse/schemas/Framework";

const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };

/** The program's schemas, defined in the store as mbse-schemas defines any: a contact, and a card that reaches one by
 * phone or by email (a union). */
function contacts(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("example.contacts/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Contact: S.OfObject, Card: S.OfObject, Reach: S.OfUnion, Phone: S.OfObject, Email: S.OfObject })
    .spec([
      (_: any) => _.Contact.name("Contact").ref(true).properties({ name: S.OfStr, age: S.OfInt, email: S.OfStr }),
      (_: any) => _.Phone.name("Phone").properties({ number: S.OfStr }),
      (_: any) => _.Email.name("Email").properties({ address: S.OfStr }),
      (_: any) => _.Reach.name("Reach").branches([(t: any) => t.name("phone").schema([_.Phone]),
        (t: any) => t.name("email").schema([_.Email])]),
      (_: any) => _.Card.name("Card").ref(true).properties({ reach: _.Reach }),
    ])]))]);
}

const store: any = new Builders.Store(); // an mbse-schemas store: the schemas, the objects, and the expressions about them
for (const install of [Framework.install, Basic.install, Excel.install, Python.install, contacts]) {
  store.transaction(install); // each dialect's install adds its kinds of term; run again, an install writes nothing
}
const [ada, bob, eve] = store.transaction(() => [
  store.Contact((c: any) => c.name("Ada").age(70n).email("ada@example.com")),
  store.Contact((c: any) => c.name("Bob").age(30n)),
  store.Contact((c: any) => c.name("Eve").email("eve@example.com")), // no age
]);

// A constraint, built with writers, written as an expression's root in a transaction.
const contact = E.variable("contact");
const senior = store.transaction(() => store.Expressions.Framework.Expression((e: any) => e.root(
  contact.age.ge(65n).and_(contact.has("email")))));
check(E.DIALECT.validate(senior, ["contact"]).length === 0, "invalid");

// Basic evaluates with three-valued logic: an absent property is unknown (null), and nothing is coerced.
check(Evaluators.OfAny(senior, { contact: ada }) === true, "ada");
check(Evaluators.OfAny(senior, { contact: bob }) === false, "bob");
check(Evaluators.OfAny(senior, { contact: eve }) === null, "eve");

// It is data: a term is a value of Expressions.Framework.Term; store it and read it back.
const Term = store.registered("Expressions.Framework.Term");
const text = JSON.ToJSON(store)(Term, Terms.term(senior));
const constraint = JSON.FromJSON(store)(Term, text);
check(Terms.same(constraint, senior), "read back");

// Translate it into other languages: a translation is a writer, written in a transaction. Each evaluates by its own
// rules.
const written = (writer: Terms.Writer): any => store.transaction(() => store.Expressions.Framework.Term(writer));
const formula = written(Translators.between(E.DIALECT, Excel.Expressions.DIALECT).forward(constraint));
check(Excel.Text.ToText(formula) === "=AND(contact.age >= 65, NOT(ISERROR(contact.email)))", "formula");
check(Excel.Evaluators.OfAny(formula, { contact: eve }) === Excel.Evaluators.Error.of("#FIELD!"), "an error value, not unknown");
const code = written(Translators.between(E.DIALECT, Python.Expressions.DIALECT).forward(constraint));
check(Python.Text.ToText(code) === "contact.age >= 65 and hasattr(contact, 'email')", "python");

// A union value is a record of its one branch, by name, so a constraint reads it like any object.
const ada_card = store.transaction(() => store.Card((c: any) => c.reach((p: any) => p.as_value((a: any) => a.as_union(
  (u: any) => u.email((r: any) => r.address("ada@example.com")))))));
check(Validators.Validate(store)(store.registered("Card"), ada_card).length === 0, "card");
const card = E.variable("card");
check(Evaluators.OfAny(written(card.reach.has("email")), { card: ada_card }) === true, "by email");
check(Evaluators.OfAny(written(card.reach.has("phone")), { card: ada_card }) === false, "not by phone");
```

## Differences from Python

| Python | TypeScript |
|---|---|
| `int`, `float` values (`18`, `18.0`) | `bigint` and `number` (`18n`, `18`): `18` is a float, and `ge(get(x, 'age'), 18)` against an int age is unknown |
| `None` | `null` |
| `Domains.OfInteger.Builder().width(8)`, domains compared with `==` | `new Domains.OfInteger.Builder().width(8n)`, compared with `.equals()` |
| `E.mapping(("lo", 0.5), ("hi", x))`, entries as tuples | `E.mapping(["lo", 0.5], ["hi", x])`, entries as arrays |
| a frame's symbols, `store.transaction(Basic.define)[0]["uint8"]` | a `Map`: `store.transaction(Basic.define)[0].get("uint8")` |
| `Terms.name_of`, `Terms.kind_of`, `Terms.attributes_of` | `Terms.nameOf`, `Terms.kindOf`, `Terms.attributesOf` (a `Map`) |
| `with store.transaction(): ...` | `store.transaction(() => ...)`, which returns what its function returns |
| `validate(term, bound={"person"})`, keyword arguments | positional: `validate(term, ["person"])`; options objects elsewhere: `new Scope(variables, { modules })` |
| `Pattern("call", A, B, callable="eq")` | `new Pattern("call", { callable: "eq" }, A, B)` |
| `Python.Text.FromText(source)` | none: build Python expressions with constructors (`P.compare(">=", P.attribute(P.name("x"), "age"), 18n)`) |
| Python expressions evaluated by Python, with real modules | a model of Python's rules; modules are `new Python.Evaluators.Module(name, { members })`; no numpy |
| `NameError`, `ImportError`, `ZeroDivisionError`, `OverflowError` | classes of the same names in `@mbse/expressions/Framework`'s `Errors` |
| Excel's `Error("#FIELD!")`, equal by value | `Error.of("#FIELD!")`, one instance per code, compared with `===` |
| a dict as a mapping | a `Map` or a plain object |

## Go deeper

| Topic | Read |
|---|---|
| The Python tutorial's eight case studies, built with writers | [typescript5/tutorials/](https://github.com/pitaman71/mbse-expressions/blob/main/typescript5/tutorials/README.md) |
| Where the languages deliberately differ, and why | [EQUIVALENCE.md, Deliberate differences](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EQUIVALENCE.md#deliberate-differences) |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/typescript5/tests/TestPlan.md) |
