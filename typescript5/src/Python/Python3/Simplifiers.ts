/**
 * Simplifiers of the Python3 dialect: simplify an expression by Python's rules, in a scope that decides what it may
 * reach. This implementation models Python's rules over JavaScript values: int is `bigint`, float is `number`, str,
 * bool and bytes (`Uint8Array`) are themselves, None is `null`, `...` is `ELLIPSIS`, a complex number is a
 * `Domains.ComplexValue`, a list an array, a tuple mbse-schemas' `Repr.Tuple`, a set a `Set` and a dict a `Map` (or an
 * object of variables).
 *
 * `Simplifiers.OfAny(expression, scope)` simplifies in a `Scope`, or in one made from an object of variables (see
 * `Framework/Simplifiers`): what the scope determines is folded into the literal of its value, a basic scalar's or a
 * constant's (`None`, `...`, a complex number), or, for a list, a tuple or a dict of such values, into its display
 * (`[1, 2]`); a value with no literal stays, its subterm kept and its own subterms simplified: an object, a generator,
 * a set (whose order is its hash table's), a slice, a closure (a `lambda`'s value) and a template (a t-string's). The
 * rest stays a Python3 expression. Python's rules apply, not Patterns': `and` and `or` give one of their operands,
 * `1 == 1.0` is True, `True + 1` is 2, and a missing attribute throws `AttributeError`. Data objects, read through
 * mbse-schemas' readers (`Framework/Objects`), have their properties as attributes; a `Module` has its members as
 * attributes.
 *
 * A `new Scope(variables, { modules, builtins })` resolves names as Python does, innermost first: names bound by lets
 * and imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`,
 * `float`, `getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A name it does not bind
 * stays in the residual. A list property is an array of its values, a keyed list's too; a list display is an array, a
 * tuple display a tuple, a set display a `Set` and a dict display a `Map`, its keys compared as Python compares them.
 * Nothing else is reachable from an expression, since expressions may come from data:
 *
 * - An import resolves only a module in `modules`, or a submodule of one (a `Module` among its members); any other
 *   import stays in the residual, unresolved.
 * - Attributes whose names start with `_` are refused (`AttributeError`).
 * - A call may call only a builtin of the scope, a value of `variables`, a function of an allowed module, or a closure
 *   the expression made (a `lambda`). A JavaScript function takes no keyword arguments.
 *
 * Its rules fold every statement-free kind whose value Python defines (mbse-basis [CAP-295: simplification of
 * single-dialect expressions with literal leaves](mbse:mbse-basis/docs/capabilities/README.md#CAP-295) to [CAP-297:
 * simplification in every binding state](mbse:mbse-basis/docs/capabilities/README.md#CAP-297)), in their complete
 * shapes (`FOLDED`): constants, displays and their `*` and `**` unpacking, comprehensions of any number of clauses over
 * targets that unpack, f-strings by `format()`'s mini-language and t-strings, slices, calls with keywords and
 * unpacking, lambdas called with Python's binding of parameters, named expressions, `is` and `is not` by identity, and
 * `@`. What stays in the residual, named, is what has no value outside a statement (`yield`, `yield from`, `await`, an
 * `async for`, a target that writes into data), a kind of its family's other dialects and invalid syntax, by the name
 * of the dialect that owns it ("Python Types typevar is not simplified"; a type expression of Python3's kinds
 * simplifies as Python3's), and what Python leaves to its implementation or its platform, each named where it is
 * decided: `is` between equal immutable values; an f-string's field whose text is an implementation's (a set's order,
 * an object's address), a format spec of a locale (`n`) or of a complex number, and a `\N{...}` escape (Unicode's
 * names); a complex power other than an integer one, and a real power whose value is complex, which need the
 * platform's `pow`, `atan2`, `cos` and `sin`. `CATEGORIES` gives each the evaluation inventory's class.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import { IndexError, OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Simplifiers.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { AttributeError, KeyError, ValueError } = Errors;
const { compareStrings, pyFloat } = Repr;
const Tuple = Repr.Tuple;
type Tuple = Repr.Tuple;
const Complex = Domains.ComplexValue;
type Complex = Domains.ComplexValue;
const ELLIPSIS = Domains.ELLIPSIS;

/** A module an expression may import: named members, which may be functions, values or submodules. */
export class Module {
  readonly members: ReadonlyMap<string, unknown>;

  constructor(readonly name: string, members: Record<string, unknown>) {
    this.members = new Map(Object.entries(members));
  }
}

// --- Values with no literal ---

/** What a generator expression makes: its items, consumed once. */
class PyGenerator {
  constructor(private readonly items: Iterator<unknown>) {}

  [Symbol.iterator](): Iterator<unknown> {
    return this.items;
  }
}

/** A slice: its `start`, `stop` and `step`, null where it has none. */
class Slice {
  constructor(readonly start: unknown, readonly stop: unknown, readonly step: unknown) {}
}

/** What `*value` gives: the iterable it spreads into a display or a call's arguments. */
class Unpacked {
  constructor(readonly value: unknown) {}
}

/** A t-string's replacement field, as Python 3.14's `string.templatelib.Interpolation` holds it. */
class Interpolation {
  constructor(readonly value: unknown, readonly expression: string, readonly conversion: string | null,
    readonly format_spec: string) {}
}

/** A t-string's value, as Python 3.14's `string.templatelib.Template` holds it: its `strings`, one more than its
 * `interpolations`, and their `values`. */
class Template {
  readonly values: Tuple;

  constructor(readonly strings: Tuple, readonly interpolations: Tuple) {
    this.values = new Tuple(interpolations.items.map((interpolation) => (interpolation as Interpolation).value));
  }
}

/** The keyword arguments a function takes, where it takes any: `fn[KWARGS](args, kwargs)`. */
const KWARGS: unique symbol = Symbol("kwargs");
/** The closures expressions made, which any scope allows them to call. */
const CLOSURES = new WeakSet<object>();

const NAMES = new Map<unknown, string>([[PyGenerator, "generator"], [Slice, "slice"], [Unpacked, "starred"],
  [Interpolation, "Interpolation"], [Template, "Template"], [Module, "module"], [Complex, "complex"], [Tuple, "tuple"]]);

/** Python's `type(value).__name__`. */
function typeName(value: unknown): string {
  if (value === ELLIPSIS) return "ellipsis";
  if (value !== null && typeof value === "object") {
    const named = NAMES.get(Object.getPrototypeOf(value).constructor);
    if (named !== undefined) return named;
    if (Object.getPrototypeOf(value) === Object.prototype) return "dict";
  }
  return Repr.typeName(value);
}

/** A complex number as Python's `repr` writes it: `2j`, `(1-2j)`. */
function complexRepr(value: Complex): string {
  const part = (x: number): string => {
    const text = pyFloat(x);
    return text.endsWith(".0") ? text.slice(0, -2) : text;
  };
  if (Object.is(value.real, 0)) return `${part(value.imag)}j`;
  const imaginary = part(value.imag);
  return `(${part(value.real)}${imaginary.startsWith("-") ? "" : "+"}${imaginary}j)`;
}

/** Python's `repr(value)`. */
function repr(value: unknown): string {
  if (value === ELLIPSIS) return "Ellipsis";
  if (value instanceof Complex) return complexRepr(value);
  if (value instanceof Tuple) {
    const items = value.items.map(repr);
    return items.length === 1 ? `(${items[0]},)` : `(${items.join(", ")})`;
  }
  if (Array.isArray(value)) return `[${value.map(repr).join(", ")}]`;
  if (value instanceof Set) return value.size === 0 ? "set()" : `{${[...value].map(repr).join(", ")}}`;
  if (isDict(value)) return `{${entries(value).map(([k, v]) => `${repr(k)}: ${repr(v)}`).join(", ")}}`;
  if (value instanceof Slice) return `slice(${repr(value.start)}, ${repr(value.stop)}, ${repr(value.step)})`;
  return Repr.repr(value);
}

/** Python's `ascii(value)`: its `repr`, each code point beyond ASCII escaped. */
function ascii(value: unknown): string {
  return [...repr(value)].map((char) => {
    const point = char.codePointAt(0) as number;
    if (point < 0x80) return char;
    const hex = point.toString(16);
    return point < 0x100 ? `\\x${hex.padStart(2, "0")}` : point < 0x10000 ? `\\u${hex.padStart(4, "0")}` : `\\U${hex.padStart(8, "0")}`;
  }).join("");
}

/** `value.name`, as expressions read it: never private, a module's members, a data object's properties, and the
 * attributes of the values of Python's rules (a complex number's, a slice's, a template's). */
export function attribute(value: unknown, name: unknown): unknown {
  if (typeof name !== "string" || name.startsWith("_")) throw new AttributeError(`attribute ${repr(name)} is private`);
  if (value instanceof Module) {
    if (!value.members.has(name)) throw new AttributeError(`module ${repr(value.name)} has no attribute ${repr(name)}`);
    return value.members.get(name);
  }
  let what = typeName(value);
  if (Objects.isObject(value)) {
    const properties = Objects.properties(value);
    if (properties.has(name)) return listed(properties.get(name));
    what = (value as any).as_schema().name; // named by its schema, the type it has for expressions
  }
  const fields: Record<string, string[]> = { complex: ["real", "imag"], slice: ["start", "stop", "step"],
    Template: ["strings", "interpolations", "values"], Interpolation: ["value", "expression", "conversion", "format_spec"] };
  if ((fields[what] ?? []).includes(name)) return (value as any)[name];
  throw new AttributeError(`${repr(what)} object has no attribute ${repr(name)}`);
}

/** A property's value as Python reads it: a list as an array of its values, lists of lists too. */
function listed(value: unknown): unknown {
  return value instanceof Objects.Listed ? value.values.map(listed) : value;
}

// --- Python's rules over JavaScript values ---

/** Whether a value is a dict: a `Map`, or a plain object (an object of variables). */
function isDict(value: unknown): value is Map<unknown, unknown> | Record<string, unknown> {
  return value instanceof Map || (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype);
}

/** A dict's items, in order. */
function entries(value: Map<unknown, unknown> | Record<string, unknown>): [unknown, unknown][] {
  return value instanceof Map ? [...value.entries()] : Object.entries(value);
}

/** A sequence's items: a list's, a tuple's. */
function itemsOf(value: unknown[] | Tuple): readonly unknown[] {
  return value instanceof Tuple ? value.items : value;
}

/** Python's `iter(value)`: a str's characters, bytes' ints, a list's, a tuple's or a set's items, a dict's keys. */
function iterate(value: unknown): Iterable<unknown> {
  if (typeof value === "string") return [...value];
  if (value instanceof Uint8Array) return [...value].map(BigInt);
  if (value instanceof Tuple) return value.items;
  if (Array.isArray(value) || value instanceof Set || value instanceof PyGenerator) return value;
  if (isDict(value)) return entries(value).map(([key]) => key);
  throw new TypeError(`${repr(typeName(value))} object is not iterable`);
}

/** The items of an iterable, or a TypeError with `message`. */
function iterable(value: unknown, message: string): unknown[] {
  try {
    return [...iterate(value)];
  } catch (error) {
    if (error instanceof TypeError) throw new TypeError(message);
    throw error;
  }
}

