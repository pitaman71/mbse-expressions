/** Text of the SystemVerilog dialect: `ToText(expression)` is a term of the SystemVerilog family (or anything
 * `Terms.term` reads one from) as SystemVerilog source, as mbse-programs' printer writes it
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`): IEEE 1800's precedence (Table 11-2), parentheses
 * written in the term printed and those its precedence needs added, every kind of `Expressions` and the helpers it holds.
 *
 * The family's printer prints a tree that mixes its dialects' terms from any of their holders: each sublanguage's kinds
 * are written by its own package's `Text` module, which `Printer` dispatches to by tag: `Types.Text`, `Patterns.Text`,
 * `Assertions.Text`, `Constraints.Text` and `Preprocessor.Text`, each with its `TEXTS` (a kind's tag to the function that
 * writes it, given the printer and its `Terms.Node`), its `PRECEDENCE` (a kind's tag to its precedence, or to a function
 * of its node and its text giving it, where it is not a primary's) and its `INLINE` (a kind's tag to how `randomize()
 * with` writes it among its constraints, given its text, where it is not as written).
 *
 * A literal is written in its spelling where it has one (`text`), else in its value's default spelling: an unsized
 * integer in its base (`'hff`), a real with a point or an exponent, a time with its unit, a string with its escapes, and
 * a float that has no literal as a division (`1.0 / 0.0`); a constant's vector in its base wherever the base can write
 * its bits (`8'hff`, `4'b10x1`), a fill as `'0`, `null`. Invalid syntax is written as written (`Terms.invalidText`).
 * Reading SystemVerilog (`FromText`) is mbse-programs' (the dialects proposal, Decided, 6). */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as AssertionsText from "../Assertions/Text.js";
import * as ConstraintsText from "../Constraints/Text.js";
import * as PatternsText from "../Patterns/Text.js";
import * as PreprocessorText from "../Preprocessor/Text.js";
import * as Types from "../Types/Expressions.js";
import * as TypesText from "../Types/Text.js";
import * as E from "./Expressions.js";

const { repr } = Repr;
const { ValueError } = Errors;

/** Precedence (IEEE 1800, Table 11-2), as mbse-programs' printer numbers it: higher binds tighter. An operand is
 * parenthesized where its precedence is below what its place needs; an assignment, a min:typ:max, a tagged value, a
 * `matches` and a `&&&` have 0, and the Assertions' sequences and properties bind looser than any expression operator. */
export const [IMPLY, CONDITIONAL, OR, AND, BOR, BXOR, BAND, EQUALITY, RELATIONAL, SHIFT, ADDITIVE, MULTIPLICATIVE, POWER,
  UNARY, PRIMARY] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

/** Each binary operator's precedence. */
export const BINARY: Readonly<Record<string, number>> = {
  "->": IMPLY, "<->": IMPLY, "||": OR, "&&": AND, "|": BOR, "^": BXOR, "^~": BXOR, "~^": BXOR, "&": BAND,
  "==": EQUALITY, "!=": EQUALITY, "===": EQUALITY, "!==": EQUALITY, "==?": EQUALITY, "!=?": EQUALITY,
  "<": RELATIONAL, "<=": RELATIONAL, ">": RELATIONAL, ">=": RELATIONAL, "<<": SHIFT, ">>": SHIFT, "<<<": SHIFT,
  ">>>": SHIFT, "+": ADDITIVE, "-": ADDITIVE, "*": MULTIPLICATIVE, "/": MULTIPLICATIVE, "%": MULTIPLICATIVE,
  "**": POWER,
};

/** The right-associative levels of expressions; the Assertions' add theirs. */
export const RIGHT: ReadonlySet<number> = new Set([IMPLY, CONDITIONAL]);

const ESCAPES: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t" };

/** A number's default spelling: an int in its base (`'hff`, `'sd5`), a real with a point or an exponent, a time with
 * its unit, and a float that has no literal as a division. */
