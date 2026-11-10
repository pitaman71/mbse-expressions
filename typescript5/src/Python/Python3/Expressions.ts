/**
 * Expressions of the Python3 dialect: every expression of Python 3, 3.0 to 3.15, as CPython's `ast` has them, in
 * mbse-programs' names and shapes, with the imports they need.
 *
 * The dialect is complete over Python 3's expression syntax (mbse-basis
 * [CAP-227: the Python3 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-227.md), by
 * [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Python3's terms are
 * values of its `Term`, `Expressions.Python.Python3.Term`, the branch `python3` of `Expressions.Framework.Term`, which `install`
 * defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are named as mbse-programs names them
 * (`mbse:mbse-programs/typescript5/src/Python/Syntax.ts`), lowercased as branch tags (`binop`, `generatorexp`), each a
 * value object `Expressions.Python.Python3.<Kind>` with mbse-programs' properties, in source order; an identifier is a `str`,
 * where mbse-programs has an `Identifier` node, and the expression context (`ctx`) is not represented, as there. A term
 * carries no domain. Its kinds:
 *
 * - Atoms: `literal`, a constant a basic scalar or any value holds (`Expressions.Python.Python3.Literal`, refining the
 *   framework's `literal`, mbse-basis [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md),
 *   with the properties its spelling encodes, mbse-basis
 *   [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `prefix` and `quote` of a string or
 *   bytes, `base` of an int, `separators` where digits are grouped by `_`); `constant`, Python3's own, for what no basic
 *   scalar holds (`singleton`, `None` or `...`; `complex`, a complex number, `Expressions.Python.Python3.Complex`, its
 *   `real` and `imag` each IEEE 754's `binary64`), its spelling too; `variable`, the
 *   framework's, a name (`ast.Name`'s `id` is its `name`), the names of `BUILTINS` always bound; `concatenatedstring`,
 *   adjacent string literals (`values`); `joinedstr`, an f-string, and `templatestr` (3.14), a t-string: `prefix`,
 *   `quote` and `values`, each a `stringtext` (`spelling`, as written) or a `formattedvalue` (`interpolation` in a
 *   t-string: `value`, `text`, `debug`, `conversion`, `format_spec`, a `formatspec` of `values`); `parenthesized`,
 *   parentheses written in the source (`value`).
 * - Displays: `tuple`, `list` (the framework's container constructor, its `elements` `ast`'s `elts`), `set` and `dict`
 *   (`items`, each a `dictitem`, `key` and `value`, without a key for `**value`); the comprehensions `listcomp`,
 *   `setcomp`, `generatorexp` (`elt`) and `dictcomp` (`key`, `value`), each of `generators`, `comprehension`s
 *   (`is_async`, `target`, `iter`, `ifs`). As a call's only argument a generator expression is written without its own
 *   parentheses: `all(p.pin > 0 for p in ports)`.
 * - `yield` (`value`, optional), `yieldfrom` and `await` (`value`).
 * - Primaries: `attribute` (`value.attr`); `subscript` (`value[slice]`), whose index is any term, a `slice` (`lower`,
 *   `upper`, `step`, each optional) or a `tuple` of them for several dimensions, so a tensor's every index; `call`
 *   (`func`, a term, applied to `args` and `keywords`, each a `keyword`, `arg` and `value`, `**value` without an `arg`);
 *   `starred` (`*value`).
 * - Operators: `unaryop` (`op`, `operand`), `binop` (`left`, `op`, `right`), `compare`, a chain (`left`, then
 *   `comparisons`, each a `comparison`, `op` and `comparator`: `a < b <= c`), `boolop` (`op`, n `values`), `namedexpr`
 *   (`target := value`), `ifexp` (`body if test else orelse`) and `lambda` (`args`, an `arguments` of `arg`s, and its
 *   `body`, an expression, so a term: the decision that a body is not part of the term is about statements).
 * - Extensions, with no counterpart in Python's grammar (`EXTENSIONS`): `let`, the framework's, `(lambda name:
 *   body)(value)`, Python's idiom for binding a name; `import` (`import module` or `... as alias`) and `importfrom`
 *   (`from module import name` or `... as alias`), which bind a name within their `body`, the rest of the expression;
 *   `Text.ToText` writes them as the lines before it. What they may import is up to the scope that evaluates them (see
 *   `Evaluators`).
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * A binding target, a comprehension's `target` and a named expression's, holds `Expressions.Python.Python3.Pattern`, the union
 * of the terms a target may be (`variable`, `tuple`, `list`, `starred`, `attribute`, `subscript`, `parenthesized`), each
 * a schema of a term too, and invalid syntax (the framework's `error` and `missing`), as every dialect's `Type` and
 * `Pattern` hold it: every dialect has a `Pattern` union for its binding targets, as the dialects proposal decided
 * ("(ii)"). The framework reads a target, as any helper, as a `Terms.Part`, its terms after the clause's own; a
 * lambda's parameters are `arg`s, not patterns.
 *
 * Each kind's `Kind` records the Python versions that have it (`standards`, `STANDARDS`'s names from the one it arrived
 * in; none for an extension). A NumPy expression is a Python expression that imports numpy: NumPy is a vocabulary of
 * calls, not a dialect.
 *
 * `DIALECT` reads them (`Terms.Dialect`). The writers (`constant`, `name`, `attribute`, ...) write them through the
 * builders, wherever a term is written, in a transaction; a helper's writer (`keyword`, `comparison`, `comprehension`,
 * `arg`, `formattedvalue`, ...) is given where its kind takes one. JavaScript has no complex numbers and no `Ellipsis`:
 * `Complex` and `ELLIPSIS` stand for them where a constant is written. `Text.ToText` writes an expression as Python
 * source, parenthesized only where precedence requires. Reading Python source (`Text.FromText`) needs Python's own
 * parser, so it is in the Python implementation only.
 *
 * Its kinds of domain, the branches of its union `Expressions.Python.Python3.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `python3`, each with the inferred `ordered`: `str`
 * (`OfStr`), sequences of code points, lone surrogates included; and the tokens `nonetype` (`OfNoneType`), `None`'s type,
 * and `ellipsis` (`OfEllipsis`), `...`'s. A token's domain has no schema: its value is a `constant`'s.
 *
 * Its domains, each named as Python names its type: `define` writes them, owned by the singleton `Expressions.Python.Python3`
 * by name, each but a token's related to its schema, an `OfAny` of the scalar it narrows, which `install` adds
 * (`Expressions.Python.Python3.int`): `bool` (ISO/IEC 11404's `boolean`), `int` (11404's `integer`: signed, unbounded,
 * raising on overflow), `float` (IEEE 754's `binary64`, rounding ties to even), `str` (its own `str`), `bytes` (11404's
 * `octetstring`), and the tokens `NoneType` and `ellipsis` (its own `nonetype` and `ellipsis`, named as
 * `type(None).__name__` and `type(...).__name__` are). `complex` is not a domain: it is a value schema, `Complex`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr, Schemas } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** A complex number, which JavaScript has none of: what a `constant` holds of one (in Python, a `complex`). */
export const Complex = Domains.ComplexValue;
/** Python's `...` (`Ellipsis`), which JavaScript has none of. */
export const ELLIPSIS = Domains.ELLIPSIS;

const { repr } = Repr;

