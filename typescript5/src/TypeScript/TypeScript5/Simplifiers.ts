/**
 * Simplifiers of the TypeScript5 dialect: simplify an expression by ECMAScript's semantics, in a scope that decides what
 * it may reach.
 *
 * `Simplifiers.OfAny(expression, scope)` simplifies in a `Scope`, or in one made from an object of variables (see
 * `Framework/Simplifiers`). ECMAScript's values and abstract operations are `Abstract`'s, modeled alike in both
 * implementations (ECMA-262, 7): `+` concatenating or adding by ToPrimitive, `==` loosely and `===` strictly, `<` by
 * IsLessThan, a string's code units, bigints and their errors, `typeof`, objects by identity. What the scope determines
 * is folded into the literal of its value: a boolean's, a number's, a bigint's or a string's, a negative number as the
 * negation of its magnitude and NaN, Infinity and -0 by their names (`NaN`, `Infinity`, `-0`, as ECMAScript spells
 * them), `undefined` by its name, `null` and a regular expression as TypeScript5's `constant`; an array or an object of
 * such values into its display (`[1, , "a"]`, `{ a: 1 }`). A function (a closure an arrow makes, or one the scope
 * provides), a data object and a host value have no literal: such a subterm stays, its own subterms simplified, as does
 * a name the scope does not bind. The rest stays a TypeScript5 expression. A short circuit decides what does not depend
 * on what stays: `true && x` is `x`, `c ? a : b` its chosen branch when `c` is known, and `(1, x)` is `x`.
 *
 * A `Scope(variables)` resolves names innermost first: names bound by an arrow's parameters, then `variables` (`this`
 * among them, by that name), then the global object's values, `undefined`, `NaN` and `Infinity` (ECMA-262, 19.1). A
 * name it does not bind stays in the residual. Nothing else is reachable from an expression, since expressions may come
 * from data: a call calls only a function the scope provides or an arrow the expression makes, and `new` only a class
 * the scope provides; a built-in method is read but not modeled (`"a".toUpperCase` stays, "TypeScript5
 * String.prototype.toUpperCase is not simplified"), nor is a host value's property.
 *
 * Its rules fold every kind the evaluation inventory gives class (a) (mbse-expressions'
 * [the evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#typescript), TypeScript), `FOLDED`:
 * names and `this`, `null` and a regular expression, templates (a tagged one's tag called with its strings and their
 * `raw`), arrays (holes and spreads), objects (computed keys, shorthands, spreads), member access (`?.` short-circuiting
 * its chain), calls and `new`, arrows with an expression body (closures binding their parameters by TypeScript
 * Patterns' destructuring, with defaults and rests), the unary, binary, logical, conditional and sequence operators, and
 * TypeScript's own assertions, erased to their operand. What stays, named: `delete`, writes, `await`, `yield`,
 * `import()`, `super`, `#x`, `new.target`, and an arrow's block or an async arrow's call (class `d`: statements, a
 * coroutine, a class, a write, mbse-programs'); a function's or a class's expression (`d`); a signature without a body
 * and JSX (`b`); a built-in method and a host value (`c`: the language's own runtime, mbse-basis
 * [CAP-301: simplification delegated to a surrogate dialect](mbse:mbse-basis/docs/capabilities/README.md#CAP-301)); a
 * term of `TypeScript Types`, `TypeScript Patterns` or `TypeScript RegExp`, by the dialect that owns it (`b`); and
 * invalid syntax. `CATEGORIES` gives each the evaluation inventory's class.
 */

import { Errors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Simplifiers.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as A from "./Abstract.js";
import * as T from "./Expressions.js";
import * as Text from "./Text.js";

const { ValueError } = Errors;

/** The global object's values a scope provides (ECMA-262, 19.1): `undefined`, `NaN` and `Infinity`. */
export const GLOBALS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["undefined", undefined], ["NaN", NaN], ["Infinity", Infinity]]);

/** ECMAScript's scope for an expression: `variables` (`this` among them), then `GLOBALS`. */
export class Scope extends S.Variables {
  override lookup(reference: any): unknown {
    const name = Terms.nameOf(reference) as string;
    if (this.find(name)[0] || !GLOBALS.has(name)) return this.value(name);
    return GLOBALS.get(name);
  }
}

