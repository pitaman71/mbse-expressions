/**
 * How the framework reads the kinds of the C family, the code its dialects share: C's and C++'s expressions and their
 * type names (`C`, `Cpp`, `C Types`, `Cpp Types`) read their kinds through `kinds`, check them through `problems`, say
 * what a binder binds through `scopes`, and write the kinds C evaluates through `Writers`. An internal module of the C
 * family, which `C.Expressions` re-exports: it imports none of the family's dialects, so that each dialect's module
 * reads it, and no other, while it is loaded (the family's modules import one another, and a module that read another's
 * constants while the cycle loaded it would find them undefined). See mbse-basis [CAP-229: the C expression
 * dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md) and [CAP-230: the C++ expression
 * dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { ValueError } = Errors;
const { repr } = Repr;

export const [LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE] = ["literal", "constant", "concatenatedstring",
    "variable"] as const;
export const [PARENTHESIZEDEXPRESSION, GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION] = [
  "parenthesizedexpression", "genericselection", "subscriptexpression", "callexpression"] as const;
export const [MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION] = [
  "memberexpression", "postfixexpression", "unaryexpression", "sizeofexpression"] as const;
export const [ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION] = [
  "alignofexpression", "castexpression", "binaryexpression", "conditionalexpression"] as const;
export const [ASSIGNMENTEXPRESSION, INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION] = [
  "assignmentexpression", "initializerlist", "designatedinitializer", "compoundliteralexpression"] as const;
export const [STATEMENTEXPRESSION, EXTENSIONEXPRESSION, TYPEID] = ["statementexpression", "extensionexpression",
    "typeid"] as const;
export const ENUMERATOR = "enumerator";

/** GNU's extensions, outside every standard, as mbse-programs marks them. */
export const EXTENSIONS: ReadonlySet<string> = new Set([STATEMENTEXPRESSION, EXTENSIONEXPRESSION]);

/** A character's or a string's encoding prefixes. */
export const PREFIXES: readonly string[] = ["L", "u8", "u", "U"];

/** A character literal's quote, and a string's. */
export const QUOTES: readonly string[] = ["'", '"'];

/** The suffixes a language writes, by the type of the literal's value: an integer's (a bigint's) and a floating
 * literal's (a number's), each a pattern its whole suffix matches. */
export interface Suffixes {
  readonly integer: RegExp;
  readonly floating: RegExp;
}

/** The suffixes C writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C23's `wb`, in either case
 * and order) and a floating literal's (`f`, `l`, C23's decimal and interchange types' `df`, `f32`). */
export const SUFFIXES: Suffixes = {
  integer: /^(?:u?(?:l|ll|wb)?|(?:l|ll|wb)u)$/i,
  floating: /^(?:[fFlL]|df|dd|dl|DF|DD|DL|[fF](?:16|32|64|128|32x|64x|128x))$/,
};

/** The suffixes C++ writes (`Cpp.Expressions.SUFFIXES`), by the type of the literal's value: an integer's (`u`, `l`,
 * `ll`, C++23's `z`, in either case and order) and a floating literal's (`f`, `l`, C++23's extended types' `f16` to
 * `f128` and `bf16`). */
export const CPP_SUFFIXES: Suffixes = {
  integer: /^(?:u?(?:l|ll|z)?|(?:l|ll|z)u)$/i,
  floating: /^(?:[fFlL]|[fF](?:16|32|64|128)|bf16|BF16)$/,
};

// --- Reading a term's type name, and what its helpers bind and check ---

type Held = F.Node | readonly F.Node[] | undefined;

/** A helper property's nodes: none where it is absent, one, or each of many. */
function nodes(value: Held): readonly F.Node[] {
  if (value === undefined) return [];
  return value instanceof F.Node ? [value] : value;
}

