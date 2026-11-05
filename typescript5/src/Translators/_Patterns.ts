/** The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
 * pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up. */

import { Part } from "../Framework/Terms.js";
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

export const Patterns = {
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
  return new P("call", {}, new P("variable", { name: fn }), ...args);
}

/** A Python3 comparison chain of one link, `op`, as a form's attributes hold it. */
export function comparison(op: string): Part[] {
  return [new Part("comparison", { op }, 1)];
}

/** A Python3 comprehension's one `for` clause over a name, its target the pattern `N`, with `conditions`, as a form's
 * attributes hold it: its iterable and its conditions its terms. */
function forClause(conditions: number): Part[] {
  return [new Part("comprehension", { target: new Part("variable", { name: N }, 0) }, 1 + conditions)];
}

/** Rules for comparisons that are another dialect's operators of `kind`: each Python3 comparison of one link, a key of
 * `names`, is the operator its value names (or the other way round, where Python3 is on the `right`). */
export function compares(kind: string, attribute: string, names: Record<string, string>, python = "left"): Rule[] {
  return Object.entries(names).map(([op, other]) => {
    const mine = new P("compare", { comparisons: comparison(op) }, A, B);
    const theirs = new P(kind, { [attribute]: other }, A, B);
    return python === "left" ? new Rule(mine, theirs) : new Rule(theirs, mine);
  });
}

export const Python3 = {
  constant: (V: Hole) => new P("literal", { value: V }),
  name: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("attribute", { attr: K }, X),
  has: new P("call", {}, new P("variable", { name: "hasattr" }), X, new P("literal", { value: K })),
  /** b if a else True. */
  implies: new P("ifexp", {}, B, A, new P("literal", { value: true })),
  /** b if a else c. */
  ifexp: new P("ifexp", {}, B, A, C),
  shr: new P("binop", { op: ">>" }, A, B),
  /** all(b for n in a). */
  all_: call("all", new P("generatorexp", { generators: forClause(0) }, B, A)),
  any_: call("any", new P("generatorexp", { generators: forClause(0) }, B, A)),
  /** sum(1 for n in a if b). */
  count_where: call("sum", new P("generatorexp", { generators: forClause(1) }, new P("literal", { value: 1n }), A, B)),
  /** len, sum, min, max. */
  builtin: (fn: string) => call(fn, A),
  index: new P("subscript", {}, A, B),
  in_: new P("compare", { comparisons: comparison("in") }, A, B),
  unique: new P("compare", { comparisons: comparison("==") }, call("len", call("set", A)), call("len", A)),
};

/** The function `np.<fn>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'. */
function numpy(fn: string): P {
  let callee = new P("variable", { name: "np" });
  for (const attr of fn.split(".")) callee = new P("attribute", { attr }, callee);
  return callee;
}

/** Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions. */
export const Numpy = {
  call: (fn: string, ...args: (P | Hole)[]) => new P("call", {}, numpy(fn), ...args),
  get: new P("subscript", {}, X, new P("literal", { value: K })),
  has: new P("call", {}, numpy("logical_not"), new P("call", {}, numpy("ma.getmaskarray"),
    new P("subscript", {}, X, new P("literal", { value: K })))),
  implies: new P("call", {}, numpy("where"), A, B, new P("literal", { value: true })),
  prelude: new P("import", { module: "numpy", alias: "np" }, new Hole("B")),
  /** Rules for operators that are numpy functions of the same arguments. */
  renames(kind: string, attribute: string, names: Record<string, string>, arity: number): Rule[] {
    const args = holes(...Array.from({ length: arity }, (_, i) => `A${i}`));
    return Object.entries(names).map(([a, b]) => new Rule(new P(kind, { [attribute]: a }, ...args), Numpy.call(b, ...args)));
  },
};

export const Matlab = {
  constant: (V: Hole) => new P("literal", { value: V }),
  identifier: new P("variable", { name: N }),
  get: new P("field", { name: K }, X),
  has: new P("call", { callable: "isfield" }, X, new P("literal", { value: K })),
  implies: new P("binary", { operator: "||" }, new P("unary", { operator: "~" }, A), B),
  shr: new P("call", { callable: "bitshift" }, A, new P("unary", { operator: "-" }, B)), // a negative shift is to the right
  /** all(arrayfun(@(n) b, a)). */
  over: (fn: string) => new P("call", { callable: fn }, new P("arrayfun", { name: N }, A, B)),
  /** numel, sum, min, max. */
  function: (name: string) => new P("call", { callable: name }, A),
  /** a(b + 1): MATLAB counts from 1. */
  index: new P("index", {}, A, new P("binary", { operator: "+" }, B, new P("literal", { value: 1n }))),
  ismember: new P("call", { callable: "ismember" }, A, B),
  unique: new P("binary", { operator: "==" }, new P("call", { callable: "numel" }, new P("call", { callable: "unique" }, A)),
    new P("call", { callable: "numel" }, A)),
};

