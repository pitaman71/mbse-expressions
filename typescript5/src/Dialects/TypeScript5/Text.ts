/** Text of the TypeScript5 dialect: `ToText(expression)` is a term of TypeScript5 (or anything `Terms.term` reads one
 * from) as TypeScript source, as mbse-programs' printer writes it (`mbse:mbse-programs/typescript5/src/TypeScript/_Printer.ts`):
 * its types, patterns and JSX within it, parentheses written in the term printed, and those its precedence needs added
 * (for an expression, also where `??` meets `||` or `&&`, where an arrow's body is an object, around a `new`'s callee
 * that calls, and around a number's member access; for a type, where a function, conditional or union type is an
 * operand). It is written as an expression statement holds it: parenthesized where it would start with `{`,
 * `function`, `class` or `let [`. A literal is written in its spelling where it has one (`text`), else in its value's
 * default spelling: a number as JavaScript's `String(number)` writes it, a bigint with its `n`, a string in its quote (a
 * double quote by default) with its escapes. Invalid syntax is written as written (`Terms.invalidText`). A body of
 * statements, not part of the term, is written `{}`, where mbse-programs writes the statements it relates. An arrow's
 * lone type parameter without a constraint is written `<T,>`, so that the text reads alike in a `.ts` and a `.tsx`
 * file. Reading TypeScript (`FromText`) is mbse-programs' (the dialects proposal, Decided, 6). */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as T from "./Expressions.js";

const { ValueError } = Errors;

// Expressions' precedence, loosest first: an operand is parenthesized when its precedence is below what its place
// needs. `new` is written with its arguments, so it binds as a member does.
const SEQUENCE = 0, ASSIGN = 1, CONDITIONAL = 2, COALESCE = 3, OR = 4, AND = 5, BOR = 6, BXOR = 7, BAND = 8,
  EQUALITY = 9, RELATIONAL = 10, SHIFT = 11, ADD = 12, MULTIPLY = 13, POWER = 14, UNARY = 15, POSTFIX = 16, NEW = 17,
  MEMBER = 18, PRIMARY = 19;
const BINARY: Record<string, number> = {
  "==": EQUALITY, "!=": EQUALITY, "===": EQUALITY, "!==": EQUALITY, "<": RELATIONAL, "<=": RELATIONAL,
  ">": RELATIONAL, ">=": RELATIONAL, in: RELATIONAL, instanceof: RELATIONAL, "<<": SHIFT, ">>": SHIFT, ">>>": SHIFT,
  "+": ADD, "-": ADD, "*": MULTIPLY, "/": MULTIPLY, "%": MULTIPLY, "**": POWER, "|": BOR, "^": BXOR, "&": BAND,
  "&&": AND, "||": OR, "??": COALESCE,
};
const PRECEDENCE: Record<string, number> = {
  [T.SEQUENCEEXPRESSION]: SEQUENCE, [T.ASSIGNMENTEXPRESSION]: ASSIGN, [T.ARROWFUNCTIONEXPRESSION]: ASSIGN,
  [T.YIELDEXPRESSION]: ASSIGN, [T.CONDITIONALEXPRESSION]: CONDITIONAL, [T.TSASEXPRESSION]: RELATIONAL,
  [T.TSSATISFIESEXPRESSION]: RELATIONAL, [T.UNARYEXPRESSION]: UNARY, [T.AWAITEXPRESSION]: UNARY,
  [T.TSTYPEASSERTION]: UNARY, [T.UPDATEEXPRESSION]: POSTFIX, [T.TSNONNULLEXPRESSION]: MEMBER, [T.NEWEXPRESSION]: MEMBER,
  [T.CALLEXPRESSION]: MEMBER, [T.MEMBEREXPRESSION]: MEMBER, [T.CHAINEXPRESSION]: MEMBER,
  [T.TAGGEDTEMPLATEEXPRESSION]: MEMBER, [T.TSINSTANTIATIONEXPRESSION]: MEMBER, [T.IMPORTEXPRESSION]: MEMBER,
};

// Types' precedence, loosest first.
const T_FUNCTION = 0, T_CONDITIONAL = 1, T_UNION = 2, T_INTERSECTION = 3, T_OPERATOR = 4, T_POSTFIX = 5, T_PRIMARY = 6;
const TYPE_PRECEDENCE: Record<string, number> = {
  tsfunctiontype: T_FUNCTION, tsconstructortype: T_FUNCTION, tsconditionaltype: T_CONDITIONAL, tsuniontype: T_UNION,
  tsintersectiontype: T_INTERSECTION, tstypeoperator: T_OPERATOR, tsinfertype: T_OPERATOR, tsarraytype: T_POSTFIX,
  tsindexedaccesstype: T_POSTFIX, tstypepredicate: T_FUNCTION,
};

