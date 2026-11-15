/**
 * Simplifiers of the Cpp dialect: simplify an expression by ISO/IEC 14882's rules, which are C's for the kinds C++
 * shares with C (see `C/Simplifiers`, `Scope` among them), under the ABI the expression's holder names:
 * `Simplifiers.OfAny(term, scope)` simplifies a term value in a `new Scope(variables, { functions, packs })`.
 *
 * A name used as an expression is an `idexpression`: an identifier's value is the scope's variable of its name, a
 * qualified name's (`ns::x`, `::x`) the variable of its spelling; `this` is the scope's variable `this`. C++'s own
 * kinds fold by its rules:
 *
 * - `T(x)` and `T{x}`, a functional cast to an arithmetic type, convert as a cast does (`T()` and `T{}` its zero), a
 *   braced one refusing a narrowing conversion, one that does not keep its value (`TypeError`); `static_cast<T>(x)` is
 *   a cast. `const_cast`, `dynamic_cast` and `reinterpret_cast`, and a cast to a class type, stay (class `d`).
 * - `12_km` calls the literal operator `operator""_km` the scope provides, by that name, with its literal's value, the
 *   standard library's (`1s`, `"a"s`) among them; one the scope does not provide stays.
 * - `a <=> b` compares two arithmetic values, after the usual arithmetic conversions (refusing one that narrows an
 *   integer's value, as C++ refuses a narrowing conversion there), into a value of `<compare>`'s comparison categories
 *   (`Ordering`): `std::strong_ordering` for integers, `std::partial_ordering` for floating values, unordered where one
 *   is NaN. An ordering has no literal; it compares with the literal 0 (`(a <=> b) < 0`), and with an ordering of its
 *   category by `==`.
 * - A parameter pack is the scope's `packs`, by its name: `sizeof...(p)` is its size; `f(p...)` and `f((p + 1)...)`
 *   expand a pattern over its packs' values into a call's arguments; `(p + ...)`, `(... + p)`, `(p + ... + i)` and `(i
 *   + ... + p)` fold its values by a binary operator, an empty one by `&&` (`true`), `||` (`false`) and `,` (`void`). A
 *   fold over an assignment operator, `.*` or `->*` stays (class `d`).
 * - `throw x` evaluates `x` and throws `Thrown`, carrying its value (`c ? x : throw e` throws only where `c` is false);
 *   a rethrow, `throw` alone, stays (class `d`: a handler's).
 *
 * What stays, named, with its class (`CATEGORIES`): a lambda, `new` and `delete`, `noexcept`, coroutines, statements,
 * writes, pointers to members and names that are not identifiers or qualified identifiers (`f<int>`, `operator+`),
 * class `d`; `requires` and `typeid`, class `c`; C's own (see `C/Simplifiers`); a term of `Cpp Types` or `Cpp RegExp`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as Domains from "../../C/Expressions/Domains.js";
import * as C from "../../C/Expressions/Expressions.js";
import {
  CATEGORIES as C_CATEGORIES, FOLDED as C_FOLDED, GUARDED as C_GUARDED, Pack, Rules, Scope, Typed, Untyped, VOID,
  common, convert, describe, order, simplifier, typed, zero,
} from "../../C/Expressions/Simplifiers.js";
import * as F from "../../Framework/Simplifiers.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import * as Expressions from "./Expressions.js";

const { repr } = Repr;

export { Scope };

const NAMES = new Map<number | null, string>([[-1, "less"], [1, "greater"], [null, "unordered"]]);

/** A value of one of `<compare>`'s comparison categories ([cmp.categories]): its `category`, `strong_ordering` or
 * `partial_ordering`, and its `order`, -1 less, 0 equal or equivalent, 1 greater, null unordered. */
export class Ordering {
  constructor(readonly category: string, readonly order: number | null) {}

  toString(): string {
    const name = this.order === 0 ? (this.category === "strong_ordering" ? "equal" : "equivalent")
      : NAMES.get(this.order) as string;
    return `std::${this.category}::${name}`;
  }
}

