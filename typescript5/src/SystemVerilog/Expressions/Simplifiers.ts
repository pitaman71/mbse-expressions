/**
 * Simplifiers of the SystemVerilog dialect: simplify an expression by IEEE 1800-2023's rules, in TypeScript.
 *
 * `Simplifiers.OfAny(expression, scope)` simplifies a term (or anything `Terms.term` reads one from) in a `Scope` (see
 * `Framework/Simplifiers`): what the scope determines folds into the literal of its value, and what it does not stays,
 * the residual, its subterms folded wherever that keeps its meaning. A value is a `Domains.Logic` for an integral
 * result, a number for a real one, null for the null class handle, an array for an array or a queue, or an object (a
 * mapping, a data object) for a structure or a class handle. A variable's type is its value's: a `Logic` its own, a
 * boolean a `bit`, a bigint an `integer` (or a `longint` beyond 32 bits), a number a `real`, and a string a vector of
 * its bytes (in UTF-8). Every named type it computes in (a literal's, a cast's, `===`'s `bit`, `size()`'s `int`,
 * `$bits`' `integer`, ...) is the domain SystemVerilog defines by that name in the store of the term's holder
 * (`Domains.named`), read once per folding when it is first needed: a lone term is refused where it needs one
 * (mbse-schemas' TypeError), and a store where SystemVerilog's `define` has not run defines none.
 *
 * A `new Scope(variables, { functions, packages, types, timeunit, timeprecision, mintypmax })` gives what an expression
 * may reach, and nothing else is reachable: `variables` (`this` among them, by that name); the `functions` it may call,
 * each a function or a `Subroutine` that names its formals and their defaults; its `packages`, each a `Scope` of a
 * package's variables and functions, which a scoped name reads (`pkg::x`, `pkg::f(x)`, `$unit::x`); the `types` of
 * names it does not bind, as a declaration gives them, which size what stays around them; the time unit and precision
 * a time literal scales to (`"1ns"`, `"100ps"`: `timeunit`, 3.14.2.2, and its precision, the unit's own by default),
 * without which a time literal stays; and which of `min:typ:max` is chosen (11.11; `typ` by default).
 *
 * The rules (`RULES`) fold every kind the evaluation inventory gives a value (mbse-expressions'
 * [the evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#systemverilog), SystemVerilog),
 * `FOLDED`: literals (an unsized integer, decimal or based, a real, a string, and a time literal in the scope's time
 * unit, rounded to its precision) and constants (a vector, sized or not, a fill in its context's width, and `null`); a
 * name, a package's scoped name and `this`; members, indexes and range selects (`[msb:lsb]`, `[base+:width]`,
 * `[base-:width]`, of a vector or of an array or a queue, whose last index `$` is); the unary, binary and conditional
 * operators, `inside` (with value ranges, `$` bounding a range by its type, and the tolerances `[a +/- b]` and
 * `[a +%- b]`), `matches` and `&&&` (a constant, a wildcard or a variable pattern, its variable bound in the
 * conditional's consequence), concatenation, replication and streaming (11.4.14); `min:typ:max`; the empty queue;
 * casts (to a type SystemVerilog's keywords name, a vector of constant dimensions, a signing, a width or a `string`);
 * the system functions `SYSTEM` (sizes and signs, the math functions, the conversions between reals and bits,
 * `$countbits`, the array queries, `$sformatf`); calls of the scope's functions, by position, by name (`.b(2)`) and
 * with defaults (`f(1, , 3)`); and the methods of strings (6.16) and arrays (7.12: `size()`, the reductions and the
 * locators, with or without `with`, and `item.index()`). What it has no rule for stays in the residual, named
 * ("SystemVerilog incrementexpression is not simplified"): a kind the inventory gives no value (`b`), one waiting on
 * domain inference (`c`: an assignment pattern, a tagged union, an enumeration's methods, a cast to a structure), and
 * one only a simulator or mbse-programs can give a value (`d`: a write, a class, the design hierarchy, a system
 * function reading a simulator's state or acting); `CATEGORIES` gives each its class.
 *
 * IEEE 1800's rules apply:
 *
 * - Sizing (11.6, 11.8): an operator's operands are context-determined or self-determined; the context-determined ones
 *   are extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
 *   context-determined operands are), and zero-extended otherwise. A real operand makes the expression real. An unsized
 *   based integer is unsigned, unless written signed, of 32 bits; an unsized vector is extended to 32 bits by its
 *   leftmost bit where it is x or z, else by 0; a fill (`'1`) fills its context's width. A cast to an integral type
 *   takes its operand as an assignment would (6.24.1): the operand is computed in the wider of the two widths, by its
 *   own signedness, then converted.
 * - 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the
 *   bitwise operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and
 *   `!=?` treat x and z in the right operand as wildcards. Division by zero gives x.
 * - `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
 *   otherwise x); a conditional with an x condition merges its operands bit by bit. Class handles compare by identity,
 *   `null` with them.
 * - A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a
 *   2-state type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), an integer becomes a
 *   real, and a vector becomes a `string` of its bytes, NUL bytes dropped.
 *
 * What stays keeps its meaning: a subterm folds only into a closed constructor expression that means what it meant
 * there. A self-determined subterm (a concatenation's operand, a shift's count, a condition, an index, a function's
 * argument) folds alone, into the literal of its own type; a context-determined one (an operand of `+`, of a
 * comparison, a conditional's branch), whose width and signedness are its context's, folds once its context is known,
 * as 11.6 sizes it from the whole expression: the types of the scope's values, and of the names it does not bind as its
 * `types` declare them. A type no literal has (a 2-state type, `shortreal`), where its states or format could change
 * what stays around it, folds into a cast of a literal to that type (6.24.1), which keeps them: `int'(5)`,
 * `bit'(1'b1)`, `shortreal'(0.1)`, and for a keyword's type of the other signedness that cast's signing,
 * `unsigned'(int'(-1))`. A subterm whose context's type is not known, or whose type neither a literal nor such a cast
 * has (a 2-state vector as wide as no keyword's type), is kept, its own subterms simplified; it is the rule, not a gap,
 * and names no residue. The root, whose context is no expression's, always
 * folds; an `integer`'s value is written as an unsized decimal integer, any other integral value as a sized vector of
 * its bits and signedness, a real as a real and `null` as itself. `&&` and `||` are decided by an operand that decides
 * them (`y && 0` is `1'b0`), and a conditional by a known condition, where the branch it keeps has the conditional's
 * own type.
 */

import { Errors, Proxies, Repr } from "@mbse/schemas/Framework";

import { OverflowError } from "../../Framework/Errors.js";
import * as FS from "../../Framework/Simplifiers.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as F from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import { isMapping } from "../../MATLAB/Expressions/Domains.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Domains from "./Domains.js";
import * as X from "./Expressions.js";
import * as Formats from "./Formats.js";
import { Logic, SvType } from "./Domains.js";

const { KeyError, ValueError } = Errors;
const { repr, typeName } = Repr;
type Fn = (...args: any[]) => unknown;

const EVEN = "roundTiesToEven";
const ONE = Domains.vector(1);

// The sublanguages' kinds the rules read, by tag (their modules import this one's dialect).
const [VECTOR, ATOM, NONINTEGER, KEYWORD, IMPLICIT] = ["integervectortype", "integeratomtype", "nonintegertype",
  "keywordtype", "implicittype"];
const [VARIABLE, WILDCARD, PARENTHESIZED_PATTERN] = ["variablepattern", "wildcardpattern", "parenthesizedpattern"];

/** The math functions (20.8.2), each C's, over reals. */
export const MATH: readonly string[] = ["$ln", "$log10", "$exp", "$sqrt", "$pow", "$floor", "$ceil", "$sin", "$cos",
  "$tan", "$asin", "$acos", "$atan", "$atan2", "$hypot", "$sinh", "$cosh", "$tanh", "$asinh", "$acosh", "$atanh"];
/** The conversions between reals, integers and their bits (20.5). */
export const CONVERSIONS: readonly string[] = ["$rtoi", "$itor", "$realtobits", "$bitstoreal", "$shortrealtobits",
  "$bitstoshortreal"];
/** The array query functions (20.7), over a value's packed width or a list's length, or a type's dimensions. */
export const QUERIES: readonly string[] = ["$left", "$right", "$low", "$high", "$increment", "$size", "$dimensions",
  "$unpacked_dimensions"];
/** The system functions its rules fold: `Expressions.SYSTEM`, then those clauses 20 and 21 define a value of. */
export const SYSTEM: readonly string[] = [...X.SYSTEM, "$countbits", "$isunbounded", ...CONVERSIONS, ...MATH, ...QUERIES,
  "$sformatf"];
/** The array locator methods that need a `with` clause (7.12.1). */
export const LOCATORS: readonly string[] = ["find", "find_index", "find_first", "find_first_index", "find_last",
  "find_last_index"];
/** The array methods of no arguments its rules fold. */
export const METHODS: readonly string[] = [...X.METHODS, "unique_index"];
const WITH: readonly string[] = [...X.REDUCTIONS, ...LOCATORS, "min", "max", "unique", "unique_index"];
/** The string methods its rules fold (6.16), those that write the string aside. */
export const STRING_METHODS: readonly string[] = ["len", "getc", "toupper", "tolower", "compare", "icompare", "substr",
  "atoi", "atohex", "atooct", "atobin", "atoreal"];
const UNITS: Record<string, number> = { s: 0, ms: -3, us: -6, ns: -9, ps: -12, fs: -15 };
const REAL = /^[+-]?(\d[\d_]*)?(\.[\d_]*)?([eE][+-]?\d[\d_]*)?/;

/** A function a scope provides, with the names of its `formals` and the `defaults` some have, so that a call may
 * connect an argument by name (`f(.b(2))`) or leave it to its default (`f(1, , 3)`, `f(1)`) (13.5); it is called with
 * its arguments in its formals' order. */
export class Subroutine {
  readonly defaults: ReadonlyMap<string, unknown>;

  constructor(readonly implementation: Fn, readonly formals: readonly string[] = [], defaults: Record<string, unknown> = {}) {
    this.defaults = new Map(Object.entries(defaults));
  }
}

/** A time unit's magnitude and its unit's power of ten, from its text: 1, 10 or 100 of s, ms, us, ns, ps or fs. */
function timeUnit(text: string, what: string): [number, number] {
  for (const magnitude of ["100", "10", "1"]) {
    const unit = text.slice(magnitude.length);
    if (text.startsWith(magnitude) && unit in UNITS) return [Number(magnitude), UNITS[unit] as number];
  }
  throw new ValueError(`a ${what} is 1, 10 or 100 of s, ms, us, ns, ps or fs, got ${repr(text)}`);
}

/** The options of a SystemVerilog `Scope`. */
export interface ScopeOptions {
  functions?: Record<string, Fn | Subroutine>;
  packages?: Record<string, Scope>;
  types?: Record<string, SvType>;
  timeunit?: string;
  timeprecision?: string;
  mintypmax?: string;
}

/** SystemVerilog's scope for an expression: its `variables`, `functions` and `packages`, the declared `types` of names
 * it does not bind, a time literal's unit and precision, and the choice of `min:typ:max`. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn | Subroutine>;
  readonly packages: ReadonlyMap<string, Scope>;
  readonly types: ReadonlyMap<string, SvType>;
  readonly mintypmax: string;
  readonly timeunit: [number, number] | null;
  readonly timeprecision: [number, number] | null;

  constructor(variables: S.Bindings = {}, options: ScopeOptions = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
    this.packages = new Map(Object.entries(options.packages ?? {}));
    this.types = new Map(Object.entries(options.types ?? {}));
    const mintypmax = options.mintypmax ?? "typ";
    if (!["min", "typ", "max"].includes(mintypmax)) {
      throw new ValueError(`min:typ:max's choice is min, typ or max, got ${repr(mintypmax)}`);
    }
    this.mintypmax = mintypmax;
    this.timeunit = options.timeunit === undefined ? null : timeUnit(options.timeunit, "time unit");
    this.timeprecision = options.timeprecision === undefined ? this.timeunit : timeUnit(options.timeprecision, "time precision");
    if (this.timeunit !== null) {
      const [[unit, power], [precision, finer]] = [this.timeunit, this.timeprecision as [number, number]];
      if (BigInt(precision) * 10n ** BigInt(finer + 15) > BigInt(unit) * 10n ** BigInt(power + 15)) {
        throw new ValueError(`a time precision is at most its unit, got ${options.timeprecision} for ${options.timeunit}`);
      }
    } else if (options.timeprecision !== undefined) {
      throw new ValueError("a time precision needs a time unit");
    }
  }

  function(name: string): Fn | Subroutine {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new S.Unbound(name);
    return fn;
  }

  /** The type a name the scope does not bind is declared with, or null. */
  declared(name: string): SvType | null {
    return this.find(name)[0] ? null : this.types.get(name) ?? null;
  }
}

/** Thrown for a subterm whose value is its context's to compute (an operand whose context is not known, `$` outside
 * the select it indexes): the simplifier leaves it as it is, its own subterms simplified, and names no residue. */
class InContext extends S.Unbound {
  override name = "InContext";
}

