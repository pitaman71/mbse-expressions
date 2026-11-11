/** Text of the SystemVerilog Assertions dialect: how its kinds are written, as mbse-programs' printer writes sequences and
 * properties (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `property_text`), which the family's printer
 * (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
 * `PRECEDENCE`, each kind's precedence where it is not a primary's; and `INLINE`, none.
 *
 * Sequences and properties bind looser than any expression operator, by IEEE 1800's Table 16-3, as mbse-programs numbers
 * them (`REPEAT` to `TEMPORAL`, below 0): an operand is parenthesized where it binds less than its place needs, but one
 * that reaches as far right as it can (`always p`, `if (c) p`, `@(clk) p`, `accept_on (c) p`) needs none where nothing
 * follows it. A delay is written `##1`, `##n`, `##(n + 1)` or `##[1:3]`; a clock as `@(posedge clk iff en or negedge
 * rst)`, or `@(*)`; a property spec as `@(clock) disable iff (rst) property`. `ToText` writes a term of the family, as
 * `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as E from "../Expressions/Expressions.js";
import type { Printer } from "../Expressions/Text.js";
import * as A from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

/** Precedence of sequence and property operators (IEEE 1800, Table 16-3), as mbse-programs' printer numbers it: below
 * every expression operator's, higher binding tighter. */
export const [REPEAT, DELAY, THROUGHOUT, WITHIN, INTERSECT, SEQUENCE_AND, SEQUENCE_OR, NOT, PROPERTY_AND, PROPERTY_OR, IFF,
  UNTIL, IMPLICATION, TEMPORAL] = [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14] as const;

const SEQUENCE: ReadonlyMap<string, number> = new Map([["throughout", THROUGHOUT], ["within", WITHIN],
  ["intersect", INTERSECT], ["and", SEQUENCE_AND], ["or", SEQUENCE_OR]]);
const PROPERTY: ReadonlyMap<string, number> = new Map([["and", PROPERTY_AND], ["or", PROPERTY_OR], ["iff", IFF],
  ["implies", UNTIL], ["until", UNTIL], ["s_until", UNTIL], ["until_with", UNTIL], ["s_until_with", UNTIL]]);
/** The right-associative levels of sequences and properties. */
const RIGHT: ReadonlySet<number> = new Set([THROUGHOUT, IFF, UNTIL, IMPLICATION]);

/** Its kinds that are sequences or properties, which its operators' operands are parenthesized among by precedence. */
const OWN: ReadonlySet<string> = new Set([...A.SEQUENCES, ...A.PROPERTIES]);

/** The kinds a delay is written after `##` without parentheses, besides an integer (mbse-programs' `IntegerLiteral`). */
const SIMPLE: readonly string[] = [E.NAMEEXPRESSION, E.PARENTHESIZEDEXPRESSION, "macrousage"];

function nodes(value: unknown): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

function level(p: Printer, node: F.Node): number {
  return p.precedence(node, "");
}

/** An operand of a sequence or property operator, in parentheses where it would bind otherwise; one that reaches as far
 * right as it can needs none where nothing follows it (`last`). An expression is one as it is written. */
export function part(p: Printer, value: unknown, at: number, last: boolean): string {
  const node = p.node(value);
  if (!OWN.has(node.kind)) return p.operand(value, at);
  const precedence = level(p, node);
  if ((precedence === TEMPORAL && last) || precedence >= at) return property(p, node, last);
  return `(${property(p, node, true)})`;
}

/** A number of ticks or repetitions, or a cycle range, `low:high`. */
export function cycles(p: Printer, value: unknown): string {
  const node = p.node(value);
  return node.kind === A.CYCLERANGE ? cycleRange(p, node) : p.text(value);
}

function cycleRange(p: Printer, node: F.Node): string {
  return `${p.text(node.slots.get("low"))}:${p.text(node.slots.get("high"))}`;
}

/** Whether a delay is written without parentheses: a name, a parenthesized expression, a macro usage, or an integer
 * literal, an unsized one or a vector. */
