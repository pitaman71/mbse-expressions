/**
 * ECMAScript's values and abstract operations, as the TypeScript5 dialect's folding rules read them (ECMA-262, 6 and
 * 7): what JavaScript has natively, modeled alike in both implementations, so that a TypeScript5 expression simplifies
 * to the same literal in each.
 *
 * Its values, each as JavaScript holds it: `undefined`, `null`, a boolean, a number, a bigint, a string, an array (its
 * holes missing elements; a tagged template's strings a `templateStrings`), an object (a plain object, its own
 * properties in ECMAScript's order), a regular expression (`RegExp`, its source and flags: its matching is not
 * modeled), a function (a `Closure` an arrow makes, or a function the scope provides), a data object (mbse-schemas',
 * read through `Framework.Objects`, its properties as an object's), and any other value the scope provides, a host
 * value, which no operation reads (each throws `NoRule`, "TypeScript5 host value is not simplified").
 *
 * Its abstract operations, as ECMA-262 names them (7.1 and 7.2): `typeOf` (13.5.3), `toBoolean`, `toPrimitive` (an
 * object's own `valueOf` and `toString` called where they are functions, else the built-in ones: an array joined, an
 * object `[object Object]`), `toNumber` (a string by StringToNumber), `toNumeric`, `toString` (a number by
 * Number::toString), `toPropertyKey`, `isStrictlyEqual`, `isLooselyEqual` and `isLessThan`; the
 * operators over numbers and bigints (`binary`, `unary`, 6.1.6), with BigInt's errors; property access (`get`,
 * `hasProperty`), iteration (`iterate`), an object's own entries (`ownEntries`) and calls (`call`, `construct`). A
 * built-in method (`String.prototype.toUpperCase`) is read, but not modeled: reading one throws `NoRule` by its name,
 * as `BUILTINS` lists them, since its value is the language's runtime's. Errors are ECMAScript's, of the same names
 * and messages in both implementations: TypeError, and RangeError. Python's twin is `Abstract.py`: what JavaScript
 * has natively, it models (`UNDEFINED`, a `HOLE` in a list, UTF-16 code units, bigints' sizes).
 */

import * as F from "../../Framework/Simplifiers.js";
import * as Objects from "../../Framework/Objects.js";

export const DIALECT = "TypeScript5";

/** An array's missing element, as the rule of an elision alone gives it: in an array, a hole. */
export const HOLE: unknown = Symbol("hole");

/** A regular expression object, by identity: its `source` and its `flags`, as written. Its matching is not modeled. */
export class RegExp {
  constructor(readonly source: string, readonly flags: string) {}
}

/** A function an arrow makes, by identity: `call(arguments)` gives its value, its parameters bound to them. */
export class Closure {
  constructor(readonly call: (args: unknown[]) => unknown) {}
}

const TEMPLATES = new WeakSet<object>();

/** A tagged template's first argument: its cooked strings, an array (`undefined` where a quasi has an invalid escape),
 * and their raw text, `raw`. */
export function templateStrings(cooked: readonly unknown[], raw: readonly string[]): unknown[] {
  const strings = [...cooked];
  Object.defineProperty(strings, "raw", { value: [...raw] });
  TEMPLATES.add(strings);
  return strings;
}

/** Whether an array is a tagged template's strings. */
export function isTemplateStrings(value: unknown): boolean {
  return typeof value === "object" && value !== null && TEMPLATES.has(value);
}

