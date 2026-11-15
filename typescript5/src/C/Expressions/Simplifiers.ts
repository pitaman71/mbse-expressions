/**
 * Simplifiers of the C dialect: simplify an expression by ISO/IEC 9899's rules, which ISO/IEC 14882's share where C++
 * has C's kinds (`Cpp`'s simplifier is `simplifier(Cpp.Expressions.DIALECT, ...)`, its own kinds' rules added by
 * `rules(..., extend)`), under the ABI the expression's holder names.
 *
 * `Simplifiers.OfAny(term, scope)` simplifies a term value (or anything `Terms.term` reads one from, an `Expression`)
 * in a `new Scope(variables, { functions, packs })` (see `Framework/Simplifiers`). Values carry their C type while
 * folding (`Typed`), and a value folds into the literal of its type, its suffix as C writes it, where its type has one
 * (`Domains.literalSuffix`): an `int`, `long` or `long long`, signed or not (`5u`; a typedef's value as the standard
 * type it is, an `int64_t`'s `5l`), a `bool`, a string, `nullptr`, a floating value of a type with a suffix whose
 * binary64 literal rounds back to it exactly (`2.5f`, `3.0L`, `0.3dd`, `1.5f16`; a non-finite one has none), and a
 * bit-precise integer's whose narrowest literal is of its type (`7wb`). A value of any other type has no literal, and
 * stays, its subterms simplified: a `char`, a `short`, a `wchar_t` in C++, a `long double` that no binary64 literal
 * spells, a `_BitInt(N)` wider than its value's literal, an array, `void`, an object. Its arithmetic folds all the
 * same, its operands promoted: `(char)200 + 0` is the `int` -56 under x86-64's System V ABI. A simplification whose
 * root is a literal gives its native as its value: a bigint, a number (a value of a format whose values are text, as
 * its text, as `Patterns.Ieee754` writes it), a boolean, a string, null for `nullptr`. A literal's type is what its
 * text encodes (`Domains.literal`: `5u` an `unsigned int`, `1.5f` a `float`, `'a'` C's `int` and C++'s `char`, `5wb` a
 * `_BitInt(4)`), else its value's; a variable's type is its value's: a boolean is a `bool`, a bigint an `int`, `long`
 * or `unsigned long` as the first that holds it, a number a `double`, null `nullptr` (a value carries no domain: a
 * variable of another type waits for domain inference, mbse-basis [CAP-232: domains inferred for
 * terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)). Every named type it computes in is a stored domain, read
 * through the term's holder (`Domains.Types`): among its dialect's domains, then its holder's ABI's, so the same term
 * folds as each ABI says (`(char)200` is -56 under x86-64's System V ABI, where `char` is signed, and 200 under
 * AAPCS64's; `long double` is x87's format under the one and `binary128` under the other; `sizeof(long double)` 16
 * under both, mbse-basis [CAP-267: C and C++ terms read under the ABI their holder
 * names](mbse:mbse-basis/docs/capabilities/CAP-267.md)). A lone term is refused where it reads a type (mbse-schemas'
 * TypeError), and so is a type neither dialect defines, by name. C's rules apply:
 *
 * - The integer promotions and the usual arithmetic conversions decide the type an operator computes in (see
 *   `Domains`); a bit-precise integer type is not promoted, and ranks below a standard type of its width (C23,
 *   6.3.1.1); unsigned arithmetic wraps, and floating arithmetic rounds to nearest, ties to even, as IEEE 754
 *   specifies, in the type's format, decimal ones too; a decimal floating operand with a binary one is refused
 *   (`TypeError`), as C's constraint has it.
 * - What C leaves undefined throws: a signed result outside its type (`OverflowError`), an integer divided by zero
 *   (`ZeroDivisionError`), a shift by a negative count or by the width or more, a left shift of a negative value, and a
 *   cast of a floating value outside the target type (`OverflowError`) or of NaN (`ValueError`).
 * - Division truncates toward zero, and `%` takes the dividend's sign; `>>` of a negative value is arithmetic.
 * - Comparisons and `&&`, `||` and `!` give `bool`, as in C++ (C's `int` results compute alike once promoted); `&&` and
 *   `||` evaluate their second operand only when the first does not decide. `nullptr` (C23's and C++'s) is false,
 *   equals `nullptr` and the integer literal 0, and is the operand of nothing else.
 * - A cast converts, to an arithmetic type: to an integer type by wrapping into its width (as C++20 defines), from a
 *   floating value by truncation; to a floating type by rounding; to `bool` by comparing with zero; to `void`, its
 *   operand evaluated, to no value; to `_BitInt(N)` as to any integer type.
 * - `condition ? a : b` evaluates only the operand it chooses, converted to the type the usual arithmetic conversions
 *   give the two (ISO/IEC 9899, 6.5.15), where the other's type is known without evaluating it (its declaration's
 *   otherwise, the chosen one's kept); GNU's `a ?: b` is `a`, evaluated once, unless it is zero. `a, b` evaluates `a`,
 *   then is `b`: where `a` is known, `b` is the residual.
 * - Parentheses and GNU's `__extension__` are their operand; adjacent string literals one string.
 * - `sizeof` and `alignof` (`_Alignof`) give a `size_t`, of a type name or of an operand's type, unevaluated: a
 *   scalar's size and alignment are its ABI's (`Domains.layout`), an array's its elements'. `_Generic` chooses the
 *   association whose type is its controlling operand's (its value unevaluated), by C's identity of types
 *   (`Domains.Types.identity`: `int64_t` is `long`, `char` is neither `signed char` nor `unsigned char`), or its
 *   `default`. A compound literal of an arithmetic type is its initializer's value converted; of an array of one, an
 *   array (designators and string initializers of a character array among its items), whose elements a subscript reads,
 *   with no literal of its own.
 * - `object.name` and `object->name` read a member (a property of a data object, read through mbse-schemas' readers
 *   (`Framework.Objects`), or a key of a mapping); `array[index]` an element of an array, of a container or of a
 *   compound literal; `f(args)` calls a function the scope provides, by its name, and nothing else, a pack expansion's
 *   values spliced among its arguments.
 *
 * `FOLDED` names the kinds its rules fold, every kind of class (a) in the evaluation inventory (mbse-expressions' [the
 * evaluation inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#c-and-c), C and C++). What stays,
 * named, with its class (`CATEGORIES`): writes, statements, the object model (`*`, `&`, a cast to a type that is not
 * arithmetic, a call of a callee that is not a function's name), class `d`; an initializer list alone, class `b`; an
 * operand whose type its declaration gives (`sizeof(x.a)`), class `c`; a layout no ABI dialect stores (a bit-precise
 * integer's, `nullptr_t`'s), nested braces and an array of arrays in a compound literal, class `a`; a term of `C Types`
 * or `C Preprocessor`, by the dialect that owns it; and invalid syntax ("C error is not simplified"), where a cast's
 * type stands too. A name the scope does not bind, or a function it does not provide, stays.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import { OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Simplifiers.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { KeyError, ValueError } = Errors;
const { repr, typeName } = Repr;
type CType = Domains.CType;
type Fn = (...args: any[]) => unknown;
const [EVEN, ZERO] = ["roundTiesToEven", "roundTowardZero"];

/** `void`: the value of an expression of type `void`, and that type. */
class Void {
  toString(): string {
    return "void";
  }
}