export const LITERAL = "literal";
export const CONSTANT = "constant";
export const NAME = "variable";
export const CONCATENATEDSTRING = "concatenatedstring";
export const JOINEDSTR = "joinedstr";
export const TEMPLATESTR = "templatestr";
export const PARENTHESIZED = "parenthesized";
export const TUPLE = "tuple";
export const LIST = "list";
export const SET = "set";
export const DICT = "dict";
export const LISTCOMP = "listcomp";
export const SETCOMP = "setcomp";
export const DICTCOMP = "dictcomp";
export const GENERATOREXP = "generatorexp";
export const YIELD = "yield";
export const YIELDFROM = "yieldfrom";
export const AWAIT = "await";
export const ATTRIBUTE = "attribute";
export const SUBSCRIPT = "subscript";
export const SLICE = "slice";
export const CALL = "call";
export const STARRED = "starred";
export const UNARYOP = "unaryop";
export const BINOP = "binop";
export const COMPARE = "compare";
export const BOOLOP = "boolop";
export const NAMEDEXPR = "namedexpr";
export const IFEXP = "ifexp";
export const LAMBDA = "lambda";
export const LET = "let";
export const IMPORT = "import";
export const IMPORTFROM = "importfrom";
export const COMPREHENSIONS: readonly string[] = [LISTCOMP, SETCOMP, DICTCOMP, GENERATOREXP];

/** The kinds with no counterpart in Python's grammar, kept as extensions (the dialects proposal, Decided, 2). */
export const EXTENSIONS: ReadonlySet<string> = new Set([LET, IMPORT, IMPORTFROM]);

/** The versions of Python 3 the dialect covers, by their published names, 3.0 to 3.15. */
export const STANDARDS: readonly string[] = Array.from({ length: 16 }, (_, minor) => `Python 3.${minor}`);

/** The versions from Python 3.`minor` on. */
function since(minor: number): readonly string[] {
  return STANDARDS.slice(minor);
}