/** The kinds written as one word, or as nothing. */
const KEYWORDS: Record<string, string> = {
  tsanykeyword: "any", tsunknownkeyword: "unknown", tsnumberkeyword: "number", tsbigintkeyword: "bigint",
  tsbooleankeyword: "boolean", tsstringkeyword: "string", tssymbolkeyword: "symbol", tsobjectkeyword: "object",
  tsneverkeyword: "never", tsvoidkeyword: "void", tsundefinedkeyword: "undefined", tsnullkeyword: "null",
  tsintrinsickeyword: "intrinsic", tsthistype: "this", [T.THISEXPRESSION]: "this", [T.SUPER]: "super", [T.ELISION]: "",
  [T.JSXEMPTYEXPRESSION]: "",
};

const ESCAPES: Record<string, string> = {
  "\\": "\\\\", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\v": "\\v",
};

/** A number as JavaScript's `String(number)` writes it: the shortest digits that read back as it, in fixed notation from
 * 1e-6 to below 1e21, else with an exponent; `NaN`, `Infinity`, and -0 as `0`. */
export function number(value: number): string {
  return String(value);
}

/** A string in `quote`, with its escapes: a backslash, the quote, the C0 controls and DEL, and the line and paragraph
 * separators. */
export function string(value: string, quote: string): string {
  const written: string[] = [];
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (character in ESCAPES) written.push(ESCAPES[character]!);
    else if (character === quote) written.push("\\" + quote);
    else if (code < 0x20 || code === 0x7f) written.push(`\\x${code.toString(16).padStart(2, "0")}`);
    else if (code === 0x2028 || code === 0x2029) written.push(`\\u${code.toString(16)}`);
    else written.push(character);
  }
  return quote + written.join("") + quote;
}

/** A literal's default spelling, of its value. */
function literal(attributes: ReadonlyMap<string, any>): string {
  const value = attributes.get("value");
  switch (typeof value) {
    case "boolean": return value ? "true" : "false";
    case "bigint": return `${value}n`;
    case "number": return number(value);
    default: return string(value, attributes.get("quote") ?? "\"");
  }
}

/** A helper property's nodes, a container's: none where it is absent. */
function nodes(value: T.Node | readonly T.Node[] | undefined): readonly T.Node[] {
  return (value ?? []) as readonly T.Node[];
}

function one(node: T.Node, name: string): T.Node {
  return node.helpers.get(name) as T.Node;
}

/** Writes a term's source: its kind as TypeScript writes it, its helpers (its types, patterns and JSX among them) from
 * its `Node`. */
class Printer {
  /** A term's `Node`, or a `Node` as it is. */
  node(value: any): T.Node {
    return value instanceof T.Node ? value : T.tree(value);
  }

  precedence(node: T.Node): number {
    const { kind, attributes } = node;
    if (kind === T.BINARYEXPRESSION || kind === T.LOGICALEXPRESSION) {
      const operator = attributes.get("operator");
      if (!Object.hasOwn(BINARY, operator)) {
        throw new ValueError(`TypeScript5 ${kind} has no operator ${Repr.repr(operator)}`);
      }
      return BINARY[operator]!;
    }
    if (kind === T.UPDATEEXPRESSION && attributes.get("prefix")) return UNARY;
    if (kind === T.LITERAL || kind === T.CONSTANT) return this.text(node).startsWith("-") ? UNARY : PRIMARY;
    return PRECEDENCE[kind] ?? PRIMARY;
  }

  /** An expression's text, parenthesized if it binds less than its place needs. */
  e(value: any, needed: number): string {
    const node = this.node(value);
    const text = this.text(node);
    return this.precedence(node) < needed ? `(${text})` : text;
  }

  /** A type's text, parenthesized if it binds less than its place needs. */
  t(value: T.Node, needed: number): string {
    const text = this.text(value);
    return (TYPE_PRECEDENCE[value.kind] ?? T_PRIMARY) < needed ? `(${text})` : text;
  }

  text(value: any): string {
    const node = this.node(value);
    const kind = node.kind;
    if (Object.hasOwn(KEYWORDS, kind)) return KEYWORDS[kind]!;
    if (kind === "error" || kind === "missing") return F.invalidText(T.DIALECT, kind, node.attributes);
    return (this as any)[`_${kind}`](node);
  }

  // Names and literals

  decorators(node: T.Node): string {
    return node.many.map((expression) => `@${this.e(expression, MEMBER)} `).join("");
  }