/** The type of what makes a value unhashable (a list, a dict, a set, or one a tuple holds), or null. */
function unhashable(value: unknown): string | null {
  if (Array.isArray(value) || value instanceof Set || isDict(value)) return typeName(value);
  if (value instanceof Tuple) {
    for (const item of value.items) {
      const found = unhashable(item);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Throws unless `value` is hashable, as `what` (a set element, a dict key) must be. */
function hashable(value: unknown, what: string): void {
  const found = unhashable(value);
  if (found !== null) throw new TypeError(`cannot use ${repr(typeName(value))} as ${what} (unhashable type: ${repr(found)})`);
}

type Integral = bigint | boolean;

function isIntegral(value: unknown): value is Integral {
  return typeof value === "bigint" || typeof value === "boolean";
}

function isNumeric(value: unknown): value is Integral | number {
  return isIntegral(value) || typeof value === "number";
}

function int(value: Integral): bigint {
  return typeof value === "boolean" ? (value ? 1n : 0n) : value;
}

function float(value: Integral | number): number {
  return typeof value === "number" ? value : Number(int(value));
}

/** An int as a float, as Python converts one: rounded, or `OverflowError` beyond the largest float. */
function intToFloat(value: Integral): number {
  const converted = Number(int(value));
  if (!Number.isFinite(converted)) throw new OverflowError("int too large to convert to float");
  return converted;
}

/** Python's `bool(value)`. */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (value instanceof Complex) return value.real !== 0 || value.imag !== 0;
  if (typeof value === "string" || value instanceof Uint8Array || Array.isArray(value)) return value.length > 0;
  if (value instanceof Tuple) return value.items.length > 0;
  if (value instanceof Set) return value.size > 0;
  if (isDict(value)) return entries(value).length > 0;
  return true;
}

/** -1, 0 or 1 comparing an int with a float exactly; NaN if the float is NaN. */
function compareMixed(i: bigint, n: number): number {
  if (Number.isNaN(n)) return NaN;
  if (n === Infinity) return -1;
  if (n === -Infinity) return 1;
  const floor = BigInt(Math.floor(n));
  if (i < floor) return -1;
  if (i > floor) return 1;
  return n === Math.floor(n) ? 0 : -1;
}

/** -1, 0 or 1 comparing two numbers as Python does; NaN when unordered. */
function compareNumbers(a: Integral | number, b: Integral | number): number {
  if (isIntegral(a) && isIntegral(b)) return int(a) < int(b) ? -1 : int(a) > int(b) ? 1 : 0;
  if (isIntegral(a)) return compareMixed(int(a), b as number);
  if (isIntegral(b)) return -compareMixed(int(b), a);
  return a === b ? 0 : Math.sign(a - b);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
  }
  return a.length - b.length;
}

/** Python's `a == b`. */
export function equals(a: unknown, b: unknown): boolean {
  if (isNumeric(a) && isNumeric(b)) return compareNumbers(a, b) === 0;
  if (a instanceof Complex || b instanceof Complex) {
    if (a instanceof Complex && b instanceof Complex) return a.real === b.real && a.imag === b.imag;
    const [c, other] = a instanceof Complex ? [a, b] : [b as Complex, a];
    return isNumeric(other) && c.imag === 0 && compareNumbers(other, c.real) === 0;
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) return compareBytes(a, b) === 0;
  if ((Array.isArray(a) && Array.isArray(b)) || (a instanceof Tuple && b instanceof Tuple)) {
    const [x, y] = [itemsOf(a), itemsOf(b as unknown[] | Tuple)];
    return x.length === y.length && x.every((item, i) => equals(item, y[i]));
  }
  if (a instanceof Set && b instanceof Set) return a.size === b.size && [...a].every((item) => contains(b, item));
  if (isDict(a) && isDict(b)) {
    const [x, y] = [entries(a), entries(b)];
    return x.length === y.length && x.every(([key, value]) => {
      const found = y.find(([other]) => equals(other, key));
      return found !== undefined && equals(value, found[1]);
    });
  }
  return a === b;
}

function notSupported(operator: string, a: unknown, b: unknown): TypeError {
  return new TypeError(`${repr(operator)} not supported between instances of ${repr(typeName(a))} and ${repr(typeName(b))}`);
}

/** Python's ordering of `a` and `b` for `operator`: -1, 0, 1 or NaN; throws when they are not ordered. Sequences of one
 * type compare item by item, then by length. */
function order(operator: string, a: unknown, b: unknown): number {
  if (isNumeric(a) && isNumeric(b)) return compareNumbers(a, b);
  if (typeof a === "string" && typeof b === "string") return Math.sign(compareStrings(a, b));
  if (a instanceof Uint8Array && b instanceof Uint8Array) return Math.sign(compareBytes(a, b));
  if ((Array.isArray(a) && Array.isArray(b)) || (a instanceof Tuple && b instanceof Tuple)) {
    const [x, y] = [itemsOf(a), itemsOf(b as unknown[] | Tuple)];
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (!equals(x[i], y[i])) return order(operator, x[i], y[i]);
    }
    return Math.sign(x.length - y.length);
  }
  throw notSupported(operator, a, b);
}

const ORDERS: Record<string, (o: number) => boolean> = {
  "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0,
};

/** Python's ordering operators: sets by inclusion, any other values by `order`. */
function ordered(operator: string, a: unknown, b: unknown): boolean {
  if (a instanceof Set && b instanceof Set) {
    const within = (x: Set<unknown>, y: Set<unknown>) => [...x].every((item) => contains(y, item));
    switch (operator) {
      case "<": return a.size < b.size && within(a, b);
      case "<=": return within(a, b);
      case ">": return a.size > b.size && within(b, a);
      default: return within(b, a);
    }
  }
  return (ORDERS[operator] as (o: number) => boolean)(order(operator, a, b));
}

function unsupported(operator: string, a: unknown, b: unknown): TypeError {
  return new TypeError(`unsupported operand type(s) for ${operator}: ${repr(typeName(a))} and ${repr(typeName(b))}`);
}

function concatenate(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

type Sequence = string | Uint8Array | unknown[] | Tuple;

function isSequence(value: unknown): value is Sequence {
  return typeof value === "string" || value instanceof Uint8Array || Array.isArray(value) || value instanceof Tuple;
}

function repeat(sequence: Sequence, count: unknown): Sequence {
  if (!isIntegral(count)) {
    throw new TypeError(`can't multiply sequence by non-int of type ${repr(typeName(count))}`);
  }
  const times = Number(int(count) < 0n ? 0n : int(count));
  if (typeof sequence === "string") return sequence.repeat(times);
  if (sequence instanceof Uint8Array) {
    let out: Uint8Array = new Uint8Array(0);
    for (let i = 0; i < times; i++) out = concatenate(out, sequence);
    return out;
  }
  const items = Array.from({ length: times }, () => itemsOf(sequence)).flat();
  return sequence instanceof Tuple ? new Tuple(items) : items;
}

/** Python's `a + b` of two sequences of one type, or its message where they differ. */
function joined(a: Sequence, b: unknown): Sequence {
  if (typeof a === "string" && typeof b === "string") return a + b;
  if (a instanceof Uint8Array && b instanceof Uint8Array) return concatenate(a, b);
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (a instanceof Tuple && b instanceof Tuple) return new Tuple([...a.items, ...b.items]);
  if (a instanceof Uint8Array) throw new TypeError(`can't concat ${typeName(b)} to bytes`);
  throw new TypeError(`can only concatenate ${typeName(a)} (not "${typeName(b)}") to ${typeName(a)}`);
}

function zero(value: Integral | number): boolean {
  return float(value) === 0;
}

function floorDivide(a: bigint, b: bigint): bigint {
  const quotient = a / b;
  return a % b !== 0n && (a < 0n) !== (b < 0n) ? quotient - 1n : quotient;
}

// --- Complex numbers, as CPython 3.14 computes them ---

/** A real operand of complex arithmetic, as a float. */
function real(value: Integral | number): number {
  return typeof value === "number" ? value : intToFloat(value);
}

/** C's `copysign`, a NaN's sign taken as positive. */
function copysign(magnitude: number, sign: number): number {
  return sign < 0 || Object.is(sign, -0) ? -Math.abs(magnitude) : Math.abs(magnitude);
}

/** CPython's `_Py_c_prod`, infinities computed as nan+nanj recovered as C11's Annex G does. */
function product(z: Complex, w: Complex): Complex {
  let [a, b, c, d] = [z.real, z.imag, w.real, w.imag];
  const [ac, bd, ad, bc] = [a * c, b * d, a * d, b * c];
  const r = new Complex(ac - bd, ad + bc);
  if (!(Number.isNaN(r.real) && Number.isNaN(r.imag))) return r;
  const infinite = (x: number) => x === Infinity || x === -Infinity;
  const box = (x: number) => copysign(infinite(x) ? 1 : 0, x);
  const zeroed = (x: number) => (Number.isNaN(x) ? copysign(0, x) : x);
  let recalc = false;
  if (infinite(a) || infinite(b)) {
    [a, b, c, d] = [box(a), box(b), zeroed(c), zeroed(d)];
    recalc = true;
  }
  if (infinite(c) || infinite(d)) {
    [c, d, a, b] = [box(c), box(d), zeroed(a), zeroed(b)];
    recalc = true;
  }
  if (!recalc && [ac, bd, ad, bc].some(infinite)) {
    [a, b, c, d] = [zeroed(a), zeroed(b), zeroed(c), zeroed(d)];
    recalc = true;
  }
  return recalc ? new Complex(Infinity * (a * c - b * d), Infinity * (a * d + b * c)) : r;
}

/** CPython's `_Py_c_quot`: Smith's algorithm, infinities and zeros computed as nan+nanj recovered as C11's Annex G
 * does; `null` where the divisor is zero. */
function quotientOrZero(a: Complex, b: Complex): Complex | null {
  const [absReal, absImag] = [Math.abs(b.real), Math.abs(b.imag)];
  let r: Complex;
  if (absReal >= absImag) {
    if (absReal === 0) return null;
    const ratio = b.imag / b.real;
    const denominator = b.real + b.imag * ratio;
    r = new Complex((a.real + a.imag * ratio) / denominator, (a.imag - a.real * ratio) / denominator);
  } else if (absImag >= absReal) {
    const ratio = b.real / b.imag;
    const denominator = b.real * ratio + b.imag;
    r = new Complex((a.real * ratio + a.imag) / denominator, (a.imag * ratio - a.real) / denominator);
  } else r = new Complex(NaN, NaN);
  if (!(Number.isNaN(r.real) && Number.isNaN(r.imag))) return r;
  const infinite = (x: number) => x === Infinity || x === -Infinity;
  if ((infinite(a.real) || infinite(a.imag)) && Number.isFinite(b.real) && Number.isFinite(b.imag)) {
    const [x, y] = [copysign(infinite(a.real) ? 1 : 0, a.real), copysign(infinite(a.imag) ? 1 : 0, a.imag)];
    return new Complex(Infinity * (x * b.real + y * b.imag), Infinity * (y * b.real - x * b.imag));
  }
  if ((infinite(absReal) || infinite(absImag)) && Number.isFinite(a.real) && Number.isFinite(a.imag)) {
    const [x, y] = [copysign(infinite(b.real) ? 1 : 0, b.real), copysign(infinite(b.imag) ? 1 : 0, b.imag)];
    return new Complex(0 * (a.real * x + a.imag * y), 0 * (a.imag * x - a.real * y));
  }
  return r;
}

function quotient(a: Complex, b: Complex): Complex {
  const r = quotientOrZero(a, b);
  if (r === null) throw new ZeroDivisionError("division by zero");
  return r;
}

/** CPython's `_Py_rc_quot`: a real divided by a complex number. */
function realQuotient(a: number, b: Complex): Complex {
  const [absReal, absImag] = [Math.abs(b.real), Math.abs(b.imag)];
  if (absReal >= absImag) {
    if (absReal === 0) throw new ZeroDivisionError("division by zero");
    const ratio = b.imag / b.real;
    const denominator = b.real + b.imag * ratio;
    return new Complex(a / denominator, (-a * ratio) / denominator);
  }
  if (absImag >= absReal) {
    const ratio = b.real / b.imag;
    const denominator = b.real * ratio + b.imag;
    return new Complex((a * ratio) / denominator, -a / denominator);
  }
  return new Complex(NaN, NaN);
}

/** A complex power, as CPython computes it: by an integer exponent of at most 100, by multiplication (`c_powi`); else
 * by `_Py_c_pow`, which needs the platform's transcendental functions but where its base or its exponent is zero, and
 * so stays in the residual. */
function power(a: Complex, b: Complex): Complex {
  let r: Complex | null;
  if (b.imag === 0 && b.real === Math.floor(b.real) && Math.abs(b.real) <= 100) {
    const n = Math.abs(b.real);
    let [result, p, mask] = [new Complex(1, 0), a, 1];
    while (mask > 0 && n >= mask) {
      if ((n & mask) !== 0) result = product(result, p);
      mask <<= 1;
      p = product(p, p);
    }
    r = b.real > 0 ? result : quotientOrZero(new Complex(1, 0), result);
  } else if (b.real === 0 && b.imag === 0) r = new Complex(1, 0);
  else if (a.real === 0 && a.imag === 0) r = b.imag !== 0 || b.real < 0 ? null : new Complex(0, 0);
  else throw refuse("binop '**' of a complex power");
  if (r === null) throw new ZeroDivisionError("zero to a negative or complex power");
  if (!Number.isFinite(r.real) && !Number.isNaN(r.real) || !Number.isFinite(r.imag) && !Number.isNaN(r.imag)) {
    throw new OverflowError("complex exponentiation");
  }
  return r;
}

/** Python's arithmetic of complex numbers, mixed with reals as CPython 3.14 mixes them (a real is not made complex). */
function complexArithmetic(operator: string, a: unknown, b: unknown): Complex {
  if (!(a instanceof Complex || isNumeric(a)) || !(b instanceof Complex || isNumeric(b)) || ["//", "%"].includes(operator)) {
    throw unsupported(operator, a, b);
  }
  const x = a instanceof Complex ? a : real(a as Integral | number);
  const y = b instanceof Complex ? b : real(b as Integral | number);
  const both = (v: Complex | number): Complex => (v instanceof Complex ? v : new Complex(v, 0));
  switch (operator) {
    case "+":
      if (typeof x === "number") return new Complex(x + (y as Complex).real, (y as Complex).imag);
      return typeof y === "number" ? new Complex(x.real + y, x.imag) : new Complex(x.real + y.real, x.imag + y.imag);
    case "-":
      if (typeof x === "number") return new Complex(x - (y as Complex).real, -(y as Complex).imag);
      return typeof y === "number" ? new Complex(x.real - y, x.imag) : new Complex(x.real - y.real, x.imag - y.imag);
    case "*":
      if (typeof x === "number") return new Complex(x * (y as Complex).real, x * (y as Complex).imag);
      return typeof y === "number" ? new Complex(x.real * y, x.imag * y) : product(x, y);
    case "/":
      if (typeof x === "number") return realQuotient(x, y as Complex);
      if (typeof y === "number") {
        if (y === 0) throw new ZeroDivisionError("division by zero");
        return new Complex(x.real / y, x.imag / y);
      }
      return quotient(x, y);
    default:
      return power(both(x), both(y));
  }
}

/** `sqrt(x * x + y * y)`, correctly rounded, so that both implementations give the same bits: the sum of squares
 * exactly, its integer square root carrying a sticky bit, rounded once. */
function hypot(x: number, y: number): number {
  [x, y] = [Math.abs(x), Math.abs(y)];
  if (x === Infinity || y === Infinity) return Infinity;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === 0 || y === 0) return x + y;
  const [[mx, ex], [my, ey]] = [bits(x), bits(y)];
  const low = Math.min(ex, ey);
  const total = (mx << BigInt(ex - low)) ** 2n + (my << BigInt(ey - low)) ** 2n;
  let shift = Math.max(0, 140 - total.toString(2).length);
  shift += shift % 2;
  const scaled = total << BigInt(shift);
  let root = isqrt(scaled);
  root = (root << 1n) | (root * root !== scaled ? 1n : 0n); // a sticky bit below the rounding position
  const result = Number(root) * 2 ** (low - shift / 2 - 1);
  if (!Number.isFinite(result)) throw new OverflowError("absolute value too large");
  return result;
}

