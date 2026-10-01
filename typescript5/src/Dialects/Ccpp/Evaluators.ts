/**
 * Evaluators of the Ccpp dialect: compute an expression by C's and C++'s rules for arithmetic types, in TypeScript.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates in a `new Scope(variables, { functions })`. Values carry their C
 * type while evaluating, and the result is its native: a bigint, a number (a `long double` as its text, as
 * `Basic.Ieee754` writes it), a boolean, a string, or an object. A variable's type is its value's: a boolean is a
 * `bool`, a bigint an `int`, `long` or `unsigned long` as the first that holds it, a number a `double`, and a Basic
 * typed value (`Domains.Value`) of an integer domain of 8, 16, 32 or 64 bits the `<stdint.h>` type of its width and
 * signedness, and of a binary IEEE 754 format `float`, `double` or `long double`. C's rules apply:
 *
 * - The integer promotions and the usual arithmetic conversions decide the type an operator computes in (see
 *   `Domains`); unsigned arithmetic wraps, and floating arithmetic rounds to nearest, ties to even, as IEEE 754
 *   specifies.
 * - What C leaves undefined throws: a signed result outside its type (`OverflowError`), an integer divided by zero
 *   (`ZeroDivisionError`), a shift by a negative count or by the width or more, a left shift of a negative value, and a
 *   cast of a floating value outside the target type (`OverflowError`) or of NaN (`ValueError`).
 * - Division truncates toward zero, and `%` takes the dividend's sign; `>>` of a negative value is arithmetic.
 * - Comparisons and `&&`, `||` and `!` give `bool`, as in C++ (C's `int` results compute alike once promoted); `&&` and
 *   `||` evaluate their second operand only when the first does not decide.
 * - A cast converts: to an integer type by wrapping into its width (as C++20 defines), from a floating value by
 *   truncation; to a floating type by rounding; to `bool` by comparing with zero.
 * - `condition ? a : b` evaluates only the operand it chooses, and keeps that operand's type.
 * - `object.name` and `object->name` read a member (a property of an object, or a key of a mapping); `array[index]` an
 *   element of an array; `f(args)` calls a function the scope provides, and nothing else.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import { NameError, OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Evaluators.js";
import * as S from "../../Framework/Symbolics.js";
import * as BD from "../Basic/Domains.js";
import * as Ieee754 from "../Basic/Ieee754.js";
import { isMapping } from "../Matlab/Domains.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { KeyError, ValueError } = Errors;
const { repr, typeName } = Repr;
type CType = Domains.CType;
type Fn = (...args: any[]) => unknown;
const [EVEN, ZERO] = ["roundTiesToEven", "roundTowardZero"];

/** A value while evaluating: its C type (null for a string or an object) and its native. */
class Typed {
  constructor(readonly ctype: CType | null, readonly value: any) {}
}

function nameOf(value: Typed): string {
  return value.ctype !== null ? value.ctype.name() : typeName(value.value);
}

const type = (name: string) => Domains.TYPES.get(name) as CType;

/** A variable's or a member's value, with its type. */
function typed(value: unknown): Typed {
  if (value instanceof BD.Value) {
    const domain: any = value.domain;
    if (domain instanceof BD.OfInteger.Data && [8n, 16n, 32n, 64n].includes(domain.width as bigint)) {
      return new Typed(type(`${domain.signed ? "" : "u"}int${domain.width}_t`), value.value);
    }
    const formats: Record<string, string> = { binary32: "float", binary64: "double", binary128: "long double" };
    if (domain instanceof BD.OfIeee754.Data && domain.format in formats) return new Typed(type(formats[domain.format] as string), value.value);
    throw new TypeError(`${domain.name()} has no C type`);
  }
  const ctype = Domains.of(value);
  if (ctype instanceof Domains.CType) return new Typed(ctype, value);
  if (typeof value === "bigint") throw new OverflowError(`integer ${value} is too large for any type`);
  return new Typed(null, value);
}

function constant(ctype: CType, value: unknown): Typed {
  return new Typed(ctype, value);
}

function arithmetic(value: Typed, operator: string): CType {
  if (value.ctype === null) throw new TypeError(`invalid operand to ${operator}: '${nameOf(value)}'`);
  return value.ctype;
}

// --- Conversions ---

/** An integer wrapped into a type's width, two's complement. */
function wrap(ctype: CType, value: bigint): bigint {
  const low = ctype.signed ? -(1n << BigInt(ctype.width - 1)) : 0n;
  const modulus = 1n << BigInt(ctype.width);
  return (((value - low) % modulus) + modulus) % modulus + low;
}

/** A value converted to `target` implicitly or by a cast: integers wrap, floats truncate toward an integer and round
 * toward a floating type, and anything nonzero is true. */
