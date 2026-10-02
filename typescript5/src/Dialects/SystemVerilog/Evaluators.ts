/**
 * Evaluators of the SystemVerilog dialect: compute an expression by IEEE 1800's rules, in TypeScript.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates in a `new Scope(variables, { functions })` and gives a
 * `Domains.Logic` for an integral result or a number for a real one. A variable's type is its value's: a `Logic` its
 * own, a boolean a `bit`, a bigint an `integer` (or a `longint` beyond 32 bits), a number a `real`, a string a vector of
 * its bytes (in UTF-8), and a Basic typed value (`Domains.Value`) of an integer domain a 2-state vector of its width and
 * signedness, of bits a 2-state vector, of std_logic a `logic` bit (U, X, W and - as x, L as 0, H as 1), and of a
 * binary IEEE 754 format a `real` or `shortreal`. IEEE 1800's rules apply:
 *
 * - Sizing: an operator's operands are context-determined or self-determined (11.6); the context-determined ones are
 *   extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
 *   context-determined operands are), and zero-extended otherwise. A real operand makes the expression real.
 * - 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the
 *   bitwise operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and
 *   `!=?` treat x and z in the right operand as wildcards. Division by zero gives x.
 * - `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
 *   otherwise x); a conditional with an x condition merges its operands bit by bit.
 * - `inside` holds when the value equals (`==?`) an item, an element of an array among the items, or lies in a span;
 *   otherwise it is x when a comparison is.
 * - A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a
 *   2-state type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), and an integer becomes
 *   a real.
 * - `select` gives a bit (x out of range, or for an x index) or an array's element; `range` bits `[msb:lsb]`.
 * - System functions: `$signed`, `$unsigned`, `$clog2`, `$bits`, `$countones`, `$onehot`, `$onehot0`, `$isunknown`;
 *   other functions are the scope's, and nothing else.
 * - Array methods: `size()` is an `int`; `sum()`, `product()`, `and()`, `or()` and `xor()` reduce the items, or the
 *   values of a `with` clause, in their common type by `+`, `*`, `&`, `|` and `^` (x and z as those operators take
 *   them); of no items they give 0, 1, `1'b1`, `1'b0` and `1'b0`. `min()` and `max()` give a queue of the least or
 *   greatest item (none when there are none), and `unique()` a queue of the first of each set of identical (`===`)
 *   items.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import { NameError, OverflowError } from "../../Framework/Errors.js";
import * as S from "../../Framework/Symbolics.js";
import * as BD from "../Basic/Domains.js";
import * as Ieee754 from "../Basic/Ieee754.js";
import { isMapping } from "../Matlab/Domains.js";
import * as Domains from "./Domains.js";
import * as X from "./Expressions.js";
import { Logic, SvType } from "./Domains.js";

const { KeyError, ValueError } = Errors;
const { repr, typeName } = Repr;
type Fn = (...args: any[]) => unknown;

const EVEN = "roundTiesToEven";
const ONE = Domains.vector(1);

/** SystemVerilog's scope for an expression: `variables`, and the `functions` it may call. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn>;

  constructor(variables: S.Bindings = {}, options: { functions?: Record<string, Fn> } = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
  }

  override unbound(reference: any): never {
    throw new NameError(`identifier '${reference.name}' is not declared`);
  }

  function(name: string): Fn {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new NameError(`function '${name}' is not declared`);
    return fn;
  }
}

const STD_LOGIC: Record<string, string> = { 0: "0", 1: "1", Z: "z", L: "0", H: "1" };

function fromBytes(data: Uint8Array): bigint {
  return data.reduce((total, byte) => (total << 8n) | BigInt(byte), 0n);
}

/** A variable's value as SystemVerilog has it: a `Logic`, a number, or an object. */
function typed(value: unknown): unknown {
  if (value instanceof Logic || typeof value === "number") return value;
  if (typeof value === "boolean") return new Logic(Domains.Bit, value ? 1n : 0n);
  if (typeof value === "bigint") {
    const ctype = Domains.of(value);
    if (!(ctype instanceof SvType)) throw new OverflowError(`integer ${value} is too large for any type`);
    return Logic.number(ctype, value);
  }
  if (typeof value === "string") { // its bytes, in UTF-8
    const data = new TextEncoder().encode(value);
    return new Logic(Domains.vector(8 * Math.max(data.length, 1)), fromBytes(data));
  }
  if (value instanceof BD.Value) {
    const domain: any = value.domain;
    if (domain instanceof BD.OfInteger.Data && domain.width) {
      return Logic.number(Domains.vector(Number(domain.width), domain.signed, 2), value.value as bigint);
    }
    if (domain instanceof BD.OfBits.Data) return new Logic(Domains.vector(Number(domain.width), false, 2), fromBytes(value.value as Uint8Array));
    if (domain instanceof BD.OfIeee1164.Data) return Logic.of(STD_LOGIC[value.value as string] ?? "x");
    if (domain instanceof BD.OfIeee754.Data && ["binary32", "binary64"].includes(domain.format)) return value.value;
    throw new TypeError(`${domain.name()} has no SystemVerilog type`);
  }
  return value;
}

