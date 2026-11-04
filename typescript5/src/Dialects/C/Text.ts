/**
 * Text of the C dialect: `ToText(expression)` is a term of C (or anything `Terms.term` reads one from) as C source, as
 * mbse-programs' printer writes it (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/_Printer.py`): every kind of the C
 * family, its type names and the other helpers it holds, parentheses written in the term printed, and those C's
 * precedence needs added (and around a template argument that holds `>`). `text(expression, dialect)` writes a term of
 * either dialect of the C family, `Cpp`'s too, with the same precedence, C++'s being C's and its own.
 *
 * A literal is written in its spelling where it has one (`text`), else in its value's default spelling, with what it
 * encodes: its prefix, its base and its suffix (`5u`, `0x1fu`, `1.5f`, `u8"s"`), a character as its code's character
 * (`'a'`), a string with C's escapes, a raw string between its delimiter's parentheses, and a float that has no literal
 * as `INFINITY` or `NAN`. A body of statements or declarations, not part of the term (a lambda's, a statement
 * expression's, a struct's or an enum's), is written `{}`, where mbse-programs writes what it relates. Invalid syntax is
 * written as written (`Terms.invalidText`). Reading C (`FromText`) is mbse-programs' (the dialects proposal, Decided, 6).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as E from "./Expressions.js";

const { repr } = Repr;
const { ValueError } = Errors;

/** Precedence, loosest first, as mbse-programs' printer numbers it: an operand is parenthesized when its precedence is
 * below what its place needs; the binary operators' are between, by `BINARY`. */
const [COMMA, ASSIGNMENT, CONDITIONAL, UNARY, POSTFIX, PRIMARY] = [0, 1, 2, 15, 16, 17];

const BINARY: Readonly<Record<string, number>> = {
  ",": COMMA, "||": 3, "&&": 4, "|": 5, "^": 6, "&": 7, "==": 8, "!=": 8, "<": 9, ">": 9, "<=": 9, ">=": 9, "<=>": 10,
  "<<": 11, ">>": 11, "+": 12, "-": 12, "*": 13, "/": 13, "%": 13, ".*": 14, "->*": 14,
};

const PRECEDENCE: Readonly<Record<string, number>> = {
  assignmentexpression: ASSIGNMENT, throwexpression: ASSIGNMENT, yieldexpression: ASSIGNMENT,
  conditionalexpression: CONDITIONAL, unaryexpression: UNARY, castexpression: UNARY, sizeofexpression: UNARY,
  alignofexpression: UNARY, newexpression: UNARY, deleteexpression: UNARY, awaitexpression: UNARY,
  noexceptexpression: UNARY, extensionexpression: UNARY, sizeofpackexpression: UNARY, callexpression: POSTFIX,
  subscriptexpression: POSTFIX, memberexpression: POSTFIX, postfixexpression: POSTFIX, namedcastexpression: POSTFIX,
  typeidexpression: POSTFIX, functionalcastexpression: POSTFIX, compoundliteralexpression: POSTFIX,
  packexpansion: POSTFIX,
};

const ESCAPES: Readonly<Record<string, string>> = { "\\": "\\\\", "\n": "\\n", "\t": "\\t", "\r": "\\r", "\0": "\\0" };

const MACROS: Readonly<Record<string, string>> = { nan: "NAN", inf: "INFINITY", "-inf": "-INFINITY" };

const PREFIXES: ReadonlyMap<bigint, [string, number]> = new Map([[16n, ["0x", 16]], [8n, ["0", 8]], [2n, ["0b", 2]]]);

/** Characters between quotes, with C's escapes: a backslash, the quote, a newline, a tab, a carriage return, a null. */
function quoted(value: string, quote: string): string {
  return quote + [...value].map((c) => ESCAPES[c] ?? (c === quote ? "\\" + c : c)).join("") + quote;
}

/** A number as C writes it: an int's digits in its base; a float's shortest text, with a point or an exponent. */
function numberText(value: bigint | number, base: unknown): string {
  if (typeof value === "bigint") {
    const prefix = PREFIXES.get(base as bigint);
    if (prefix === undefined) return value.toString();
    const digits = (value < 0n ? -value : value).toString(prefix[1]);
    return (value < 0n ? "-" : "") + prefix[0] + (digits === "0" && prefix[1] === 8 ? "" : digits);
  }
  return repr(value); // a float's shortest text, with a point or an exponent
}