function numberText(value: bigint | number, attributes: ReadonlyMap<string, any>): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return Number.isNaN(value) ? "0.0 / 0.0" : value > 0 ? "1.0 / 0.0" : "-1.0 / 0.0";
    if (attributes.has("unit")) {
      return (Number.isInteger(value) ? BigInt(value).toString() : repr(value)) + attributes.get("unit");
    }
    return repr(value); // with a point or an exponent
  }
  const base = attributes.get("base") ?? null;
  if (base === null) return value.toString();
  const radix = ({ b: 2, o: 8, d: 10, h: 16 } as Record<string, number>)[base] as number;
  return (value < 0n ? "-" : "") + `'${attributes.get("signed") ? "s" : ""}${base}` + (value < 0n ? -value : value).toString(radix);
}

/** A literal's default spelling, of its value and what it encodes. */
function literalText(attributes: ReadonlyMap<string, any>): string {
  const value = attributes.get("value");
  if (typeof value === "string") {
    if (attributes.get("triple")) return '"""' + value + '"""';
    return `"${[...value].map((c) => ESCAPES[c] ?? c).join("")}"`;
  }
  return numberText(value, attributes);
}

function nodes(value: unknown): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

type Text = (p: Printer, n: F.Node) => string;
type Inline = (p: Printer, n: F.Node, written: string) => string;

/** Writes a term of the SystemVerilog family as its source, from its `Node`: its kind as mbse-programs writes it, by the
 * `Text` module of the dialect that defines it. */
export class Printer {
  constructor(readonly texts: ReadonlyMap<string, Text>, private readonly precedences: ReadonlyMap<string, any>,
    private readonly inlines: ReadonlyMap<string, Inline>) {}

  /** A term's `Node`, read through the family's dialects, which refuse another dialect's term. */
  node(value: any): F.Node {
    const [tag, record] = E.DIALECT.kind(value);
    return F.node(tag, record);
  }

  /** A term's source, as its kind writes it; invalid syntax as written, by the dialect that owns it. */
  text(value: any): string {
    const node = this.node(value);
    if (node.kind === "error" || node.kind === "missing") return F.invalidTermText(E.DIALECT, value);
    return (this.texts.get(node.kind) as Text)(this, node);
  }

  /** A node's precedence, by its kind's (`PRECEDENCE`), a primary's where its kind gives none. */
  precedence(node: F.Node, written: string): number {
    const level = this.precedences.get(node.kind) ?? PRIMARY;
    return typeof level === "function" ? level(node, written) : level;
  }

  /** A term where one of at least `level` precedence is needed, parenthesized if it binds less. */
  operand(value: any, level: number): string {
    const [node, written] = [this.node(value), this.text(value)];
    return this.precedence(node, written) < level ? `(${written})` : written;
  }

  /** An identifier's spelling. */
  spelling(node: any): string {
    return node.attributes.get("spelling");
  }

  /** A name: a scoped, local, parameterized or interface's name, `$unit`, or an identifier. */
  name(node: F.Node): string {
    const h = node.helpers;
    if (node.kind === "scopedname") return `${this.name(h.get("scope") as F.Node)}::${this.name(h.get("name") as F.Node)}`;
    if (node.kind === "localname") return `local::${this.spelling(h.get("name"))}`;
    if (node.kind === "unitname") return "$unit";
    if (node.kind === "interfacetypename") return `${this.spelling(h.get("interface"))}.${this.spelling(h.get("name"))}`;
    if (node.kind === "interfacemethodname") return `${this.spelling(h.get("port"))}.${this.spelling(h.get("name"))}`;
    if (node.kind === "parameterizedname") return this.spelling(h.get("name")) + this.parameterValues(node.many);
    return this.spelling(node);
  }