/** Python3's union of its kinds, added to the framework's terms as the branch `python3`, its own kinds and the helpers
 * they hold, and its dialect's schema, whose singleton is `Expressions.Python.Python3`: run after `Framework.install` and
 * IEEE 754's (its `Complex` holds `binary64`s), in a transaction of its own; run again, it writes nothing. Its domains'
 * schemas too, each an `OfAny` of the scalar it narrows: its domains `define` writes after it.
 * Its holder, `Expressions.Python.Python3.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const IEEE754 = txn.Expressions.IEEE754.Expressions;
  const terms = (_: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term]));
  return txn.uid("mbse.Expressions.Python.Python3/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Kinds: S.OfUnion, DomainKind: S.OfUnion, // Kinds: the framework's
      OfStr: S.OfObject, OfNoneType: S.OfObject, OfEllipsis: S.OfObject,
      bool: S.OfAny, int: S.OfAny, float: S.OfAny, str: S.OfAny, bytes: S.OfAny,
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Pattern: S.OfUnion,
      Expression: S.OfObject, Literal: S.OfObject, Constant: S.OfObject, Complex: S.OfObject,
      ConcatenatedString: S.OfObject, StringText: S.OfObject, FormatSpec: S.OfObject,
      FormattedValue: S.OfObject, Interpolation: S.OfObject, JoinedStrValue: S.OfUnion,
      TemplateStrValue: S.OfUnion, JoinedStr: S.OfObject, TemplateStr: S.OfObject,
      Parenthesized: S.OfObject, Tuple: S.OfObject, Set: S.OfObject, DictItem: S.OfObject,
      Dict: S.OfObject, Comprehension: S.OfObject, ListComp: S.OfObject, SetComp: S.OfObject,
      DictComp: S.OfObject, GeneratorExp: S.OfObject, Yield: S.OfObject, YieldFrom: S.OfObject,
      Attribute: S.OfObject, Subscript: S.OfObject, Slice: S.OfObject, Keyword: S.OfObject,
      Call: S.OfObject, Starred: S.OfObject, Await: S.OfObject, UnaryOp: S.OfObject,
      BinOp: S.OfObject, Comparison: S.OfObject, Compare: S.OfObject, BoolOp: S.OfObject,
      NamedExpr: S.OfObject, IfExp: S.OfObject, Arg: S.OfObject, Arguments: S.OfObject,
      Lambda: S.OfObject, Import: S.OfObject, ImportFrom: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.Python.Python3`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Python.Python3.Dialect").ref(true).singleton("Expressions.Python.Python3").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("python3").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, its extensions, and invalid syntax
      (_: any) => _.Term.name("Expressions.Python.Python3.Term").branches([
        (t: any) => t.name("literal").schema([_.Literal]),
        (t: any) => t.name("constant").schema([_.Constant]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("concatenatedstring").schema([_.ConcatenatedString]),
        (t: any) => t.name("joinedstr").schema([_.JoinedStr]),
        (t: any) => t.name("templatestr").schema([_.TemplateStr]),
        (t: any) => t.name("parenthesized").schema([_.Parenthesized]),
        (t: any) => t.name("tuple").schema([_.Tuple]),
        (t: any) => t.name("list").schema([Framework.List]),
        (t: any) => t.name("set").schema([_.Set]),
        (t: any) => t.name("dict").schema([_.Dict]),
        (t: any) => t.name("listcomp").schema([_.ListComp]),
        (t: any) => t.name("setcomp").schema([_.SetComp]),
        (t: any) => t.name("dictcomp").schema([_.DictComp]),
        (t: any) => t.name("generatorexp").schema([_.GeneratorExp]),
        (t: any) => t.name("yield").schema([_.Yield]),
        (t: any) => t.name("yieldfrom").schema([_.YieldFrom]),
        (t: any) => t.name("attribute").schema([_.Attribute]),
        (t: any) => t.name("subscript").schema([_.Subscript]),
        (t: any) => t.name("slice").schema([_.Slice]),
        (t: any) => t.name("call").schema([_.Call]),
        (t: any) => t.name("starred").schema([_.Starred]),
        (t: any) => t.name("await").schema([_.Await]),
        (t: any) => t.name("unaryop").schema([_.UnaryOp]),
        (t: any) => t.name("binop").schema([_.BinOp]),
        (t: any) => t.name("compare").schema([_.Compare]),
        (t: any) => t.name("boolop").schema([_.BoolOp]),
        (t: any) => t.name("namedexpr").schema([_.NamedExpr]),
        (t: any) => t.name("ifexp").schema([_.IfExp]),
        (t: any) => t.name("lambda").schema([_.Lambda]),
        (t: any) => t.name("let").schema([Framework.Let]),
        (t: any) => t.name("import").schema([_.Import]),
        (t: any) => t.name("importfrom").schema([_.ImportFrom]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its patterns: what a binding target may be (Python's language reference, 7.2), each a schema of a term too, as
      // the dialects proposal decided for every dialect ("(ii)")
      (_: any) => _.Pattern.name("Expressions.Python.Python3.Pattern").branches([
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("tuple").schema([_.Tuple]),
        (t: any) => t.name("list").schema([Framework.List]),
        (t: any) => t.name("starred").schema([_.Starred]),
        (t: any) => t.name("attribute").schema([_.Attribute]),
        (t: any) => t.name("subscript").schema([_.Subscript]),
        (t: any) => t.name("parenthesized").schema([_.Parenthesized]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // atoms (Python's language reference, 6.2)
      (_: any) => _.Literal.name("Expressions.Python.Python3.Literal").refines([Framework.Literal]).properties({
        prefix: S.OfStr, // a string's or bytes' prefix, as written: `r`, `b`, `Rb`
        quote: S.OfStr, // a string's or bytes' quotes: `'`, `"`, `'''` or `"""`
        base: S.OfInt, // an int's base: 2, 8, 10 or 16
        separators: S.OfBool, // whether its digits are grouped by `_`
      }),
      (_: any) => _.Constant.name("Expressions.Python.Python3.Constant").properties({
        singleton: S.OfStr, // `None` or `...`
        complex: _.Complex, // a complex number
        text: S.OfStr, // its spelling, unvalidated
        problems: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])), // what is wrong with it
        separators: S.OfBool, // whether its digits are grouped by `_`
      }),
      // a complex number, a value of two IEEE 754 binary64 floats, as Python's `complex` is (the domains proposal,
      // Decided, H and J)
      (_: any) => _.Complex.name("Expressions.Python.Python3.Complex").properties({
        real: IEEE754.binary64, imag: IEEE754.binary64 }),
      (_: any) => _.ConcatenatedString.name("Expressions.Python.Python3.ConcatenatedString").properties({ values: terms(_) }),
      (_: any) => _.StringText.name("Expressions.Python.Python3.StringText").properties({ spelling: S.OfStr }),
      (_: any) => _.FormatSpec.name("Expressions.Python.Python3.FormatSpec").properties({
        values: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.JoinedStrValue])) }),
      (_: any) => _.FormattedValue.name("Expressions.Python.Python3.FormattedValue").properties({
        value: _.Term, text: S.OfStr, debug: S.OfBool, conversion: S.OfStr, format_spec: _.FormatSpec }),
      (_: any) => _.Interpolation.name("Expressions.Python.Python3.Interpolation").properties({
        value: _.Term, text: S.OfStr, debug: S.OfBool, conversion: S.OfStr, format_spec: _.FormatSpec }),
      (_: any) => _.JoinedStrValue.name("Expressions.Python.Python3.JoinedStrValue").branches([
        (t: any) => t.name("stringtext").schema([_.StringText]),
        (t: any) => t.name("formattedvalue").schema([_.FormattedValue])]),
      (_: any) => _.TemplateStrValue.name("Expressions.Python.Python3.TemplateStrValue").branches([
        (t: any) => t.name("stringtext").schema([_.StringText]),
        (t: any) => t.name("interpolation").schema([_.Interpolation])]),
      (_: any) => _.JoinedStr.name("Expressions.Python.Python3.JoinedStr").properties({
        prefix: S.OfStr, quote: S.OfStr,
        values: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.JoinedStrValue])) }),
      (_: any) => _.TemplateStr.name("Expressions.Python.Python3.TemplateStr").properties({
        prefix: S.OfStr, quote: S.OfStr,
        values: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.TemplateStrValue])) }),
      (_: any) => _.Parenthesized.name("Expressions.Python.Python3.Parenthesized").properties({ value: _.Term }),
      // displays and comprehensions
      (_: any) => _.Tuple.name("Expressions.Python.Python3.Tuple").properties({ elts: terms(_) }),
      (_: any) => _.Set.name("Expressions.Python.Python3.Set").properties({ elts: terms(_) }),
      (_: any) => _.DictItem.name("Expressions.Python.Python3.DictItem").properties({ key: _.Term, value: _.Term }),
      (_: any) => _.Dict.name("Expressions.Python.Python3.Dict").properties({
        items: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.DictItem])) }),
      (_: any) => _.Comprehension.name("Expressions.Python.Python3.Comprehension").properties({
        is_async: S.OfBool, target: _.Pattern, iter: _.Term, ifs: terms(_) }),
      (_: any) => _.ListComp.name("Expressions.Python.Python3.ListComp").properties({
        elt: _.Term, generators: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Comprehension])) }),
      (_: any) => _.SetComp.name("Expressions.Python.Python3.SetComp").properties({
        elt: _.Term, generators: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Comprehension])) }),
      (_: any) => _.DictComp.name("Expressions.Python.Python3.DictComp").properties({
        key: _.Term, value: _.Term,
        generators: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Comprehension])) }),
      (_: any) => _.GeneratorExp.name("Expressions.Python.Python3.GeneratorExp").properties({
        elt: _.Term, generators: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Comprehension])) }),
      (_: any) => _.Yield.name("Expressions.Python.Python3.Yield").properties({ value: _.Term }),
      (_: any) => _.YieldFrom.name("Expressions.Python.Python3.YieldFrom").properties({ value: _.Term }),
      // primaries (6.3)
      (_: any) => _.Attribute.name("Expressions.Python.Python3.Attribute").properties({ value: _.Term, attr: S.OfStr }),
      (_: any) => _.Subscript.name("Expressions.Python.Python3.Subscript").properties({ value: _.Term, slice: _.Term }),
      (_: any) => _.Slice.name("Expressions.Python.Python3.Slice").properties({ lower: _.Term, upper: _.Term, step: _.Term }),
      (_: any) => _.Keyword.name("Expressions.Python.Python3.Keyword").properties({ arg: S.OfStr, value: _.Term }),
      (_: any) => _.Call.name("Expressions.Python.Python3.Call").properties({
        func: _.Term,
        args: terms(_),
        keywords: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Keyword])),
      }),
      (_: any) => _.Starred.name("Expressions.Python.Python3.Starred").properties({ value: _.Term }),
      (_: any) => _.Await.name("Expressions.Python.Python3.Await").properties({ value: _.Term }),
      // operators (6.5 to 6.14)
      (_: any) => _.UnaryOp.name("Expressions.Python.Python3.UnaryOp").properties({ op: S.OfStr, operand: _.Term }),
      (_: any) => _.BinOp.name("Expressions.Python.Python3.BinOp").properties({ left: _.Term, op: S.OfStr, right: _.Term }),
      (_: any) => _.Comparison.name("Expressions.Python.Python3.Comparison").properties({ op: S.OfStr, comparator: _.Term }),
      (_: any) => _.Compare.name("Expressions.Python.Python3.Compare").properties({
        left: _.Term, comparisons: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Comparison])) }),
      (_: any) => _.BoolOp.name("Expressions.Python.Python3.BoolOp").properties({ op: S.OfStr, values: terms(_) }),
      (_: any) => _.NamedExpr.name("Expressions.Python.Python3.NamedExpr").properties({ target: _.Pattern, value: _.Term }),
      (_: any) => _.IfExp.name("Expressions.Python.Python3.IfExp").properties({ body: _.Term, test: _.Term, orelse: _.Term }),
      (_: any) => _.Arg.name("Expressions.Python.Python3.Arg").properties({
        arg: S.OfStr, annotation: _.Term, default_value: _.Term }),
      (_: any) => _.Arguments.name("Expressions.Python.Python3.Arguments").properties({
        posonlyargs: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Arg])),
        args: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Arg])),
        vararg: _.Arg,
        kwonlyargs: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Arg])),
        kwarg: _.Arg }),
      (_: any) => _.Lambda.name("Expressions.Python.Python3.Lambda").properties({ args: _.Arguments, body: _.Term }),
      // extensions: imports within an expression
      (_: any) => _.Import.name("Expressions.Python.Python3.Import").properties({
        module: S.OfStr, alias: S.OfStr, body: _.Term }),
      (_: any) => _.ImportFrom.name("Expressions.Python.Python3.ImportFrom").properties({
        module: S.OfStr, name: S.OfStr, alias: S.OfStr, body: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.Python.Python3.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      // --- its kinds of domain: `str`, and the tokens of `None` and `...`; each inferred `ordered` ---
      (_: any) => _.OfStr.name("Expressions.Python.Python3.OfStr").properties({ ordered: S.OfBool }),
      (_: any) => _.OfNoneType.name("Expressions.Python.Python3.OfNoneType").properties({ ordered: S.OfBool }),
      (_: any) => _.OfEllipsis.name("Expressions.Python.Python3.OfEllipsis").properties({ ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.Python.Python3.DomainKind").branches([
        (t: any) => t.name("str").schema([_.OfStr]),
        (t: any) => t.name("nonetype").schema([_.OfNoneType]),
        (t: any) => t.name("ellipsis").schema([_.OfEllipsis]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("python3").schema([_.DomainKind])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.bool.name("Expressions.Python.Python3.bool").schemas([S.OfBool]),
      (_: any) => _.int.name("Expressions.Python.Python3.int").schemas([S.OfInt]),
      (_: any) => _.float.name("Expressions.Python.Python3.float").schemas([S.OfFloat]),
      (_: any) => _.str.name("Expressions.Python.Python3.str").schemas([S.OfStr]),
      (_: any) => _.bytes.name("Expressions.Python.Python3.bytes").schemas([S.OfBytes]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("python3").schema([_.Term])]),
    ])]))]);
}

/** Python3's domains as data: the singleton `Expressions.Python.Python3` owning its domains by name (`domains`,
 * through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and each but a
 * token's related to its schema (`Expressions.Python.Python3.int`) by `Expressions.Framework.HasDomain`: `bool`,
 * `int`, `float`, `str` and `bytes`, and the tokens `NoneType` and `ellipsis`. Run after the installs, in a
 * transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each domain by its
 * name: `store.transaction(Python3.define)[0].get("int")`. */