/** A literal's default spelling, of its value and what it encodes. */
function literalText(attributes: ReadonlyMap<string, any>): string {
  const [value, prefix] = [attributes.get("value"), attributes.get("prefix") ?? ""];
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    if (attributes.get("raw")) {
      const delimiter = attributes.get("delimiter") ?? "";
      return `${prefix}R"${delimiter}(${value})${delimiter}"`;
    }
    return prefix + quoted(value, '"');
  }
  if (typeof value === "bigint" && attributes.get("quote") === "'") return prefix + quoted(String.fromCodePoint(Number(value)), "'");
  if (typeof value === "number" && !Number.isFinite(value)) return MACROS[repr(value)] as string;
  return numberText(value, attributes.get("base")) + (attributes.get("suffix") ?? "");
}

type Held = F.Node | readonly F.Node[] | undefined;

function nodes(value: Held): readonly F.Node[] {
  return value === undefined ? [] : value as readonly F.Node[];
}

function one(value: Held): F.Node | undefined {
  return value as F.Node | undefined;
}

/** Whether a declarator declares no name. */
function abstract(declarator: F.Node | undefined): boolean {
  while (declarator !== undefined) {
    if (declarator.kind === "iddeclarator") return false;
    declarator = one(declarator.helpers.get("declarator"));
  }
  return true;
}

/** Specifiers and a declarator: separated by a space, unless the declarator is abstract and starts with a pointer,
 * reference, bracket or parenthesis. */
function declaredText(specifiers: string, declarator: string, isAbstract: boolean): string {
  if (specifiers === "" || declarator === "") return specifiers + declarator;
  if (declarator.startsWith("...")) return specifiers + "..." + (declarator.length > 3 ? " " + declarator.slice(3) : "");
  if (isAbstract && "*&[(".includes(declarator[0] as string)) return specifiers + declarator;
  return `${specifiers} ${declarator}`;
}

type Text = (printer: Printer, node: F.Node) => string;

/** Writes a term's source from its `Node`: its kind as C and C++ write it, its type names and other helpers nested. */
class Printer {
  constructor(readonly dialect: F.Dialect) {}

  /** A term's `Node`, read through the dialect (which refuses another dialect's term), or a `Node` as it is. */
  node(value: any): F.Node {
    if (value instanceof F.Node) return value;
    const [tag, record] = this.dialect.kind(value);
    return F.node(tag, record);
  }

  precedence(node: F.Node, written: string): number {
    if (node.kind === E.BINARYEXPRESSION) return BINARY[node.attributes.get("operator")] as number;
    if (node.kind === E.LITERAL && written.startsWith("-")) return UNARY; // a negative value's sign binds as a unary operator does
    return PRECEDENCE[node.kind] ?? PRIMARY;
  }

  /** A term where an expression of at least `needed` precedence is needed, parenthesized if it binds less. */
  expression(value: any, needed: number): string {
    const node = this.node(value);
    const written = this.text(node);
    return this.precedence(node, written) < needed ? `(${written})` : written;
  }

  /** A term that may be a type name (`sizeof(int)`, a template's argument): a type as written, else an expression. */
  operand(value: any, needed: number): string {
    const node = this.node(value);
    return node.kind === E.TYPEID ? this.text(node) : this.expression(node, needed);
  }

  text(node: F.Node): string {
    return (TEXTS[node.kind] as Text)(this, node);
  }

  /** A node's name, by its property: a `Name`, or an identifier, a helper. */
  name(node: F.Node, property: string): string {
    return this.text(one(node.helpers.get(property)) as F.Node);
  }

  /** Arguments: expressions or type names, separated by commas. */
  list(values: readonly any[]): string {
    return values.map((value) => this.operand(value, ASSIGNMENT)).join(", ");
  }

  /** A requires clause: primary expressions joined by `&&` and `||`. */
  constraint(value: any, needed: number = BINARY["||"] as number): string {
    const node = this.node(value);
    const operator = node.attributes.get("operator");
    if (node.kind === E.BINARYEXPRESSION && (operator === "&&" || operator === "||")) {
      const level = BINARY[operator] as number;
      const written = `${this.constraint(node.slots.get("left"), level)} ${operator} ${this.constraint(node.slots.get("right"), level + 1)}`;
      return level < needed ? `(${written})` : written;
    }
    return this.expression(node, PRIMARY);
  }