const PROTOTYPES: Record<string, readonly string[]> = {
  Object: ["__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "__proto__", "constructor",
    "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"],
  Array: ["at", "concat", "constructor", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex",
    "findLast", "findLastIndex", "flat", "flatMap", "forEach", "includes", "indexOf", "join", "keys", "lastIndexOf",
    "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice",
    "toLocaleString", "toReversed", "toSorted", "toSpliced", "toString", "unshift", "values", "with"],
  String: ["anchor", "at", "big", "blink", "bold", "charAt", "charCodeAt", "codePointAt", "concat", "constructor",
    "endsWith", "fixed", "fontcolor", "fontsize", "includes", "indexOf", "isWellFormed", "italics", "lastIndexOf",
    "link", "localeCompare", "match", "matchAll", "normalize", "padEnd", "padStart", "repeat", "replace", "replaceAll",
    "search", "slice", "small", "split", "startsWith", "strike", "sub", "substr", "substring", "sup",
    "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toString", "toUpperCase", "toWellFormed", "trim",
    "trimEnd", "trimLeft", "trimRight", "trimStart", "valueOf"],
  Number: ["constructor", "toExponential", "toFixed", "toLocaleString", "toPrecision", "toString", "valueOf"],
  Boolean: ["constructor", "toString", "valueOf"],
  BigInt: ["constructor", "toLocaleString", "toString", "valueOf"],
  Function: ["apply", "bind", "call", "constructor", "length", "name", "toString"],
  RegExp: ["compile", "constructor", "dotAll", "exec", "flags", "global", "hasIndices", "ignoreCase", "lastIndex",
    "multiline", "source", "sticky", "test", "toString", "unicode", "unicodeSets"],
};

/** The built-in properties read but not modeled, by name ("String.prototype.toUpperCase"): reading one throws `NoRule`
 * by that name. */
export const BUILTINS: readonly string[] = Object.entries(PROTOTYPES)
  .flatMap(([name, keys]) => keys.map((key) => `${name}.prototype.${key}`));

const PROTOTYPE_OF: Record<string, string> = {
  string: "String", number: "Number", boolean: "Boolean", bigint: "BigInt", array: "Array", function: "Function",
  regexp: "RegExp",
};

/** The most bits a bigint may have, as V8 allows: an exponent or a left shift beyond it, whose result has more, throws
 * RangeError "Maximum BigInt size exceeded" before it is computed (a result that grows beyond it otherwise throws as V8
 * does, and is computed in Python, whose ints are unbounded). */
export const MAX_BIGINT_BITS = 1n << 30n;

const PRIMITIVES = new Set(["undefined", "null", "boolean", "number", "bigint", "string"]);

/** A value's kind: `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `array`, `object`, `regexp`,
 * `function`, `data` (a data object) or `host`. */
export function kind(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  const type = typeof value;
  if (type === "boolean" || type === "number" || type === "bigint" || type === "string") return type;
  if (Array.isArray(value)) return "array";
  if (value instanceof RegExp) return "regexp";
  if (value instanceof Closure) return "function";
  if (Objects.isObject(value)) return "data";
  if (type === "function") return "function";
  const prototype = type === "object" ? Object.getPrototypeOf(value) : undefined;
  return prototype === Object.prototype || prototype === null ? "object" : "host";
}

/** Whether a value is a primitive: not an object. */
export function isPrimitive(value: unknown): boolean {
  return PRIMITIVES.has(kind(value));
}

function host(): F.NoRule {
  return new F.NoRule(DIALECT, "host value");
}

/** `typeof value` (13.5.3). */
export function typeOf(value: unknown): string {
  const found = kind(value);
  if (found === "null") return "object";
  return PRIMITIVES.has(found) || found === "function" ? found : "object";
}

/** ToBoolean (7.1.2). */
export function toBoolean(value: unknown): boolean {
  const found = kind(value);
  if (found === "undefined" || found === "null") return false;
  if (found === "number") return !(value === 0 || Number.isNaN(value));
  if (found === "boolean" || found === "bigint" || found === "string") return Boolean(value);
  return true;
}

const ARRAY_INDEX = /^(?:0|[1-9][0-9]*)$/;

/** Whether a property key is an array index: a canonical integer from 0 to 2 ** 32 - 2. */
export function isArrayIndex(key: string): boolean {
  return ARRAY_INDEX.test(key) && BigInt(key) < 2n ** 32n - 1n;
}

// --- Conversions (7.1) ---

const BUILTIN = Symbol("builtin");

/** An object's own property `name`, or `BUILTIN` where it has none, its prototype's then read. */
function own(value: any, found: string, name: string): unknown {
  if (found === "object" && Object.hasOwn(value, name)) return value[name];
  if (found === "data") {
    const properties = Objects.properties(value);
    if (properties.has(name)) return listed(properties.get(name));
  }
  return BUILTIN;
}

/** An object's built-in `toString`: an array joined by commas, a regular expression's source and flags, an object's
 * `[object Object]`; a function's source text is not modeled. */
