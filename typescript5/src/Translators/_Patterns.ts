/** The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
 * pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up. */

import { Hole, Pattern as P, Rule, holes } from "../Framework/Translators.js";

export const [A, B, C, X] = holes("A", "B", "C", "X") as [Hole, Hole, Hole, Hole];
/** A name: of a variable, or of a binding. */
export const N = new Hole("N", String);
/** The name of a property, field or column. */
export const K = new Hole("K", String);

/** A literal's value, of `types`: the native types both dialects of a pair hold. */
export function value(...types: unknown[]): Hole {
  return new Hole("V", ...types);
}

export const Basic = {
  literal: (V: Hole) => new P("literal", { value: V }),
  variable: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("operation", { name: "get" }, X, new P("literal", { value: K })),
  has: new P("operation", { name: "has" }, X, new P("literal", { value: K })),
  implies: new P("operation", { name: "implies" }, A, B),
  shr: new P("operation", { name: "shr" }, A, B),
  quantifier: (name: string) => new P("quantifier", { name: N, quantifier: name }, A, B),
  /** count, sum, min, max, unique. */
  unary: (name: string) => new P("operation", { name }, A),
  item: new P("operation", { name: "item" }, A, B),
  in_: new P("operation", { name: "in" }, A, B),
};

function call(fn: string, ...args: (P | Hole)[]): P {
  return new P("call", {}, new P("name", { name: fn }), ...args);
}

export const Python = {
  constant: (V: Hole) => new P("constant", { value: V }),
  name: new P("name", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("attribute", { attr: K }, X),
  has: new P("call", {}, new P("name", { name: "hasattr" }), X, new P("constant", { value: K })),
  implies: new P("ifexp", {}, A, B, new P("constant", { value: true })),
  ifexp: new P("ifexp", {}, A, B, C),
  shr: new P("binop", { operator: ">>" }, A, B),
  all_: call("all", new P("generator", { name: N }, A, B)),
  any_: call("any", new P("generator", { name: N }, A, B)),
  /** sum(1 for n in a if b). */
  count_where: call("sum", new P("generator", { name: N }, A, new P("constant", { value: 1n }), B)),
  /** len, sum, min, max. */
  builtin: (fn: string) => call(fn, A),
  index: new P("index", {}, A, B),
  in_: new P("compare", { operator: "in" }, A, B),
  unique: new P("compare", { operator: "==" }, call("len", call("set", A)), call("len", A)),
};

/** The function `np.<fn>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'. */
function numpy(fn: string): P {
  let callee = new P("name", { name: "np" });
  for (const attr of fn.split(".")) callee = new P("attribute", { attr }, callee);
  return callee;
}

/** Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions. */
export const Numpy = {
  call: (fn: string, ...args: (P | Hole)[]) => new P("call", {}, numpy(fn), ...args),
  get: new P("subscript", { key: K }, X),
  has: new P("call", {}, numpy("logical_not"), new P("call", {}, numpy("ma.getmaskarray"), new P("subscript", { key: K }, X))),
  implies: new P("call", {}, numpy("where"), A, B, new P("constant", { value: true })),
  prelude: new P("import", { module: "numpy", alias: "np" }, new Hole("B")),
  /** Rules for operators that are numpy functions of the same arguments. */
  renames(kind: string, attribute: string, names: Record<string, string>, arity: number): Rule[] {
    const args = holes(...Array.from({ length: arity }, (_, i) => `A${i}`));
    return Object.entries(names).map(([a, b]) => new Rule(new P(kind, { [attribute]: a }, ...args), Numpy.call(b, ...args)));
  },
};

export const Matlab = {
  constant: (V: Hole) => new P("constant", { value: V }),
  identifier: new P("identifier", { name: N }),
  get: new P("field", { name: K }, X),
  has: new P("call", { function: "isfield" }, X, new P("constant", { value: K })),
  implies: new P("binary", { operator: "||" }, new P("unary", { operator: "~" }, A), B),
  shr: new P("call", { function: "bitshift" }, A, new P("unary", { operator: "-" }, B)), // a negative shift is to the right
};

export const Ccpp = {
  constant: (V: Hole) => new P("constant", { value: V }), // untyped
  identifier: new P("identifier", { name: N }),
  get: new P("member", { name: K }, X), // with '.'
  implies: new P("binary", { operator: "||" }, new P("unary", { operator: "!" }, A), B),
};

const method = (name: string, array: P | Hole) => new P("method", { name }, array);

export const SystemVerilog = {
  constant: (V: Hole) => new P("constant", { value: V }),
  identifier: new P("identifier", { name: N }),
  get: new P("member", { name: K }, X),
  implies: new P("binary", { operator: "->" }, A, B),
  /** a.method(n) with (b). */
  iterate: (name: string) => new P("iterate", { method: name, name: N }, A, B),
  /** a.sum(n) with (int'(b)). */
  count_where: new P("iterate", { method: "sum", name: N }, A, new P("cast", { type: "int" }, B)),
  /** size, sum. */
  method: (name: string) => method(name, A),
  /** a.min()[0]. */
  locate: (name: string) => new P("select", {}, method(name, A), new P("constant", { value: 0n })),
  select: new P("select", {}, A, B),
  inside: new P("inside", {}, A, B),
  unique: new P("binary", { operator: "==" }, method("size", method("unique", A)), method("size", A)),
};

export const Excel = {
  constant: (V: Hole) => new P("constant", { value: V }),
  name: new P("name", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("field", { name: K }, X),
  has: new P("function", { name: "NOT" }, new P("function", { name: "ISERROR" }, new P("field", { name: K }, X))),
  implies: new P("function", { name: "IF" }, A, B, new P("constant", { value: true })),
  if_: new P("function", { name: "IF" }, A, B, C),
  shr: new P("function", { name: "BITRSHIFT" }, A, B),
};

export const Latex = {
  constant: (V: Hole) => new P("constant", { value: V }),
  symbol: new P("symbol", { name: N }),
  where: new P("where", { name: N }, A, B),
  get: new P("member", { name: K }, X),
  has: new P("function", { name: "has" }, X, new P("constant", { value: K })),
  implies: new P("binary", { operator: "\\implies" }, A, B),
  frac: new P("frac", {}, A, B),
};
