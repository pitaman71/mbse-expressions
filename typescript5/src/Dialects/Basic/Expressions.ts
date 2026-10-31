/**
 * Expressions of the Basic dialect: the core vocabulary, for constraints. `Evaluators` evaluates them.
 *
 * Basic's terms are the framework's kinds (`Framework/Terms`) and one of its own, which `install` adds to
 * `Expressions.Framework.Term` by schema extension:
 *
 * - `literal`: a basic scalar (`value`).
 * - `call`: an operation Basic defines (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`: the arguments are
 *   the operation's variables in the order it declares them. See mbse-basis
 *   [CAP-095: Basic terms as data](../../../../../mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
 * - `variable`: the value bound to a `name`.
 * - `let`: binds a `name` to the value of one term (`value`) within another (`body`).
 * - `list` and `mapping`: the container constructors, a list of its `elements`' values and a mapping of its `entries`'
 *   keys to their values.
 * - `quantifier`: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for `all` or
 *   `any` of them, or for how many (`count`): its `quantifier`.
 *
 * A term carries no domain. Basic's operations are data: `install` defines each as a `Schemas.OfExpression` in Basic's
 * module (`Expressions.Basic.add`), its pattern's variables its arguments and its `result` its return, as precise as the
 * basic scalars and containers allow (`Expressions.Basic.Number`, an int or a float; `Expressions.Basic.Ordered`;
 * `Expressions.Basic.Collection`, a list or a mapping; an unrestricted `Schemas.OfAny` where any value goes). `OPERATIONS`
 * is that table, which validation reads: a call naming an operation Basic does not define is refused. `install` also
 * adds Basic's kinds of domain to `Expressions.Framework.DomainKind` (`Domains`) and the schemas of its domains, and
 * Basic's dialect, the singleton `Expressions.Basic`; `define` writes the dialect's data: its operations by name
 * (`Expressions.Framework.Operates`) and its domains, which it owns by name (`Expressions.Framework.Defines`).
 *
 * `DIALECT` reads them (`Terms.Dialect`, with each kind's role, vocabulary and checks), validates and infers.
 *
 * `Writer`s write terms with methods, through the builders: `variable('person').age.ge(18n)` is
 * `ge(get(person, 'age'), 18)`. A writer is a spec, so it goes wherever a term is written, in a transaction:
 * `store.Expressions.Framework.Expression((e: any) => e.root(variable('person').age.ge(18n)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

type Operation = readonly [readonly (readonly [string, string])[], string];

const ANY_ANY: Operation = [[["a", "any"], ["b", "any"]], "bool"];
const ORDER: Operation = [[["a", "ordered"], ["b", "ordered"]], "bool"];
const LOGIC: Operation = [[["a", "bool"], ["b", "bool"]], "bool"];
const ARITHMETIC: Operation = [[["a", "number"], ["b", "number"]], "number"];
const BITWISE: Operation = [[["a", "int"], ["b", "int"]], "int"];
const SHIFT: Operation = [[["value", "int"], ["count", "int"]], "int"];
const EXTREME: Operation = [[["collection", "collection"]], "ordered"];

/** The operations Basic defines, by name: each one's variables, its arguments in order, each a name and a schema, and
 * its result's schema. A schema is a basic scalar's (`bool`, `int`, `str`), Basic's `number`, `ordered` or `collection`,
 * `list` (a list of any values) or `any`. `install` writes each as an `Expressions.Basic.<name>`. */
export const OPERATIONS: ReadonlyMap<string, Operation> = new Map<string, Operation>([
  ["get", [[["object", "any"], ["name", "str"]], "any"]],
  ["has", [[["object", "any"], ["name", "str"]], "bool"]],
  ["eq", ANY_ANY], ["ne", ANY_ANY],
  ["lt", ORDER], ["le", ORDER], ["gt", ORDER], ["ge", ORDER],
  ["and", LOGIC], ["or", LOGIC],
  ["not", [[["a", "bool"]], "bool"]],
  ["implies", LOGIC],
  ["add", ARITHMETIC], ["sub", ARITHMETIC], ["mul", ARITHMETIC],
  ["neg", [[["a", "number"]], "number"]],
  ["bitand", BITWISE], ["bitor", BITWISE], ["bitxor", BITWISE],
  ["bitnot", [[["a", "int"]], "int"]],
  ["shl", SHIFT], ["shr", SHIFT],
  ["count", [[["collection", "collection"]], "int"]],
  ["item", [[["collection", "collection"], ["index", "any"]], "any"]],
  ["in", [[["value", "any"], ["collection", "collection"]], "bool"]],
  ["sum", [[["collection", "collection"]], "number"]],
  ["min", EXTREME], ["max", EXTREME],
  ["unique", [[["collection", "collection"]], "bool"]],
  ["entries", [[["object", "any"], ["adjacency", "str"]], "list"]],
]);