/** A positive finite float as `m * 2 ** e`, `m` an int. */
function bits(x: number): [bigint, number] {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const high = view.getUint32(0);
  const exponent = (high >>> 20) & 0x7ff;
  const mantissa = (BigInt(high & 0xfffff) << 32n) | BigInt(view.getUint32(4));
  return exponent === 0 ? [mantissa, -1074] : [mantissa | (1n << 52n), exponent - 1075];
}

function isqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

/** Python's arithmetic operators. */
function arithmetic(operator: string, a: unknown, b: unknown): unknown {
  if (a instanceof Complex || b instanceof Complex) return complexArithmetic(operator, a, b);
  if (operator === "+" && isSequence(a)) return joined(a, b);
  if (operator === "*" && isSequence(a)) return repeat(a, b);
  if (operator === "*" && isSequence(b) && isIntegral(a)) return repeat(b, a);
  if (!isNumeric(a) || !isNumeric(b)) throw unsupported(operator, a, b);
  const integral = isIntegral(a) && isIntegral(b);
  if (["/", "//", "%"].includes(operator) && zero(b)) throw new ZeroDivisionError("division by zero");
  if (integral) {
    const [x, y] = [int(a as Integral), int(b as Integral)];
    switch (operator) {
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": return Number(x) / Number(y);
      case "//": return floorDivide(x, y);
      case "%": return x - floorDivide(x, y) * y;
      default: return y < 0n ? Number(x) ** Number(y) : x ** y;
    }
  }
  const [x, y] = [float(a), float(b)];
  switch (operator) {
    case "+": return x + y;
    case "-": return x - y;
    case "*": return x * y;
    case "/": return x / y;
    case "//": return Math.floor(x / y);
    case "%": {
      const remainder = x % y;
      return remainder !== 0 && (remainder < 0) !== (y < 0) ? remainder + y : remainder;
    }
    default:
      if (x === 0 && y < 0) throw new ZeroDivisionError("zero to a negative power");
      if (x < 0 && y !== Math.floor(y) && Number.isFinite(y)) throw refuse("binop '**' of a complex power"); // its value is complex
      return x ** y;
  }
}

/** Python's bitwise operators, on ints and bools (`&`, `|` and `^` of two bools give a bool), on sets, and `|` on
 * dicts. */
function bitwise(operator: string, a: unknown, b: unknown): unknown {
  if (a instanceof Set && b instanceof Set && ["&", "|", "^"].includes(operator)) {
    if (operator === "&") return new Set([...a].filter((item) => contains(b, item)));
    if (operator === "|") return set([...a, ...b]);
    return set([...[...a].filter((item) => !contains(b, item)), ...[...b].filter((item) => !contains(a, item))]);
  }
  if (operator === "|" && isDict(a) && isDict(b)) return dictOf([...entries(a), ...entries(b)]);
  if (!isIntegral(a) || !isIntegral(b)) throw unsupported(operator, a, b);
  if (typeof a === "boolean" && typeof b === "boolean" && ["&", "|", "^"].includes(operator)) {
    return operator === "&" ? a && b : operator === "|" ? a || b : a !== b;
  }
  const [x, y] = [int(a), int(b)];
  if ((operator === "<<" || operator === ">>") && y < 0n) throw new ValueError("negative shift count");
  switch (operator) {
    case "&": return x & y;
    case "|": return x | y;
    case "^": return x ^ y;
    case "<<": return x << y;
    default: return x >> y;
  }
}

/** Python's `a - b`: numbers', or sets'. */
function subtract(a: unknown, b: unknown): unknown {
  if (a instanceof Set && b instanceof Set) return new Set([...a].filter((item) => !contains(b, item)));
  return arithmetic("-", a, b);
}

function invert(value: unknown): bigint {
  if (isIntegral(value)) return ~int(value);
  throw new TypeError(`bad operand type for unary ~: ${repr(typeName(value))}`);
}

function negate(operator: string, value: unknown): unknown {
  if (isIntegral(value)) return operator === "-" ? -int(value) : int(value);
  if (typeof value === "number") return operator === "-" ? -value : value;
  if (value instanceof Complex) return operator === "-" ? new Complex(-value.real, -value.imag) : value;
  throw new TypeError(`bad operand type for unary ${operator}: ${repr(typeName(value))}`);
}

// --- Builtins ---

function abs(value: unknown): unknown {
  if (isIntegral(value)) return int(value) < 0n ? -int(value) : int(value);
  if (typeof value === "number") return Math.abs(value);
  if (value instanceof Complex) return hypot(value.real, value.imag);
  throw new TypeError(`bad operand type for abs(): ${repr(typeName(value))}`);
}

function toFloat(value: unknown): number {
  if (isNumeric(value)) return float(value);
  if (typeof value !== "string") {
    throw new TypeError(`float() argument must be a string or a real number, not ${repr(typeName(value))}`);
  }
  const text = value.trim().toLowerCase();
  if (/^[+-]?(\d+\.?\d*(e[+-]?\d+)?|\.\d+(e[+-]?\d+)?|inf|infinity|nan)$/.test(text)) {
    return text.endsWith("nan") ? NaN : text.endsWith("inf") || text.endsWith("infinity")
      ? (text.startsWith("-") ? -Infinity : Infinity) : Number(text);
  }
  throw new ValueError(`could not convert string to float: ${repr(value)}`);
}

function toInt(value: unknown): bigint {
  if (isIntegral(value)) return int(value);
  if (typeof value === "number") {
    if (Number.isNaN(value)) throw new ValueError("cannot convert float NaN to integer");
    if (!Number.isFinite(value)) throw new OverflowError("cannot convert float infinity to integer");
    return BigInt(Math.trunc(value));
  }
  if (typeof value !== "string") {
    throw new TypeError(`int() argument must be a string, a bytes-like object or a real number, not ${repr(typeName(value))}`);
  }
  if (/^\s*[+-]?\d+\s*$/.test(value)) return BigInt(value.trim());
  throw new ValueError(`invalid literal for int() with base 10: ${repr(value)}`);
}

function len(value: unknown): bigint {
  if (typeof value === "string") return BigInt([...value].length);
  if (value instanceof Uint8Array || Array.isArray(value)) return BigInt(value.length);
  if (value instanceof Tuple) return BigInt(value.items.length);
  if (value instanceof Set) return BigInt(value.size);
  if (isDict(value)) return BigInt(entries(value).length);
  throw new TypeError(`object of type ${repr(typeName(value))} has no len()`);
}

const NO_DEFAULT = Symbol("no default");