  /** ` #(values)`, or nothing without values. */
  parameterValues(parameters: readonly any[]): string {
    return parameters.length > 0 ? " #(" + parameters.map((p) => this.text(p)).join(", ") + ")" : "";
  }

  /** `(* name = value, ... *) (* ... *)`. */
  attributeText(instances: readonly F.Node[]): string {
    return instances.map((i) => "(* " + nodes(i.helpers.get("specs")).map((s) => this.spelling(s.helpers.get("name"))
      + ((s.subterms.get("value") ?? null) !== null ? ` = ${this.text(s.subterms.get("value"))}` : "")).join(", ") + " *)").join(" ");
  }

  /** Whether a node is a data type, of the Types dialect. */
  isType(node: F.Node): boolean {
    return Types.TAGS.includes(node.kind);
  }

  /** `{ constraints }` on one line, as `randomize() with` writes them: each item as its kind writes it on one line, or as
   * its kind's `INLINE` says (an expression held as a constraint ended by `;`; a line comment, a directive, its line), a
   * space between them but not at a line's end or start, as mbse-programs writes them. */
  inline(items: readonly any[]): string {
    const parts: string[] = [];
    for (const item of items) {
      const [node, written] = [this.node(item), this.text(item)];
      const inline = this.inlines.get(node.kind);
      parts.push(inline !== undefined ? inline(this, node, written) : written);
    }
    let text = "{";
    for (const part of [...parts, "}"]) text += text.endsWith("\n") || part.startsWith("\n") ? part : " " + part;
    return parts.length > 0 ? text : "{}";
  }

  // Expressions

  literal(node: F.Node): string {
    if (node.attributes.has("text")) return node.attributes.get("text");
    if (!node.attributes.has("value")) throw new ValueError("SystemVerilog literal has no value to print");
    return literalText(node.attributes);
  }

  constant(node: F.Node): string {
    return E.constantText(node.attributes);
  }

  unary(node: F.Node): string {
    let operand = this.operand(node.subterms.get("operand"), UNARY + 1);
    if ([E.UNARYEXPRESSION, E.INCREMENTEXPRESSION].includes(this.node(node.subterms.get("operand")).kind)) {
      operand = `(${this.text(node.subterms.get("operand"))})`;
    }
    const attributes = nodes(node.helpers.get("attributes"));
    if (attributes.length > 0) { // `- (* a *) x`: apart, so that `(*` starts the attributes
      return `${node.attributes.get("operator")} ${this.attributeText(attributes)} ${operand}`;
    }
    return `${node.attributes.get("operator")}${operand}`;
  }

  increment(node: F.Node): string {
    const [operand, operator] = [this.operand(node.subterms.get("operand"), PRIMARY), node.attributes.get("operator")];
    const attributes = nodes(node.helpers.get("attributes"));
    if (attributes.length > 0) {
      const written = this.attributeText(attributes);
      return node.attributes.get("postfix") ? `${operand} ${written}${operator}` : `${operator} ${written} ${operand}`;
    }
    return node.attributes.get("postfix") ? `${operand}${operator}` : `${operator}${operand}`;
  }

  binary(node: F.Node): string {
    const operator = node.attributes.get("operator") as string;
    const level = BINARY[operator] as number;
    const [leftLevel, rightLevel] = RIGHT.has(level) ? [level + 1, level] : [level, level + 1];
    const attributes = nodes(node.helpers.get("attributes"));
    const written = attributes.length > 0 ? ` ${this.attributeText(attributes)}` : "";
    return `${this.operand(node.subterms.get("left"), leftLevel)} ${operator}${written} ${this.operand(node.subterms.get("right"), rightLevel)}`;
  }

  assignment(node: F.Node): string {
    return `${this.text(node.subterms.get("target"))} ${node.attributes.get("operator")} ${this.text(node.subterms.get("value"))}`;
  }