/** A name's spelling: an identifier's `spelling` (a `Terms.Part` or a `Node`), or null for any other name, or none. */
export function spelling(name: F.Part | F.Node | undefined): string | null {
  return name !== undefined && name.kind === "identifier" ? (name.attributes.get("spelling") ?? null) as string | null
    : null;
}

/** The name of the arithmetic type a type name names (a `typeid`, the term a cast's type holds), by
 * `Domains.arithmetic` (`unsigned int`, `uint8_t`), or null: a type with a declarator, or of a specifier that is not a
 * keyword or a type's name. Whether a store defines it is the store's (`Domains.Types`). */
export function typeName(term: any): string | null {
  const node = F.node(...F.kindOf(term));
  if (node.kind !== TYPEID || node.helpers.has("declarator")) return null;
  const names: (string | null)[] = [];
  for (const specifier of nodes(node.helpers.get("specifiers"))) {
    if (specifier.kind === "primitivetypespecifier" || specifier.kind === "cvqualifier") {
      names.push((specifier.attributes.get("keyword") ?? null) as string | null);
    } else if (specifier.kind === "namedtypespecifier") {
      names.push(spelling(specifier.helpers.get("name") as F.Node | undefined));
    } else return null;
  }
  return Domains.arithmetic(names);
}

/** The name a declarator declares, within its parentheses, pointers, arrays and functions: none, if abstract. */
function declared(node: F.Node | undefined): ReadonlySet<string> {
  while (node !== undefined && node.kind !== "iddeclarator") {
    node = node.helpers.get("declarator") as F.Node | undefined;
  }
  if (node === undefined) return new Set();
  const name = spelling(node.helpers.get("name") as F.Node | undefined);
  return new Set(name === null ? [] : [name]);
}

/** The names a function declarator's parameters, a lambda's parameters and init captures, or a requires expression's
 * parameters bind within it: each parameter declaration's declarator's name, each init capture's. */
export function boundNames(node: F.Node): ReadonlySet<string> {
  const held = [...nodes(node.helpers.get("parameters")), ...nodes(node.helpers.get("captures"))];
  const declarator = node.helpers.get("declarator") as F.Node | undefined; // a lambda's, its parameters
  if (declarator !== undefined && node.kind === "lambdaexpression") {
    held.push(...nodes(declarator.helpers.get("parameters")));
  }
  const found = new Set<string>();
  for (const p of held) {
    if (p.kind !== "parameterdeclaration") continue;
    for (const name of declared(p.helpers.get("declarator") as F.Node | undefined)) found.add(name);
  }
  for (const p of held) {
    const name = p.kind === "initcapture" ? spelling(p.helpers.get("name") as F.Node | undefined) : null;
    if (name !== null) found.add(name);
  }
  return found;
}

const BINDERS: ReadonlySet<string> = new Set(["functiondeclarator", "lambdaexpression", "requiresexpression"]);

/** The names each of a node's arguments has bound, in order: within a function declarator, a lambda or a requires
 * expression, its parameters' (and init captures') names; its slots, its variadic arguments, then its helpers'. */
function bound(node: F.Node, inner: ReadonlySet<string>): ReadonlySet<string>[] {
  if (BINDERS.has(node.kind)) inner = new Set([...inner, ...boundNames(node)]);
  const found: ReadonlySet<string>[] = Array.from({ length: node.slots.size + node.many.length }, () => inner);
  for (const value of node.helpers.values()) for (const helper of nodes(value)) found.push(...bound(helper, inner));
  return found;
}

/** What each argument of a kind has bound, besides its scope's: the parameters a function declarator, a lambda or a
 * requires expression declares, within it (`boundNames`). */
