/**
 * Text of the Cpp RegExp dialect: `ToText(expression)` is a term of Cpp RegExp (or anything `Terms.term` reads one from)
 * as the pattern `std::regex` is given, in its grammar: a `regex`'s, by its flags, else ECMAScript's, the default
 * ([re.synopt]). A regex is written as its pattern, its flags being `basic_regex`'s constructor's other argument.
 *
 * Its kinds print as each grammar writes them: alternatives joined by `|`, grep's and egrep's list of patterns by
 * newlines; a capturing group `(...)`, a BRE's (basic and grep) `\(...\)`; ECMAScript's group `(?:...)` and lookahead
 * `(?=...)` or `(?!...)`; a quantifier in its `text` where it has one, else `*`, `+` and `?` where its bounds are theirs
 * (a BRE's `*` alone), else in braces, a BRE's escaped (`\{2,\}`), ECMAScript's lazy one followed by `?`; a bracket
 * expression `[^...]`, a range `a-z`, a class atom `[:alpha:]`, `[.ch.]` or `[=a=]`; `.`, ECMAScript's `\d`, `\s`,
 * `\w` and their negations; `^`, `$`, ECMAScript's `\b` and `\B`; a backreference `\1`. A character is written in
 * its `text` where it has one, else as itself, escaped where its grammar makes it special (ECMAScript's syntax
 * characters, and within a class `\`, `]`, `-` and `^`; a BRE's or an ERE's special characters, XBD 9.3.3 and 9.4.3,
 * none within a bracket expression, which has no escapes), a control character as ECMAScript's or awk's escape writes
 * it (`\n`, `\x01`; awk's `\001`), as a BRE and an ERE have none. Invalid syntax is written as written
 * (`Terms.invalid_text`), refused by the name of the dialect that owns it.
 *
 * Its printer is its own *(agent)*: its terms hold no other dialect's, and no other dialect's position holds one, so it
 * shares nothing with the C family's printer (`C.Expressions.Text`) but its reading of invalid syntax, and its grammar,
 * which a term alone does not say, is the context it writes in.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Errors } from "@mbse/schemas/Framework";
import type { Listed } from "../../Framework/Objects.js";
import * as F from "../../Framework/Terms.js";
import * as E from "./Expressions.js";

const { ValueError } = Errors;

const BRE_SPECIAL = "^.[$*\\", ERE_SPECIAL = "^.[$()|*+?{\\";

/** The characters each grammar's text escapes outside a class: ECMAScript's syntax characters, a BRE's and an ERE's
 * special characters (XBD 9.3.3, 9.4.3). */
const SPECIAL: ReadonlyMap<string, string> = new Map([
  [E.ECMASCRIPT, "^$\\.*+?()[]{}|"],
  ["basic", BRE_SPECIAL], ["grep", BRE_SPECIAL],
  ["extended", ERE_SPECIAL], ["awk", ERE_SPECIAL], ["egrep", ERE_SPECIAL],
]);

const CONTROLS: ReadonlyMap<number, string> = new Map([[0x09, "t"], [0x0A, "n"], [0x0B, "v"], [0x0C, "f"], [0x0D, "r"]]);
const AWK: ReadonlyMap<number, string> = new Map([...CONTROLS, [0x07, "a"], [0x08, "b"]]);
const BRE = ["basic", "grep"];

/** Writes a term's source in a grammar, from its `Node`. */
class Printer {
  constructor(readonly dialect: F.Dialect, public grammar: string) {}

  term(value: any, within = false): string {
    const [tag, record] = this.dialect.kind(value);
    if (F.INVALID_KINDS.has(tag)) return F.invalidTermText(this.dialect, value);
    if (!E.TAGS.includes(tag)) { // a term of its family's other dialects, which it reads but does not write
      throw new ValueError(`${this.dialect.owner(value).name()} ${tag} is not a regular expression to print`);
    }
    const node = F.node(tag, record);
    if (tag === E.REGEX) {
      this.grammar = E.grammar(node.attributes.has("flags") ? (node.attributes.get("flags") as Listed).values as string[] : []);
    }
    return (this as any)[tag](node, within);
  }

  alternatives(node: F.Node): string {
    return (node.lists.get("alternatives") as readonly any[]).map((alternative) => this.term(alternative)).join("|");
  }

  regex(node: F.Node): string {
    return this.term(node.slots.get("pattern"));
  }

