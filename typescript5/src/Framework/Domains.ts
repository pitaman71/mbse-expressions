/**
 * Domains: the types of the values expressions denote, and the signatures of operators over them.
 *
 * The reading interface over stored domains and operations, each a `Readers.OfObject` found by its path
 * (`dialect.domains({ name: "octet" })`) or a schema's `domain`:
 *
 * - `kindOf(domain)`: its kind, `[dialect, tag, record]`, read through its dialect's union of kinds (`isoiec11404`,
 *   `integer`, and the record of `Expressions.ISOIEC11404.Expressions.OfInteger`), the dialect's tag telling apart kinds
 *   two dialects name alike (C's and C++'s `nullptr_t`); "a domain needs a kind" where it holds none.
 * - `properties(domain)`: its kind's properties that are set, its parameters and its inferred properties alike, by
 *   name; a container as an array of its elements.
 * - `nameOf(domain)`: the name its dialect defines it by (its `Defines` entry's), or null.
 * - `operations(dialect)`: a dialect's operations by name, in the order its singleton names them, each its
 *   `Schemas.OfExpression`; `arity(operation)`: the number of its pattern's variables, its arguments.
 *
 * A `Domain` is a set of values: `contains(value)` tests membership at run time, and `includes(other)` tests
 * statically that every value of `other` is also one of its own. A `Signature` gives an operator's number of arguments
 * and the domain of its result for the domains of its arguments, or `null` when it does not apply to them. A dialect's
 * vocabulary maps each operator name to its signature, and `Dialect.infer` uses them to find an expression's domain
 * without evaluating it.
 *
 * Inference is permissive: a domain that `overlaps` a parameter's (one includes the other) is accepted, since
 * `Anything`, the domain of a value not known statically, overlaps every domain.
 *
 * The implementations here are generic; each dialect's `Domains` module defines its own domains with them.
 */

import { Errors } from "@mbse/schemas/Framework";
import type { Readers, Schemas } from "@mbse/schemas/Framework";

import * as Objects from "./Objects.js";

// --- Reading stored domains and operations ---

/** The tag and the visitor of the branch a union value holds, or null where it holds none. */
function branch(union: Readers.OfUnion): [string, Readers.OfUnion] | null {
  const schema = union.as_schema() as Schemas.OfUnion.Data | null; // null: an absent value, which holds no branch
  const held = (schema?.branches ?? []).map((b): [string, Readers.OfUnion] => [b.name, union[b.name] as Readers.OfUnion]);
  const found = held.find(([, visitor]) => visitor.as_schema() !== null);
  return found === undefined ? null : found;
}

/** A stored domain's kind, `[dialect, tag, record]`: the branch of `Expressions.Framework.DomainKind` that names its
 * dialect, and the branch of that dialect's union of kinds it holds. */
export function kindOf(domain: Readers.OfObject): [string, string, Readers.OfObject] {
  const found: Readers.OfUnion[] = [];
  (domain.kind as Readers.OfProperty).as_value((a) => a.as_union((u) => {
    found.push(u);
    return u;
  }));
  const dialect = branch(found[0] as Readers.OfUnion);
  if (dialect === null) throw new Errors.ValueError("a domain needs a kind");
  const [tag, record] = branch(dialect[1]) as [string, unknown]; // a union value holds exactly one branch
  return [dialect[0], tag, record as Readers.OfObject];
}

/** A stored domain's kind's properties that are set, its parameters and its inferred properties alike, by name, in
 * its kind's schema's order: a scalar as itself, a container as an array of its elements. */
export function properties(domain: Readers.OfObject): Map<string, unknown> {
  const found = new Map<string, unknown>();
  for (const [name, value] of Objects.properties(kindOf(domain)[2])) {
    found.set(name, value instanceof Objects.Listed ? [...value.values] : value);
  }
  return found;
}

/** The name a stored domain's dialect defines it by, its `Expressions.Framework.Defines` entry's; null where no
 * dialect defines it. */
export function nameOf(domain: Readers.OfObject): string | null {
  const [entry] = Objects.entries(domain, "dialect");
  return entry === undefined ? null : entry.values.get("name") as string;
}

/** A dialect's operations by name, in the order its singleton names them (`Expressions.Framework.Operates`), each
 * its `Schemas.OfExpression`. */