function fromBytes(data: Uint8Array): bigint {
  return data.reduce((total, byte) => (total << 8n) | BigInt(byte), 0n);
}

/** The types SystemVerilog defines in the store of an evaluated term's holder, by name, each read once, when first
 * needed: a lone term reaches no store, and is refused only where it needs a type. */
class Types {
  private readonly read = new Map<string, SvType>();

  constructor(private readonly term: unknown) {}

  named(name: string): SvType {
    if (!this.read.has(name)) this.read.set(name, Domains.named(Proxies.store_of(this.term), name));
    return this.read.get(name) as SvType;
  }
}

/** A variable's value as SystemVerilog has it: a `Logic`, a number, or an object. */
function typed(value: unknown, types: Types): unknown {
  if (value instanceof Logic || typeof value === "number") return value;
  if (typeof value === "boolean") return new Logic(types.named("bit"), value ? 1n : 0n);
  if (typeof value === "bigint") {
    const name = Domains.of(value);
    if (name === null) throw new OverflowError(`integer ${value} is too large for any type`);
    return Logic.number(types.named(name), value);
  }
  if (typeof value === "string") { // its bytes, in UTF-8
    const data = new TextEncoder().encode(value);
    return new Logic(Domains.vector(8 * Math.max(data.length, 1)), fromBytes(data));
  }
  return value;
}

function typeOfValue(value: unknown, types: Types): SvType | null {
  if (value instanceof Logic) return value.type;
  return typeof value === "number" ? types.named("real") : null;
}

/** Whether a literal has the type: a 4-state integral type's (a sized vector, or an unsized decimal integer's), or a
 * real's; no literal has a 2-state type, nor `shortreal`. */
function representable(ctype: SvType): boolean {
  return ctype.kind === "integral" ? ctype.states === 4 : ctype.format === "binary64";
}

/** The 2-state types SystemVerilog's keywords name, by width: each keyword, and whether its type is signed. */
const ATOMS: ReadonlyMap<number, [string, boolean]> = new Map([[1, ["bit", false]], [8, ["byte", true]],
  [16, ["shortint", true]], [32, ["int", true]], [64, ["longint", true]]]);

/** Whether a cast of a literal has the type, where no literal does: a 2-state integral type as wide as a keyword's
 * (`bit`, `byte`, `shortint`, `int`, `longint`), signed or not, or `shortreal`. */
function castable(ctype: SvType): boolean {
  return ctype.kind === "integral" ? ctype.states === 2 && ATOMS.has(ctype.width) : ctype.format === "binary32";
}

/** A value as messages write it: a Logic as SystemVerilog does, anything else by `repr`. */
function shown(value: unknown): string {
  return value instanceof Logic ? value.toString() : repr(value);
}

// --- 4-state bits ---

function mask(width: number): bigint {
  return (1n << BigInt(width)) - 1n;
}

function ones(value: bigint): number {
  let count = 0;
  for (let rest = value; rest > 0n; rest >>= 1n) count += Number(rest & 1n);
  return count;
}

/** The bits that are 1 and those that are 0. */
function parts(value: Logic): [bigint, bigint] {
  const known = ~value.bval & mask(value.type.width);
  return [value.aval & known, ~value.aval & known];
}

/** The value whose bits are 1 in `ones`, 0 in `zeros`, and x elsewhere (0 in a 2-state type). */
function make(ctype: SvType, ones: bigint, zeros: bigint): Logic {
  const unknown = mask(ctype.width) & ~(ones | zeros);
  if (ctype.states === 2) return new Logic(ctype, ones);
  return new Logic(ctype, ones | unknown, unknown);
}

/** Every bit x, or 0 in a 2-state type. */
function unknownOf(ctype: SvType): Logic {
  return make(ctype, 0n, 0n);
}

/** A value resized to `ctype`: sign-extended (its top bit's state repeated) when `signed`, zero-extended otherwise, or
 * truncated; x and z become 0 in a 2-state type. */
function extend(value: Logic, ctype: SvType, signed: boolean): Logic {
  const [width, target] = [value.type.width, ctype.width];
  let [aval, bval] = [value.aval & mask(target), value.bval & mask(target)];
  if (target > width && signed) {
    const fill = mask(target) & ~mask(width);
    const top = BigInt(width - 1);
    if (((value.aval >> top) & 1n) !== 0n) aval |= fill;
    if (((value.bval >> top) & 1n) !== 0n) bval |= fill;
  }
  if (ctype.states === 2) [aval, bval] = [aval & ~bval, 0n];
  return new Logic(ctype, aval, bval);
}

/** A value as a real of `ctype`'s format: an integral one by its integer (x and z as 0). */
function toReal(value: unknown, ctype: SvType): number {
  let result: number;
  if (value instanceof Logic) {
    const number = new Logic(value.type, value.aval & ~value.bval).integer();
    result = Ieee754.from_integer(number, "binary64", EVEN) as number;
  } else {
    result = value as number;
  }
  return ctype.format === "binary32" ? Ieee754.convert("binary64", result, "binary32", EVEN) as number : result;
}

/** A real rounded to the nearest integer, ties away from zero. */
function round(value: number): bigint {
  if (!Number.isFinite(value)) throw new OverflowError(`${repr(value)} has no integer value`);
  return Ieee754.to_integer("binary64", value, "roundTiesToAway") as bigint;
}

/** A value converted to `ctype`, an integral one extended by `signed` (by default, its own signedness). */
function convert(value: unknown, ctype: SvType, signed: boolean | null = null): unknown {
  if (ctype.kind === "real") return toReal(value, ctype);
  if (typeof value === "number") return Logic.number(ctype, round(value));
  const logic = value as Logic;
  return extend(logic, ctype, signed ?? logic.type.signed);
}

/** 1, 0, or null for x: any 1 bit is true, all 0 bits false. */
function truth(value: unknown): number | null {
  if (typeof value === "number") return value !== 0 ? 1 : 0;
  if (!(value instanceof Logic)) throw new TypeError(`a ${typeName(value)} has no truth value`);
  const [one, zeros] = parts(value);
  if (one !== 0n) return 1;
  return zeros === mask(value.type.width) ? 0 : null;
}

function bit(value: number | null): Logic {
  return Logic.of(value === null ? "x" : String(value));
}

const BOOLEAN = (condition: boolean) => (condition ? 1 : 0);

/** `base ** exponent` modulo `modulus`, for a non-negative exponent. */
function power(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let [result, square] = [1n % modulus, ((base % modulus) + modulus) % modulus];
  for (let rest = exponent; rest > 0n; rest >>= 1n) {
    if ((rest & 1n) !== 0n) result = (result * square) % modulus;
    square = (square * square) % modulus;
  }
  return result;
}

/** Whether a value is a class handle: `null`, or an object. */
function isHandle(value: unknown): boolean {
  return value === null || isMapping(value) || Objects.isObject(value);
}

// --- The terms, read once ---

/** The kinds its rules fold: those it folded before the dialect was complete, and the nine more the evaluation
 * inventory gives a value; a `namedconnection` and an `emptyargument` within a call, a `dollarexpression` within a
 * select or a range; any other kind stays in the residual, named. */
export const FOLDED: ReadonlySet<string> = new Set([X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION,
  X.INDEXEXPRESSION, X.RANGESELECT, X.UNARYEXPRESSION, X.BINARYEXPRESSION, X.CONDITIONALEXPRESSION,
  X.PARENTHESIZEDEXPRESSION, X.INSIDEEXPRESSION, X.CONCATENATION, X.REPLICATION, X.CASTEXPRESSION, X.SYSTEMCALL,
  X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION, X.THISEXPRESSION, X.DOLLAREXPRESSION, X.EMPTYQUEUE,
  X.STREAMINGCONCATENATION, X.MINTYPMAXEXPRESSION, X.MATCHESEXPRESSION, X.PREDICATEEXPRESSION, X.NAMEDCONNECTION,
  X.EMPTYARGUMENT]);

/** The kinds whose type is their value's. */
const OWN_KINDS: ReadonlySet<string> = new Set([X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION,
  X.INDEXEXPRESSION, X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION, X.CONCATENATION, X.REPLICATION, X.RANGESELECT,
  X.SYSTEMCALL, X.THISEXPRESSION, X.EMPTYQUEUE, X.STREAMINGCONCATENATION]);
const PROPAGATING = ["+", "-", "*", "/", "%", "**", "&", "|", "^", "^~", "~^", "<<", ">>", "<<<", ">>>"];
const COMPARISONS = ["<", "<=", ">", ">=", "==", "!=", "===", "!==", "==?", "!=?"];
const LOGICAL = ["&&", "||", "->", "<->"];
const SHIFTS = ["<<", ">>", "<<<", ">>>"];

/** The name of the dialect of the family that owns a node's kind (`Terms.Dialect.owner`): SystemVerilog's own, or a
 * sublanguage's. */
function owner(node: Node): string {
  return X.DIALECT.owner(node.term).name();
}

/** Whether a term is of SystemVerilog's own dialect, not a sublanguage's. */
function own(term: unknown): boolean {
  return X.DIALECT.owner(term) === X.DIALECT;
}

/** The names a condition binds where it holds: a `matches`' pattern's variables, or those of each condition of a `&&&`
 * (12.6). */
function matched(condition: any): ReadonlySet<string> {
  const [tag, record] = F.kindOf(condition);
  const node = F.node(tag, record);
  const pattern = node.subterms.get("pattern") ?? null;
  if (tag === X.MATCHESEXPRESSION && pattern !== null) return Patterns.boundNames(pattern);
  if (tag === X.PREDICATEEXPRESSION) return new Set(node.many.flatMap((c) => [...matched(c)]));
  return new Set();
}

/** A helper read once: its `tag`, its `attributes`, and its members by name, its subterms `Node`s; a member it does not
 * hold is null. */
class Part {
  [member: string]: any;

  constructor(part: F.Node) {
    this.tag = part.kind;
    this.attributes = part.attributes;
    for (const [name, value] of part.attributes) this[name] = value;
    for (const [name, value] of part.subterms) this[name] = value === null ? null : new Node(value);
    for (const [name, value] of part.helpers) this[name] = partsOf(value);
    return new Proxy(this, { get: (target, name) => (name in target ? target[name as string] : null) });
  }
}

/** A helper's parts: one, or each of many (a helper not set is not among a node's helpers). */
function partsOf(value: F.Node | readonly F.Node[]): unknown {
  return Array.isArray(value) ? value.map((p) => new Part(p)) : new Part(value as F.Node);
}

/** A term read once for one evaluation: its `tag` (as `Expressions.DIALECT` reads it, a term of any of its family's
 * dialects), and its members by name, its attributes (null where not set), its helpers (`Part`s), its subterms (a
 * `Node`, null where empty) and its variadic arguments (each container's, an array of `Node`s). `term` is the term
 * value read. */
class Node {
  [member: string]: any;

  constructor(readonly term: any) {
    const [tag, record] = X.DIALECT.kind(term);
    const node = F.node(tag, record);
    const [, , names] = F._parts(record.as_schema());
    for (const name of names) this[name] = null;
    for (const [name, value] of node.attributes) this[name] = value;
    for (const [name, value] of node.helpers) this[name] = partsOf(value);
    for (const [name, value] of node.subterms) this[name] = value === null ? null : new Node(value);
    for (const [name, terms] of node.lists) this[name] = terms.map((a) => new Node(a));
    this.tag = tag;
  }
}

const kindOf = (node: Node | Part): string => node.tag;
const spelling = (name: any): string => name.attributes.get("spelling");

/** Whether a term passes its context to its operands, so that its value is its context's (11.6.1): parentheses,
 * `min:typ:max`, the conditional, unary `+`, `-` and `~`, and the binary arithmetic, bitwise and shift operators. */
function transparent(node: Node): boolean {
  const kind = kindOf(node);
  if ([X.PARENTHESIZEDEXPRESSION, X.MINTYPMAXEXPRESSION, X.CONDITIONALEXPRESSION].includes(kind)) return true;
  if (kind === X.UNARYEXPRESSION) return ["+", "-", "~"].includes(node.operator);
  return kind === X.BINARYEXPRESSION && PROPAGATING.includes(node.operator);
}

const NOT_SET = Symbol("not set");

/** One evaluation in a scope: each term's self-determined type, then its value in a context. */
class Evaluation {
  private readonly iterators: Map<string, number>;
  private readonly types = new Map<object, SvType | null>();
  private readonly values = new Map<object, unknown>();
  private readonly branches = new Map<object, Evaluation>();
  private readonly last: (number | null)[] = []; // the last index of each array a select indexes, innermost last

  constructor(readonly scope: Scope, readonly stored: Types, iterators: ReadonlyMap<string, number> = new Map()) {
    this.iterators = new Map(iterators); // a `with` clause's iterator, and its item's index
  }

  /** An evaluation with names bound to values, or hidden (bound to `UNKNOWN`). */
  within(bindings: ReadonlyMap<string, unknown>, hidden = false): Evaluation {
    let scope = this.scope;
    for (const [name, value] of bindings) scope = scope.bind(name, hidden ? S.UNKNOWN : value);
    return new Evaluation(scope, this.stored, this.iterators);
  }