/** An optional chain's `?.` met `null` or `undefined`: its chain is undefined. */
class ShortCircuit extends Error {}

function nodeOf(term: any): Terms.Node {
  return Terms.node(...Terms.kindOf(term));
}

function tagOf(term: any): string {
  return Terms.kindOf(term)[0];
}

function evaluate(term: any, scope: any): any {
  return RULES.evaluate(term, scope);
}

function nullish(value: unknown): boolean {
  return value === null || value === undefined;
}

/** The values of a list of terms, each spread element's iterated in place. */
function spread(terms: readonly any[], scope: any): unknown[] {
  const values: unknown[] = [];
  for (const term of terms) {
    if (tagOf(term) === T.SPREADELEMENT) values.push(...A.iterate(evaluate(nodeOf(term).subterms.get("argument"), scope)));
    else values.push(evaluate(term, scope));
  }
  return values;
}

/** A property's key: computed, its expression's property key; else its identifier's name, or its literal's property
 * key. */
function keyOf(node: Terms.Node, scope: any): string {
  const key = node.subterms.get("key");
  if (!node.attributes.get("computed") && tagOf(key) === T.IDENTIFIER) return Terms.nameOf(key) as string;
  return A.toPropertyKey(evaluate(key, scope));
}

function define(object: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(object, key, { value, writable: true, enumerable: true, configurable: true });
}

// --- Closures and their parameters ---

/** The scope with a pattern bound to a value, as ECMAScript destructures (14.3.3): a name, a default where the value is
 * undefined, an array's items by iteration, an object's properties, a rest the items or properties left. */
function bind(pattern: any, value: unknown, scope: any): any {
  const tag = tagOf(pattern);
  const node = nodeOf(pattern);
  if (tag === T.IDENTIFIER) return scope.bind(Terms.nameOf(pattern) as string, value);
  if (tag === T.ASSIGNMENTPATTERN) {
    return bind(node.subterms.get("left"), value === undefined ? evaluate(node.subterms.get("right"), scope) : value, scope);
  }
  if (tag === T.ARRAYPATTERN) {
    const items = A.iterate(value);
    (node.lists.get("elements") as readonly any[]).forEach((element, i) => {
      if (tagOf(element) === T.RESTELEMENT) scope = bind(nodeOf(element).subterms.get("argument"), items.slice(i), scope);
      else if (tagOf(element) !== T.ELISION) scope = bind(element, items[i], scope);
    });
    return scope;
  }
  if (tag === T.OBJECTPATTERN) {
    if (nullish(value)) throw new TypeError(`Cannot destructure '${A.toString(value)}' as it is ${A.toString(value)}.`);
    const taken: string[] = [];
    for (const member of node.lists.get("properties") as readonly any[]) {
      if (tagOf(member) === T.RESTELEMENT) {
        const rest: Record<string, unknown> = {};
        for (const [key, item] of A.ownEntries(value)) if (!taken.includes(key)) define(rest, key, item);
        scope = bind(nodeOf(member).subterms.get("argument"), rest, scope);
      } else {
        const inner = nodeOf(member);
        const key = keyOf(inner, scope);
        taken.push(key);
        scope = bind(inner.subterms.get("value"), A.get(value, key), scope);
      }
    }
    return scope;
  }
  throw new ValueError(`${Terms.article(tag)} is not a parameter`);
}

/** An arrow's closure: called, its parameters bound to the arguments in the scope it was made in, its body's value. An
 * async arrow's call, and a block body's, stay: a promise and statements are mbse-programs'. */
function arrow(_args: F.Thunk[], node: any, scope: any): A.Closure {
  const made = nodeOf(node);
  const body = made.subterms.get("body") ?? null;
  const parameters = made.lists.get("params") as readonly any[];
  const asynchronous = Boolean(made.attributes.get("isAsync"));
  return new A.Closure((values) => {
    if (asynchronous) throw new F.NoRule(A.DIALECT, "async arrowfunctionexpression");
    if (body === null) throw new F.NoRule(A.DIALECT, "arrowfunctionexpression block");
    let inner = scope;
    parameters.forEach((parameter, i) => {
      if (tagOf(parameter) === T.RESTELEMENT) inner = bind(nodeOf(parameter).subterms.get("argument"), values.slice(i), inner);
      else inner = bind(parameter, values[i], inner);
    });
    return evaluate(body, inner);
  });
}