  conditional(node: F.Node): string {
    const attributes = nodes(node.helpers.get("attributes"));
    const written = attributes.length > 0 ? `${this.attributeText(attributes)} ` : "";
    const condition = node.subterms.get("condition");
    const matching = [E.MATCHESEXPRESSION, E.PREDICATEEXPRESSION].includes(this.node(condition).kind); // never parenthesized
    const test = matching ? this.text(condition) : this.operand(condition, CONDITIONAL + 1);
    return `${test} ? ${written}${this.operand(node.subterms.get("consequence"), CONDITIONAL + 1)} : `
      + this.operand(node.subterms.get("alternative"), CONDITIONAL);
  }

  tagged(node: F.Node): string {
    const member = this.spelling(node.helpers.get("member"));
    const value = node.subterms.get("value") ?? null;
    if (value === null) return `tagged ${member}`;
    const nested = this.node(value).kind === E.TAGGEDEXPRESSION; // `tagged a tagged b 1` needs no parentheses
    return `tagged ${member} ${nested ? this.text(value) : this.operand(value, UNARY)}`;
  }

  inside(node: F.Node): string {
    const ranges = node.many.map((r) => this.text(r)).join(", ");
    return `${this.operand(node.subterms.get("value"), RELATIONAL + 1)} inside {${ranges}}`;
  }

  valueRange(node: F.Node): string {
    const operator = node.attributes.get("operator") ?? null;
    const between = operator !== null ? ` ${operator} ` : ":";
    return `[${this.text(node.subterms.get("left"))}${between}${this.text(node.subterms.get("right"))}]`;
  }

  replication(node: F.Node): string {
    return `{${this.operand(node.subterms.get("count"), PRIMARY)}{${node.many.map((i) => this.text(i)).join(", ")}}}`;
  }

  assignmentPattern(node: F.Node): string {
    const type = node.subterms.get("type") ?? null;
    const prefix = type !== null ? this.text(type) : "";
    const items = node.many.map((i) => this.text(i)).join(", ");
    const count = node.subterms.get("count") ?? null;
    if (count !== null) return `${prefix}'{${this.operand(count, PRIMARY)}{${items}}}`;
    return `${prefix}'{${items}}`;
  }

  patternItem(node: F.Node): string {
    const key = node.subterms.get("key") ?? null;
    return `${key === null ? "default" : this.text(key)}: ${this.text(node.subterms.get("value"))}`;
  }

  call(node: F.Node): string {
    const attributes = nodes(node.helpers.get("attributes"));
    const written = attributes.length > 0 ? ` ${this.attributeText(attributes)} ` : "";
    return `${this.operand(node.subterms.get("callee"), PRIMARY)}${written}(${node.many.map((a) => this.text(a)).join(", ")})`;
  }

  systemCall(node: F.Node): string {
    const [name, args] = [node.attributes.get("name"), node.many.map((a) => this.text(a)).join(", ")];
    const attributes = nodes(node.helpers.get("attributes"));
    if (attributes.length > 0) return `${name} ${this.attributeText(attributes)} (${args})`; // the parentheses follow the attributes
    return node.many.length > 0 ? `${name}(${args})` : name;
  }

  cast(node: F.Node): string {
    const target = node.subterms.get("type");
    const written = this.isType(this.node(target)) ? this.text(target) : this.operand(target, PRIMARY);
    return `${written}'(${this.text(node.subterms.get("value"))})`;
  }

  streaming(node: F.Node): string {
    const slice = node.subterms.get("slice") ?? null;
    const written = slice !== null ? ` ${this.text(slice)} ` : "";
    const items = nodes(node.helpers.get("items")).map((i) => this.streamItem(i)).join(", ");
    return `{${node.attributes.get("operator")}${written}{${items}}}`;
  }