  /** Template arguments, parenthesized where a `>` would end the list. */
  templateArguments(values: readonly any[]): string {
    const written = values.map((value) => {
      const node = this.node(value);
      if (node.kind === E.TYPEID) return this.text(node);
      const text = this.expression(node, CONDITIONAL);
      return this.precedence(node, text) <= (BINARY[">"] as number) && text.includes(">") && !text.startsWith("(") ? `(${text})` : text;
    });
    return "<" + written.join(", ") + ">";
  }

  keywordCall(keyword: string, operand: any): string {
    const node = this.node(operand);
    return `${keyword}(${node.kind === E.TYPEID ? this.text(node) : this.expression(node, COMMA)})`;
  }

  attributesAfter(node: F.Node): string {
    return nodes(node.helpers.get("attributes")).map((a) => " " + this.text(a)).join("");
  }

  initializer(node: F.Node): string {
    if (node.kind === "equalinitializer") return " = " + this.expression(node.slots.get("value"), ASSIGNMENT);
    if (node.kind === "parenthesizedinitializer") return "(" + this.list(node.many) + ")";
    return this.text(node);
  }

  // Expressions

  literal(node: F.Node): string {
    if (node.attributes.has("text")) return node.attributes.get("text");
    if (!node.attributes.has("value")) throw new ValueError(`${this.dialect.name()} literal has no value to print`);
    return literalText(node.attributes);
  }

  unary(node: F.Node): string {
    const [operand, operator] = [this.expression(node.slots.get("operand"), UNARY), node.attributes.get("operator") as string];
    const first = operand.slice(0, 1);
    const space = ["+", "-", "&", "*"].includes(first) && first === operator.slice(-1) ? " " : "";
    return operator + space + operand; // `- -x`, not the decrement `--x`
  }

  binary(node: F.Node): string {
    const operator = node.attributes.get("operator") as string;
    const level = BINARY[operator] as number;
    const [left, right] = [this.expression(node.slots.get("left"), level), this.expression(node.slots.get("right"), level + 1)];
    if (operator === ".*" || operator === "->*") return left + operator + right;
    return operator === "," ? `${left}, ${right}` : `${left} ${operator} ${right}`;
  }

  assignment(node: F.Node): string {
    return `${this.expression(node.slots.get("left"), BINARY["||"] as number)} ${node.attributes.get("operator")} `
      + this.expression(node.slots.get("right"), ASSIGNMENT);
  }

  conditional(node: F.Node): string {
    const condition = this.expression(node.slots.get("condition"), BINARY["||"] as number);
    const alternative = this.expression(node.slots.get("alternative"), ASSIGNMENT);
    if (node.slots.get("consequence") === null) return `${condition} ?: ${alternative}`; // GNU's
    return `${condition} ? ${this.expression(node.slots.get("consequence"), COMMA)} : ${alternative}`;
  }

  call(node: F.Node): string {
    return this.expression(node.slots.get("function"), POSTFIX) + "(" + this.list(node.many) + ")";
  }

  subscript(node: F.Node): string {
    const indices = node.many.map((index) => this.expression(index, ASSIGNMENT)).join(", ");
    return `${this.expression(node.slots.get("object"), POSTFIX)}[${indices}]`;
  }

  member(node: F.Node): string {
    return this.expression(node.slots.get("object"), POSTFIX) + node.attributes.get("operator")
      + (node.attributes.get("template_keyword") ? "template " : "") + this.name(node, "member");
  }

  postfix(node: F.Node): string {
    return this.expression(node.slots.get("operand"), POSTFIX) + node.attributes.get("operator");
  }

  sizeof(node: F.Node): string {
    const operand = this.node(node.slots.get("operand"));
    if (operand.kind === E.TYPEID) return `sizeof(${this.text(operand)})`;
    const written = this.expression(operand, UNARY);
    return "sizeof" + (written.startsWith("(") ? "" : " ") + written;
  }

  cast(node: F.Node): string {
    return `(${this.text(one(node.helpers.get("type")) as F.Node)})${this.expression(node.slots.get("operand"), UNARY)}`;
  }

  initializerList(node: F.Node): string {
    const items = node.many.map((item) => this.expression(item, ASSIGNMENT)).join(", ");
    return "{" + items + (node.attributes.get("trailing_comma") ? "," : "") + "}";
  }

