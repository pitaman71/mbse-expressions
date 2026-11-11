/** Text of the Python3 dialect: `ToText(expression)` is a term of the Python family (or anything `Terms.term` reads one
 * from) as Python source, parenthesized only where precedence requires, with its imports as the lines before it, a
 * literal in its spelling where it has one and invalid syntax as written (`Terms.invalidText`). Reading Python source
 * (`FromText`) needs Python's own parser, so it is in the Python implementation only.
 *
 * The family's printer prints a tree that mixes its dialects' terms from any of their holders: each sublanguage's kinds
 * are written by its own package's `Text` module, which the printer dispatches to by tag (`Types.Text`, `Patterns.Text`),
 * each with its `TEXTS` (a kind's tag to the function that writes it, given the printer and its `Terms.Node`, giving its
 * text and its precedence, on this module's scale). */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as PatternsText from "../Patterns/Text.js";
import * as TypesText from "../Types/Text.js";
import * as P from "./Expressions.js";

const { repr, pyFloat } = Repr;

// --- Rendering ---

// Python's precedence, loosest first (its language reference, 6.17).
const YIELD = 0, NAMED = 1, LAMBDA = 2, IF = 3, OR = 4, AND = 5, NOT = 6, COMPARE = 7, BITOR = 8, BITXOR = 9,
  BITAND = 10, SHIFT = 11, SUM = 12, PRODUCT = 13, UNARY = 14, POWER = 15, AWAIT = 16;
/** A primary's precedence, the tightest: its family's sublanguages' kinds give it. */
export const PRIMARY = 17;
const BINOP_LEVELS: Record<string, number> = {
  "+": SUM, "-": SUM, "*": PRODUCT, "@": PRODUCT, "/": PRODUCT, "//": PRODUCT, "%": PRODUCT, "**": POWER,
  "|": BITOR, "^": BITXOR, "&": BITAND, "<<": SHIFT, ">>": SHIFT,
};
const IMPORTS = [P.IMPORT, P.IMPORTFROM];

/** A term's source and its precedence. */
export type Written = [string, number];
type Attributes = Map<string, any>;

function constantText(value: unknown): Written {
  let text: string;
  if (typeof value === "number" && !Number.isFinite(value)) {
    text = Number.isNaN(value) ? "float('nan')" : value > 0 ? "float('inf')" : "-float('inf')";
  } else {
    text = repr(value);
  }
  return [text, text.startsWith("-") ? UNARY : PRIMARY];
}

/** A complex number as Python's `repr` writes it: `2j`, `(1-2j)`. */
function complexText(real: number, imag: number): string {
  const part = (x: number): string => {
    const text = pyFloat(x);
    return text.endsWith(".0") ? text.slice(0, -2) : text;
  };
  if (Object.is(real, 0)) return `${part(imag)}j`;
  const imaginary = part(imag);
  return `(${part(real)}${imaginary.startsWith("-") ? "" : "+"}${imaginary}j)`;
}

function importLine(tag: string, attributes: Attributes): string {
  const alias = attributes.get("alias") ? ` as ${attributes.get("alias")}` : "";
  if (tag === P.IMPORT) return `import ${attributes.get("module")}${alias}`;
  return `from ${attributes.get("module")} import ${attributes.get("name")}${alias}`;
}

/** A container's helpers, in order. */
function parts(held: unknown): F.Part[] {
  return (held ?? []) as F.Part[];
}

/** Writes a term's source: each kind as Python writes it, its helpers read from its attributes and its terms from its
 * arguments, in order. */
export class Printer {
  /** `node`'s source, parenthesized where its precedence is looser than `level`. */
  write(node: any, level: number): string {
    const [text, precedence] = this.text(node);
    return precedence >= level ? text : `(${text})`;
  }

  /** An element of a display, an argument, an index: any expression but a named expression or a yield. */
  element(node: any): string {
    return this.write(node, LAMBDA);
  }

