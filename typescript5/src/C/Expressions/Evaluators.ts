/**
 * Evaluators of the C dialect: compute an expression by C's rules for arithmetic types, which C++ shares (`Cpp`'s
 * interpreter is `interpreter(Cpp.Expressions.DIALECT)`), in TypeScript.
 *
 * `Evaluators.OfAny(term, scope)` evaluates a term value (or anything `Terms.term` reads one from, an `Expression`) in
 * a `new Scope(variables, { functions })`. Values carry their C type while evaluating, and the result is its native: a
 * bigint, a number (a value of a format whose values are text, `long double`'s under most ABIs, as its text, as
 * `Patterns.Ieee754` writes it), a boolean, a string, or an object. A variable's type is its value's: a boolean is a
 * `bool`, a bigint an `int`, `long` or `unsigned long` as the first that holds it, and a number a `double` (a value
 * carries no domain: a variable of another type waits for domain inference, the port's stage 3, Decided, 2). Every
 * named type it computes in (a literal's, a variable's, a cast's, the promotions' `int`, a comparison's `bool`) is a
 * stored domain, read through the term's holder (`Domains.Types`): among its dialect's domains, then its holder's
 * ABI's, so the same term evaluates as each ABI says (`(char)200` is -56 under x86-64's System V ABI, where `char` is
 * signed, and 200 under AAPCS64's; `long double` is x87's format under the one and `binary128` under the other). A lone
 * term is refused where it reads a type (mbse-schemas' TypeError), and so is a type neither dialect defines, by name.
 * C's rules apply:
 *
 * - The integer promotions and the usual arithmetic conversions decide the type an operator computes in (see
 *   `Domains`); unsigned arithmetic wraps, and floating arithmetic rounds to nearest, ties to even, as IEEE 754
 *   specifies, in the type's format, decimal ones too; a decimal floating operand with a binary one is refused
 *   (`TypeError`), as C's constraint has it.
 * - What C leaves undefined throws: a signed result outside its type (`OverflowError`), an integer divided by zero
 *   (`ZeroDivisionError`), a shift by a negative count or by the width or more, a left shift of a negative value, and a
 *   cast of a floating value outside the target type (`OverflowError`) or of NaN (`ValueError`).
 * - Division truncates toward zero, and `%` takes the dividend's sign; `>>` of a negative value is arithmetic.
 * - Comparisons and `&&`, `||` and `!` give `bool`, as in C++ (C's `int` results compute alike once promoted); `&&` and
 *   `||` evaluate their second operand only when the first does not decide.
 * - A cast converts, to an arithmetic type: to an integer type by wrapping into its width (as C++20 defines), from a
 *   floating value by truncation; to a floating type by rounding; to `bool` by comparing with zero.
 * - `condition ? a : b` evaluates only the operand it chooses, and keeps that operand's type.
 * - `object.name` and `object->name` read a member (a property of a data object, read through mbse-schemas' readers
 *   (`Framework.Objects`), or a key of a mapping); `array[index]` an element of an array, or of a container; `f(args)`
 *   calls a function the scope provides, by its name, and nothing else.
 *
 * A literal's type is what its text encodes (`Domains.literal`: `5u` an `unsigned int`, `1.5f` a `float`, `'a'` C's
 * `int` and C++'s `char`), else its value's. Evaluation stays shallow (the dialects proposal, Decided, 8): `EVALUATED`
 * names the kinds C evaluated before it was complete, in their complete shapes; any other kind throws
 * `NotImplementedError` by name ("C sizeofexpression is not evaluated"), and so does what an evaluated kind holds
 * beyond its former shape: an operator its vocabulary has but no rule here (`*`, `&`, `++`, `,`, "C unaryexpression '*'
 * is not evaluated"), a literal of a type no evaluator has values of ("C literal of _BitInt is not evaluated"), a cast
 * to a type that is not arithmetic, a subscript of several indices, a call of a callee that is not a function's name, a
 * member that is not an identifier, C++'s name used as an expression that is not an identifier (`std::cout`, "Cpp
 * idexpression of a name that is not an identifier is not evaluated"), and GNU's conditional without a consequence. C's
 * name used as an expression is the framework's `variable`, and C++'s an `idexpression` holding its identifier
 * (`Cpp/Evaluators`' `EVALUATED`). Invalid syntax throws `ValueError` by name, as every dialect's does ("C error is not
 * evaluated"), where a cast's type stands too.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import { NameError, OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Evaluators.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { KeyError, NotImplementedError, ValueError } = Errors;
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

/** A value no type holds, a bigint beyond every type: refused. */
function untyped(value: unknown): Typed {
  throw new OverflowError(`integer ${value} is too large for any type`);
}

