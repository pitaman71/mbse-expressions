/**
 * Expressions of the Python dialect: Python expressions, with the imports they need, as Python's `ast` has them.
 *
 * Python's terms are the framework's `let` and its own kinds, which `install` adds to `Expressions.Framework.Term` by
 * schema extension, each a value object with a `domain`. Their tags are qualified by the dialect, `python_<kind>`
 * (`python_binop`), since every dialect adds its kinds to the one union of terms:
 *
 * - `python_constant`: a basic scalar (`value`). `python_name`: the value bound to a `name`; the names of `BUILTINS`
 *   are always bound.
 * - `python_attribute`: `value.attr`. `python_subscript`: `value[key]`, for a str key, and `python_index`:
 *   `value[index]`, for an index that is an expression. `python_call`: a function, the slot `function`, applied to
 *   ordered `arguments`, e.g. `np.greater_equal(x, 18)`, whose function is the attribute `greater_equal` of the name
 *   `np`.
 * - `python_compare` (`==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not in`), `python_boolop` (`and`, `or`), `python_binop`
 *   (`+`, `-`, `*`, `/`, `//`, `%`, `**`, `&`, `|`, `^`, `<<`, `>>`) and `python_unaryop` (`not`, `-`, `+`, `~`), each
 *   with one `operator` and two operands, `left` and `right` (one, `operand`, for `python_unaryop`).
 * - `python_ifexp`: `body if test else orelse`.
 * - `python_generator`: `(element for name in iterable if condition ...)`, a generator expression of one `for` and any
 *   number of `conditions`, which binds `name` to each item of `iterable` within the element and the conditions. As
 *   the only argument of a call it is written without its parentheses: `all(p.pin > 0 for p in ports)`.
 * - `let`, the framework's: `(lambda name: body)(value)`, Python's idiom for binding a name within an expression.
 * - `python_import` (`import module` or `import module as alias`) and `python_importfrom` (`from module import name`
 *   or `... as alias`) bind a name within their `body`, which is the rest of the expression; `Text.ToText` writes them
 *   as the lines before it. What they may import is up to the scope that evaluates them (see `Evaluators`).
 *
 * `DIALECT` reads them (`Terms.Dialect`). The writers (`constant`, `name`, `attribute`, ...) write them through the
 * builders, wherever a term is written, in a transaction. `Text.ToText` writes an expression as Python source,
 * parenthesized only where precedence requires. Reading Python source (`Text.FromText`) needs Python's own parser, so
 * it is in the Python implementation only.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr, Schemas } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;

export const CONSTANT = "python_constant";
export const NAME = "python_name";
export const ATTRIBUTE = "python_attribute";
export const SUBSCRIPT = "python_subscript";
export const INDEX = "python_index";
export const CALL = "python_call";
export const COMPARE = "python_compare";
export const BOOLOP = "python_boolop";
export const BINOP = "python_binop";
export const UNARYOP = "python_unaryop";
export const IFEXP = "python_ifexp";
export const GENERATOR = "python_generator";
export const LET = "let";
export const IMPORT = "python_import";
export const IMPORTFROM = "python_importfrom";

/** Python's kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const kinds: Record<string, string> = {
    Constant: CONSTANT, Name: NAME, Attribute: ATTRIBUTE, Subscript: SUBSCRIPT, Index: INDEX, Call: CALL,
    Compare: COMPARE, BoolOp: BOOLOP, BinOp: BINOP, UnaryOp: UNARYOP, IfExp: IFEXP, GeneratorExp: GENERATOR,
    Import: IMPORT, ImportFrom: IMPORTFROM,
  };
  const symbols: Record<string, unknown> = { Term: S.OfUnion }; // the framework's union, by its name
  for (const kind of Object.keys(kinds)) symbols[kind] = S.OfObject;
  return txn.uid("mbse.Expressions.Python/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols(symbols)
    .spec([
      (_: any) => _.Constant.name("Expressions.Python.Constant").properties({
        value: S.OfAny((a: any) => a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr, S.OfBytes])),
        domain: S.OfStr, // every term has a domain
      }),
      (_: any) => _.Name.name("Expressions.Python.Name").properties({ name: S.OfStr, domain: S.OfStr }),
      (_: any) => _.Attribute.name("Expressions.Python.Attribute").properties({
        attr: S.OfStr, value: _.Term, domain: S.OfStr }),
      (_: any) => _.Subscript.name("Expressions.Python.Subscript").properties({
        key: S.OfStr, value: _.Term, domain: S.OfStr }),
      (_: any) => _.Index.name("Expressions.Python.Index").properties({
        value: _.Term, index: _.Term, domain: S.OfStr }),
      (_: any) => _.Call.name("Expressions.Python.Call").properties({
        function: _.Term,
        arguments: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
        domain: S.OfStr,
      }),
      ...["Compare", "BoolOp", "BinOp"].map((kind) => (_: any) => _[kind].name(`Expressions.Python.${kind}`).properties({
        operator: S.OfStr, left: _.Term, right: _.Term, domain: S.OfStr })),
      (_: any) => _.UnaryOp.name("Expressions.Python.UnaryOp").properties({
        operator: S.OfStr, operand: _.Term, domain: S.OfStr }),
      (_: any) => _.IfExp.name("Expressions.Python.IfExp").properties({
        test: _.Term, body: _.Term, orelse: _.Term, domain: S.OfStr }),
      (_: any) => _.GeneratorExp.name("Expressions.Python.GeneratorExp").properties({
        name: S.OfStr, // bound to each item in the element and the conditions
        iterable: _.Term,
        element: _.Term,
        conditions: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
        domain: S.OfStr,
      }),
      (_: any) => _.Import.name("Expressions.Python.Import").properties({
        module: S.OfStr, alias: S.OfStr, body: _.Term, domain: S.OfStr }),
      (_: any) => _.ImportFrom.name("Expressions.Python.ImportFrom").properties({
        module: S.OfStr, name: S.OfStr, alias: S.OfStr, body: _.Term, domain: S.OfStr }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches( // branches added: schema extension
        Object.entries(kinds).map(([kind, tag]) => (t: any) => t.name(tag).schema([_[kind]]))),
    ])]))]);
}

/** The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`). */
export const BUILTINS: ReadonlySet<string> = new Set([
  "abs", "all", "any", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "set", "str", "sum"]);