export function define(txn: any): any {
  const [Python3, Domain] = [txn.Expressions.Python.Python3, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.Python.Python3.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: Python3.Dialect, bool: Domain, int: Domain, float: Domain, str: Domain,
      bytes: Domain, NoneType: Domain, ellipsis: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        bool: (e: any) => e.domain(_.bool), int: (e: any) => e.domain(_.int),
        float: (e: any) => e.domain(_.float), str: (e: any) => e.domain(_.str),
        bytes: (e: any) => e.domain(_.bytes), NoneType: (e: any) => e.domain(_.NoneType),
        ellipsis: (e: any) => e.domain(_.ellipsis),
      }),
      (_: any) => _.bool.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([Python3.bool]),
      (_: any) => _.int.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.signed(true).overflow("raise").ordered(true)))))).schema([Python3.int]), // unbounded
      (_: any) => _.float.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([Python3.float]),
      (_: any) => _.str.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.python3((v: any) => v.str(
        (d: any) => d.ordered(true)))))).schema([Python3.str]),
      (_: any) => _.bytes.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.octetstring(
        (d: any) => d.ordered(true)))))).schema([Python3.bytes]),
      (_: any) => _.NoneType.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.python3((v: any) => v.nonetype(
        (d: any) => d.ordered(false)))))), // a token: no schema
      (_: any) => _.ellipsis.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.python3((v: any) => v.ellipsis(
        (d: any) => d.ordered(false)))))), // a token: no schema
    ])]))]);
}

/** The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`). */
export const BUILTINS: ReadonlySet<string> = new Set([
  "abs", "all", "any", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "set", "str", "sum"]);

// --- Checks ---

/** Python's `str.isidentifier()`. */
export function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text);
}

function dotted(name: string): boolean {
  return name.split(".").every(isIdentifier);
}

function identifierProblems(what: string, value: unknown): string[] {
  if (typeof value === "string" && value !== "" && !isIdentifier(value)) {
    return [`${what} must be an identifier, got ${repr(value)}`];
  }
  return [];
}

/** The check that a record's property, if a non-empty str, is an identifier. */
function identifier(property: string, what: string): (record: any) => string[] {
  return (record) => identifierProblems(what, F.attributesOf(record).get(property));
}

/** An alias, if given, is an identifier, and not empty. */
function aliasProblems(what: string, attributes: ReadonlyMap<string, any>): string[] {
  if (attributes.get("alias") === "") return [`${F.article(what)} needs an alias`];
  return identifierProblems(`${F.article(what)}'s alias`, attributes.get("alias"));
}

function moduleProblems(what: string, module: unknown): string[] {
  if (typeof module !== "string" || dotted(module)) return [];
  return [`${F.article(what)}'s module must be a dotted name, got ${repr(module)}`];
}

function importCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [...moduleProblems("import", attributes.get("module")), ...aliasProblems("import", attributes)];
}

function importfromCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  return [...moduleProblems("importfrom", attributes.get("module")),
    ...identifierProblems("an importfrom's name", attributes.get("name")), ...aliasProblems("importfrom", attributes)];
}

function importNames(attributes: ReadonlyMap<string, any>): string[] {
  return [attributes.get("alias") || (attributes.get("module") as string).split(".")[0] as string];
}

function importfromNames(attributes: ReadonlyMap<string, any>): string[] {
  return [attributes.get("alias") || attributes.get("name")];
}

/** A string's quotes, as Python writes them. */
export const QUOTES: readonly string[] = ["'", "\"", "'''", "\"\"\""];

const PREFIXES = ["", "r", "u", "b", "br", "rb"]; // a literal's prefixes, by their letters

function quoteProblems(what: string, attributes: ReadonlyMap<string, any>): string[] {
  const quote = attributes.get("quote");
  return quote === undefined || QUOTES.includes(quote) ? [] : [`${what}'s quote cannot be ${repr(quote)}`];
}

/** Problems with a string's prefix, if given: `letters` (`f`, `t`), each with or without `r`, in either case. */
function prefixProblems(what: string, prefix: unknown, letters: string): string[] {
  if (prefix === undefined) return [];
  const allowed = letters !== "" ? [letters, `${letters}r`, `r${letters}`] : PREFIXES;
  return typeof prefix === "string" && allowed.includes(prefix.toLowerCase()) ? []
    : [`${what}'s prefix cannot be ${repr(prefix)}`];
}

/** A literal's spelling: a string's or bytes' prefix and quote, an int's base. */
function literalCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const base = attributes.get("base");
  const problems = [...prefixProblems("a literal", attributes.get("prefix"), ""), ...quoteProblems("a literal", attributes)];
  return [...problems, ...(base === undefined || [2n, 8n, 10n, 16n].includes(base) ? [] : [`a literal's base cannot be ${repr(base)}`])];
}

/** The singletons Python3's `constant` holds. */
export const SINGLETONS: readonly string[] = ["None", "..."];