// --- Kinds ---

/** A constant's value: `null`, or a new regular expression of its source and flags, as written. */
function constant(node: any): unknown {
  if (Terms.attributesOf(Terms.kindOf(node)[1]).get("singleton") === "null") return null;
  const text = Text.ToText(node);
  const end = text.lastIndexOf("/");
  return new A.RegExp(text.slice(1, end), text.slice(end + 1));
}

/** A template's strings, cooked (TV) or raw (TRV), its line terminators LF. */
function template(node: Terms.Node, cooked = true): unknown[] {
  const raws = (node.helpers.get("quasis") as readonly Terms.Node[])
    .map((quasi) => ((quasi.attributes.get("raw") ?? "") as string).replace(/\r\n?/g, "\n"));
  return cooked ? raws.map((raw) => A.cook(raw) ?? undefined) : raws;
}

function templateliteral(args: F.Thunk[], node: any): string {
  const strings = template(nodeOf(node));
  if (strings.includes(undefined)) throw new ValueError("a templateliteral's quasi has an invalid escape");
  let written = strings[0] as string;
  args.forEach((argument, i) => {
    written = A.binary("+", A.binary("+", written, A.toString(argument())), strings[i + 1]) as string;
  });
  return written;
}

function called(fn: unknown, values: unknown[], callee: any): unknown {
  if (A.kind(fn) !== "function") throw new TypeError(`${Text.ToText(callee)} is not a function`);
  return A.call(fn, values);
}

function taggedtemplate(args: F.Thunk[], node: any, scope: any): unknown {
  const tagged = nodeOf(node);
  const fn = (args[0] as F.Thunk)();
  const quasi = tagged.helpers.get("quasi") as Terms.Node;
  const strings = A.templateStrings(template(quasi), template(quasi, false) as string[]);
  const values = quasi.many.map((term) => evaluate(term, scope));
  return called(fn, [strings, ...values], tagged.subterms.get("tag"));
}

function callexpression(args: F.Thunk[], node: any, scope: any): unknown {
  const made = nodeOf(node);
  const fn = (args[0] as F.Thunk)();
  if (made.attributes.get("optional") && nullish(fn)) throw new ShortCircuit();
  return called(fn, spread(made.lists.get("arguments") as readonly any[], scope), made.subterms.get("callee"));
}

function newexpression(args: F.Thunk[], node: any, scope: any): unknown {
  const made = nodeOf(node);
  const constructor = (args[0] as F.Thunk)();
  const values = spread(made.lists.get("arguments") as readonly any[], scope);
  const value = A.kind(constructor) === "function" ? A.construct(constructor, values) : null;
  if (value === null) throw new TypeError(`${Text.ToText(made.subterms.get("callee"))} is not a constructor`);
  return value;
}

function memberexpression(args: F.Thunk[], node: any): unknown {
  const member = nodeOf(node);
  const value = (args[0] as F.Thunk)();
  if (member.attributes.get("optional") && nullish(value)) throw new ShortCircuit();
  const property = member.subterms.get("property");
  let key: string;
  if (member.attributes.get("computed")) key = A.toPropertyKey((args[1] as F.Thunk)());
  else if (tagOf(property) === T.IDENTIFIER) key = Terms.nameOf(property) as string;
  else throw new F.NoRule(A.DIALECT, tagOf(property)); // `#x`, a class's
  return A.get(value, key);
}

function chainexpression(args: F.Thunk[]): unknown {
  try {
    return (args[0] as F.Thunk)();
  } catch (error) {
    if (error instanceof ShortCircuit) return undefined;
    throw error;
  }
}

function arrayexpression(_args: F.Thunk[], node: any, scope: any): unknown[] {
  const values: unknown[] = [];
  for (const element of Terms.argumentsOf(Terms.kindOf(node)[1])) {
    if (tagOf(element) === T.ELISION) values.length += 1;
    else values.push(...spread([element], scope));
  }
  return values;
}