function builtinString(value: any, found: string): string {
  if (found === "array") {
    const items: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      items.push(!(i in value) || item === undefined || item === null ? "" : toString(item));
    }
    return items.join(",");
  }
  if (found === "regexp") return `/${value.source}/${value.flags}`;
  if (found === "function") throw new F.NoRule(DIALECT, "Function.prototype.toString");
  return "[object Object]";
}

/** ToPrimitive (7.1.1): a primitive as it is; an object by OrdinaryToPrimitive, its own `valueOf` and `toString`
 * (`toString` first for the hint `string`) called where they are functions, its built-in ones otherwise. */
export function toPrimitive(value: unknown, hint = "default"): unknown {
  const found = kind(value);
  if (PRIMITIVES.has(found)) return value;
  if (found === "host") throw host();
  for (const name of hint === "string" ? ["toString", "valueOf"] : ["valueOf", "toString"]) {
    const method = own(value, found, name);
    if (method === BUILTIN) {
      if (name === "toString") return builtinString(value, found);
      continue; // Object.prototype.valueOf gives the object itself
    }
    if (kind(method) === "function") {
      const result = call(method, []);
      if (isPrimitive(result)) return result;
    }
  }
  throw new TypeError("Cannot convert object to primitive value");
}

const WHITESPACE = new Set("\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a"
  + "\u2028\u2029\u202f\u205f\u3000\ufeff");
const DECIMAL = /^[+-]?(?:Infinity|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)$/;
const NON_DECIMAL = /^0(?:[xX][0-9a-fA-F]+|[oO][0-7]+|[bB][01]+)$/;
const INTEGER = /^[+-]?[0-9]+$/;

function trim(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && WHITESPACE.has(value[start] as string)) start++;
  while (end > start && WHITESPACE.has(value[end - 1] as string)) end--;
  return value.slice(start, end);
}

/** StringToNumber (7.1.4.1.1): ECMAScript's StringNumericLiteral, its white space trimmed, else NaN. */
export function stringToNumber(value: string): number {
  const text = trim(value);
  if (text === "") return 0;
  if (NON_DECIMAL.test(text)) return Number(BigInt(text));
  return DECIMAL.test(text) ? Number(text) : NaN;
}

/** StringToBigInt (7.1.14): an integer, decimal with its sign or binary, octal or hexadecimal, its white space trimmed;
 * null (undefined) where it is none. */
export function stringToBigint(value: string): bigint | null {
  const text = trim(value);
  if (text === "") return 0n;
  return NON_DECIMAL.test(text) || INTEGER.test(text) ? BigInt(text) : null;
}

/** ToNumber (7.1.4). */
export function toNumber(value: unknown): number {
  const found = kind(value);
  if (found === "undefined") return NaN;
  if (found === "null") return 0;
  if (found === "boolean") return value ? 1 : 0;
  if (found === "number") return value as number;
  if (found === "string") return stringToNumber(value as string);
  if (found === "bigint") throw new TypeError("Cannot convert a BigInt value to a number");
  return toNumber(toPrimitive(value, "number"));
}

/** ToNumeric (7.1.3): a bigint as it is, any other value's number. */
export function toNumeric(value: unknown): number | bigint {
  const primitive = toPrimitive(value, "number");
  return typeof primitive === "bigint" ? primitive : toNumber(primitive);
}

/** ToString (7.1.17). */
export function toString(value: unknown): string {
  const found = kind(value);
  if (found === "undefined" || found === "null") return found;
  if (found === "boolean") return value ? "true" : "false";
  if (found === "number" || found === "bigint") return String(value);
  if (found === "string") return value as string;
  return toString(toPrimitive(value, "string"));
}

/** ToPropertyKey (7.1.19): a string (ECMAScript's symbols are not modeled). */
export function toPropertyKey(value: unknown): string {
  return toString(toPrimitive(value, "string"));
}

// --- Equality and order (7.2) ---

function typeKind(value: unknown): string {
  const found = kind(value);
  return PRIMITIVES.has(found) ? found : "object";
}

/** IsStrictlyEqual (7.2.15): the same type, and the same value (NaN equal to nothing, 0 to -0), an object the same
 * object. */
