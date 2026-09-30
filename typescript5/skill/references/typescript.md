# mbse-expressions in TypeScript

Import the Basic dialect from `@mbse/expressions`, the others from `@mbse/expressions/Dialects/<Name>`, the
translators from `@mbse/expressions/Translators`, and the framework from `@mbse/expressions/Framework`. The API
mirrors Python name for name, snake_case included (`schema_of`, `name_of`), and writes the same JSON byte for byte.

## A complete program

The same rule as in Python, written with terms, which TypeScript uses in place of `from_`.

```typescript
import { Evaluators, Expressions as E } from "@mbse/expressions";
import * as Excel from "@mbse/expressions/Dialects/Excel";
import * as Python from "@mbse/expressions/Dialects/Python";
import * as Translators from "@mbse/expressions/Translators";
import { JSON, Proxies, Schemas as S, Validators } from "@mbse/schemas/Framework";

const native = (name: string, type: S.OfNative.Spec) => (p: S.OfProperty.Builder) => p.name(name).of((t) => t.as_native(type));
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };

const Contact = new S.OfObject.Builder().properties(native("name", String), native("age", BigInt), native("email", String)).create();
Proxies.register("Contact", Contact);
const B = Proxies.Builders;
const ada = B.Contact().name("Ada").age(70n).email("ada@example.com").create();
const bob = B.Contact().name("Bob").age(30n).create();
const eve = B.Contact().name("Eve").email("eve@example.com").create(); // no age

// A rule, written with terms: methods that build data. (Python can also read one from a lambda.)
const contact = E.variable("contact");
const senior = contact.age.ge(65n).and_(contact.has("email")).data;
check(senior.validate({ bound: ["contact"], core: true }).length === 0, "invalid");

// Basic evaluates with three-valued logic: an absent property is unknown (null), and nothing is coerced.
check(Evaluators.OfAny(senior, { contact: ada }) === true, "ada");
check(Evaluators.OfAny(senior, { contact: bob }) === false, "bob");
check(Evaluators.OfAny(senior, { contact: eve }) === null, "eve");

// It is data: store it and read it back.
const schema = E.DIALECT.schema_of(senior);
const text = JSON.ToJSON.Reachable(schema, senior);
const rule = JSON.FromJSON(E.Builders).Reachable(schema, text) as E.OfAny.Data; // decoders return unknown

// Translate it into other languages; each evaluates by its own rules.
const formula = Translators.between(E.DIALECT, Excel.Expressions.DIALECT).forward(rule);
check(Excel.Expressions.render(formula) === "=AND(contact.age >= 65, NOT(ISERROR(contact.email)))", "formula");
check(Excel.Evaluators.OfAny(formula, { contact: eve }) === Excel.Evaluators.Error.of("#FIELD!"), "an error value, not unknown");
const code = Translators.between(E.DIALECT, Python.Expressions.DIALECT).forward(rule);
check(Python.Expressions.render(code) === "contact.age >= 65 and hasattr(contact, 'email')", "python");

// Union predicates for mbse-schemas are Basic expressions over `this`.
const self = E.variable("this");
const Phone = new S.OfObject.Builder().properties(native("kind", String), native("number", String)).create();
const Email = new S.OfObject.Builder().properties(native("kind", String), native("address", String)).create();
const Reach = new S.OfUnion.Builder().branches((b) => b.of(Phone).when(self.kind.eq("phone")),
  (b) => b.of(Email).when(self.kind.eq("email"))).create();
const Card = new S.OfObject.Builder().properties((p) => p.name("reach").of(Reach)).create();
Proxies.register("Card", Card);
const card = B.Card().reach((u: any) => u.of(Email, (r: any) => r.kind("email").address("ada@example.com"))).create();
check(Validators.Validate(B, Evaluators.predicate)(Card, card).length === 0, "card");
```

## Differences from Python

| Python | TypeScript |
|---|---|
| `int`, `float` values (`18`, `18.0`) | `bigint` and `number` (`18n`, `18`): `18` is a float, and `ge(get(x, 'age'), 18)` against an int age is unknown |
| `None` | `null` |
| `E.from_(lambda this: ...)` | none: write terms. `this` is reserved, so name that term `self` |
| `validate(bound={"this"}, core=True)`, keyword arguments | options objects: `validate({ bound: ["this"], core: true })`, `new Scope(variables, { modules })` |
| `Pattern("operation", A, B, name="eq")` | `new Pattern("operation", { name: "eq" }, A, B)` |
| `Python.parse(source)` | none: build Python expressions with constructors (`P.compare(">=", P.attribute(P.name("x"), "age"), 18n)`) |
| Python expressions evaluated by Python, with real modules | a model of Python's rules; modules are `new Python.Evaluators.Module(name, { members })`; no numpy |
| `NameError`, `ImportError`, `ZeroDivisionError`, `OverflowError` | classes of the same names in `@mbse/expressions/Framework`'s `Errors` |
| Excel's `Error("#FIELD!")`, equal by value | `Error.of("#FIELD!")`, one instance per code, compared with `===` |
| a dict as a mapping | a `Map` or a plain object |

## Go deeper

| Topic | Read |
|---|---|
| The same case study as the Python tutorial, written with terms | [typescript5/tutorials/](https://github.com/pitaman71/mbse-expressions/blob/main/typescript5/tutorials/README.md) |
| Where the languages deliberately differ, and why | [EQUIVALENCE.md, Deliberate differences](https://github.com/pitaman71/mbse-expressions/blob/main/docs/EQUIVALENCE.md#deliberate-differences) |
| Every behavior, as test cases | [the test plan](https://github.com/pitaman71/mbse-expressions/blob/main/typescript5/tests/TestPlan.md) |