  streamItem(node: F.Node): string {
    const left = node.subterms.get("left") ?? null;
    if (left === null) return this.text(node.subterms.get("expression"));
    const operator = node.attributes.get("operator") ?? null;
    const between = operator === null ? "" : operator === ":" ? operator : ` ${operator} `;
    const right = node.subterms.get("right") ?? null;
    return `${this.text(node.subterms.get("expression"))} with [${this.text(left)}${between}${right !== null ? this.text(right) : ""}]`;
  }

  newText(node: F.Node): string {
    const scope = (node.helpers.get("scope") ?? null) as F.Node | null;
    let written = "";
    if (scope !== null) written = scope.kind === E.SUPEREXPRESSION ? "super." : this.name(scope) + "::";
    const args = node.many.length > 0 ? `(${node.many.map((a) => this.text(a)).join(", ")})`
      : node.attributes.get("defaulted") ? "(default)" : "";
    return `${written}new${args}`;
  }

  newArray(node: F.Node): string {
    const value = node.subterms.get("value") ?? null;
    return `new[${this.text(node.subterms.get("size"))}]${value !== null ? `(${this.text(value)})` : ""}`;
  }

  randomizeWith(node: F.Node): string {
    let variables = "";
    if (node.attributes.get("restricted")) {
      variables = ` (${nodes(node.helpers.get("variables")).map((v) => this.spelling(v)).join(", ")})`;
    }
    return `${this.operand(node.subterms.get("call"), PRIMARY)} with${variables} ${this.inline(node.many)}`;
  }