  annotation(node: T.Node): string {
    const held = node.helpers.get("typeAnnotation") as T.Node | undefined;
    return held === undefined ? "" : ": " + this.t(one(held, "typeAnnotation"), T_FUNCTION);
  }

  _identifier(node: T.Node): string {
    const optional = node.attributes.get("optional") ? "?" : "";
    return this.decorators(node) + (node.attributes.get("name") ?? "") + optional + this.annotation(node);
  }

  _privateidentifier(node: T.Node): string {
    return "#" + node.attributes.get("name");
  }

  _literal(node: T.Node): string {
    return node.attributes.has("text") ? node.attributes.get("text") : literal(node.attributes);
  }

  _constant(node: T.Node): string {
    const { attributes } = node;
    if (attributes.has("text")) return attributes.get("text");
    if (attributes.has("singleton")) return attributes.get("singleton");
    return `/${attributes.get("pattern")}/${attributes.get("flags") ?? ""}`;
  }

  _templateliteral(node: T.Node): string {
    const quasis = nodes(node.helpers.get("quasis"));
    const written = quasis.length > 0 ? [quasis[0]!.attributes.get("raw") ?? ""] : [];
    node.many.slice(0, Math.max(quasis.length - 1, 0)).forEach((expression, i) => {
      written.push("${" + this.e(expression, SEQUENCE) + "}" + (quasis[i + 1]!.attributes.get("raw") ?? ""));
    });
    return "`" + written.join("") + "`";
  }

  typeArguments(node: T.Node, name = "typeArguments"): string {
    const held = node.helpers.get(name) as T.Node | undefined;
    return held === undefined ? "" : this.text(held);
  }

  _taggedtemplateexpression(node: T.Node): string {
    return this.e(node.slots.get("tag"), MEMBER) + this.typeArguments(node) + this.text(one(node, "quasi"));
  }

  _parenthesizedexpression(node: T.Node): string {
    return `(${this.e(node.slots.get("expression"), SEQUENCE)})`;
  }

  _spreadelement(node: T.Node): string {
    return "..." + this.e(node.slots.get("argument"), ASSIGN);
  }

  // Displays

  /** An array's or an array pattern's elements, a hole as nothing, a last hole kept: `[a, , b, ,]`. */
  elements(elements: readonly any[]): string {
    const held = elements.map((element) => this.node(element));
    const texts = held.map((node) => (node.kind === T.ELISION ? "" : this.e(node, ASSIGN)));
    if (held.length > 0 && held[held.length - 1]!.kind === T.ELISION) texts.push("");
    return "[" + texts.map((text, i) => (i > 0 && text ? " " : "") + text).join(",") + "]";
  }

  _arrayexpression(node: T.Node): string {
    return this.elements(node.many);
  }

  key(key: any, computed: boolean): string {
    return computed ? `[${this.e(key, ASSIGN)}]` : this.text(key);
  }

  _property(node: T.Node): string {
    const { attributes } = node;
    const key = this.key(node.slots.get("key"), attributes.get("computed") ?? false);
    const value = this.node(node.slots.get("value"));
    if (attributes.get("shorthand")) {
      if (value.kind === T.ASSIGNMENTPATTERN) {
        return `${this.text(one(value, "left"))} = ${this.e(value.slots.get("right"), ASSIGN)}`;
      }
      return key;
    }
    const accessor = ["get", "set"].includes(attributes.get("propertyKind"));
    if (accessor || attributes.get("method")) {
      let prefix = accessor ? attributes.get("propertyKind") + " " : "";
      prefix += (value.attributes.get("isAsync") ? "async " : "") + (value.attributes.get("generator") ? "*" : "");
      if (value.kind === T.TSEMPTYBODYFUNCTIONEXPRESSION) return `${prefix}${key}${this.signature(value)}`;
      return `${prefix}${key}${attributes.get("optional") ? "?" : ""}${this.signature(value)} {}`;
    }
    return `${key}: ${this.e(value, ASSIGN)}`;
  }

  _objectexpression(node: T.Node): string {
    if (node.many.length === 0) return "{}";
    return "{ " + node.many.map((member) => this.text(member)).join(", ") + " }";
  }

  // Functions and classes: a body of statements is not the term's, and is written `{}`

  /** `<typeParameters>(params): returnType`, or with `arrow` `... => returnType` for a function type. */
  signature(node: T.Node, arrow = false): string {
    const parameters = this.typeArguments(node, "typeParameters");
    const params = nodes(node.helpers.get("params")).map((parameter) => this.text(parameter)).join(", ");
    const returned = node.helpers.get("returnType") as T.Node | undefined;
    const returns = returned === undefined ? "" : (arrow ? " => " : ": ") + this.t(one(returned, "typeAnnotation"), T_FUNCTION);
    return `${parameters}(${params})${returns}`;
  }