/** Python's `str.isidentifier()`. */
export function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text);
}

function dotted(name: string): boolean {
  return name.split(".").every(isIdentifier);
}

function identifierProblems(what: string, value: unknown): string[] {
  if (typeof value === "string" && value !== "" && !isIdentifier(value)) {
    return [`${what} must be an identifier, got ${repr(value)}`];
  }
  return [];
}

/** The check that a record's property, if a non-empty str, is an identifier. */
function identifier(property: string, what: string): (record: any) => string[] {
  return (record) => identifierProblems(what, F.attributesOf(record).get(property));
}

/** An alias, if given, is an identifier, and not empty. */
function aliasProblems(what: string, attributes: Map<string, any>): string[] {
  if (attributes.get("alias") === "") return [`${F.article(what)} needs an alias`];
  return identifierProblems(`${F.article(what)}'s alias`, attributes.get("alias"));
}

function moduleProblems(what: string, module: unknown): string[] {
  if (typeof module !== "string" || dotted(module)) return [];
  return [`${F.article(what)}'s module must be a dotted name, got ${repr(module)}`];
}

function importCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [...moduleProblems("import", attributes.get("module")), ...aliasProblems("import", attributes)];
}

function importfromCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [...moduleProblems("importfrom", attributes.get("module")),
    ...identifierProblems("an importfrom's name", attributes.get("name")), ...aliasProblems("importfrom", attributes)];
}

function importNames(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [attributes.get("alias") || (attributes.get("module") as string).split(".")[0] as string];
}

function importfromNames(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [attributes.get("alias") || attributes.get("name")];
}

/** The constant of a native value. */
function native(value: unknown): Writer | null {
  return Schemas.hostOf(value) !== null ? constant(value) : null;
}

const ANY = new FD.Function([FD.Anything], FD.Anything);

function operatorKind(vocabulary: ReadonlyMap<string, FD.Signature>): F.Kind {
  return new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required: ["operator"] });
}