/** Python's `min` and `max`: of their arguments, or of the items of their one argument, by `key`, else `default`. */
function extreme(name: string, operator: string): (...values: unknown[]) => unknown {
  const pick = (values: unknown[], keywords: ReadonlyMap<string, unknown>): unknown => {
    const key = keywords.get("key") ?? null;
    const fallback = keywords.has("default") ? keywords.get("default") : NO_DEFAULT;
    if (values.length === 0) throw new TypeError(`${name} expected at least 1 argument, got 0`);
    if (values.length > 1 && fallback !== NO_DEFAULT) {
      throw new TypeError(`Cannot specify a default for ${name}() with multiple positional arguments`);
    }
    const candidates = values.length === 1 ? [...iterate(values[0])] : values;
    if (candidates.length === 0) {
      if (fallback !== NO_DEFAULT) return fallback;
      throw new ValueError(`${name}() iterable argument is empty`);
    }
    const keyed = (value: unknown): unknown => (key === null ? value : (key as (v: unknown) => unknown)(value));
    let [best, bestKey] = [candidates[0], keyed(candidates[0])];
    for (const value of candidates.slice(1)) {
      const valueKey = keyed(value);
      if (ordered(operator, valueKey, bestKey)) [best, bestKey] = [value, valueKey];
    }
    return best;
  };
  const fn = (...values: unknown[]) => pick(values, new Map());
  Object.defineProperty(fn, "name", { value: name });
  return Object.assign(fn, { [KWARGS]: pick });
}

function all(value: unknown): boolean {
  for (const item of iterate(value)) if (!truthy(item)) return false;
  return true;
}

function any(value: unknown): boolean {
  for (const item of iterate(value)) if (truthy(item)) return true;
  return false;
}

const LONG = 1n << 63n;
const isLong = (value: bigint) => -LONG <= value && value < LONG;

/** Neumaier's compensated sum, as CPython's `sum` keeps it for floats: the sum so far and its compensation. */
function compensated(total: [number, number], x: number): [number, number] {
  const [f, c] = total;
  const t = f + x;
  return [t, c + (Math.abs(f) >= Math.abs(x) ? (f - t) + x : (x - t) + f)];
}

function finished([f, c]: [number, number]): number {
  return c !== 0 && Number.isFinite(c) ? f + c : f;
}

/** Python's `sum(iterable, start)`, as CPython computes it: ints exactly while they fit a C long, then floats, and
 * ints as floats, with compensation, and anything else by `+`. */
function sumOf(iterable: unknown, start: unknown = 0n): unknown {
  if (typeof start === "string") throw new TypeError("sum() can't sum strings [use ''.join(seq) instead]");
  if (start instanceof Uint8Array) throw new TypeError("sum() can't sum bytes [use b''.join(seq) instead]");
  const items = iterate(iterable)[Symbol.iterator]();
  let result = start;
  let next = items.next();
  if (typeof result === "bigint" && isLong(result)) { // ints and bools, while the total fits
    let total: bigint = result;
    for (; !next.done; next = items.next()) {
      const item = next.value;
      if (!isIntegral(item) || !isLong(int(item)) || !isLong(total + int(item))) break;
      total += int(item);
    }
    result = next.done ? total : arithmetic("+", total, next.value);
    if (!next.done) next = items.next();
  }
  if (typeof result === "number") { // floats, and ints that fit, compensated
    let total: [number, number] = [result, 0];
    for (; !next.done; next = items.next()) {
      const item = next.value;
      if (typeof item === "number") total = compensated(total, item);
      else if (isIntegral(item)) total = compensated(total, intToFloat(item));
      else break;
    }
    result = finished(total);
    if (!next.done) {
      result = arithmetic("+", result, next.value);
      next = items.next();
    }
  }
  for (; !next.done; next = items.next()) result = arithmetic("+", result, next.value);
  return result;
}

const sum = Object.assign((iterable: unknown, start: unknown = 0n) => sumOf(iterable, start), {
  [KWARGS]: (values: unknown[], keywords: ReadonlyMap<string, unknown>) =>
    sumOf(values[0], keywords.has("start") ? keywords.get("start") : values.length > 1 ? values[1] : 0n),
});
Object.defineProperty(sum, "name", { value: "sum" });

/** Python's set of items: its distinct items, the first of equal ones. */
function set(items: Iterable<unknown>): Set<unknown> {
  const distinct: unknown[] = [];
  for (const item of items) {
    hashable(item, "a set element");
    if (!distinct.some((other) => equals(other, item))) distinct.push(item);
  }
  return new Set(distinct);
}

/** Python's dict of items: a later equal key's value replacing an earlier's, the earlier key kept. */
function dictOf(items: Iterable<[unknown, unknown]>): Map<unknown, unknown> {
  const result = new Map<unknown, unknown>();
  for (const [key, value] of items) {
    hashable(key, "a dict key");
    const found = [...result.keys()].find((other) => equals(other, key));
    result.set(found === undefined ? key : found, value);
  }
  return result;
}

/** Python's `item in container`. */
function contains(container: unknown, item: unknown): boolean {
  if (typeof container === "string") {
    if (typeof item !== "string") throw new TypeError(`'in <string>' requires string as left operand, not ${typeName(item)}`);
    return container.includes(item);
  }
  if (container instanceof Uint8Array) {
    if (isIntegral(item)) {
      const byte = int(item);
      if (byte < 0n || byte > 255n) throw new ValueError("byte must be in range(0, 256)");
      return container.includes(Number(byte));
    }
    if (!(item instanceof Uint8Array)) throw new TypeError(`a bytes-like object is required, not ${repr(typeName(item))}`);
    return Array.from({ length: container.length - item.length + 1 }, (_, i) => i)
      .some((i) => compareBytes(container.subarray(i, i + item.length), item) === 0);
  }
  if (isDict(container)) {
    hashable(item, "a dict key");
    return [...iterate(container)].some((key) => equals(key, item));
  }
  if (container instanceof Set && !(item instanceof Set)) hashable(item, "a set element"); // a set: as a frozenset
  if (Array.isArray(container) || container instanceof Tuple || container instanceof Set || container instanceof PyGenerator) {
    for (const other of iterate(container)) if (equals(other, item)) return true;
    return false;
  }
  throw new TypeError(`argument of type ${repr(typeName(container))} is not a container or iterable`);
}

const SEQUENCES: Record<string, [string, string]> = { // a sequence's message for a non-int index, for an index out of range
  list: ["list indices must be integers or slices, not ", "list index out of range"],
  tuple: ["tuple indices must be integers or slices, not ", "tuple index out of range"],
  str: ["string indices must be integers, not ", "string index out of range"],
  bytes: ["byte indices must be integers or slices, not ", "index out of range"],
};

/** A slice's indices of a sequence of `size` items, as Python's `slice.indices` and `PySlice_AdjustIndices` give them. */
function sliced(slice: Slice, size: number): number[] {
  for (const part of [slice.start, slice.stop, slice.step]) {
    if (part !== null && !isIntegral(part)) {
      throw new TypeError("slice indices must be integers or None or have an __index__ method");
    }
  }
  const step = slice.step === null ? 1n : int(slice.step as Integral);
  if (step === 0n) throw new ValueError("slice step cannot be zero");
  const length = BigInt(size);
  const adjust = (part: unknown, none: bigint): bigint => {
    if (part === null) return none;
    let index = int(part as Integral);
    if (index < 0n) {
      index += length;
      if (index < 0n) index = step < 0n ? -1n : 0n;
    } else if (index >= length) index = step < 0n ? length - 1n : length;
    return index;
  };
  const start = adjust(slice.start, step < 0n ? length - 1n : 0n);
  const stop = adjust(slice.stop, step < 0n ? -1n : length);
  const found: number[] = [];
  for (let i = start; step > 0n ? i < stop : i > stop; i += step) found.push(Number(i));
  return found;
}

/** Python's `value[key]`: an item of a sequence, from the end for a negative index, a slice of it, or a dict's
 * value. */
function index(value: unknown, key: unknown): unknown {
  if (isSequence(value)) {
    const what = typeName(value);
    const items: unknown[] = typeof value === "string" ? [...value] : value instanceof Uint8Array ? [...value].map(BigInt)
      : [...itemsOf(value)];
    if (key instanceof Slice && what !== "str") {
      const picked = sliced(key, items.length).map((i) => items[i]);
      if (value instanceof Uint8Array) return new Uint8Array(picked.map(Number));
      return value instanceof Tuple ? new Tuple(picked) : picked;
    }
    if (key instanceof Slice) return sliced(key, items.length).map((i) => items[i]).join("");
    const [invalid, outside] = SEQUENCES[what] as [string, string];
    if (!isIntegral(key)) throw new TypeError(invalid + (what === "str" ? repr(typeName(key)) : typeName(key)));
    let position = int(key);
    if (!isLong(position)) throw new IndexError("cannot fit 'int' into an index-sized integer");
    if (position < 0n) position += BigInt(items.length);
    if (position < 0n || position >= BigInt(items.length)) throw new IndexError(outside);
    return items[Number(position)];
  }
  if (isDict(value)) {
    hashable(key, "a dict key");
    const found = [...iterate(value)].find((other) => equals(other, key));
    if (found === undefined) throw new KeyError(repr(key));
    return value instanceof Map ? value.get(found) : value[found as string];
  }
  throw new TypeError(`${repr(typeName(value))} object is not subscriptable`);
}

/** Python's `round(value)`: to the nearest int, halves to even. */
function round(value: unknown): unknown {
  if (isIntegral(value)) return int(value);
  if (typeof value !== "number") throw new TypeError(`type ${typeName(value)} doesn't define __round__ method`);
  const floor = Math.floor(value);
  const difference = value - floor;
  const rounded = difference > 0.5 || (difference === 0.5 && floor % 2 !== 0) ? floor + 1 : floor;
  return toInt(rounded);
}

/** Python's `str(value)`. */
function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return pyFloat(value);
  return repr(value);
}

function hasattr(value: unknown, name: unknown): boolean {
  try {
    attribute(value, name);
  } catch {
    return false; // attribute throws only AttributeError
  }
  return true;
}

/** The builtins a scope provides by default, one per name of `Expressions.BUILTINS`. */
export const BUILTINS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["abs", abs], ["bool", truthy], ["float", toFloat], ["getattr", attribute], ["hasattr", hasattr], ["int", toInt],
  ["len", len], ["max", extreme("max", ">")], ["min", extreme("min", "<")], ["round", round], ["str", str],
  ["all", all], ["any", any], ["set", (...values: unknown[]) => set(values.length === 0 ? [] : iterate(values[0]))],
  ["sum", sum],
]);

/** The keyword arguments each builtin of `BUILTINS` takes, as Python's own take them; the others take none. */
const KEYWORDS: Record<string, readonly string[]> = { max: ["key", "default"], min: ["key", "default"], sum: ["start"] };

// --- The scope ---

function modulesOf(module: Module): Module[] {
  return [module, ...[...module.members.values()].filter((m): m is Module => m instanceof Module).flatMap(modulesOf)];
}

/** Python's scope for an expression: `variables`, the `modules` imports may bring in, and `builtins`. */
export class Scope extends S.Variables {
  readonly modules: ReadonlyMap<string, Module>;
  readonly builtins: ReadonlyMap<string, unknown>;

  constructor(variables: S.Bindings = {}, options: { modules?: Record<string, Module>; builtins?: Record<string, unknown> } = {}) {
    super(variables);
    this.modules = new Map(Object.entries(options.modules ?? {}));
    this.builtins = options.builtins === undefined ? BUILTINS : new Map(Object.entries(options.builtins));
  }

  override lookup(reference: any): unknown {
    const name = Terms.nameOf(reference) as string;
    if (this.find(name)[0] || !this.builtins.has(name)) return this.value(name);
    return this.builtins.get(name);
  }