  _functionexpression(node: T.Node): string {
    const { attributes } = node;
    const keyword = (attributes.get("isAsync") ? "async " : "") + "function" + (attributes.get("generator") ? "*" : "");
    const name = node.helpers.has("id") ? " " + this.text(one(node, "id")) : "";
    return `${keyword}${name}${this.signature(node)} {}`;
  }

  _tsemptybodyfunctionexpression(node: T.Node): string {
    const { attributes } = node;
    return (attributes.get("isAsync") ? "async " : "") + (attributes.get("generator") ? "*" : "") + this.signature(node);
  }

  _arrowfunctionexpression(node: T.Node): string {
    let head = (node.attributes.get("isAsync") ? "async " : "") + this.signature(node);
    const parameters = node.helpers.get("typeParameters") as T.Node | undefined;
    if (parameters !== undefined) {
      const params = nodes(parameters.helpers.get("params"));
      if (params.length === 1 && !params[0]!.helpers.has("constraint")) { // `<T>(` would open an element in a .tsx file
        const written = this.text(parameters);
        head = head.replace(written, written.slice(0, -1) + ",>");
      }
    }
    const body = node.slots.get("body");
    if (body === null) return head + " => {}";
    let text = this.e(body, ASSIGN);
    if ([T.OBJECTEXPRESSION, T.OBJECTPATTERN].includes(this.leftmost(body).kind)) text = `(${text})`;
    return `${head} => ${text}`;
  }

  heritage(node: T.Node): string {
    return this.e(node.slots.get("expression"), MEMBER) + this.typeArguments(node);
  }

  _classexpression(node: T.Node): string {
    let head = "class";
    if (node.helpers.has("id")) head += " " + this.text(one(node, "id"));
    head += this.typeArguments(node, "typeParameters");
    if (node.slots.get("superClass") !== null) {
      head += ` extends ${this.e(node.slots.get("superClass"), MEMBER)}` + this.typeArguments(node, "superTypeArguments");
    }
    const implemented = nodes(node.helpers.get("implements"));
    if (implemented.length > 0) head += " implements " + implemented.map((heritage) => this.heritage(heritage)).join(", ");
    return this.decorators(node) + head + " {}";
  }

  _metaproperty(node: T.Node): string {
    return `${this.text(one(node, "meta"))}.${this.text(one(node, "property"))}`;
  }

  // Operations

  _memberexpression(node: T.Node): string {
    const { attributes } = node;
    let target = this.e(node.slots.get("object"), MEMBER);
    if (this.node(node.slots.get("object")).kind === T.LITERAL && /^[0-9_]*$/.test(target)) {
      target = `(${target})`; // `1.toString()` would be a number
    }
    if (attributes.get("computed")) {
      return `${target}${attributes.get("optional") ? "?." : ""}[${this.e(node.slots.get("property"), SEQUENCE)}]`;
    }
    return `${target}${attributes.get("optional") ? "?." : "."}${this.text(node.slots.get("property"))}`;
  }

  arguments(args: readonly any[]): string {
    return args.map((argument) => this.e(argument, ASSIGN)).join(", ");
  }

  _callexpression(node: T.Node): string {
    const optional = node.attributes.get("optional") ? "?." : "";
    return `${this.e(node.slots.get("callee"), MEMBER)}${optional}${this.typeArguments(node)}(${this.arguments(node.many)})`;
  }

  _chainexpression(node: T.Node): string {
    return this.text(node.slots.get("expression"));
  }

  /** Whether a `new`'s callee holds a call, a `new` or a non-null assertion outside parentheses, which would end the
   * callee: `new a!.b()` reads as `(new a)!.b()`. */
  calls(value: any): boolean {
    let node = this.node(value);
    while (node.kind === T.MEMBEREXPRESSION) node = this.node(node.slots.get("object"));
    return [T.CALLEXPRESSION, T.CHAINEXPRESSION, T.IMPORTEXPRESSION, T.TSNONNULLEXPRESSION, T.NEWEXPRESSION].includes(node.kind);
  }

  _newexpression(node: T.Node): string {
    let callee = this.e(node.slots.get("callee"), NEW);
    if (this.calls(node.slots.get("callee"))) callee = `(${callee})`; // `new f()()` would call `f`'s instance
    return `new ${callee}${this.typeArguments(node)}(${this.arguments(node.many)})`;
  }

  _importexpression(node: T.Node): string {
    const options = node.slots.get("options");
    const held = [node.slots.get("source"), ...(options === null ? [] : [options])];
    return "import" + (node.attributes.get("phase") === "defer" ? ".defer" : "") + `(${this.arguments(held)})`;
  }