/** A `throw`'s exception, carrying its operand's `value`, its native. */
export class Thrown extends Error {
  constructor(readonly value: unknown) {
    super("an exception is thrown");
  }
}

function refuse(what: string): Error {
  return new F.NoRule(Expressions.DIALECT.name(), what);
}

function typesOf(node: unknown): Domains.Types {
  return new Domains.Types(node, Expressions.DIALECT.path);
}

function shown(value: Typed): string {
  return value.value instanceof Ordering ? `std::${value.value.category}` : describe(value);
}

// --- <=> and the comparisons of orderings ---

const threeWay: F.Implementation = (args, node) => {
  const [left, right] = [(args[0] as F.Thunk)() as Typed, (args[1] as F.Thunk)() as Typed];
  if (left.value instanceof Ordering || right.value instanceof Ordering) {
    const [ordering, flipped] = withZero(left, right, node, "<=>");
    return new Typed(null, flipped ? new Ordering(ordering.category, ordering.order === null ? null : -ordering.order)
      : ordering);
  }
  const [ctype, a, b] = common(left, right, "<=>");
  for (const value of [left, right]) { // a narrowing conversion, but an integer's to a floating type, is refused
    if (value.ctype !== null && value.ctype.kind !== "floating" && ctype.kind !== "floating"
      && !ctype.contains(value.value)) {
      throw new TypeError(`invalid operands to binary <=>: narrowing conversion of ${value.value} from `
        + `'${value.ctype.name()}' to '${ctype.name()}'`);
    }
  }
  if (ctype.kind === "floating") { // unordered where either is NaN
    const format = ctype.format as Ieee754.Format;
    if ([a, b].some((operand) => Ieee754.decode(format, operand.value).special === "nan")) {
      return new Typed(null, new Ordering("partial_ordering", null));
    }
    return new Typed(null, new Ordering("partial_ordering", order(format, a.value, b.value)));
  }
  return new Typed(null, new Ordering("strong_ordering", a.value > b.value ? 1 : a.value < b.value ? -1 : 0));
};

/** An ordering compared with the literal 0, and whether it is the right operand (`0 < o`); anything else is
 * refused. */
function withZero(left: Typed, right: Typed, node: any, operator: string): [Ordering, boolean] {
  const terms = Terms.argumentsOf(Terms.kindOf(node)[1]);
  if (left.value instanceof Ordering && zero(terms[1], Expressions.DIALECT)) return [left.value, false];
  if (right.value instanceof Ordering && zero(terms[0], Expressions.DIALECT)) return [right.value, true];
  throw new TypeError(`invalid operands to binary ${operator} ('${shown(left)}' and '${shown(right)}')`);
}

const TESTS: Record<string, (o: number) => boolean> = {
  "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0, "==": (o) => o === 0,
  "!=": (o) => o !== 0,
};

/** A comparison, of an ordering with the literal 0 or with an ordering of its category by `==` and `!=`, else C's. */
function ordered(operator: string, comparison: F.Implementation): F.Implementation {
  return (args, node, scope) => {
    const [left, right] = [(args[0] as F.Thunk)() as Typed, (args[1] as F.Thunk)() as Typed];
    if (!(left.value instanceof Ordering) && !(right.value instanceof Ordering)) {
      return comparison([() => left, () => right], node, scope);
    }
    const bool = typesOf(node).named("bool");
    if ((operator === "==" || operator === "!=") && left.value instanceof Ordering && right.value instanceof Ordering
      && left.value.category === right.value.category) {
      return new Typed(bool, (left.value.order === right.value.order) === (operator === "=="));
    }
    const [ordering, flipped] = withZero(left, right, node, operator);
    if (ordering.order === null) return new Typed(bool, operator === "!="); // unordered: only `!=` holds
    return new Typed(bool, (TESTS[operator] as (o: number) => boolean)(flipped ? -ordering.order : ordering.order));
  };
}