function convert(value: Typed, target: CType): Typed {
  const source = arithmetic(value, "a conversion");
  const native = value.value;
  if (target.kind === "bool") {
    if (source.kind === "floating") { // true unless a zero of either sign; NaN is true
      const datum = Ieee754.decode(source.format as string, native);
      return new Typed(target, datum.special !== null || datum.coefficient !== 0n);
    }
    return new Typed(target, BigInt(native) !== 0n);
  }
  if (source.kind !== "floating") {
    const number = BigInt(native);
    if (target.kind === "integer") return new Typed(target, wrap(target, number));
    return new Typed(target, Ieee754.from_integer(number, target.format as string, EVEN));
  }
  if (target.kind === "floating") return new Typed(target, Ieee754.convert(source.format as string, native, target.format as string, EVEN));
  const whole = Ieee754.to_integer(source.format as string, native, ZERO);
  if (typeof whole === "number" || !target.contains(whole)) {
    const shown = typeof native === "string" ? native : repr(native);
    throw new OverflowError(`${shown} is out of range of '${target.name()}'`);
  }
  return new Typed(target, whole);
}

function common(left: Typed, right: Typed, operator: string): [CType, Typed, Typed] {
  const ctype = Domains.common(arithmetic(left, operator), arithmetic(right, operator));
  return [ctype, convert(left, ctype), convert(right, ctype)];
}

/** An integer result: wrapped when unsigned; outside a signed type, undefined. */
function integerResult(ctype: CType, operator: string, value: bigint): Typed {
  if (!ctype.signed) return new Typed(ctype, wrap(ctype, value));
  if (!ctype.contains(value)) throw new OverflowError(`signed overflow in ${operator}: ${value} does not fit '${ctype.name()}'`);
  return new Typed(ctype, value);
}

// --- Operators ---

const FLOATING_OPERATORS: Record<string, string> = { "+": "add", "-": "sub", "*": "mul", "/": "div" };

function binaryArithmetic(operator: string): F.Implementation {
  return (args) => {
    const [ctype, a, b] = common((args[0] as F.Thunk)(), (args[1] as F.Thunk)(), operator);
    if (ctype.kind === "floating") {
      if (!(operator in FLOATING_OPERATORS)) {
        throw new TypeError(`invalid operands to binary ${operator} ('${ctype.name()}' and '${ctype.name()}')`);
      }
      return new Typed(ctype, Ieee754.operate(FLOATING_OPERATORS[operator] as string, ctype.format as string, EVEN, [a.value, b.value]));
    }
    const [x, y] = [a.value as bigint, b.value as bigint];
    if ((operator === "/" || operator === "%") && y === 0n) throw new ZeroDivisionError("integer division by zero");
    const results: Record<string, () => bigint> = {
      "+": () => x + y, "-": () => x - y, "*": () => x * y, "/": () => x / y, "%": () => x % y, // truncated toward zero
      "&": () => x & y, "^": () => x ^ y, "|": () => x | y,
    };
    return integerResult(ctype, operator, (results[operator] as () => bigint)());
  };
}

function shift(operator: string): F.Implementation {
  return (args) => {
    const [left, right] = [(args[0] as F.Thunk)(), (args[1] as F.Thunk)()];
    const [ctype, countType] = [Domains.promoted(arithmetic(left, operator)), Domains.promoted(arithmetic(right, operator))];
    if (ctype.kind === "floating" || countType.kind === "floating") {
      throw new TypeError(`invalid operands to binary ${operator} ('${nameOf(left)}' and '${nameOf(right)}')`);
    }
    const [value, count] = [BigInt(left.value), BigInt(right.value)];
    if (count < 0n || count >= BigInt(ctype.width)) throw new ValueError(`shift by ${count} is undefined for '${ctype.name()}'`);
    if (operator === ">>") return new Typed(ctype, value >> count);
    if (value < 0n) throw new ValueError("left shift of a negative value is undefined");
    return integerResult(ctype, operator, value << count);
  };
}

/** How two non-NaN floating values compare by value: -0 equals 0. */
function ieeeOrder(format: string, a: unknown, b: unknown): number {
  const [x, y] = [Ieee754.decode(format, a), Ieee754.decode(format, b)];
  if (x.special === null && y.special === null && x.coefficient === 0n && y.coefficient === 0n) return 0;
  return Ieee754.compare(format, a, b) as number;
}

function comparison(operator: string): F.Implementation {
  const tests: Record<string, (o: number) => boolean> = {
    "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0, "==": (o) => o === 0, "!=": (o) => o !== 0,
  };
  return (args) => {
    const [ctype, a, b] = common((args[0] as F.Thunk)(), (args[1] as F.Thunk)(), operator);
    let order: number;
    if (ctype.kind === "floating") {
      const format = ctype.format as string;
      const [x, y] = [Ieee754.decode(format, a.value), Ieee754.decode(format, b.value)];
      if (x.special === "nan" || y.special === "nan") return new Typed(Domains.Bool, operator === "!=");
      order = ieeeOrder(format, a.value, b.value);
    } else {
      order = a.value > b.value ? 1 : a.value < b.value ? -1 : 0;
    }
    return new Typed(Domains.Bool, (tests[operator] as (o: number) => boolean)(order));
  };
}