  _updateexpression(node: T.Node): string {
    const operator = node.attributes.get("operator");
    const argument = node.slots.get("argument");
    if (node.attributes.get("prefix")) return operator + this.e(argument, UNARY);
    return this.e(argument, POSTFIX + 1) + operator;
  }

  _unaryexpression(node: T.Node): string {
    const operator = node.attributes.get("operator");
    const argument = this.e(node.slots.get("argument"), UNARY);
    if (["typeof", "void", "delete"].includes(operator) || (["+", "-"].includes(operator) && argument.startsWith(operator))) {
      return `${operator} ${argument}`; // `--a` and `++a` would be updates
    }
    return operator + argument;
  }

  _awaitexpression(node: T.Node): string {
    return "await " + this.e(node.slots.get("argument"), UNARY);
  }

  _binaryexpression(node: T.Node): string {
    const operator = node.attributes.get("operator");
    const level = this.precedence(node);
    const leftNode = this.node(node.slots.get("left"));
    const rightNode = this.node(node.slots.get("right"));
    if (operator === "**") {
      let left = this.e(leftNode, POWER + 1);
      if ([T.UNARYEXPRESSION, T.AWAITEXPRESSION, T.TSTYPEASSERTION].includes(leftNode.kind)
        || ([T.LITERAL, T.CONSTANT].includes(leftNode.kind) && left.startsWith("-"))) {
        left = `(${this.text(leftNode)})`; // `-a ** b` is not JavaScript, nor a negative value's `-1 ** b`
      }
      return `${left} ** ${this.e(rightNode, POWER)}`;
    }
    let left = this.e(leftNode, level);
    let right = this.e(rightNode, level + 1);
    if (node.kind === T.LOGICALEXPRESSION) { // `??` does not mix with `||` and `&&` without parentheses
      if (leftNode.kind === T.LOGICALEXPRESSION && (leftNode.attributes.get("operator") === "??") !== (operator === "??")) {
        left = `(${this.text(leftNode)})`;
      }
      if (rightNode.kind === T.LOGICALEXPRESSION && (rightNode.attributes.get("operator") === "??") !== (operator === "??")) {
        right = `(${this.text(rightNode)})`;
      }
    }
    if (leftNode.kind === T.PRIVATEIDENTIFIER) left = this.text(leftNode);
    return `${left} ${operator} ${right}`;
  }

  _logicalexpression(node: T.Node): string {
    return this._binaryexpression(node);
  }

  _conditionalexpression(node: T.Node): string {
    const { slots } = node;
    return `${this.e(slots.get("test"), COALESCE)} ? ${this.e(slots.get("consequent"), ASSIGN)} : `
      + this.e(slots.get("alternate"), ASSIGN);
  }

  _assignmentexpression(node: T.Node): string {
    const target = one(node, "left");
    const left = [T.OBJECTPATTERN, T.ARRAYPATTERN].includes(target.kind) ? this.text(target) : this.e(target, MEMBER);
    return `${left} ${node.attributes.get("operator")} ${this.e(node.slots.get("right"), ASSIGN)}`;
  }

  _sequenceexpression(node: T.Node): string {
    return node.many.map((expression) => this.e(expression, ASSIGN)).join(", ");
  }

  _yieldexpression(node: T.Node): string {
    const argument = node.slots.get("argument");
    return (node.attributes.get("delegate") ? "yield*" : "yield") + (argument === null ? "" : " " + this.e(argument, ASSIGN));
  }

  _tsasexpression(node: T.Node): string {
    return `${this.e(node.slots.get("expression"), RELATIONAL)} as ${this.t(one(node, "typeAnnotation"), 0)}`;
  }

  _tssatisfiesexpression(node: T.Node): string {
    return `${this.e(node.slots.get("expression"), RELATIONAL)} satisfies ${this.t(one(node, "typeAnnotation"), 0)}`;
  }

  _tstypeassertion(node: T.Node): string {
    return `<${this.t(one(node, "typeAnnotation"), 0)}>${this.e(node.slots.get("expression"), UNARY)}`;
  }

  _tsnonnullexpression(node: T.Node): string {
    return this.e(node.slots.get("expression"), MEMBER) + "!";
  }

  _tsinstantiationexpression(node: T.Node): string {
    return this.e(node.slots.get("expression"), MEMBER) + this.typeArguments(node);
  }