export function isStrictlyEqual(left: unknown, right: unknown): boolean {
  return typeKind(left) === typeKind(right) && left === right;
}

/** IsLooselyEqual (7.2.14). */
export function isLooselyEqual(left: unknown, right: unknown): boolean {
  const a = typeKind(left);
  const b = typeKind(right);
  if (a === b) return isStrictlyEqual(left, right);
  const pair = new Set([a, b]);
  if (pair.has("undefined") && pair.has("null")) return true;
  if (a === "number" && b === "string") return left === stringToNumber(right as string);
  if (a === "string" && b === "number") return stringToNumber(left as string) === right;
  if (a === "bigint" && b === "string") {
    const n = stringToBigint(right as string);
    return n !== null && left === n;
  }
  if (a === "string" && b === "bigint") return isLooselyEqual(right, left);
  if (a === "boolean") return isLooselyEqual(toNumber(left), right);
  if (b === "boolean") return isLooselyEqual(left, toNumber(right));
  const primitive = (found: string): boolean => found === "string" || found === "number" || found === "bigint";
  if (primitive(a) && b === "object") return isLooselyEqual(left, toPrimitive(right));
  if (a === "object" && primitive(b)) return isLooselyEqual(toPrimitive(left), right);
  if (pair.has("number") && pair.has("bigint")) {
    const number = (a === "number" ? left : right) as number;
    return Number.isFinite(number) && left == right; // eslint-disable-line eqeqeq
  }
  return false;
}

/** IsLessThan (7.2.13): true, false, or null (undefined) where a NaN or a string that is no bigint decides. */
export function isLessThan(left: unknown, right: unknown, leftFirst = true): boolean | null {
  let px: unknown;
  let py: unknown;
  if (leftFirst) {
    px = toPrimitive(left, "number");
    py = toPrimitive(right, "number");
  } else {
    py = toPrimitive(right, "number");
    px = toPrimitive(left, "number");
  }
  if (typeof px === "string" && typeof py === "string") return px < py;
  if (typeof px === "bigint" && typeof py === "string") {
    const n = stringToBigint(py);
    return n === null ? null : px < n;
  }
  if (typeof px === "string" && typeof py === "bigint") {
    const n = stringToBigint(px);
    return n === null ? null : n < py;
  }
  const nx = toNumeric(px);
  const ny = toNumeric(py);
  if (Number.isNaN(nx) || Number.isNaN(ny)) return null;
  return nx < ny;
}

// --- Operators over numbers and bigints (6.1.6) ---

function mix(): TypeError {
  return new TypeError("Cannot mix BigInt and other types, use explicit conversions");
}

function tooBig(): RangeError {
  return new RangeError("Maximum BigInt size exceeded");
}

const NUMBER: Record<string, (x: number, y: number) => number> = {
  "+": (x, y) => x + y, "-": (x, y) => x - y, "*": (x, y) => x * y, "/": (x, y) => x / y, "%": (x, y) => x % y,
  "**": (x, y) => x ** y, "<<": (x, y) => x << y, ">>": (x, y) => x >> y, ">>>": (x, y) => x >>> y,
  "&": (x, y) => x & y, "|": (x, y) => x | y, "^": (x, y) => x ^ y,
};

function bigDivide(x: bigint, y: bigint, remainder: boolean): bigint {
  if (y === 0n) throw new RangeError("Division by zero");
  return remainder ? x % y : x / y;
}

function bigPower(x: bigint, y: bigint): bigint {
  if (y < 0n) throw new RangeError("Exponent must be non-negative");
  if ((x > 1n || x < -1n) && y > MAX_BIGINT_BITS) throw tooBig(); // more bits than its exponent
  return x ** y;
}

function bigShift(x: bigint, y: bigint): bigint {
  if (y < 0n) return x >> -y;
  if (x !== 0n && y > MAX_BIGINT_BITS) throw tooBig(); // more bits than its shift
  return x << y;
}

const BIGINT: Record<string, (x: bigint, y: bigint) => bigint> = {
  "+": (x, y) => x + y, "-": (x, y) => x - y, "*": (x, y) => x * y,
  "/": (x, y) => bigDivide(x, y, false), "%": (x, y) => bigDivide(x, y, true), "**": bigPower,
  "<<": bigShift, ">>": (x, y) => bigShift(x, -y),
  ">>>": () => {
    throw new TypeError("BigInts have no unsigned right shift, use >> instead");
  },
  "&": (x, y) => x & y, "|": (x, y) => x | y, "^": (x, y) => x ^ y,
};

