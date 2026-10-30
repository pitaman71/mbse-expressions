/** The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
 * pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up. */

import * as Domains from "../Dialects/Basic/Domains.js";
import { Hole, Pattern as P, Rule, holes } from "../Framework/Translators.js";
import type { Attributes } from "../Framework/Translators.js";

export const [A, B, C, X] = holes("A", "B", "C", "X") as [Hole, Hole, Hole, Hole];
/** A name: of a variable, or of a binding. */
export const N = new Hole("N", String);
/** The name of a property, field or column. */
export const K = new Hole("K", String);

/** A literal's value, of `types`: the native types both dialects of a pair hold. */
export function value(...types: unknown[]): Hole {
  return new Hole("V", ...types);
}

/** The value domain a Basic literal's attributes name, or null. */
export function domainOf(attributes: Attributes): Domains.Domain | null {
  const name = attributes.domain;
  return name === undefined ? null : Domains.registered(name as string);
}

/** A Basic literal's attributes: `value`, of `domain`, named unless it is its native's own. */
export function typed(value: unknown, domain: Domains.Domain): Attributes {
  return domain.equals(Domains.of(value)) ? { value } : { value, domain: named(domain) };
}

/** The name a Basic literal gives `domain`: the one it is registered under, or its own, under which it is registered. */
export function named(domain: Domains.Domain): string {
  let name = Domains.name_of(domain);
  if (name === null) {
    name = domain.name();
    Domains.register(name, domain);
  }
  return name;
}

export const Basic = {
  literal: (V: Hole) => new P("literal", { value: V }),
  variable: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("call", { callable: "get" }, X, new P("literal", { value: K })),
  has: new P("call", { callable: "has" }, X, new P("literal", { value: K })),
  implies: new P("call", { callable: "implies" }, A, B),
  shr: new P("call", { callable: "shr" }, A, B),
  quantifier: (name: string) => new P("quantifier", { name: N, quantifier: name }, A, B),
  /** count, sum, min, max, unique. */
  unary: (name: string) => new P("call", { callable: name }, A),
  item: new P("call", { callable: "item" }, A, B),
  in_: new P("call", { callable: "in" }, A, B),
};

function call(fn: string, ...args: (P | Hole)[]): P {
  return new P("python_call", {}, new P("variable", { name: fn }), ...args);
}

export const Python = {
  constant: (V: Hole) => new P("literal", { value: V }),
  name: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("python_attribute", { attr: K }, X),
  has: new P("python_call", {}, new P("variable", { name: "hasattr" }), X, new P("literal", { value: K })),
  implies: new P("python_ifexp", {}, A, B, new P("literal", { value: true })),
  ifexp: new P("python_ifexp", {}, A, B, C),
  shr: new P("python_binop", { operator: ">>" }, A, B),
  all_: call("all", new P("python_generator", { name: N }, A, B)),
  any_: call("any", new P("python_generator", { name: N }, A, B)),
  /** sum(1 for n in a if b). */
  count_where: call("sum", new P("python_generator", { name: N }, A, new P("literal", { value: 1n }), B)),
  /** len, sum, min, max. */
  builtin: (fn: string) => call(fn, A),
  index: new P("python_index", {}, A, B),
  in_: new P("python_compare", { operator: "in" }, A, B),
  unique: new P("python_compare", { operator: "==" }, call("len", call("set", A)), call("len", A)),
};

/** The function `np.<fn>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'. */
function numpy(fn: string): P {
  let callee = new P("variable", { name: "np" });
  for (const attr of fn.split(".")) callee = new P("python_attribute", { attr }, callee);
  return callee;
}

/** Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions. */
export const Numpy = {
  call: (fn: string, ...args: (P | Hole)[]) => new P("python_call", {}, numpy(fn), ...args),
  get: new P("python_subscript", { key: K }, X),
  has: new P("python_call", {}, numpy("logical_not"), new P("python_call", {}, numpy("ma.getmaskarray"), new P("python_subscript", { key: K }, X))),
  implies: new P("python_call", {}, numpy("where"), A, B, new P("literal", { value: true })),
  prelude: new P("python_import", { module: "numpy", alias: "np" }, new Hole("B")),
  /** Rules for operators that are numpy functions of the same arguments. */
  renames(kind: string, attribute: string, names: Record<string, string>, arity: number): Rule[] {
    const args = holes(...Array.from({ length: arity }, (_, i) => `A${i}`));
    return Object.entries(names).map(([a, b]) => new Rule(new P(kind, { [attribute]: a }, ...args), Numpy.call(b, ...args)));
  },
};

export const Matlab = {
  constant: (V: Hole) => new P("literal", { value: V }),
  identifier: new P("variable", { name: N }),
  get: new P("matlab_field", { name: K }, X),
  has: new P("call", { callable: "isfield" }, X, new P("literal", { value: K })),
  implies: new P("matlab_binary", { operator: "||" }, new P("matlab_unary", { operator: "~" }, A), B),
  shr: new P("call", { callable: "bitshift" }, A, new P("matlab_unary", { operator: "-" }, B)), // a negative shift is to the right
  /** all(arrayfun(@(n) b, a)). */
  over: (fn: string) => new P("call", { callable: fn }, new P("matlab_arrayfun", { name: N }, A, B)),
  /** numel, sum, min, max. */
  function: (name: string) => new P("call", { callable: name }, A),
  /** a(b + 1): MATLAB counts from 1. */
  index: new P("matlab_index", {}, A, new P("matlab_binary", { operator: "+" }, B, new P("literal", { value: 1n }))),
  ismember: new P("call", { callable: "ismember" }, A, B),
  unique: new P("matlab_binary", { operator: "==" }, new P("call", { callable: "numel" }, new P("call", { callable: "unique" }, A)),
    new P("call", { callable: "numel" }, A)),
};