  text(node: any): Written {
    const [tag, record] = P.DIALECT.kind(node);
    const attributes = F.attributesOf(record);
    const args = F.argumentsOf(record);
    if (tag === P.LITERAL || tag === P.CONSTANT) {
      if (attributes.has("text")) { // its spelling, as written
        const text = attributes.get("text") as string;
        return [text, text.startsWith("-") ? UNARY : PRIMARY];
      }
      if (tag === P.LITERAL) return constantText(attributes.get("value"));
      if (attributes.has("singleton")) return [attributes.get("singleton"), PRIMARY];
      const parts = (attributes.get("complex") as F.Part).attributes; // a complex number's, `Expressions.Python.Python3.Complex`
      const text = complexText((parts.get("real") as number | undefined) ?? 0, parts.get("imag") as number);
      return [text, text.startsWith("-") ? UNARY : PRIMARY];
    }
    if (tag === "error" || tag === "missing") { // as written, by the dialect of its family that owns it
      return [F.invalidTermText(P.DIALECT, node), PRIMARY];
    }
    if (IMPORTS.includes(tag)) throw new Errors.ValueError("an import can only enclose the whole expression");
    const family = texts().get(tag);
    if (family !== undefined) return family(this, F.node(tag, record)); // a kind of a sublanguage of its family
    return (this as any)[`_${tag}`](attributes, args);
  }

  _variable(attributes: Attributes): Written {
    return [attributes.get("name"), PRIMARY];
  }

  _concatenatedstring(_: Attributes, args: any[]): Written {
    return [args.map((argument) => this.write(argument, PRIMARY)).join(" "), PRIMARY];
  }

  string(attributes: Attributes, args: any[], prefix: string): Written {
    const quote = attributes.get("quote") ?? "'";
    return [`${attributes.get("prefix") ?? prefix}${quote}${this.values(attributes, [...args])}${quote}`, PRIMARY];
  }

  _joinedstr(attributes: Attributes, args: any[]): Written {
    return this.string(attributes, args, "f");
  }

  _templatestr(attributes: Attributes, args: any[]): Written {
    return this.string(attributes, args, "t");
  }

  /** An f-string's, a t-string's or a format spec's text and fields, as written: each field's terms taken from `terms`
   * in turn. */
  values(attributes: ReadonlyMap<string, any>, terms: any[]): string {
    const written: string[] = [];
    for (const part of parts(attributes.get("values"))) {
      if (part.kind === "stringtext") {
        written.push(part.attributes.get("spelling") as string);
        continue;
      }
      const [value, ...mine] = terms.splice(0, part.size);
      const field = part.attributes;
      let expression: string;
      if (field.has("text")) { // the field's expression as written, `=` among it where it is a debug field
        expression = field.get("text") as string;
      } else {
        expression = this.write(value, IF) + (field.get("debug") ? "=" : "");
        expression = expression.startsWith("{") ? ` ${expression}` : expression;
      }
      const conversion = field.has("conversion") ? `!${field.get("conversion")}` : "";
      const spec = field.has("format_spec") ? `:${this.values((field.get("format_spec") as F.Part).attributes, mine)}` : "";
      written.push(`{${expression}${conversion}${spec}}`);
    }
    return written.join("");
  }

  _parenthesized(_: Attributes, args: any[]): Written {
    return [`(${this.write(args[0], YIELD)})`, PRIMARY];
  }

  _tuple(_: Attributes, args: any[]): Written {
    return [`(${this.elements(args)})`, PRIMARY];
  }

  /** A tuple's elements, a trailing comma after one alone. */
  elements(args: any[]): string {
    const texts = args.map((argument) => this.element(argument));
    return texts.length === 1 ? `${texts[0]},` : texts.join(", ");
  }

  _list(_: Attributes, args: any[]): Written {
    return [`[${args.map((argument) => this.element(argument)).join(", ")}]`, PRIMARY];
  }

  _set(_: Attributes, args: any[]): Written {
    return [`{${args.map((argument) => this.element(argument)).join(", ")}}`, PRIMARY];
  }

  _dict(_: Attributes, args: any[]): Written {
    const items: string[] = [];
    for (let i = 0; i < args.length; i += 2) {
      items.push(args[i] === null ? `**${this.write(args[i + 1], BITOR)}`
        : `${this.element(args[i])}: ${this.element(args[i + 1])}`);
    }
    return [`{${items.join(", ")}}`, PRIMARY];
  }

  /** A comprehension's `for` clauses, after its element: each `async for target in iter if condition ...`. */
  clauses(attributes: Attributes, args: any[]): string {
    const written: string[] = [];
    let i = 0;
    for (const part of parts(attributes.get("generators"))) {
      const target = part.attributes.get("target") as F.Part | undefined;
      const size = target?.size ?? 0;
      const [iterable, ...conditions] = args.slice(i, i + part.size - size);
      const terms = args.slice(i + part.size - size, i + part.size);
      i += part.size;
      const asynchronous = part.attributes.get("is_async") ? "async " : "";
      const targetText = this.target(target, terms, true);
      written.push(` ${asynchronous}for ${targetText} in ${this.write(iterable, OR)}`
        + conditions.map((condition) => ` if ${this.write(condition, OR)}`).join(""));
    }
    return written.join("");
  }