export function scopes(tag: string): (record: any) => ReadonlySet<string>[] {
  return (record: any) => bound(F.node(tag, record), new Set());
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** The kinds and helpers that hold an identifier's spelling, and where: the framework's variable, and an identifier,
 * wherever a name is held. */
const NAMES: ReadonlyMap<string, string> = new Map([["variable", "name"], ["identifier", "spelling"]]);

/** An identifier, as mbse-programs checks it: letters, digits, `_` and `$`, not starting with a digit; characters
 * beyond ASCII are taken to be letters. */
export function identifierProblems(value: unknown): string[] {
  if (typeof value !== "string" || value === "") return [];
  const ascii = [...value].map((c) => (c.charCodeAt(0) < 128 ? c : "a")).join("");
  return IDENTIFIER.test(ascii) ? [] : [`${repr(value)} is not an identifier`];
}

/** A literal's encoded properties: its prefix, its quote, its base and its suffix, each one its dialect writes, and its
 * value, one of its type (`Domains.outOfRange`). */
function literalProblems(attributes: ReadonlyMap<string, any>, prefixes: readonly string[], suffixes: Suffixes,
  language: string, types: Domains.Types): string[] {
  const problems: string[] = [];
  const [prefix, quote, base, suffix] = ["prefix", "quote", "base", "suffix"].map((name) => attributes.get(name));
  if (prefix !== undefined && !prefixes.includes(prefix)) problems.push(`a literal's prefix cannot be ${repr(prefix)}`);
  if (quote !== undefined && !QUOTES.includes(quote)) problems.push(`a literal's quote cannot be ${repr(quote)}`);
  if (base !== undefined && ![2n, 8n, 10n, 16n].includes(base)) {
    problems.push(`a literal's base cannot be ${repr(base)}`);
  }
  if (suffix !== undefined) {
    const value = attributes.get("value");
    const allowed = typeof value === "bigint" ? suffixes.integer : typeof value === "number" ? suffixes.floating : null;
    if (allowed === null || !allowed.test(suffix)) problems.push(`a literal's suffix cannot be ${repr(suffix)}`);
  }
  let out: string | null;
  try {
    out = Domains.outOfRange(attributes, language, types);
  } catch (error) {
    if (!(error instanceof ValueError)) throw error;
    out = error.message; // its type is not defined in its holder's store
  }
  if (out !== null) problems.push(out);
  return problems;
}

/** A constant's text: as written (`text`), else its default spelling, `nullptr`. The printer writes it, and a refusal
 * shows it (`Kind.shown`). */
export function constantText(attributes: ReadonlyMap<string, any>): string {
  return attributes.get("text") ?? "nullptr";
}

/** A constant holds `nullptr`, unless its text is invalid, its problems said. */
function constantProblems(attributes: ReadonlyMap<string, any>): string[] {
  const singleton = attributes.get("singleton");
  if (singleton === undefined) return attributes.has("problems") ? [] : ["a constant needs a singleton"];
  return singleton === "nullptr" ? [] : [`a constant's singleton must be nullptr, got ${repr(singleton)}`];
}

/** A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
 * identifier's spelling, a literal's encoded properties and its value's range, in `language` (`C` or `C++`), its type
 * read through `types`, a member's operator, invalid syntax in a sublanguage, an enumeration's enumerators within its
 * body. */
export function problems(node: F.Node, types: Domains.Types, suffixes: Suffixes = SUFFIXES,
  prefixes: readonly string[] = PREFIXES, language = "C"): string[] {
  const { kind, attributes } = node;
  const found = kind === "error" || kind === "missing" ? F.invalidProblems(kind, attributes) : [];
  found.push(...identifierProblems(attributes.get(NAMES.get(kind) ?? "")));
  const operator = attributes.get("operator");
  if (kind === MEMBEREXPRESSION && operator !== undefined && operator !== "." && operator !== "->") {
    found.push(`a memberexpression's operator must be '.' or '->', got ${repr(operator)}`);
  }
  if (kind === CONSTANT) found.push(...constantProblems(attributes));
  if (kind === "enumspecifier" && attributes.get("body") !== true && (node.many.length > 0
    || attributes.get("trailing_comma") === true)) {
    found.push("an EnumSpecifier with enumerators has a body");
  }
  if (kind === LITERAL) found.push(...literalProblems(attributes, prefixes, suffixes, language, types));
  for (const value of node.helpers.values()) {
    for (const inner of nodes(value)) found.push(...problems(inner, types, suffixes, prefixes, language));
  }
  return found;
}

const ANY1 = new FD.Function([FD.Anything], FD.Anything);

/** The slots of a kind's helpers that may be empty, wherever its type names nest them: an array declarator's size, a
 * designator's range's last index, a noexcept specifier's condition, a parameter's default argument or a type
 * parameter's default type, a lambda's or a template parameter's requires clause, an enumeration's fixed type, and a
 * function's or a lambda's trailing return type. */
export const OPTIONAL: readonly string[] = ["*.size", "*.last", "*.condition", "*.default", "*.requires", "*.base",
  "*.trailing_return"];

/** The types C's keywords name, which a store's dialects must define; a type's name may be a program's own. */
const KEYWORD_TYPES: ReadonlySet<string> = new Set(Domains.NAMES);

/** The arithmetic type a cast names, by its name (`typeName`), read through `types`: one its keywords name must be
 * defined (`int`), one a type's name names may be a program's own, so not arithmetic (`my_t`); null for a type that is
 * not arithmetic. */
export function castType(name: string | null, types: Domains.Types): Domains.CType | null {
  if (name === null) return null;
  return KEYWORD_TYPES.has(name) ? types.named(name) : types.find(name);
}

const pathOf = (language: string) => (language === "C" ? "C.Expressions" : "Cpp.Expressions");

/** A kind's domain that is `bool`, read from the store of the term's holder (a comparison's, `!`'s, `noexcept`'s). */
export function truth(language: string): (record: any) => FD.Domain {
  return (record) => new Domains.Types(record, pathOf(language)).named("bool");
}

/** `sizeof`'s and `alignof`'s domain, `size_t`, read from the store of the term's holder. */
export function size(language: string): (record: any) => FD.Domain {
  return (record) => new Domains.Types(record, pathOf(language)).named("size_t");
}

const TRUTHS: ReadonlySet<string> = new Set(["<", "<=", ">", ">=", "==", "!=", "&&", "||", "!"]);

/** An operator's domain where it is `bool` (a comparison, `&&`, `||`, `!`), read from the store of the term's holder;
 * null for any other, whose domain is its signature's. */
function operatorTruth(language: string): (record: any) => FD.Domain | null {
  const read = truth(language);
  return (record) => (TRUTHS.has(F.attributesOf(record).get("operator")) ? read(record) : null);
}

/** A literal's spelling, in each language: what its text writes beside its value, not what it is. A character's quote
 * is C's spelling, `'a'` an `int` as `97` is, and not C++'s, where `'a'` is a `char`: there it is what the literal
 * is. */
export const SPELLING: { readonly C: readonly string[]; readonly "C++": readonly string[] } = {
  C: ["text", "problems", "quote", "base", "separators"],
  "C++": ["text", "problems", "base", "separators", "raw", "delimiter"],
};

/** How the framework reads the kinds of the C family that a dialect has (`tags`, in its `Term`'s order: those it shares
 * with the other language of the family), in `language` (`C` or `C++`), whose binary operators, literals' types,
 * prefixes and suffixes differ. */
export function kinds(language: string, tags: readonly string[], prefixes: readonly string[],
  suffixes: Suffixes): Record<string, F.Kind> {
  const check = (tag: string) => (record: any) => problems(F.node(tag, record),
    new Domains.Types(record, pathOf(language)),
    suffixes, prefixes, language);
  /** A cast's arithmetic type, which is its domain, read from the store of the term's holder. */
  const typedCast = (record: any): FD.Domain | null =>
    castType(typeName(F.node(CASTEXPRESSION, record).slots.get("type")), new Domains.Types(record, pathOf(language)));
  const application = (tag: string, signature: FD.Signature = new FD.Opaque(), options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature, check: check(tag), scopes: scopes(tag), ...options,
      optional: [...(options.optional ?? []), ...OPTIONAL] });
  const operator = (tag: string, vocabulary: ReadonlyMap<string, FD.Signature>, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required: ["operator"], check: check(tag),
      scopes: scopes(tag), ...options });
  const every: Record<string, () => F.Kind> = {
    [LITERAL]: () => new F.Kind(F.LITERAL, { spelling: SPELLING[language as "C" | "C++"], check: check(LITERAL),
      typed: (record: any) => Domains.literal(F.attributesOf(record), language, new Domains.Types(record,
        pathOf(language))) }),
    [CONSTANT]: () => new F.Kind(F.LITERAL, { spelling: ["text", "problems"], check: check(CONSTANT),
      typed: () => Domains.NULLPTR, shown: constantText }),
    [CONCATENATEDSTRING]: () => application(CONCATENATEDSTRING, new FD.Opaque(Domains.String)),
    [VARIABLE]: () => new F.Kind(F.REFERENCE, { required: ["name"], check: check(VARIABLE) }),
    [PARENTHESIZEDEXPRESSION]: () => application(PARENTHESIZEDEXPRESSION, ANY1),
    [GENERICSELECTION]: () => application(GENERICSELECTION, new FD.Opaque(), { optional: ["type"] }), // `default`
    [SUBSCRIPTEXPRESSION]: () => application(SUBSCRIPTEXPRESSION, Domains.SUBSCRIPT),
    [CALLEXPRESSION]: () => application(CALLEXPRESSION, Domains.CALL),
    [MEMBEREXPRESSION]: () => application(MEMBEREXPRESSION, Domains.MEMBER, { required: ["operator", "member"] }),
    [POSTFIXEXPRESSION]: () => operator(POSTFIXEXPRESSION, Domains.POSTFIX),
    [UNARYEXPRESSION]: () => operator(UNARYEXPRESSION, Domains.UNARY, { typed: operatorTruth(language) }),
    [SIZEOFEXPRESSION]: () => application(SIZEOFEXPRESSION, Domains.SIZE, { typed: size(language) }),
    [ALIGNOFEXPRESSION]: () => application(ALIGNOFEXPRESSION, Domains.SIZE, { required: ["keyword"],
      typed: size(language) }),
    [CASTEXPRESSION]: () => application(CASTEXPRESSION, Domains.CAST, { typed: typedCast }),
    [BINARYEXPRESSION]: () => operator(BINARYEXPRESSION, language === "C" ? Domains.BINARY : Domains.BINARY_CPP,
      { typed: operatorTruth(language) }),
    [CONDITIONALEXPRESSION]: () => application(CONDITIONALEXPRESSION, Domains.CONDITIONAL,
      { optional: ["consequence"] }),
    [ASSIGNMENTEXPRESSION]: () => operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
    [INITIALIZERLIST]: () => application(INITIALIZERLIST),
    [DESIGNATEDINITIALIZER]: () => application(DESIGNATEDINITIALIZER, new FD.Opaque(), { required: ["initializer"] }),
    [COMPOUNDLITERALEXPRESSION]: () => application(COMPOUNDLITERALEXPRESSION, new FD.Opaque(),
      { required: ["initializer"] }),
    [STATEMENTEXPRESSION]: () => application(STATEMENTEXPRESSION),
    [EXTENSIONEXPRESSION]: () => application(EXTENSIONEXPRESSION, ANY1),
    [TYPEID]: () => application(TYPEID),
    [ENUMERATOR]: () => application(ENUMERATOR, new FD.Opaque(), { required: ["name"], optional: ["value"] }),
  };
  return Object.fromEntries(tags.filter((tag) => tag in every).map((tag) => [tag, (every[tag] as () => F.Kind)()]));
}