function objectexpression(_args: F.Thunk[], node: any, scope: any): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const member of nodeOf(node).lists.get("properties") as readonly any[]) {
    const inner = nodeOf(member);
    if (tagOf(member) === T.SPREADELEMENT) {
      for (const [key, item] of A.ownEntries(evaluate(inner.subterms.get("argument"), scope))) define(properties, key, item);
      continue;
    }
    const key = keyOf(inner, scope);
    if (key === "__proto__" && !inner.attributes.get("computed") && !inner.attributes.get("shorthand")) {
      throw new F.NoRule(A.DIALECT, "objectexpression __proto__"); // an object's prototype, which no value models
    }
    define(properties, key, evaluate(inner.subterms.get("value"), scope));
  }
  return A.ordered(properties);
}

/** A property alone, as an object's simplification meets it: its key and its value, no object of its own. */
class Property {
  constructor(readonly key: string, readonly value: unknown) {}
}

function property(_args: F.Thunk[], node: any, scope: any): Property {
  const inner = nodeOf(node);
  return new Property(keyOf(inner, scope), evaluate(inner.subterms.get("value"), scope));
}

/** A TypeScript assertion's value, its operand's: the type is erased. */
function operand(_args: F.Thunk[], node: any, scope: any): unknown {
  return evaluate(nodeOf(node).subterms.get("expression"), scope);
}

function logical(operator: string): F.Implementation {
  return (args) => {
    const left = (args[0] as F.Thunk)();
    const right = args[1] as F.Thunk;
    if (operator === "&&") return A.toBoolean(left) ? right() : left;
    if (operator === "||") return A.toBoolean(left) ? left : right();
    return nullish(left) ? right() : left;
  };
}

function strict(fn: (...values: any[]) => unknown): F.Implementation {
  return (args) => fn(...args.map((argument) => argument()));
}

function relation(operator: string): (x: unknown, y: unknown) => boolean {
  if (operator === "<") return (x, y) => A.isLessThan(x, y) === true;
  if (operator === ">") return (x, y) => A.isLessThan(y, x, false) === true;
  if (operator === "<=") return (x, y) => A.isLessThan(y, x, false) === false;
  return (x, y) => A.isLessThan(x, y) === false;
}