  comprehension(attributes: Attributes, args: any[], lead: number, opening: string, closing: string): Written {
    const element = args[1]; // its body, after Let's empty value
    let head: string;
    if (lead === 3) { // a dictcomp: its value, its body, then its key
      head = element === null ? `**${this.write(args[2], BITOR)}` : `${this.element(args[2])}: ${this.element(element)}`;
    } else {
      head = this.element(element);
    }
    return [`${opening}${head}${this.clauses(attributes, args.slice(lead))}${closing}`, PRIMARY];
  }

  _listcomp(attributes: Attributes, args: any[]): Written {
    return this.comprehension(attributes, args, 2, "[", "]");
  }

  _setcomp(attributes: Attributes, args: any[]): Written {
    return this.comprehension(attributes, args, 2, "{", "}");
  }

  _dictcomp(attributes: Attributes, args: any[]): Written {
    return this.comprehension(attributes, args, 3, "{", "}");
  }

  _generatorexp(attributes: Attributes, args: any[]): Written {
    return this.comprehension(attributes, args, 2, "(", ")");
  }

  _yield(_: Attributes, args: any[]): Written {
    return [args[0] === null ? "yield" : `yield ${this.element(args[0])}`, YIELD];
  }

  _yieldfrom(_: Attributes, args: any[]): Written {
    return [`yield from ${this.element(args[0])}`, YIELD];
  }

  _await(_: Attributes, args: any[]): Written {
    return [`await ${this.write(args[0], PRIMARY)}`, AWAIT];
  }

  _attribute(attributes: Attributes, args: any[]): Written {
    let value = this.write(args[0], PRIMARY);
    if (/^[0-9]+$/.test(value)) value = `(${value})`; // an int's `.` would be its decimal point
    return [`${value}.${attributes.get("attr")}`, PRIMARY];
  }

  /** A subscript's index: a slice, or a tuple of indices without its parentheses. */
  index(node: any): string {
    const [tag, record] = F.kindOf(node);
    if (tag === P.SLICE) return this._slice(new Map(), F.argumentsOf(record))[0];
    if (tag === P.TUPLE) {
      const texts = F.argumentsOf(record).map((argument) => this.index(argument));
      return texts.length === 1 ? `${texts[0]},` : texts.length > 0 ? texts.join(", ") : "()";
    }
    return this.element(node);
  }

  _subscript(_: Attributes, args: any[]): Written {
    return [`${this.write(args[0], PRIMARY)}[${this.index(args[1])}]`, PRIMARY];
  }

  _slice(_: Attributes, args: any[]): Written {
    const [lower, upper, step] = args.map((argument) => (argument !== null ? this.element(argument) : ""));
    return [`${lower}:${upper}` + (step ? `:${step}` : ""), PRIMARY];
  }

  _call(attributes: Attributes, args: any[]): Written {
    const keywords = parts(attributes.get("keywords"));
    const positional = args.slice(1, args.length - keywords.length);
    const values = args.slice(args.length - keywords.length);
    let texts: string[];
    if (positional.length === 1 && keywords.length === 0 && F.kindOf(positional[0])[0] === P.GENERATOREXP) {
      texts = [this.text(positional[0])[0].slice(1, -1)]; // a generator, the only argument, without its parentheses
    } else {
      texts = positional.map((argument) => this.element(argument));
    }
    texts.push(...keywords.map((part, i) => (part.attributes.has("arg")
      ? `${part.attributes.get("arg")}=${this.element(values[i])}` : `**${this.write(values[i], BITOR)}`)));
    return [`${this.write(args[0], PRIMARY)}(${texts.join(", ")})`, PRIMARY];
  }

  _starred(_: Attributes, args: any[]): Written {
    return [`*${this.write(args[0], BITOR)}`, LAMBDA];
  }

  _unaryop(attributes: Attributes, args: any[]): Written {
    if (attributes.get("op") === "not") return [`not ${this.write(args[0], NOT)}`, NOT];
    return [`${attributes.get("op")}${this.write(args[0], UNARY)}`, UNARY];
  }

  _binop(attributes: Attributes, args: any[]): Written {
    const op = attributes.get("op") as string;
    if (op === "**") { // right-associative, binding tighter than unary operators on its left
      return [`${this.write(args[0], AWAIT)} ** ${this.write(args[1], UNARY)}`, POWER];
    }
    const level = BINOP_LEVELS[op] as number;
    return [`${this.write(args[0], level)} ${op} ${this.write(args[1], level + 1)}`, level];
  }

