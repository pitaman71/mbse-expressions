/**
 * Evaluators of the SystemVerilog dialect: compute an expression by IEEE 1800's rules, in TypeScript.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates a term (or anything `Terms.term` reads one from) in a
 * `new Scope(variables, { functions })` and gives a `Domains.Logic` for an integral result or a number for a real one. A
 * variable's type is its value's: a `Logic` its own, a boolean a `bit`, a bigint an `integer` (or a `longint` beyond 32
 * bits), a number a `real`, and a string a vector of its bytes (in UTF-8) (a value carries no domain: a variable of another type waits for
 * domain inference). Every named type it computes in (a literal's, a cast's, `===`'s `bit`, `size()`'s `int`, `$bits`'
 * `integer`, ...) is the domain SystemVerilog defines by that name in the store of the term's holder (`Domains.named`),
 * read once per evaluation when it is first needed: a lone term is refused where it needs one (mbse-schemas' TypeError),
 * and a store where SystemVerilog's `define` has not run defines none.
 *
 * It keeps what it evaluated before the dialect was complete, over the kinds that replaced its own (the dialects
 * proposal, Decided for stage 6, Q11: "stage 6 extends no evaluator"): a `literal` (an unsized integer, decimal or based,
 * a real, a string) and a `constant` (a vector, sized or not, and a fill in its context's width); a `nameexpression` of an
 * identifier; `memberexpression`, `indexexpression`, `rangeselect` (`[msb:lsb]`), `unaryexpression`,
 * `binaryexpression`, `conditionalexpression`, `parenthesizedexpression`, `insideexpression` with `valuerange`s,
 * `concatenation`, `replication`, `castexpression` (to a type SystemVerilog defines by its keyword, a signing, or a
 * width), `systemcall` (the system functions `SYSTEM`), `callexpression` (of a function the scope provides, or of an
 * array's method of no arguments, `a.size()`) and `arraymethodwithexpression` (a reduction with a `with` clause). Every
 * other kind, the other dialects' of its family among them, is refused by name, `NotImplementedError` ("SystemVerilog
 * incrementexpression is not evaluated", "SystemVerilog Types structtype is not evaluated"), and so is what an evaluated
 * kind holds beyond what it evaluated before (a scoped name, an indexed part select, a time literal, `null`). IEEE
 * 1800's rules apply:
 *
 * - Sizing: an operator's operands are context-determined or self-determined (11.6); the context-determined ones are
 *   extended to the expression's width before it is computed, sign-extended when the expression is signed (all its
 *   context-determined operands are), and zero-extended otherwise. A real operand makes the expression real. An unsized
 *   based integer is unsigned, unless written signed, of 32 bits; an unsized vector is extended to 32 bits by its leftmost
 *   bit where it is x or z, else by 0; a fill (`'1`) fills its context's width.
 * - 4-state logic: an arithmetic operator or a comparison with an x or z bit in an operand gives x (all bits); the bitwise
 *   operators and the reductions follow their truth tables; `===` and `!==` compare bits exactly, and `==?` and `!=?`
 *   treat x and z in the right operand as wildcards. Division by zero gives x.
 * - `&&`, `||`, `!`, `->` and `<->` give 1, 0 or x by the truth of their operands (any 1 bit is true, all 0 false,
 *   otherwise x); a conditional with an x condition merges its operands bit by bit.
 * - `inside` holds when the value equals (`==?`) an item, an element of an array among the items, or lies in a range;
 *   otherwise it is x when a comparison is.
 * - A cast converts as an assignment would: integral values are extended by their own signedness or truncated, a 2-state
 *   type maps x and z to 0, a real rounds to the nearest integer (ties away from zero), and an integer becomes a real.
 * - An index gives a bit (x out of range, or for an x index) or an array's element; a range select bits `[msb:lsb]`.
 * - System functions: `$signed`, `$unsigned`, `$clog2`, `$bits` (of a value's type, or of a type SystemVerilog defines),
 *   `$countones`, `$onehot`, `$onehot0`, `$isunknown`; other functions are the scope's, and nothing else.
 * - Array methods: `size()` is an `int`; `sum()`, `product()`, `and()`, `or()` and `xor()` reduce the items, or the
 *   values of a `with` clause, its iterator its call's argument (`item` by default), in their common type by `+`, `*`,
 *   `&`, `|` and `^` (x and z as those operators take them); of no items they give 0, 1, `1'b1`, `1'b0` and `1'b0`.
 *   `min()` and `max()` give a queue of the least or greatest item (none when there are none), and `unique()` a queue of
 *   the first of each set of identical (`===`) items.
 */