/** The value of an expression of type `void` (a cast to `void`), and the type `void` a type name names. */
export const VOID = new Void();

/** A value while folding: its C type (null for `nullptr`, a string, an array, `void` or an object) and its native (null
 * for `nullptr`). */
export class Typed {
  constructor(readonly ctype: CType | null, readonly value: any) {}
}

/** An array type: its `element` type and its `length` (null where an initializer gives it). */
export class ArrayType {
  constructor(readonly element: any, readonly length: bigint | null) {}
}

/** A pack expansion's values, which a call's arguments splice. */
export class Pack {
  constructor(readonly items: readonly Typed[]) {}
}

/** An operand whose type its declaration gives (a member, a call's result), not its value: thrown by the typing of an
 * operand left unevaluated. */
export class Untyped extends Error {}

/** The language a dialect of the family writes: `C`, or `C++` for `Cpp`. */
export function language(dialect: Terms.Dialect): string {
  return dialect.name() === "C" ? "C" : "C++";
}

export function describe(value: Typed): string {
  if (value.ctype !== null) return value.ctype.name();
  if (value.value === null) return "nullptr_t";
  return value.value === VOID ? "void" : typeName(value.value);
}

/** Whether a value is `nullptr`. */
function isNull(value: Typed): boolean {
  return value.ctype === null && value.value === null;
}

/** A value no type holds, a bigint beyond every type: refused. */
function untyped(value: unknown): Typed {
  throw new OverflowError(`integer ${value} is too large for any type`);
}

/** A variable's or a member's value, with its type, read through `types`: a boolean, a bigint or a number by its value
 * (`Domains.of`); any other, null (`nullptr`) among them, with none. */
export function typed(value: unknown, types: Domains.Types): Typed {
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
  return new F.NoRule(dialect.name(), what);
}

/** A literal of the type its text encodes: an integer that its type holds, a floating value rounded to its type; a
 * type no rule has values of stays, named. */
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
  if (value.ctype === null) throw new TypeError(`invalid operand to ${operator}: '${describe(value)}'`);
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
 * toward a floating type, and anything nonzero is true (`nullptr` false). */