  /** The term's self-determined type (null for an object); a kind it does not fold is refused by name. */
  type(node: any): SvType | null {
    if (!FOLDED.has(kindOf(node))) throw new FS.NoRule(owner(node), kindOf(node), kindOf(node));
    if (!this.types.has(node)) this.types.set(node, this.typeOf(node));
    return this.types.get(node) as SvType | null;
  }

  private integral(node: any, what: string): SvType {
    const ctype = this.numeric(node, what);
    if (ctype.kind !== "integral") throw new TypeError(`${what} expects an integral operand, got ${ctype.name()}`);
    return ctype;
  }

  numeric(node: any, what: string): SvType {
    const ctype = this.type(node);
    if (ctype === null) throw new TypeError(`${what} expects a number, got ${typeName(this.own(node))}`);
    return ctype;
  }

  private typeOf(node: any): SvType | null {
    const kind = kindOf(node);
    if (kind === X.CONSTANT && node.fill !== null) return ONE; // self-determined, a fill is a bit
    if (kind === X.DOLLAREXPRESSION) return this.stored.named("integer");
    if (kind === X.SYSTEMCALL && node.name === "$bitstoshortreal") return this.stored.named("shortreal");
    if (kind === X.NAMEEXPRESSION) {
      try {
        return typeOfValue(this.own(node), this.stored);
      } catch (error) {
        const declared = error instanceof S.Unbound ? this.scope.declared(F.nameOf(node.term) as string) : null;
        if (declared === null) throw error;
        return declared;
      }
    }
    if (OWN_KINDS.has(kind)) return typeOfValue(this.own(node), this.stored);
    if (kind === X.PARENTHESIZEDEXPRESSION) return this.type(node.expression);
    if (kind === X.MINTYPMAXEXPRESSION) return this.type(this.chosen(node));
    if (kind === X.UNARYEXPRESSION) {
      if (node.operator === "+" || node.operator === "-") return this.type(node.operand);
      if (node.operator === "~") return this.integral(node.operand, "~");
      return ONE;
    }
    if (kind === X.BINARYEXPRESSION) {
      const op = node.operator;
      if (["<", "<=", ">", ">=", "==", "!=", ...LOGICAL, "==?", "!=?"].includes(op)) return ONE;
      if (op === "===" || op === "!==") return this.stored.named("bit");
      if (SHIFTS.includes(op)) return this.integral(node.left, op);
      const [left, right] = [this.numeric(node.left, op), this.numeric(node.right, op)];
      if (op === "**" && left.kind !== "real" && right.kind !== "real") return left; // its exponent is self-determined
      return Domains.common([left, right]);
    }
    if (kind === X.CONDITIONALEXPRESSION) { // its condition first: one it does not fold is refused by name before the
      this.type(node.condition); // branches, which may name what its pattern binds, are sized
      const branch = this.branch(node.condition);
      return Domains.common([branch.numeric(node.consequence, "?:"), this.numeric(node.alternative, "?:")]);
    }
    if (kind === X.MATCHESEXPRESSION) {
      this.pattern(node.pattern);
      return ONE;
    }
    if (kind === X.INSIDEEXPRESSION || kind === X.PREDICATEEXPRESSION) return ONE;
    if (kind === X.NAMEDCONNECTION || kind === X.EMPTYARGUMENT) throw new FS.NoRule("SystemVerilog", kind, kind); // a call's: alone, no value
    return this.castType(node); // a cast
  }

  // Types a cast and a system function name

  /** The type a term of `SystemVerilog Types` names: a type SystemVerilog's keywords name, with a signing; a vector of
   * constant packed dimensions; a real; or a `string` (null). Any other stays, named (`what` of its kind). */
  typeTerm(target: any, what: string): SvType | null {
    const kind = kindOf(target);
    if (kind === VECTOR) {
      const dimensions: any[] = target.dimensions ?? [];
      if (dimensions.length === 0 && target.signing === null) return this.stored.named(target.keyword);
      let width = 1;
      for (const dimension of dimensions) {
        if (kindOf(dimension) !== "rangedimension") { // an unpacked or a queue's dimension: no vector's
          throw new FS.NoRule("SystemVerilog Types", kindOf(dimension), kindOf(dimension));
        }
        const [left, right] = [dimension.left, dimension.right].map((bound) => this.constant(bound, "a dimension's bound"));
        width *= Number((left as bigint) > (right as bigint) ? (left as bigint) - (right as bigint) : (right as bigint) - (left as bigint)) + 1;
      }
      return Domains.vector(width, target.signing === "signed", target.keyword === "bit" ? 2 : 4);
    }
    if (kind === ATOM) {
      const named = this.stored.named(target.keyword);
      return target.signing === null ? named : Domains.vector(named.width, target.signing === "signed", named.states);
    }
    if (kind === NONINTEGER) return this.stored.named(target.keyword === "realtime" ? "real" : target.keyword); // `realtime` is `real` (6.12)
    if (kind === KEYWORD && target.keyword === "string") return null;
    throw new FS.NoRule("SystemVerilog", `${what} ${kind}`, X.CASTEXPRESSION);
  }

  /** A cast's type: a width's, sized by its operand; a signing's, of its operand's width; a string's, its value's; or
   * the type its type names. */
  private castType(cast: any): SvType {
    const target = cast.type;
    const operand = this.numeric(cast.value, "a cast");
    if (kindOf(target) === IMPLICIT && target.signing !== null && (target.dimensions ?? []).length === 0) {
      const integral = this.integral(cast.value, `${target.signing}'`);
      return Domains.vector(integral.width, target.signing === "signed", integral.states);
    }
    if (own(target.term)) { // a width: a known positive integer
      const width = this.constant(target, "a cast's width");
      if (width < 1n) throw new ValueError(`a cast's width must be positive, got ${width}`);
      return Domains.vector(Number(width), operand.signed, operand.states);
    }
    const named = this.typeTerm(target, "castexpression to");
    return named ?? typeOfValue(this.string(cast), this.stored) as SvType;
  }

  /** The context a cast gives its operand: an integral type's, as an assignment does (the wider width, by the
   * operand's own signedness and states); none for a signing, a real or a string, or a real operand. */
  castContext(cast: any): SvType | null {
    if ([IMPLICIT, KEYWORD].includes(kindOf(cast.type))) return null;
    const [ctype, operand] = [this.type(cast) as SvType, this.type(cast.value) as SvType];
    if (ctype.kind === "real" || operand.kind === "real") return null;
    return Domains.vector(Math.max(ctype.width, operand.width), operand.signed, operand.states);
  }

  // Values

  /** A self-determined term's value, of its own type, once. */
  own(node: any): unknown {
    if (!this.values.has(node)) this.values.set(node, this.ownOf(node));
    return this.values.get(node);
  }

  private ownOf(node: any): unknown {
    switch (kindOf(node)) {
      case X.LITERAL: return this.literal(node);
      case X.CONSTANT: return this.vector(node);
      case X.NAMEEXPRESSION: return this.name(node);
      case X.THISEXPRESSION: return typed(this.scope.value("this"), this.stored);
      case X.EMPTYQUEUE: return [];
      case X.DOLLAREXPRESSION: return this.dollar();
      case X.MEMBEREXPRESSION: return this.member(node);
      case X.INDEXEXPRESSION: return this.select(node);
      case X.RANGESELECT: return this.range(node);
      case X.CONCATENATION: return this.concatenation(node.items.map((item: any) => this.value(item)));
      case X.REPLICATION: return this.replication(node);
      case X.STREAMINGCONCATENATION: return this.stream(node);
      case X.ARRAYMETHODWITHEXPRESSION: return this.withClause(node);
      case X.SYSTEMCALL: return this.systemCall(node);
      default: return this.call(node);
    }
  }

  /** A literal's value: an unsized based integer of its own type, a decimal one an `integer` or a `longint`, a real, a
   * string's bytes, or a time literal's magnitude in the scope's time unit. */
  private literal(node: any): unknown {
    if (node.unit !== null) return this.time(node.value, node.unit);
    if (node.base !== null) return Logic.number(Domains.unsized(node.value, Boolean(node.signed)), node.value);
    return typed(node.value, this.stored);
  }

  /** A time literal's value: its magnitude in the scope's time unit, rounded to its time precision (3.14.2). */
  private time(magnitude: number, unit: string): number {
    if (this.scope.timeunit === null) throw new FS.NoRule("SystemVerilog", "time literal without a time unit", X.LITERAL);
    const [[scale, power], [precision, finer]] = [this.scope.timeunit, this.scope.timeprecision as [number, number]];
    let shift = (UNITS[unit] as number) - finer;
    const steps = shift >= 0 ? magnitude * 10 ** shift : magnitude / 10 ** -shift;
    const count = round(steps / precision); // a whole number of precision steps
    let [numerator, denominator] = [count * BigInt(precision), BigInt(scale)];
    shift = finer - power;
    if (shift >= 0) numerator *= 10n ** BigInt(shift);
    else denominator *= 10n ** BigInt(-shift);
    return Number(numerator) / Number(denominator);
  }

  /** A constant's value: `null`, or its vector, of its size or, unsized, extended to 32 bits by its leftmost bit where
   * x or z. */
  private vector(node: any): Logic | null {
    if (node.bits === null) return null; // `null`
    let bits: string = node.bits;
    if (node.size === null && bits.length < 32) bits = ("xz".includes(bits[0] as string) ? bits[0] as string : "0").repeat(32 - bits.length) + bits;
    return Logic.of(bits, Boolean(node.signed));
  }

  /** A name's value: an identifier's, the scope's; a package's scoped name's (`p::x`), its package's. */
  private name(node: any): unknown {
    const name = node.name;
    if (kindOf(name) === "identifier") return typed(this.scope.lookup(node.term), this.stored);
    if (kindOf(name) === "scopedname") {
      const [found, member] = this.package(name);
      return typed(found.value(member), this.stored);
    }
    throw new FS.NoRule("SystemVerilog", `nameexpression of a ${kindOf(name)}`, X.NAMEEXPRESSION);
  }

  /** The package a scoped name names, as the scope provides it (`$unit` the compilation unit's), and its member's
   * name; a scoped name of a class, or of a package the scope does not provide, stays, named. */
  private package(name: any): [Scope, string] {
    const [scope, member] = [name.scope, name.name];
    const found = kindOf(scope) === "identifier" ? spelling(scope) : kindOf(scope) === "unitname" ? "$unit" : null;
    const packages = this.scope.packages;
    if (found === null || !packages.has(found) || kindOf(member) !== "identifier") {
      throw new FS.NoRule("SystemVerilog", "scopedname", X.NAMEEXPRESSION);
    }
    return [packages.get(found) as Scope, spelling(member)];
  }

  /** The term's value in a context: its own type's, unless the context gives another. */
  value(node: any, context: SvType | null = null): unknown {
    const ctype = this.type(node);
    const target = (context ?? ctype) as SvType;
    const kind = kindOf(node);
    if (kind === X.PARENTHESIZEDEXPRESSION) return this.value(node.expression, context);
    if (kind === X.MINTYPMAXEXPRESSION) return this.value(this.chosen(node), context);
    if (kind === X.CONSTANT && node.fill !== null) { // every bit of its context's width
      const filled = Logic.of((node.fill as string).repeat(target.kind === "integral" ? target.width : 1));
      return convert(filled, target, false);
    }
    if (kind === X.UNARYEXPRESSION && ["+", "-", "~"].includes(node.operator)) return this.unary(node.operator, this.value(node.operand, target), target);
    if (kind === X.BINARYEXPRESSION) return this.binary(node, target);
    if (kind === X.CONDITIONALEXPRESSION) return this.conditional(node, target);
    const result = this.selfDetermined(node);
    if (ctype === null) return result; // an object, an array
    return convert(result, target, ctype.signed && target.signed); // sign-extended only in a signed context
  }

  private selfDetermined(node: any): unknown {
    const kind = kindOf(node);
    if (kind === X.UNARYEXPRESSION) return this.reduction(node.operator, this.value(node.operand));
    if (kind === X.INSIDEEXPRESSION) return this.inside(node);
    if (kind === X.MATCHESEXPRESSION) return bit(this.matches(node));
    if (kind === X.PREDICATEEXPRESSION) return bit(this.predicate(node));
    if (kind === X.CASTEXPRESSION) {
      const ctype = this.type(node) as SvType;
      if (kindOf(node.type) === KEYWORD) return this.string(node);
      return convert(this.value(node.value, this.castContext(node)), ctype);
    }
    return this.own(node);
  }

  /** A cast to `string`: its operand's bytes, NUL bytes dropped. */
  private string(cast: any): Logic {
    const value = this.value(cast.value);
    if (!(value instanceof Logic)) throw new TypeError(`string' expects an integral operand, got ${typeName(value)}`);
    return Formats.vector(Formats.text(value));
  }

  /** The expression of `min:typ:max` the scope chooses. */
  chosen(node: any): any {
    return ({ min: node.min, typ: node.typ, max: node.max } as Record<string, any>)[this.scope.mintypmax];
  }

  // Operators