// --- Casts ---

/** The type a functional cast's simple type specifier names: an arithmetic type, `VOID`, or null. */
function specified(specifier: Terms.Node, node: any): any {
  let word: string | null;
  if (specifier.kind === "primitivetypespecifier") word = specifier.attributes.get("keyword") as string;
  else if (specifier.kind === "namedtypespecifier") {
    word = C.spelling(specifier.helpers.get("name") as Terms.Node | undefined);
  } else return null;
  if (word === "void") return VOID;
  return C.castType(Domains.arithmetic([word]), typesOf(node));
}

/** Whether converting a value is a narrowing conversion, its value a constant's ([dcl.init.list]): to `bool`, from a
 * floating type to an integer type, or one that does not keep its value. */
function narrowing(value: Typed, result: Typed): boolean {
  const [source, target] = [value.ctype, result.ctype];
  if (source === null || target === null || source.equals(target)) return false;
  if (target.kind === "bool" || (source.kind === "floating" && target.kind !== "floating")) return true;
  return convert(result, source).value !== value.value;
}

const functional: F.Implementation = (args, node) => {
  const tree = Terms.node(...Terms.kindOf(node));
  const target = specified(tree.helpers.get("type") as Terms.Node, node);
  if (target === null) throw refuse("functionalcastexpression to a type that is not arithmetic");
  const initializer = tree.helpers.get("initializer") as Terms.Node;
  const values = args.slice(args.length - initializer.many.length).map((argument) => (argument as F.Thunk)() as Typed);
  if (target === VOID) return new Typed(null, VOID);
  if (values.length > 1) throw new TypeError(`a functional cast to '${target.name()}' of ${values.length} values`);
  if (values.length === 0) return convert(new Typed(typesOf(node).named("int"), 0n), target); // value-initialized
  const result = convert(values[0] as Typed, target);
  if (initializer.kind === "initializerlist" && narrowing(values[0] as Typed, result)) {
    throw new TypeError(`narrowing conversion of ${repr((values[0] as Typed).value)} from `
      + `'${describe(values[0] as Typed)}' to '${target.name()}'`);
  }
  return result;
};

function staticCast(rules: Rules): F.Implementation {
  return (args, node, scope) => {
    const target = rules.declared(Terms.argumentsOf(Terms.kindOf(node)[1])[0], node, scope);
    if (target === VOID) {
      (args[1] as F.Thunk)();
      return new Typed(null, VOID);
    }
    if (!(target instanceof Domains.CType)) throw refuse("namedcastexpression to a type that is not arithmetic");
    return convert((args[1] as F.Thunk)() as Typed, target);
  };
}

/** A user-defined literal: its literal operator, the scope's, called with its literal's value. */
const userDefined: F.Implementation = (_args, node, scope) => {
  const held = Terms.attributesOf(Terms.kindOf(node)[1]);
  const fn = (scope as Scope).function(`operator""${held.get("suffix")}`);
  return typed(fn((held.get("literal") as Terms.Part).attributes.get("value")), typesOf(node));
};

// --- Packs ---

function packName(node: any): string {
  return C.spelling(Terms.attributesOf(Terms.kindOf(node)[1]).get("pack")) as string;
}

/** A pattern's expansion: one thunk for each value of the packs it names, each its pattern with each pack's name bound
 * to its value; a name neither a pack nor bound throws `Unbound`. */
function expanded(rules: Rules, pattern: unknown, scope: Scope): F.Thunk[] {
  const names = [...S.free(pattern, Expressions.DIALECT)].sort();
  const packs = names.filter((name) => scope.packs.has(name));
  const unbound = names.filter((name) => !scope.packs.has(name) && !scope.bound(name));
  if (unbound.length > 0) throw new S.Unbound(unbound[0] as string);
  if (packs.length === 0) throw new TypeError("a pack expansion's pattern names no parameter pack");
  const lengths = new Set(packs.map((name) => scope.pack(name).length));
  if (lengths.size > 1) throw new TypeError("the packs a pattern expands are of different lengths");
  const [length] = lengths as Set<number>;
  return Array.from({ length: length as number }, (_, i) => {
    let within: Scope = scope;
    for (const name of packs) within = within.bind(name, scope.pack(name)[i]);
    return () => rules.evaluate(pattern, within);
  });
}