import { Errors, Proxies, Repr } from "@mbse/schemas/Framework";

import { NameError, OverflowError } from "../../Framework/Errors.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as F from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import { isMapping } from "../../MATLAB/Expressions/Domains.js";
import * as Domains from "./Domains.js";
import * as X from "./Expressions.js";
import { Logic, SvType } from "./Domains.js";

const { KeyError, NotImplementedError, ValueError } = Errors;
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
    throw new NameError(`identifier '${F.nameOf(reference)}' is not declared`);
  }

  function(name: string): Fn {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new NameError(`function '${name}' is not declared`);
    return fn;
  }
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

/** The kinds it evaluates: those that replaced the kinds it evaluated before the dialect was complete. */
const EVALUATED: ReadonlySet<string> = new Set([X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION,
  X.INDEXEXPRESSION, X.RANGESELECT, X.UNARYEXPRESSION, X.BINARYEXPRESSION, X.CONDITIONALEXPRESSION,
  X.PARENTHESIZEDEXPRESSION, X.INSIDEEXPRESSION, X.CONCATENATION, X.REPLICATION, X.CASTEXPRESSION, X.SYSTEMCALL,
  X.CALLEXPRESSION, X.ARRAYMETHODWITHEXPRESSION]);

/** The name of the dialect of the family that owns a node's kind (`Terms.Dialect.owner`): SystemVerilog's own, or a
 * sublanguage's. */
function owner(node: Node): string {
  return X.DIALECT.owner(node.term).name();
}

function refused(what: string): Error {
  return new NotImplementedError(`${what} is not evaluated`);
}

/** A term read once for one evaluation: its `tag` (as `Expressions.DIALECT` reads it, a term of any of its family's
 * dialects), and its members by name, its attributes (null where not set), its helpers (`Terms.Node`s), its slots (a
 * `Node`, null where empty) and its variadic arguments (each container's, an array of `Node`s). `term` is the term value read. */
class Node {
  [member: string]: any;

  constructor(readonly term: any) {
    const [tag, record] = X.DIALECT.kind(term);
    const node = F.node(tag, record);
    const [, , names] = F._parts(record.as_schema());
    for (const name of names) this[name] = null;
    for (const [name, value] of node.attributes) this[name] = value;
    for (const [name, value] of node.helpers) this[name] = value;
    for (const [name, value] of node.slots) this[name] = value === null ? null : new Node(value);
    for (const [name, terms] of node.lists) this[name] = terms.map((a) => new Node(a));
    this.tag = tag;
  }
}

const kindOf = (node: Node): string => node.tag;
const spelling = (name: any): string => name.attributes.get("spelling");
const COMPARISONS = ["<", "<=", ">", ">=", "==", "!=", "===", "!==", "==?", "!=?"];
const SHIFTS = ["<<", ">>", "<<<", ">>>"];

/** One evaluation in a scope: each term's self-determined type, then its value in a context. */
class Evaluation {
  private readonly types = new Map<object, SvType | null>();
  private readonly values = new Map<object, unknown>();

  constructor(readonly scope: Scope, readonly stored: Types) {}