/** A variable's or a member's value, with its type, read through `types`. */
function typed(value: unknown, types: Domains.Types): Typed {
  if (!["boolean", "bigint", "number"].includes(typeof value)) return new Typed(null, value);
  const name = Domains.of(value, types);
  return name === null ? untyped(value) : new Typed(types.named(name), value);
}

/** The types a term of `dialect` reads, through its holder. */
function typesOf(node: unknown, dialect: Terms.Dialect): Domains.Types {
  return new Domains.Types(node, dialect.path);
}

/** `bool`, read through the `Types` a type was read through. */
function bool(ctype: CType): CType {
  return (ctype.types as Domains.Types).named("bool");
}

function refuse(dialect: Terms.Dialect, what: string): Error {
  return new NotImplementedError(`${dialect.name()} ${what} is not evaluated`);
}

/** A literal of the type its text encodes: an integer that its type holds, a floating value rounded to its type; a
 * type no evaluator has values of is refused. */
function literal(dialect: Terms.Dialect): (domain: any, value: unknown) => Typed {
  return (domain, value) => {
    if (!(domain instanceof Domains.CType)) {
      if (domain === Domains.String) return new Typed(null, value);
      throw refuse(dialect, `literal of ${domain.name()}`);
    }
    if (domain.kind === "floating") { // a literal's value is a binary64 number, rounded to its type
      return new Typed(domain, Ieee754.convert("binary64", value, domain.format as Ieee754.Format, EVEN));
    }
    if (!domain.contains(value)) throw new OverflowError(`integer literal ${value} does not fit '${domain.name()}'`);
    return new Typed(domain, value);
  };
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
      const datum = Ieee754.decode(source.format as Ieee754.Format, native);
      return new Typed(target, datum.special !== null || datum.coefficient !== 0n);
    }
    return new Typed(target, BigInt(native) !== 0n);
  }
  if (source.kind !== "floating") {
    const number = BigInt(native);
    if (target.kind === "integer") return new Typed(target, wrap(target, number));
    return new Typed(target, Ieee754.from_integer(number, target.format as Ieee754.Format, EVEN));
  }
  if (target.kind === "floating") return new Typed(target, Ieee754.convert(source.format as Ieee754.Format, native,
      target.format as Ieee754.Format, EVEN));
  const whole = Ieee754.to_integer(source.format as Ieee754.Format, native, ZERO);
  if (typeof whole === "number" || !target.contains(whole)) {
    const shown = typeof native === "string" ? native : repr(native);
    throw new OverflowError(`${shown} is out of range of '${target.name()}'`);
  }
  return new Typed(target, whole);
}

function common(left: Typed, right: Typed, operator: string): [CType, Typed, Typed] {
  const [a, b] = [arithmetic(left, operator), arithmetic(right, operator)];
  const ctype = Domains.common(a, b);
  // a decimal floating type and a binary one: a constraint C's usual arithmetic conversions impose
  if (ctype === null) {
    throw new TypeError(`invalid operands to binary ${operator} ('${a.name()}' and '${b.name()}')`);
  }
  return [ctype, convert(left, ctype), convert(right, ctype)];
}

/** An integer result: wrapped when unsigned; outside a signed type, undefined. */
function integerResult(ctype: CType, operator: string, value: bigint): Typed {
  if (!ctype.signed) return new Typed(ctype, wrap(ctype, value));
  if (!ctype.contains(value)) {
    throw new OverflowError(`signed overflow in ${operator}: ${value} does not fit '${ctype.name()}'`);
  }
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
      return new Typed(ctype, Ieee754.operate(FLOATING_OPERATORS[operator] as string, ctype.format as Ieee754.Format,
          EVEN, [a.value, b.value]));
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
    const ctype = Domains.promoted(arithmetic(left, operator));
    const countType = Domains.promoted(arithmetic(right, operator));
    if (ctype.kind === "floating" || countType.kind === "floating") {
      throw new TypeError(`invalid operands to binary ${operator} ('${nameOf(left)}' and '${nameOf(right)}')`);
    }
    const [value, count] = [BigInt(left.value), BigInt(right.value)];
    if (count < 0n || count >= BigInt(ctype.width)) {
      throw new ValueError(`shift by ${count} is undefined for '${ctype.name()}'`);
    }
    if (operator === ">>") return new Typed(ctype, value >> count);
    if (value < 0n) throw new ValueError("left shift of a negative value is undefined");
    return integerResult(ctype, operator, value << count);
  };
}