export function operations(dialect: Readers.OfObject): Map<string, Readers.OfObject> {
  return new Map(Objects.entries(dialect, "operations").map(
    (entry) => [entry.values.get("name") as string, entry.targets.get("operation") as Readers.OfObject]));
}

/** An operation's number of arguments: its pattern's variables. */
export function arity(operation: Readers.OfObject): number {
  return (operation.pattern as { readonly variables: ReadonlyMap<string, unknown> }).variables.size;
}

// --- Domains and signatures in code ---
// These are `Dialect.infer`'s, to be replaced with stored domains and operations, as domain inference reads them
// ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).

/** A set of values. */
export interface Domain {
  name(): string;
  /** Whether `value` is in this domain. */
  contains(value: unknown): boolean;
  /** Whether every value of `other` is in this domain. */
  includes(other: Domain): boolean;
}

/** The domains an operator takes and gives. */
export interface Signature {
  /** The number of arguments it takes, or -1 for any number. */
  arity(): number;
  /** The domain of the result for arguments of these domains; `null` if the operator does not apply to them. */
  result(args: readonly Domain[]): Domain | null;
  /** The signature as text, e.g. '(int, int) -> int'. */
  describe(): string;
}

/** Whether a value of `b` may be a value of `a`, as far as inference can tell: one includes the other. */
export function overlaps(a: Domain, b: Domain): boolean {
  return a.includes(b) || b.includes(a);
}

function isOfType(type: unknown, value: unknown): boolean {
  switch (type) {
    case BigInt:
      return typeof value === "bigint";
    case Number:
      return typeof value === "number";
    case String:
      return typeof value === "string";
    case Boolean:
      return typeof value === "boolean";
    default:
      return typeof type === "function" && value instanceof type;
  }
}

/** The values whose type is exactly one of `types`, the framework's native tokens (`BigInt` for int, `Number` for
 * float, ...) or classes: `new OfTypes('int', BigInt)`; a bool is not an int. */
export class OfTypes implements Domain {
  readonly types: ReadonlySet<unknown>;

  constructor(private readonly domainName: string, ...types: unknown[]) {
    this.types = new Set(types);
  }

  name(): string {
    return this.domainName;
  }

  contains(value: unknown): boolean {
    return [...this.types].some((type) => isOfType(type, value));
  }

  includes(other: Domain): boolean {
    if (other instanceof OfUnion) return other.members.every((member) => this.includes(member));
    return other instanceof OfTypes && [...other.types].every((type) => this.types.has(type));
  }

  toString(): string {
    return this.domainName;
  }
}

/** The values that satisfy `test`. It includes only itself, since a test cannot be compared statically. */
export class OfValues implements Domain {
  constructor(private readonly domainName: string, private readonly test: (value: unknown) => boolean) {}

  name(): string {
    return this.domainName;
  }

  contains(value: unknown): boolean {
    return this.test(value);
  }

  includes(other: Domain): boolean {
    if (other instanceof OfUnion) return other.members.every((member) => this.includes(member));
    return other === this;
  }

  toString(): string {
    return this.domainName;
  }
}

/** The values of any of `members`. */
export class OfUnion implements Domain {
  readonly members: readonly Domain[];

  constructor(...members: Domain[]) {
    this.members = members;
  }

  name(): string {
    return this.members.map((member) => member.name()).join(" | ");
  }

  contains(value: unknown): boolean {
    return this.members.some((member) => member.contains(value));
  }

  includes(other: Domain): boolean {
    if (other instanceof OfUnion) return other.members.every((member) => this.includes(member));
    return this.members.some((member) => member.includes(other));
  }

  toString(): string {
    return this.name();
  }
}

class AnythingDomain implements Domain {
  name(): string {
    return "any";
  }

  contains(_value: unknown): boolean {
    return true;
  }

  includes(_other: Domain): boolean {
    return true;
  }

  toString(): string {
    return "any";
  }
}

/** Every value: the domain of a value not known statically. */
export const Anything: Domain = new AnythingDomain();

/** One domain for several: the first when all are the same, otherwise their union. */
export function join(domains: readonly Domain[]): Domain {
  const distinct: Domain[] = [];
  for (const domain of domains) if (!distinct.includes(domain)) distinct.push(domain);
  return distinct.length === 1 ? distinct[0] as Domain : new OfUnion(...distinct);
}