  /** The term's self-determined type (null for an object); a kind it does not evaluate is refused by name. */
  type(node: any): SvType | null {
    if (!EVALUATED.has(kindOf(node))) throw refused(`${owner(node)} ${kindOf(node)}`);
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
    if (kind === X.CONSTANT && node.fill !== null) return ONE; // self-determined, a fill is a bit
    if ([X.LITERAL, X.CONSTANT, X.NAMEEXPRESSION, X.MEMBEREXPRESSION, X.INDEXEXPRESSION, X.CALLEXPRESSION,
      X.ARRAYMETHODWITHEXPRESSION, X.CONCATENATION, X.REPLICATION, X.RANGESELECT, X.SYSTEMCALL].includes(kind)) {
      return typeOfValue(this.own(node), this.stored);
    }
    if (kind === X.PARENTHESIZEDEXPRESSION) return this.type(node.expression);
    if (kind === X.UNARYEXPRESSION) {
      if (node.operator === "+" || node.operator === "-") return this.type(node.operand);
      if (node.operator === "~") return this.integral(node.operand, "~");
      return ONE;
    }
    if (kind === X.BINARYEXPRESSION) {
      const op = node.operator;
      if (["<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->", "==?", "!=?"].includes(op)) return ONE;
      if (op === "===" || op === "!==") return this.stored.named("bit");
      if (SHIFTS.includes(op)) return this.integral(node.left, op);
      const [left, right] = [this.numeric(node.left, op), this.numeric(node.right, op)];
      if (op === "**" && left.kind !== "real" && right.kind !== "real") return left; // its exponent is self-determined
      return Domains.common([left, right]);
    }
    if (kind === X.CONDITIONALEXPRESSION) { // its condition first: one it does not evaluate (a `matches`) is refused by
      this.type(node.condition); // name before the branches, which may name what its pattern binds, are sized
      return Domains.common([this.numeric(node.consequence, "?:"), this.numeric(node.alternative, "?:")]);
    }
    if (kind === X.INSIDEEXPRESSION) return ONE;
    return this.castType(node); // a cast
  }

  /** A cast's type: a width's, sized by its operand; a signing's, of its operand's width; or the type SystemVerilog
   * defines by the keyword its type names. */
  private castType(cast: any): SvType {
    const target = cast.type;
    const operand = this.numeric(cast.value, "a cast");
    if (kindOf(target) === "implicittype" && target.signing !== null && target.dimensions === null) {
      const integral = this.integral(cast.value, `${target.signing}'`);
      return Domains.vector(integral.width, target.signing === "signed", integral.states);
    }
    const name = X.typeName(target.term);
    if (name !== null && Domains.NAMES.includes(name)) return this.stored.named(name);
    if (EVALUATED.has(kindOf(target))) { // a width: a known positive integer
      const width = this.constant(target, "a cast's width");
      if (width < 1n) throw new ValueError(`a cast's width must be positive, got ${width}`);
      return Domains.vector(Number(width), operand.signed, operand.states);
    }
    throw refused(`${owner(target)} ${kindOf(target)}`);
  }

  /** A self-determined term's value, of its own type, once. */
  own(node: any): unknown {
    if (!this.values.has(node)) this.values.set(node, this.ownOf(node));
    return this.values.get(node);
  }

  private ownOf(node: any): unknown {
    switch (kindOf(node)) {
      case X.LITERAL: return this.literal(node);
      case X.CONSTANT: return this.vector(node);
      case X.NAMEEXPRESSION:
        if (F.nameOf(node.term) === null) throw refused("SystemVerilog nameexpression of a name that is not an identifier");
        return typed(this.scope.lookup(node.term), this.stored);
      case X.MEMBEREXPRESSION: return this.member(node);
      case X.INDEXEXPRESSION: return this.select(node);
      case X.RANGESELECT: return this.range(node);
      case X.CONCATENATION: return this.concatenation(node.items.map((item: any) => this.value(item)));
      case X.REPLICATION: return this.replication(node);
      case X.ARRAYMETHODWITHEXPRESSION: return this.withClause(node);
      case X.SYSTEMCALL: return this.systemCall(node);
      default: return this.call(node);
    }
  }