  designated(node: F.Node): string {
    return nodes(node.helpers.get("designators")).map((d) => this.text(d)).join("")
      + this.initializer(one(node.helpers.get("initializer")) as F.Node);
  }

  designator(node: F.Node): string {
    if (node.kind === "fielddesignator") return "." + this.name(node, "name");
    const last = node.slots.get("last");
    const range = last !== null ? ` ... ${this.expression(last, CONDITIONAL)}` : "";
    return `[${this.expression(node.slots.get("index"), CONDITIONAL)}${range}]`;
  }

  generic(node: F.Node): string {
    const associations = nodes(node.helpers.get("associations")).map((a) => (a.helpers.has("type")
      ? this.text(one(a.helpers.get("type")) as F.Node) : "default") + ": " + this.expression(a.slots.get("value"), ASSIGNMENT));
    return `_Generic(${[this.operand(node.slots.get("controlling"), ASSIGNMENT), ...associations].join(", ")})`;
  }

  newText(node: F.Node): string {
    let written = (node.attributes.get("global_scope") ? "::" : "") + "new ";
    if (node.many.length > 0) written += "(" + this.list(node.many) + ") ";
    const type = this.text(one(node.helpers.get("type")) as F.Node);
    written += node.attributes.get("parenthesized_type") ? `(${type})` : type;
    return written + (node.helpers.has("initializer") ? this.initializer(one(node.helpers.get("initializer")) as F.Node) : "");
  }

  deleteText(node: F.Node): string {
    return (node.attributes.get("global_scope") ? "::" : "") + "delete" + (node.attributes.get("array") ? "[]" : "") + " "
      + this.expression(node.slots.get("operand"), UNARY);
  }

  fold(node: F.Node): string {
    const [operator, left, right] = [node.attributes.get("operator"), node.slots.get("left"), node.slots.get("right")];
    const writtenLeft = left !== null ? this.expression(left, UNARY) + ` ${operator} ` : "";
    const writtenRight = right !== null ? ` ${operator} ` + this.expression(right, UNARY) : "";
    return `(${writtenLeft}...${writtenRight})`;
  }

  lambda(node: F.Node): string {
    let written = "[" + nodes(node.helpers.get("captures")).map((c) => this.text(c)).join(", ") + "]";
    const parameters = nodes(node.helpers.get("template_parameters"));
    if (parameters.length > 0) written += "<" + parameters.map((p) => this.text(p)).join(", ") + ">";
    const requires = node.slots.get("template_requires");
    if (requires !== null) written += " requires " + this.constraint(requires);
    written += this.attributesAfter(node);
    if (node.helpers.has("declarator")) written += (requires !== null ? " " : "") + this.text(one(node.helpers.get("declarator")) as F.Node);
    return written + " {}"; // its body of statements, not part of the term
  }

  lambdaDeclarator(node: F.Node): string {
    let written = "(" + nodes(node.helpers.get("parameters")).map((p) => this.text(p)).join(", ") + ")";
    written += nodes(node.helpers.get("specifiers")).map((s) => " " + s.attributes.get("keyword")).join("");
    if (node.helpers.has("exception")) written += " " + this.text(one(node.helpers.get("exception")) as F.Node);
    written += this.attributesAfter(node);
    if (node.helpers.has("trailing_return")) written += " -> " + this.text(one(node.helpers.get("trailing_return")) as F.Node);
    if (node.slots.get("requires") !== null) written += " requires " + this.constraint(node.slots.get("requires"));
    return written;
  }

  capture(node: F.Node): string {
    const attributes = node.attributes;
    if (node.kind === "defaultcapture") return attributes.get("mode");
    if (node.kind === "thiscapture") return attributes.get("copy") ? "*this" : "this";
    const reference = attributes.get("by_reference") ? "&" : "";
    if (node.kind === "simplecapture") return reference + this.name(node, "name") + (attributes.get("pack") ? "..." : "");
    return reference + (attributes.get("pack") ? "..." : "") + this.name(node, "name")
      + this.initializer(one(node.helpers.get("initializer")) as F.Node);
  }