  /** The module `name`, if allowed: one of `modules`, or a submodule reached through its members. */
  module(name: string): Module {
    const [root, ...parts] = name.split(".") as [string, ...string[]];
    let module = this.modules.get(root);
    if (module === undefined) throw new S.Unbound(name);
    for (const part of parts) {
      const member: unknown = part.startsWith("_") ? undefined : module.members.get(part);
      if (!(member instanceof Module)) throw new S.Unbound(name);
      module = member;
    }
    return module;
  }

  override enter(declaration: any): Scope {
    const [tag, record] = Terms.kindOf(declaration);
    const attributes = Terms.attributesOf(record);
    const [moduleName, alias] = [attributes.get("module") as string, attributes.get("alias") as string | undefined];
    if (tag === Expressions.IMPORT) {
      if (alias) return this.bind(alias, this.module(moduleName));
      const root = moduleName.split(".")[0] as string;
      this.module(moduleName); // the whole path must be allowed
      return this.bind(root, this.modules.get(root));
    }
    const [module, name] = [this.module(moduleName), attributes.get("name") as string];
    if (name.startsWith("_") || !module.members.has(name)) {
      throw new S.Unbound(`${moduleName}.${name}`);
    }
    return this.bind(alias || name, module.members.get(name));
  }

  /** Whether an expression may call `fn`: a builtin, a variable, a module's, or a closure it made. */
  allows(fn: unknown): boolean {
    if (CLOSURES.has(fn as object) || [...this.builtins.values()].includes(fn)) return true;
    if ([...(this.values[this.values.length - 1] as Map<string, unknown>).values()].includes(fn)) return true; // the variables
    return [...this.modules.values()].flatMap(modulesOf).some((module) => [...module.members.values()].includes(fn));
  }
}

function refuse(what: string): Error {
  return new F.NoRule("Python3", what);
}

/** A term's attributes. */
function attributesOf(node: any): Map<string, any> {
  return Terms.attributesOf(Terms.kindOf(node)[1]);
}

/** A term's arguments, null where empty. */
function argumentsOf(node: any): any[] {
  return Terms.argumentsOf(Terms.kindOf(node)[1]);
}

/** The values of arguments, each `*value` spread into its items. */
function spread(args: F.Thunk[], what = "Value"): unknown[] {
  const items: unknown[] = [];
  for (const argument of args) {
    const value = argument();
    if (value instanceof Unpacked) items.push(...iterable(value.value, `${what} after * must be an iterable, not ${typeName(value.value)}`));
    else items.push(value);
  }
  return items;
}

/** The items of a mapping, in order, or a TypeError with `message`. */
function mapping(value: unknown, message: string): [unknown, unknown][] {
  if (!isDict(value)) throw new TypeError(message);
  return entries(value);
}

// --- Calls ---

function nameOf(fn: unknown): string {
  return typeof fn === "function" ? fn.name || "<lambda>" : typeName(fn);
}

/** A call: its function, then its positional arguments (`*` spreading an iterable) and its keywords (`**` spreading a
 * mapping), as Python binds them; a builtin takes the keywords Python's takes, and another JavaScript function none. */
function call(args: F.Thunk[], node: unknown, scope: Scope): unknown {
  const keywords = (attributesOf(node).get("keywords") ?? []) as Terms.Part[];
  const fn = (args[0] as F.Thunk)();
  if (typeof fn !== "function" || !scope.allows(fn)) throw new TypeError(`calling ${repr(nameOf(fn))} is not allowed by the scope`);
  const name = `${nameOf(fn)}()`;
  const split = args.length - keywords.length; // each keyword's value, the last arguments
  const positional = spread(args.slice(1, split), `${name} argument`);
  const kwargs = new Map<string, unknown>();
  keywords.forEach((part, i) => {
    const [value, key] = [(args[split + i] as F.Thunk)(), part.attributes.get("arg") as string | undefined];
    const items = key !== undefined ? [[key, value] as [unknown, unknown]]
      : mapping(value, `${name} argument after ** must be a mapping, not ${typeName(value)}`);
    for (const [k, item] of items) {
      if (typeof k !== "string") throw new TypeError("keywords must be strings");
      if (kwargs.has(k)) throw new TypeError(`${name} got multiple values for keyword argument '${k}'`);
      kwargs.set(k, item);
    }
  });
  const builtin = [...BUILTINS.entries()].find(([, value]) => value === fn)?.[0];
  if (builtin !== undefined && kwargs.size > 0) {
    const allowed = KEYWORDS[builtin] ?? [];
    if (allowed.length === 0) throw new TypeError(`${builtin}() takes no keyword arguments`);
    for (const key of kwargs.keys()) {
      if (!allowed.includes(key)) throw new TypeError(`${builtin}() got an unexpected keyword argument '${key}'`);
    }
  }
  const withKeywords = (fn as any)[KWARGS] as ((values: unknown[], keywords: ReadonlyMap<string, unknown>) => unknown) | undefined;
  if (withKeywords !== undefined) return withKeywords(positional, kwargs);
  if (kwargs.size > 0) throw new TypeError(`${name} takes no keyword arguments`);
  return (fn as (...a: unknown[]) => unknown)(...positional);
}

interface Parameters {
  posonlyargs: string[];
  args: string[];
  kwonlyargs: string[];
  vararg: string | null;
  kwarg: string | null;
}

/** CPython's message for a call given more positional arguments than its parameters take. */
function tooMany(name: string, positional: string[], defaults: ReadonlyMap<string, unknown>, given: number,
  keywordOnly: number): string {
  const least = positional.filter((parameter) => !defaults.has(parameter)).length;
  const takes = least < positional.length ? `from ${least} to ${positional.length} positional arguments`
    : `${positional.length} positional argument${positional.length === 1 ? "" : "s"}`;
  if (keywordOnly > 0) {
    return `${name} takes ${takes} but ${given} positional argument${given === 1 ? "" : "s"} (and ${keywordOnly} keyword-only `
      + `argument${keywordOnly === 1 ? "" : "s"}) were given`;
  }
  return `${name} takes ${takes} but ${given} ${given === 1 ? "was" : "were"} given`;
}

/** `'a'`, `'a' and 'b'`, `'a', 'b', and 'c'`, as CPython lists missing arguments. */
function listing(names: string[]): string {
  const quoted = names.map((name) => `'${name}'`);
  if (quoted.length < 3) return quoted.join(" and ");
  return `${quoted.slice(0, -1).join(", ")}, and ${quoted[quoted.length - 1]}`;
}

/** `scope` with a lambda's parameters bound to `args` and `kwargs`, as Python binds them, with CPython's messages. */
function bindParameters(p: Parameters, defaults: ReadonlyMap<string, unknown>, args: unknown[],
  kwargs: ReadonlyMap<string, unknown>, scope: Scope): Scope {
  const name = "<lambda>()";
  const positional = [...p.posonlyargs, ...p.args];
  const bound = new Map<string, unknown>(positional.slice(0, args.length).map((parameter, i) => [parameter, args[i]]));
  const extra = new Map<unknown, unknown>();
  const misplaced: string[] = [];
  for (const [key, value] of kwargs) {
    if (p.posonlyargs.includes(key) && p.kwarg === null) misplaced.push(key);
    else if (p.posonlyargs.includes(key) || ![...p.args, ...p.kwonlyargs].includes(key)) {
      if (p.kwarg === null) throw new TypeError(`${name} got an unexpected keyword argument '${key}'`);
      extra.set(key, value);
    } else if (bound.has(key)) throw new TypeError(`${name} got multiple values for argument '${key}'`);
    else bound.set(key, value);
  }
  if (misplaced.length > 0) {
    throw new TypeError(`${name} got some positional-only arguments passed as keyword arguments: '${misplaced.join(", ")}'`);
  }
  if (args.length > positional.length && p.vararg === null) {
    const keywordOnly = [...kwargs.keys()].filter((key) => p.kwonlyargs.includes(key)).length;
    throw new TypeError(tooMany(name, positional, defaults, args.length, keywordOnly));
  }
  for (const [group, what] of [[positional, "positional"], [p.kwonlyargs, "keyword-only"]] as [string[], string][]) {
    for (const parameter of group) if (!bound.has(parameter) && defaults.has(parameter)) bound.set(parameter, defaults.get(parameter));
    const missing = group.filter((parameter) => !bound.has(parameter));
    if (missing.length > 0) {
      throw new TypeError(`${name} missing ${missing.length} required ${what} argument${missing.length > 1 ? "s" : ""}: ${listing(missing)}`);
    }
  }
  if (p.vararg !== null) bound.set(p.vararg, new Tuple(args.slice(positional.length)));
  if (p.kwarg !== null) bound.set(p.kwarg, extra);
  let inner = scope;
  for (const parameter of [...positional, ...p.kwonlyargs, p.vararg, p.kwarg]) {
    if (parameter !== null) inner = inner.bind(parameter, bound.get(parameter)) as Scope;
  }
  return inner;
}

/** A closure: its parameters, their defaults evaluated now, its body and the scope it is made in; a function, which
 * takes keywords. */
function lambda(args: F.Thunk[], node: any, scope: Scope): unknown {
  const groups = attributesOf(node).get("args") as Terms.Part | undefined;
  const held = groups === undefined ? new Map<string, unknown>() : groups.attributes;
  const many = (group: string) => ((held.get(group) ?? []) as Terms.Part[]);
  const one = (group: string) => (held.get(group) as Terms.Part | undefined);
  const parameters: Parameters = {
    posonlyargs: many("posonlyargs").map((part) => part.attributes.get("arg") as string),
    args: many("args").map((part) => part.attributes.get("arg") as string),
    kwonlyargs: many("kwonlyargs").map((part) => part.attributes.get("arg") as string),
    vararg: (one("vararg")?.attributes.get("arg") ?? null) as string | null,
    kwarg: (one("kwarg")?.attributes.get("arg") ?? null) as string | null,
  };
  const ordered = [...many("posonlyargs"), ...many("args"), ...(one("vararg") === undefined ? [] : [one("vararg") as Terms.Part]),
    ...many("kwonlyargs"), ...(one("kwarg") === undefined ? [] : [one("kwarg") as Terms.Part])];
  const terms = argumentsOf(node); // Let's empty value, its body, then each parameter's annotation and default
  const defaults = new Map<string, unknown>();
  ordered.forEach((part, i) => {
    if (terms[3 + 2 * i] !== null) defaults.set(part.attributes.get("arg") as string, (args[3 + 2 * i] as F.Thunk)());
  });
  const body = terms[1];
  const withKeywords = (values: unknown[], keywords: ReadonlyMap<string, unknown>) =>
    RULES.evaluate(body, bindParameters(parameters, defaults, values, keywords, scope));
  const fn = (...values: unknown[]) => withKeywords(values, new Map());
  Object.defineProperty(fn, "name", { value: "<lambda>" });
  CLOSURES.add(fn);
  return Object.assign(fn, { [KWARGS]: withKeywords });
}

// --- Comprehensions and targets ---

type Target = any | [Terms.Part, readonly any[]];

/** A target's kind, its attributes and its terms: a `Terms.Part` and its terms, or a term. */
function target(t: Target): [string, ReadonlyMap<string, unknown>, readonly any[]] {
  if (Array.isArray(t)) return [t[0].kind, t[0].attributes, t[1]];
  return [Terms.kindOf(t)[0], attributesOf(t), argumentsOf(t)];
}