  /** A literal's value: an unsized based integer of its own type, a decimal one an `integer` or a `longint`, a real, or
   * a string's bytes. */
  private literal(node: any): unknown {
    if (node.unit !== null) throw refused("SystemVerilog time literal");
    if (node.base !== null) return Logic.number(Domains.unsized(node.value, Boolean(node.signed)), node.value);
    return typed(node.value, this.stored);
  }

  /** A constant's vector: of its size, or, unsized, extended to 32 bits by its leftmost bit where x or z. */
  private vector(node: any): Logic {
    if (node.bits === null) throw refused(`SystemVerilog constant ${node.singleton}`);
    let bits: string = node.bits;
    if (node.size === null && bits.length < 32) bits = ("xz".includes(bits[0] as string) ? bits[0] as string : "0").repeat(32 - bits.length) + bits;
    return Logic.of(bits, Boolean(node.signed));
  }

  /** The term's value in a context: its own type's, unless the context gives another. */
  value(node: any, context: SvType | null = null): unknown {
    const ctype = this.type(node);
    const target = (context ?? ctype) as SvType;
    const kind = kindOf(node);
    if (kind === X.PARENTHESIZEDEXPRESSION) return this.value(node.expression, context);
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
    if (kind === X.CASTEXPRESSION) return convert(this.value(node.value), this.type(node) as SvType);
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
    if (t === 1) return this.value(node.consequence, target);
    if (t === 0) return this.value(node.alternative, target);
    const [a, b] = [this.value(node.consequence, target), this.value(node.alternative, target)];
    if (target.kind === "real") return a === b ? a : 0.0;
    const [[a1, a0], [b1, b0]] = [parts(a as Logic), parts(b as Logic)];
    return make(target, a1 & b1, a0 & b0); // bits that agree keep their value; the others are x
  }

