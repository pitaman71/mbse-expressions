/**
 * How the TypeScript family reads a node, shared by its three dialects, `TypeScript5`, `TypeScript Types` and
 * `TypeScript Patterns` (mbse-basis [CAP-277: TypeScript's types and destructuring patterns as data](mbse:mbse-basis/docs/capabilities/CAP-277.md)): a node's own checks, as mbse-programs has them, and
 * its helpers' in turn; the names a pattern binds; and the names each of a kind's arguments has bound. It imports only
 * the framework, so that the family's dialects, which read each other's terms, each import it without a cycle.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";

const { repr } = Repr;

const IDENTIFIER = "identifier";
const PRIVATEIDENTIFIER = "privateidentifier";
const LITERAL = "literal";
const PROPERTY = "property";
const MEMBEREXPRESSION = "memberexpression";
const TEMPLATELITERAL = "templateliteral";
const SEQUENCEEXPRESSION = "sequenceexpression";

/** `TypeScript5`'s functions, which bind their parameters within them. */
const FUNCTIONS: readonly string[] = ["arrowfunctionexpression", "functionexpression", "tsemptybodyfunctionexpression"];

/** `TypeScript Types`' function types, which bind their type parameters and parameters within them. */
const FUNCTION_TYPES: readonly string[] = ["tsfunctiontype", "tsconstructortype"];

/** An object type's signatures, helpers that bind their parameters within them, through the kind that holds them. */
export const SIGNATURES: readonly string[] = ["tsmethodsignature", "tscallsignaturedeclaration",
  "tsconstructsignaturedeclaration", "tsindexsignature"];

/** A string's quotes, as TypeScript writes them. */
export const QUOTES: readonly string[] = ["'", '"'];

/** A term or a helper, its helpers nested (`Terms.Node`). */
export const Node = F.Node;
export type Node = F.Node;

/** A helper property's nodes, or a container's: none where it is absent, one, or each of many. */
export function nodes(value: Node | readonly Node[] | undefined): readonly Node[] {
  if (value === undefined) return [];
  return value instanceof Node ? [value] : value;
}

/** A term's `Node` (`Terms.node`), or a `Node` as it is. */
export function nodeOf(value: any): Node {
  return value instanceof Node ? value : F.node(...F.kindOf(value));
}

// --- What a pattern binds ---

/** The names a pattern binds, a term's or a `Node`'s: an identifier's, and those within an array, an object, a default,
 * a rest or a parameter property; a member, or any other target, binds none. */
export function boundNames(node: any): ReadonlySet<string> {
  if (node === null || node === undefined) return new Set();
  node = nodeOf(node);
  if (node.kind === IDENTIFIER) return new Set(node.attributes.has("name") ? [node.attributes.get("name")] : []);
  if (node.kind === PROPERTY) return boundNames(node.subterms.get("value"));
  const found = new Set<string>();
  for (const inner of [...node.lists.get("elements") ?? [], ...node.lists.get("properties") ?? [],
    ...["left", "argument", "parameter"].map((name) => node.subterms.get(name))]) {
    for (const bound of boundNames(inner)) found.add(bound);
  }
  return found;
}

/** The names a function's, a function type's or a signature's parameters bind. */
function parameters(node: Node): Set<string> {
  const found = new Set<string>();
  for (const parameter of [...node.lists.get("params") ?? [], ...node.lists.get("parameters") ?? []]) {
    for (const name of boundNames(parameter)) found.add(name);
  }
  return found;
}

/** The names a node's type parameters declare (each a `TSTypeParameter`'s `name`). */
function typeParameters(node: Node): Set<string> {
  const declaration = node.helpers.get("typeParameters") as Node | undefined;
  const found = new Set<string>();
  if (declaration === undefined) return found;
  for (const parameter of nodes(declaration.helpers.get("params"))) {
    const name = parameter.helpers.get("name") as Node | undefined;
    if (name !== undefined && name.attributes.has("name")) found.add(name.attributes.get("name"));
  }
  return found;
}

/** The names the `infer` types within a conditional type's `extendsType` declare, but those of a conditional type
 * within it, which binds its own. */
function infers(value: any): Set<string> {
  if (value === null || value === undefined) return new Set();
  const node = nodeOf(value);
  if (node.kind === "tsconditionaltype") return new Set();
  if (node.kind === "tsinfertype") {
    const parameter = node.helpers.get("typeParameter") as Node | undefined;
    const name = parameter?.helpers.get("name") as Node | undefined;
    return new Set(name !== undefined && name.attributes.has("name") ? [name.attributes.get("name")] : []);
  }
  const found = new Set<string>();
  for (const inner of [...node.subterms.values(), ...node.many]) for (const name of infers(inner)) found.add(name);
  return found;
}

// --- Checks ---

/** Python's `str.isidentifier()`, as mbse-programs checks a name, `$` among its letters. */
function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text.replaceAll("$", "_"));
}

function identifierProblems(what: string, value: unknown): string[] {
  if (typeof value === "string" && value !== "" && !isIdentifier(value)) {
    return [`${F.article(what)}'s name cannot be ${repr(value)}`];
  }
  return [];
}

/** A literal's spelling: a string's quote, a number's base. */
function literalProblems(attributes: ReadonlyMap<string, any>): string[] {
  const quote = attributes.get("quote");
  const base = attributes.get("base");
  const problems = quote === undefined || QUOTES.includes(quote) ? [] : [`a literal's quote cannot be ${repr(quote)}`];
  if (base !== undefined && ![2n, 8n, 10n, 16n].includes(base)) problems.push(`a literal's base cannot be ${repr(base)}`);
  return problems;
}