/** The operations Basic defines and their numbers of arguments. */
export const CORE: ReadonlyMap<string, number> = new Map(
  [...OPERATIONS].map(([name, [variables]]) => [name, variables.length]));

/** Basic's own kind, added to the framework's terms; its dialect's schema, whose singleton is `Expressions.Basic`; its
 * kinds of domain, added to the framework's, and its domains' schemas; and its operations, each an expression schema of
 * its module. Run after `Framework.install`, in a transaction of its own; run again, it writes nothing. Its dialect's
 * data, its operations by name and its domains, `define` writes after it. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const scalars: Record<string, any> = { bool: S.OfBool, int: S.OfInt, str: S.OfStr };
  const allScalars: Record<string, any> = { ...scalars, float: S.OfFloat, bytes: S.OfBytes };
  /** A variable's schema: a basic scalar, Basic's shared one, or a fresh unnamed one. */
  const schema = (_: any, name: string): any => {
    if (name in scalars) return scalars[name];
    if (name === "any") return S.OfAny((a: any) => a);
    if (name === "list") {
      return S.OfAny((a: any) => a.schemas([S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((e: any) => e)]))]));
    }
    return ({ number: _.Number, ordered: _.Ordered, collection: _.Collection } as Record<string, any>)[name];
  };
  /** A result's schema, an `OfAny`. */
  const result = (_: any, name: string): any => (name in scalars ? S.OfAny((a: any) => a.schemas([scalars[name]])) : schema(_, name));
  const operation = (name: string) => {
    const [variables, returns] = OPERATIONS.get(name) as Operation;
    return (_: any) => _[`op_${name}`].name(`Expressions.Basic.${name}`).pattern([S.OfPattern((p: any) => p.variables(
      variables.map(([n, s]) => (v: any) => v.name(n).schema([schema(_, s)]))))]).result([result(_, returns)]);
  };
  const [symbols, specs] = F.dialect(txn, "Expressions.Basic");
  const kinds = ["OfBool", "OfInteger", "OfIeee754", "OfBits", "OfBytes", "OfUnicode", "OfIeee1164", "OfEnum", "OfPacked"];
  return txn.uid("mbse.Expressions.Basic/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      ...symbols, Term: S.OfUnion, Quantifier: S.OfObject, // the framework's union, found by its name
      DomainKind: S.OfUnion, Domain: S.OfObject, Packs: S.OfRelation,
      ...Object.fromEntries(kinds.map((kind) => [kind, S.OfObject])),
      Number: S.OfAny, Ordered: S.OfAny, Collection: S.OfAny,
      ...Object.fromEntries([...OPERATIONS.keys()].map((name) => [`op_${name}`, S.OfExpression])),
      ...Object.fromEntries([...Domains.DOMAINS.keys()].map((name) => [`domain_${name}`, S.OfAny])),
    })
    .spec([
      ...specs, // Basic's dialect, the singleton `Expressions.Basic`
      (_: any) => _.Quantifier.name("Expressions.Basic.Quantifier").properties({
        name: S.OfStr, // bound to each item in the body
        quantifier: S.OfStr, // all, any or count
        collection: _.Term,
        body: _.Term,
      }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("quantifier").schema([_.Quantifier])]),

      // --- Its kinds of domain, each a standard's parameters; a packed domain's enum and representation are domains,
      // which a value cannot hold: `Packs` links them ---
      (_: any) => _.OfBool.name("Expressions.Basic.OfBool"),
      (_: any) => _.OfInteger.name("Expressions.Basic.OfInteger").properties({
        width: S.OfInt, signed: S.OfBool, overflow: S.OfStr }),
      (_: any) => _.OfIeee754.name("Expressions.Basic.OfIeee754").properties({ format: S.OfStr, rounding: S.OfStr }),
      (_: any) => _.OfBits.name("Expressions.Basic.OfBits").properties({ width: S.OfInt }),
      (_: any) => _.OfBytes.name("Expressions.Basic.OfBytes").properties({ width: S.OfInt }),
      (_: any) => _.OfUnicode.name("Expressions.Basic.OfUnicode"),
      (_: any) => _.OfIeee1164.name("Expressions.Basic.OfIeee1164").properties({ width: S.OfInt }),
      (_: any) => _.OfEnum.name("Expressions.Basic.OfEnum").properties({
        members: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])) }),
      (_: any) => _.OfPacked.name("Expressions.Basic.OfPacked").properties({
        codes: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfInt])) }),
      (_: any) => _.DomainKind.name("Expressions.Framework.DomainKind").branches([
        (t: any) => t.name("bool").schema([_.OfBool]),
        (t: any) => t.name("integer").schema([_.OfInteger]),
        (t: any) => t.name("ieee754").schema([_.OfIeee754]),
        (t: any) => t.name("bits").schema([_.OfBits]),
        (t: any) => t.name("bytes").schema([_.OfBytes]),
        (t: any) => t.name("unicode").schema([_.OfUnicode]),
        (t: any) => t.name("ieee1164").schema([_.OfIeee1164]),
        (t: any) => t.name("enum").schema([_.OfEnum]),
        (t: any) => t.name("packed").schema([_.OfPacked]),
      ]),
      (_: any) => _.Packs.name("Expressions.Basic.Packs").links([
        (t: any) => t.name("packed"), (t: any) => t.name("domain").schema([_.Domain]),
        (t: any) => t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
      (_: any) => _.Domain.name("Expressions.Framework.Domain").adjacencies({
        packs: (a: any) => a.relation([_.Packs]).me("packed") }),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      ...[...Domains.DOMAINS].map(([name, [scalar]]) => (_: any) => _[`domain_${name}`].name(`Expressions.Basic.${name}`)
        .schemas([allScalars[scalar]])),

      // --- Its operations: the schemas their variables share, and each operation, which its dialect defines ---
      (_: any) => _.Number.name("Expressions.Basic.Number").schemas([S.OfInt, S.OfFloat]),
      (_: any) => _.Ordered.name("Expressions.Basic.Ordered").schemas([S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]),
      (_: any) => _.Collection.name("Expressions.Basic.Collection").schemas([ // a list, or a mapping
        S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((a: any) => a)])),
        S.OfContainer((c: any) => c.index([S.OfAny((a: any) => a)]).element([S.OfAny((a: any) => a)]))]),
      ...[...OPERATIONS.keys()].map(operation),
    ])]))]);
}