function expansion(rules: Rules): F.Implementation {
  return (_args, node, scope) => {
    const pattern = Terms.argumentsOf(Terms.kindOf(node)[1])[0];
    return new Typed(null, new Pack(expanded(rules, pattern, scope as Scope).map((thunk) => thunk() as Typed)));
  };
}

const EMPTY = new Map([["&&", true], ["||", false]]);

/** A fold of a pack's values by a binary operator, right (`(p op ...)`, `(p op ... op i)`) or left. */
function fold(operator: string, implementation: F.Implementation, rules: Rules): F.Implementation {
  return (_args, node, scope) => {
    const [left, right] = Terms.argumentsOf(Terms.kindOf(node)[1]);
    const within = scope as Scope;
    const holds = left !== null && [...S.free(left, Expressions.DIALECT)].some((name) => within.packs.has(name));
    const [pattern, initial] = holds || right === null ? [left, right] : [right, left];
    let thunks = expanded(rules, pattern, within);
    if (initial !== null) {
      const first: F.Thunk = () => rules.evaluate(initial, scope);
      thunks = pattern === left ? [...thunks, first] : [first, ...thunks];
    }
    if (thunks.length === 0) {
      if (operator === ",") return new Typed(null, VOID);
      if (!EMPTY.has(operator)) throw new TypeError(`a fold of an empty pack over '${operator}'`);
      return new Typed(typesOf(node).named("bool"), EMPTY.get(operator));
    }
    // right: thunks[i] op (... op thunks[-1]); left: (thunks[0] op ...) op thunks[i]
    const folded = (i: number): Typed => {
      if (pattern === left) {
        if (i === thunks.length - 1) return (thunks[i] as F.Thunk)() as Typed;
        return implementation([thunks[i] as F.Thunk, () => folded(i + 1)], node, scope) as Typed;
      }
      if (i === 0) return (thunks[0] as F.Thunk)() as Typed;
      return implementation([() => folded(i - 1), thunks[i] as F.Thunk], node, scope) as Typed;
    };
    return folded(pattern === left ? 0 : thunks.length - 1);
  };
}

const sizeOfPack: F.Implementation = (_args, node, scope) => new Typed(typesOf(node).named("size_t"),
  BigInt((scope as Scope).pack(packName(node)).length));

const throwing: F.Implementation = (args, node) => {
  if (Terms.argumentsOf(Terms.kindOf(node)[1])[0] === null) throw refuse("throwexpression without an operand");
  throw new Thrown(((args[0] as F.Thunk)() as Typed).value);
};

/** C++'s own kinds' rules, and its operators', added to C's. */
function extend(operations: Map<string, any>, rules: Rules): void {
  const binary = operations.get(C.BINARYEXPRESSION) as Map<string, F.Implementation>;
  for (const op of ["<", "<=", ">", ">=", "==", "!="]) binary.set(op, ordered(op, binary.get(op) as F.Implementation));
  binary.set("<=>", threeWay);
  operations.set(Expressions.USERDEFINEDLITERAL, userDefined);
  operations.set(Expressions.FUNCTIONALCASTEXPRESSION, functional);
  operations.set(Expressions.NAMEDCASTEXPRESSION, new Map([["static_cast", staticCast(rules)]]));
  operations.set(Expressions.SIZEOFPACKEXPRESSION, sizeOfPack);
  operations.set(Expressions.PACKEXPANSION, expansion(rules));
  operations.set(Expressions.THROWEXPRESSION, throwing);
  // a fold over an assignment, `.*` or `->*` stays
  operations.set(Expressions.FOLDEXPRESSION, new Map([...Domains.FOLD.keys()].filter((op) => binary.has(op))
    .map((op) => [op, fold(op, binary.get(op) as F.Implementation, rules)])));
  rules.typings.set(Expressions.FUNCTIONALCASTEXPRESSION, (term) => {
    const found = specified(Terms.node(...Terms.kindOf(term)).helpers.get("type") as Terms.Node, term);
    if (found === null) throw new Untyped(Expressions.FUNCTIONALCASTEXPRESSION);
    return found;
  });
  rules.typings.set(Expressions.NAMEDCASTEXPRESSION, (term, scope) => {
    const record = Terms.kindOf(term)[1];
    const found = rules.declared(Terms.argumentsOf(record)[0], term, scope);
    if (Terms.attributesOf(record).get("operator") !== "static_cast"
      || !(found === VOID || found instanceof Domains.CType)) throw new Untyped(Expressions.NAMEDCASTEXPRESSION);
    return found;
  });
}