/** The domain of a literal no type holds, a bigint beyond every type its suffix allows (`Kind.typed` reads the
 * others'): not known. */
export function untyped(value?: unknown): FD.Domain { // eslint-disable-line @typescript-eslint/no-unused-vars
  return FD.Anything;
}

/** A name that is an identifier: its spelling, written in a `Name`. */
function identifierName(spelling: string): (n: any) => any {
  return (n: any) => n.identifier((i: any) => i.spelling(spelling));
}

/** The writers of the kinds the C family evaluates, for one dialect: its `Terms.Dialect`, whose `spec` writes a native
 * value as its literal, and its `Writer`. C's are this module's functions; `Cpp`'s, its own. */
export class Writers<W extends F.Writer> {
  constructor(readonly dialect: F.Dialect, readonly writer: new (write: (union: any) => any) => W) {}

  /** The literal `value` (a bool, a bigint, a number or a string), with `suffix` as written (`u`, `ull`, `f`, `L`),
   * which gives its type. */
  literal = (value: unknown, suffix: string | null = null): W => new this.writer((u: any) => u.literal((r: any) => {
    if (value !== null && value !== undefined) r.value((p: any) => p.as_scalar(value));
    return suffix === null ? r : r.suffix(suffix);
  }));

  /** The variable `name`: an identifier used as an expression. */
  identifier = (name: string): W => new this.writer((u: any) => u.variable((r: any) => r.name(name)));