export function convert(value: Typed, target: CType): Typed {
  if (isNull(value) && target.kind === "bool") return new Typed(target, false);
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

export function common(left: Typed, right: Typed, operator: string): [CType, Typed, Typed] {
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

/** A scalar's truth, a `bool` (`nullptr`'s false, its `bool` read through the holder of `node`). */
export function truth(value: Typed, operator: string, node: unknown, dialect: Terms.Dialect): Typed {
  if (isNull(value)) return new Typed(typesOf(node, dialect).named("bool"), false);
  return convert(value, bool(arithmetic(value, operator)));
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
      throw new TypeError(`invalid operands to binary ${operator} ('${describe(left)}' and '${describe(right)}')`);
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

/** Whether a term is the integer literal 0, in parentheses or not: a null pointer constant, and what an ordering is
 * compared with. */
export function zero(term: unknown, dialect: Terms.Dialect): boolean {
  if (term === null || term === undefined) return false;
  let [tag, record] = dialect.kind(term);
  while (tag === Expressions.PARENTHESIZEDEXPRESSION) [tag, record] = dialect.kind(Terms.argumentsOf(record)[0]);
  const value = Terms.attributesOf(record).get("value");
  return tag === Expressions.LITERAL && typeof value === "bigint" && value === 0n;
}

/** How two non-NaN floating values compare by value: -0 equals 0. */
export function order(format: Ieee754.Format, a: unknown, b: unknown): number {
  const [x, y] = [Ieee754.decode(format, a), Ieee754.decode(format, b)];
  if (x.special === null && y.special === null && x.coefficient === 0n && y.coefficient === 0n) return 0;
  return Ieee754.compare(format, a, b) as number;
}

function comparison(operator: string, dialect: Terms.Dialect): F.Implementation {
  const tests: Record<string, (o: number) => boolean> = {
    "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0,
    "==": (o) => o === 0, "!=": (o) => o !== 0,
  };
  return (args, node) => {
    const [left, right] = [(args[0] as F.Thunk)(), (args[1] as F.Thunk)()];
    if (isNull(left) || isNull(right)) { // nullptr equals nullptr, and a null pointer constant
      const terms = Terms.argumentsOf(Terms.kindOf(node)[1]);
      if ((operator !== "==" && operator !== "!=")
        || ![left, right].every((value, i) => isNull(value) || zero(terms[i], dialect))) {
        throw new TypeError(`invalid operands to binary ${operator} ('${describe(left)}' and '${describe(right)}')`);
      }
      return new Typed(typesOf(node, dialect).named("bool"), operator === "==");
    }
    const [ctype, a, b] = common(left, right, operator);
    let found: number;
    if (ctype.kind === "floating") {
      const format = ctype.format as Ieee754.Format;
      const [x, y] = [Ieee754.decode(format, a.value), Ieee754.decode(format, b.value)];
      if (x.special === "nan" || y.special === "nan") return new Typed(bool(ctype), operator === "!=");
      found = order(format, a.value, b.value);
    } else {
      found = a.value > b.value ? 1 : a.value < b.value ? -1 : 0;
    }
    return new Typed(bool(ctype), (tests[operator] as (o: number) => boolean)(found));
  };
}

function logical(operator: string, dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    const first = truth((args[0] as F.Thunk)(), operator, node, dialect);
    if (first.value === (operator === "||")) return first;
    return truth((args[1] as F.Thunk)(), operator, node, dialect);
  };
}

/** `a, b`: `a` evaluated, then `b`'s value. */
const comma: F.Implementation = (args) => {
  (args[0] as F.Thunk)();
  return (args[1] as F.Thunk)();
};

function unary(operator: string, dialect: Terms.Dialect): F.Implementation {
  return (args, node) => {
    const value = (args[0] as F.Thunk)();
    if (operator === "!") {
      const held = truth(value, operator, node, dialect);
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

/** A mapping: a `Map`, or a plain object. */
function isMapping(value: unknown): value is Map<string, unknown> | Record<string, unknown> {
  if (value instanceof Map) return true;
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function attributes(node: any): Map<string, any> {
  return Terms.attributesOf(Terms.kindOf(node)[1]);
}

/** A member's value: a list as an array of its items, lists of lists too. */
function array(value: unknown): unknown {
  return value instanceof Objects.Listed ? value.values.map(array) : value;
}

function element(target: Typed, index: Typed, types: Domains.Types): Typed {
  if (!Array.isArray(target.value)) throw new TypeError(`subscripted value is not an array: '${describe(target)}'`);
  if (index.ctype === null || index.ctype.kind === "floating") {
    throw new TypeError(`array subscript is not an integer: '${describe(index)}'`);
  }
  const position = BigInt(index.value);
  if (position < 0n || position >= BigInt(target.value.length)) {
    throw new ValueError(`index ${position} is out of bounds of an array of ${target.value.length}`);
  }
  const item = target.value[Number(position)];
  return item instanceof Typed ? item : typed(item, types); // a compound literal's element keeps its type
}

/** A value's native, an array's an array of its elements' natives. */
export function native(value: Typed): unknown {
  const held = value.value;
  return Array.isArray(held) && held.length > 0 && held[0] instanceof Typed ? held.map(native) : held;
}

/** C's and C++'s scope for an expression: `variables` (C++'s `this` among them, by that name, and a qualified name's
 * value by its spelling, `ns::x`), the `functions` it may call, and C++'s `packs`, each a function parameter pack's
 * values by its name, which a pack expansion, a fold and `sizeof...` read. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn>;
  readonly packs: ReadonlyMap<string, readonly unknown[]>;

  constructor(variables: S.Bindings = {},
    options: { functions?: Record<string, Fn>; packs?: Record<string, readonly unknown[]> } = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
    this.packs = new Map(Object.entries(options.packs ?? {}).map(([name, values]) => [name, [...values]]));
  }

  override lookup(reference: any): unknown {
    const path = Terms.dialectOf(reference).slice("Expressions.".length, -".Term".length);
    const [tag, record] = Terms.kindOf(reference);
    const types = new Domains.Types(reference, path);
    if (tag === "thisexpression") return typed(this.value("this"), types); // C++'s `this`, bound by that name
    let name = Terms.nameOf(reference);
    if (name === null) { // C++'s idexpression of a name that is not an identifier: its spelling, where it is qualified
      name = qualified(Terms.attributesOf(record).get("name"));
      if (name === null) throw new F.NoRule(Terms.dialectName(path), `${tag} of a name that is not an identifier`);
    }
    return typed(this.value(name), types);
  }

  function(name: string): Fn {
    const fn = this.functions.get(name);
    if (fn === undefined) throw new S.Unbound(name);
    return fn;
  }

  /** Whether `name` is bound to a value (not to `Symbolics.UNKNOWN`). */
  bound(name: string): boolean {
    const [found, value] = this.find(name);
    return found && value !== S.UNKNOWN;
  }

  /** The values of the pack `name`; throws `Unbound` where it binds none. */
  pack(name: string): readonly unknown[] {
    const values = this.packs.get(name);
    if (values === undefined) throw new S.Unbound(name);
    return values;
  }
}

/** A qualified name's spelling (`ns::x`, `::x`), where its qualifiers and its name are identifiers; null otherwise. */
function qualified(name: unknown): string | null {
  if (!(name instanceof Terms.Part) || name.kind !== "qualifiedname") return null;
  const parts = [...((name.attributes.get("qualifiers") as Terms.Part[] | undefined) ?? []),
    name.attributes.get("name") as Terms.Part | undefined];
  if (parts.some((part) => part === undefined || part.kind !== "identifier")) return null;
  return (name.attributes.get("global_scope") ? "::" : "") + parts.map((part) => (part as Terms.Part).attributes
    .get("spelling") as string).join("::");
}

// --- Types read from type names, and the types of operands left unevaluated ---

const TRUTHS = ["<", "<=", ">", ">=", "==", "!=", "&&", "||"];
const ARITHMETIC = ["+", "-", "*", "/", "%", "&", "^", "|", "<<", ">>"];

/** The folding rules of a dialect of the family: the framework's interpreter, with `nullptr`'s value, which its kind's
 * role does not give; `declared(type, node, scope)`, the type a type name names; `typeOf(term, scope)`, an unevaluated
 * operand's type; and `typings`, how each kind a dialect adds is typed (C++'s casts). */
export class Rules extends F.Interpreter {
  readonly typings = new Map<string, (term: any, scope: any) => any>();

  override evaluate(node: any, scope: any): any {
    const [tag, record] = Terms.kindOf(node);
    if (tag === Expressions.CONSTANT && this.dialect.owner(node) === this.dialect) {
      if (Terms.attributesOf(record).get("singleton") !== "nullptr") {
        throw new ValueError("a constant needs the singleton nullptr");
      }
      return new Typed(null, null);
    }
    return super.evaluate(node, scope);
  }

  /** The type a type name names (a C Types or Cpp Types term): an arithmetic type, a bit-precise integer type, `VOID`,
   * or an array of one (`ArrayType`); null for any other (a pointer, a structure, a function, a type a program
   * declares). Invalid syntax stays, named by its owner. */
  declared(term: any, node: any, scope: any): any {
    const [tag] = Terms.kindOf(term);
    if (Terms.INVALID_KINDS.has(tag)) throw new F.NoRule(this.dialect.owner(term).name(), tag);
    const tree = Terms.node(...Terms.kindOf(term)); // a typeid, or an enumerator, which names none
    const base = this.specified(many(tree.helpers.get("specifiers")), typesOf(node, this.dialect), scope);
    return base === null ? null : this.derived((tree.helpers.get("declarator") ?? null) as Terms.Node | null, base,
      scope);
  }

  private specified(specifiers: readonly Terms.Node[], types: Domains.Types, scope: any): any {
    const words: (string | null)[] = [];
    let width: unknown = null;
    for (const specifier of specifiers) {
      if (specifier.kind === "primitivetypespecifier" || specifier.kind === "cvqualifier") {
        words.push(specifier.attributes.get("keyword") as string);
      } else if (specifier.kind === "namedtypespecifier") {
        words.push(Expressions.spelling(specifier.helpers.get("name") as Terms.Node | undefined));
      } else if (specifier.kind === "bitintspecifier") {
        width = specifier.subterms.get("width");
      } else {
        return null;
      }
    }
    const rest = words.filter((word) => !Domains.QUALIFIERS.has(word as string));
    if (width !== null) { // C23's `_BitInt(N)`, signed or not
      if (rest.length > 1 || (rest.length === 1 && rest[0] !== "signed" && rest[0] !== "unsigned")) {
        throw new TypeError(`invalid type specifiers with '_BitInt': ${rest.join(" ")}`);
      }
      const signed = rest[0] !== "unsigned";
      const bits = this.evaluate(width, scope) as Typed;
      const named = `${signed ? "" : "unsigned "}_BitInt`;
      if (bits.ctype === null || bits.ctype.kind !== "integer") {
        throw new TypeError(`width of '${named}' has non-integer type '${describe(bits)}'`);
      }
      if (bits.value < (signed ? 2n : 1n)) throw new TypeError(`width of '${named}' is too small: ${bits.value}`);
      return Domains.bitPrecise(Number(bits.value), signed, types);
    }
    if (rest.length === 1 && rest[0] === "void") return VOID;
    return Expressions.castType(Domains.arithmetic(words), types);
  }

  /** The type an abstract declarator derives from `base`: arrays, each of its size (`int[2][3]` an array of 2 arrays
   * of 3); null for any other (a pointer, a function). */
  private derived(declarator: Terms.Node | null, base: any, scope: any): any {
    if (declarator === null) return base;
    const inner = (declarator.helpers.get("declarator") ?? null) as Terms.Node | null;
    if (declarator.kind !== "arraydeclarator" || base === VOID) return null;
    const size = declarator.subterms.get("size") ?? null;
    let length: bigint | null = null;
    if (size !== null) {
      const counted = this.evaluate(size, scope) as Typed;
      if (counted.ctype === null || counted.ctype.kind !== "integer") {
        throw new TypeError(`size of an array has non-integer type '${describe(counted)}'`);
      }
      if (counted.value <= 0n) throw new TypeError(`size of an array is not positive: ${counted.value}`);
      length = counted.value as bigint;
    }
    return this.derived(inner, new ArrayType(base, length), scope);
  }

  /** The type of an operand C leaves unevaluated (`sizeof`'s, `_Generic`'s, the conditional's other one): a `CType`, an
   * `ArrayType` (a string literal's, a compound literal's), `VOID` or `Domains.NULLPTR`, by its kind, a variable's by
   * its value; throws `Untyped` where its declaration gives it (a member, a call's result). */
  typeOf(term: any, scope: any): any {
    const dialect = this.dialect;
    const [tag, record, kind] = dialect.kind(term);
    const owner = dialect.owner(term);
    if (kind.role === Terms.INVALID || owner !== dialect) throw new F.NoRule(owner.name(), tag);
    const args = Terms.argumentsOf(record);
    const held = Terms.attributesOf(record);
    if (tag === Expressions.LITERAL && typeof held.get("value") === "string") {
      return stringType(held, typesOf(term, dialect));
    }
    if (tag === Expressions.LITERAL || tag === Expressions.CONSTANT || kind.role === Terms.REFERENCE) {
      const value = this.evaluate(term, scope) as Typed;
      if (value.ctype === null && !isNull(value)) throw new Untyped(tag);
      return isNull(value) ? Domains.NULLPTR : value.ctype;
    }
    if (tag === Expressions.CONCATENATEDSTRING) {
      const parts = args.map((part) => Terms.attributesOf(Terms.kindOf(part)[1]));
      if (parts.some((part) => typeof part.get("value") !== "string")) throw new Untyped(tag);
      const prefixes = parts.map((part) => part.get("prefix")).filter((prefix) => prefix !== undefined).sort();
      const joined = new Map<string, unknown>([["value", parts.map((part) => part.get("value")).join("")]]);
      if (prefixes.length > 0) joined.set("prefix", prefixes[0]);
      return stringType(joined, typesOf(term, dialect));
    }
    if (tag === Expressions.PARENTHESIZEDEXPRESSION || tag === Expressions.EXTENSIONEXPRESSION) {
      return this.typeOf(args[0], scope);
    }
    if (tag === Expressions.CASTEXPRESSION) return Rules.scalar(this.declared(args[0], term, scope), tag);
    if (tag === Expressions.UNARYEXPRESSION) return this.unaryType(held.get("operator"), args[0], term, scope);
    if (tag === Expressions.BINARYEXPRESSION) return this.binaryType(held.get("operator"), args, term, scope);
    if (tag === Expressions.CONDITIONALEXPRESSION) {
      const first = this.typeOf(args[1] ?? args[0], scope);
      return this.armsType(first, this.typeOf(args[2], scope), tag);
    }
    if (tag === Expressions.SIZEOFEXPRESSION || tag === Expressions.ALIGNOFEXPRESSION
      || tag === "sizeofpackexpression") return typesOf(term, dialect).named("size_t");
    if (tag === Expressions.GENERICSELECTION) return this.typeOf(args[this.select(term, scope)], scope);
    if (tag === Expressions.COMPOUNDLITERALEXPRESSION) {
      const declared = this.declared(args[0], term, scope);
      if (declared instanceof ArrayType && declared.length === null) {
        return new ArrayType(declared.element, BigInt((this.evaluate(term, scope) as Typed).value.length));
      }
      return declared instanceof ArrayType ? declared : Rules.scalar(declared, tag);
    }
    const typing = this.typings.get(tag);
    if (typing !== undefined) return typing(term, scope);
    throw new Untyped(tag);
  }

  private static scalar(declared: any, tag: string): any {
    if (declared === VOID || declared instanceof Domains.CType) return declared;
    throw new Untyped(tag);
  }

  /** The type of a comparison and of `&&`, `||` and `!`: C's `int`, C++'s `bool`. */
  private truthType(term: any): CType {
    return typesOf(term, this.dialect).named(language(this.dialect) === "C" ? "int" : "bool");
  }

  private arithmeticType(operand: any, operator: string, scope: any): CType {
    const found = this.typeOf(operand, scope);
    if (!(found instanceof Domains.CType)) {
      throw new TypeError(`invalid operand to ${operator}: '${typeNameOf(found)}'`);
    }
    return found;
  }

  private unaryType(operator: string, operand: any, term: any, scope: any): CType {
    if (operator === "!") return this.truthType(term);
    if (!["+", "-", "~"].includes(operator)) throw new Untyped(Expressions.UNARYEXPRESSION); // the object model's
    return Domains.promoted(this.arithmeticType(operand, operator, scope));
  }

  private binaryType(operator: string, args: readonly any[], term: any, scope: any): any {
    if (operator === ",") { // its right operand's, an array's converted to a pointer
      const right = this.typeOf(args[1], scope);
      if (right instanceof ArrayType) throw new Untyped(Expressions.BINARYEXPRESSION);
      return right;
    }
    if (TRUTHS.includes(operator)) return this.truthType(term);
    if (!ARITHMETIC.includes(operator)) throw new Untyped(Expressions.BINARYEXPRESSION); // `<=>`, `.*`, `->*`
    const [left, right] = args.map((argument) => this.arithmeticType(argument, operator, scope)) as [CType, CType];
    if (operator === "<<" || operator === ">>") return Domains.promoted(left);
    const found = Domains.common(left, right);
    if (found === null) {
      throw new TypeError(`invalid operands to binary ${operator} ('${left.name()}' and '${right.name()}')`);
    }
    return found;
  }

  /** The type of a conditional whose operands' types are `first` and `second`: the usual arithmetic conversions' of two
   * arithmetic types (in C++, one type where both are it), `nullptr_t` or `void` where both are. */
  armsType(first: any, second: any, tag: string): any {
    if (first instanceof Domains.CType && second instanceof Domains.CType) {
      if (language(this.dialect) === "C++" && this.identity(first) === this.identity(second)) return first;
      const found = Domains.common(first, second);
      if (found === null) {
        throw new TypeError(`invalid operands to conditional expression ('${first.name()}' and '${second.name()}')`);
      }
      return found;
    }
    if (first === second && (first === VOID || first === Domains.NULLPTR)) return first;
    throw new Untyped(tag);
  }

  /** The name of the type a type is (`Domains.Types.identity`), `void` or `nullptr_t`. */
  identity(type: any): string {
    if (type instanceof Domains.CType) return (type.types as Domains.Types).identity(type, language(this.dialect));
    return type === VOID ? "void" : "nullptr_t";
  }

  /** The position among a generic selection's arguments of the value its controlling operand's type chooses. */
  select(term: any, scope: any): number {
    const args = Terms.argumentsOf(Terms.kindOf(term)[1]);
    const controlling = args[0];
    let found: any;
    try {
      if (Terms.kindOf(controlling)[0] === Expressions.TYPEID) { // a type name (C2y)
        found = this.declared(controlling, term, scope);
        if (found === null || found instanceof ArrayType) {
          throw refuse(this.dialect, "genericselection of a type that is not arithmetic");
        }
      } else {
        found = this.typeOf(controlling, scope);
        if (found instanceof ArrayType) throw new Untyped(Expressions.GENERICSELECTION); // converted to a pointer
      }
    } catch (error) {
      if (error instanceof Untyped) throw refuse(this.dialect, "genericselection of an operand of unknown type");
      throw error;
    }
    const identity = this.identity(found);
    let [chosen, fallback]: [number | null, number | null] = [null, null];
    for (let i = 1; i < args.length; i += 2) {
      const association = args[i];
      if (association === null) { // `default`
        fallback = i + 1;
        continue;
      }
      const tree = Terms.node(...Terms.kindOf(association));
      const specifiers = many(tree.helpers.get("specifiers"));
      // a qualified type, which no operand's type is after its lvalue conversion
      if (tree.kind === Expressions.TYPEID && specifiers.some((s) => s.kind === "cvqualifier")) continue;
      const declared = this.declared(association, term, scope);
      if (declared === null || declared instanceof ArrayType) {
        if (tree.kind === Expressions.TYPEID && !tree.helpers.has("declarator")
          && !specifiers.some((s) => s.kind === "classspecifier")) {
          throw refuse(this.dialect, "genericselection of an association of a type a declaration names");
        }
        continue; // a pointer, an array, a structure or a union: not an operand's arithmetic type
      }
      if (this.identity(declared) === identity) {
        if (chosen !== null) throw new TypeError(`'_Generic' specifies two associations of type '${identity}'`);
        chosen = i + 1;
      }
    }
    if (chosen === null && fallback === null) {
      throw new TypeError(`'_Generic' selector of type '${identity}' is not compatible with any association`);
    }
    return (chosen ?? fallback) as number;
  }
}

/** A helper's nodes: none where it holds none. */
function many(value: unknown): readonly Terms.Node[] {
  return (value ?? []) as readonly Terms.Node[];
}

function typeNameOf(type: any): string {
  if (type instanceof ArrayType) return "array";
  return type === VOID ? "void" : type.name();
}

/** The type of a string literal's elements, by its encoding prefix. */
const ENCODED: ReadonlyMap<string | undefined, string> = new Map([[undefined, "char"], ["u8", "char8_t"],
  ["u", "char16_t"], ["U", "char32_t"], ["L", "wchar_t"]]);

/** A string literal's type: an array of its encoding's code units, and its terminating zero. */
function stringType(held: ReadonlyMap<string, any>, types: Domains.Types): ArrayType {
  const element = types.named(ENCODED.get(held.get("prefix")) as string);
  const text = held.get("value") as string;
  const units = element.width === 8 ? new TextEncoder().encode(text).length
    : element.width === 16 ? text.length : [...text].length;
  return new ArrayType(element, BigInt(units + 1));
}

// --- Kinds ---

function conditional(dialect: Terms.Dialect, rules: Rules): F.Implementation {
  return (args, node, scope) => {
    const terms = Terms.argumentsOf(Terms.kindOf(node)[1]);
    const condition = (args[0] as F.Thunk)();
    let chosen: Typed;
    let other: unknown;
    if (terms[1] === null) { // GNU's `a ?: b`: `a` once, `b` where it is zero
      [chosen, other] = truth(condition, "?:", node, dialect).value ? [condition, terms[2]]
        : [(args[2] as F.Thunk)(), terms[0]];
    } else if (truth(condition, "?:", node, dialect).value) {
      [chosen, other] = [(args[1] as F.Thunk)(), terms[2]];
    } else {
      [chosen, other] = [(args[2] as F.Thunk)(), terms[1]];
    }
    if (chosen.ctype === null) return chosen;
    let found: any;
    try { // the other operand's type, unevaluated: the usual arithmetic conversions of the two
      found = rules.typeOf(other, scope);
    } catch (error) {
      if (error instanceof Untyped || error instanceof S.Unbound || error instanceof F.NoRule) return chosen;
      throw error; // its declaration's: the chosen one's type kept
    }
    if (!(found instanceof Domains.CType)) return chosen;
    return convert(chosen, rules.armsType(chosen.ctype, found, Expressions.CONDITIONALEXPRESSION));
  };
}

function cast(dialect: Terms.Dialect, rules: Rules): F.Implementation {
  return (args, node, scope) => {
    const target = rules.declared(Terms.argumentsOf(Terms.kindOf(node)[1])[0], node, scope); // read, not folded
    if (target === VOID) { // its operand evaluated, to no value
      (args[1] as F.Thunk)();
      return new Typed(null, VOID);
    }
    if (!(target instanceof Domains.CType)) throw refuse(dialect, "castexpression to a type that is not arithmetic");
    return convert((args[1] as F.Thunk)(), target);
  };
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

function call(dialect: Terms.Dialect): F.Implementation {
  return (args, node, scope) => {
    const callee = Terms.argumentsOf(Terms.kindOf(node)[1])[0];
    if (dialect.kind(callee)[2].role !== Terms.REFERENCE || Terms.nameOf(callee) === null) {
      throw refuse(dialect, "callexpression of a callee that is not a function's name");
    }
    const fn = (scope as Scope).function(Terms.nameOf(callee));
    const values: Typed[] = [];
    for (const argument of args.slice(1)) {
      const value = (argument as F.Thunk)() as Typed;
      if (value.value instanceof Pack) values.push(...value.value.items); // a pack expansion spliced
      else values.push(value);
    }
    return typed(fn(...values.map(native)), typesOf(node, dialect));
  };
}

/** Adjacent string literals: one string. */
const concatenated: F.Implementation = (args) => {
  const parts = args.map((argument) => (argument as F.Thunk)() as Typed);
  for (const part of parts) {
    if (typeof part.value !== "string") {
      throw new TypeError(`invalid operand to a string concatenation: '${describe(part)}'`);
    }
  }
  return new Typed(null, parts.map((part) => part.value).join(""));
};

/** `sizeof` and `alignof` of a type name or of an operand's type, unevaluated, as the ABI lays it out. */
function size(dialect: Terms.Dialect, rules: Rules): F.Implementation {
  return (_args, node, scope) => {
    const [tag, record] = Terms.kindOf(node);
    const operand = Terms.argumentsOf(record)[0];
    let found: any;
    if (Terms.kindOf(operand)[0] === Expressions.TYPEID) {
      found = rules.declared(operand, node, scope);
      if (found === null) throw refuse(dialect, `${tag} of a type that is not arithmetic`);
    } else {
      try {
        found = rules.typeOf(operand, scope);
      } catch (error) {
        if (error instanceof Untyped) throw refuse(dialect, `${tag} of an operand of unknown type`);
        throw error;
      }
    }
    const keyword = (Terms.attributesOf(record).get("keyword") ?? "sizeof") as string;
    return new Typed(typesOf(node, dialect).named("size_t"), bytes(found, keyword, tag, dialect));
  };
}

/** A type's size (`sizeof`) or its alignment (`alignof`), in bytes. */
function bytes(type: any, keyword: string, tag: string, dialect: Terms.Dialect): bigint {
  if (type === VOID) throw new TypeError(`invalid application of '${keyword}' to a void type`);
  if (type instanceof ArrayType) {
    if (tag !== Expressions.SIZEOFEXPRESSION) return bytes(type.element, keyword, tag, dialect);
    if (type.length === null) throw new TypeError(`invalid application of '${keyword}' to an incomplete type`);
    return type.length * bytes(type.element, keyword, tag, dialect);
  }
  // a pointer's layout, which no ABI dialect stores
  if (!(type instanceof Domains.CType)) throw refuse(dialect, `${tag} of nullptr_t`);
  const found = Domains.layout(type);
  if (found === null) throw refuse(dialect, `${tag} of a bit-precise integer type`);
  return BigInt(found);
}

function generic(rules: Rules): F.Implementation {
  return (args, node, scope) => (args[rules.select(node, scope)] as F.Thunk)();
}

/** A compound literal of an arithmetic type, or of an array of one: its initializer's value, converted. */
function compound(dialect: Terms.Dialect, rules: Rules): F.Implementation {
  return (_args, node, scope) => {
    const tree = Terms.node(...Terms.kindOf(node));
    const declared = rules.declared(tree.subterms.get("type"), node, scope);
    const items = (tree.helpers.get("initializer") as Terms.Node).many;
    const zero_ = new Typed(typesOf(node, dialect).named("int"), 0n);
    if (declared instanceof Domains.CType) {
      if (items.length > 1) throw new TypeError("excess elements in a scalar initializer");
      return convert(items.length > 0 ? item(rules, items[0], scope, dialect) : zero_, declared);
    }
    if (!(declared instanceof ArrayType)) {
      throw refuse(dialect, "compoundliteralexpression of a type that is not arithmetic");
    }
    if (!(declared.element instanceof Domains.CType)) {
      throw refuse(dialect, "compoundliteralexpression of an array of arrays");
    }
    const values = elements(rules, declared, items, scope, dialect);
    const length = declared.length ?? BigInt(Math.max(-1, ...values.keys()) + 1);
    return new Typed(null, Array.from({ length: Number(length) },
      (_, i) => values.get(i) ?? convert(zero_, declared.element as CType)));
  };
}

/** An initializer's item's value; nested braces stay. */
function item(rules: Rules, term: unknown, scope: any, dialect: Terms.Dialect): Typed {
  const [tag] = Terms.kindOf(term);
  if (tag === Expressions.INITIALIZERLIST || tag === Expressions.DESIGNATEDINITIALIZER) {
    throw refuse(dialect, "compoundliteralexpression of nested braces");
  }
  return rules.evaluate(term, scope) as Typed;
}

/** An array's initialized elements by position: each item in turn, or where its designator says (`[2] = 5`, GNU's
 * `[0 ... 2] = 5`); a character array's string, its code units and its terminating zero. */
function elements(rules: Rules, target: ArrayType, items: readonly unknown[], scope: any,
  dialect: Terms.Dialect): Map<number, Typed> {
  const type = target.element as CType;
  const limit = target.length === null ? null : Number(target.length);
  const first = items.length === 1 ? Terms.kindOf(items[0])[0] : null;
  if ((first === Expressions.LITERAL || first === Expressions.CONCATENATEDSTRING) && type.kind === "integer"
    && type.width === 8) {
    const text = (rules.evaluate(items[0], scope) as Typed).value;
    if (typeof text === "string") { // its terminating zero dropped where the array's length leaves no room for it
      const codes = [...new TextEncoder().encode(text), 0];
      if (limit !== null && codes.length - 1 > limit) {
        throw new TypeError("initializer-string for an array is too long");
      }
      const int = typesOf(items[0], dialect).named("int");
      return new Map(codes.slice(0, limit ?? undefined)
        .map((code, i) => [i, convert(new Typed(int, BigInt(code)), type)]));
    }
  }
  const values = new Map<number, Typed>();
  let position = 0;
  for (let term of items) {
    let [low, high] = [position, position];
    if (Terms.kindOf(term)[0] === Expressions.DESIGNATEDINITIALIZER) {
      const designated = Terms.node(...Terms.kindOf(term));
      const designators = many(designated.helpers.get("designators"));
      const designator = designators[0];
      if (designators.length !== 1 || designator === undefined || designator.kind !== "indexdesignator") {
        throw new TypeError("an array's element is designated by its index");
      }
      low = high = index(rules, designator.subterms.get("index"), scope);
      const last = designator.subterms.get("last") ?? null;
      if (last !== null) high = index(rules, last, scope);
      const initializer = designated.helpers.get("initializer") as Terms.Node;
      if (initializer.kind !== "equalinitializer") throw refuse(dialect, "compoundliteralexpression of nested braces");
      term = initializer.subterms.get("value");
    }
    const value = convert(item(rules, term, scope, dialect), type);
    for (let i = low; i <= high; i++) {
      if (limit !== null && i >= limit) throw new TypeError("excess elements in an array initializer");
      values.set(i, value);
    }
    position = high + 1;
  }
  return values;
}

function index(rules: Rules, term: unknown, scope: any): number {
  const found = rules.evaluate(term, scope) as Typed;
  if (found.ctype === null || found.ctype.kind !== "integer") {
    throw new TypeError(`array index in an initializer has non-integer type '${describe(found)}'`);
  }
  if (found.value < 0n) throw new TypeError(`array index in an initializer is negative: ${found.value}`);
  return Number(found.value);
}

/** The kinds its rules fold: a literal and a variable, and every kind of class (a); any other stays in the residual,
 * named. */
export const FOLDED: ReadonlySet<string> = new Set([Expressions.LITERAL, Expressions.CONSTANT,
  Expressions.CONCATENATEDSTRING, Expressions.VARIABLE, Expressions.PARENTHESIZEDEXPRESSION,
  Expressions.GENERICSELECTION, Expressions.SUBSCRIPTEXPRESSION, Expressions.CALLEXPRESSION,
  Expressions.MEMBEREXPRESSION, Expressions.UNARYEXPRESSION, Expressions.SIZEOFEXPRESSION,
  Expressions.ALIGNOFEXPRESSION, Expressions.CASTEXPRESSION, Expressions.BINARYEXPRESSION,
  Expressions.CONDITIONALEXPRESSION, Expressions.COMPOUNDLITERALEXPRESSION, Expressions.EXTENSIONEXPRESSION]);

/** The evaluation inventory's class of what each dialect C reads has no rule for (`a` where none is given): an operand
 * whose declaration gives its type `c` (mbse-basis [CAP-232: domains inferred for
 * terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)); the object model, a type a declaration names, writes and
 * statements `d`; a layout no ABI dialect stores, nested braces and an array of arrays in a compound literal `a`. */
export const CATEGORIES: Record<string, Record<string, string>> = {
  C: {
    initializerlist: "b", designatedinitializer: "b",
    ...Object.fromEntries(["sizeofexpression of an operand of unknown type",
      "alignofexpression of an operand of unknown type", "genericselection of an operand of unknown type"]
      .map((what) => [what, "c"])),
    ...Object.fromEntries(["statementexpression", "assignmentexpression", "postfixexpression", "unaryexpression '*'",
      "unaryexpression '&'", "unaryexpression '++'", "unaryexpression '--'",
      "castexpression to a type that is not arithmetic", "callexpression of a callee that is not a function's name",
      "sizeofexpression of a type that is not arithmetic", "alignofexpression of a type that is not arithmetic",
      "genericselection of a type that is not arithmetic",
      "genericselection of an association of a type a declaration names",
      "compoundliteralexpression of a type that is not arithmetic"].map((what) => [what, "d"])),
  },
  "C Types": { "*": "b" }, "C Preprocessor": { "*": "b", definedexpression: "a" },
};

/** The literal of a value of its type, written by `write`, `nullptr` C's or C++'s `constant`; null for a type no
 * literal has, a floating value no binary64 literal spells exactly, or an object. */
function literalOf(write: (value: unknown, suffix?: string | null) => unknown,
  dialect: Terms.Dialect): (value: Typed) => unknown {
  const written = language(dialect);
  return (value) => {
    const [held, ctype] = [value.value, value.ctype];
    if (ctype === null) {
      if (held === null) return dialect.make(new Terms.Form(Expressions.CONSTANT, { singleton: "nullptr" }, []));
      return typeof held === "string" ? write(held) : null;
    }
    const types = ctype.types as Domains.Types;
    if (ctype.precise) { // its narrowest literal, where that is of its type
      const suffix = ctype.signed ? "wb" : "uwb";
      const narrowest = Domains.literal(new Map<string, unknown>([["value", held], ["suffix", suffix]]), written,
        types);
      return ctype.equals(narrowest) ? write(held, suffix) : null;
    }
    const name = Domains.literalSuffix(ctype.label, written) !== null ? ctype.label : types.identity(ctype, written);
    const suffix = Domains.literalSuffix(name, written);
    if (suffix === null) return null;
    if (ctype.kind !== "floating") return write(held, suffix === "" ? null : suffix);
    const format = ctype.format as Ieee754.Format;
    const binary64 = typeof held === "number" ? held : Ieee754.convert(format, held, "binary64", EVEN) as number;
    if (!Number.isFinite(binary64) || !sameValue(Ieee754.convert("binary64", binary64, format, EVEN), held)) {
      return null;
    }
    return write(binary64, suffix === "" ? null : suffix);
  };
}

/** Whether two values of a format are the same: numbers by `Object.is` (-0 apart from 0), text by its characters. */
function sameValue(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

/** What does not depend on a subterm that stays: `a, b` where `a` is known, `b`. */
function simplify(node: any, results: F.Result[]): F.Result | null {
  const [tag, record] = Terms.kindOf(node);
  if (tag === Expressions.BINARYEXPRESSION && Terms.attributesOf(record).get("operator") === ","
    && (results[0] as F.Result).known) return results[1] as F.Result;
  return null;
}

/** The folding rules of a dialect of the C family, `C`'s or `Cpp`'s, folding the kinds `folded` names, its values
 * carrying their C types; `extend(operations, rules)` adds a dialect's own kinds' rules (C++'s). */
export function rules(dialect: Terms.Dialect, folded: ReadonlySet<string> = FOLDED,
  extend: ((operations: Map<string, any>, rules: Rules) => void) | null = null): Rules {
  const operations = new Map<string, any>();
  const found = new Rules(dialect, operations, { literal: untyped, typed: literal(dialect),
    scope: (variables) => new Scope(variables), folded });
  const pairs = (ops: readonly string[], make: (op: string) => F.Implementation) => ops.map((op) => [op, make(op)] as
    [string, F.Implementation]);
  const passed: F.Implementation = (args) => (args[0] as F.Thunk)();
  operations.set(Expressions.BINARYEXPRESSION, new Map<string, F.Implementation>([
    ...pairs(["+", "-", "*", "/", "%", "&", "^", "|"], binaryArithmetic), ...pairs(["<<", ">>"], shift),
    ...pairs(["<", "<=", ">", ">=", "==", "!="], (op) => comparison(op, dialect)),
    ...pairs(["&&", "||"], (op) => logical(op, dialect)), [",", comma],
  ]));
  operations.set(Expressions.UNARYEXPRESSION, new Map(pairs(["+", "-", "~", "!"], (op) => unary(op, dialect))));
  for (const [tag, implementation] of [
    [Expressions.CONDITIONALEXPRESSION, conditional(dialect, found)],
    [Expressions.CASTEXPRESSION, cast(dialect, found)],
    [Expressions.MEMBEREXPRESSION, member(dialect)], [Expressions.SUBSCRIPTEXPRESSION, subscript(dialect)],
    [Expressions.CALLEXPRESSION, call(dialect)], [Expressions.CONCATENATEDSTRING, concatenated],
    [Expressions.PARENTHESIZEDEXPRESSION, passed], [Expressions.EXTENSIONEXPRESSION, passed],
    [Expressions.SIZEOFEXPRESSION, size(dialect, found)], [Expressions.ALIGNOFEXPRESSION, size(dialect, found)],
    [Expressions.GENERICSELECTION, generic(found)], [Expressions.COMPOUNDLITERALEXPRESSION, compound(dialect, found)],
  ] as [string, F.Implementation][]) operations.set(tag, implementation);
  if (extend !== null) extend(operations, found);
  return found;
}

/** The simplifier of a dialect of the C family, by `rules(dialect, folded, extend)`, its literals written by `write`.
 */
export function simplifier(dialect: Terms.Dialect, folded: ReadonlySet<string>,
  categories: Record<string, Record<string, string>>, write: (value: unknown, suffix?: string | null) => unknown,
  extend: ((operations: Map<string, any>, rules: Rules) => void) | null = null): F.Simplifier {
  return new F.Simplifier(rules(dialect, folded, extend), { literal: literalOf(write, dialect), categories,
    native: (value: Typed) => native(value), simplify });
}

/** The simplifier of the C dialect. */
export const SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal);

/** The folding rules of the C dialect. */
export const RULES = SIMPLIFIER.rules as Rules;

/** The simplification of a term in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