/** The kinds C++'s rules fold: C's that C++ has, a name used as an expression an `idexpression`, as C++'s grammar makes
 * it, and C++'s own kinds of class (a). */
export const FOLDED: ReadonlySet<string> = new Set([
  ...[...C_FOLDED].filter((tag) => !["variable", "genericselection", "compoundliteralexpression"].includes(tag)),
  Expressions.IDEXPRESSION, Expressions.THISEXPRESSION, Expressions.USERDEFINEDLITERAL,
  Expressions.FUNCTIONALCASTEXPRESSION, Expressions.NAMEDCASTEXPRESSION, Expressions.SIZEOFPACKEXPRESSION,
  Expressions.FOLDEXPRESSION, Expressions.PACKEXPANSION, Expressions.THROWEXPRESSION]);

/** The evaluation inventory's class of what each dialect C++ reads has no rule for (`a` where none is given). */
export const CATEGORIES: Record<string, Record<string, string>> = {
  ...C_CATEGORIES,
  Cpp: {
    ...C_CATEGORIES["C"], initializerlist: "b", designatedinitializer: "b", requiresexpression: "c",
    typeidexpression: "c",
    ...Object.fromEntries(["lambdaexpression", "newexpression", "deleteexpression", "noexceptexpression",
      "awaitexpression", "yieldexpression", "statementexpression", "assignmentexpression", "postfixexpression",
      "binaryexpression '.*'", "binaryexpression '->*'", "memberexpression of a member that is not an identifier",
      "subscriptexpression of several indices", "idexpression of a name that is not an identifier",
      "namedcastexpression 'const_cast'", "namedcastexpression 'dynamic_cast'",
      "namedcastexpression 'reinterpret_cast'", "namedcastexpression to a type that is not arithmetic",
      "functionalcastexpression to a type that is not arithmetic",
      "throwexpression without an operand", "foldexpression '.*'", "foldexpression '->*'",
      ...[...Domains.ASSIGNMENT.keys()].map((op) => `foldexpression '${op}'`)].map((what) => [what, "d"])),
  },
  "Cpp Types": { "*": "b" }, "Cpp RegExp": { "*": "b" },
};

/** The simplifier of the Cpp dialect; its values carry their C++ types, its residual's literals theirs. */
/** What C++ may never evaluate, beside what C may not: a lambda's and a requires expression's body, and `noexcept`'s
 * and `typeid`'s operands, unevaluated ([expr.prim.lambda], [expr.unary.noexcept], [expr.typeid]). */
export const GUARDED: Readonly<Record<string, readonly number[] | null>> = {
  ...C_GUARDED, [Expressions.LAMBDAEXPRESSION]: [1], [Expressions.REQUIRESEXPRESSION]: [1],
  [Expressions.NOEXCEPTEXPRESSION]: null, [Expressions.TYPEIDEXPRESSION]: null,
};

export const SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal, extend, GUARDED);

/** The folding rules of the Cpp dialect. */
export const RULES = SIMPLIFIER.rules as Rules;

/** The simplification of a term in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