  requires(node: F.Node): string {
    let written = "requires ";
    const parameters = nodes(node.helpers.get("parameters"));
    if (parameters.length > 0) written += "(" + parameters.map((p) => this.text(p)).join(", ") + ") ";
    const requirements = nodes(node.helpers.get("requirements"));
    if (requirements.length === 0) return written + "{}";
    return written + "{ " + requirements.map((r) => this.text(r)).join(" ") + " }";
  }

  requirement(node: F.Node): string {
    if (node.kind === "simplerequirement") return this.expression(node.slots.get("expression"), COMMA) + ";";
    if (node.kind === "typerequirement") return `typename ${this.text(one(node.helpers.get("name")) as F.Node)};`;
    if (node.kind === "nestedrequirement") return `requires ${this.constraint(node.slots.get("constraint"))};`;
    let written = "{ " + this.expression(node.slots.get("expression"), COMMA) + " }";
    if (node.attributes.get("noexcept")) written += " noexcept";
    if (node.helpers.has("return_type")) written += " -> " + this.text(one(node.helpers.get("return_type")) as F.Node);
    return written + ";";
  }

  packExpansion(node: F.Node): string {
    const pattern = this.node(node.slots.get("pattern"));
    return (pattern.kind === E.TYPEID ? this.text(pattern) : this.expression(pattern, POSTFIX)) + "...";
  }

  // Names

  nameText(node: F.Node): string {
    const { attributes, kind } = node;
    if (kind === "identifier") return attributes.get("spelling");
    if (kind === "operatorname") {
      const operator = attributes.get("operator") as string;
      return "operator" + (/[A-Za-z]/.test(operator[0] as string) ? " " : "") + operator;
    }
    if (kind === "conversionname") return "operator " + this.text(one(node.helpers.get("type")) as F.Node);
    if (kind === "literaloperatorname") return `operator""${attributes.get("suffix")}`;
    if (kind === "destructorname") return "~" + this.text(one(node.helpers.get("type")) as F.Node);
    if (kind === "templateid") {
      return (attributes.get("template_keyword") ? "template " : "") + this.text(one(node.helpers.get("name")) as F.Node)
        + this.templateArguments(node.many);
    }
    return (attributes.get("global_scope") ? "::" : "")
      + nodes(node.helpers.get("qualifiers")).map((q) => this.text(q) + "::").join("")
      + this.text(one(node.helpers.get("name")) as F.Node);
  }

  // Specifiers

  specifier(node: F.Node): string {
    const kind = node.kind;
    if (kind === "namedtypespecifier") return this.name(node, "name");
    if (kind === "typenamespecifier") return "typename " + this.text(one(node.helpers.get("name")) as F.Node);
    if (kind === "decltypespecifier") return `decltype(${this.expression(node.slots.get("expression"), COMMA)})`;
    if (kind === "placeholdertypespecifier") {
      const constraint = node.helpers.has("constraint") ? this.text(one(node.helpers.get("constraint")) as F.Node) + " " : "";
      return constraint + (node.attributes.get("decltype") ? "decltype(auto)" : "auto");
    }
    if (kind === "typeofspecifier") return this.keywordCall(node.attributes.get("keyword"), node.slots.get("operand"));
    if (kind === "atomictypespecifier") return `_Atomic(${this.text(one(node.helpers.get("type")) as F.Node)})`;
    return `_BitInt(${this.expression(node.slots.get("width"), ASSIGNMENT)})`;
  }

  classText(node: F.Node): string {
    const attributes = node.attributes;
    let written = attributes.get("key") + this.attributesAfter(node);
    if (node.helpers.has("name")) written += " " + this.name(node, "name");
    if (attributes.get("final")) written += " final";
    const bases = nodes(node.helpers.get("bases"));
    if (bases.length > 0) written += " : " + bases.map((b) => this.text(b)).join(", ");
    return written + (attributes.get("body") ? " {}" : ""); // its member declarations, not part of the term
  }

  base(node: F.Node): string {
    const attributes = node.attributes;
    const parts = node.helpers.has("attributes") ? [nodes(node.helpers.get("attributes")).map((a) => this.text(a)).join(" ")] : [];
    if (attributes.get("virtual")) parts.push("virtual");
    if (attributes.has("access")) parts.push(attributes.get("access"));
    return [...parts, this.text(one(node.helpers.get("type")) as F.Node) + (attributes.get("pack") ? "..." : "")].join(" ");
  }