const BINARY: [string, (x: any, y: any) => unknown][] = [
  ...["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "&", "|", "^"]
    .map((operator): [string, (x: any, y: any) => unknown] => [operator, (x, y) => A.binary(operator, x, y)]),
  ...["<", ">", "<=", ">="].map((operator): [string, (x: any, y: any) => unknown] => [operator, relation(operator)]),
  ["==", A.isLooselyEqual], ["!=", (x, y) => !A.isLooselyEqual(x, y)],
  ["===", A.isStrictlyEqual], ["!==", (x, y) => !A.isStrictlyEqual(x, y)],
  ["in", (x, y) => A.hasProperty(y, x)], ["instanceof", A.instanceOf],
];

const UNARY: [string, (x: any) => unknown][] = [
  ...["-", "+", "~", "!"].map((operator): [string, (x: any) => unknown] => [operator, (x) => A.unary(operator, x)]),
  ["typeof", A.typeOf], ["void", () => undefined],
];

/** The kinds its rules fold: a literal, and every kind of class (a); any other stays in the residual, named. */
export const FOLDED: ReadonlySet<string> = new Set([
  T.LITERAL, T.CONSTANT, T.IDENTIFIER, T.THISEXPRESSION, T.TEMPLATELITERAL, T.TAGGEDTEMPLATEEXPRESSION,
  T.PARENTHESIZEDEXPRESSION, T.SEQUENCEEXPRESSION, T.ELISION, T.SPREADELEMENT, T.ARRAYEXPRESSION, T.PROPERTY,
  T.OBJECTEXPRESSION, T.MEMBEREXPRESSION, T.CHAINEXPRESSION, T.CALLEXPRESSION, T.NEWEXPRESSION,
  T.ARROWFUNCTIONEXPRESSION, T.UNARYEXPRESSION, T.BINARYEXPRESSION, T.LOGICALEXPRESSION, T.CONDITIONALEXPRESSION,
  T.TSASEXPRESSION, T.TSSATISFIESEXPRESSION, T.TSTYPEASSERTION, T.TSNONNULLEXPRESSION, T.TSINSTANTIATIONEXPRESSION]);

/** The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given): a
 * built-in method and a host value `c`, the language's runtime being a surrogate dialect's (mbse-basis
 * [CAP-301: simplification delegated to a surrogate dialect](mbse:mbse-basis/docs/capabilities/README.md#CAP-301)). */
export const CATEGORIES: Record<string, Record<string, string>> = {
  TypeScript5: {
    tsemptybodyfunctionexpression: "b", jsxelement: "b", jsxfragment: "b", jsxemptyexpression: "b",
    ...Object.fromEntries(["functionexpression", "classexpression", "super", "privateidentifier", "metaproperty",
      "awaitexpression", "yieldexpression", "importexpression", "assignmentexpression", "updateexpression",
      "unaryexpression 'delete'", "async arrowfunctionexpression", "arrowfunctionexpression block"]
      .map((kind) => [kind, "d"])),
    ...Object.fromEntries([...A.BUILTINS, "host value"].map((what) => [what, "c"])),
  },
  "TypeScript Types": { "*": "b" }, "TypeScript Patterns": { "*": "b" }, "TypeScript RegExp": { "*": "b" },
};

/** The framework's interpreter, with what it does not fold by a kind's role: a constant's value, which its spelling
 * gives, and `this`, which the scope binds by that name. */
class Rules extends F.Interpreter {
  override evaluate(node: any, scope: any): any {
    const tag = Terms.kindOf(node)[0];
    if ((tag === T.CONSTANT || tag === T.THISEXPRESSION) && this.dialect.owner(node) === this.dialect) {
      return tag === T.CONSTANT ? constant(node) : (scope as S.Variables).value("this");
    }
    return super.evaluate(node, scope);
  }
}

/** A spread element's values alone, as an array's or a call's simplification meets it: no array of its own. */
class Spread {
  constructor(readonly values: unknown[]) {}
}

/** The folding rules of the TypeScript5 dialect. */
export const RULES: F.Interpreter = new Rules(T.DIALECT, new Map<string, any>([
  [T.TEMPLATELITERAL, templateliteral], [T.TAGGEDTEMPLATEEXPRESSION, taggedtemplate],
  [T.PARENTHESIZEDEXPRESSION, (args: F.Thunk[]) => (args[0] as F.Thunk)()],
  [T.SEQUENCEEXPRESSION, (args: F.Thunk[]) => args.map((argument) => argument()).at(-1)],
  [T.ELISION, () => A.HOLE],
  [T.SPREADELEMENT, (args: F.Thunk[]) => new Spread(A.iterate((args[0] as F.Thunk)()))], // spread where it stands
  [T.ARRAYEXPRESSION, arrayexpression], [T.PROPERTY, property], [T.OBJECTEXPRESSION, objectexpression],
  [T.MEMBEREXPRESSION, memberexpression], [T.CHAINEXPRESSION, chainexpression], [T.CALLEXPRESSION, callexpression],
  [T.NEWEXPRESSION, newexpression], [T.ARROWFUNCTIONEXPRESSION, arrow],
  [T.UNARYEXPRESSION, new Map(UNARY.map(([operator, fn]) => [operator, strict(fn)]))],
  [T.BINARYEXPRESSION, new Map(BINARY.map(([operator, fn]) => [operator, strict(fn)]))],
  [T.LOGICALEXPRESSION, new Map(["&&", "||", "??"].map((operator) => [operator, logical(operator)]))],
  [T.CONDITIONALEXPRESSION, (args: F.Thunk[]) => (A.toBoolean((args[0] as F.Thunk)()) ? (args[1] as F.Thunk)() : (args[2] as F.Thunk)())],
  [T.TSASEXPRESSION, operand], [T.TSSATISFIESEXPRESSION, operand], [T.TSTYPEASSERTION, operand],
  [T.TSNONNULLEXPRESSION, operand], [T.TSINSTANTIATIONEXPRESSION, operand],
]), { scope: (variables) => new Scope(variables), folded: FOLDED });

// --- Literals and displays ---

function make(kind: string, attributes: Record<string, unknown>, ...args: unknown[]): Terms.Writer {
  return T.DIALECT.make(new Terms.Form(kind, attributes, args));
}

function named(name: string): Terms.Writer {
  return make(T.IDENTIFIER, { name });
}

function negated(written: unknown): Terms.Writer {
  return make(T.UNARYEXPRESSION, { operator: "-" }, written);
}

/** The literal of a value: a boolean's, a string's, a non-negative number's or bigint's, a negative one's negated; NaN,
 * Infinity and `undefined` by name; `null` and a regular expression a constant. Null for any other value. */
function literal(value: any): unknown {
  const found = A.kind(value);
  if (found === "boolean" || found === "string") return T.DIALECT.spec(value);
  if (found === "bigint") return value >= 0n ? T.DIALECT.spec(value) : negated(T.DIALECT.spec(-value));
  if (found === "number") {
    if (Number.isNaN(value)) return named("NaN");
    const magnitude = Number.isFinite(value) ? T.DIALECT.spec(Math.abs(value)) : named("Infinity");
    return value < 0 || Object.is(value, -0) ? negated(magnitude) : magnitude;
  }
  if (found === "undefined") return named("undefined");
  if (found === "null") return make(T.CONSTANT, { singleton: "null" }, null);
  if (found === "regexp") return make(T.CONSTANT, { pattern: value.source, ...(value.flags ? { flags: value.flags } : {}) }, null);
  return null;
}

const NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A property's key as written: an identifier where it is one, an array index a number, else a string. */
function writtenKey(key: string): Terms.Writer {
  if (NAME.test(key) && key !== "__proto__") return named(key);
  return T.DIALECT.spec(A.isArrayIndex(key) ? Number(key) : key);
}

/** An array's or an object's display, of its items' literals and displays, a hole an elision; null where an item has
 * neither, or for any other value (a tagged template's strings among them). */
function display(value: any): unknown {
  const found = A.kind(value);
  if (found === "array" && !A.isTemplateStrings(value)) {
    const items: unknown[] = [];
    for (let i = 0; i < value.length; i++) items.push(i in value ? literal(value[i]) ?? display(value[i]) : make(T.ELISION, {}));
    return items.includes(null) ? null : make(T.ARRAYEXPRESSION, {}, ...items);
  }
  if (found === "object") {
    const written = Object.entries(A.ordered(value)).map(([key, item]) => [key, literal(item) ?? display(item)] as const);
    if (written.some(([, item]) => item === null)) return null;
    return make(T.OBJECTEXPRESSION, {}, ...written.map(([key, item]) => make(T.PROPERTY, { // `__proto__` computed, a
      propertyKind: "init", computed: key === "__proto__", method: false, shorthand: false }, writtenKey(key), item))); // property, no prototype
  }
  return null;
}

/** What does not depend on a subterm that stays: `&&`, `||` and `??` by a known left operand, the conditional by a known
 * test, and a sequence whose leading terms are known, by its last. */
function simplify(node: any, results: F.Result[]): F.Result | null {
  const [tag, record] = Terms.kindOf(node);
  const first = results[0] as F.Result;
  if (tag === T.LOGICALEXPRESSION && first.known) {
    const operator = Terms.attributesOf(record).get("operator");
    const left = first.value;
    if ((operator === "&&" && A.toBoolean(left)) || (operator === "||" && !A.toBoolean(left))
      || (operator === "??" && nullish(left))) return results[1] as F.Result;
  }
  if (tag === T.CONDITIONALEXPRESSION && first.known) return (A.toBoolean(first.value) ? results[1] : results[2]) as F.Result;
  if (tag === T.SEQUENCEEXPRESSION && results.slice(0, -1).every((result) => result.known)) return results.at(-1) as F.Result;
  return null;
}

/** The simplifier of the TypeScript5 dialect. */
export const SIMPLIFIER = new F.Simplifier(RULES, { literal, categories: CATEGORIES, display, simplify });

/** The simplification of a TypeScript5 term (or anything `Terms.term` reads one from) in `scope`, or with the variables
 * in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
