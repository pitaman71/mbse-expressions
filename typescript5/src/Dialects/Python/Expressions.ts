/**
 * Expressions of the Python dialect: Python expressions, with the imports they need, as Python's `ast` has them.
 *
 * - `constant`: a native value. `name`: the value bound to a name; the names of `BUILTINS` are always bound.
 * - `attribute`: `value.attr`. `subscript`: `value[key]`, for a str key. `call`: a function, the slot `function`,
 *   applied to ordered `arguments`, e.g. `np.greater_equal(x, 18)`, whose function is the attribute `greater_equal`
 *   of the name `np`.
 * - `compare` (`==`, `!=`, `<`, `<=`, `>`, `>=`), `boolop` (`and`, `or`), `binop` (`+`, `-`, `*`, `/`, `//`, `%`,
 *   `**`) and `unaryop` (`not`, `-`, `+`), each with one operator and two operands (one for `unaryop`).
 * - `ifexp`: `body if test else orelse`.
 * - `let`: `(lambda name: body)(value)`, Python's idiom for binding a name within an expression.
 * - `import` (`import module` or `import module as alias`) and `importfrom` (`from module import name` or `... as
 *   alias`) bind a name within their body, which is the rest of the expression; `render` writes them as the lines
 *   before it. What they may import is up to the scope that evaluates them (see `Evaluators`).
 *
 * The meta-schemas are registered as 'Expressions.Python.Of<ast class>' ('Expressions.Python.OfBinOp', ...). `render`
 * writes an expression as Python source, parenthesized only where precedence requires. Reading Python source
 * (`parse`) needs Python's own parser, so it is in the Python implementation only.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;
type Native = Visitors.Native;

/** The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`). */
export const BUILTINS: ReadonlySet<string> = new Set([
  "abs", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "str"]);

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

const STR = String;

class _Constant extends F.Node {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = F.NATIVES;
  declare value: unknown;
}

class _Name extends F.Node {
  static override KIND = "name";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = new Map([["name", STR]]);
  static override AMBIENT = BUILTINS;
  declare name: string;

  override check(): string[] {
    return identifierProblems("a name", this.name);
  }
}

class _Attribute extends F.Node {
  static override KIND = "attribute";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["attr", STR]]);
  static override SLOTS = ["value"];
  static override OPERATOR = "attr";
  static override SIGNATURE = new FD.Function([FD.Anything], FD.Anything);
  declare attr: string;
  declare value: any;

  override check(): string[] {
    return identifierProblems("an attribute", this.attr);
  }
}

class _Subscript extends F.Node {
  static override KIND = "subscript";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["key", STR]]);
  static override SLOTS = ["value"];
  static override OPERATOR = "key";
  static override SIGNATURE = new FD.Function([FD.Anything], FD.Anything);
  declare key: string;
  declare value: any;
}

class _Call extends F.Node {
  static override KIND = "call";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["function"];
  static override VARIADIC = "arguments";
  static override SIGNATURE = new FD.Opaque();
  declare function: any;
  declare arguments: any[];
}

const OPERATOR = new Map([["operator", STR]]);

class _Compare extends F.Node {
  static override KIND = "compare";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = OPERATOR;
  static override SLOTS = ["left", "right"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.COMPARE;
  declare operator: string;
  declare left: any;
  declare right: any;
}

class _Boolop extends F.Node {
  static override KIND = "boolop";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = OPERATOR;
  static override SLOTS = ["left", "right"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.BOOLOP;
  declare operator: string;
  declare left: any;
  declare right: any;
}

class _Binop extends F.Node {
  static override KIND = "binop";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = OPERATOR;
  static override SLOTS = ["left", "right"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.BINOP;
  declare operator: string;
  declare left: any;
  declare right: any;
}

class _Unaryop extends F.Node {
  static override KIND = "unaryop";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = OPERATOR;
  static override SLOTS = ["operand"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.UNARYOP;
  declare operator: string;
  declare operand: any;
}

class _IfExp extends F.Node {
  static override KIND = "ifexp";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["test", "body", "orelse"];
  static override SIGNATURE = new FD.Function([FD.Anything, FD.Anything, FD.Anything], FD.Anything);
  declare test: any;
  declare body: any;
  declare orelse: any;
}

class _Let extends F.Node {
  static override KIND = "let";
  static override ROLE = F.BINDING;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["value", "body"];
  declare name: string;
  declare value: any;
  declare body: any;