/** ApplyStringOrNumericBinaryOperator (13.15.3): `+` concatenating where either primitive is a string, else each
 * operator over numbers or over bigints, mixing them a TypeError. */
export function binary(operator: string, left: unknown, right: unknown): unknown {
  if (operator === "+") {
    left = toPrimitive(left);
    right = toPrimitive(right);
    if (typeof left === "string" || typeof right === "string") return toString(left) + toString(right);
  }
  const x = toNumeric(left);
  const y = toNumeric(right);
  if (typeof x !== typeof y) throw mix();
  return typeof x === "bigint"
    ? (BIGINT[operator] as (x: bigint, y: bigint) => bigint)(x, y as bigint)
    : (NUMBER[operator] as (x: number, y: number) => number)(x, y as number);
}

/** `-`, `+`, `~` and `!` (13.5). */
export function unary(operator: string, value: unknown): unknown {
  if (operator === "!") return !toBoolean(value);
  if (operator === "+") return toNumber(value);
  const numeric = toNumeric(value);
  if (operator === "-") return -numeric;
  return ~numeric;
}

// --- Objects ---

/** A data object's property as ECMAScript reads it: a list as an array of its values, lists of lists too. */
function listed(value: unknown): unknown {
  return value instanceof Objects.Listed ? value.values.map(listed) : value;
}

/** An object's properties in ECMAScript's order (OrdinaryOwnPropertyKeys, 10.1.11.1): its array indices ascending,
 * then its other keys as inserted, as JavaScript holds them. */
export function ordered(properties: Record<string, unknown>): Record<string, unknown> {
  return properties;
}

/** The name of the built-in property a value of a kind inherits as `key`, if any. */
function builtin(found: string, key: string): string | null {
  for (const prototype of [PROTOTYPE_OF[found], "Object"]) {
    if (prototype !== undefined && (PROTOTYPES[prototype] as readonly string[]).includes(key)) {
      return `${prototype}.prototype.${key}`;
    }
  }
  return null;
}

/** A property a value does not own: a built-in's throws `NoRule` by its name; any other is undefined. */
function inherited(found: string, key: string): unknown {
  const name = builtin(found, key);
  if (name !== null) throw new F.NoRule(DIALECT, name);
  return undefined;
}

/** `value[key]`, a property key: its own property, else undefined; reading `undefined` or `null` a TypeError. */
export function get(value: any, key: string): unknown {
  const found = kind(value);
  if (found === "undefined" || found === "null") throw new TypeError(`Cannot read properties of ${found} (reading '${key}')`);
  if (found === "host") throw host();
  if (found === "string" || found === "array") {
    if (key === "length") return value.length;
    if (isArrayIndex(key)) return Number(key) < value.length ? value[Number(key)] : undefined;
    if (key === "raw" && isTemplateStrings(value)) return value.raw;
  } else if (found === "object") {
    if (Object.hasOwn(value, key)) return value[key];
  } else if (found === "data") {
    const properties = Objects.properties(value);
    if (properties.has(key)) return listed(properties.get(key));
  }
  return inherited(found, key);
}

/** `key in value` (13.10.1): whether the object has the property, its own or inherited; a primitive a TypeError. */
export function hasProperty(value: any, key: unknown): boolean {
  const found = kind(value);
  if (PRIMITIVES.has(found)) {
    throw new TypeError(`Cannot use 'in' operator to search for '${toString(key)}' in ${toString(value)}`);
  }
  if (found === "host") throw host();
  const name = toPropertyKey(key);
  if (builtin(found, name) !== null) return true;
  if (found === "array") {
    if (isArrayIndex(name)) return Number(name) in value;
    return name === "length" || (name === "raw" && isTemplateStrings(value));
  }
  if (found === "object") return Object.hasOwn(value, name);
  if (found === "data") return Objects.properties(value).has(name);
  return found === "regexp" && name === "lastIndex";
}