  /** The expression a statement made of `value` starts with. */
  leftmost(value: any): T.Node {
    let node = this.node(value);
    for (;;) {
      const { kind, slots } = node;
      if (kind === T.BINARYEXPRESSION || kind === T.LOGICALEXPRESSION) node = this.node(slots.get("left"));
      else if (kind === T.ASSIGNMENTEXPRESSION) node = one(node, "left");
      else if (kind === T.MEMBEREXPRESSION) node = this.node(slots.get("object"));
      else if (kind === T.CALLEXPRESSION || kind === T.TAGGEDTEMPLATEEXPRESSION) {
        node = this.node(slots.get(kind === T.CALLEXPRESSION ? "callee" : "tag"));
      } else if (kind === T.CONDITIONALEXPRESSION) node = this.node(slots.get("test"));
      else if (kind === T.SEQUENCEEXPRESSION) node = this.node(node.many[0]);
      else if ([T.TSASEXPRESSION, T.TSSATISFIESEXPRESSION, T.TSNONNULLEXPRESSION, T.CHAINEXPRESSION,
        T.TSINSTANTIATIONEXPRESSION].includes(kind)) node = this.node(slots.get("expression"));
      else if (kind === T.UPDATEEXPRESSION && !node.attributes.get("prefix")) node = this.node(slots.get("argument"));
      else return node;
    }
  }

  // Patterns and parameters

  pattern(node: T.Node, inner: string): string {
    return this.decorators(node) + inner + (node.attributes.get("optional") ? "?" : "") + this.annotation(node);
  }

  _arraypattern(node: T.Node): string {
    return this.pattern(node, this.elements(nodes(node.helpers.get("elements"))));
  }

  _objectpattern(node: T.Node): string {
    const properties = nodes(node.helpers.get("properties"));
    const inner = properties.length === 0 ? "{}" : "{ " + properties.map((p) => this.text(p)).join(", ") + " }";
    return this.pattern(node, inner);
  }

  _assignmentpattern(node: T.Node): string {
    return this.pattern(node, `${this.text(one(node, "left"))} = ${this.e(node.slots.get("right"), ASSIGN)}`);
  }

  _restelement(node: T.Node): string {
    return this.pattern(node, "..." + this.text(one(node, "argument")));
  }

  /** A parameter property's or a signature's modifiers, in the order TypeScript requires. */
  modifiers(node: T.Node): string {
    const { attributes } = node;
    const words = attributes.get("accessibility") ? [attributes.get("accessibility")] : [];
    words.push(...["static", "override", "readonly"].filter((word) => attributes.get(word)));
    return words.map((word) => word + " ").join("");
  }

  _tsparameterproperty(node: T.Node): string {
    return this.decorators(node) + this.modifiers(node) + this.text(one(node, "parameter"));
  }

  // Types

  _tstypeparameter(node: T.Node): string {
    const { attributes, helpers } = node;
    let text = [["const", "const"], ["in", "isIn"], ["out", "isOut"]].filter(([, flag]) => attributes.get(flag!))
      .map(([word]) => word + " ").join("");
    text += this.text(one(node, "name"));
    if (helpers.has("constraint")) text += ` extends ${this.t(one(node, "constraint"), T_FUNCTION)}`;
    if (helpers.has("default")) text += ` = ${this.t(one(node, "default"), T_FUNCTION)}`;
    return text;
  }

  _tstypeparameterdeclaration(node: T.Node): string {
    return "<" + nodes(node.helpers.get("params")).map((p) => this.text(p)).join(", ") + ">";
  }

  _tstypeparameterinstantiation(node: T.Node): string {
    return "<" + nodes(node.helpers.get("params")).map((p) => this.t(p, T_FUNCTION)).join(", ") + ">";
  }

  _tsqualifiedname(node: T.Node): string {
    return `${this.text(one(node, "left"))}.${this.text(one(node, "right"))}`;
  }

  _tstypereference(node: T.Node): string {
    return this.text(one(node, "typeName")) + this.typeArguments(node);
  }

  _tsparenthesizedtype(node: T.Node): string {
    return `(${this.t(one(node, "typeAnnotation"), T_FUNCTION)})`;
  }

  _tsliteraltype(node: T.Node): string {
    return this.text(one(node, "literal"));
  }

  _tstemplateliteraltype(node: T.Node): string {
    const quasis = nodes(node.helpers.get("quasis"));
    const types = nodes(node.helpers.get("types"));
    const written = quasis.length > 0 ? [quasis[0]!.attributes.get("raw") ?? ""] : [];
    types.slice(0, Math.max(quasis.length - 1, 0)).forEach((held, i) => {
      written.push("${" + this.t(held, T_FUNCTION) + "}" + (quasis[i + 1]!.attributes.get("raw") ?? ""));
    });
    return "`" + written.join("") + "`";
  }