  namedConnection(node: F.Node): string {
    const name = this.spelling(node.helpers.get("name"));
    if (node.attributes.get("implicit")) return `.${name}`;
    const value = node.subterms.get("value") ?? null;
    return `.${name}(${value === null ? "" : this.text(value)})`;
  }
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, Text> = new Map<string, Text>([
  [E.LITERAL, (p, n) => p.literal(n)], [E.CONSTANT, (p, n) => p.constant(n)],
  [E.NAMEEXPRESSION, (p, n) => p.name(n.helpers.get("name") as F.Node)],
  [E.MEMBEREXPRESSION, (p, n) => `${p.operand(n.subterms.get("value"), PRIMARY)}.${p.spelling(n.helpers.get("member"))}`],
  [E.INDEXEXPRESSION, (p, n) => `${p.operand(n.subterms.get("value"), PRIMARY)}[${p.text(n.subterms.get("index"))}]`],
  [E.RANGESELECT, (p, n) => {
    const operator = n.attributes.get("operator") as string;
    return `${p.operand(n.subterms.get("value"), PRIMARY)}[${p.text(n.subterms.get("left"))}`
      + `${operator === ":" ? operator : ` ${operator} `}${p.text(n.subterms.get("right"))}]`;
  }],
  [E.UNARYEXPRESSION, (p, n) => p.unary(n)], [E.INCREMENTEXPRESSION, (p, n) => p.increment(n)],
  [E.BINARYEXPRESSION, (p, n) => p.binary(n)], [E.ASSIGNMENTEXPRESSION, (p, n) => p.assignment(n)],
  [E.CONDITIONALEXPRESSION, (p, n) => p.conditional(n)], [E.INSIDEEXPRESSION, (p, n) => p.inside(n)],
  [E.VALUERANGE, (p, n) => p.valueRange(n)],
  [E.CONCATENATION, (p, n) => "{" + n.many.map((i) => p.text(i)).join(", ") + "}"],
  [E.REPLICATION, (p, n) => p.replication(n)], [E.ASSIGNMENTPATTERN, (p, n) => p.assignmentPattern(n)],
  [E.PATTERNITEM, (p, n) => p.patternItem(n)],
  [E.THISEXPRESSION, () => "this"], [E.SUPEREXPRESSION, () => "super"], [E.NEWEXPRESSION, (p, n) => p.newText(n)],
  [E.NEWCOPYEXPRESSION, (p, n) => `new ${p.operand(n.subterms.get("value"), PRIMARY)}`],
  [E.NEWARRAYEXPRESSION, (p, n) => p.newArray(n)], [E.RANDOMIZEWITHEXPRESSION, (p, n) => p.randomizeWith(n)],
  [E.ARRAYMETHODWITHEXPRESSION, (p, n) => `${p.operand(n.subterms.get("value"), PRIMARY)} with (${p.text(n.subterms.get("body"))})`],
  [E.CALLEXPRESSION, (p, n) => p.call(n)], [E.SYSTEMCALL, (p, n) => p.systemCall(n)], [E.CASTEXPRESSION, (p, n) => p.cast(n)],
  [E.PARENTHESIZEDEXPRESSION, (p, n) => `(${p.text(n.subterms.get("expression"))})`],
  [E.DOLLAREXPRESSION, () => "$"], [E.TAGGEDEXPRESSION, (p, n) => p.tagged(n)],
  [E.MATCHESEXPRESSION, (p, n) => `${p.text(n.subterms.get("value"))} matches ${p.text(n.subterms.get("pattern"))}`],
  [E.PREDICATEEXPRESSION, (p, n) => n.many.map((c) => p.text(c)).join(" &&& ")],
  [E.STREAMINGCONCATENATION, (p, n) => p.streaming(n)],
  [E.MINTYPMAXEXPRESSION, (p, n) => `${p.text(n.subterms.get("min"))}:${p.text(n.subterms.get("typ"))}:${p.text(n.subterms.get("max"))}`],
  [E.ROOTEXPRESSION, () => "$root"], [E.EMPTYQUEUE, () => "{}"],
  [E.NAMEDCONNECTION, (p, n) => p.namedConnection(n)], [E.EMPTYARGUMENT, () => ""],
]);

/** A literal's: a negative value's sign binds as a unary operator does, and a float with no literal is a division. */
function literalPrecedence(_node: F.Node, written: string): number {
  return written.includes(" / ") ? MULTIPLICATIVE : written.startsWith("-") ? UNARY : PRIMARY;
}

/** Each of its kinds' precedence, where it is not a primary's. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map<string, any>([
  [E.LITERAL, literalPrecedence], [E.BINARYEXPRESSION, (node: F.Node) => BINARY[node.attributes.get("operator")]],
  [E.INSIDEEXPRESSION, RELATIONAL], [E.CONDITIONALEXPRESSION, CONDITIONAL], [E.UNARYEXPRESSION, UNARY],
  [E.INCREMENTEXPRESSION, UNARY], [E.ASSIGNMENTEXPRESSION, 0], [E.MINTYPMAXEXPRESSION, 0], [E.TAGGEDEXPRESSION, 0],
  [E.MATCHESEXPRESSION, 0], [E.PREDICATEEXPRESSION, 0],
]);

/** How `randomize() with` writes its kinds among its constraints, where not as written: an expression held as a
 * constraint, ended by `;`. */
export const INLINE: ReadonlyMap<string, Inline> = new Map(E.TAGS.map((tag): [string, Inline] => [tag, (_p, _n, written) => written + ";"]));

let PRINTER: Printer | null = null;

/** The family's printer: its dialects' `Text` modules' tables, merged, read when first needed. */
export function printer(): Printer {
  if (PRINTER === null) {
    const modules = [TypesText, PatternsText, AssertionsText, ConstraintsText, PreprocessorText];
    PRINTER = new Printer(new Map([...TEXTS, ...modules.flatMap((module) => [...module.TEXTS])]),
      new Map([...PRECEDENCE, ...modules.flatMap((module) => [...module.PRECEDENCE])]),
      new Map([...INLINE, ...modules.flatMap((module) => [...module.INLINE])]));
  }
  return PRINTER;
}

/** The expression, a term of any dialect of the SystemVerilog family, as SystemVerilog source, parenthesized only where
 * precedence requires. */
export function ToText(expression: unknown): string {
  return printer().text(F.term(expression));
}
