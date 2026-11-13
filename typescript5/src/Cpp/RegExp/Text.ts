/**
 * Text of the Cpp RegExp dialect: `ToText(expression)` is a term of Cpp RegExp (or anything `Terms.term` reads one from)
 * as the pattern `std::regex` is given, in its grammar: a `regex`'s, by its flags, else ECMAScript's, the default
 * ([re.synopt]). A regex is written as its pattern, its flags being `basic_regex`'s constructor's other argument; a
 * pattern of a POSIX grammar is written by its dialect's printer (`POSIX/BRE/Text`, `POSIX/ERE/Text`), awk's with awk's
 * escapes.
 *
 * Its kinds print as ECMAScript writes them: alternatives joined by `|`; a group `(?:...)`, a capturing group `(...)`, a
 * lookahead `(?=...)` or `(?!...)`; a quantifier in its `raw` where it has one, else `*`, `+` and `?` where its bounds are
 * theirs, else in braces, followed by `?` where it is lazy; a class `[^...]`, a range `a-z`, a class atom `[:alpha:]`,
 * `[.ch.]` or `[=a=]`; `.`, `\d`, `\s`, `\w` and their negations; `^`, `$`, `\b` and `\B`; a backreference `\1`. A
 * character is written in its `raw` where it has one, else as itself, escaped where ECMAScript makes it special (its
 * syntax characters, and within a class `\`, `]`, `-` and `^`), a control character as its escape writes it (`\n`,
 * `\x01`). Invalid syntax is written as written (`Terms.invalidText`), refused by the name of the dialect that owns it.
 *
 * Its printer is its own *(agent)*: its terms hold no other dialect's but a regex's POSIX pattern, which POSIX's printer
 * writes, and no other dialect's subterm is one, so it shares nothing with the C family's printer (`C/Expressions/Text`)
 * but its reading of invalid syntax.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Errors } from "@mbse/schemas/Framework";
import type { Listed } from "../../Framework/Objects.js";
import * as F from "../../Framework/Terms.js";
import * as PK from "../../POSIX/Kinds.js";
import * as BRE from "../../POSIX/BRE/Expressions.js";
import * as ERE from "../../POSIX/ERE/Expressions.js";
import * as E from "./Expressions.js";

const { ValueError } = Errors;

/** The characters its text escapes outside a class: ECMAScript's syntax characters. */
const SPECIAL = "^$\\.*+?()[]{}|";

const CONTROLS: ReadonlyMap<number, string> = new Map([[0x09, "t"], [0x0A, "n"], [0x0B, "v"], [0x0C, "f"], [0x0D, "r"]]);

/** Writes a term's source as ECMAScript does, from its `Node`. */
class Printer {
  constructor(readonly dialect: F.Dialect) {}

  term(value: any, within = false, awk = false): string {
    const [tag, record] = this.dialect.kind(value);
    if (F.INVALID_KINDS.has(tag)) return F.invalidTermText(this.dialect, value);
    const owner = this.dialect.owner(value);
    if (owner === BRE.DIALECT || owner === ERE.DIALECT) { // a POSIX grammar's term, as its dialect writes it
      return new PK.Printer(owner, owner === BRE.DIALECT ? PK.BRE : PK.ERE, awk).term(value);
    }
    if (owner !== this.dialect) { // a term of its family's other dialects, which it reads but does not write
      throw new ValueError(`${owner.name()} ${tag} is not a regular expression to print`);
    }
    return (this as any)[tag](F.node(tag, record), within);
  }

  alternatives(node: F.Node): string {
    return (node.lists.get("alternatives") as readonly any[]).map((alternative) => this.term(alternative)).join("|");
  }

  regex(node: F.Node): string {
    const flags = node.attributes.has("flags") ? (node.attributes.get("flags") as Listed).values as string[] : [];
    return this.term(node.subterms.get("pattern"), false, E.grammar(flags) === "awk");
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
    return `(${this.alternatives(node)})`;
  }

  quantifier(node: F.Node): string {
    const element = this.term(node.subterms.get("element"));
    if (node.attributes.has("raw")) return element + (node.attributes.get("raw") as string);
    const [least, most] = [node.attributes.get("min") as bigint, node.attributes.get("max") as bigint | undefined];
    const written = (most === undefined ? (least === 0n ? "*" : least === 1n ? "+" : null)
      : least === 0n && most === 1n ? "?" : null)
      ?? "{" + (most === least ? `${least}` : `${least},` + (most === undefined ? "" : `${most}`)) + "}";
    return element + written + (node.attributes.get("greedy") === false ? "?" : "");
  }

  characterclass(node: F.Node): string {
    const negate = node.attributes.get("negate") === true ? "^" : "";
    return `[${negate}${node.many.map((element) => this.term(element, true)).join("")}]`;
  }

  characterclassrange(node: F.Node): string {
    return `${this.term(node.subterms.get("min"), true)}-${this.term(node.subterms.get("max"), true)}`;
  }

  characterset(node: F.Node): string {
    const kind = node.attributes.get("setKind") as string;
    if (kind === "any") return ".";
    const letter = kind[0] as string;
    return "\\" + (node.attributes.get("negate") === true ? letter.toUpperCase() : letter);
  }

  character(node: F.Node, within: boolean): string {
    if (node.attributes.has("raw")) return node.attributes.get("raw") as string;
    const code = Number(node.attributes.get("value") as bigint);
    const c = String.fromCodePoint(code);
    if (CONTROLS.has(code)) return "\\" + (CONTROLS.get(code) as string);
    if (code < 0x20 || code === 0x7F) return "\\x" + code.toString(16).padStart(2, "0");
    return (within ? "\\]-^" : SPECIAL).includes(c) ? "\\" + c : c;
  }

  assertion(node: F.Node): string {
    const [kind, negate] = [node.attributes.get("assertionKind") as string, node.attributes.get("negate") === true];
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

/** The expression as the pattern `std::regex` is given, in its grammar. */
export function ToText(expression: unknown): string {
  return new Printer(E.DIALECT).term(F.term(expression));
}