export const Ccpp = {
  constant: (V: Hole) => new P("ccpp_constant", { value: V }), // untyped
  identifier: new P("variable", { name: N }),
  get: new P("ccpp_member", { name: K }, X), // with '.'
  implies: new P("ccpp_binary", { operator: "||" }, new P("ccpp_unary", { operator: "!" }, A), B),
};

const method = (name: string, array: P | Hole) => new P("systemverilog_method", { name }, array);

export const SystemVerilog = {
  constant: (V: Hole) => new P("literal", { value: V }),
  identifier: new P("variable", { name: N }),
  get: new P("systemverilog_member", { name: K }, X),
  implies: new P("systemverilog_binary", { operator: "->" }, A, B),
  /** a.method(n) with (b). */
  iterate: (name: string) => new P("systemverilog_iterate", { method: name, name: N }, A, B),
  /** a.sum(n) with (int'(b)). */
  count_where: new P("systemverilog_iterate", { method: "sum", name: N }, A, new P("systemverilog_cast", { type: "int" }, B)),
  /** size, sum. */
  method: (name: string) => method(name, A),
  /** a.min()[0]. */
  locate: (name: string) => new P("systemverilog_select", {}, method(name, A), new P("literal", { value: 0n })),
  select: new P("systemverilog_select", {}, A, B),
  inside: new P("systemverilog_inside", {}, A, B),
  unique: new P("systemverilog_binary", { operator: "==" }, method("size", method("unique", A)), method("size", A)),
};

export const Excel = {
  constant: (V: Hole) => new P("literal", { value: V }),
  name: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("excel_field", { name: K }, X),
  has: new P("call", { callable: "NOT" }, new P("call", { callable: "ISERROR" }, new P("excel_field", { name: K }, X))),
  implies: new P("call", { callable: "IF" }, A, B, new P("literal", { value: true })),
  if_: new P("call", { callable: "IF" }, A, B, C),
  shr: new P("call", { callable: "BITRSHIFT" }, A, B),
  /** AND(MAP(a, LAMBDA(n, b))). */
  over: (fn: string) => new P("call", { callable: fn }, new P("excel_map", { name: N }, A, B)),
  /** SUM(MAP(a, LAMBDA(n, IF(b, 1, 0)))). */
  count_where: new P("call", { callable: "SUM" }, new P("excel_map", { name: N }, A,
    new P("call", { callable: "IF" }, B, new P("literal", { value: 1n }), new P("literal", { value: 0n })))),
  /** ROWS, SUM, MIN, MAX. */
  function: (name: string) => new P("call", { callable: name }, A),
  /** INDEX(a, b + 1). */
  index: new P("call", { callable: "INDEX" }, A, new P("excel_infix", { operator: "+" }, B, new P("literal", { value: 1n }))),
  /** ISNUMBER(MATCH(a, b, 0)). */
  match: new P("call", { callable: "ISNUMBER" }, new P("call", { callable: "MATCH" }, A, B, new P("literal", { value: 0n }))),
  unique: new P("excel_infix", { operator: "=" }, new P("call", { callable: "ROWS" }, new P("call", { callable: "UNIQUE" }, A)),
    new P("call", { callable: "ROWS" }, A)),
};

export const Latex = {
  constant: (V: Hole) => new P("literal", { value: V }),
  symbol: new P("variable", { name: N }),
  where: new P("let", { name: N }, A, B),
  get: new P("latex_member", { name: K }, X),
  has: new P("call", { callable: "has" }, X, new P("literal", { value: K })),
  implies: new P("latex_binary", { operator: "\\implies" }, A, B),
  frac: new P("latex_frac", {}, A, B),
};

/** Each dialect's forms of the collection concepts: the quantifiers `all`, `any` and `count where`, and `count`, `sum`,
 * `min`, `max`, `item` and `in`. `unique`, written as an idiom that does not read back, is not among them. */
export const COLLECTIONS: Record<string, Record<string, P>> = {
  Python: {
    all: Python.all_, any: Python.any_, "count where": Python.count_where, count: Python.builtin("len"),
    ...Object.fromEntries(["sum", "min", "max"].map((name) => [name, Python.builtin(name)])), item: Python.index, in: Python.in_,
  },
  Matlab: {
    all: Matlab.over("all"), any: Matlab.over("any"), "count where": Matlab.over("nnz"), count: Matlab.function("numel"),
    ...Object.fromEntries(["sum", "min", "max"].map((name) => [name, Matlab.function(name)])), item: Matlab.index, in: Matlab.ismember,
  },
  Excel: {
    all: Excel.over("AND"), any: Excel.over("OR"), "count where": Excel.count_where, count: Excel.function("ROWS"),
    ...Object.fromEntries(["sum", "min", "max"].map((name) => [name, Excel.function(name.toUpperCase())])), item: Excel.index, in: Excel.match,
  },
};

/** Rules that translate the collection concepts of the dialect `left` into those of `right`, and back. */
export function collections(left: string, right: string): Rule[] {
  return Object.entries(COLLECTIONS[left] as Record<string, P>).map(([concept, pattern]) =>
    new Rule(pattern, (COLLECTIONS[right] as Record<string, P>)[concept] as P));
}