/** The values an iterable gives (7.4): an array's elements (a hole undefined), a string's code points; any other value
 * a TypeError. */
export function iterate(value: unknown): unknown[] {
  const found = kind(value);
  if (found === "array") return Array.from(value as unknown[]);
  if (found === "string") return [...(value as string)];
  if (found === "host") throw host();
  throw new TypeError(`${found === "null" ? "null" : typeOf(value)} is not iterable`);
}

/** An object's own enumerable properties, as a spread copies them (CopyDataProperties, 7.3.25): a string's and an
 * array's indices, an object's and a data object's properties; none of a primitive's or a function's. */
export function ownEntries(value: any): [string, unknown][] {
  const found = kind(value);
  if (found === "host") throw host();
  if (found === "string") return [...(value as string).split("").entries()].map(([i, unit]) => [String(i), unit]);
  if (found === "array") return Object.keys(value).map((key) => [key, value[key]]);
  if (found === "object") return Object.entries(value);
  if (found === "data") return [...Objects.properties(value)].map(([key, item]) => [key, listed(item)]);
  return [];
}

/** A function called with its arguments: a closure, or a function the scope provides. */
export function call(fn: unknown, args: unknown[]): unknown {
  if (fn instanceof Closure) return fn.call(args);
  return (fn as (...args: unknown[]) => unknown)(...args);
}

function isConstructor(fn: unknown): boolean {
  try {
    Reflect.construct(String, [], fn as new () => unknown);
    return true;
  } catch {
    return false;
  }
}

/** `new constructor(...arguments)`, of a class the scope provides; null where it is no constructor. */
export function construct(constructor: unknown, args: unknown[]): unknown {
  return typeof constructor === "function" && isConstructor(constructor)
    ? Reflect.construct(constructor as new (...args: unknown[]) => unknown, args) : null;
}

/** `value instanceof target` (13.10.2): whether a class the scope provides made the object. */
export function instanceOf(value: unknown, target: unknown): boolean {
  if (kind(target) !== "function") throw new TypeError("Right-hand side of 'instanceof' is not callable");
  if (isPrimitive(value)) return false;
  if (!(typeof target === "function" && isConstructor(target))) {
    throw new TypeError("Function has non-object prototype 'undefined' in instanceof check");
  }
  return value instanceof (target as new () => unknown);
}

// --- Templates (13.2.8) ---

const DIGITS = "0123456789";
const SINGLE: Record<string, string> = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" };
const HEX4 = /^[0-9a-fA-F]{4}$/;
const HEX2 = /^[0-9a-fA-F]{2}$/;
const HEXES = /^\{([0-9a-fA-F]+)\}/;

/** A template's cooked string, its TV, from the raw text of a quasi (its line terminators already LF, as its TRV has
 * them): its escapes read; null (undefined) where one is invalid. */
export function cook(raw: string): string | null {
  const written: string[] = [];
  let i = 0;
  while (i < raw.length) {
    const character = raw[i] as string;
    i++;
    if (character !== "\\") {
      written.push(character);
      continue;
    }
    const escape = raw.slice(i, i + 1);
    i++;
    if (escape === "\n" || escape === "\u2028" || escape === "\u2029") continue; // a line continuation
    const next = raw.slice(i, i + 1);
    if (escape === "0" && !(next !== "" && DIGITS.includes(next))) {
      written.push("\0");
    } else if (escape === "" || DIGITS.includes(escape)) {
      return null;
    } else if (escape === "x") {
      if (!HEX2.test(raw.slice(i, i + 2))) return null;
      written.push(String.fromCharCode(parseInt(raw.slice(i, i + 2), 16)));
      i += 2;
    } else if (escape === "u") {
      const braces = HEXES.exec(raw.slice(i));
      if (braces !== null && parseInt(braces[1] as string, 16) <= 0x10ffff) {
        written.push(String.fromCodePoint(parseInt(braces[1] as string, 16)));
        i += braces[0].length;
      } else if (braces === null && HEX4.test(raw.slice(i, i + 4))) {
        written.push(String.fromCharCode(parseInt(raw.slice(i, i + 4), 16)));
        i += 4;
      } else {
        return null;
      }
    } else {
      written.push(SINGLE[escape] ?? escape);
    }
  }
  return written.join("");
}