  _compare(attributes: Attributes, args: any[]): Written {
    const links = parts(attributes.get("comparisons")).map((part, i) =>
      ` ${part.attributes.get("op")} ${this.write(args[i + 1], COMPARE + 1)}`);
    return [this.write(args[0], COMPARE + 1) + links.join(""), COMPARE];
  }

  _boolop(attributes: Attributes, args: any[]): Written {
    const op = attributes.get("op") as string;
    const level = op === "and" ? AND : OR;
    return [args.map((argument) => this.write(argument, level + 1)).join(` ${op} `), level];
  }

  /** A target, a pattern as a form reads it (its part and its terms), written as the term of its kind; with `bare`, a
   * tuple without its parentheses, as a `for` clause writes it. */
  target(target: F.Part | undefined, terms: any[], bare = false): string {
    if (target === undefined) return "";
    if (F.INVALID_KINDS.has(target.kind)) return F.invalidText(P.DIALECT, target.kind, target.attributes); // invalid syntax where a target stands, as written
    if (bare && target.kind === P.TUPLE) return this.elements(terms);
    const [text, precedence] = (this as any)[`_${target.kind}`](target.attributes, terms) as Written;
    return precedence >= BITOR ? text : `(${text})`;
  }

  _namedexpr(attributes: Attributes, args: any[]): Written {
    // its value, Let's empty body, then its target's terms
    return [`${this.target(attributes.get("target") as F.Part | undefined, args.slice(2))} := ${this.element(args[0])}`, NAMED];
  }

  _ifexp(_: Attributes, args: any[]): Written {
    const [body, test, orelse] = args;
    return [`${this.write(body, OR)} if ${this.write(test, OR)} else ${this.write(orelse, LAMBDA)}`, IF];
  }

  /** A lambda's parameters, `a, /, b=1, *c, d, **e`, each default taken from `defaults` in turn (after its annotation,
   * which a lambda's parameter has none of). */
  parameters(attributes: Attributes, defaults: any[]): string {
    const held = attributes.get("args") as F.Part | undefined;
    if (held === undefined) return "";
    const groups = held.attributes;
    const parameter = (part: F.Part, prefix = ""): string => {
      const [, defaultValue] = defaults.splice(0, part.size);
      return prefix + (part.attributes.get("arg") ?? "") + (defaultValue === null ? "" : `=${this.element(defaultValue)}`);
    };
    const written = parts(groups.get("posonlyargs")).map((part) => parameter(part));
    if (written.length > 0) written.push("/");
    written.push(...parts(groups.get("args")).map((part) => parameter(part)));
    if (groups.has("vararg")) written.push(parameter(groups.get("vararg") as F.Part, "*"));
    else if (groups.has("kwonlyargs")) written.push("*");
    written.push(...parts(groups.get("kwonlyargs")).map((part) => parameter(part)));
    if (groups.has("kwarg")) written.push(parameter(groups.get("kwarg") as F.Part, "**"));
    return ` ${written.join(", ")}`;
  }

  _lambda(attributes: Attributes, args: any[]): Written {
    const parameters = this.parameters(attributes, args.slice(2)); // Let's empty value, its body, then its defaults
    return [`lambda${parameters}: ${this.write(args[1], LAMBDA)}`, LAMBDA];
  }

  _let(attributes: Attributes, args: any[]): Written {
    return [`(lambda ${attributes.get("name")}: ${this.write(args[1], LAMBDA)})(${this.element(args[0])})`, PRIMARY];
  }
}

let TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => Written> | null = null;

/** How the kinds of its family's sublanguages are written: each dialect's `Text` module's `TEXTS`, merged, read when
 * first needed. */
function texts(): ReadonlyMap<string, (p: Printer, n: F.Node) => Written> {
  TEXTS ??= new Map([...TypesText.TEXTS, ...PatternsText.TEXTS]);
  return TEXTS;
}

/** The expression, a term of any dialect of the Python family, as Python source: one line per import around it, then
 * the expression; a pattern as a `case` writes it, an open sequence bare. */
export function ToText(expression: unknown): string {
  const lines: string[] = [];
  let node = F.term(expression);
  let [tag, record] = P.DIALECT.kind(node);
  while (IMPORTS.includes(tag)) {
    lines.push(importLine(tag, F.attributesOf(record)));
    const args = F.argumentsOf(record);
    node = args[args.length - 1]; // its body
    [tag, record] = P.DIALECT.kind(node);
  }
  return [...lines, new Printer().write(node, LAMBDA)].join("\n"); // a named expression or a yield in parentheses
}