function simple(node: F.Node): boolean {
  if (node.kind === E.LITERAL) return typeof node.attributes.get("value") === "bigint";
  return SIMPLE.includes(node.kind) || (node.kind === E.CONSTANT && node.attributes.has("bits"));
}

function delayStep(p: Printer, step: F.Node, last: boolean): string {
  const [delay, sequence] = step.many;
  const node = p.node(delay);
  let written: string;
  if (node.kind === A.CYCLERANGE) {
    written = `##[${cycleRange(p, node)}]`;
  } else {
    written = simple(node) ? `##${p.text(delay)}` : `##(${p.text(delay)})`;
  }
  return `${written} ${part(p, sequence, DELAY + 1, last)}`;
}

/** An event control: `@(events)`, joined by `or`, each `edge expression iff condition`; `@(*)` without events. */
export function clock(p: Printer, node: F.Node): string {
  const events = nodes(node.helpers.get("events"));
  if (events.length === 0) return "@(*)";
  return "@(" + events.map((e) => event(p, e)).join(" or ") + ")";
}

function event(p: Printer, node: F.Node): string {
  const edge = node.attributes.get("edge");
  const condition = node.slots.get("condition") ?? null;
  return (edge ? `${edge} ` : "") + p.text(node.slots.get("expression"))
    + (condition !== null ? ` iff ${p.text(condition)}` : "");
}

function binary(p: Printer, node: F.Node, last: boolean): string {
  const at = level(p, node);
  const [left, right] = RIGHT.has(at) ? [at + 1, at] : [at, at + 1];
  return `${part(p, node.slots.get("left"), left, false)} ${node.attributes.get("operator")} `
    + part(p, node.slots.get("right"), right, last);
}

function delay(p: Printer, node: F.Node, last: boolean): string {
  const first = node.slots.get("first") ?? null;
  const written = first !== null ? `${part(p, first, DELAY, false)} ` : "";
  const steps = pairs(node.many);
  const final = steps.length - 1;
  return written + steps.map((s, i) => delayStep(p, s, last && i === final)).join(" ");
}

/** A delay sequence's steps, each a pair of its delay and its sequence, read as `Node`s of their two members. */
function pairs(many: readonly any[]): F.Node[] {
  const found: F.Node[] = [];
  for (let i = 0; i < many.length; i += 2) found.push(new F.Node("delaystep", new Map(), new Map(), many.slice(i, i + 2)));
  return found;
}

/** A sequence with its match items, in parentheses, or in `first_match`'s. */
function matched(p: Printer, node: F.Node, head: string): string {
  return `${head}(${[p.text(node.slots.get("sequence")), ...node.many.map((i) => p.text(i))].join(", ")})`;
}

function conditional(p: Printer, node: F.Node, last: boolean): string {
  const condition = p.text(node.slots.get("condition"));
  const alternative = node.slots.get("alternative") ?? null;
  if (alternative === null) return `if (${condition}) ${part(p, node.slots.get("consequence"), TEMPORAL, last)}`;
  return `if (${condition}) ${part(p, node.slots.get("consequence"), TEMPORAL + 1, false)} `
    + `else ${part(p, alternative, TEMPORAL, last)}`;
}

function caseText(p: Printer, node: F.Node): string {
  const items = nodes(node.helpers.get("items")).map((i) => (i.many.length > 0 ? i.many.map((e) => p.text(e)).join(", ")
    : "default") + `: ${p.text(i.slots.get("body"))};`).join(" ");
  return `case (${p.text(node.slots.get("expression"))}) ${items} endcase`;
}

function unary(p: Printer, node: F.Node, last: boolean): string {
  const range = node.slots.get("range") ?? null;
  const written = range !== null ? ` [${cycles(p, range)}]` : "";
  return `${node.attributes.get("operator")}${written} ${part(p, node.slots.get("operand"), level(p, node), last)}`;
}