/** Throws `NoRule` for a target no value binds: one that writes into data, invalid syntax, a starred target alone or
 * two in one sequence. */
function check(t: Target, starred = false): void {
  const [tag, , terms] = target(t);
  if (tag === Expressions.PARENTHESIZED || (tag === Expressions.STARRED && starred)) check(terms[0]);
  else if (tag === Expressions.TUPLE || tag === Expressions.LIST) {
    if (terms.filter((term) => Terms.kindOf(term)[0] === Expressions.STARRED).length > 1) throw refuse("starred target");
    for (const term of terms) check(term, true);
  } else if (tag !== Expressions.NAME) throw refuse(Terms.INVALID_KINDS.has(tag) ? tag : `${tag} target`); // a write into data, a lone starred, or invalid syntax
}

/** `scope` with a target (`check`ed) bound to `value`: a name, or a tuple or a list of targets unpacking it, one of
 * them `*starred`, as Python assigns. */
function bind(t: Target, value: unknown, scope: Scope): Scope {
  const [tag, attributes, held] = target(t);
  if (tag === Expressions.NAME) return scope.bind(attributes.get("name") as string, value) as Scope;
  if (tag === Expressions.PARENTHESIZED) return bind(held[0], value, scope);
  let terms = [...held];
  const star = terms.findIndex((term) => Terms.kindOf(term)[0] === Expressions.STARRED);
  const items = iterable(value, `cannot unpack non-iterable ${typeName(value)} object`);
  let values = items;
  if (star >= 0) {
    const least = terms.length - 1;
    if (items.length < least) throw new ValueError(`not enough values to unpack (expected at least ${least}, got ${items.length})`);
    const after = items.length - (terms.length - star - 1);
    values = [...items.slice(0, star), items.slice(star, after), ...items.slice(after)];
    terms = [...terms.slice(0, star), argumentsOf(terms[star])[0], ...terms.slice(star + 1)];
  } else if (items.length !== terms.length) {
    const state = items.length < terms.length ? "not enough" : "too many";
    throw new ValueError(`${state} values to unpack (expected ${terms.length}, got ${items.length})`);
  }
  let inner = scope;
  terms.forEach((term, i) => {
    inner = bind(term, values[i], inner);
  });
  return inner;
}

type Clause = [Target, any, readonly any[]];

/** A comprehension's `for` clauses, each its target (a part and its terms), its iterable and its conditions. */
function clauses(node: any): Clause[] {
  const terms = argumentsOf(node);
  const parts = (attributesOf(node).get("generators") ?? []) as Terms.Part[];
  let i = terms.length - parts.reduce((total, part) => total + part.size, 0);
  const found: Clause[] = [];
  for (const part of parts) {
    if (part.attributes.get("is_async")) throw refuse("async comprehension");
    const t = part.attributes.get("target") as Terms.Part | undefined; // a pattern, its terms the clause's last
    if (t === undefined) throw refuse("missing target");
    const end = i + part.size;
    const pattern: Target = [t, terms.slice(end - t.size, end)];
    check(pattern);
    found.push([pattern, terms[i], terms.slice(i + 1, end - t.size)]);
    i = end;
  }
  if (found.length === 0) throw new ValueError(`${Terms.article(Terms.kindOf(node)[0])} needs a for clause`);
  return found;
}

/** The scopes a comprehension's clauses bind, one per item, in order: its first iterable evaluated now in the scope
 * around it, the rest as they are consumed. */
function scopesOf(node: any, scope: Scope): Iterable<Scope> {
  const found = clauses(node);
  const first = iterate(RULES.evaluate((found[0] as Clause)[1], scope));
  function* generate(k: number, inner: Scope, items: Iterable<unknown>): Generator<Scope> {
    const [t, , conditions] = found[k] as Clause;
    for (const item of items) {
      const bound = bind(t, item, inner);
      if (!conditions.every((condition) => truthy(RULES.evaluate(condition, bound)))) continue;
      if (k + 1 === found.length) yield bound;
      else yield* generate(k + 1, bound, iterate(RULES.evaluate((found[k + 1] as Clause)[1], bound)));
    }
  }
  return generate(0, scope, first);
}

/** A comprehension's elements, one per item, a `*element` spread (Python 3.15). */
function elements(node: any, scope: Scope): Iterator<unknown> {
  const body = argumentsOf(node)[1];
  const bounds = scopesOf(node, scope);
  function* generate(): Generator<unknown> {
    for (const bound of bounds) {
      const value = RULES.evaluate(body, bound);
      if (value instanceof Unpacked) yield* iterable(value.value, `Value after * must be an iterable, not ${typeName(value.value)}`);
      else yield value;
    }
  }
  return generate();
}

/** A dict comprehension: its key and its value for each item, or a mapping's items for `**key` (Python 3.15). */
function dictcomp(args: F.Thunk[], node: any, scope: Scope): Map<unknown, unknown> {
  const terms = argumentsOf(node);
  const items: [unknown, unknown][] = [];
  for (const bound of scopesOf(node, scope)) {
    if (terms[1] === null) { // `{**mapping for ...}`, the mapping its key
      const value = RULES.evaluate(terms[2], bound);
      items.push(...mapping(value, `'${typeName(value)}' object is not a mapping`));
    } else {
      const key = RULES.evaluate(terms[2], bound);
      items.push([key, RULES.evaluate(terms[1], bound)]);
    }
  }
  return dictOf(items);
}

// --- Strings ---

const ESCAPES: Record<string, string> = { "\n": "", "\\": "\\", "'": "'", "\"": "\"", a: "\x07", b: "\b", f: "\f", n: "\n",
  r: "\r", t: "\t", v: "\v" };
const HEX: Record<string, number> = { x: 2, u: 4, U: 8 };

/** An f-string's or a t-string's text as written, as Python reads it: `{{` and `}}` one brace each, and, unless it is
 * raw, its escapes; `\N{name}` stays in the residual (its names are Unicode's data). */
function text(spelling: string, raw: boolean): string {
  let out = "";
  let i = 0;
  while (i < spelling.length) {
    const char = spelling[i] as string;
    if ((char === "{" || char === "}") && spelling[i + 1] === char) {
      out += char;
      i += 2;
      continue;
    }
    if (char !== "\\" || raw || i + 1 === spelling.length) {
      out += char;
      i += 1;
      continue;
    }
    const code = spelling[i + 1] as string;
    const digits = /^[0-7]{1,3}/.exec(spelling.slice(i + 1, i + 4));
    const hex = spelling.slice(i + 2, i + 2 + (HEX[code] ?? 0));
    if (code in ESCAPES) {
      out += ESCAPES[code];
      i += 2;
    } else if (digits !== null) {
      out += String.fromCodePoint(parseInt(digits[0], 8));
      i += 1 + digits[0].length;
    } else if (code in HEX && new RegExp(`^[0-9a-fA-F]{${HEX[code]}}$`).test(hex) && parseInt(hex, 16) <= 0x10ffff) {
      out += String.fromCodePoint(parseInt(hex, 16));
      i += 2 + (HEX[code] as number);
    } else if (code === "N") {
      throw refuse("joinedstr's \\N escape");
    } else { // not an escape: kept as written
      out += char;
      i += 1;
    }
  }
  return out;
}

/** Whether Python's `repr` and `str` of a value are its language's, not an implementation's: a basic scalar, a
 * constant, a slice, and lists, tuples and dicts of them; not a set (its order is its hash table's), nor an object, a
 * generator, a module, a function or a template (their addresses). */
function representable(value: unknown): boolean {
  if (Array.isArray(value) || value instanceof Tuple) return itemsOf(value).every(representable);
  if (isDict(value)) return entries(value).every(([key, item]) => representable(key) && representable(item));
  if (value instanceof Slice) return [value.start, value.stop, value.step].every(representable);
  return value === null || value === ELLIPSIS || value instanceof Complex || value instanceof Uint8Array
    || ["boolean", "bigint", "number", "string"].includes(typeof value);
}

/** A field's value converted: `!r` its `repr`, `!s` its `str`, `!a` its `ascii`. */
function converted(value: unknown, conversion: string): string {
  if (!representable(value)) throw refuse(`joinedstr's field of ${typeName(value)}`);
  return conversion === "r" ? repr(value) : conversion === "s" ? str(value) : ascii(value);
}

const SPEC = /^(?:([\s\S])?([<>=^]))?([-+ ])?(z)?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGosxX%])?$/u;
const FLOATS = "eEfFgG%";
/** Whether a format type is a float's. */
const isFloatType = (type: string): boolean => type !== "" && FLOATS.includes(type);

interface Spec {
  fill: string | undefined;
  align: string | undefined;
  sign: string | undefined;
  z: boolean;
  alt: boolean;
  zero: boolean;
  width: number;
  grouping: string | undefined;
  precision: number | undefined;
  type: string;
}

function parse(spec: string): Spec | null {
  const found = SPEC.exec(spec);
  if (found === null) return null;
  const [, fill, align, sign, z, alt, zero, width, grouping, precision, type] = found;
  return { fill, align, sign, z: z !== undefined, alt: alt !== undefined, zero: zero !== undefined,
    width: width === undefined ? 0 : Number(width), grouping, precision: precision === undefined ? undefined : Number(precision),
    type: type ?? "" };
}

/** Whether a format spec is one of `format()`'s mini-language for a str, an int or a bool, or a float, that Python
 * formats without error: where it would raise (a sign for a str, `,` with `x`), or its locale decides (`n`), it stays
 * in the residual. */
function supported(value: unknown, f: Spec): boolean {
  if (typeof value === "string") return ["", "s"].includes(f.type) && !(f.sign || f.z || f.alt || f.grouping) && f.align !== "=";
  if (isFloatType(f.type) || typeof value === "number") return f.type === "" || isFloatType(f.type);
  if (f.type === "c") return !(f.sign || f.alt || f.grouping || f.precision !== undefined || f.z);
  return f.type !== "s" && !(f.precision !== undefined || f.z) && (f.grouping !== "," || ["", "d"].includes(f.type));
}

/** `round(n / d)`, halves to even. */
function divideEven(n: bigint, d: bigint): bigint {
  const [q, r] = [n / d, n % d];
  return 2n * r > d || (2n * r === d && q % 2n === 1n) ? q + 1n : q;
}

/** A finite float's absolute value as a fraction: its numerator and denominator. */
function fraction(x: number): [bigint, bigint] {
  if (x === 0) return [0n, 1n];
  const [m, e] = bits(Math.abs(x));
  return e >= 0 ? [m << BigInt(e), 1n] : [m, 1n << BigInt(-e)];
}

/** `|x|` with `precision` digits after the point, correctly rounded: its digits, the point not written. */
function fixedDigits(x: number, precision: number): string {
  const [n, d] = fraction(x);
  return divideEven(n * 10n ** BigInt(precision), d).toString().padStart(precision + 1, "0");
}

/** `|x|` with `precision + 1` significant digits, correctly rounded: its digits and its decimal exponent. */
function scientificDigits(x: number, precision: number): [string, number] {
  const [n, d] = fraction(x);
  if (n === 0n) return ["0".repeat(precision + 1), 0];
  let exponent = Math.floor(Math.log10(Math.abs(x)));
  const scale = (k: number): [bigint, bigint] => (k >= 0 ? [n * 10n ** BigInt(k), d] : [n, d * 10n ** BigInt(-k)]);
  for (;;) { // 10 ** exponent <= |x| < 10 ** (exponent + 1), exactly
    const [a, b] = scale(-exponent);
    if (a < b) exponent -= 1;
    else if (a >= 10n * b) exponent += 1;
    else break;
  }
  const [a, b] = scale(precision - exponent);
  let digits = divideEven(a, b);
  if (digits === 10n ** BigInt(precision + 1)) {
    exponent += 1;
    digits = 10n ** BigInt(precision);
  }
  return [digits.toString(), exponent];
}