/** How two non-NaN floating values compare by value: -0 equals 0. */
function ieeeOrder(format: Ieee754.Format, a: unknown, b: unknown): number {
  const [x, y] = [Ieee754.decode(format, a), Ieee754.decode(format, b)];
  if (x.special === null && y.special === null && x.coefficient === 0n && y.coefficient === 0n) return 0;
  return Ieee754.compare(format, a, b) as number;
}

function comparison(operator: string): F.Implementation {
  const tests: Record<string, (o: number) => boolean> = {
    "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0,
    "==": (o) => o === 0, "!=": (o) => o !== 0,
  };
  return (args) => {
    const [ctype, a, b] = common((args[0] as F.Thunk)(), (args[1] as F.Thunk)(), operator);
    let order: number;
    if (ctype.kind === "floating") {
      const format = ctype.format as Ieee754.Format;
      const [x, y] = [Ieee754.decode(format, a.value), Ieee754.decode(format, b.value)];
      if (x.special === "nan" || y.special === "nan") return new Typed(bool(ctype), operator === "!=");
      order = ieeeOrder(format, a.value, b.value);
    } else {
      order = a.value > b.value ? 1 : a.value < b.value ? -1 : 0;
    }
    return new Typed(bool(ctype), (tests[operator] as (o: number) => boolean)(order));
  };
}

/** A scalar's truth, a `bool`. */
function truth(value: Typed, operator: string): Typed {
  return convert(value, bool(arithmetic(value, operator)));
}

function logical(operator: string): F.Implementation {
  return (args) => {
    const first = truth((args[0] as F.Thunk)(), operator);
    if (first.value === (operator === "||")) return first;
    return truth((args[1] as F.Thunk)(), operator);
  };
}

function unary(operator: string): F.Implementation {
  return (args) => {
    const value = (args[0] as F.Thunk)();
    if (operator === "!") {
      const held = truth(value, operator);
      return new Typed(held.ctype, !held.value);
    }
    const ctype = Domains.promoted(arithmetic(value, operator));
    const promoted = convert(value, ctype);
    if (ctype.kind === "floating") {
      if (operator === "~") throw new TypeError(`invalid argument type '${ctype.name()}' to unary expression`);
      return operator === "+" ? promoted : new Typed(ctype, Ieee754.operate("neg", ctype.format as Ieee754.Format, EVEN,
          [promoted.value]));
    }
    const number = promoted.value as bigint;
    return integerResult(ctype, operator, operator === "+" ? number : operator === "-" ? -number : ~number);
  };
}

function conditional(dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    if (Terms.argumentsOf(Terms.kindOf(node)[1])[1] === null) throw refuse(dialect,
        "conditionalexpression without a consequence");
    return truth((args[0] as F.Thunk)(), "?:").value ? (args[1] as F.Thunk)() : (args[2] as F.Thunk)();
  };
}

/** A mapping: a `Map`, or a plain object. */
function isMapping(value: unknown): value is Map<string, unknown> | Record<string, unknown> {
  if (value instanceof Map) return true;
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function attributes(node: any): Map<string, any> {
  return Terms.attributesOf(Terms.kindOf(node)[1]);
}

function cast(dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    const type_ = Terms.argumentsOf(Terms.kindOf(node)[1])[0]; // a C Types term, which the cast reads, not evaluates
    const [kind] = Terms.kindOf(type_);
    // invalid syntax where the type stands, refused as every dialect refuses it
    if (Terms.INVALID_KINDS.has(kind)) throw new ValueError(`${dialect.name()} ${kind} is not evaluated`);
    const target = Expressions.castType(Expressions.typeName(type_), typesOf(node, dialect));
    if (target === null) throw refuse(dialect, "castexpression to a type that is not arithmetic");
    return convert((args[1] as F.Thunk)(), target);
  };
}

/** A member's value: a list as an array of its items, lists of lists too. */
function array(value: unknown): unknown {
  return value instanceof Objects.Listed ? value.values.map(array) : value;
}

function member(dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    const held = attributes(node);
    const name = Expressions.spelling(held.get("member"));
    if (name === null || held.get("template_keyword")) throw refuse(dialect,
        "memberexpression of a member that is not an identifier");
    const target = (args[0] as F.Thunk)().value;
    let members: ReadonlyMap<string, unknown>;
    if (isMapping(target)) members = target instanceof Map ? target : new Map(Object.entries(target));
    else if (Objects.isObject(target)) members = Objects.properties(target);
    else throw new TypeError(`member reference base type '${typeName(target)}' is not a structure`);
    if (!members.has(name)) throw new KeyError(`no member named '${name}'`);
    return typed(array(members.get(name)), typesOf(node, dialect));
  };
}