  _tsarraytype(node: T.Node): string {
    return this.t(one(node, "elementType"), T_POSTFIX) + "[]";
  }

  _tstupletype(node: T.Node): string {
    return "[" + nodes(node.helpers.get("elementTypes")).map((held) => this.t(held, T_FUNCTION)).join(", ") + "]";
  }

  _tsnamedtuplemember(node: T.Node): string {
    const optional = node.attributes.get("optional") ? "?" : "";
    return `${this.text(one(node, "label"))}${optional}: ${this.t(one(node, "elementType"), T_FUNCTION)}`;
  }

  _tsoptionaltype(node: T.Node): string {
    return this.t(one(node, "typeAnnotation"), T_POSTFIX) + "?";
  }

  _tsresttype(node: T.Node): string {
    return "..." + this.t(one(node, "typeAnnotation"), T_FUNCTION);
  }

  _tsuniontype(node: T.Node): string {
    const [operator, level] = node.kind === "tsuniontype" ? [" | ", T_INTERSECTION] : [" & ", T_OPERATOR];
    return nodes(node.helpers.get("types")).map((held) => this.t(held, level)).join(operator);
  }

  _tsintersectiontype(node: T.Node): string {
    return this._tsuniontype(node);
  }

  _tsfunctiontype(node: T.Node): string {
    return this.signature(node, true);
  }

  _tsconstructortype(node: T.Node): string {
    return (node.attributes.get("abstract") ? "abstract " : "") + "new " + this.signature(node, true);
  }

  /** An object type's member on its line: a signature with its `;`, a comment as written. */
  member(node: T.Node): string {
    if (node.kind === "comment") {
      const text = node.attributes.get("text") ?? "";
      return node.attributes.get("block") ? `/*${text}*/` : `//${text}`;
    }
    return this.text(node) + ";";
  }

  /** `{ a: A; b(): B }` on one line, or with comments its members' lines, a trailing comment on its member's. */
  _tstypeliteral(node: T.Node): string {
    const members = nodes(node.helpers.get("members"));
    if (members.length === 0) return "{}";
    if (members.every((member) => member.kind !== "comment")) {
      return "{ " + members.map((member) => this.member(member)).join(" ") + " }";
    }
    const lines: string[] = [];
    for (const member of members) {
      if (member.kind === "comment" && member.attributes.get("trailing") && lines.length > 0) {
        lines[lines.length - 1] += " " + this.member(member);
      } else {
        lines.push("    " + this.member(member));
      }
    }
    return "{\n" + lines.join("\n") + "\n}";
  }

  _tspropertysignature(node: T.Node): string {
    const { attributes } = node;
    const text = (attributes.get("readonly") ? "readonly " : "") + this.key(node.slots.get("key"), attributes.get("computed") ?? false);
    return text + (attributes.get("optional") ? "?" : "") + this.annotation(node);
  }

  _tsmethodsignature(node: T.Node): string {
    const { attributes } = node;
    const prefix = ["get", "set"].includes(attributes.get("methodKind")) ? attributes.get("methodKind") + " " : "";
    const key = this.key(node.slots.get("key"), attributes.get("computed") ?? false);
    return `${prefix}${key}${attributes.get("optional") ? "?" : ""}${this.signature(node)}`;
  }

  _tscallsignaturedeclaration(node: T.Node): string {
    return this.signature(node);
  }

  _tsconstructsignaturedeclaration(node: T.Node): string {
    return "new " + this.signature(node);
  }

  _tsindexsignature(node: T.Node): string {
    const parameters = nodes(node.helpers.get("parameters")).map((p) => this.text(p)).join(", ");
    return `${this.modifiers(node)}[${parameters}]${this.annotation(node)}`;
  }

  _tsmappedtype(node: T.Node): string {
    const { attributes, helpers } = node;
    const readonly = attributes.has("readonly") ? attributes.get("readonly") + " " : "";
    const name = helpers.has("nameType") ? ` as ${this.t(one(node, "nameType"), T_FUNCTION)}` : "";
    const value = helpers.has("typeAnnotation") ? `: ${this.t(one(node, "typeAnnotation"), T_FUNCTION)}` : "";
    const constraint = this.t(one(node, "constraint"), T_FUNCTION);
    return `{ ${readonly}[${this.text(one(node, "key"))} in ${constraint}${name}]${attributes.get("optional") ?? ""}${value} }`;
  }

  _tsindexedaccesstype(node: T.Node): string {
    return `${this.t(one(node, "objectType"), T_POSTFIX)}[${this.t(one(node, "indexType"), T_FUNCTION)}]`;
  }