/** A constant holds a singleton, `None` or `...`, or a complex number (`complex`), its `imag` at least. */
function constantCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const singleton = attributes.get("singleton");
  const complex = attributes.get("complex") as F.Part | undefined;
  if (singleton === undefined && complex === undefined) { // unless its text is invalid, its problems said
    return attributes.has("problems") ? [] : ["a constant needs a singleton or a complex number"];
  }
  if (singleton !== undefined && complex !== undefined) return ["a constant holds a singleton or a complex number, not both"];
  if (singleton !== undefined && !SINGLETONS.includes(singleton)) {
    return [`a constant's singleton must be None or ..., got ${repr(singleton)}`];
  }
  if (complex !== undefined && !complex.attributes.has("imag")) return ["a complex constant needs an imag"];
  return [];
}

/** The check that a record's helpers `prop`, or its arguments, where it has no slots, number at least `least`. */
function needs(what: string, prop: string, needed: string, least = 1): (record: any) => string[] {
  return (record) => {
    const held = F._helpers(record.as_schema()).includes(prop) ? F.attributesOf(record).get(prop) ?? []
      : F.argumentsOf(record);
    return held.length >= least ? [] : [`${F.article(what)} needs ${needed}`];
  };
}

/** A record's helpers of a container property, in order. */
function partsOf(record: any, prop: string): F.Part[] {
  return F.attributesOf(record).get(prop) ?? [];
}

function callCheck(record: any): string[] {
  return partsOf(record, "keywords").flatMap((part) => identifierProblems("a keyword's arg", part.attributes.get("arg")));
}

function compareUnfold(form: F.Form): F.Form | null {
  const links = (form.attributes.get("comparisons") ?? []) as F.Part[];
  if (links.length < 2) return null;
  return new F.Form(BOOLOP, { op: "and" }, links.map((link, i) =>
    new F.Form(COMPARE, { comparisons: [link] }, form.arguments.slice(i, i + 2))));
}

function boolopUnfold(form: F.Form): F.Form | null {
  if (form.arguments.length < 3) return null;
  return new F.Form(form.kind, form.attributes, [new F.Form(form.kind, form.attributes, form.arguments.slice(0, -1)),
    form.arguments[form.arguments.length - 1]]);
}

function compareCheck(record: any): string[] {
  const parts = partsOf(record, "comparisons");
  if (parts.length === 0) return ["a compare needs a comparison"];
  return parts.filter((part) => !part.attributes.has("op")).map(() => "a comparison needs an op");
}

function compareOperators(attributes: ReadonlyMap<string, any>): string[] {
  return (attributes.get("comparisons") as F.Part[]).map((part) => part.attributes.get("op") as string);
}

/** A chain's domain: each link's operator applied to its operands, `a < b` then `b <= c`, its result theirs. */
function compareResult(attributes: ReadonlyMap<string, any>, domains: FD.Domain[]): FD.Domain {
  const results: FD.Domain[] = [];
  for (const [i, operator] of compareOperators(attributes).entries()) {
    const signature = Domains.COMPARE.get(operator);
    const operands = domains.slice(i, i + 2);
    if (signature === undefined) return FD.Anything; // an extension: nothing is known about it
    const result = signature.result(operands);
    if (result === null) {
      const names = operands.map((domain) => domain.name()).join(", ");
      throw new TypeError(`${operator} cannot take (${names}); it takes ${signature.describe()}`);
    }
    results.push(result);
  }
  return FD.join(results);
}

/** An f-string's or a t-string's replacement fields, those within format specs among them, in order. */
function fieldsOf(record: any): F.Part[] {
  return partsOf(record, "values").flatMap(fieldParts);
}

function fieldParts(part: F.Part): F.Part[] {
  if (part.kind === "stringtext") return [];
  const spec = part.attributes.get("format_spec") as F.Part | undefined;
  return [part, ...((spec?.attributes.get("values") ?? []) as F.Part[]).flatMap(fieldParts)];
}

/** An f-string's or a t-string's prefix (`letters`, with or without `r`), quote and conversions. */
function stringCheck(tag: string, letters: string): (record: any) => string[] {
  const what = F.article(tag);
  return (record) => {
    const attributes = F.attributesOf(record);
    const problems = [...prefixProblems(what, attributes.get("prefix"), letters), ...quoteProblems(what, attributes)];
    for (const part of fieldsOf(record)) {
      const conversion = part.attributes.get("conversion");
      if (conversion !== undefined && !["s", "r", "a"].includes(conversion as string)) {
        problems.push(`${F.article(part.kind)}'s conversion cannot be ${repr(conversion)}`);
      }
    }
    return problems;
  };
}

/** The names a target binds: a name's, and those of the names a tuple, a list, a starred or a parenthesized target
 * holds; an attribute or a subscript binds none. */
export function targetNames(target: any, args: readonly any[] = []): Set<string> {
  if (target === null || target === undefined) return new Set();
  let tag: string, attributes: ReadonlyMap<string, unknown>;
  if (target instanceof F.Part) {
    [tag, attributes] = [target.kind, target.attributes];
  } else {
    const [kind, record] = F.kindOf(target);
    [tag, attributes, args] = [kind, F.attributesOf(record), F.argumentsOf(record)];
  }
  if (tag === NAME) return new Set(attributes.has("name") ? [attributes.get("name") as string] : []);
  if ([TUPLE, LIST, STARRED, PARENTHESIZED].includes(tag)) {
    return new Set(args.flatMap((argument) => [...targetNames(argument)]));
  }
  return new Set();
}

/** A comprehension's or a named expression's target, a pattern, and its terms, the last of `args` (a helper's terms
 * follow its own). */
function target(part: F.Part, args: readonly any[]): [F.Part | undefined, any[]] {
  const held = part.attributes.get("target") as F.Part | undefined;
  return [held, args.slice(args.length - (held?.size ?? 0))];
}

/** What each argument of a comprehension has bound: each `for` clause's target within its own target, its conditions,
 * the later clauses and the element; its iterable the earlier clauses' alone. */
function comprehensionScopes(record: any): ReadonlySet<string>[] {
  const args = F.argumentsOf(record);
  const parts = partsOf(record, "generators");
  const lead = args.length - parts.reduce((total, part) => total + part.size, 0);
  const scopes: ReadonlySet<string>[] = args.map(() => new Set<string>());
  let names: ReadonlySet<string> = new Set<string>();
  let i = lead;
  for (const part of parts) {
    const bound = new Set([...names, ...targetNames(...target(part, args.slice(i, i + part.size)))]);
    scopes[i] = names;
    for (let j = i + 1; j < i + part.size; j++) scopes[j] = bound;
    names = bound;
    i += part.size;
  }
  for (let j = 0; j < lead; j++) scopes[j] = names;
  return scopes;
}

/** A lambda's parameters, in order: positional-only, positional, `*vararg`, keyword-only, `**kwarg`. */
function parameters(record: any): F.Part[] {
  const held = F.attributesOf(record).get("args") as F.Part | undefined;
  if (held === undefined) return [];
  return ["posonlyargs", "args", "vararg", "kwonlyargs", "kwarg"].flatMap((name) => {
    const group = held.attributes.get(name);
    return group === undefined ? [] : Array.isArray(group) ? group : [group];
  });
}