function typeOfValue(value: unknown): SvType | null {
  if (value instanceof Logic) return value.type;
  return typeof value === "number" ? Domains.Real : null;
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

// --- The evaluation ---

const kindOf = (node: any): string => node.kind().KIND;
const COMPARISONS = ["<", "<=", ">", ">=", "==", "!=", "===", "!==", "==?", "!=?"];
const SHIFTS = ["<<", ">>", "<<<", ">>>"];

/** One evaluation in a scope: each node's self-determined type, then its value in a context. */
class Evaluation {
  private readonly types = new Map<object, SvType | null>();
  private readonly values = new Map<object, unknown>();

  constructor(readonly scope: Scope) {}

  /** The node's self-determined type (null for an object). */
  type(node: any): SvType | null {
    if (!this.types.has(node)) this.types.set(node, this.typeOf(node));
    return this.types.get(node) as SvType | null;
  }

  private integral(node: any, what: string): SvType {
    const ctype = this.numeric(node, what);
    if (ctype.kind !== "integral") throw new TypeError(`${what} expects an integral operand, got ${ctype.name()}`);
    return ctype;
  }

  private numeric(node: any, what: string): SvType {
    const ctype = this.type(node);
    if (ctype === null) throw new TypeError(`${what} expects a number, got ${typeName(this.own(node))}`);
    return ctype;
  }

  private typeOf(node: any): SvType | null {
    const kind = kindOf(node);
    if (["constant", "vector", "identifier", "member", "select", "call", "method", "iterate"].includes(kind)) return typeOfValue(this.own(node));
    if (kind === "unary") {
      if (node.operator === "+" || node.operator === "-") return this.type(node.operand);
      if (node.operator === "~") return this.integral(node.operand, "~");
      return ONE;
    }
    if (kind === "binary") {
      const op = node.operator;
      if (["<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->", "==?", "!=?"].includes(op)) return ONE;
      if (op === "===" || op === "!==") return Domains.Bit;
      if (SHIFTS.includes(op)) return this.integral(node.left, op);
      const [left, right] = [this.numeric(node.left, op), this.numeric(node.right, op)];
      if (op === "**" && left.kind !== "real" && right.kind !== "real") return left; // its exponent is self-determined
      return Domains.common([left, right]);
    }
    if (kind === "conditional") return Domains.common([this.numeric(node.consequent, "?:"), this.numeric(node.alternative, "?:")]);
    if (["concatenation", "replication", "range"].includes(kind)) return typeOfValue(this.own(node));
    if (kind === "inside") return ONE;
    const operand = this.numeric(node.operand, "a cast"); // a cast
    if (node.width !== null) return Domains.vector(Number(node.width), operand.signed, operand.states);
    if (node.type === "signed" || node.type === "unsigned") {
      const integral = this.integral(node.operand, `${node.type}'`);
      return Domains.vector(integral.width, node.type === "signed", integral.states);
    }
    return Domains.TYPES.get(node.type) as SvType;
  }

  /** A self-determined node's value, of its own type, once. */
  own(node: any): unknown {
    if (!this.values.has(node)) this.values.set(node, this.ownOf(node));
    return this.values.get(node);
  }

  private ownOf(node: any): unknown {
    switch (kindOf(node)) {
      case "constant": return typed(node.value);
      case "vector": return Logic.of(node.value, Boolean(node.signed));
      case "identifier": return typed(this.scope.lookup(node));
      case "member": return this.member(node);
      case "select": return this.select(node);
      case "range": return this.range(node);
      case "concatenation": return this.concatenation(node.parts.map((part: any) => this.value(part)));
      case "replication": return this.replication(node);
      case "method": return this.method(node);
      case "iterate": {
        const items = this.items(this.value(node.array), `${node.method}()`);
        return this.reduce(node.method, items.map((item) => new Evaluation(this.scope.bind(node.name, item)).value(node.body)));
      }
      default: return this.call(node);
    }
  }

  /** The node's value in a context: its own type's, unless the context gives another. */
  value(node: any, context: SvType | null = null): unknown {
    const ctype = this.type(node);
    const target = (context ?? ctype) as SvType;
    const kind = kindOf(node);
    if (kind === "unary" && ["+", "-", "~"].includes(node.operator)) return this.unary(node.operator, this.value(node.operand, target), target);
    if (kind === "binary") return this.binary(node, target);
    if (kind === "conditional") return this.conditional(node, target);
    const result = this.selfDetermined(node);
    if (ctype === null) return result; // an object, an array
    return convert(result, target, ctype.signed && target.signed); // sign-extended only in a signed context
  }

  private selfDetermined(node: any): unknown {
    const kind = kindOf(node);
    if (kind === "unary") return this.reduction(node.operator, this.value(node.operand));
    if (kind === "inside") return this.inside(node);
    if (kind === "cast") return convert(this.value(node.operand), this.type(node) as SvType);
    return this.own(node);
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
    if (["&&", "||", "->", "<->"].includes(op)) return convert(this.logical(op, node), target, false);
    if (COMPARISONS.includes(op)) {
      const shared = Domains.common([this.type(node.left) as SvType, this.type(node.right) as SvType]);
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

  private compare(op: string, left: any, right: any, shared: SvType): Logic {
    let order: number;
    if (shared.kind === "real") {
      if (Number.isNaN(left) || Number.isNaN(right)) return bit(BOOLEAN(["!=", "!==", "!=?"].includes(op)));
      order = BOOLEAN(left > right) - BOOLEAN(left < right);
    } else if (op === "===" || op === "!==") {
      const same = left.aval === right.aval && left.bval === right.bval;
      return new Logic(Domains.Bit, BigInt(BOOLEAN(same === (op === "==="))));
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

  private arithmetic(op: string, left: any, right: any, ctype: SvType): unknown {
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

  private conditional(node: any, target: SvType): unknown {
    const t = truth(this.value(node.condition));
    if (t === 1) return this.value(node.consequent, target);
    if (t === 0) return this.value(node.alternative, target);
    const [a, b] = [this.value(node.consequent, target), this.value(node.alternative, target)];
    if (target.kind === "real") return a === b ? a : 0.0;
    const [[a1, a0], [b1, b0]] = [parts(a as Logic), parts(b as Logic)];
    return make(target, a1 & b1, a0 & b0); // bits that agree keep their value; the others are x
  }

  private inside(node: any): Logic {
    const items: any[][] = []; // a node, a span's ends, or an array's element
    for (const item of node.items) {
      if (kindOf(item) === "span") items.push([item.low, item.high]);
      else if (this.type(item) === null && Array.isArray(this.own(item))) { // an array: each of its elements
        for (const element of this.items(this.own(item), "inside")) items.push(["element", element]);
      } else items.push([item]);
    }
    const types = [this.numeric(node.value, "inside")];
    for (const item of items) {
      if (item[0] === "element") types.push(elementType(item[1]));
      else types.push(...item.map((end) => this.numeric(end, "inside")));
    }
    const shared = Domains.common(types);
    const value = this.value(node.value, shared);
    let found: number | null = 0;
    for (const item of items) {
      let match: Logic;
      if (item[0] === "element") {
        const element = item[1];
        const signed = element instanceof Logic && element.type.signed && shared.signed;
        match = this.compare("==?", value, convert(element, shared, signed), shared);
      } else if (item.length === 1) {
        match = this.compare("==?", value, this.value(item[0], shared), shared);
      } else {
        const low = truth(this.compare(">=", value, this.value(item[0], shared), shared));
        const high = truth(this.compare("<=", value, this.value(item[1], shared), shared));
        match = bit(low === 0 || high === 0 ? 0 : low === null || high === null ? null : 1);
      }
      const t = truth(match);
      if (t === 1) return bit(1);
      if (t === null) found = null;
    }
    return bit(found);
  }

  /** An array's items, typed. */
  private items(value: unknown, what: string): unknown[] {
    if (!Array.isArray(value)) throw new TypeError(`${what} is a method of arrays, not of ${typeName(value)}`);
    return value.map(typed);
  }

  private method(node: any): unknown {
    const items = this.items(this.value(node.array), `${node.name}()`);
    if (node.name === "size") return Logic.number(Domains.TYPES.get("int") as SvType, BigInt(items.length));
    if (node.name === "min" || node.name === "max") {
      if (items.length === 0) return [];
      const shared = Domains.common(items.map(elementType));
      let best = items[0];
      for (const item of items.slice(1)) {
        if (truth(this.compare(node.name === "min" ? "<" : ">", convert(item, shared), convert(best, shared), shared)) === 1) best = item;
      }
      return [best];
    }
    if (node.name === "unique") {
      const distinct: unknown[] = [];
      for (const item of items) if (!distinct.some((other) => identical(item, other))) distinct.push(item);
      return distinct;
    }
    return this.reduce(node.name, items);
  }

  /** The values reduced by a reduction method, in their common type. */
  private reduce(method: string, values: unknown[]): unknown {
    if (values.length === 0) {
      if (method === "sum" || method === "product") return Logic.number(Domains.Integer, method === "sum" ? 0n : 1n);
      return bit(BOOLEAN(method === "and"));
    }
    const ctype = Domains.common(values.map(elementType));
    const operator = ({ sum: "+", product: "*", and: "&", or: "|", xor: "^" } as Record<string, string>)[method] as string;
    let result = convert(values[0], ctype);
    for (const value of values.slice(1)) result = this.arithmetic(operator, result, convert(value, ctype), ctype);
    return result;
  }

  private member(node: any): unknown {
    const target: any = this.value(node.object);
    let members: ReadonlyMap<string, unknown>;
    if (isMapping(target)) members = target instanceof Map ? target : new Map(Object.entries(target));
    else if (target !== null && typeof target === "object" && typeof target.accept === "function") members = Validators.properties_of(target);
    else throw new TypeError(`a ${typeName(target)} has no members`);
    if (!members.has(node.name)) throw new KeyError(`no member named '${node.name}'`);
    return typed(array(members.get(node.name)));
  }

  private select(node: any): unknown {
    const [target, index] = [this.value(node.value), this.value(node.index)];
    if (Array.isArray(target)) {
      if (!(index instanceof Logic && index.known)) throw new ValueError(`an array's index must be known, got ${shown(index)}`);
      const position = index.integer();
      if (position < 0n || position >= BigInt(target.length)) {
        throw new ValueError(`index ${position} is out of bounds of an array of ${target.length}`);
      }
      return typed(target[Number(position)]);
    }
    if (!(target instanceof Logic)) throw new TypeError(`a ${typeName(target)} cannot be selected from`);
    const states = target.type.states;
    if (!(index instanceof Logic && index.known) || index.integer() < 0n || index.integer() >= BigInt(target.type.width)) {
      return unknownOf(Domains.vector(1, false, states));
    }
    const position = index.integer();
    return new Logic(Domains.vector(1, false, states), (target.aval >> position) & 1n, (target.bval >> position) & 1n);
  }

  private constant(node: any, what: string): bigint {
    const value = this.value(node);
    if (!(value instanceof Logic && value.known)) throw new ValueError(`${what} must be a known integer, got ${shown(value)}`);
    return value.integer();
  }

  private range(node: any): Logic {
    const target = this.value(node.value);
    if (!(target instanceof Logic)) throw new TypeError(`a ${typeName(target)} cannot be selected from`);
    const [msb, lsb] = [this.constant(node.msb, "a range's msb"), this.constant(node.lsb, "a range's lsb")];
    if (msb < lsb) throw new ValueError(`a range's msb must be at least its lsb, got [${msb}:${lsb}]`);
    const [width, bits] = [target.type.width, target.bits];
    let selected = "";
    for (let i = Number(msb); i >= Number(lsb); i--) selected += 0 <= i && i < width ? bits[width - 1 - i] : "x";
    return Logic.of(selected, false, target.type.states); // out of range, x
  }

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
    return this.concatenation(Array(Number(count)).fill(this.value(node.value)));
  }

  private call(node: any): unknown {
    const name = node.function;
    if (X.SYSTEM.includes(name)) {
      if (node.arguments.length !== 1) throw new TypeError(`${name} takes 1 argument, got ${node.arguments.length}`);
      if (name === "$bits") { // its argument's type's width; the argument is not evaluated
        return Logic.number(Domains.Integer, BigInt(this.numeric(node.arguments[0], name).width));
      }
      return system(name, this.value(node.arguments[0]));
    }
    return typed(this.scope.function(name)(...node.arguments.map((argument: any) => this.value(argument))));
  }
}

/** An array element's type: it must be integral or real. */
function elementType(value: unknown): SvType {
  const ctype = typeOfValue(value);
  if (ctype === null) throw new TypeError(`an array's elements must be numbers, got ${typeName(value)}`);
  return ctype;
}

/** Whether two elements are identical, as `===` compares them: of one value, bit for bit, x and z too. */
function identical(a: unknown, b: unknown): boolean {
  if (a instanceof Logic && b instanceof Logic) return a.aval === b.aval && a.bval === b.bval;
  return typeof a === typeof b && a === b;
}

/** A member's value: a list as an array of its items, lists of lists too. */
function array(value: unknown): unknown {
  return value instanceof Validators.ListRecord ? value.values.map(array) : value;
}

/** A real power as C's `pow` gives it, in the format of `ctype`. */
function realPower(base: number, exponent: number, ctype: SvType): number {
  // C's pow, where JavaScript's differs: 1 to any power, and -1 to an infinite one, is 1
  const result = base === 1 || (base === -1 && !Number.isFinite(exponent)) ? 1 : Math.pow(base, exponent);
  return ctype.format === "binary32" ? Ieee754.convert("binary64", result, "binary32", EVEN) as number : result;
}

function system(name: string, value: unknown): Logic {
  if (!(value instanceof Logic)) throw new TypeError(`${name} expects an integral argument, got real`);
  if (name === "$signed" || name === "$unsigned") {
    return new Logic(Domains.vector(value.type.width, name === "$signed", value.type.states), value.aval, value.bval);
  }
  if (name === "$isunknown") return new Logic(Domains.Bit, value.known ? 0n : 1n);
  const count = ones(parts(value)[0]);
  if (name === "$countones") return Logic.number(Domains.Integer, BigInt(count));
  if (name === "$onehot" || name === "$onehot0") return new Logic(Domains.Bit, BigInt(BOOLEAN(count === 1 || (name === "$onehot0" && count === 0))));
  if (!value.known) return unknownOf(Domains.Integer); // $clog2
  const rest = value.aval > 0n ? value.aval - 1n : 0n;
  return Logic.number(Domains.Integer, BigInt(rest === 0n ? 0 : rest.toString(2).length));
}

/** The value of an expression in `scope`, or with the variables in an object bound: a `Logic` or a number. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  const resolved = X.DIALECT.resolve(expression);
  const problems = X.DIALECT.validate(resolved, { bound: S.free(resolved) }); // its structure: references resolve as they go
  if (problems.length > 0) throw new ValueError(`cannot evaluate an invalid expression: ${problems[0]}`);
  return new Evaluation(S.isScope(scope) ? scope as Scope : new Scope(scope as S.Bindings)).value(resolved);
}