/** How each sequence and property is written, given whether nothing follows it. */
const PROPERTIES: ReadonlyMap<string, (p: Printer, n: F.Node, last: boolean) => string> = new Map<string,
  (p: Printer, n: F.Node, last: boolean) => string>([
  [A.DELAYSEQUENCE, delay],
  [A.REPETITIONSEQUENCE, (p, n) => `${part(p, n.slots.get("sequence"), REPEAT, false)}`
    + `[${n.attributes.get("operator")}${cycles(p, n.slots.get("count"))}]`],
  [A.BINARYSEQUENCE, binary],
  [A.PARENTHESIZEDSEQUENCE, (p, n) => matched(p, n, "")],
  [A.FIRSTMATCHSEQUENCE, (p, n) => matched(p, n, "first_match")],
  [A.CLOCKEDSEQUENCE, (p, n, last) => `${clock(p, n.helpers.get("clock") as F.Node)} `
    + part(p, n.slots.get("sequence"), TEMPORAL, last)],
  [A.IMPLICATIONPROPERTY, (p, n, last) => `${part(p, n.slots.get("antecedent"), IMPLICATION + 1, false)} `
    + `${n.attributes.get("operator")} ${part(p, n.slots.get("consequent"), IMPLICATION, last)}`],
  [A.BINARYPROPERTY, binary],
  [A.UNARYPROPERTY, unary],
  [A.STRENGTHPROPERTY, (p, n) => `${n.attributes.get("keyword")}(${p.text(n.slots.get("sequence"))})`],
  [A.ABORTPROPERTY, (p, n, last) => `${n.attributes.get("keyword")} (${p.text(n.slots.get("condition"))}) `
    + part(p, n.slots.get("operand"), TEMPORAL, last)],
  [A.CONDITIONALPROPERTY, conditional],
  [A.CASEPROPERTY, (p, n) => caseText(p, n)],
  [A.PARENTHESIZEDPROPERTY, (p, n) => `(${p.text(n.slots.get("property"))})`],
  [A.CLOCKEDPROPERTY, (p, n, last) => `${clock(p, n.helpers.get("clock") as F.Node)} `
    + part(p, n.slots.get("property"), TEMPORAL, last)],
]);

function property(p: Printer, node: F.Node, last: boolean): string {
  return (PROPERTIES.get(node.kind) as (p: Printer, n: F.Node, last: boolean) => string)(p, node, last);
}

/** `@(clock) disable iff (disable) property`. */
function spec(p: Printer, node: F.Node): string {
  const disable = node.slots.get("disable") ?? null;
  return [node.helpers.has("clock") ? clock(p, node.helpers.get("clock") as F.Node) : null,
    disable !== null ? `disable iff (${p.text(disable)})` : null,
    p.text(node.slots.get("property"))].filter((written) => written).join(" ");
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map<string, (p: Printer, n: F.Node) => string>([
  ...[...A.SEQUENCES, ...A.PROPERTIES].map((tag) => [tag, (p: Printer, n: F.Node) => property(p, n, true)] as const),
  [A.PROPERTYSPEC, spec],
  [A.CYCLERANGE, cycleRange],
]);

/** Each of its kinds' precedence, where it is not a primary's: a sequence's or a property's, below every expression's;
 * those that reach as far right as they can, `TEMPORAL`. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map<string, any>([
  [A.REPETITIONSEQUENCE, REPEAT], [A.DELAYSEQUENCE, DELAY],
  [A.BINARYSEQUENCE, (node: F.Node) => SEQUENCE.get(node.attributes.get("operator"))],
  [A.BINARYPROPERTY, (node: F.Node) => PROPERTY.get(node.attributes.get("operator"))],
  [A.UNARYPROPERTY, (node: F.Node) => ["not", "nexttime", "s_nexttime"].includes(node.attributes.get("operator")) ? NOT
    : TEMPORAL],
  [A.IMPLICATIONPROPERTY, IMPLICATION], [A.CONDITIONALPROPERTY, TEMPORAL], [A.ABORTPROPERTY, TEMPORAL],
  [A.CLOCKEDPROPERTY, TEMPORAL], [A.CLOCKEDSEQUENCE, TEMPORAL],
]);

/** How `randomize() with` writes its kinds among its constraints, where not as written: none, as no constraint holds
 * them. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map();