/** A lambda's body has its parameters bound; their defaults and annotations, the scope's alone. */
function lambdaScopes(record: any): ReadonlySet<string>[] {
  const names = new Set(parameters(record).map((part) => part.attributes.get("arg"))
    .filter((arg): arg is string => typeof arg === "string"));
  return F.argumentsOf(record).map((_, i) => (i === 0 ? names : new Set<string>()));
}

function lambdaCheck(record: any): string[] {
  const problems: string[] = [];
  for (const part of parameters(record)) {
    if (!part.attributes.has("arg")) problems.push("a lambda's parameter needs an arg");
    problems.push(...identifierProblems("a lambda's parameter", part.attributes.get("arg")));
  }
  if (F._labelled(record).some(([, path, argument]) => path.endsWith(".annotation") && argument !== null)) {
    problems.push("a lambda's parameters have no annotations");
  }
  return problems;
}

/** A named expression's target is bound within itself: it binds its name in the scope around it, which a term does not
 * see beyond itself. */
function namedexprScopes(record: any): ReadonlySet<string>[] {
  const args = F.argumentsOf(record);
  const names = targetNames(...target(new F.Part(NAMEDEXPR, F.attributesOf(record)), args));
  return args.map((_, i) => (i === 0 ? new Set<string>() : names));
}

/** A target's own checks, as its kind's: a pattern is a helper, which validation does not read (its terms it does). A
 * name needs a name, an identifier, and an attribute's name is one. */
function targetProblems(label: string, held: F.Part): string[] {
  const { attributes } = held;
  if (F.INVALID_KINDS.has(held.kind)) return F.invalidProblems(held.kind, attributes).map((problem) => `${label}: ${problem}`);
  let problems: string[];
  if (held.kind === NAME) {
    problems = attributes.has("name") ? identifierProblems("a name", attributes.get("name")) : ["a variable needs a name"];
  } else {
    problems = held.kind === ATTRIBUTE ? identifierProblems("an attribute", attributes.get("attr")) : [];
  }
  return problems.map((problem) => `${label}: ${problem}`);
}

/** A comprehension's `for` clauses, one at least, each with its target, a pattern (a helper, which validation does not
 * ask for). */
function comprehensionCheck(tag: string): (record: any) => string[] {
  const atLeast = needs(tag, "generators", "a for clause");
  return (record) => {
    const problems = atLeast(record);
    partsOf(record, "generators").forEach((part, i) => {
      const held = part.attributes.get("target") as F.Part | undefined;
      problems.push(...(held === undefined ? [`${F.article(tag)} needs a generators ${i} target`]
        : targetProblems(`generators ${i} target`, held)));
    });
    return problems;
  };
}

function namedexprCheck(record: any): string[] {
  const held = F.attributesOf(record).get("target") as F.Part | undefined;
  if (held === undefined) return ["a namedexpr needs a target"];
  if (held.kind !== NAME && !F.INVALID_KINDS.has(held.kind)) return ["a namedexpr's target must be a name"];
  return targetProblems("target", held);
}

/** The literal of a native value: a basic scalar, the only native value `spec` gives it. */
function native(value: unknown): Writer {
  return constant(value);
}

const ANY = new FD.Function([FD.Anything], FD.Anything);
const ANY2 = new FD.Function([FD.Anything, FD.Anything], FD.Anything);
const ARGUMENT_SLOTS = ["posonlyargs", "args", "vararg", "kwonlyargs", "kwarg"].flatMap((group) =>
  ["annotation", "default_value"].map((slot) => `args.${group}.${slot}`));

function application(signature: FD.Signature = new FD.Opaque(), standards: readonly string[] = STANDARDS,
  options: F.KindOptions = {}): F.Kind {
  return new F.Kind(F.APPLICATION, { signature, standards, ...options });
}

function operatorKind(vocabulary: ReadonlyMap<string, FD.Signature>, options: F.KindOptions = {}): F.Kind {
  return new F.Kind(F.APPLICATION, { operator: "op", vocabulary, required: ["op"], standards: STANDARDS, ...options });
}

/** The Python3 dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Python.Python3", {
  [LITERAL]: new F.Kind(F.LITERAL, { spelling: ["text", "problems", "prefix", "quote", "base", "separators"],
    check: literalCheck, standards: STANDARDS }),
  [CONSTANT]: new F.Kind(F.LITERAL, { spelling: ["text", "problems", "separators"], check: constantCheck,
    typed: (record) => Domains.constant(F.attributesOf(record)), standards: STANDARDS }),
  [NAME]: new F.Kind(F.REFERENCE, { required: ["name"], ambient: BUILTINS, check: identifier("name", "a name"),
    standards: STANDARDS }),
  [CONCATENATEDSTRING]: application(new FD.Opaque(Domains.Str), STANDARDS,
    { check: needs(CONCATENATEDSTRING, "values", "two strings", 2) }),
  [JOINEDSTR]: application(new FD.Opaque(Domains.Str), since(6), { check: stringCheck(JOINEDSTR, "f") }),
  [TEMPLATESTR]: application(new FD.Opaque(), since(14), { check: stringCheck(TEMPLATESTR, "t") }),
  [PARENTHESIZED]: application(ANY),
  [TUPLE]: application(),
  [LIST]: application(),
  [SET]: application(new FD.Opaque(), STANDARDS, { check: needs(SET, "elts", "an element") }),
  [DICT]: application(new FD.Opaque(), STANDARDS, { optional: ["key"] }),
  [LISTCOMP]: application(new FD.Opaque(), STANDARDS,
    { scopes: comprehensionScopes, check: comprehensionCheck(LISTCOMP) }),
  [SETCOMP]: application(new FD.Opaque(), STANDARDS,
    { scopes: comprehensionScopes, check: comprehensionCheck(SETCOMP) }),
  [DICTCOMP]: application(new FD.Opaque(), STANDARDS,
    { scopes: comprehensionScopes, optional: ["value"], check: comprehensionCheck(DICTCOMP) }),
  [GENERATOREXP]: application(Domains.GENERATOR, STANDARDS,
    { scopes: comprehensionScopes, check: comprehensionCheck(GENERATOREXP) }),
  [YIELD]: application(new FD.Opaque(), STANDARDS, { optional: ["value"] }),
  [YIELDFROM]: application(ANY, since(3)),
  [ATTRIBUTE]: new F.Kind(F.APPLICATION, { operator: "attr", signature: ANY, required: ["attr"],
    check: identifier("attr", "an attribute"), standards: STANDARDS }),
  [SUBSCRIPT]: application(ANY2),
  [SLICE]: application(new FD.Opaque(), STANDARDS, { optional: ["lower", "upper", "step"] }),
  [CALL]: application(new FD.Opaque(), STANDARDS, { check: callCheck }),
  [STARRED]: application(ANY),
  [AWAIT]: application(ANY, since(5)),
  [UNARYOP]: operatorKind(Domains.UNARYOP),
  [BINOP]: operatorKind(Domains.BINOP),
  [COMPARE]: new F.Kind(F.APPLICATION, { vocabulary: Domains.COMPARE, operators: compareOperators, result: compareResult,
    check: compareCheck, unfold: compareUnfold, standards: STANDARDS }),
  [BOOLOP]: operatorKind(Domains.BOOLOP, { check: needs(BOOLOP, "values", "two values", 2), unfold: boolopUnfold }),
  [NAMEDEXPR]: application(new FD.Opaque(), since(8), { scopes: namedexprScopes, check: namedexprCheck }),
  [IFEXP]: application(new FD.Function([FD.Anything, FD.Anything, FD.Anything], FD.Anything)),
  [LAMBDA]: application(new FD.Opaque(), STANDARDS, { scopes: lambdaScopes, check: lambdaCheck, optional: ARGUMENT_SLOTS }),
  [LET]: new F.Kind(F.BINDING, { required: ["name"], check: identifier("name", "a let's name") }),
  [IMPORT]: new F.Kind(F.IMPORT, { required: ["module"], names: importNames, check: importCheck }),
  [IMPORTFROM]: new F.Kind(F.IMPORT, { required: ["module", "name"], names: importfromNames, check: importfromCheck }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A Python3 term, written through the builders: a spec, which writes its term where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

/** A helper of a Python3 term (a call's keyword, a comparison's link, a comprehension's `for`, a lambda's parameter, an
 * f-string's text or field), written through the builders: a spec given the visitor of the property or the
 * container's element that holds it, which writes its `kind`'s branch where a union of helpers holds it. */