/** Takes arguments of the `parameters` domains and gives a `result`, e.g. `new Function([Bool, Bool], Bool)`. */
export class Function implements Signature {
  constructor(readonly parameters: readonly Domain[], private readonly resultDomain: Domain) {}

  arity(): number {
    return this.parameters.length;
  }

  result(args: readonly Domain[]): Domain | null {
    if (args.length !== this.parameters.length) return null;
    return this.parameters.every((p, i) => overlaps(p, args[i] as Domain)) ? this.resultDomain : null;
  }

  /** Whether every argument's domain is included in its parameter's, so this is the only candidate. */
  exact(args: readonly Domain[]): boolean {
    return args.length === this.parameters.length && this.parameters.every((p, i) => p.includes(args[i] as Domain));
  }

  describe(): string {
    return `(${this.parameters.map((p) => p.name()).join(", ")}) -> ${this.resultDomain.name()}`;
  }
}

/** Takes `arity` arguments of one of the `candidates` domains, all of the same one, and gives `result`, or that
 * domain when `result` is null: `new Same(2, [Int, Float])` is add, `new Same(2, [Int, Float, Str], Bool)` is lt. With
 * a `family`, a domain that includes whole domains (every integer domain, say), each argument's domain in the family
 * is a candidate too. */
export class Same implements Signature {
  constructor(private readonly count: number, readonly candidates: readonly Domain[],
    private readonly resultDomain: Domain | null = null, readonly family: Domain | null = null) {}

  arity(): number {
    return this.count;
  }

  private candidatesFor(args: readonly Domain[]): Domain[] {
    const found = [...this.candidates];
    for (const argument of args) {
      if (this.family !== null && !(argument instanceof OfUnion) && this.family.includes(argument)
        && !found.some((c) => c.includes(argument) && argument.includes(c))) found.push(argument);
    }
    return found;
  }

  result(args: readonly Domain[]): Domain | null {
    if (args.length !== this.count) return null;
    const matches = this.candidatesFor(args).filter((c) => args.every((argument) => overlaps(c, argument)));
    if (matches.length === 0) return null;
    return join(matches.map((match) => this.resultDomain ?? match));
  }

  exact(args: readonly Domain[]): boolean {
    return args.length === this.count && this.candidatesFor(args).some((c) => args.every((argument) => c.includes(argument)));
  }

  describe(): string {
    let names = this.candidates.map((c) => c.name()).join(" | ");
    if (this.family !== null) names += ` or any ${this.family.name()}`;
    const parameters = Array(this.count).fill("T").join(", ");
    return `(${parameters}) -> ${this.resultDomain ? this.resultDomain.name() : "T"} for T in ${names}`;
  }
}

/** One of `signatures`, all of one arity: the first whose parameters include the arguments' domains, or else any
 * that applies to them, when the result is the union of theirs. */
export class Overloaded implements Signature {
  readonly signatures: readonly (Function | Same)[];

  constructor(...signatures: (Function | Same)[]) {
    this.signatures = signatures;
  }

  arity(): number {
    return (this.signatures[0] as Signature).arity();
  }

  result(args: readonly Domain[]): Domain | null {
    for (const signature of this.signatures) if (signature.exact(args)) return signature.result(args);
    const results = this.signatures.map((s) => s.result(args)).filter((r): r is Domain => r !== null);
    return results.length > 0 ? join(results) : null;
  }

  describe(): string {
    return this.signatures.map((s) => s.describe()).join(" | ");
  }
}

/** Takes any arguments and gives `result`: the signature of what cannot be known statically, such as a call to a
 * function the scope provides. */
export class Opaque implements Signature {
  constructor(private readonly resultDomain: Domain = Anything) {}

  arity(): number {
    return -1; // any number
  }

  result(_args: readonly Domain[]): Domain | null {
    return this.resultDomain;
  }

  describe(): string {
    return `(...) -> ${this.resultDomain.name()}`;
  }
}

/** Takes `arity` arguments of any domains, or any number of them (`arity` -1), and gives one of them, as Python's `and`
 * and `or` do. */
export class Either implements Signature {
  constructor(private readonly count: number) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly Domain[]): Domain | null {
    return (this.count === -1 || args.length === this.count) && args.length > 0 ? join(args) : null;
  }

  describe(): string {
    return this.count < 0 ? "(T, ...) -> T" : `(${Array(this.count).fill("T").join(", ")}) -> T`;
  }
}