/** Basic's dialect as data: the singleton `Expressions.Basic` naming its operations (`operations`, through
 * `Expressions.Framework.Operates`) and owning its domains by name (`domains`, through `Expressions.Framework.Defines`),
 * each related to its schema (`Expressions.Basic.uint8`) by `Expressions.Framework.HasDomain`. Run after `install`, in a
 * transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each domain by its
 * name: `store.transaction(Basic.define)[0].get("uint8")`. */
export function define(txn: any): any {
  const names = [...Domains.DOMAINS.keys()];
  const domain = (name: string) => {
    const [, kind, parameters] = Domains.DOMAINS.get(name) as Domains.DomainEntry;
    const parameterized = (record: any) => {
      for (const [parameter, value] of Object.entries(parameters)) record[parameter](value);
      return record;
    };
    return (_: any) => _[name].kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u[kind](parameterized))))
      .schema([txn.Expressions.Basic[name]]);
  };
  return txn.uid("mbse.Expressions.Basic.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: txn.Expressions.Basic.Dialect,
      ...Object.fromEntries(names.map((name) => [name, txn.Expressions.Framework.Domain])) })
    .spec([
      (_: any) => _.dialect.operations(Object.fromEntries([...OPERATIONS.keys()].map((name) =>
        [name, (e: any) => e.operation(txn.Expressions.Basic[name])]))).domains(Object.fromEntries(names.map((name) =>
        [name, (e: any) => e.domain(_[name])]))),
      ...names.map(domain),
    ])]))]);
}

/** The literal of a native value (`Terms.spec` gives it only a basic scalar). */
function native(value: unknown): Writer | null {
  return literal(value);
}

/** The Basic dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Basic", {
  literal: new F.Kind(F.LITERAL),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.SIGNATURES, required: ["callable"],
    closed: true }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
  list: new F.Kind(F.APPLICATION, { signature: Domains.LIST }),
  mapping: new F.Kind(F.APPLICATION, { signature: Domains.MAPPING }),
  quantifier: new F.Kind(F.QUANTIFIER, { operator: "quantifier", vocabulary: Domains.QUANTIFIERS,
    required: ["name", "quantifier"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers: writing terms with methods ---

/** JavaScript's own protocol probes, never read as properties: awaiting, serializing or inspecting a writer is safe. */
const PROBES = new Set(["then", "toJSON", "constructor", "inspect", "nodeType", "$$typeof", "asymmetricMatch"]);

/**
 * A term written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)` for names that
 * are also methods, such as `eq`. A `Writer` is a spec: it writes its term where it is given. Property names come from
 * schemas at runtime, so they are typed loosely, as proxies' are.
 */
export class Writer extends F.Writer {
  [property: string]: any;

  constructor(write: (union: any) => any) {
    super(write);
    return new Proxy(this, {
      get(target, property, receiver) {
        if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
        if (property.startsWith("_") || PROBES.has(property)) return undefined;
        return (receiver as Writer).get(property);
      },
    });
  }

  get(name: string): Writer {
    return operation("get", this, name);
  }

  has(name: string): Writer {
    return operation("has", this, name);
  }