function subscript(dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    if (args.length !== 2) throw refuse(dialect, "subscriptexpression of several indices");
    return element((args[0] as F.Thunk)(), (args[1] as F.Thunk)(), typesOf(node, dialect));
  };
}

function element(target: Typed, index: Typed, types: Domains.Types): Typed {
  if (!Array.isArray(target.value)) throw new TypeError(`subscripted value is not an array: '${nameOf(target)}'`);
  if (index.ctype === null || index.ctype.kind === "floating") {
    throw new TypeError(`array subscript is not an integer: '${nameOf(index)}'`);
  }
  const position = BigInt(index.value);
  if (position < 0n || position >= BigInt(target.value.length)) {
    throw new ValueError(`index ${position} is out of bounds of an array of ${target.value.length}`);
  }
  return typed(target.value[Number(position)], types);
}

function call(dialect: Terms.Dialect): F.Implementation {
  return (args, node, scope) => {
    const callee = Terms.argumentsOf(Terms.kindOf(node)[1])[0];
    if (dialect.kind(callee)[2].role !== Terms.REFERENCE || Terms.nameOf(callee) === null) {
      throw refuse(dialect, "callexpression of a callee that is not a function's name");
    }
    const fn = (scope as Scope).function(Terms.nameOf(callee));
    return typed(fn(...args.slice(1).map((argument) => (argument() as Typed).value)), typesOf(node, dialect));
  };
}

/** C's scope for an expression: `variables`, and the `functions` it may call. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn>;

  constructor(variables: S.Bindings = {}, options: { functions?: Record<string, Fn> } = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
  }

  override lookup(reference: any): unknown {
    const path = Terms.dialectOf(reference).slice("Expressions.".length, -".Term".length);
    if (Terms.nameOf(reference) === null) { // C++'s idexpression of a name that is not an identifier: `std::cout`
      throw new NotImplementedError(`${Terms.dialectName(path)} ${Terms.kindOf(reference)[0]} of a name that is not `
        + "an identifier is not evaluated");
    }
    return typed(super.lookup(reference), new Domains.Types(reference, path));
  }

  override unbound(reference: any): never {
    throw new NameError(`use of undeclared identifier '${Terms.nameOf(reference)}'`);
  }

  function(name: string): Fn {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new NameError(`use of undeclared identifier '${name}'`);
    return fn;
  }
}

/** The kinds the evaluator evaluates, those C evaluated before it was complete; any other is refused by name. */
export const EVALUATED: ReadonlySet<string> = new Set([Expressions.LITERAL, Expressions.VARIABLE,
  Expressions.UNARYEXPRESSION, Expressions.BINARYEXPRESSION, Expressions.CONDITIONALEXPRESSION,
  Expressions.CASTEXPRESSION, Expressions.MEMBEREXPRESSION, Expressions.SUBSCRIPTEXPRESSION,
  Expressions.CALLEXPRESSION]);

/** The interpreter of a dialect of the C family, `C`'s or `Cpp`'s, evaluating the kinds `evaluated` names: its values
 * carry their C types. */
export function interpreter(dialect: Terms.Dialect, evaluated: ReadonlySet<string> = EVALUATED): F.Interpreter {
  return new F.Interpreter(dialect, new Map<string, any>([
    [Expressions.BINARYEXPRESSION, new Map<string, F.Implementation>([
      ...["+", "-", "*", "/", "%", "&", "^", "|"].map((op) => [op, binaryArithmetic(op)] as [string, F.Implementation]),
      ...["<<", ">>"].map((op) => [op, shift(op)] as [string, F.Implementation]),
      ...["<", "<=", ">", ">=", "==", "!="].map((op) => [op, comparison(op)] as [string, F.Implementation]),
      ...["&&", "||"].map((op) => [op, logical(op)] as [string, F.Implementation]),
    ])],
    [Expressions.UNARYEXPRESSION, new Map<string, F.Implementation>(["+", "-", "~", "!"].map((op) => [op, unary(op)]))],
    [Expressions.CONDITIONALEXPRESSION, conditional(dialect)], [Expressions.CASTEXPRESSION, cast(dialect)],
    [Expressions.MEMBEREXPRESSION, member(dialect)], [Expressions.SUBSCRIPTEXPRESSION, subscript(dialect)],
    [Expressions.CALLEXPRESSION, call(dialect)],
  ]), { literal: untyped, typed: literal(dialect), scope: (variables) => new Scope(variables), evaluated });
}

/** The interpreter of the C dialect. */
export const INTERPRETER = interpreter(Expressions.DIALECT);

/** The value of a term in `scope`, or with the variables in an object bound: its native. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return (INTERPRETER.run(expression, scope) as Typed).value;
}