  override check(): string[] {
    return identifierProblems("a let's name", this.name);
  }
}

class _Import extends F.Node {
  static override KIND = "import";
  static override ROLE = F.IMPORT;
  static override PROPERTIES = new Map([["module", STR], ["alias", STR]]);
  static override OPTIONAL = new Set(["alias"]);
  static override SLOTS = ["body"];
  declare module: string;
  declare alias: string | null;
  declare body: any;

  override binds(): string[] {
    return [this.alias ?? (this.module.split(".")[0] as string)];
  }

  override check(): string[] {
    const problems = typeof this.module !== "string" || dotted(this.module) ? []
      : [`an import's module must be a dotted name, got ${repr(this.module)}`];
    return [...problems, ...identifierProblems("an import's alias", this.alias)];
  }
}

class _ImportFrom extends F.Node {
  static override KIND = "importfrom";
  static override ROLE = F.IMPORT;
  static override PROPERTIES = new Map([["module", STR], ["name", STR], ["alias", STR]]);
  static override OPTIONAL = new Set(["alias"]);
  static override SLOTS = ["body"];
  declare module: string;
  declare name: string;
  declare alias: string | null;
  declare body: any;

  override binds(): string[] {
    return [this.alias ?? this.name];
  }

  override check(): string[] {
    const problems = typeof this.module !== "string" || dotted(this.module) ? []
      : [`an importfrom's module must be a dotted name, got ${repr(this.module)}`];
    return [...problems, ...identifierProblems("an importfrom's name", this.name),
      ...identifierProblems("an importfrom's alias", this.alias)];
  }
}

const KINDS = [_Constant, _Name, _Attribute, _Subscript, _Call, _Compare, _Boolop, _Binop, _Unaryop, _IfExp, _Let,
  _Import, _ImportFrom];
const AST_NAMES: Record<string, string> = {
  boolop: "BoolOp", binop: "BinOp", unaryop: "UnaryOp", ifexp: "IfExp", importfrom: "ImportFrom",
};

export const DIALECT = new F.Declared("Python", KINDS, {
  domain_of: Domains.of,
  schemaNames: new Map(KINDS.map((k) => [k.KIND,
    `Expressions.Python.Of${AST_NAMES[k.KIND] ?? k.KIND.charAt(0).toUpperCase() + k.KIND.slice(1)}`])),
});
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

const spec = (value: unknown): any => DIALECT.resolve(value);

export function constant(value: Native): _Constant {
  return new _Constant(value);
}

export function name(name: string): _Name {
  return new _Name(name);
}

/** `value.attr`; each argument of these constructors is a spec (a native value is a constant). */
export function attribute(value: unknown, attr: string): _Attribute {
  return new _Attribute(attr, spec(value));
}

/** `value[key]`. */
export function subscript(value: unknown, key: string): _Subscript {
  return new _Subscript(key, spec(value));
}

/** `fn(...args)`. A dotted name as the function is a chain of attributes: `call('np.add', 1n, 2n)` is
 * `np.add(1, 2)`. */
export function call(fn: unknown, ...args: unknown[]): _Call {
  if (typeof fn === "string") {
    const [first, ...rest] = fn.split(".");
    let callee: F.Node = new _Name(first);
    for (const attr of rest) callee = new _Attribute(attr, callee);
    fn = callee;
  }
  return new _Call(spec(fn), args.map(spec));
}

export function compare(operator: string, left: unknown, right: unknown): _Compare {
  return new _Compare(operator, spec(left), spec(right));
}

export function boolop(operator: string, left: unknown, right: unknown): _Boolop {
  return new _Boolop(operator, spec(left), spec(right));
}

export function binop(operator: string, left: unknown, right: unknown): _Binop {
  return new _Binop(operator, spec(left), spec(right));
}

export function unaryop(operator: string, operand: unknown): _Unaryop {
  return new _Unaryop(operator, spec(operand));
}

/** `body if test else orelse`. */
export function ifexp(test: unknown, body: unknown, orelse: unknown): _IfExp {
  return new _IfExp(spec(test), spec(body), spec(orelse));
}

/** `(lambda name: body)(value)`. */
export function let_(name: string, value: unknown, body: unknown): _Let {
  return new _Let(name, spec(value), spec(body));
}

/** `import module [as alias]`, then `body`. */
export function import_(module: string, body: unknown, alias: string | null = null): _Import {
  return new _Import(module, alias, spec(body));
}

/** `from module import name [as alias]`, then `body`. */
export function importfrom(module: string, name: string, body: unknown, alias: string | null = null): _ImportFrom {
  return new _ImportFrom(module, name, alias, spec(body));
}

// --- Rendering ---

// Python's precedence, from loosest to tightest (lambda is 0).
const IF = 1, OR = 2, AND = 3, NOT = 4, COMPARE = 5, SUM = 6, PRODUCT = 7, UNARY = 8, POWER = 9, PRIMARY = 10;
const BINOP_LEVELS: Record<string, number> = {
  "+": SUM, "-": SUM, "*": PRODUCT, "/": PRODUCT, "//": PRODUCT, "%": PRODUCT, "**": POWER,
};

function constantText(value: unknown): [string, number] {
  let text: string;
  if (typeof value === "number" && !Number.isFinite(value)) {
    text = Number.isNaN(value) ? "float('nan')" : value > 0 ? "float('inf')" : "-float('inf')";
  } else {
    text = repr(value);
  }
  return [text, text.startsWith("-") ? UNARY : PRIMARY];
}

function importLine(node: _Import | _ImportFrom): string {
  const alias = node.alias ? ` as ${node.alias}` : "";
  if (node instanceof _Import) return `import ${node.module}${alias}`;
  return `from ${node.module} import ${node.name}${alias}`;
}

/** The expression as Python source: one line per import around it, then the expression. */
export function render(expression: F.Node): string {
  const lines: string[] = [];
  while (expression instanceof _Import || expression instanceof _ImportFrom) {
    lines.push(importLine(expression));
    expression = expression.body;
  }
  const write = (node: F.Node, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    if (node instanceof _Constant) return constantText(node.value);
    if (node instanceof _Name) return [node.name, PRIMARY];
    if (node instanceof _Attribute) return [`${operand(0, PRIMARY)}.${node.attr}`, PRIMARY];
    if (node instanceof _Subscript) return [`${operand(0, PRIMARY)}[${repr(node.key)}]`, PRIMARY];
    if (node instanceof _Call) return [`${operand(0, PRIMARY)}(${args.slice(1).map(([text]) => text).join(", ")})`, PRIMARY];
    if (node instanceof _Let) return [`(lambda ${node.name}: ${args[1]?.[0]})(${args[0]?.[0]})`, PRIMARY];
    if (node instanceof _IfExp) return [`${operand(1, OR)} if ${operand(0, OR)} else ${operand(2, IF)}`, IF];
    if (node instanceof _Import || node instanceof _ImportFrom) {
      throw new Errors.ValueError("an import can only enclose the whole expression");
    }
    if (node instanceof _Unaryop) {
      if (node.operator === "not") return [`not ${operand(0, NOT)}`, NOT];
      return [`${node.operator}${operand(0, UNARY)}`, UNARY];
    }
    if (node instanceof _Compare) return [`${operand(0, COMPARE + 1)} ${node.operator} ${operand(1, COMPARE + 1)}`, COMPARE];
    if (node instanceof _Boolop) {
      const level = node.operator === "and" ? AND : OR;
      return [`${operand(0, level)} ${node.operator} ${operand(1, level + 1)}`, level];
    }
    const binop = node as _Binop;
    if (binop.operator === "**") return [`${operand(0, PRIMARY)} ** ${operand(1, UNARY)}`, POWER];
    const level = BINOP_LEVELS[binop.operator] as number;
    return [`${operand(0, level)} ${binop.operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(expression, write)[0]].join("\n");
}