function truth(value: Typed, operator: string): boolean {
  arithmetic(value, operator);
  return convert(value, Domains.Bool).value;
}

function logical(operator: string): F.Implementation {
  return (args) => {
    const first = truth((args[0] as F.Thunk)(), operator);
    if (first === (operator === "||")) return new Typed(Domains.Bool, first);
    return new Typed(Domains.Bool, truth((args[1] as F.Thunk)(), operator));
  };
}

function unary(operator: string): F.Implementation {
  return (args) => {
    const value = (args[0] as F.Thunk)();
    if (operator === "!") return new Typed(Domains.Bool, !truth(value, operator));
    const ctype = Domains.promoted(arithmetic(value, operator));
    const promoted = convert(value, ctype);
    if (ctype.kind === "floating") {
      if (operator === "~") throw new TypeError(`invalid argument type '${ctype.name()}' to unary expression`);
      return operator === "+" ? promoted : new Typed(ctype, Ieee754.operate("neg", ctype.format as string, EVEN, [promoted.value]));
    }
    const number = promoted.value as bigint;
    return integerResult(ctype, operator, operator === "+" ? number : operator === "-" ? -number : ~number);
  };
}

function conditional(args: F.Thunk[]): Typed {
  return truth((args[0] as F.Thunk)(), "?:") ? (args[1] as F.Thunk)() : (args[2] as F.Thunk)();
}

function cast(args: F.Thunk[], node: any): Typed {
  return convert((args[0] as F.Thunk)(), type(node.type));
}

/** A member's value: a list as an array of its items, lists of lists too. */
function array(value: unknown): unknown {
  return value instanceof Validators.ListRecord ? value.values.map(array) : value;
}

function member(args: F.Thunk[], node: any): Typed {
  const target = (args[0] as F.Thunk)().value;
  let members: ReadonlyMap<string, unknown>;
  if (isMapping(target)) members = target instanceof Map ? target : new Map(Object.entries(target));
  else if (target !== null && typeof target === "object" && typeof target.accept === "function") members = Validators.properties_of(target);
  else throw new TypeError(`member reference base type '${typeName(target)}' is not a structure`);
  if (!members.has(node.name)) throw new KeyError(`no member named '${node.name}'`);
  return typed(array(members.get(node.name)));
}

function subscript(args: F.Thunk[]): Typed {
  const [target, index] = [(args[0] as F.Thunk)(), (args[1] as F.Thunk)()];
  if (!Array.isArray(target.value)) throw new TypeError(`subscripted value is not an array: '${nameOf(target)}'`);
  if (index.ctype === null || index.ctype.kind === "floating") throw new TypeError(`array subscript is not an integer: '${nameOf(index)}'`);
  const position = BigInt(index.value);
  if (position < 0n || position >= BigInt(target.value.length)) {
    throw new ValueError(`index ${position} is out of bounds of an array of ${target.value.length}`);
  }
  return typed(target.value[Number(position)]);
}

function call(args: F.Thunk[], node: any, scope: Scope): Typed {
  const fn = scope.function(node.function);
  return typed(fn(...args.map((argument) => (argument() as Typed).value)));
}

/** C's scope for an expression: `variables`, and the `functions` it may call. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn>;

  constructor(variables: S.Bindings = {}, options: { functions?: Record<string, Fn> } = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
  }

  override lookup(reference: any): unknown {
    return typed(super.lookup(reference));
  }

  override unbound(reference: any): never {
    throw new NameError(`use of undeclared identifier '${reference.name}'`);
  }

  function(name: string): Fn {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new NameError(`use of undeclared identifier '${name}'`);
    return fn;
  }
}

/** The interpreter of the Ccpp dialect; its values carry their C types. */
export const INTERPRETER = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([
  ["binary", new Map<string, F.Implementation>([
    ...["+", "-", "*", "/", "%", "&", "^", "|"].map((op) => [op, binaryArithmetic(op)] as [string, F.Implementation]),
    ...["<<", ">>"].map((op) => [op, shift(op)] as [string, F.Implementation]),
    ...["<", "<=", ">", ">=", "==", "!="].map((op) => [op, comparison(op)] as [string, F.Implementation]),
    ...["&&", "||"].map((op) => [op, logical(op)] as [string, F.Implementation]),
  ])],
  ["unary", new Map<string, F.Implementation>(["+", "-", "~", "!"].map((op) => [op, unary(op)]))],
  ["conditional", conditional], ["cast", cast], ["member", member], ["subscript", subscript], ["call", call],
]), { literal: typed, typed: constant, scope: (variables) => new Scope(variables) });

/** The value of an expression in `scope`, or with the variables in an object bound: its native. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return (INTERPRETER.run(Expressions.DIALECT.resolve(expression), scope) as Typed).value;
}