  enumText(node: F.Node): string {
    let written = node.attributes.get("key") + this.attributesAfter(node);
    if (node.helpers.has("name")) written += " " + this.name(node, "name");
    if (node.helpers.has("base")) written += " : " + this.text(one(node.helpers.get("base")) as F.Node);
    return written + (node.attributes.get("body") ? " {}" : ""); // its enumerators, not part of the term
  }

  // Declarators

  declarator(node: F.Node | undefined): string {
    if (node === undefined) return "";
    const { kind, attributes } = node;
    let inner = this.declarator(one(node.helpers.get("declarator")));
    if (kind === "iddeclarator") return this.name(node, "name") + this.attributesAfter(node);
    if (kind === "packdeclarator") return "..." + inner;
    if (kind === "pointerdeclarator" || kind === "referencedeclarator") {
      const parts = nodes(node.helpers.get("attributes")).map((a) => this.text(a));
      let written: string;
      if (kind === "pointerdeclarator") {
        written = node.helpers.has("scope") ? this.text(one(node.helpers.get("scope")) as F.Node) + "::*" : "*";
        parts.push(...nodes(node.helpers.get("qualifiers")).map((q) => q.attributes.get("keyword")));
      } else {
        written = attributes.get("rvalue") ? "&&" : "&";
      }
      return written + parts.join(" ") + (parts.length > 0 && inner !== "" ? " " + inner : inner);
    }
    if (kind === "parenthesizeddeclarator") return `(${inner})`;
    const held = one(node.helpers.get("declarator"));
    if (held !== undefined && (held.kind === "pointerdeclarator" || held.kind === "referencedeclarator")) inner = `(${inner})`;
    if (kind === "arraydeclarator") {
      const inside = [...(attributes.get("static") ? ["static"] : []),
        ...nodes(node.helpers.get("qualifiers")).map((q) => q.attributes.get("keyword"))].join(" ");
      const size = node.slots.get("size");
      const writtenSize = attributes.get("star") ? "*" : size !== null ? this.expression(size, ASSIGNMENT) : "";
      const both = inside !== "" && writtenSize !== "" ? inside + " " + writtenSize : inside + writtenSize;
      return inner + `[${both}]` + this.attributesAfter(node);
    }
    let written = inner + "(" + nodes(node.helpers.get("parameters")).map((p) => this.text(p)).join(", ") + ")";
    written += nodes(node.helpers.get("qualifiers")).map((q) => " " + q.attributes.get("keyword")).join("");
    if (attributes.has("ref_qualifier")) written += " " + attributes.get("ref_qualifier");
    if (node.helpers.has("exception")) written += " " + this.text(one(node.helpers.get("exception")) as F.Node);
    written += this.attributesAfter(node);
    if (node.helpers.has("trailing_return")) written += " -> " + this.text(one(node.helpers.get("trailing_return")) as F.Node);
    return written;
  }

  specifiers(node: F.Node): string {
    return nodes(node.helpers.get("specifiers")).map((s) => this.text(s)).join(" ");
  }

  typeId(node: F.Node): string {
    return declaredText(this.specifiers(node), this.declarator(one(node.helpers.get("declarator"))), true);
  }

  parameter(node: F.Node): string {
    if (node.kind === "ellipsisparameter") return "...";
    const attributes = nodes(node.helpers.get("attributes"));
    let written = (attributes.length > 0 ? attributes.map((a) => this.text(a)).join(" ") + " " : "")
      + (node.attributes.get("this_keyword") ? "this " : "");
    const declarator = one(node.helpers.get("declarator"));
    written += declaredText(this.specifiers(node), this.declarator(declarator), abstract(declarator));
    const value = node.slots.get("default") ?? null;
    return written + (value !== null ? ` = ${this.expression(value, ASSIGNMENT)}` : "");
  }

  templateParameter(node: F.Node): string {
    const attributes = node.attributes;
    let written: string;
    if (node.kind === "typeparameter") {
      written = node.helpers.has("constraint") ? this.text(one(node.helpers.get("constraint")) as F.Node) : attributes.get("key") ?? "typename";
    } else {
      written = "template <" + nodes(node.helpers.get("parameters")).map((p) => this.text(p)).join(", ") + ">";
      if (node.slots.get("requires") !== null) written += " requires " + this.constraint(node.slots.get("requires"));
      written += " " + attributes.get("key");
    }
    written += attributes.get("pack") ? "..." : "";
    if (node.helpers.has("name")) written += " " + this.name(node, "name");
    return written + (node.helpers.has("default") ? " = " + this.text(one(node.helpers.get("default")) as F.Node) : "");
  }