  private unary(operator: string, value: unknown, ctype: SvType): unknown {
    if (typeof value === "number") { // `~` takes integral operands only, as typing found
      return operator === "+" ? value : Ieee754.operate("neg", ctype.format as string, EVEN, [value]);
    }
    const logic = value as Logic;
    if (operator === "+") return logic;
    if (operator === "~") {
      const [one, zeros] = parts(logic);
      return make(ctype, zeros, one);
    }
    if (!logic.known) return unknownOf(ctype);
    return Logic.number(ctype, -logic.aval);
  }

  private reduction(operator: string, value: unknown): Logic {
    if (operator === "!") {
      const t = truth(value);
      return bit(t === null ? null : 1 - t);
    }
    if (typeof value === "number") throw new TypeError(`the reduction ${operator} expects an integral operand, got real`);
    const logic = value as Logic;
    const [one, zeros] = parts(logic);
    const full = mask(logic.type.width);
    let result: number | null;
    if (operator === "&" || operator === "~&") result = zeros !== 0n ? 0 : one === full ? 1 : null;
    else if (operator === "|" || operator === "~|") result = one !== 0n ? 1 : zeros === full ? 0 : null;
    else result = !logic.known ? null : ones(logic.aval) % 2;
    if (operator.startsWith("~") || operator === "^~") result = result === null ? null : 1 - result;
    return bit(result);
  }

  private binary(node: any, target: SvType): unknown {
    const op = node.operator;
    if (LOGICAL.includes(op)) return convert(this.logical(op, node), target, false);
    if (COMPARISONS.includes(op)) {
      const [leftType, rightType] = [this.type(node.left), this.type(node.right)];
      if ((leftType === null || rightType === null) && ["==", "!=", "===", "!=="].includes(op)) { // class handles, by identity
        const [left, right] = [this.value(node.left), this.value(node.right)];
        if (!(isHandle(left) && isHandle(right))) this.numeric(leftType === null ? node.left : node.right, op); // a handle and a number, or an array: no comparison
        const same = BOOLEAN((left === right) === (op === "==" || op === "==="));
        return convert(op === "===" || op === "!==" ? new Logic(this.stored.named("bit"), BigInt(same)) : bit(same), target, false);
      }
      const shared = Domains.common([this.numeric(node.left, op), this.numeric(node.right, op)]);
      const [left, right] = [this.value(node.left, shared), this.value(node.right, shared)];
      return convert(this.compare(op, left, right, shared), target, false);
    }
    if (SHIFTS.includes(op)) return this.shift(op, this.value(node.left, target), this.value(node.right), target);
    if (op === "**") {
      const right = this.type(node.right);
      const exponent = this.value(node.right, target.kind === "real" ? target : right);
      return this.arithmetic(op, this.value(node.left, target), exponent, target);
    }
    return this.arithmetic(op, this.value(node.left, target), this.value(node.right, target), target);
  }

  private logical(op: string, node: any): Logic {
    const left = truth(this.value(node.left));
    if ((op === "&&" && left === 0) || (op === "||" && left === 1)) return bit(left);
    if (op === "->" && left === 0) return bit(1);
    const right = truth(this.value(node.right));
    const unknown = left === null || right === null;
    if (op === "&&") return bit(right === 0 ? 0 : unknown ? null : 1);
    if (op === "||" || op === "->") return bit(right === 1 ? 1 : unknown ? null : 0);
    return bit(unknown ? null : BOOLEAN(left === right));
  }

  compare(op: string, left: any, right: any, shared: SvType): Logic {
    let order: number;
    if (shared.kind === "real") {
      if (Number.isNaN(left) || Number.isNaN(right)) return bit(BOOLEAN(["!=", "!==", "!=?"].includes(op)));
      order = BOOLEAN(left > right) - BOOLEAN(left < right);
    } else if (op === "===" || op === "!==") {
      const same = left.aval === right.aval && left.bval === right.bval;
      return new Logic(this.stored.named("bit"), BigInt(BOOLEAN(same === (op === "==="))));
    } else if (op === "==?" || op === "!=?") {
      const care = ~(right.bval as bigint) & mask(shared.width); // x and z in the right operand match anything
      if ((left.bval & care) !== 0n) return bit(null);
      const same = (left.aval & care) === (right.aval & care);
      return bit(BOOLEAN(same === (op === "==?")));
    } else {
      if (!(left.known && right.known)) return bit(null);
      const [x, y] = [left.integer(), right.integer()];
      order = BOOLEAN(x > y) - BOOLEAN(x < y);
    }
    const tests: Record<string, boolean> = {
      "<": order < 0, "<=": order <= 0, ">": order > 0, ">=": order >= 0, "==": order === 0, "!=": order !== 0,
      "===": order === 0, "!==": order !== 0, "==?": order === 0, "!=?": order !== 0,
    };
    return bit(BOOLEAN(tests[op] as boolean));
  }

  private shift(op: string, value: unknown, count: unknown, ctype: SvType): Logic {
    if (typeof value === "number" || typeof count === "number") throw new TypeError(`${op} expects integral operands, got real`);
    const [logic, by] = [value as Logic, count as Logic];
    if (!by.known) return unknownOf(ctype);
    const width = ctype.width; // the count is unsigned; the width or more shifts every bit out
    const n = by.aval < BigInt(width) ? by.aval : BigInt(width);
    if (op === "<<" || op === "<<<") return new Logic(ctype, (logic.aval << n) & mask(width), (logic.bval << n) & mask(width));
    let [aval, bval] = [logic.aval >> n, logic.bval >> n];
    if (op === ">>>" && ctype.signed && n !== 0n) {
      const fill = mask(width) & ~mask(Math.max(width - Number(n), 0));
      const top = BigInt(width - 1);
      if (((logic.aval >> top) & 1n) !== 0n) aval |= fill;
      if (((logic.bval >> top) & 1n) !== 0n) bval |= fill;
    }
    return new Logic(ctype, aval, bval);
  }

  arithmetic(op: string, left: any, right: any, ctype: SvType): unknown {
    if (ctype.kind === "real") {
      const names: Record<string, string> = { "+": "add", "-": "sub", "*": "mul", "/": "div" };
      if (op === "**") return realPower(left, right, ctype);
      if (!(op in names)) throw new TypeError(`${op} expects integral operands, got real`);
      return Ieee754.operate(names[op] as string, ctype.format as string, EVEN, [left, right]);
    }
    if (["&", "|", "^", "^~", "~^"].includes(op)) {
      const [[a1, a0], [b1, b0]] = [parts(left), parts(right)];
      if (op === "&") return make(ctype, a1 & b1, a0 | b0);
      if (op === "|") return make(ctype, a1 | b1, a0 & b0);
      const known = (a1 | a0) & (b1 | b0);
      const odd = (a1 ^ b1) & known;
      const one = op === "^" ? odd : known & ~odd;
      return make(ctype, one, known & ~one);
    }
    if (!(left.known && right.known)) return unknownOf(ctype);
    const [x, y] = [left.integer() as bigint, right.integer() as bigint];
    if ((op === "/" || op === "%") && y === 0n) return unknownOf(ctype);
    if (op === "**") return this.power(x, y, ctype);
    const results: Record<string, () => bigint> = {
      "/": () => x / y, "%": () => x % y, // truncated toward zero
      "+": () => x + y, "-": () => x - y, "*": () => x * y,
    };
    return Logic.number(ctype, (results[op] as () => bigint)());
  }

  /** IEEE 1800's table 11-4 for a negative exponent; otherwise the power, in the width. */
  private power(base: bigint, exponent: bigint, ctype: SvType): Logic {
    if (exponent >= 0n) return Logic.number(ctype, power(base, exponent, 1n << BigInt(ctype.width)));
    if (base === 0n) return unknownOf(ctype);
    if (base === 1n || base === -1n) return Logic.number(ctype, ((exponent % 2n) + 2n) % 2n === 0n ? 1n : base);
    return Logic.number(ctype, 0n);
  }

  // Conditions, and the patterns `matches` compares a value with (12.6)

  private conditional(node: any, target: SvType): unknown {
    const t = this.condition(node.condition);
    if (t === 0) return this.value(node.alternative, target);
    const branch = this.branch(node.condition);
    if (t === 1) return branch.value(node.consequence, target);
    const [a, b] = [branch.value(node.consequence, target), this.value(node.alternative, target)];
    if (target.kind === "real") return a === b ? a : 0.0;
    const [[a1, a0], [b1, b0]] = [parts(a as Logic), parts(b as Logic)];
    return make(target, a1 & b1, a0 & b0); // bits that agree keep their value; the others are x
  }

  /** A condition's truth: a `matches`', a `&&&`'s, or its value's. */
  private condition(condition: any): number | null {
    if (kindOf(condition) === X.MATCHESEXPRESSION) return this.matches(condition);
    if (kindOf(condition) === X.PREDICATEEXPRESSION) return this.predicate(condition);
    return truth(this.value(condition));
  }

  /** The evaluation of a conditional's consequence: this one, with what its condition's patterns bind bound. */
  branch(condition: any): Evaluation {
    if (matched(condition.term).size === 0) return this;
    if (!this.branches.has(condition)) this.branches.set(condition, this.within(this.bindings(condition)));
    return this.branches.get(condition) as Evaluation;
  }

  /** What a condition's variable patterns bind, each the value its `matches` compares (12.6.2); those of a `&&&`'s
   * conditions, each in the scope the conditions before it bind. */
  bindings(condition: any): Map<string, unknown> {
    if (kindOf(condition) === X.MATCHESEXPRESSION) {
      const pattern = this.pattern(condition.pattern);
      return kindOf(pattern) === VARIABLE ? new Map([[spelling(pattern.name), this.value(condition.value)]]) : new Map();
    }
    const found = new Map<string, unknown>();
    let evaluation: Evaluation = this;
    for (const inner of kindOf(condition) === X.PREDICATEEXPRESSION ? condition.conditions : []) {
      const bound = evaluation.bindings(inner);
      if (bound.size > 0) {
        for (const [name, value] of bound) found.set(name, value);
        evaluation = evaluation.within(bound);
      }
    }
    return found;
  }

  /** A pattern within its parentheses; a tagged or a structure pattern stays, named. */
  private pattern(pattern: any): any {
    while (kindOf(pattern) === PARENTHESIZED_PATTERN) pattern = pattern.pattern;
    if (kindOf(pattern) === "taggedpattern" || kindOf(pattern) === "structurepattern") {
      throw new FS.NoRule("SystemVerilog", `matchesexpression ${kindOf(pattern)}`, X.MATCHESEXPRESSION);
    }
    return pattern;
  }

  /** Whether a value matches a pattern: a variable or a wildcard pattern any value, a constant pattern a value
   * identical to it (`===`). */
  private matches(node: any): number {
    const pattern = this.pattern(node.pattern);
    if (kindOf(pattern) === VARIABLE || kindOf(pattern) === WILDCARD) return 1;
    const shared = Domains.common([this.numeric(node.value, "matches"), this.numeric(pattern, "matches")]);
    return BOOLEAN(truth(this.compare("===", this.value(node.value, shared), this.value(pattern, shared), shared)) === 1);
  }

  /** A `&&&`'s truth: its conditions' and, left to right, each in the scope the conditions before it bind. */
  private predicate(node: any): number | null {
    let [evaluation, result]: [Evaluation, number | null] = [this, 1];
    for (const condition of node.conditions) {
      const t = evaluation.condition(condition);
      if (t === 0) return 0;
      if (t === null) result = null;
      const bound = evaluation.bindings(condition);
      if (bound.size > 0) evaluation = evaluation.within(bound);
    }
    return result;
  }

  // inside (11.4.13)

  /** An `inside`'s items: a value, a range, or an element of an array among them. */
  insideItems(node: any): [string, any][] {
    const items: [string, any][] = [];
    for (const item of node.set) {
      if (kindOf(item) === X.VALUERANGE) items.push(["range", item]);
      else if (this.type(item) === null && Array.isArray(this.own(item))) { // an array: each of its elements
        for (const element of this.items(this.own(item), "inside")) items.push(["element", element]);
      } else items.push(["value", item]);
    }
    return items;
  }

  /** The type an `inside`'s value and items share; a range's `$` bound takes it, and adds nothing to it. */
  insideType(node: any, items: [string, any][]): SvType {
    const types = [this.numeric(node.value, "inside")];
    for (const [what, item] of items) {
      if (what === "element") types.push(this.elementType(item));
      else if (what === "value") types.push(this.numeric(item, "inside"));
      else {
        for (const end of [item.left, item.right]) if (kindOf(end) !== X.DOLLAREXPRESSION) types.push(this.numeric(end, "inside"));
      }
    }
    return Domains.common(types);
  }

  private inside(node: any): Logic {
    const items = this.insideItems(node);
    const shared = this.insideType(node, items);
    const value = this.value(node.value, shared);
    let found: number | null = 0;
    for (const [what, item] of items) {
      let match: Logic;
      if (what === "element") {
        const signed = item instanceof Logic && item.type.signed && shared.signed;
        match = this.compare("==?", value, convert(item, shared, signed), shared);
      } else if (what === "value") {
        match = this.compare("==?", value, this.value(item, shared), shared);
      } else {
        const [low, high] = this.span(item, shared);
        const [above, below] = [truth(this.compare(">=", value, low, shared)), truth(this.compare("<=", value, high, shared))];
        match = bit(above === 0 || below === 0 ? 0 : above === null || below === null ? null : 1);
      }
      const t = truth(match);
      if (t === 1) return bit(1);
      if (t === null) found = null;
    }
    return bit(found);
  }