  eq(other: unknown): Writer {
    return operation("eq", this, other);
  }

  ne(other: unknown): Writer {
    return operation("ne", this, other);
  }

  lt(other: unknown): Writer {
    return operation("lt", this, other);
  }

  le(other: unknown): Writer {
    return operation("le", this, other);
  }

  gt(other: unknown): Writer {
    return operation("gt", this, other);
  }

  ge(other: unknown): Writer {
    return operation("ge", this, other);
  }

  and_(other: unknown): Writer {
    return operation("and", this, other);
  }

  or_(other: unknown): Writer {
    return operation("or", this, other);
  }

  not_(): Writer {
    return operation("not", this);
  }

  implies(other: unknown): Writer {
    return operation("implies", this, other);
  }

  add(other: unknown): Writer {
    return operation("add", this, other);
  }

  sub(other: unknown): Writer {
    return operation("sub", this, other);
  }

  mul(other: unknown): Writer {
    return operation("mul", this, other);
  }

  neg(): Writer {
    return operation("neg", this);
  }

  bitand(other: unknown): Writer {
    return operation("bitand", this, other);
  }

  bitor(other: unknown): Writer {
    return operation("bitor", this, other);
  }

  bitxor(other: unknown): Writer {
    return operation("bitxor", this, other);
  }

  bitnot(): Writer {
    return operation("bitnot", this);
  }

  shl(count: unknown): Writer {
    return operation("shl", this, count);
  }

  shr(count: unknown): Writer {
    return operation("shr", this, count);
  }

  /** The number of items of a collection. */
  count(): Writer {
    return operation("count", this);
  }

  /** The item at a position, or at a key of a keyed list. */
  item(index: unknown): Writer {
    return operation("item", this, index);
  }

  /** Whether this equals one of the items of `collection`. */
  in_(collection: unknown): Writer {
    return operation("in", this, collection);
  }

  sum(): Writer {
    return operation("sum", this);
  }

  min(): Writer {
    return operation("min", this);
  }

  max(): Writer {
    return operation("max", this);
  }

  /** Whether no two items are equal. */
  unique(): Writer {
    return operation("unique", this);
  }

  /** An object's entries in an adjacency, as records. */
  entries(adjacency: string): Writer {
    return operation("entries", this, adjacency);
  }

  /** Whether `body` holds for every item, bound to `name`. */
  all(name: string, body: unknown): Writer {
    return quantifier("all", name, this, body);
  }

  /** Whether `body` holds for some item, bound to `name`. */
  any(name: string, body: unknown): Writer {
    return quantifier("any", name, this, body);
  }

  /** How many items, bound to `name`, `body` holds for. */
  count_where(name: string, body: unknown): Writer {
    return quantifier("count", name, this, body);
  }
}

function specOf(value: unknown): F.Writer | null {
  return value === null || value === undefined ? null : DIALECT.spec(value);
}

/** The variable `name`. */
export function variable(name: string): Writer {
  return new Writer((u: any) => u.variable((v: any) => v.name(name)));
}

/** The literal `value`, a basic scalar. */
export function literal(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => (value === null || value === undefined ? r
    : r.value((p: any) => p.as_scalar(value)))));
}

/** `body`, with `name` bound to the value of `value`. */
export function let_(name: string, value: unknown, body: unknown): Writer {
  const [valueSpec, bodySpec] = [specOf(value), specOf(body)];
  return new Writer((u: any) => u.let((r: any) => {
    r.name(name);
    if (valueSpec !== null) r.value(valueSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The quantifier `quantifier` (`all`, `any` or `count`) of `body`, with `name` bound to each item of `collection`. */
export function quantifier(quantifier: string, name: string, collection: unknown, body: unknown): Writer {
  const [collectionSpec, bodySpec] = [specOf(collection), specOf(body)];
  return new Writer((u: any) => u.quantifier((r: any) => {
    r.name(name).quantifier(quantifier);
    if (collectionSpec !== null) r.collection(collectionSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The list of the values of `elements`, in order. */
export function list_(...elements: unknown[]): Writer {
  const specs = elements.map((element) => DIALECT.spec(element));
  return new Writer((u: any) => u.list((r: any) => r.elements(specs)));
}

/** The mapping of each entry's key's value to its value's: `mapping(["a", 1n], ["b", x])`. */
export function mapping(...entries: (readonly [unknown, unknown])[]): Writer {
  const pairs = entries.map(([key, value]) => [DIALECT.spec(key), DIALECT.spec(value)] as const);
  return new Writer((u: any) => u.mapping((r: any) => r.entries(pairs.map(([key, value]) =>
    (a: any) => a.as_object((o: any) => o.key(key).value(value))))));
}

/** The operation `name` applied to `args`, in the order its variables are declared; for operations without a method. */
export function operation(name: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(name).arguments(specs)));
}