export class Helper {
  constructor(readonly kind: string, readonly write: (record: any) => any) {}

  /** The spec of the helper: the function mbse-schemas calls with its visitor. */
  spec(): (visitor: any) => any {
    const write = (visitor: any): any => {
      const schema = visitor.as_schema();
      if (schema instanceof Schemas.OfProperty.Data) return visitor.as_value(write); // a property: its value
      if (schema instanceof Schemas.OfUnion.Data) return visitor.as_union((u: any) => u[this.kind](this.write));
      return visitor.as_object(this.write);
    };
    return write;
  }
}

const spec = (value: unknown): F.Writer => DIALECT.spec(value);

type Helpers = Record<string, Helper | Helper[] | null>;

/** The writer of a record: its attributes, its slots (specs) and its variadic arguments (specs) that are not null, and
 * its helpers (a `Helper`, or a list of them). */
function fields(attributes: Record<string, unknown>, slots: Record<string, unknown>,
  variadic: [string, unknown[]] | null, helpers: Helpers): (r: any) => any {
  const specs = Object.entries(slots).filter(([, value]) => value !== null && value !== undefined)
    .map(([slot, value]) => [slot, spec(value)] as const);
  const many = variadic === null ? null : [variadic[0], variadic[1].map(spec)] as const;
  return (r: any) => {
    for (const [name, value] of Object.entries(attributes)) if (value !== null && value !== undefined) r[name](value);
    for (const [slot, value] of specs) r[slot](value);
    if (many !== null) r[many[0]](many[1]);
    for (const [name, helper] of Object.entries(helpers)) {
      if (helper === null || (Array.isArray(helper) && helper.length === 0)) continue;
      r[name](Array.isArray(helper) ? helper.map((h) => h.spec()) : helper.spec());
    }
    return r;
  };
}

/** The writer of a term of kind `tag`. */
function kind(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown>,
  variadic: [string, unknown[]] | null = null, helpers: Helpers = {}): Writer {
  const record = fields(attributes, slots, variadic, helpers);
  return new Writer((union: any) => union[tag](record));
}

function helper(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown>,
  variadic: [string, unknown[]] | null = null, helpers: Helpers = {}): Helper {
  return new Helper(tag, fields(attributes, slots, variadic, helpers));
}

/** A target or a callee written as a str: a name. */
function nameOr(value: unknown): unknown {
  return typeof value === "string" ? name(value) : value;
}

/** A constant, `ast.Constant`'s: a basic scalar as a `literal`; `None` (null), `...` (`ELLIPSIS`) and a complex number
 * (`Complex`) as a `constant`; with its spelling (`text`) where given, else printers write its default one. */
export function constant(value: unknown, text: string | null = null): Writer {
  if (value === null || value === ELLIPSIS) {
    return kind(CONSTANT, { singleton: value === null ? "None" : "...", text }, {});
  }
  if (value instanceof Domains.ComplexValue) return kind(CONSTANT, { text }, {}, null, { complex: complexPart(value) });
  return new Writer((u: any) => u[LITERAL]((r: any) => {
    r.value((p: any) => p.as_scalar(value));
    return text === null ? r : r.text(text);
  }));
}

/** A complex number as a constant holds it, `Expressions.Python.Python3.Complex`: its `real` and `imag` parts, each an
 * IEEE 754 `binary64`. */
function complexPart(value: Domains.ComplexValue): Helper {
  return new Helper("complex", (r: any) => r.real(value.real).imag(value.imag));
}

/** The value bound to `name`. */
export function name(name: string): Writer {
  return new Writer((u: any) => u[NAME]((r: any) => r.name(name)));
}

/** Adjacent string literals, `'a' "b"`, which make one string. */
export function concatenatedstring(...values: unknown[]): Writer {
  return kind(CONCATENATEDSTRING, {}, {}, ["values", values]);
}

/** The text of an f-string, a t-string or a format spec between replacement fields, as written. */
export function stringtext(spelling: string): Helper {
  return new Helper("stringtext", (r: any) => r.spelling(spelling));
}

function values(written: readonly unknown[]): Helper[] {
  return written.map((value) => (typeof value === "string" ? stringtext(value) : value as Helper));
}

function field(tag: string, value: unknown, conversion: string | null, formatSpec: readonly unknown[] | null,
  debug: boolean, text: string | null): Helper {
  const spec = formatSpec === null ? null : helper("formatspec", {}, {}, null, { values: values(formatSpec) });
  return helper(tag, { text, debug: debug || null, conversion }, { value }, null, { format_spec: spec });
}

/** `{value=!conversion:format_spec}` in an f-string: a format spec's values are str (its text) or fields. */
export function formattedvalue(value: unknown, conversion: string | null = null, formatSpec: readonly unknown[] | null = null,
  debug = false, text: string | null = null): Helper {
  return field("formattedvalue", value, conversion, formatSpec, debug, text);
}

/** `{value=!conversion:format_spec}` in a t-string. */
export function interpolation(value: unknown, conversion: string | null = null, formatSpec: readonly unknown[] | null = null,
  debug = false, text: string | null = null): Helper {
  return field("interpolation", value, conversion, formatSpec, debug, text);
}

/** An f-string: its text (a str) and its fields (`formattedvalue`), in order. */
export function joinedstr(written: readonly unknown[], prefix = "f", quote = "'"): Writer {
  return kind(JOINEDSTR, { prefix, quote }, {}, null, { values: values(written) });
}

/** A t-string (Python 3.14): its text (a str) and its fields (`interpolation`), in order. */
export function templatestr(written: readonly unknown[], prefix = "t", quote = "'"): Writer {
  return kind(TEMPLATESTR, { prefix, quote }, {}, null, { values: values(written) });
}

/** `(value)`, parentheses written in the source. */
export function parenthesized(value: unknown): Writer {
  return kind(PARENTHESIZED, {}, { value });
}

/** `(elts, ...)`, a tuple display; `()` when empty. */
export function tuple_(...elts: unknown[]): Writer {
  return kind(TUPLE, {}, {}, ["elts", elts]);
}

/** `[elements, ...]`, a list display: the framework's container constructor. */
export function list_(...elements: unknown[]): Writer {
  return kind(LIST, {}, {}, ["elements", elements]);
}