  /** A value range's bounds: `[low:high]`, `$` the least or the greatest value of their type; `[a +/- b]` from
   * `a - b` to `a + b`; `[a +%- b]` from `a - a * b / 100` to `a + a * b / 100` (1800-2023). */
  private span(item: any, shared: SvType): [unknown, unknown] {
    if (item.operator === null) return [this.bound(item.left, shared, false), this.bound(item.right, shared, true)];
    const a = this.value(item.left, shared);
    let b = this.value(item.right, shared);
    if (item.operator === "+%-") {
      const hundred = convert(Logic.number(this.stored.named("integer"), 100n), shared);
      b = this.arithmetic("/", this.arithmetic("*", a, b, shared), hundred, shared);
    }
    return [this.arithmetic("-", a, b, shared), this.arithmetic("+", a, b, shared)];
  }

  private bound(end: any, shared: SvType, high: boolean): unknown {
    if (kindOf(end) !== X.DOLLAREXPRESSION) return this.value(end, shared);
    if (shared.kind === "real") return high ? Infinity : -Infinity;
    const least = shared.signed ? -(1n << BigInt(shared.width - 1)) : 0n;
    return Logic.number(shared, high ? least - 1n : least); // the greatest wraps from one below the least
  }

  // Arrays and their methods (7.12)

  /** An array's items, typed. */
  private items(value: unknown, what: string): unknown[] {
    if (!Array.isArray(value)) throw new TypeError(`${what} is a method of arrays, not of ${typeName(value)}`);
    return value.map((item) => typed(item, this.stored));
  }

  /** An array's method of no arguments: its size, a reduction, or a locator. */
  private arrayMethod(array: any, name: string): unknown {
    const items = this.items(this.value(array), `${name}()`);
    if (name === "size") return Logic.number(this.stored.named("int"), BigInt(items.length));
    if (X.REDUCTIONS.includes(name)) return this.reduce(name, items);
    return this.locate(name, items, items);
  }

  /** An array method with a `with` clause: its call's array's items, each bound to its iterator (its index its
   * `index()`), reduced or located by its method over its `with` expression's values. */
  private withClause(node: any): unknown {
    const call = node.value;
    const callee = kindOf(call) === X.CALLEXPRESSION ? call.callee : null;
    if (callee === null || kindOf(callee) !== X.MEMBEREXPRESSION || !WITH.includes(spelling(callee.member))) {
      throw new FS.NoRule("SystemVerilog", "arraymethodwithexpression of a call that is not an array method's", kindOf(node));
    }
    const method = spelling(callee.member);
    const iterator = [...(X.arrayMethodScopes(F.kindOf(node.term)[1])[1] as ReadonlySet<string>)][0] as string;
    const items = this.items(this.value(callee.value), `${method}()`);
    const values = items.map((item, i) => new Evaluation(this.scope.bind(iterator, item), this.stored,
      new Map([...this.iterators, [iterator, i]])).value(node.body));
    if (X.REDUCTIONS.includes(method)) return this.reduce(method, values);
    return this.locate(method, items, values);
  }

  /** A locator's queue: the items (or their indexes, `int`s) whose keys hold (`find`...), or the first with the least
   * or the greatest key (`min`, `max`), or the first of each set of identical keys (`unique`). */
  private locate(method: string, items: unknown[], keys: unknown[]): unknown[] {
    let chosen: number[] = [];
    if (LOCATORS.includes(method)) {
      chosen = keys.flatMap((key, i) => (truth(key) === 1 ? [i] : []));
      if (method.includes("first")) chosen = chosen.slice(0, 1);
      else if (method.includes("last")) chosen = chosen.slice(-1);
    } else if (method === "min" || method === "max") {
      if (keys.length > 0) {
        const shared = Domains.common(keys.map((key) => this.elementType(key)));
        let best = 0;
        for (let i = 1; i < keys.length; i++) {
          if (truth(this.compare(method === "min" ? "<" : ">", convert(keys[i], shared), convert(keys[best], shared), shared)) === 1) best = i;
        }
        chosen = [best];
      }
    } else { // unique, unique_index
      keys.forEach((key, i) => {
        if (!chosen.some((j) => identical(key, keys[j]))) chosen.push(i);
      });
    }
    if (method.endsWith("index")) return chosen.map((i) => Logic.number(this.stored.named("int"), BigInt(i)));
    return chosen.map((i) => items[i]);
  }

  /** The values reduced by a reduction method, in their common type. */
  private reduce(method: string, values: unknown[]): unknown {
    if (values.length === 0) {
      if (method === "sum" || method === "product") return Logic.number(this.stored.named("integer"), method === "sum" ? 0n : 1n);
      return bit(BOOLEAN(method === "and"));
    }
    const ctype = Domains.common(values.map((value) => this.elementType(value)));
    const operator = ({ sum: "+", product: "*", and: "&", or: "|", xor: "^" } as Record<string, string>)[method] as string;
    let result = convert(values[0], ctype);
    for (const value of values.slice(1)) result = this.arithmetic(operator, result, convert(value, ctype), ctype);
    return result;
  }

  // Strings' methods (6.16)

  private stringMethod(value: unknown, name: string, args: any[]): unknown {
    if (!(value instanceof Logic)) throw new TypeError(`${name}() is a method of strings, not of ${typeName(value)}`);
    const text = Formats.text(value);
    const counts: Record<string, number> = { len: 0, toupper: 0, tolower: 0, atoi: 0, atohex: 0, atooct: 0, atobin: 0,
      atoreal: 0, getc: 1, compare: 1, icompare: 1, substr: 2 };
    if (args.length !== counts[name]) throw new TypeError(`${name}() takes ${counts[name]} arguments, got ${args.length}`);
    if (name === "len") return Logic.number(this.stored.named("int"), BigInt(text.length));
    if (name === "toupper") return Formats.vector(text.replace(/[a-z]/g, (c) => c.toUpperCase())); // ASCII's letters, as C's toupper and tolower change them
    if (name === "tolower") return Formats.vector(text.replace(/[A-Z]/g, (c) => c.toLowerCase()));
    if (name === "getc") {
      const i = this.constant(args[0], "getc's index");
      return Logic.number(this.stored.named("byte"), BigInt(i >= 0n && i < BigInt(text.length) ? text.charCodeAt(Number(i)) : 0));
    }
    if (name === "substr") {
      const [i, j] = args.map((argument) => this.constant(argument, "substr's index")) as [bigint, bigint];
      return Formats.vector(0n <= i && i <= j && j < BigInt(text.length) ? text.slice(Number(i), Number(j) + 1) : "");
    }
    if (name === "compare" || name === "icompare") {
      const other = this.value(args[0]);
      if (!(other instanceof Logic)) throw new TypeError(`${name}() compares strings, not a ${typeName(other)}`);
      let [a, b] = [text, Formats.text(other)];
      if (name === "icompare") [a, b] = [a.toLowerCase(), b.toLowerCase()];
      return Logic.number(this.stored.named("int"), BigInt(BOOLEAN(a > b) - BOOLEAN(a < b)));
    }
    if (name === "atoreal") return atoreal(text);
    return Logic.number(this.stored.named("integer"), atoi(text, ({ atoi: 10, atohex: 16, atooct: 8, atobin: 2 } as Record<string, number>)[name] as number));
  }

  // Calls

  /** A call: of a function the scope provides, by its name or its package's (`p::f`), of an array's or a string's
   * method, or of a `with` clause's iterator's `index()`. */
  private call(node: any): unknown {
    const callee = node.callee;
    if (kindOf(callee) === X.NAMEEXPRESSION) {
      let found: Scope;
      let name: string;
      if (kindOf(callee.name) === "scopedname") [found, name] = this.package(callee.name);
      else if (kindOf(callee.name) === "identifier") [found, name] = [this.scope, spelling(callee.name)];
      else throw new FS.NoRule("SystemVerilog", `callexpression of a ${kindOf(callee.name)}`, kindOf(node));
      const fn = found.function(name);
      const values = this.arguments(name, fn, node.arguments);
      return typed(fn instanceof Subroutine ? fn.implementation(...values) : fn(...values), this.stored);
    }
    if (kindOf(callee) !== X.MEMBEREXPRESSION) throw new FS.NoRule("SystemVerilog", `callexpression of a ${kindOf(callee)}`, kindOf(node));
    const [name, target] = [spelling(callee.member), callee.value];
    if (name === "index" && node.arguments.length === 0 && kindOf(target) === X.NAMEEXPRESSION
      && this.iterators.has(F.nameOf(target.term) as string)) {
      return Logic.number(this.stored.named("int"), BigInt(this.iterators.get(F.nameOf(target.term) as string) as number));
    }
    if (METHODS.includes(name) && node.arguments.length === 0) return this.arrayMethod(target, name);
    if (STRING_METHODS.includes(name)) return this.stringMethod(this.value(target), name, node.arguments);
    const value = this.value(target);
    if (isMapping(value) || Objects.isObject(value)) {
      throw new FS.NoRule("SystemVerilog", "callexpression of a class handle's method", kindOf(node));
    }
    throw new FS.NoRule("SystemVerilog", `callexpression method ${repr(name)}`, kindOf(node));
  }

  /** A call's arguments, in its function's formals' order: by position, by name (`.b(2)`, `.b` the caller's `b`), an
   * empty one (`f(1, , 3)`, `.b()`) or one left out its default's. */
  private arguments(name: string, fn: Fn | Subroutine, args: any[]): unknown[] {
    const special = args.map(kindOf).filter((kind) => kind === X.NAMEDCONNECTION || kind === X.EMPTYARGUMENT);
    if (!(fn instanceof Subroutine)) {
      if (special.length > 0) {
        const first = special[0] as string;
        throw new FS.NoRule("SystemVerilog", `callexpression with ${first === X.EMPTYARGUMENT ? "an" : "a"} ${first}`, X.CALLEXPRESSION);
      }
      return args.map((argument) => this.value(argument));
    }
    const [formals, bound] = [fn.formals, new Map<string, unknown>()];
    let named = false;
    args.forEach((argument, i) => {
      if (kindOf(argument) === X.NAMEDCONNECTION) {
        named = true;
        const formal = spelling(argument.name);
        if (!formals.includes(formal) || bound.has(formal)) throw new TypeError(`${name} has no formal ${repr(formal)}, or connects it twice`);
        bound.set(formal, argument.value !== null ? this.value(argument.value)
          : argument.implicit ? typed(this.scope.value(formal), this.stored) : NOT_SET);
      } else if (named || i >= formals.length) {
        throw new TypeError(`${name} takes ${formals.length} arguments, its positional ones first`);
      } else {
        bound.set(formals[i] as string, kindOf(argument) === X.EMPTYARGUMENT ? NOT_SET : this.value(argument));
      }
    });
    return formals.map((formal) => {
      const value = bound.has(formal) ? bound.get(formal) : NOT_SET;
      if (value !== NOT_SET) return value;
      if (!fn.defaults.has(formal)) throw new TypeError(`${name}'s argument ${repr(formal)} has no default`);
      return typed(fn.defaults.get(formal), this.stored);
    });
  }

  private member(node: any): unknown {
    const [target, name]: [any, string] = [this.value(node.value), spelling(node.member)];
    let members: ReadonlyMap<string, unknown>;
    if (Objects.isObject(target)) members = Objects.properties(target);
    else if (isMapping(target)) members = target instanceof Map ? target : new Map(Object.entries(target));
    else throw new TypeError(`a ${typeName(target)} has no members`);
    if (!members.has(name)) throw new KeyError(`no member named '${name}'`);
    return typed(array(members.get(name)), this.stored);
  }

  // Selects (11.5)

  /** A select's known index, `$` its array's last index (7.10.1). */
  private indexed(target: unknown, node: any, what: string): bigint {
    this.last.push(Array.isArray(target) ? target.length - 1 : null);
    try {
      return this.constant(node, what);
    } finally {
      this.last.pop();
    }
  }

  /** `$`: the last index of the array the innermost select indexes. */
  private dollar(): Logic {
    if (this.last.length === 0) throw new InContext("$");
    const last = this.last[this.last.length - 1];
    if (last === null) throw new TypeError("$ is the last index of a queue or an array, not of a vector");
    return Logic.number(this.stored.named("integer"), BigInt(last as number));
  }

  private select(node: any): unknown {
    const target = this.value(node.value);
    this.last.push(Array.isArray(target) ? target.length - 1 : null);
    let index: unknown;
    try {
      index = this.value(node.index);
    } finally {
      this.last.pop();
    }
    if (Array.isArray(target)) {
      if (!(index instanceof Logic && index.known)) throw new ValueError(`an array's index must be known, got ${shown(index)}`);
      const position = index.integer();
      if (position < 0n || position >= BigInt(target.length)) {
        throw new ValueError(`index ${position} is out of bounds of an array of ${target.length}`);
      }
      return typed(target[Number(position)], this.stored);
    }
    if (!(target instanceof Logic)) throw new TypeError(`a ${typeName(target)} cannot be selected from`);
    const states = target.type.states;
    if (!(index instanceof Logic && index.known) || index.integer() < 0n || index.integer() >= BigInt(target.type.width)) {
      return unknownOf(Domains.vector(1, false, states));
    }
    const position = index.integer();
    return new Logic(Domains.vector(1, false, states), (target.aval >> position) & 1n, (target.bval >> position) & 1n);
  }