  _tstypeoperator(node: T.Node): string {
    const operator = node.attributes.get("operator");
    if (!node.helpers.has("typeAnnotation")) return operator;
    return `${operator} ${this.t(one(node, "typeAnnotation"), T_OPERATOR)}`;
  }

  _tstypequery(node: T.Node): string {
    return "typeof " + this.text(one(node, "exprName")) + this.typeArguments(node);
  }

  _tsimporttype(node: T.Node): string {
    const { helpers } = node;
    const options = helpers.has("options") ? ", " + this.text(one(node, "options")) : "";
    let text = `import(${this.text(one(node, "source"))}${options})`;
    if (helpers.has("qualifier")) text += "." + this.text(one(node, "qualifier"));
    return text + this.typeArguments(node);
  }

  _tsconditionaltype(node: T.Node): string {
    const extendsType = one(node, "extendsType"); // a function type needs no parentheses, unless it returns a conditional type
    const returned = ["tsfunctiontype", "tsconstructortype"].includes(extendsType.kind)
      ? extendsType.helpers.get("returnType") as T.Node | undefined : undefined;
    const extended = extendsType.kind === "tsconditionaltype"
      || (returned !== undefined && one(returned, "typeAnnotation").kind === "tsconditionaltype")
      ? `(${this.text(extendsType)})` : this.t(extendsType, T_FUNCTION);
    return `${this.t(one(node, "checkType"), T_UNION)} extends ${extended} ? `
      + `${this.t(one(node, "trueType"), T_FUNCTION)} : ${this.t(one(node, "falseType"), T_FUNCTION)}`;
  }

  _tsinfertype(node: T.Node): string {
    return "infer " + this.text(one(node, "typeParameter"));
  }

  _tstypepredicate(node: T.Node): string {
    let text = (node.attributes.get("asserts") ? "asserts " : "") + this.text(one(node, "parameterName"));
    if (node.helpers.has("typeAnnotation")) {
      text += ` is ${this.t(one(one(node, "typeAnnotation"), "typeAnnotation"), T_FUNCTION)}`;
    }
    return text;
  }

  // JSX

  _jsxidentifier(node: T.Node): string {
    return node.attributes.get("name") ?? "";
  }

  _jsxnamespacedname(node: T.Node): string {
    return `${this.text(one(node, "namespace"))}:${this.text(one(node, "name"))}`;
  }

  _jsxmemberexpression(node: T.Node): string {
    return `${this.text(one(node, "object"))}.${this.text(one(node, "property"))}`;
  }

  _jsxexpressioncontainer(node: T.Node): string {
    return "{" + this.text(node.slots.get("expression")) + "}";
  }

  _jsxspreadchild(node: T.Node): string {
    return "{..." + this.text(node.slots.get("expression")) + "}";
  }

  _jsxtext(node: T.Node): string {
    return node.attributes.get("raw") ?? "";
  }

  _jsxattribute(node: T.Node): string {
    const value = node.helpers.get("value") as T.Node | undefined;
    return this.text(one(node, "name")) + (value === undefined ? "" : "=" + this.text(value));
  }

  _jsxspreadattribute(node: T.Node): string {
    return "{..." + this.e(node.slots.get("argument"), ASSIGN) + "}";
  }

  children(node: T.Node): string {
    return nodes(node.helpers.get("children")).map((child) => this.text(child)).join("");
  }

  _jsxelement(node: T.Node): string {
    const opening = one(node, "openingElement");
    const name = this.text(one(opening, "name"));
    const attributes = nodes(opening.helpers.get("attributes")).map((a) => " " + this.text(a)).join("");
    const head = `<${name}${this.typeArguments(opening)}${attributes}`;
    if (opening.attributes.get("selfClosing")) return head + " />";
    const closing = node.helpers.get("closingElement") as T.Node | undefined;
    return `${head}>${this.children(node)}</${closing === undefined ? name : this.text(one(closing, "name"))}>`;
  }

  _jsxfragment(node: T.Node): string {
    return "<>" + this.children(node) + "</>";
  }
}

/** The expression as TypeScript source, as an expression statement holds it. */
export function ToText(expression: unknown): string {
  const printer = new Printer();
  const node = printer.node(F.term(expression));
  let text = printer.e(node, SEQUENCE);
  const start = printer.leftmost(node);
  if ([T.OBJECTEXPRESSION, T.FUNCTIONEXPRESSION, T.CLASSEXPRESSION, T.OBJECTPATTERN].includes(start.kind)
    || (start.kind === T.IDENTIFIER && start.attributes.get("name") === "let" && text.startsWith("let["))) {
    text = `(${text})`;
  }
  return text;
}