/** A finite float's absolute value as Python's `format` writes it for `type`: its integer digits, and the rest (the
 * point, the fraction, the exponent). */
function floatBody(x: number, type: string, precision: number | undefined, alt: boolean): [string, string] {
  const upper = type === "E" || type === "F" || type === "G";
  const exponentText = (e: number) => `${upper ? "E" : "e"}${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
  const point = (digits: string, places: number): [string, string] => {
    const whole = digits.slice(0, digits.length - places) || "0";
    const rest = places > 0 ? `.${digits.slice(digits.length - places)}` : alt ? "." : "";
    return [whole, rest];
  };
  if (type === "" && precision === undefined) { // repr's shortest digits
    const shown = pyFloat(Math.abs(x));
    const cut = shown.search(/[.e]/);
    return [shown.slice(0, cut), shown.slice(cut)];
  }
  if (type === "f" || type === "F" || type === "%") {
    const places = precision ?? 6;
    return point(fixedDigits(x, places), places);
  }
  if (type === "e" || type === "E") {
    const places = precision ?? 6;
    const [digits, e] = scientificDigits(x, places);
    const [whole, rest] = point(digits, places);
    return [whole, rest + exponentText(e)];
  }
  const significant = Math.max(precision ?? 6, 1); // g, G, and no type with a precision
  const e = scientificDigits(x, significant - 1)[1];
  let whole: string;
  let rest: string;
  const limit = type === "" ? significant - 1 : significant; // no type: room for a digit after the point
  if (-4 <= e && e < limit) [whole, rest] = point(fixedDigits(x, significant - 1 - e), significant - 1 - e);
  else {
    const [digits] = scientificDigits(x, significant - 1);
    [whole, rest] = point(digits, significant - 1);
    rest += exponentText(e);
  }
  if (!alt) {
    const [mantissa, exponent] = rest.includes("e") || rest.includes("E") ? [rest.slice(0, rest.search(/[eE]/)), rest.slice(rest.search(/[eE]/))] : [rest, ""];
    rest = mantissa.replace(/\.?0*$/, "") + exponent;
    if (type === "" && !rest.includes(".") && exponent === "") rest += ".0"; // no type: at least one digit after the point
  }
  return [whole, rest];
}

/** Digits grouped by `separator` every `size`, padded with zeros to `width` where `pad`, never starting with a
 * separator, as CPython inserts them. */
function grouped(digits: string, separator: string | undefined, size: number, width: number, pad: boolean): string {
  const out: string[] = [];
  let count = 0;
  const push = (digit: string) => {
    if (separator !== undefined && count === size) {
      out.push(separator);
      count = 0;
    }
    out.push(digit);
    count += 1;
  };
  for (const digit of [...digits].reverse()) push(digit);
  while (pad && out.length < width) push("0");
  return out.reverse().join("");
}

/** `format(value, spec)`, as Python's mini-language has it for a str, an int, a bool or a float. */
function formatted(value: unknown, spec: string): string {
  if (spec === "") {
    if (!representable(value)) throw refuse(`joinedstr's field of ${typeName(value)}`);
    return str(value);
  }
  if (!(typeof value === "string" || isNumeric(value))) {
    if (value instanceof Complex || !representable(value)) throw refuse(`joinedstr's format of ${typeName(value)}`);
    throw new TypeError(`unsupported format string passed to ${typeName(value)}.__format__`);
  }
  const f = parse(spec);
  if (f === null || !supported(value, f)) throw refuse(`joinedstr's format spec ${repr(spec)} of ${typeName(value)}`);
  const numeric = typeof value !== "string";
  const fill = f.fill ?? (f.zero ? "0" : " ");
  const align = f.align ?? (f.zero && numeric ? "=" : numeric ? ">" : "<");
  let [sign, prefix, whole, rest] = ["", "", "", ""];
  if (typeof value === "string") whole = f.precision === undefined ? value : [...value].slice(0, f.precision).join("");
  else if (f.type === "c") {
    const point = int(value as Integral);
    if (!isLong(point)) throw new OverflowError("Python int too large to convert to C long");
    if (point < 0n || point > 0x10ffffn) throw new OverflowError("%c arg not in range(0x110000)");
    whole = String.fromCodePoint(Number(point));
  } else if (isIntegral(value) && !isFloatType(f.type)) {
    const n = int(value);
    const base = { b: 2, o: 8, x: 16, X: 16 }[f.type] ?? 10;
    whole = (n < 0n ? -n : n).toString(base);
    if (f.type === "X") whole = whole.toUpperCase();
    sign = n < 0n ? "-" : f.sign === "+" ? "+" : f.sign === " " ? " " : "";
    if (f.alt && base !== 10) prefix = `0${f.type}`;
  } else {
    let x = typeof value === "number" ? value : intToFloat(value as Integral);
    if (f.type === "%") x *= 100;
    const negative = x < 0 || Object.is(x, -0);
    if (Number.isFinite(x)) [whole, rest] = floatBody(x, f.type, f.precision, f.alt);
    else whole = Number.isNaN(x) ? "nan" : "inf";
    if (["E", "F", "G"].includes(f.type)) whole = whole.toUpperCase();
    if (f.type === "%") rest += "%";
    const zeroed = negative && f.z && /^[0.]*$/.test(whole + rest.replace(/[eE].*|%/, ""));
    sign = negative && !zeroed && !Number.isNaN(x) ? "-" : f.sign === "+" ? "+" : f.sign === " " ? " " : "";
  }
  const groupSize = ["b", "o", "x", "X"].includes(f.type) ? 4 : 3;
  const isDigits = numeric && f.type !== "c" && /^[0-9a-fA-F]+$/.test(whole);
  if (isDigits) {
    const pad = fill === "0" && align === "=";
    whole = grouped(whole, f.grouping, groupSize, f.width - [...sign + prefix + rest].length, pad);
  }
  const body = whole + rest;
  const length = [...sign + prefix + body].length;
  const padding = Math.max(0, f.width - length);
  if (align === "=") return sign + prefix + fill.repeat(padding) + body;
  if (align === "<") return sign + prefix + body + fill.repeat(padding);
  if (align === ">") return fill.repeat(padding) + sign + prefix + body;
  return fill.repeat(Math.floor(padding / 2)) + sign + prefix + body + fill.repeat(padding - Math.floor(padding / 2));
}

/** A replacement field's text (an f-string's) or its interpolation (a t-string's): its value, then its format spec's
 * own fields. */
function field(part: Terms.Part, thunks: Iterator<F.Thunk>, raw: boolean, template: boolean): unknown {
  let value = (thunks.next().value as F.Thunk)();
  const specPart = part.attributes.get("format_spec") as Terms.Part | undefined;
  const spec = specPart === undefined ? "" : ((specPart.attributes.get("values") ?? []) as Terms.Part[])
    .map((inner) => piece(inner, thunks, raw, false)).join("");
  let conversion = (part.attributes.get("conversion") ?? null) as string | null;
  const debug = part.attributes.get("debug") === true;
  if (debug && conversion === null && specPart === undefined) conversion = "r"; // `{x=}`: its repr
  const written = (part.attributes.get("text") ?? "") as string;
  if (template) return new Interpolation(value, debug ? written.trimEnd().slice(0, -1).trimEnd() : written, conversion, spec);
  if (conversion !== null) value = converted(value, conversion);
  return (debug ? written : "") + formatted(value, spec);
}

function piece(part: Terms.Part, thunks: Iterator<F.Thunk>, raw: boolean, template: boolean): unknown {
  if (part.kind === "stringtext") return text((part.attributes.get("spelling") ?? "") as string, raw);
  return field(part, thunks, raw, template);
}

/** An f-string: its text, and each field formatted, in order. */
function joinedstr(args: F.Thunk[], node: any): string {
  const attributes = attributesOf(node);
  const [raw, thunks] = [((attributes.get("prefix") ?? "") as string).toLowerCase().includes("r"), args[Symbol.iterator]()];
  return ((attributes.get("values") ?? []) as Terms.Part[]).map((part) => piece(part, thunks, raw, false)).join("");
}

/** A t-string: its strings, one more than its interpolations, a field's debug text (`{x=}`) ending the string before
 * it. */
function templatestr(args: F.Thunk[], node: any): Template {
  const attributes = attributesOf(node);
  const [raw, thunks] = [((attributes.get("prefix") ?? "") as string).toLowerCase().includes("r"), args[Symbol.iterator]()];
  const strings = [""];
  const interpolations: Interpolation[] = [];
  for (const part of (attributes.get("values") ?? []) as Terms.Part[]) {
    if (part.kind === "stringtext") {
      strings[strings.length - 1] += text((part.attributes.get("spelling") ?? "") as string, raw);
      continue;
    }
    if (part.attributes.get("debug") === true) strings[strings.length - 1] += (part.attributes.get("text") ?? "") as string;
    interpolations.push(field(part, thunks, raw, true) as Interpolation);
    strings.push("");
  }
  return new Template(new Tuple(strings), new Tuple(interpolations));
}

/** Adjacent strings, joined; adjacent bytes, joined. */
function concatenatedstring(args: F.Thunk[]): unknown {
  const values = args.map((argument) => argument());
  if (new Set(values.map((value) => value instanceof Uint8Array)).size > 1) throw new TypeError("cannot mix bytes and nonbytes literals");
  if (values[0] instanceof Uint8Array) return (values as Uint8Array[]).reduce(concatenate);
  return values.join("");
}

// --- Operators ---

const IMMUTABLE = new Set(["int", "float", "complex", "str", "bytes", "tuple"]);

/** `a is b`, as Python defines identity: the singletons `None`, `...`, `True` and `False` are themselves; values of
 * different types, or unequal ones, are not each other; any other value is itself alone. Whether two equal immutable
 * values (`1` and `1`, `'a'` and `'a'`) are one object Python leaves to the implementation: it stays in the residual. */
function is(a: unknown, b: unknown): boolean {
  const singleton = (v: unknown) => v === null || v === undefined || v === ELLIPSIS || typeof v === "boolean";
  if (singleton(a) || singleton(b)) return a === b;
  if (typeName(a) !== typeName(b)) return false;
  if (IMMUTABLE.has(typeName(a))) {
    if (equals(a, b) || (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b))) throw refuse("compare 'is' of equal immutable values");
    return false;
  }
  return a === b;
}

/** A comparison chain, as Python evaluates one: each operand once, left to right, stopping at the first link that is
 * false, whose result it gives, else the last link's. */
function compare(args: F.Thunk[], node: any): unknown {
  const operators = (attributesOf(node).get("comparisons") as Terms.Part[]).map((part) => part.attributes.get("op") as string);
  for (const op of operators) {
    if (!COMPARISONS.has(op)) {
      throw refuse(`compare ${repr(op)}`);
    }
  }
  let left = (args[0] as F.Thunk)();
  let result: unknown = null;
  for (const [i, op] of operators.entries()) {
    const right = (args[i + 1] as F.Thunk)();
    result = (COMPARISONS.get(op) as (a: unknown, b: unknown) => unknown)(left, right);
    if (!result) return result;
    left = right;
  }
  return result;
}