  constant(node: any, what: string): bigint {
    const value = this.value(node);
    if (!(value instanceof Logic && value.known)) throw new ValueError(`${what} must be a known integer, got ${shown(value)}`);
    return value.integer();
  }

  /** A range select: `[msb:lsb]`, or an indexed part-select of a constant width, `[base+:width]` (bits base and up) or
   * `[base-:width]` (bits base and down); of a vector its bits (x out of range, all x at an x base), of an array or a
   * queue its items (7.10.1: none where the range is reversed, clipped to its indexes). */
  private range(node: any): unknown {
    const target = this.value(node.value);
    if (!(target instanceof Logic || Array.isArray(target))) throw new TypeError(`a ${typeName(target)} cannot be selected from`);
    let [msb, lsb]: [bigint, bigint] = [0n, 0n];
    if (node.operator === ":") {
      [msb, lsb] = [this.indexed(target, node.left, "a range's msb"), this.indexed(target, node.right, "a range's lsb")];
    } else {
      const width = this.constant(node.right, "a part-select's width");
      if (width < 1n) throw new ValueError(`a part-select's width must be positive, got ${width}`);
      this.last.push(Array.isArray(target) ? target.length - 1 : null);
      let base: unknown;
      try {
        base = this.value(node.left);
      } finally {
        this.last.pop();
      }
      if (!(base instanceof Logic && base.known)) {
        if (Array.isArray(target)) throw new ValueError(`a part-select's base must be known, got ${shown(base)}`);
        return unknownOf(Domains.vector(Number(width), false, (target as Logic).type.states));
      }
      const start = base.integer();
      [msb, lsb] = node.operator === "+:" ? [start + width - 1n, start] : [start, start - width + 1n];
    }
    if (Array.isArray(target)) {
      const [low, high] = node.operator === ":" ? [msb, lsb] : [lsb, msb];
      if (low > high) return [];
      return target.slice(Number(low > 0n ? low : 0n), Number(high) + 1).map((item) => typed(item, this.stored));
    }
    if (msb < lsb) throw new ValueError(`a range's msb must be at least its lsb, got [${msb}:${lsb}]`);
    const logic = target as Logic;
    const [width, bits] = [logic.type.width, logic.bits];
    let selected = "";
    for (let i = Number(msb); i >= Number(lsb); i--) selected += 0 <= i && i < width ? bits[width - 1 - i] : "x";
    return Logic.of(selected, false, logic.type.states); // out of range, x
  }

  // Concatenations (11.4.12, 11.4.14)

  private concatenation(values: unknown[]): Logic {
    for (const value of values) {
      if (!(value instanceof Logic)) throw new TypeError(`a concatenation's parts must be integral, got ${typeName(value)}`);
    }
    const logics = values as Logic[];
    return Logic.of(logics.map((value) => value.bits).join(""), false, Math.max(...logics.map((value) => value.type.states)));
  }

  private replication(node: any): Logic {
    const count = this.constant(node.count, "a replication's count");
    if (count < 1n) throw new ValueError(`a replication's count must be positive, got ${count}`);
    const values = node.items.map((item: any) => this.value(item));
    return this.concatenation(Array.from({ length: Number(count) }, () => values).flat());
  }

  /** A streaming concatenation (11.4.14): its items' bits, an array's items' in order, `with [range]` its range of
   * items; `{>> {...}}` as they stand, `{<< n {...}}` with each slice of `n` bits, taken from the right, placed left to
   * right (`n` a constant or a type's width, 1 by default). */
  private stream(node: any): Logic {
    let size = 1n;
    if (node.slice !== null) {
      size = own(node.slice.term) ? this.constant(node.slice, "a stream's slice")
        : BigInt((this.typeTerm(node.slice, "streamingconcatenation of") as SvType).width);
      if (size < 1n) throw new ValueError(`a stream's slice must be positive, got ${size}`);
    }
    const values: unknown[] = [];
    for (const item of node.items) {
      let value = this.value(item.expression);
      if (item.operator !== null) {
        if (!Array.isArray(value)) throw new TypeError(`a stream's \`with\` selects from an array, not a ${typeName(value)}`);
        const left = this.indexed(value, item.left, "a stream's range");
        const right = this.indexed(value, item.right, "a stream's range");
        const [low, high] = item.operator === ":" ? [left, right] : item.operator === "+:" ? [left, left + right - 1n] : [left - right + 1n, left];
        value = value.slice(Number(low > 0n ? low : 0n), Number(high) + 1);
      }
      values.push(...(Array.isArray(value) ? value.map((element) => typed(element, this.stored)) : [value]));
    }
    const stream = this.concatenation(values);
    if (node.operator === ">>") return stream;
    const [bits, reordered, n] = [stream.bits, [] as string[], Number(size)];
    for (let end = bits.length; end > 0; end -= n) reordered.push(bits.slice(Math.max(end - n, 0), end));
    return Logic.of(reordered.join(""), false, stream.type.states);
  }

  // System functions (20, 21)

  /** A system function's call: one of `SYSTEM`. */
  private systemCall(node: any): unknown {
    const [name, args] = [node.name as string, node.arguments as any[]];
    if (!SYSTEM.includes(name)) throw new FS.NoRule("SystemVerilog", `systemcall ${repr(name)}`, kindOf(node));
    if (name === "$sformatf") return this.sformatf(args);
    if (QUERIES.includes(name)) return this.query(name, args);
    if (name === "$countbits") return this.countbits(args);
    const expected = ["$pow", "$atan2", "$hypot"].includes(name) ? 2 : 1;
    if (args.length !== expected) throw new TypeError(`${name} takes ${expected} argument${expected > 1 ? "s" : ""}, got ${args.length}`);
    const argument = args[0];
    if (name === "$isunbounded") return new Logic(this.stored.named("bit"), BigInt(BOOLEAN(kindOf(argument) === X.DOLLAREXPRESSION))); // whether its argument is `$`
    if (name === "$bits") { // its argument's type's width, or a type's; the argument is not evaluated
      let ctype: SvType;
      if (!own(argument.term)) {
        const found = this.typeTerm(argument, "systemcall '$bits' of");
        if (found === null) throw new FS.NoRule("SystemVerilog", "systemcall '$bits' of keywordtype", kindOf(node));
        ctype = found;
      } else {
        ctype = this.numeric(argument, name);
      }
      return Logic.number(this.stored.named("integer"), BigInt(ctype.width));
    }
    const values = args.map((a) => this.value(a));
    if (MATH.includes(name)) return this.math(name, values);
    if (CONVERSIONS.includes(name)) return this.conversion(name, values[0]);
    return this.system(name, values[0]);
  }

  private system(name: string, value: unknown): Logic {
    if (!(value instanceof Logic)) throw new TypeError(`${name} expects an integral argument, got real`);
    if (name === "$signed" || name === "$unsigned") {
      return new Logic(Domains.vector(value.type.width, name === "$signed", value.type.states), value.aval, value.bval);
    }
    if (name === "$isunknown") return new Logic(this.stored.named("bit"), value.known ? 0n : 1n);
    const count = ones(parts(value)[0]);
    if (name === "$countones") return Logic.number(this.stored.named("integer"), BigInt(count));
    if (name === "$onehot" || name === "$onehot0") {
      return new Logic(this.stored.named("bit"), BigInt(BOOLEAN(count === 1 || (name === "$onehot0" && count === 0))));
    }
    if (!value.known) return unknownOf(this.stored.named("integer")); // $clog2
    const rest = value.aval > 0n ? value.aval - 1n : 0n;
    return Logic.number(this.stored.named("integer"), BigInt(rest === 0n ? 0 : rest.toString(2).length));
  }

  private reals(name: string, values: unknown[]): number[] {
    const real = this.stored.named("real");
    for (const value of values) {
      if (!(value instanceof Logic || typeof value === "number")) throw new TypeError(`${name} expects a number, got ${typeName(value)}`);
    }
    return values.map((value) => toReal(value, real));
  }

  /** A math function (20.8.2), as C's library computes it: a domain error NaN, a pole an infinity. */
  private math(name: string, values: unknown[]): number {
    const x = this.reals(name, values);
    if (name === "$pow") return realPower(x[0] as number, x[1] as number, this.stored.named("real"));
    return (MATH_FUNCTIONS[name.slice(1)] as (...x: number[]) => number)(...x);
  }

  /** A conversion (20.5): `$rtoi` truncates a real to an `integer`, `$itor` an integer to a real; `$realtobits` and
   * `$shortrealtobits` a real's encoding, of 64 and 32 bits, and `$bitstoreal` and `$bitstoshortreal` back. */
  private conversion(name: string, value: unknown): unknown {
    if (name === "$bitstoreal" || name === "$bitstoshortreal") {
      if (!(value instanceof Logic)) throw new TypeError(`${name} expects an integral argument, got real`);
      const format = name === "$bitstoreal" ? "binary64" : "binary32";
      return Ieee754.from_bits(format, value.aval & ~value.bval & mask(Ieee754.WIDTHS.get(format) as number));
    }
    if (name === "$itor") return toReal(convert(value, this.stored.named("integer")), this.stored.named("real"));
    const [real] = this.reals(name, [value]) as [number];
    if (name === "$rtoi") {
      if (!Number.isFinite(real)) throw new OverflowError(`${repr(real)} has no integer value`);
      return Logic.number(this.stored.named("integer"), BigInt(Math.trunc(real)));
    }
    const format = name === "$realtobits" ? "binary64" : "binary32";
    const encoded = format === "binary64" ? real : Ieee754.convert("binary64", real, "binary32", EVEN);
    return new Logic(Domains.vector(Ieee754.WIDTHS.get(format) as number), Ieee754.to_bits(format, encoded));
  }

  /** `$countbits(value, control...)`: how many of a value's bits are in the states its control bits name, each the
   * least significant bit of its control (20.9). */
  private countbits(args: any[]): Logic {
    if (args.length < 2) throw new TypeError(`$countbits takes 2 arguments or more, got ${args.length}`);
    const values = args.map((argument) => this.value(argument));
    for (const item of values) {
      if (!(item instanceof Logic)) throw new TypeError(`$countbits expects integral arguments, got ${typeName(item)}`);
    }
    const [value, ...controls] = values as Logic[];
    const states = new Set(controls.map((control) => control.bits[control.bits.length - 1]));
    return Logic.number(this.stored.named("integer"), BigInt([...(value as Logic).bits].filter((b) => states.has(b)).length));
  }

  /** An array query (20.7) of a value or a type: its dimensions, an array's or a queue's (its indexes from 0) then its
   * items', then a vector's packed `[width-1:0]`, or a type's as declared; a scalar has none. Of a dimension beyond
   * them, x. */
  private query(name: string, args: any[]): Logic {
    if (args.length < 1 || args.length > 2) throw new TypeError(`${name} takes 1 or 2 arguments, got ${args.length}`);
    const subject = args[0];
    const [dimensions, unpacked] = !own(subject.term) ? [this.declaredDimensions(subject, name), 0]
      : dimensionsOf(this.value(subject), this.stored);
    const integer = this.stored.named("integer");
    if (name === "$dimensions" || name === "$unpacked_dimensions") {
      return Logic.number(integer, BigInt(name === "$dimensions" ? dimensions.length : unpacked));
    }
    const dimension = args.length === 2 ? this.constant(args[1], `${name}'s dimension`) : 1n;
    if (dimension < 1n || dimension > BigInt(dimensions.length)) return unknownOf(integer);
    const [left, right, size] = dimensions[Number(dimension) - 1] as [bigint, bigint, bigint];
    const increment = left >= right ? 1n : -1n;
    const found: Record<string, bigint> = { $left: left, $right: right, $low: increment === 1n ? right : left,
      $high: increment === 1n ? left : right, $increment: increment, $size: size };
    return Logic.number(integer, found[name] as bigint);
  }

  /** A type's packed dimensions, as declared (a keyword's `[width-1:0]`; a scalar's, none). */
  private declaredDimensions(target: any, name: string): [bigint, bigint, bigint][] {
    if (kindOf(target) === VECTOR && (target.dimensions ?? []).length > 0) {
      return target.dimensions.map((dimension: any) => {
        if (kindOf(dimension) !== "rangedimension") { // an unpacked or a queue's dimension: no vector's
          throw new FS.NoRule("SystemVerilog Types", kindOf(dimension), kindOf(dimension));
        }
        const [left, right] = [dimension.left, dimension.right].map((bound: any) => this.constant(bound, "a dimension's bound")) as [bigint, bigint];
        return [left, right, (left > right ? left - right : right - left) + 1n];
      });
    }
    const ctype = this.typeTerm(target, `systemcall ${repr(name)} of`);
    if (ctype === null || ctype.kind === "real" || kindOf(target) === VECTOR) return [];
    return [[BigInt(ctype.width - 1), 0n, BigInt(ctype.width)]];
  }