/** `{elts, ...}`, a set display. */
export function set_(...elts: unknown[]): Writer {
  return kind(SET, {}, {}, ["elts", elts]);
}

/** `{key: value, ...}`, a dict display: `dict_(["a", 1n], ["b", x])`; a key of null is `**value`. */
export function dict_(...items: (readonly [unknown, unknown])[]): Writer {
  const pairs = items.map(([key, value]) => [key === null ? null : spec(key), spec(value)] as const);
  return new Writer((u: any) => u[DICT]((r: any) => r.items(pairs.map(([key, value]) =>
    (a: any) => a.as_object((o: any) => (key === null ? o : o.key(key)).value(value))))));
}

/** `for target in iter if condition ...`, or `async for` with `isAsync`, a clause of a comprehension; a target written
 * as a str is a name. */
export function comprehension(target: unknown, iter: unknown, ifs: readonly unknown[] = [], isAsync = false): Helper {
  return helper("comprehension", { is_async: isAsync || null }, { target: nameOr(target), iter }, ["ifs", [...ifs]]);
}

/** `[elt for ...]`. */
export function listcomp(elt: unknown, ...generators: Helper[]): Writer {
  return kind(LISTCOMP, {}, { elt }, null, { generators });
}

/** `{elt for ...}`. */
export function setcomp(elt: unknown, ...generators: Helper[]): Writer {
  return kind(SETCOMP, {}, { elt }, null, { generators });
}

/** `{key: value for ...}`; a value of null is `{**key for ...}` (Python 3.15). */
export function dictcomp(key: unknown, value: unknown, ...generators: Helper[]): Writer {
  return kind(DICTCOMP, {}, { key, value }, null, { generators });
}

/** `(elt for ...)`. */
export function generatorexp(elt: unknown, ...generators: Helper[]): Writer {
  return kind(GENERATOREXP, {}, { elt }, null, { generators });
}

/** `yield value`, or `yield`. */
export function yield_(value: unknown = null): Writer {
  return kind(YIELD, {}, { value });
}

/** `yield from value`. */
export function yieldfrom(value: unknown): Writer {
  return kind(YIELDFROM, {}, { value });
}

/** `await value`. */
export function await_(value: unknown): Writer {
  return kind(AWAIT, {}, { value });
}

/** `value.attr`; each argument of these writers is a spec (a native value is a constant). */
export function attribute(value: unknown, attr: string): Writer {
  return kind(ATTRIBUTE, { attr }, { value });
}

/** `value[slice]`: its index any term, a `slice_` or a `tuple_` of them for several dimensions. */
export function subscript(value: unknown, slice: unknown): Writer {
  return kind(SUBSCRIPT, {}, { value, slice });
}

/** `lower:upper:step`, an index of a subscript, each part optional. */
export function slice_(lower: unknown = null, upper: unknown = null, step: unknown = null): Writer {
  return kind(SLICE, {}, { lower, upper, step });
}

/** `arg=value` in a call, or `**value` where `arg` is null. */
export function keyword(arg: string | null, value: unknown): Helper {
  return helper("keyword", { arg }, { value });
}

/** `fn(...args)`: its positional arguments, then its `keyword`s, in the order given. A dotted name as the function is a
 * chain of attributes: `call('np.add', 1n, 2n)` is `np.add(1, 2)`. */
export function call(fn: unknown, ...args: unknown[]): Writer {
  if (typeof fn === "string") {
    const [first, ...rest] = fn.split(".");
    let callee: Writer = name(first as string);
    for (const attr of rest) callee = attribute(callee, attr);
    fn = callee;
  }
  return kind(CALL, {}, { func: fn }, ["args", args.filter((a) => !(a instanceof Helper))],
    { keywords: args.filter((a): a is Helper => a instanceof Helper) });
}

/** `*value`, unpacked in a display, a call or a subscript. */
export function starred(value: unknown): Writer {
  return kind(STARRED, {}, { value });
}

/** `op operand`: `not`, `-`, `+`, `~`. */
export function unaryop(op: string, operand: unknown): Writer {
  return kind(UNARYOP, { op }, { operand });
}

/** `left op right`. */
export function binop(op: string, left: unknown, right: unknown): Writer {
  return kind(BINOP, { op }, { left, right });
}

/** `op comparator`, a link of a comparison chain. */
export function comparison(op: string, comparator: unknown): Helper {
  return helper("comparison", { op }, { comparator });
}

/** `left op right`, then each `[op, comparator]` of `more` in turn: `compare('<', a, b, ['<=', c])` is `a < b <= c`. */
export function compare(op: string, left: unknown, right: unknown, ...more: (readonly [string, unknown])[]): Writer {
  const links = [comparison(op, right), ...more.map(([o, c]) => comparison(o, c))];
  return kind(COMPARE, {}, { left }, null, { comparisons: links });
}

/** `value op value ...`: `and` or `or` of n values. */
export function boolop(op: string, ...values: unknown[]): Writer {
  return kind(BOOLOP, { op }, {}, ["values", values]);
}

/** `target := value`; a target written as a str is a name. */
export function namedexpr(target: unknown, value: unknown): Writer {
  return kind(NAMEDEXPR, {}, { target: nameOr(target), value });
}

/** `body if test else orelse`. */
export function ifexp(test: unknown, body: unknown, orelse: unknown): Writer {
  return kind(IFEXP, {}, { body, test, orelse });
}

/** A parameter, `arg=default_value` (a lambda's have no annotation). */
export function arg(arg: string, defaultValue: unknown = null, annotation: unknown = null): Helper {
  return helper("arg", { arg }, { annotation, default_value: defaultValue });
}

function asArg(value: unknown): Helper {
  return typeof value === "string" ? arg(value) : value as Helper;
}

/** `lambda posonlyargs, /, args, *vararg, kwonlyargs, **kwarg: body`; a parameter is a str or an `arg`. */
export function lambda_(body: unknown, args: readonly unknown[] = [], options: { posonlyargs?: readonly unknown[];
  vararg?: unknown; kwonlyargs?: readonly unknown[]; kwarg?: unknown } = {}): Writer {
  const parameters: Helpers = {
    posonlyargs: (options.posonlyargs ?? []).map(asArg), args: args.map(asArg),
    vararg: options.vararg === undefined || options.vararg === null ? null : asArg(options.vararg),
    kwonlyargs: (options.kwonlyargs ?? []).map(asArg),
    kwarg: options.kwarg === undefined || options.kwarg === null ? null : asArg(options.kwarg),
  };
  const any = Object.values(parameters).some((p) => p !== null && (!Array.isArray(p) || p.length > 0));
  return kind(LAMBDA, {}, { body }, null, { args: any ? helper("arguments", {}, {}, null, parameters) : null });
}

/** `(lambda name: body)(value)`. */
export function let_(name: string, value: unknown, body: unknown): Writer {
  return kind(LET, { name }, { value, body });
}

/** `import module [as alias]`, then `body`. */
export function import_(module: string, body: unknown, alias: string | null = null): Writer {
  return kind(IMPORT, { module, alias }, { body });
}

/** `from module import name [as alias]`, then `body`. */
export function importfrom(module: string, name: string, body: unknown, alias: string | null = null): Writer {
  return kind(IMPORTFROM, { module, name, alias }, { body });
}