  exception(node: F.Node): string {
    if (node.kind === "noexceptspecifier") {
      const condition = node.slots.get("condition");
      return "noexcept" + (condition !== null ? `(${this.expression(condition, COMMA)})` : "");
    }
    return "throw(" + this.list(node.many) + ")";
  }

  // Attributes

  attributeSpecifier(node: F.Node): string {
    const { kind, attributes } = node;
    const held = nodes(node.helpers.get("attributes"));
    if (kind === "standardattributespecifier") {
      const using = attributes.has("using_namespace") ? `using ${attributes.get("using_namespace")}: ` : "";
      return "[[" + using + held.map((a) => this.text(a)).join(", ") + "]]";
    }
    if (kind === "alignasspecifier") {
      const operand = this.keywordCall(attributes.get("keyword"), node.slots.get("operand"));
      return attributes.get("pack") ? operand.slice(0, -1) + "...)" : operand;
    }
    if (kind === "gnuattributespecifier") return attributes.get("keyword") + "((" + held.map((a) => this.text(a)).join(", ") + "))";
    return "__declspec(" + held.map((a) => this.text(a)).join(" ") + ")";
  }

  attribute(node: F.Node): string {
    const attributes = node.attributes;
    let written = (attributes.has("namespace") ? `${attributes.get("namespace")}::` : "") + attributes.get("name");
    if (node.many.length > 0) written += "(" + this.list(node.many) + ")";
    return written + (attributes.get("pack") ? "..." : "");
  }
}