/** The Python dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Python", {
  [CONSTANT]: new F.Kind(F.LITERAL),
  [NAME]: new F.Kind(F.REFERENCE, { required: ["name"], ambient: BUILTINS, check: identifier("name", "a name") }),
  [ATTRIBUTE]: new F.Kind(F.APPLICATION, { operator: "attr", signature: ANY, required: ["attr"],
    check: identifier("attr", "an attribute") }),
  [SUBSCRIPT]: new F.Kind(F.APPLICATION, { operator: "key", signature: ANY, required: ["key"] }),
  [INDEX]: new F.Kind(F.APPLICATION, { signature: new FD.Function([FD.Anything, FD.Anything], FD.Anything) }),
  [CALL]: new F.Kind(F.APPLICATION, { signature: new FD.Opaque() }),
  [COMPARE]: operatorKind(Domains.COMPARE),
  [BOOLOP]: operatorKind(Domains.BOOLOP),
  [BINOP]: operatorKind(Domains.BINOP),
  [UNARYOP]: operatorKind(Domains.UNARYOP),
  [IFEXP]: new F.Kind(F.APPLICATION, { signature: new FD.Function([FD.Anything, FD.Anything, FD.Anything], FD.Anything) }),
  [GENERATOR]: new F.Kind(F.QUANTIFIER, { signature: Domains.GENERATOR, required: ["name"],
    check: identifier("name", "a generator's name") }),
  [LET]: new F.Kind(F.BINDING, { required: ["name"], check: identifier("name", "a let's name") }),
  [IMPORT]: new F.Kind(F.IMPORT, { required: ["module"], names: importNames, check: importCheck }),
  [IMPORTFROM]: new F.Kind(F.IMPORT, { required: ["module", "name"], names: importfromNames, check: importfromCheck }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A Python term, written through the builders: a spec, which writes its term where it is given. */
export class Writer extends F.Writer {}

const spec = (value: unknown): F.Writer => DIALECT.spec(value);

/** The writer of a term of kind `tag`: its attributes and its slots (specs) that are not null, and its variadic
 * arguments (specs). */
function kind(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown>,
  variadic: [string, unknown[]] | null = null): Writer {
  const specs = Object.entries(slots).filter(([, value]) => value !== null && value !== undefined)
    .map(([slot, value]) => [slot, spec(value)] as const);
  const many = variadic === null ? null : [variadic[0], variadic[1].map(spec)] as const;
  return new Writer((union: any) => union[tag]((r: any) => {
    for (const [name, value] of Object.entries(attributes)) if (value !== null && value !== undefined) r[name](value);
    for (const [slot, value] of specs) r[slot](value);
    if (many !== null) r[many[0]](many[1]);
    return r;
  }));
}

/** The constant `value`, a basic scalar. */
export function constant(value: unknown): Writer {
  return new Writer((u: any) => u[CONSTANT]((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The value bound to `name`. */
export function name(name: string): Writer {
  return new Writer((u: any) => u[NAME]((r: any) => r.name(name)));
}

/** `value.attr`; each argument of these writers is a spec (a native value is a constant). */
export function attribute(value: unknown, attr: string): Writer {
  return kind(ATTRIBUTE, { attr }, { value });
}

/** `value[key]`. */
export function subscript(value: unknown, key: string): Writer {
  return kind(SUBSCRIPT, { key }, { value });
}

/** `value[index]`. */
export function index(value: unknown, index: unknown): Writer {
  return kind(INDEX, {}, { value, index });
}

/** `fn(...args)`. A dotted name as the function is a chain of attributes: `call('np.add', 1n, 2n)` is
 * `np.add(1, 2)`. */
export function call(fn: unknown, ...args: unknown[]): Writer {
  if (typeof fn === "string") {
    const [first, ...rest] = fn.split(".");
    let callee: Writer = name(first as string);
    for (const attr of rest) callee = attribute(callee, attr);
    fn = callee;
  }
  return kind(CALL, {}, { function: fn }, ["arguments", args]);
}

export function compare(operator: string, left: unknown, right: unknown): Writer {
  return kind(COMPARE, { operator }, { left, right });
}

export function boolop(operator: string, left: unknown, right: unknown): Writer {
  return kind(BOOLOP, { operator }, { left, right });
}

export function binop(operator: string, left: unknown, right: unknown): Writer {
  return kind(BINOP, { operator }, { left, right });
}

export function unaryop(operator: string, operand: unknown): Writer {
  return kind(UNARYOP, { operator }, { operand });
}

/** `body if test else orelse`. */
export function ifexp(test: unknown, body: unknown, orelse: unknown): Writer {
  return kind(IFEXP, {}, { test, body, orelse });
}

/** `(element for name in iterable if condition ...)`. */
export function generator(name: string, iterable: unknown, element: unknown, ...conditions: unknown[]): Writer {
  return kind(GENERATOR, { name }, { iterable, element }, ["conditions", conditions]);
}

/** `(lambda name: body)(value)`. */
export function let_(name: string, value: unknown, body: unknown): Writer {
  return kind(LET, { name }, { value, body });
}

/** `import module [as alias]`, then `body`. */
export function import_(module: string, body: unknown, alias: string | null = null): Writer {
  return kind(IMPORT, { module, alias }, { body });
}

/** `from module import name [as alias]`, then `body`. */
export function importfrom(module: string, name: string, body: unknown, alias: string | null = null): Writer {
  return kind(IMPORTFROM, { module, name, alias }, { body });
}