/** The kinds of the C family, which C and C++ share; a member's name is an identifier, a `Name`. A name used as an
 * expression is C's `variable`, and C++'s `idexpression` holding its identifier, as each grammar makes it. */
export const CFamily = {
  literal: (V: Hole) => new P("literal", { value: V }), // its suffix and prefix, its type, are not spelling
  string: new P("literal", { value: value(String), quote: '"' }), // C++'s string, whose quote is not its spelling
  identifier: new P("variable", { name: N }),
  idexpression: new P("idexpression", { name: new Part("identifier", { spelling: N }, 0) }), // C++'s identifier
  member: new P("memberexpression", { operator: ".", member: new Part("identifier", { spelling: K }, 0) }, X),
  implies: new P("binaryexpression", { operator: "||" }, new P("unaryexpression", { operator: "!" }, A), B),
};

const method = (name: string, array: P | Hole) => new P("method", { name }, array);

export const SystemVerilog = {
  constant: (V: Hole) => new P("literal", { value: V }),
  identifier: new P("variable", { name: N }),
  get: new P("member", { name: K }, X),
  implies: new P("binary", { operator: "->" }, A, B),
  /** a.method(n) with (b). */
  iterate: (name: string) => new P("iterate", { method: name, name: N }, A, B),
  /** a.sum(n) with (int'(b)). */
  count_where: new P("iterate", { method: "sum", name: N }, A, new P("cast", { type: "int" }, B)),
  /** size, sum. */
  method: (name: string) => method(name, A),
  /** a.min()[0]. */
  locate: (name: string) => new P("select", {}, method(name, A), new P("literal", { value: 0n })),
  select: new P("select", {}, A, B),
  inside: new P("inside", {}, A, B),
  unique: new P("binary", { operator: "==" }, method("size", method("unique", A)), method("size", A)),
};

export const Excel = {
  constant: (V: Hole) => new P("literal", { value: V }),
  name: new P("variable", { name: N }),
  let: new P("let", { name: N }, A, B),
  get: new P("field", { name: K }, X),
  has: new P("call", { callable: "NOT" }, new P("call", { callable: "ISERROR" }, new P("field", { name: K }, X))),
  implies: new P("call", { callable: "IF" }, A, B, new P("literal", { value: true })),
  if_: new P("call", { callable: "IF" }, A, B, C),
  shr: new P("call", { callable: "BITRSHIFT" }, A, B),
  /** AND(MAP(a, LAMBDA(n, b))). */
  over: (fn: string) => new P("call", { callable: fn }, new P("map", { name: N }, A, B)),
  /** SUM(MAP(a, LAMBDA(n, IF(b, 1, 0)))). */
  count_where: new P("call", { callable: "SUM" }, new P("map", { name: N }, A,
    new P("call", { callable: "IF" }, B, new P("literal", { value: 1n }), new P("literal", { value: 0n })))),
  /** ROWS, SUM, MIN, MAX. */
  function: (name: string) => new P("call", { callable: name }, A),
  /** INDEX(a, b + 1). */
  index: new P("call", { callable: "INDEX" }, A, new P("infix", { operator: "+" }, B, new P("literal", { value: 1n }))),
  /** ISNUMBER(MATCH(a, b, 0)). */
  match: new P("call", { callable: "ISNUMBER" }, new P("call", { callable: "MATCH" }, A, B, new P("literal", { value: 0n }))),
  unique: new P("infix", { operator: "=" }, new P("call", { callable: "ROWS" }, new P("call", { callable: "UNIQUE" }, A)),
    new P("call", { callable: "ROWS" }, A)),
};

export const Latex = {
  constant: (V: Hole) => new P("literal", { value: V }),
  symbol: new P("variable", { name: N }),
  where: new P("let", { name: N }, A, B),
  get: new P("member", { name: K }, X),
  has: new P("call", { callable: "has" }, X, new P("literal", { value: K })),
  implies: new P("binary", { operator: "\\implies" }, A, B),
  frac: new P("frac", {}, A, B),
};

/** Each dialect's forms of the collection concepts: the quantifiers `all`, `any` and `count where`, and `count`, `sum`,
 * `min`, `max`, `item` and `in`. `unique`, written as an idiom that does not read back, is not among them. */
export const COLLECTIONS: Record<string, Record<string, P>> = {
  Python: {
    all: Python3.all_, any: Python3.any_, "count where": Python3.count_where, count: Python3.builtin("len"),
    ...Object.fromEntries(["sum", "min", "max"].map((name) => [name, Python3.builtin(name)])), item: Python3.index, in: Python3.in_,
  },
  MATLAB: {
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