const TEXTS: Readonly<Record<string, Text>> = {
  error: (p, n) => F.invalidText(p.dialect, n.kind, n.attributes), missing: (p, n) => F.invalidText(p.dialect, n.kind, n.attributes),
  literal: (p, n) => p.literal(n),
  constant: (p, n) => n.attributes.get("text") ?? "nullptr",
  userdefinedliteral: (p, n) => p.literal(one(n.helpers.get("literal")) as F.Node) + n.attributes.get("suffix"),
  concatenatedstring: (p, n) => n.many.map((part) => p.expression(part, PRIMARY)).join(" "),
  variable: (p, n) => n.attributes.get("name"),
  idexpression: (p, n) => p.text(one(n.helpers.get("name")) as F.Node),
  thisexpression: () => "this",
  parenthesizedexpression: (p, n) => `(${p.expression(n.slots.get("expression"), COMMA)})`,
  lambdaexpression: (p, n) => p.lambda(n), lambdadeclarator: (p, n) => p.lambdaDeclarator(n),
  defaultcapture: (p, n) => p.capture(n), simplecapture: (p, n) => p.capture(n), thiscapture: (p, n) => p.capture(n),
  initcapture: (p, n) => p.capture(n),
  foldexpression: (p, n) => p.fold(n), requiresexpression: (p, n) => p.requires(n),
  simplerequirement: (p, n) => p.requirement(n), typerequirement: (p, n) => p.requirement(n),
  compoundrequirement: (p, n) => p.requirement(n), nestedrequirement: (p, n) => p.requirement(n),
  genericselection: (p, n) => p.generic(n), subscriptexpression: (p, n) => p.subscript(n), callexpression: (p, n) => p.call(n),
  functionalcastexpression: (p, n) => p.text(one(n.helpers.get("type")) as F.Node) + p.initializer(one(n.helpers.get("initializer")) as F.Node),
  memberexpression: (p, n) => p.member(n), postfixexpression: (p, n) => p.postfix(n),
  namedcastexpression: (p, n) => `${n.attributes.get("operator")}<${p.text(one(n.helpers.get("type")) as F.Node)}>`
    + `(${p.expression(n.slots.get("operand"), COMMA)})`,
  typeidexpression: (p, n) => p.keywordCall("typeid", n.slots.get("operand")),
  unaryexpression: (p, n) => p.unary(n),
  awaitexpression: (p, n) => "co_await " + p.expression(n.slots.get("operand"), UNARY),
  sizeofexpression: (p, n) => p.sizeof(n),
  sizeofpackexpression: (p, n) => `sizeof...(${p.name(n, "pack")})`,
  alignofexpression: (p, n) => p.keywordCall(n.attributes.get("keyword"), n.slots.get("operand")),
  noexceptexpression: (p, n) => p.keywordCall("noexcept", n.slots.get("operand")),
  newexpression: (p, n) => p.newText(n), deleteexpression: (p, n) => p.deleteText(n), castexpression: (p, n) => p.cast(n),
  binaryexpression: (p, n) => p.binary(n), conditionalexpression: (p, n) => p.conditional(n),
  assignmentexpression: (p, n) => p.assignment(n),
  throwexpression: (p, n) => "throw" + (n.slots.get("operand") !== null ? " " + p.expression(n.slots.get("operand"), ASSIGNMENT) : ""),
  yieldexpression: (p, n) => "co_yield " + p.expression(n.slots.get("operand"), ASSIGNMENT),
  packexpansion: (p, n) => p.packExpansion(n), initializerlist: (p, n) => p.initializerList(n),
  designatedinitializer: (p, n) => p.designated(n), fielddesignator: (p, n) => p.designator(n),
  indexdesignator: (p, n) => p.designator(n),
  compoundliteralexpression: (p, n) => `(${p.text(one(n.helpers.get("type")) as F.Node)})`
    + (n.helpers.has("initializer") ? p.initializerList(one(n.helpers.get("initializer")) as F.Node) : "{}"),
  statementexpression: () => "({})", // its body of statements, not part of the term
  extensionexpression: (p, n) => "__extension__ " + p.expression(n.slots.get("operand"), UNARY),
  typeid: (p, n) => p.typeId(n),
  identifier: (p, n) => p.nameText(n), operatorname: (p, n) => p.nameText(n), conversionname: (p, n) => p.nameText(n),
  literaloperatorname: (p, n) => p.nameText(n), destructorname: (p, n) => p.nameText(n), templateid: (p, n) => p.nameText(n),
  qualifiedname: (p, n) => p.nameText(n),
  declspecifier: (p, n) => n.attributes.get("keyword"), cvqualifier: (p, n) => n.attributes.get("keyword"),
  primitivetypespecifier: (p, n) => n.attributes.get("keyword"),
  namedtypespecifier: (p, n) => p.specifier(n), typenamespecifier: (p, n) => p.specifier(n),
  decltypespecifier: (p, n) => p.specifier(n), placeholdertypespecifier: (p, n) => p.specifier(n),
  typeofspecifier: (p, n) => p.specifier(n), atomictypespecifier: (p, n) => p.specifier(n),
  bitintspecifier: (p, n) => p.specifier(n), classspecifier: (p, n) => p.classText(n), basespecifier: (p, n) => p.base(n),
  enumspecifier: (p, n) => p.enumText(n),
  iddeclarator: (p, n) => p.declarator(n), packdeclarator: (p, n) => p.declarator(n),
  pointerdeclarator: (p, n) => p.declarator(n), referencedeclarator: (p, n) => p.declarator(n),
  arraydeclarator: (p, n) => p.declarator(n), functiondeclarator: (p, n) => p.declarator(n),
  parenthesizeddeclarator: (p, n) => p.declarator(n),
  parameterdeclaration: (p, n) => p.parameter(n), ellipsisparameter: (p, n) => p.parameter(n),
  typeparameter: (p, n) => p.templateParameter(n), templatetemplateparameter: (p, n) => p.templateParameter(n),
  noexceptspecifier: (p, n) => p.exception(n), throwspecifier: (p, n) => p.exception(n),
  standardattributespecifier: (p, n) => p.attributeSpecifier(n), alignasspecifier: (p, n) => p.attributeSpecifier(n),
  gnuattributespecifier: (p, n) => p.attributeSpecifier(n), declspecspecifier: (p, n) => p.attributeSpecifier(n),
  attribute: (p, n) => p.attribute(n),
  equalinitializer: (p, n) => p.initializer(n), parenthesizedinitializer: (p, n) => p.initializer(n),
};

/** The expression as C source, parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  return text(expression, E.DIALECT);
}

/** A term of `dialect`, a dialect of the C family, as its source, parenthesized only where precedence requires. */
export function text(expression: unknown, dialect: F.Dialect): string {
  const printer = new Printer(dialect);
  return printer.text(printer.node(F.term(expression)));
}