  patternlist(node: F.Node): string {
    return node.many.map((pattern) => this.term(pattern)).join("\n");
  }

  pattern(node: F.Node): string {
    return this.alternatives(node);
  }

  alternative(node: F.Node): string {
    return node.many.map((element) => this.term(element)).join("");
  }

  group(node: F.Node): string {
    return `(?:${this.alternatives(node)})`;
  }

  capturinggroup(node: F.Node): string {
    return BRE.includes(this.grammar) ? `\\(${this.alternatives(node)}\\)` : `(${this.alternatives(node)})`;
  }

  quantifier(node: F.Node): string {
    const element = this.term(node.slots.get("element"));
    if (node.attributes.has("text")) return element + (node.attributes.get("text") as string);
    const [least, most] = [node.attributes.get("min") as bigint, node.attributes.get("max") as bigint | undefined];
    const shorthand = most === undefined ? (least === 0n ? "*" : least === 1n ? "+" : null)
      : least === 0n && most === 1n ? "?" : null;
    let written: string;
    if (shorthand !== null && (shorthand === "*" || !BRE.includes(this.grammar))) {
      written = shorthand;
    } else {
      const bounds = most === least ? `${least}` : `${least},` + (most === undefined ? "" : `${most}`);
      written = BRE.includes(this.grammar) ? `\\{${bounds}\\}` : `{${bounds}}`;
    }
    return element + written + (node.attributes.get("greedy") === false ? "?" : "");
  }

  characterclass(node: F.Node): string {
    const negate = node.attributes.get("negate") === true ? "^" : "";
    return `[${negate}${node.many.map((element) => this.term(element, true)).join("")}]`;
  }

  characterclassrange(node: F.Node): string {
    return `${this.term(node.slots.get("min"), true)}-${this.term(node.slots.get("max"), true)}`;
  }

  characterset(node: F.Node): string {
    const kind = node.attributes.get("kind") as string;
    if (kind === "any") return ".";
    const letter = kind[0] as string;
    return "\\" + (node.attributes.get("negate") === true ? letter.toUpperCase() : letter);
  }

  character(node: F.Node, within: boolean): string {
    if (node.attributes.has("text")) return node.attributes.get("text") as string;
    const code = Number(node.attributes.get("value") as bigint);
    const c = String.fromCodePoint(code);
    if (this.grammar === "awk" && AWK.has(code)) return "\\" + (AWK.get(code) as string);
    if (this.grammar === "awk" && (code < 0x20 || code === 0x7F)) return "\\" + code.toString(8).padStart(3, "0");
    if (this.grammar !== E.ECMASCRIPT) { // a BRE or an ERE: no escapes within a bracket expression, none of controls
      return within || !(SPECIAL.get(this.grammar) as string).includes(c) ? c : "\\" + c;
    }
    if (CONTROLS.has(code)) return "\\" + (CONTROLS.get(code) as string);
    if (code < 0x20 || code === 0x7F) return "\\x" + code.toString(16).padStart(2, "0");
    return (within ? "\\]-^" : SPECIAL.get(E.ECMASCRIPT) as string).includes(c) ? "\\" + c : c;
  }

  assertion(node: F.Node): string {
    const [kind, negate] = [node.attributes.get("kind") as string, node.attributes.get("negate") === true];
    if (kind === "lookahead") return `(?${negate ? "!" : "="}${this.alternatives(node)})`;
    return ({ start: "^", end: "$", word: negate ? "\\B" : "\\b" } as Record<string, string>)[kind] as string;
  }

  backreference(node: F.Node): string {
    return `\\${node.attributes.get("ref") as bigint}`;
  }

  exclass(node: F.Node): string {
    return `[:${node.attributes.get("name") as string}:]`;
  }

  collatingelement(node: F.Node): string {
    return `[.${node.attributes.get("name") as string}.]`;
  }

  equivalence(node: F.Node): string {
    return `[=${node.attributes.get("name") as string}=]`;
  }
}

/** A term of Cpp RegExp as the pattern its grammar writes: a regex's, by its flags; any other term's, `grammar`,
 * ECMAScript where none is given. */
export function text(expression: unknown, grammar: string = E.ECMASCRIPT): string {
  return new Printer(E.DIALECT, grammar).term(F.term(expression));
}

/** The expression as the pattern `std::regex` is given, in its grammar. */
export function ToText(expression: unknown): string {
  return text(expression);
}