const COMPARISONS = new Map<string, (a: unknown, b: unknown) => unknown>([
  ["==", (a, b) => equals(a, b)], ["!=", (a, b) => !equals(a, b)],
  ["in", (a, b) => contains(b, a)], ["not in", (a, b) => !contains(b, a)],
  ["is", (a, b) => is(a, b)], ["is not", (a, b) => !is(a, b)],
  ...Object.keys(ORDERS).map((operator) =>
    [operator, (a: unknown, b: unknown) => ordered(operator, a, b)] as [string, (a: unknown, b: unknown) => unknown]),
]);

function strict(fn: (...values: unknown[]) => unknown): F.Implementation {
  return (args) => fn(...args.map((argument) => argument()));
}

// --- Displays ---

/** A dict display's value: its keys and values evaluated in order, a later equal key's value replacing an earlier's,
 * and a `**` item's mapping merged where it stands. */
function dict(args: F.Thunk[], node: any): Map<unknown, unknown> {
  const keys = argumentsOf(node).filter((_, i) => i % 2 === 0);
  const items: [unknown, unknown][] = [];
  for (let i = 0; i < args.length; i += 2) {
    if (keys[i / 2] === null) { // `**mapping`
      const value = (args[i + 1] as F.Thunk)();
      items.push(...mapping(value, `'${typeName(value)}' object is not a mapping`));
      continue;
    }
    const key = (args[i] as F.Thunk)();
    hashable(key, "a dict key");
    items.push([key, (args[i + 1] as F.Thunk)()]);
  }
  return dictOf(items);
}

/** A slice: its lower and upper bounds and its step, null where it has none. */
function slice(args: F.Thunk[], node: any): Slice {
  const parts = argumentsOf(node).map((part, i) => (part === null ? null : (args[i] as F.Thunk)()));
  return new Slice(parts[0] ?? null, parts[1] ?? null, parts[2] ?? null);
}

const P = Expressions;

/** The kinds its rules fold; any other stays in the residual, named. */
export const FOLDED: ReadonlySet<string> = new Set([P.LITERAL, P.CONSTANT, P.NAME, P.LET, P.LIST, P.TUPLE, P.SET, P.DICT,
  P.STARRED, P.PARENTHESIZED, P.CONCATENATEDSTRING, P.JOINEDSTR, P.TEMPLATESTR, P.ATTRIBUTE, P.SUBSCRIPT, P.SLICE, P.CALL,
  P.COMPARE, P.BOOLOP, P.BINOP, P.UNARYOP, P.IFEXP, P.NAMEDEXPR, P.LAMBDA, P.LISTCOMP, P.SETCOMP, P.DICTCOMP,
  P.GENERATOREXP, P.IMPORT, P.IMPORTFROM]);

/** The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given):
 * `yield`, `yield from`, `await` and an `async for` need a statement body (d), as does a target that writes into data;
 * a lone starred target, or two, is invalid syntax (b); whether equal immutable values are one object Python leaves to
 * the implementation (b). The rest is (a): a format or a field whose text Python leaves to its platform or its
 * implementation, a complex power, and a `\N{...}` escape. A value with no literal (a set, a slice, a closure, a
 * template, an object, a generator) is no gap: its rule computes it, its subterm stays, and nothing is named. */
export const CATEGORIES: Record<string, Record<string, string>> = {
  Python3: { yield: "d", yieldfrom: "d", await: "d", "async comprehension": "d", "attribute target": "d",
    "subscript target": "d", "starred target": "b", "compare 'is' of equal immutable values": "b" },
  "Python Types": { "*": "b" }, "Python Patterns": { "*": "b" }, "Python RegExp": { "*": "b" },
};

/** The Interpreter, folding Python3's own constants too: `None`, `...` and a complex number. */
class Rules extends F.Interpreter {
  override evaluate(node: any, scope: any): any {
    const [tag, record] = Terms.kindOf(node);
    if (tag === P.CONSTANT && this.dialect.owner(node) === this.dialect) {
      const attributes = Terms.attributesOf(record);
      const complex = attributes.get("complex") as Terms.Part | undefined;
      if (complex !== undefined) return new Complex((complex.attributes.get("real") ?? 0) as number, complex.attributes.get("imag") as number);
      if (!attributes.has("singleton")) throw new ValueError("a constant needs a singleton or a complex number");
      return attributes.get("singleton") === "None" ? null : ELLIPSIS;
    }
    return super.evaluate(node, scope);
  }
}

/** The folding rules of the Python3 dialect. */
export const RULES: F.Interpreter = new Rules(P.DIALECT, new Map<string, any>([
  [P.ATTRIBUTE, (args: F.Thunk[], node: any) => attribute((args[0] as F.Thunk)(), attributesOf(node).get("attr"))],
  [P.SUBSCRIPT, strict((value, key) => index(value, key))],
  [P.SLICE, slice],
  [P.STARRED, (args: F.Thunk[]) => new Unpacked((args[0] as F.Thunk)())],
  [P.PARENTHESIZED, (args: F.Thunk[]) => (args[0] as F.Thunk)()],
  [P.NAMEDEXPR, (args: F.Thunk[]) => (args[0] as F.Thunk)()], // its target bound within itself only
  [P.CONCATENATEDSTRING, concatenatedstring],
  [P.JOINEDSTR, joinedstr],
  [P.TEMPLATESTR, templatestr],
  [P.LAMBDA, lambda],
  [P.GENERATOREXP, (args: F.Thunk[], node: any, scope: Scope) => new PyGenerator(elements(node, scope))],
  [P.LISTCOMP, (args: F.Thunk[], node: any, scope: Scope) => [...{ [Symbol.iterator]: () => elements(node, scope) }]],
  [P.SETCOMP, (args: F.Thunk[], node: any, scope: Scope) => set({ [Symbol.iterator]: () => elements(node, scope) })],
  [P.DICTCOMP, dictcomp],
  [P.CALL, call],
  [P.COMPARE, compare],
  [P.BOOLOP, new Map<string, F.Implementation>(["and", "or"].map((name) => [name, (args: F.Thunk[]) => {
    let value: unknown = null;
    for (const argument of args) {
      value = argument();
      if (name === "and" ? !truthy(value) : truthy(value)) return value;
    }
    return value;
  }]))],
  [P.BINOP, new Map<string, F.Implementation>([
    ...["+", "*", "/", "//", "%", "**"].map((operator) =>
      [operator, strict((a, b) => arithmetic(operator, a, b))] as [string, F.Implementation]),
    ["-", strict((a, b) => subtract(a, b))],
    ...["&", "|", "^", "<<", ">>"].map((operator) =>
      [operator, strict((a, b) => bitwise(operator, a, b))] as [string, F.Implementation]),
    ["@", strict((a, b) => {
      throw unsupported("@", a, b); // no value of these rules has `__matmul__`
    })],
  ])],
  [P.UNARYOP, new Map<string, F.Implementation>([
    ["not", strict((a) => !truthy(a))], ["-", strict((a) => negate("-", a))], ["+", strict((a) => negate("+", a))],
    ["~", strict((a) => invert(a))],
  ])],
  [P.IFEXP, (args: F.Thunk[]) => (truthy((args[1] as F.Thunk)()) ? (args[0] as F.Thunk)() : (args[2] as F.Thunk)())],
  [P.LIST, (args: F.Thunk[]) => spread(args)],
  [P.TUPLE, (args: F.Thunk[]) => new Tuple(spread(args))],
  [P.SET, (args: F.Thunk[]) => set(spread(args))],
  [P.DICT, dict],
]), { scope: (variables) => new Scope(variables), folded: FOLDED });

const NATIVE = F.natives(P.DIALECT);

/** The literal of a value: a basic scalar's, or a constant's (`None`, `...`, a complex number). */
function literal(value: unknown): unknown {
  if (value === null || value === ELLIPSIS || value instanceof Complex) return P.constant(value);
  return NATIVE(value);
}

/** A list's, a tuple's or a dict's display, of its items' literals and displays; null where an item has neither. A
 * dict is a `Map`, or an object of variables, by its string keys. */
function display(value: unknown): unknown {
  if (Array.isArray(value) || value instanceof Tuple) {
    const items = itemsOf(value).map((item) => literal(item) ?? display(item));
    return items.includes(null) ? null : Array.isArray(value) ? P.list_(...items) : P.tuple_(...items);
  }
  if (!isDict(value)) return null;
  const pairs = entries(value);
  const keys = pairs.map(([key]) => literal(key) ?? display(key));
  const items = pairs.map(([, item]) => literal(item) ?? display(item));
  return keys.includes(null) || items.includes(null) ? null : P.dict_(...keys.map((key, i) => [key, items[i]] as const));
}

/** An f-string's part, its text as written dropped where its term changed: a debug field's (`{x=}`) its label,
 * written before it as text, its conversion `!r` unless it has one or a format spec, as Python formats it. */
function respelled(part: Terms.Part, changed: Iterator<boolean>): Terms.Part[] {
  if (part.kind === "stringtext") return [part];
  const mine = changed.next().value as boolean;
  const attributes = new Map(part.attributes);
  const spec = attributes.get("format_spec") as Terms.Part | undefined;
  if (spec !== undefined) {
    const inner = ((spec.attributes.get("values") ?? []) as Terms.Part[]).flatMap((p) => respelled(p, changed));
    attributes.set("format_spec", new Terms.Part(spec.kind, new Map([...spec.attributes, ["values", inner]]), spec.size));
  }
  if (!mine || !attributes.has("text")) return [new Terms.Part(part.kind, attributes, part.size)];
  const written = attributes.get("text") as string;
  attributes.delete("text");
  const debug = attributes.get("debug") === true;
  attributes.delete("debug");
  if (!debug) return [new Terms.Part(part.kind, attributes, part.size)];
  if (!attributes.has("conversion") && spec === undefined) attributes.set("conversion", "r");
  const label = new Terms.Part("stringtext", { spelling: written.replaceAll("{", "{{").replaceAll("}", "}}") }, 0);
  return [label, new Terms.Part(part.kind, attributes, part.size)];
}

/** An f-string or a t-string whose terms changed: a field's text as written no longer spells its term, so an
 * f-string's is dropped (`respelled`); a t-string's is its value's (an interpolation's `expression`), so a t-string
 * stays as written. */
function simplify(node: any, results: F.Result[]): F.Result | null {
  const tag = Terms.kindOf(node)[0];
  if ((tag !== P.JOINEDSTR && tag !== P.TEMPLATESTR) || !results.some((result) => result.changed)) return null;
  if (tag === P.TEMPLATESTR) return new F.Result(node, false, null, false, S.free(node, P.DIALECT), false);
  const form = Terms.form(node);
  const changed = results.map((result) => result.changed)[Symbol.iterator]();
  const values = ((form.attributes.get("values") ?? []) as Terms.Part[]).flatMap((part) => respelled(part, changed));
  const written = P.DIALECT.make(new Terms.Form(tag, new Map([...form.attributes, ["values", values]]),
    results.map((result) => result.expression)));
  const free = new Set<string>();
  for (const result of results) for (const name of result.free) free.add(name);
  return new F.Result(written, false, null, false, free);
}

/** The simplifier of the Python3 dialect. */
export const SIMPLIFIER = new F.Simplifier(RULES, { literal, simplify, categories: CATEGORIES, display });

/** The simplification of a term (or anything `Terms.term` reads one from) in `scope`, or with the variables in an
 * object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