  /** `$sformatf(format, ...)`: the string its format writes of its arguments (21.3.3, see `Formats`). */
  private sformatf(args: any[]): Logic {
    if (args.length === 0) throw new TypeError("$sformatf takes 1 argument or more, got 0");
    const values = args.map((argument) => this.value(argument));
    if (!(values[0] instanceof Logic)) throw new TypeError(`$sformatf's format is a string, not a ${typeName(values[0])}`);
    const format = Formats.text(values[0]);
    const letter = Formats.unwritten(format);
    if (letter !== null) throw new FS.NoRule("SystemVerilog", `systemcall '$sformatf' %${letter}`, X.SYSTEMCALL);
    return Formats.vector(Formats.sformatf(format, values.slice(1).map((value) => this.formatted(value))));
  }

  /** An argument of `$sformatf`: an array's items typed, as an assignment pattern writes them. */
  private formatted(value: unknown): unknown {
    return Array.isArray(value) ? value.map((item) => this.formatted(item)) : typed(value, this.stored);
  }

  /** An array element's type: it must be integral or real. */
  elementType(value: unknown): SvType {
    const ctype = typeOfValue(value, this.stored);
    if (ctype === null) throw new TypeError(`an array's elements must be numbers, got ${typeName(value)}`);
    return ctype;
  }
}

/** The math functions of C's library, as JavaScript's `Math` computes them (a domain error NaN, a pole an infinity). */
const MATH_FUNCTIONS: Record<string, (...x: number[]) => number> = {
  ln: Math.log, log10: Math.log10, exp: Math.exp, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil, sin: Math.sin,
  cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2, hypot: Math.hypot,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
};

/** A value's dimensions, each its left and right bounds and its size, and how many are unpacked: an array's or a
 * queue's first (`[0:n-1]`, `[0:-1]` empty), then its first item's; a vector's `[width-1:0]`, but a scalar's (a `bit`,
 * a `logic`, a `reg`) none. */
function dimensionsOf(value: unknown, types: Types): [[bigint, bigint, bigint][], number] {
  const found = typed(value, types);
  if (Array.isArray(found)) {
    const [inner, unpacked] = found.length > 0 ? dimensionsOf(found[0], types) : [[], 0] as [[bigint, bigint, bigint][], number];
    return [[[0n, BigInt(found.length - 1), BigInt(found.length)], ...inner], unpacked + 1];
  }
  if (found instanceof Logic && !["bit", "logic", "reg"].includes(found.type.label)) {
    return [[[BigInt(found.type.width - 1), 0n, BigInt(found.type.width)]], 0];
  }
  return [[], 0];
}

/** A string's leading integer in a base (6.16.9): an optional sign, then its digits and underscores, up to the first
 * other character; 0 if it has none. */
function atoi(text: string, base: number): bigint {
  const digits = "0123456789abcdef".slice(0, base);
  const [sign, rest] = text[0] === "-" ? [-1n, text.slice(1)] : text[0] === "+" ? [1n, text.slice(1)] : [1n, text];
  let value = 0n;
  for (const character of rest) {
    if (character === "_") continue;
    const digit = digits.indexOf(character.toLowerCase());
    if (digit < 0) break;
    value = value * BigInt(base) + BigInt(digit);
  }
  return sign * value;
}

/** A string's leading real (6.16.9): a decimal number with an optional fraction and exponent, underscores ignored; 0
 * if it has none. */
function atoreal(text: string): number {
  const written = (REAL.exec(text) as RegExpExecArray)[0].replace(/_/g, "");
  return /\d/.test(written.split(/[eE]/)[0] as string) ? Number(written) : 0.0;
}

/** Whether two elements are identical, as `===` compares them: of one value, bit for bit, x and z too. */
function identical(a: unknown, b: unknown): boolean {
  if (a instanceof Logic && b instanceof Logic) return a.aval === b.aval && a.bval === b.bval;
  return typeof a === typeof b && a === b;
}

/** A member's value: a list as an array of its items, lists of lists too. */
function array(value: unknown): unknown {
  return value instanceof Objects.Listed ? value.values.map(array) : value;
}

/** A real power as C's `pow` gives it, in the format of `ctype`. */
function realPower(base: number, exponent: number, ctype: SvType): number {
  // C's pow, where JavaScript's differs: 1 to any power, and -1 to an infinite one, is 1
  const result = base === 1 || (base === -1 && !Number.isFinite(exponent)) ? 1 : Math.pow(base, exponent);
  return ctype.format === "binary32" ? Ieee754.convert("binary64", result, "binary32", EVEN) as number : result;
}

// --- What may fold, sized from the whole expression (11.6) ---

/** A type the scope does not determine. */
const UNKNOWN_TYPE = Symbol("unknown type");
/** How a subterm folds whose literal of its own type means what it does wherever it stands. */
const OWN_TYPE = Symbol("own type");
/** How a subterm of a term no rule reads folds: alone, where its own type's literal is its value wherever it stands. */
const DEFAULT = Symbol("default");
/** How a term folds that is not a subterm of the expression being simplified: as a root. */
const ROOT = Symbol("root");
/** How a subterm folds whose type no literal has: into a cast of a literal to `type`, of its value in that type. */
class Cast {
  constructor(readonly type: SvType) {}
}

/** A value folded where only a cast of a literal keeps its type: its `value`, and its `type`. */
class Typed {
  constructor(readonly value: unknown, readonly type: SvType) {}
}

/** The kinds that have no value of their own, but within the kind that holds them. */
const NEVER: ReadonlySet<string> = new Set([X.NAMEDCONNECTION, X.EMPTYARGUMENT, X.VALUERANGE, X.DOLLAREXPRESSION,
  X.PATTERNITEM]);

type Position = SvType | null | typeof UNKNOWN_TYPE;
type How = SvType | Cast | null | typeof OWN_TYPE | typeof DEFAULT | typeof ROOT;
type Child = [any, Evaluation, Position, boolean];

/** How each subterm of an expression may fold, as 11.6 sizes it from the whole expression in a scope: `how` gives, by
 * its term, null (it stays), `OWN_TYPE` (into its own type's literal), a type (into the literal of its value in that
 * context), or `DEFAULT`; `owned` its self-determined type, where the scope determines it. */
class Sizing {
  readonly how = new Map<object, How>();
  readonly owned = new Map<object, SvType | null | typeof UNKNOWN_TYPE>();

  constructor(root: Node, evaluation: Evaluation) {
    this.visit(root, evaluation, null, false);
    for (const term of F.walk(root.term)) { // a type or a pattern has no value of its own: it stays, as what reads it
      const valueless = ["SystemVerilog Types", "SystemVerilog Patterns"].includes(X.DIALECT.owner(term).name());
      if (!this.how.has(term)) this.how.set(term, valueless ? null : DEFAULT);
    }
  }

  /** A term's type, or `UNKNOWN_TYPE` where the scope does not determine it: any error is read so, and thrown again
   * where the term is folded, if it is. */
  private static typeOf(evaluation: Evaluation, node: any): SvType | null | typeof UNKNOWN_TYPE {
    try {
      return evaluation.type(node);
    } catch {
      return UNKNOWN_TYPE;
    }
  }

  /** Note how a term at a position may fold, and visit its subterms: `context` the type its context gives it (null where
   * it is self-determined, `UNKNOWN_TYPE` where the scope does not determine it), `sensitive` whether its type's states
   * or format could change what stays around it (where it is self-determined). */
  private visit(node: any, evaluation: Evaluation, context: Position, sensitive: boolean): void {
    const found = Sizing.typeOf(evaluation, node);
    this.owned.set(node.term, found);
    this.how.set(node.term, Sizing.decide(node, found, context, sensitive));
    const target = context ?? found;
    for (const [child, inner, position, delicate] of this.children(node, evaluation, target, context, sensitive)) {
      if (child !== null) this.visit(child, inner, position, delicate);
    }
  }

  private static decide(node: any, found: SvType | null | typeof UNKNOWN_TYPE, context: Position, sensitive: boolean): How {
    if (NEVER.has(kindOf(node)) || found === UNKNOWN_TYPE || matched(node.term).size > 0) return null; // a `matches` that binds stays
    if (transparent(node)) { // its value is its context's: of the context's type, when it is known
      const folded = context ?? found;
      if (folded === UNKNOWN_TYPE || folded === null) return null;
      if (representable(folded) || !sensitive) return folded;
      return castable(folded) ? new Cast(folded) : null;
    }
    if (found === null || representable(found) || (context === null && !sensitive)) return OWN_TYPE;
    if (context !== null && context !== UNKNOWN_TYPE && representable(context)) return context;
    return castable(found) ? new Cast(found) : null; // its own type's cast means what it does wherever it stands
  }

  /** The type context-determined operands share, if the scope determines each one's. */
  private shared(evaluation: Evaluation, nodes: any[]): Position {
    const types = nodes.map((node) => Sizing.typeOf(evaluation, node));
    return types.some((t) => t === UNKNOWN_TYPE || t === null) ? UNKNOWN_TYPE : Domains.common(types as SvType[]);
  }

  /** A term's subterms, each with the evaluation it is read in, the context it takes, and its sensitivity. */
  private children(node: any, ev: Evaluation, target: Position, context: Position, sensitive: boolean): Child[] {
    const kind = kindOf(node);
    const selfDetermined = (...children: any[]): Child[] => children.map((child) => [child, ev, null, false]);
    if (kind === X.PARENTHESIZEDEXPRESSION) return [[node.expression, ev, context, sensitive]];
    if (kind === X.MINTYPMAXEXPRESSION) {
      return [node.min, node.typ, node.max].map((child) => [child, ev, child === ev.chosen(node) ? context : UNKNOWN_TYPE, true]);
    }
    if (kind === X.UNARYEXPRESSION) {
      return ["+", "-", "~"].includes(node.operator) ? [[node.operand, ev, context, sensitive]] : selfDetermined(node.operand);
    }
    if (kind === X.BINARYEXPRESSION) {
      const op = node.operator;
      if (LOGICAL.includes(op)) return selfDetermined(node.left, node.right);
      if (COMPARISONS.includes(op)) {
        const shared = this.shared(ev, [node.left, node.right]);
        return [[node.left, ev, shared, true], [node.right, ev, shared, true]];
      }
      if (SHIFTS.includes(op) || (op === "**" && target !== UNKNOWN_TYPE && (target as SvType).kind === "integral")) {
        return [[node.left, ev, target, true], ...selfDetermined(node.right)];
      }
      return [[node.left, ev, target, true], [node.right, ev, target, true]];
    }
    if (kind === X.CONDITIONALEXPRESSION) {
      let branch: Evaluation;
      try {
        branch = ev.branch(node.condition);
      } catch {
        branch = ev.within(new Map([...matched(node.condition.term)].map((name) => [name, null])), true);
      }
      return [...selfDetermined(node.condition), [node.consequence, branch, target, true], [node.alternative, ev, target, true]];
    }
    if (kind === X.INSIDEEXPRESSION) {
      let shared: Position;
      try {
        shared = ev.insideType(node, ev.insideItems(node));
      } catch {
        shared = UNKNOWN_TYPE;
      }
      const ends = node.set.filter((item: any) => kindOf(item) === X.VALUERANGE).flatMap((item: any) => [item.left, item.right]);
      return [node.value, ...node.set, ...ends].map((child) => [child, ev, shared, true]);
    }
    if (kind === X.CONCATENATION || kind === X.REPLICATION) {
      return [...selfDetermined(kind === X.REPLICATION ? node.count : null), ...node.items.map((item: any) => [item, ev, null, true])];
    }
    if (kind === X.INDEXEXPRESSION) return [[node.value, ev, null, true], ...selfDetermined(node.index)];
    if (kind === X.RANGESELECT) return [[node.value, ev, null, true], ...selfDetermined(node.left, node.right)];
    if (kind === X.MEMBEREXPRESSION) return [[node.value, ev, null, true]];
    if (kind === X.CASTEXPRESSION) {
      let position: Position;
      try {
        position = ev.castContext(node);
      } catch {
        position = UNKNOWN_TYPE;
      }
      return [...this.typeTerms(node.type, ev), [node.value, ev, position, true]];
    }
    if (kind === X.SYSTEMCALL) {
      const delicate = node.name === "$signed" || node.name === "$unsigned";
      return node.arguments.flatMap((argument: any) => [[argument, ev, null, delicate], ...this.typeTerms(argument, ev)]);
    }
    if (kind === X.CALLEXPRESSION) {
      const callee = node.callee; // a function's name or a method's member: no value of its own
      this.how.set(callee.term, null);
      const found: Child[] = kindOf(callee) === X.MEMBEREXPRESSION ? [[callee.value, ev, null, true]] : [];
      for (const argument of node.arguments) {
        found.push([argument, ev, null, true]);
        if (kindOf(argument) === X.NAMEDCONNECTION) found.push([argument.value, ev, null, true]);
      }
      return found;
    }
    if (kind === X.ARRAYMETHODWITHEXPRESSION) {
      const iterator = X.arrayMethodScopes(F.kindOf(node.term)[1])[1] as ReadonlySet<string>;
      const call = node.value;
      this.how.set(call.term, null); // the method's call, its iterator its argument
      const inner = ev.within(new Map([...iterator].map((name) => [name, null])), true);
      const found: Child[] = [];
      if (kindOf(call) === X.CALLEXPRESSION) {
        this.how.set(call.callee.term, null);
        if (kindOf(call.callee) === X.MEMBEREXPRESSION) found.push([call.callee.value, ev, null, true]);
      }
      return [...found, [node.body, inner, null, true]];
    }
    if (kind === X.MATCHESEXPRESSION) {
      let pattern = node.pattern;
      while (kindOf(pattern) === PARENTHESIZED_PATTERN) {
        this.how.set(pattern.term, null);
        pattern = pattern.pattern;
      }
      if (!own(pattern.term)) return selfDetermined(node.value); // a variable, a wildcard, a tagged or structure pattern
      return [...selfDetermined(node.value), [pattern, ev, this.shared(ev, [node.value, pattern]), true]];
    }
    if (kind === X.PREDICATEEXPRESSION) {
      const found: Child[] = [];
      let inner = ev;
      for (const condition of node.conditions) {
        found.push([condition, inner, null, false]);
        try {
          const bound = inner.bindings(condition);
          if (bound.size > 0) inner = inner.within(bound);
        } catch {
          inner = inner.within(new Map([...matched(condition.term)].map((name) => [name, null])), true);
        }
      }
      return found;
    }
    if (kind === X.STREAMINGCONCATENATION) {
      let found: Child[] = node.slice === null ? [] : own(node.slice.term) ? selfDetermined(node.slice) : this.typeTerms(node.slice, ev);
      for (const item of node.items) found = [...found, [item.expression, ev, null, true], ...selfDetermined(item.left, item.right)];
      return found;
    }
    if (kind === X.NAMEDCONNECTION) return [[node.value, ev, null, true]];
    return own(node.term) ? [] : this.typeTerms(node, ev);
  }