  /** `<operator> operand`; the operand is a spec (a native value is a literal). */
  unary = (operator: string, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.unaryexpression((r: any) => r.operator(operator).operand(operandSpec)));
  };

  /** `left <operator> right`; each operand is a spec. */
  binary = (operator: string, left: unknown, right: unknown): W => {
    const [leftSpec, rightSpec] = [this.dialect.spec(left), this.dialect.spec(right)];
    return new this.writer((u: any) => u.binaryexpression((r: any) => r.left(leftSpec).operator(operator)
        .right(rightSpec)));
  };

  /** `condition ? consequence : alternative`. */
  conditional = (condition: unknown, consequence: unknown, alternative: unknown): W => {
    const [a, b, c] = [this.dialect.spec(condition), this.dialect.spec(consequence), this.dialect.spec(alternative)];
    return new this.writer((u: any) => u.conditionalexpression((r: any) => r.condition(a).consequence(b)
        .alternative(c)));
  };

  /** `(type) operand`, `type` a spec of its family's Types' `Term` (C Types', Cpp Types'), written through the
   * builders (`(t) => t.typeid((i) => i.specifiers([(s) => s.primitivetypespecifier((p) => p.keyword("int"))]))`). */
  cast = (type: (t: any) => any, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.castexpression((r: any) => r.type(type).operand(operandSpec)));
  };

  /** `object.name`, or `object->name` with the operator '->'. */
  member = (object: unknown, name: string, operator = "."): W => {
    const objectSpec = this.dialect.spec(object);
    return new this.writer((u: any) => u.memberexpression(
      (r: any) => r.object(objectSpec).operator(operator).member(identifierName(name))));
  };

  /** `object[index]` (C++23's `object[i, j]` with several). */
  subscript = (object: unknown, ...indices: unknown[]): W => {
    const objectSpec = this.dialect.spec(object);
    const specs = indices.map((index) => this.dialect.spec(index));
    return new this.writer((u: any) => u.subscriptexpression((r: any) => r.object(objectSpec).indices(specs)));
  };

  /** `fn(args...)`: a function by its name (a `string`, the variable that names it), or any term. */
  call = (fn: unknown, ...args: unknown[]): W => {
    const fnSpec = typeof fn === "string" ? this.identifier(fn) : this.dialect.spec(fn);
    const specs = args.map((argument) => this.dialect.spec(argument));
    return new this.writer((u: any) => u.callexpression((r: any) => r.function(fnSpec).arguments(specs)));
  };
}