function needs(node: Node, count: number, least: number, what: string): string[] {
  return count >= least ? [] : [`${F.article(node.kind)} needs ${what}`];
}

/** A node's own checks, as mbse-programs has them: names, quasis, unions and lists that need members. */
function nodeProblems(node: Node): string[] {
  const { kind, attributes } = node;
  if (F.INVALID_KINDS.has(kind)) return F.invalidProblems(kind, attributes); // invalid syntax where a helper holds it
  if (kind === IDENTIFIER || kind === PRIVATEIDENTIFIER) return identifierProblems(kind, attributes.get("name"));
  if (kind === LITERAL) return literalProblems(attributes);
  if (kind === TEMPLATELITERAL || kind === "tstemplateliteraltype") {
    const quasis = nodes(node.helpers.get("quasis")).length;
    const what = kind === TEMPLATELITERAL ? "expressions" : "types";
    return quasis === node.many.length + 1 ? [] : [`${F.article(kind)} needs one more quasi than ${what}`];
  }
  if (kind === SEQUENCEEXPRESSION) return needs(node, node.many.length, 2, "two expressions");
  if (kind === "tsuniontype" || kind === "tsintersectiontype") return needs(node, node.many.length, 2, "two types");
  if (kind === "tstypeparameterdeclaration") return needs(node, nodes(node.helpers.get("params")).length, 1, "a type parameter");
  return [];
}

/** A node's checks, and its helpers' in turn: what the framework's validation does not read within a helper; with
 * `deep`, the terms its helpers hold too, which validation does not reach within a reference (an identifier's type
 * annotation). */
function problemsOf(node: Node, deep: boolean): string[] {
  const problems = nodeProblems(node);
  for (const value of node.helpers.values()) {
    for (const inner of nodes(value)) {
      problems.push(...problemsOf(inner, deep));
      if (deep) {
        for (const held of [...inner.subterms.values(), ...inner.many]) {
          if (held !== null) problems.push(...problemsOf(nodeOf(held), deep));
        }
      }
    }
  }
  return problems;
}

/** A kind's check: its node's and its helpers' (`problemsOf`), and `more`, of its attributes, where given; an
 * identifier's reaches the terms its helpers hold, a reference's arguments, which validation does not read. */
export function check(tag: string, more?: (attributes: ReadonlyMap<string, any>) => string[]): (record: any) => string[] {
  return (record: any) => {
    const node = F.node(tag, record);
    return [...problemsOf(node, tag === IDENTIFIER), ...(more !== undefined ? more(node.attributes) : [])];
  };
}

// --- What each kind binds ---

function union(a: ReadonlySet<string>, b: Iterable<string>): ReadonlySet<string> {
  return new Set([...a, ...b]);
}

/** The names each of a node's arguments has bound, in order: a member's property and a key, where not computed, its
 * own name, since it names what it reads rather than refers to a binding; then its helpers' arguments in turn, a
 * signature's parameters bound within it. */
export function bound(node: Node, inner: ReadonlySet<string>): ReadonlySet<string>[] {
  const found: ReadonlySet<string>[] = [];
  for (const [name, argument] of node.subterms) {
    const named = (name === "property" && node.kind === MEMBEREXPRESSION)
      || (name === "key" && [PROPERTY, "tspropertysignature", "tsmethodsignature"].includes(node.kind));
    if (named && !node.attributes.get("computed") && argument !== null && F.kindOf(argument)[0] === IDENTIFIER) {
      found.push(union(inner, [F.nameOf(argument)]));
    } else {
      found.push(inner);
    }
  }
  for (let i = 0; i < node.many.length; i++) found.push(inner);
  for (const value of node.helpers.values()) {
    for (const helper of nodes(value)) {
      found.push(...bound(helper, SIGNATURES.includes(helper.kind) ? union(inner, parameters(helper)) : inner));
    }
  }
  return found;
}

/** What each argument of a kind has bound (`Kind.scopes`): a function's or an arrow's parameters within it (its
 * parameters' defaults among it); a function type's type parameters and parameters within it; a mapped type's `key` in
 * its `nameType` and its `body`; a conditional type's `infer` declarations in its `trueType`; and names that are not
 * references (`bound`). */
export function scopes(tag: string): (record: any) => ReadonlySet<string>[] {
  return (record: any) => {
    const node = F.node(tag, record);
    let inner: ReadonlySet<string> = new Set();
    if (FUNCTIONS.includes(tag)) inner = parameters(node);
    else if (FUNCTION_TYPES.includes(tag)) inner = union(parameters(node), typeParameters(node));
    const found = bound(node, inner);
    let names = new Map<string, ReadonlySet<string>>();
    const key = node.helpers.get("key") as Node | undefined;
    if (tag === "tsmappedtype" && key !== undefined && key.attributes.has("name")) {
      const bound = new Set([key.attributes.get("name") as string]);
      names = new Map([["body", bound], ["nameType", bound]]);
    } else if (tag === "tsconditionaltype") {
      names = new Map([["trueType", infers(node.subterms.get("extendsType"))]]);
    }
    [...node.subterms.keys()].forEach((subterm, i) => {
      found[i] = union(found[i] as ReadonlySet<string>, names.get(subterm) ?? []);
    });
    return found;
  };
}