  private inside(node: any): Logic {
    const items: any[][] = []; // a term, a range's ends, or an array's element
    for (const item of node.set) {
      if (kindOf(item) === X.VALUERANGE) {
        if (item.operator !== null) throw refused(`SystemVerilog valuerange ${repr(item.operator)}`);
        items.push([item.left, item.right]);
      } else if (this.type(item) === null && Array.isArray(this.own(item))) { // an array: each of its elements
        for (const element of this.items(this.own(item), "inside")) items.push(["element", element]);
      } else items.push([item]);
    }
    const types = [this.numeric(node.value, "inside")];
    for (const item of items) {
      if (item[0] === "element") types.push(this.elementType(item[1]));
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
    return value.map((item) => typed(item, this.stored));
  }

  /** An array's method of no arguments: its size, a reduction, or a locator. */
  private method(array: any, name: string): unknown {
    const items = this.items(this.value(array), `${name}()`);
    if (name === "size") return Logic.number(this.stored.named("int"), BigInt(items.length));
    if (name === "min" || name === "max") {
      if (items.length === 0) return [];
      const shared = Domains.common(items.map((item) => this.elementType(item)));
      let best = items[0];
      for (const item of items.slice(1)) {
        if (truth(this.compare(name === "min" ? "<" : ">", convert(item, shared), convert(best, shared), shared)) === 1) best = item;
      }
      return [best];
    }
    if (name === "unique") {
      const distinct: unknown[] = [];
      for (const item of items) if (!distinct.some((other) => identical(item, other))) distinct.push(item);
      return distinct;
    }
    return this.reduce(name, items);
  }

  /** The values reduced by a reduction method, in their common type. */
  /** A reduction with a `with` clause: its call's array's items, each bound to its iterator, reduced by its method over
   * its `with` expression's values. */
  private withClause(node: any): unknown {
    const call = node.value;
    const callee = kindOf(call) === X.CALLEXPRESSION ? call.callee : null;
    if (callee === null || kindOf(callee) !== X.MEMBEREXPRESSION || !X.REDUCTIONS.includes(spelling(callee.member))) {
      throw refused("SystemVerilog arraymethodwithexpression of a call that is not a reduction's");
    }
    const method = spelling(callee.member);
    const iterator = [...(X.arrayMethodScopes(F.kindOf(node.term)[1])[1] as ReadonlySet<string>)][0] as string;
    const items = this.items(this.value(callee.value), `${method}()`);
    return this.reduce(method, items.map((item) => new Evaluation(this.scope.bind(iterator, item), this.stored).value(node.body)));
  }

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

  private member(node: any): unknown {
    const [target, name]: [any, string] = [this.value(node.value), spelling(node.member)];
    let members: ReadonlyMap<string, unknown>;
    if (Objects.isObject(target)) members = Objects.properties(target);
    else if (isMapping(target)) members = target instanceof Map ? target : new Map(Object.entries(target));
    else throw new TypeError(`a ${typeName(target)} has no members`);
    if (!members.has(name)) throw new KeyError(`no member named '${name}'`);
    return typed(array(members.get(name)), this.stored);
  }

  private select(node: any): unknown {
    const [target, index] = [this.value(node.value), this.value(node.index)];
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

  private constant(node: any, what: string): bigint {
    const value = this.value(node);
    if (!(value instanceof Logic && value.known)) throw new ValueError(`${what} must be a known integer, got ${shown(value)}`);
    return value.integer();
  }

  private range(node: any): Logic {
    if (node.operator !== ":") throw refused(`SystemVerilog rangeselect ${repr(node.operator)}`);
    const target = this.value(node.value);
    if (!(target instanceof Logic)) throw new TypeError(`a ${typeName(target)} cannot be selected from`);
    const [msb, lsb] = [this.constant(node.left, "a range's msb"), this.constant(node.right, "a range's lsb")];
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
    const values = node.items.map((item: any) => this.value(item));
    return this.concatenation(Array.from({ length: Number(count) }, () => values).flat());
  }

  /** A system function's call: one of `SYSTEM`, of one argument. */
  private systemCall(node: any): unknown {
    const name = node.name;
    if (!X.SYSTEM.includes(name)) throw refused(`SystemVerilog systemcall ${repr(name)}`);
    if (node.arguments.length !== 1) throw new TypeError(`${name} takes 1 argument, got ${node.arguments.length}`);
    const argument = node.arguments[0];
    if (name === "$bits") { // its argument's type's width, or a type's; the argument is not evaluated
      const typedName = X.typeName(argument.term);
      const width = (typedName !== null && Domains.NAMES.includes(typedName) ? this.stored.named(typedName)
        : this.numeric(argument, name)).width;
      return Logic.number(this.stored.named("integer"), BigInt(width));
    }
    return this.system(name, this.value(argument));
  }

  /** A call: of a function the scope provides, by its name, or of an array's method of no arguments. */
  private call(node: any): unknown {
    const callee = node.callee;
    if (kindOf(callee) === X.NAMEEXPRESSION && F.nameOf(callee.term) !== null) {
      const name = F.nameOf(callee.term) as string;
      return typed(this.scope.function(name)(...node.arguments.map((argument: any) => this.value(argument))), this.stored);
    }
    if (kindOf(callee) === X.MEMBEREXPRESSION && X.METHODS.includes(spelling(callee.member)) && node.arguments.length === 0) {
      return this.method(callee.value, spelling(callee.member));
    }
    throw refused(`SystemVerilog callexpression of a ${kindOf(callee)}`);
  }

  /** An array element's type: it must be integral or real. */
  private elementType(value: unknown): SvType {
    const ctype = typeOfValue(value, this.stored);
    if (ctype === null) throw new TypeError(`an array's elements must be numbers, got ${typeName(value)}`);
    return ctype;
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

/** The value of an expression in `scope`, or with the variables in an object bound: a `Logic` or a number. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  const term = F.term(expression);
  const problems = X.DIALECT.validate(term, S.free(term, X.DIALECT)); // its structure: references resolve as they go
  if (problems.length > 0) throw new ValueError(`cannot evaluate an invalid expression: ${problems[0]}`);
  return new Evaluation(S.isScope(scope) ? scope as Scope : new Scope(scope as S.Bindings), new Types(term)).value(new Node(term));
}