  /** A type's terms: its dimensions' bounds, each self-determined; a type stays, as the term that reads it. */
  private typeTerms(node: any, evaluation: Evaluation): Child[] {
    if (own(node.term)) return [];
    this.how.set(node.term, null);
    const dimensions: any[] = Array.isArray(node.dimensions) ? node.dimensions : [];
    return dimensions.filter((dimension) => kindOf(dimension) === "rangedimension")
      .flatMap((dimension) => [dimension.left, dimension.right]).map((bound) => [bound, evaluation, null, false]);
  }
}

/** SystemVerilog's folding rules: a term's value in a scope, by IEEE 1800's rules, the term's structure validated first
 * (its references resolve as they go). The root of a simplification is computed at its own type; each other subterm
 * as its sizing in the whole expression allows (`Sizing`), computed once the root has not folded. */
class Rules implements FS.Rules {
  readonly dialect = X.DIALECT;
  private fresh = false; // whether the next term evaluated is a simplification's root
  private root: [Node, Evaluation] | null = null;
  private sizing: Sizing | null = null;

  scope(variables: S.Bindings): Scope {
    return new Scope(variables);
  }

  /** Whether a subterm may fold: the root, and a subterm whose literal would mean what it does where it stands. */
  readonly folds = (node: any, root: boolean): boolean => {
    if (root) {
      [this.fresh, this.root, this.sizing] = [true, null, null];
      return true;
    }
    return this.howOf(node) !== null;
  };

  private howOf(node: any): How {
    if (this.root === null) return ROOT;
    this.sizing ??= new Sizing(...this.root);
    return this.sizing.how.has(node) ? this.sizing.how.get(node) as How : ROOT;
  }

  evaluate(node: any, scope: any): unknown {
    if (this.fresh) { // the root of a simplification, its evaluation kept for its sizing
      this.fresh = false;
      this.root = Rules.read(node, scope);
      return this.root[1].value(this.root[0]);
    }
    let how = this.howOf(node);
    const [wrapped, evaluation] = Rules.read(node, scope);
    if (how === ROOT) return evaluation.value(wrapped);
    if (how === DEFAULT) {
      const found = evaluation.type(wrapped);
      if (transparent(wrapped) || (found !== null && !(representable(found) || castable(found)))) {
        throw new InContext(String(F.kindOf(node)[0]));
      }
      how = found === null || representable(found) ? OWN_TYPE : new Cast(found);
    }
    if (how instanceof Cast) return new Typed(evaluation.value(wrapped, how.type), how.type);
    return plain(evaluation.value(wrapped, how === OWN_TYPE ? null : how as SvType));
  }

  private static read(node: any, scope: any): [Node, Evaluation] {
    const invalid = [...F.walk(node)].find((n) => F.INVALID_KINDS.has(F.kindOf(n)[0]));
    if (invalid !== undefined) { // invalid syntax: no rule, named by its owner, as every dialect names it
      throw new FS.NoRule(X.DIALECT.owner(invalid).name(), F.kindOf(invalid)[0], F.kindOf(invalid)[0]);
    }
    const problems = X.DIALECT.validate(node, S.free(node, X.DIALECT));
    if (problems.length > 0) throw new ValueError(`cannot simplify an invalid expression: ${problems[0]}`);
    return [new Node(node), new Evaluation(scope, new Types(node))];
  }

  /** What does not depend on a subterm that stays: `&&` and `||` by an operand that decides them, `->` by a true
   * consequent, and a conditional by a known condition that binds nothing, where the branch it keeps has its own type. */
  readonly simplify = (node: any, results: FS.Result[]): FS.Result | null => {
    const [tag, record] = F.kindOf(node);
    const operator = F.attributesOf(record).get("operator");
    if (tag === X.BINARYEXPRESSION && ["&&", "||", "->"].includes(operator)) {
      const decisive = operator === "&&" ? 0 : 1;
      const operands = operator === "->" ? results.slice(1) : results;
      if (operands.some((result) => result.known && truth(result.value) === decisive)) return SIMPLIFIER.known(node, bit(decisive));
    }
    if (tag === X.CONDITIONALEXPRESSION && (results[0] as FS.Result).known && this.sizing !== null) {
      const [, consequence, alternative] = F.argumentsOf(record);
      const t = truth((results[0] as FS.Result).value);
      const sizing = this.sizing;
      const owned = (term: unknown) => sizing.owned.get(term as object) ?? UNKNOWN_TYPE; // a term no sizing visited: unknown
      const kept = t === 1 ? consequence : t === 0 ? alternative : null; // a condition that binds names never folds
      const found = kept === null ? UNKNOWN_TYPE : owned(kept);
      if (found !== UNKNOWN_TYPE && found.equals(owned(node))) return (t === 1 ? results[1] : results[2]) as FS.Result;
    }
    return null;
  };
}

/** A subterm's value, its type's name dropped, so that its literal is of its type's width, signedness and states. */
function plain(value: unknown): unknown {
  if (value instanceof Logic && value.type.label) {
    return new Logic(Domains.vector(value.type.width, value.type.signed, value.type.states), value.aval, value.bval);
  }
  return value;
}

/** The literal of a value: a real's; an `integer`'s (a signed 4-state value of 32 bits), or a `longint`'s, an unsized
 * decimal integer; any other integral value's, a sized vector of its bits and signedness (of 4 states: a 2-state
 * value's type is not kept); `null`'s, the constant; none for an object or an array. */
function literalOf(value: unknown): unknown {
  if (typeof value === "number") return X.literal(value);
  if (value === null) return new X.Writer((u: any) => u.constant((r: any) => r.singleton("null")));
  if (!(value instanceof Logic)) return null;
  const integer = value.type.width === 32 && value.type.signed && value.type.states === 4; // `integer`'s, by any name
  if (value.known && (integer || value.type.label === "longint")) return X.literal(value.integer());
  return X.vector(value.bits, value.type.signed);
}

/** A type of `SystemVerilog Types` its keyword names (`int`, `bit`, `shortreal`), as a cast's type. */
function keywordType(tag: string, keyword: string): unknown {
  return (t: any) => t[tag]((n: any) => n.keyword(keyword));
}

/** The real with the fewest significant digits that a cast to `shortreal` rounds to the `shortreal` value. */
function shortest(value: number): number {
  if (!Number.isFinite(value)) return value;
  let precision = 0; // 17 significant digits spell any binary64 value, and a `shortreal` is one: the search ends
  while (Ieee754.convert("binary64", Number(Formats.real("e", value, precision)), "binary32", EVEN) !== value) precision++;
  return Number(Formats.real("e", value, precision));
}

/** The closed constructor expression of a value whose type no literal has: a cast of a literal to its type (6.24.1),
 * `int'(5)`, `bit'(1'b1)`, `shortreal'(0.1)`; to a keyword's type of the other signedness, that cast's signing,
 * `unsigned'(int'(-1))`. Null for any other value. */
function construct(value: unknown): unknown {
  if (!(value instanceof Typed)) return null;
  const ctype = value.type;
  if (ctype.kind === "real") return X.cast(keywordType(NONINTEGER, "shortreal"), X.literal(shortest(value.value as number)));
  const [keyword, signed] = ATOMS.get(ctype.width) as [string, boolean];
  const operand = literalOf(new Logic(Domains.vector(ctype.width, signed, 4), (value.value as Logic).aval));
  const written = X.cast(keywordType(keyword === "bit" ? VECTOR : ATOM, keyword), operand);
  if (signed === ctype.signed) return written;
  const signing = ctype.signed ? "signed" : "unsigned";
  return X.cast((t: any) => t.implicittype((i: any) => i.signing(signing)), written);
}

const each = (prefix: string, ...kinds: string[]): string[] => kinds.map((kind) => `${prefix} ${kind}`);
const classes = (category: string, ...whats: string[]): [string, string][] => whats.map((what) => [what, category]);

/** The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given): what
 * has no value of its own (`b`: a part of the kind that holds it, a type, a pattern, a directive); what waits on domain
 * inference (`c`: an assignment pattern, a tagged union, a structure's or an enumeration's type, an enumeration's
 * methods); what needs mbse-programs or a simulator (`d`: a write, a class, the design hierarchy, a typedef's name, a
 * system function that reads a simulator's state or acts, an array's or a string's method that writes it). What stays
 * by the rules, not for want of one, names no residue: a name or a function the scope does not provide; a time literal
 * with no time unit in the scope is a residue of class `a`, its unit a parameter of simplification the scope may give;
 * and a subterm whose context's type is not known, or whose own type neither a literal nor a cast of a literal has,
 * where its states could change what stays around it, stays as written, since a literal of another type would change
 * the residual's meaning (11.6). */
export const CATEGORIES: Record<string, Record<string, string>> = {
  SystemVerilog: Object.fromEntries([
    ...classes("b", "valuerange", "patternitem", "namedconnection", "emptyargument", "castexpression to implicittype",
      "systemcall '$bits' of keywordtype"),
    ...classes("c", "assignmentpattern", "taggedexpression", "newarrayexpression", "randomizewithexpression",
      "matchesexpression taggedpattern", "matchesexpression structurepattern", "systemcall '$typename'",
      "systemcall '$sformatf' %p of an object",
      ...each("castexpression to", "structtype", "enumtype", "typereference"),
      ...each("systemcall '$bits' of", "structtype", "enumtype", "typereference", "namedtype"),
      ...["first", "last", "next", "prev", "num", "name"].map((name) => `callexpression method '${name}'`)),
    ...classes("d", "superexpression", "newexpression", "newcopyexpression", "rootexpression", "incrementexpression",
      "assignmentexpression", "scopedname", "systemcall", "systemcall '$cast'", "callexpression of a class handle's method",
      ...["nameexpression", "callexpression"].flatMap((kind) => each(`${kind} of a`, "localname", "parameterizedname",
        "interfacetypename", "interfacemethodname", "unitname", "superexpression")),
      ...each("castexpression to", "namedtype", "virtualinterfacetype", "keywordtype"),
      ...["t", "m", "l", "v"].map((letter) => `systemcall '$sformatf' %${letter}`),
      ...["sort", "rsort", "reverse", "shuffle", "push_back", "push_front", "pop_back", "pop_front", "insert", "delete",
        "putc", "itoa", "hextoa", "octtoa", "bintoa", "realtoa"].map((name) => `callexpression method '${name}'`)),
  ]),
  "SystemVerilog Types": { "*": "b" }, "SystemVerilog Patterns": { "*": "b" }, "SystemVerilog Assertions": { "*": "d" },
  "SystemVerilog Constraints": { solvebeforeconstraint: "b", disablesoftconstraint: "b" },
  "SystemVerilog Preprocessor": { "*": "b", macrousage: "d" },
};

/** The folding rules of the SystemVerilog dialect. */
export const RULES = new Rules();

/** The simplifier of the SystemVerilog dialect. */
export const SIMPLIFIER = new FS.Simplifier(RULES, { literal: literalOf, construct, categories: CATEGORIES, folds: RULES.folds,
  simplify: RULES.simplify,
  // what IEEE 1800 may never evaluate (11.4.7, 11.4.11): the right operand, by the left; the branches, by the condition
  guarded: FS.guards(X.DIALECT, { "&&": [1], "||": [1], "->": [1], [X.CONDITIONALEXPRESSION]: [1, 2] }) });

/** The simplification of an expression in `scope`, or with the variables in an object bound: folded into a literal
 * when the scope determines it, its value a `Logic`, a number, null (`null`), an array or an object. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): FS.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
