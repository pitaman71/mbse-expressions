/**
 * Expressions of the SystemVerilog dialect: every expression of SystemVerilog, IEEE 1800-2005 to 1800-2023, Verilog
 * (IEEE 1364) its subset, as mbse-programs has them, over its 4-state and 2-state vectors and reals.
 *
 * The dialect is complete over SystemVerilog's expression syntax (mbse-basis [CAP-231: the SystemVerilog expression
 * dialect, complete](mbse:mbse-basis/docs/capabilities/CAP-231.md), by [CAP-226: complete expression
 * dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules), its sublanguages dialects of their own in its family
 * (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6): `Types` (data types), `Patterns` (`matches`' patterns), `Assertions`
 * (sequences and properties), `Constraints` (constraint blocks) and `Preprocessor` (compiler directives and macro usages),
 * each at `mbse.Expressions.SystemVerilog.<Dialect>`. Its terms are values of its `Term`,
 * `Expressions.SystemVerilog.Expressions.Term`, the branch `systemverilog` of `Expressions.Framework.Term`, which `install`
 * defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are mbse-programs' Verilog expression
 * kinds (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch
 * tags (`binaryexpression`), and its properties in source order, each a value object
 * `Expressions.SystemVerilog.Expressions.<Kind>`. A term carries no domain. Its kinds (41 branches):
 *
 * - Literals (Q3, "(b)"): `literal` (`Expressions.SystemVerilog.Expressions.Literal`, refining the framework's `literal`,
 *   mbse-basis [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md)) holds what a scalar schema
 *   can: an unsized integer (an int: decimal, or based without `x` or `z`, `'hFF`), a real (a float), a string (a str) and
 *   a time literal (its magnitude a float), with what its text encodes, mbse-basis
 *   [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): its `base` (`b`, `o`, `d` or `h`, as
 *   written), `signed` (`'sh`), `separators` (`_` between digits), a time literal's `unit` (`s`, `ms`, `us`, `ns`, `ps`,
 *   `fs`) and a string's `triple` (`"""..."""`, IEEE 1800-2023); `constant`, SystemVerilog's own, holds what no schema
 *   can, exactly one of: `null` (`singleton`), a fill `'0 '1 'x 'z` (`fill`), or a 4-state vector, every sized literal
 *   and an unsized one with `x`, `z` or `?` (`bits`, MSB first, of `0`, `1`, `x` and `z`; `size`, absent where unsized;
 *   `signed`; and `base`, its spelling), with `text` and `problems`.
 * - Names (Q4, "(b)"): `nameexpression`, a name used as a value, holding its `Name` (there is no `variable`, as for C++):
 *   `identifier`, `scopedname` (`p::x`), `localname` (`local::x`), `parameterizedname` (`c #(8)`), `interfacetypename`,
 *   `interfacemethodname`, `unitname` (`$unit`) and, where a `new`'s scope holds it, `superexpression`.
 * - Selects and operators: `memberexpression`, `indexexpression`, `rangeselect` (`[l:r]`, `[b+:w]`, `[b-:w]`),
 *   `unaryexpression`, `incrementexpression`, `binaryexpression`, `assignmentexpression`, `conditionalexpression`,
 *   `insideexpression` and its `valuerange`s, `concatenation`, `replication`, `streamingconcatenation` (its items each a
 *   `streamitem`), `mintypmaxexpression`, `taggedexpression`, `matchesexpression` and `predicateexpression` (`&&&`).
 * - Patterns of values: `assignmentpattern` (`'{a, b}`, `'{k: v}`, `t'{2{a}}`) and its `patternitem`s.
 * - Classes and objects: `thisexpression`, `superexpression`, `newexpression`, `newcopyexpression`,
 *   `newarrayexpression`, `randomizewithexpression` (its constraints `Constraints`' terms).
 * - Calls: `callexpression` (its arguments `Assertions`' terms: an instance of a sequence or a property may be given
 *   one), `systemcall` (`$clog2(x)`, `$bits(int)`: its arguments `Types`' terms), `arraymethodwithexpression`
 *   (`a.sum(x) with (x > 0)`), `namedconnection` (`.name(value)`) and `emptyargument`.
 * - `castexpression` (to a type, a width or a signing: `Types`' terms), `parenthesizedexpression`, `dollarexpression`,
 *   `rootexpression`, `emptyqueue`.
 * - The Preprocessor's `macrousage`, which its install adds, and the framework's kinds of invalid syntax, `error` and
 *   `missing`.
 *
 * Its helpers: the `Name` union, `attributeinstance` and `attributespec` (`(* keep *)`), `identifier` and `streamitem`.
 * Where a subterm may be of one sublanguage, it is of that dialect's `Term`; where it may be a sublanguage's kinds or
 * an expression (mbse-programs' `DataType | Expression`, `Property | Expression`, `Pattern | Expression`), it is of the
 * sublanguage's `Term`, which lists, as branches, every branch of this dialect's `Term` besides its own kinds: `install`
 * adds them to the `Term`s of `Types`, `Patterns`, `Assertions` and `Constraints`, creating any that is not yet installed,
 * as each of those installs names this `Term`, so that the six installs run in any order. A store holding some of them and
 * not the others holds their `Term`s, created empty, and an empty union does not validate as data ("a union needs at least
 * one branch"): every caller installs the six.
 *
 * Binding kinds refine `Let` (Q8, "(a)"): `arraymethodwithexpression` (`Expressions.SystemVerilog.Expressions.
 * ArrayMethodWithExpression`) holds its call as `Let`'s `value` and its `with` expression as `Let`'s `body`, redeclared to
 * hold this dialect's `Term`; its iterator, its call's one argument (`item` where it has none), is bound within both
 * (`Kind.scopes`), and its `name` stays unset. A `matches` binds its pattern's variables (`Patterns.Expressions.
 * bound_names`) within its conditional's consequence and the conditions after it in a `&&&` (12.6.2, 12.6.3).
 *
 * The editions of the standards it covers are data, which `define` writes, each owned by its designation (`IEEE Std
 * 1364-1995` to `IEEE Std 1800-2023`) and holding the kinds it has, by mbse-programs' `SINCE`. `DIALECT` reads the kinds
 * (`Terms.Dialect`), and the five other dialects' terms (`reads`). The writers (`literal`, `vector`, `identifier`,
 * `binary`, `cast`, ...) write the kinds SystemVerilog evaluated before it was complete through the builders, a cast's
 * type a spec of `Types`' `Term`, written through the builders too; every other term is written through the builders
 * (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `Text.ToText` writes an
 * expression as SystemVerilog source, with its precedence.
 *
 * Its kinds of domain, the branches of its union `Expressions.SystemVerilog.Expressions.DomainKind`, which `install`
 * adds to the framework's `Expressions.Framework.DomainKind` as the branch `systemverilog`: IEEE 1800's integral types,
 * `logic` (`Expressions.SystemVerilog.Expressions.OfLogic`), 4-state, and `bit` (`OfBit`), 2-state, each of a `width` in
 * bits, `signed` or not; inferred (populated by hand until constraint resolution computes them) `least` and `greatest`,
 * of its known values, and `ordered`. `install` also adds its 2-state domains' schemas, each an `OfAny` of the scalar it
 * narrows (`Expressions.SystemVerilog.Expressions.int`, of ints; `real` and `shortreal`, of floats); a 4-state domain has
 * none, since no basic scalar holds x or z. `define` writes its domains, IEEE 1800's built-in types, owned by name:
 * `logic`, `reg`, `integer` and `time` of the kind `logic`; `bit`, `byte`, `shortint`, `int` and `longint` of `bit`;
 * `real` and `shortreal` of IEEE 754's `ieee754`, `binary64` and `binary32`. Each name is its own domain: `reg` is
 * `logic`'s equal, not its synonym.
 *
 * What reads a named type reads its stored domain, through the store of the term's holder (`Proxies.store_of`), by
 * `Domains.named`: validation, a cast to a type SystemVerilog defines (`int'(x)`), which must be defined in that store;
 * inference, a constant's type (`integer`, `longint`, `real`), a cast's and `===`'s (`bit`); and evaluation (see
 * `Evaluators`). A lone term reaches no store: reading a type, it is refused (mbse-schemas' TypeError, "the value does
 * not belong to a store"), and a term that reads none, a sized vector's, is read as before.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Proxies, Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";
import * as Types from "../Types/Expressions.js";
import * as Domains from "./Domains.js";

const { ValueError } = Errors;
const { repr } = Repr;

export const LITERAL = "literal";
export const CONSTANT = "constant";
export const NAMEEXPRESSION = "nameexpression";
export const MEMBEREXPRESSION = "memberexpression";
export const INDEXEXPRESSION = "indexexpression";
export const RANGESELECT = "rangeselect";
export const UNARYEXPRESSION = "unaryexpression";
export const INCREMENTEXPRESSION = "incrementexpression";
export const BINARYEXPRESSION = "binaryexpression";
export const ASSIGNMENTEXPRESSION = "assignmentexpression";
export const CONDITIONALEXPRESSION = "conditionalexpression";
export const INSIDEEXPRESSION = "insideexpression";
export const VALUERANGE = "valuerange";
export const CONCATENATION = "concatenation";
export const REPLICATION = "replication";
export const ASSIGNMENTPATTERN = "assignmentpattern";
export const PATTERNITEM = "patternitem";
export const THISEXPRESSION = "thisexpression";
export const SUPEREXPRESSION = "superexpression";
export const NEWEXPRESSION = "newexpression";
export const NEWCOPYEXPRESSION = "newcopyexpression";
export const NEWARRAYEXPRESSION = "newarrayexpression";
export const RANDOMIZEWITHEXPRESSION = "randomizewithexpression";
export const ARRAYMETHODWITHEXPRESSION = "arraymethodwithexpression";
export const CALLEXPRESSION = "callexpression";
export const SYSTEMCALL = "systemcall";
export const CASTEXPRESSION = "castexpression";
export const PARENTHESIZEDEXPRESSION = "parenthesizedexpression";
export const DOLLAREXPRESSION = "dollarexpression";
export const TAGGEDEXPRESSION = "taggedexpression";
export const MATCHESEXPRESSION = "matchesexpression";
export const PREDICATEEXPRESSION = "predicateexpression";
export const STREAMINGCONCATENATION = "streamingconcatenation";
export const MINTYPMAXEXPRESSION = "mintypmaxexpression";
export const ROOTEXPRESSION = "rootexpression";
export const EMPTYQUEUE = "emptyqueue";
export const NAMEDCONNECTION = "namedconnection";
export const EMPTYARGUMENT = "emptyargument";

/** Its own kinds, in its `Term`'s order: the Preprocessor's `macrousage` and invalid syntax are its `Term`'s too. */
export const TAGS: readonly string[] = [LITERAL, CONSTANT, NAMEEXPRESSION, MEMBEREXPRESSION, INDEXEXPRESSION, RANGESELECT,
  UNARYEXPRESSION, INCREMENTEXPRESSION, BINARYEXPRESSION, ASSIGNMENTEXPRESSION, CONDITIONALEXPRESSION, INSIDEEXPRESSION,
  VALUERANGE, CONCATENATION, REPLICATION, ASSIGNMENTPATTERN, PATTERNITEM, THISEXPRESSION, SUPEREXPRESSION, NEWEXPRESSION,
  NEWCOPYEXPRESSION, NEWARRAYEXPRESSION, RANDOMIZEWITHEXPRESSION, ARRAYMETHODWITHEXPRESSION, CALLEXPRESSION, SYSTEMCALL,
  CASTEXPRESSION, PARENTHESIZEDEXPRESSION, DOLLAREXPRESSION, TAGGEDEXPRESSION, MATCHESEXPRESSION, PREDICATEEXPRESSION,
  STREAMINGCONCATENATION, MINTYPMAXEXPRESSION, ROOTEXPRESSION, EMPTYQUEUE, NAMEDCONNECTION, EMPTYARGUMENT];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = ["AttributeInstance", "AttributeSpec", "Identifier", "ScopedName", "LocalName", "ParameterizedName",
  "InterfaceTypeName", "InterfaceMethodName", "UnitName", "StreamItem"];

/** The system functions its evaluator computes. */
export const SYSTEM: readonly string[] = ["$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0",
  "$isunknown"];
/** The array reduction methods, which may have a `with` clause. */
export const REDUCTIONS: readonly string[] = ["sum", "product", "and", "or", "xor"];
/** The array methods of no arguments its evaluator computes. */
export const METHODS: readonly string[] = ["size", ...REDUCTIONS, "min", "max", "unique"];
/** The bases a literal or a constant is written in, by its letter, with the bits a digit holds (decimal: none). */
export const BASES: Readonly<Record<string, number>> = { b: 1, o: 3, h: 4, d: 0 };
/** A time literal's units (5.8). */
export const UNITS: readonly string[] = ["s", "ms", "us", "ns", "ps", "fs"];
/** A literal's spelling: what its text writes beside its value, not what it is. Its base and signedness are what it is:
 * an unsized based integer (`'hFF`) is unsigned, a decimal one (`255`) signed (5.7.1). */
export const SPELLING: readonly string[] = ["text", "problems", "separators", "triple"];

const RANGE_OPERATORS = [":", "+:", "-:"];
const STREAM_OPERATORS = [">>", "<<"];
const TOLERANCE_OPERATORS = ["+/-", "+%-"];

// --- Editions: IEEE 1364's and IEEE 1800's, oldest first ---

/** The editions of Verilog (IEEE 1364) and SystemVerilog (IEEE 1800), oldest first: each its designation, as the IEEE
 * writes it, its standard's number, its year, its common name, as mbse-programs labels it, and that name spelled as an
 * identifier, by which a define's frame binds it. IEEE 1800-2009 merged IEEE 1364: every edition of IEEE 1800 has what
 * the last of IEEE 1364 has. */
export const EDITIONS: readonly (readonly [string, string, number, string, string])[] = [
  ["IEEE Std 1364-1995", "1364", 1995, "Verilog-1995", "Verilog_1995"],
  ["IEEE Std 1364-2001", "1364", 2001, "Verilog-2001", "Verilog_2001"],
  ["IEEE Std 1364-2005", "1364", 2005, "Verilog-2005", "Verilog_2005"],
  ["IEEE Std 1800-2005", "1800", 2005, "SystemVerilog-2005", "SystemVerilog_2005"],
  ["IEEE Std 1800-2009", "1800", 2009, "SystemVerilog-2009", "SystemVerilog_2009"],
  ["IEEE Std 1800-2012", "1800", 2012, "SystemVerilog-2012", "SystemVerilog_2012"],
  ["IEEE Std 1800-2017", "1800", 2017, "SystemVerilog-2017", "SystemVerilog_2017"],
  ["IEEE Std 1800-2023", "1800", 2023, "SystemVerilog-2023", "SystemVerilog_2023"],
];

/** The edition each of its kinds arrived in, by its index in `EDITIONS`, from mbse-programs' `SINCE` (`sv()`, IEEE
 * 1800-2005, 3); a kind not listed is in every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map([INCREMENTEXPRESSION, INSIDEEXPRESSION, VALUERANGE,
  ASSIGNMENTPATTERN, THISEXPRESSION, SUPEREXPRESSION, NEWEXPRESSION, NEWCOPYEXPRESSION, NEWARRAYEXPRESSION,
  RANDOMIZEWITHEXPRESSION, ARRAYMETHODWITHEXPRESSION, CASTEXPRESSION, DOLLAREXPRESSION, TAGGEDEXPRESSION, MATCHESEXPRESSION,
  PREDICATEEXPRESSION, STREAMINGCONCATENATION, ROOTEXPRESSION, EMPTYQUEUE].map((tag) => [tag, 3]));

/** The kinds each edition from `EDITIONS[first]` on has, of a dialect's kinds (`every`, each schema by its tag): those
 * whose edition (`since`, by index; the first where not listed) is no later than it. */
export function editions(every: ReadonlyMap<string, any>, since: ReadonlyMap<string, number>, first = 0): any[][] {
  const found: any[][] = [];
  for (let index = first; index < EDITIONS.length; index++) {
    found.push([...every].filter(([tag]) => (since.get(tag) ?? first) <= index).map(([, schema]) => schema));
  }
  return found;
}

/** SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds, the
 * helpers they hold, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Expressions`: run after
 * `Framework.install`, in a transaction of its own; run again, it writes nothing. Its holder,
 * `Expressions.SystemVerilog.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. Its branches are added to the `Term`s of `Types`, `Patterns`, `Assertions` and `Constraints` too, each
 * created where its install has not run: the six installs run in any order. Its kinds of domain, `logic` and `bit`, and
 * its 2-state domains' schemas; its domains `define` writes after it. Run after IEEE 754's install, whose kind its reals
 * are of. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  /** Its `Term`'s branches, which the sublanguages' `Term`s list too. */
  const own = (_: any) => [
    (t: any) => t.name("literal").schema([_.Literal]),
    (t: any) => t.name("constant").schema([_.Constant]),
    (t: any) => t.name("nameexpression").schema([_.NameExpression]),
    (t: any) => t.name("memberexpression").schema([_.MemberExpression]),
    (t: any) => t.name("indexexpression").schema([_.IndexExpression]),
    (t: any) => t.name("rangeselect").schema([_.RangeSelect]),
    (t: any) => t.name("unaryexpression").schema([_.UnaryExpression]),
    (t: any) => t.name("incrementexpression").schema([_.IncrementExpression]),
    (t: any) => t.name("binaryexpression").schema([_.BinaryExpression]),
    (t: any) => t.name("assignmentexpression").schema([_.AssignmentExpression]),
    (t: any) => t.name("conditionalexpression").schema([_.ConditionalExpression]),
    (t: any) => t.name("insideexpression").schema([_.InsideExpression]),
    (t: any) => t.name("valuerange").schema([_.ValueRange]),
    (t: any) => t.name("concatenation").schema([_.Concatenation]),
    (t: any) => t.name("replication").schema([_.Replication]),
    (t: any) => t.name("assignmentpattern").schema([_.AssignmentPattern]),
    (t: any) => t.name("patternitem").schema([_.PatternItem]),
    (t: any) => t.name("thisexpression").schema([_.ThisExpression]),
    (t: any) => t.name("superexpression").schema([_.SuperExpression]),
    (t: any) => t.name("newexpression").schema([_.NewExpression]),
    (t: any) => t.name("newcopyexpression").schema([_.NewCopyExpression]),
    (t: any) => t.name("newarrayexpression").schema([_.NewArrayExpression]),
    (t: any) => t.name("randomizewithexpression").schema([_.RandomizeWithExpression]),
    (t: any) => t.name("arraymethodwithexpression").schema([_.ArrayMethodWithExpression]),
    (t: any) => t.name("callexpression").schema([_.CallExpression]),
    (t: any) => t.name("systemcall").schema([_.SystemCall]),
    (t: any) => t.name("castexpression").schema([_.CastExpression]),
    (t: any) => t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
    (t: any) => t.name("dollarexpression").schema([_.DollarExpression]),
    (t: any) => t.name("taggedexpression").schema([_.TaggedExpression]),
    (t: any) => t.name("matchesexpression").schema([_.MatchesExpression]),
    (t: any) => t.name("predicateexpression").schema([_.PredicateExpression]),
    (t: any) => t.name("streamingconcatenation").schema([_.StreamingConcatenation]),
    (t: any) => t.name("mintypmaxexpression").schema([_.MinTypMaxExpression]),
    (t: any) => t.name("rootexpression").schema([_.RootExpression]),
    (t: any) => t.name("emptyqueue").schema([_.EmptyQueue]),
    (t: any) => t.name("namedconnection").schema([_.NamedConnection]),
    (t: any) => t.name("emptyargument").schema([_.EmptyArgument]),
    (t: any) => t.name("error").schema([Framework.Error]),
    (t: any) => t.name("missing").schema([Framework.Missing]),
  ];
  return txn.uid("mbse.Expressions.SystemVerilog.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
      .symbols({Kinds: S.OfUnion, DomainKind: S.OfUnion, OfLogic: S.OfObject, OfBit: S.OfObject,  // Kinds: the framework's
                Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
                Expression: S.OfObject, Name: S.OfUnion,
                // the sublanguages' unions, each its install's, created here where it has not run
                TypesTerm: S.OfUnion, PatternsTerm: S.OfUnion, AssertionsTerm: S.OfUnion,
                ConstraintsTerm: S.OfUnion,
                Literal: S.OfObject, Constant: S.OfObject, NameExpression: S.OfObject,
                MemberExpression: S.OfObject, IndexExpression: S.OfObject, RangeSelect: S.OfObject,
                UnaryExpression: S.OfObject, IncrementExpression: S.OfObject, BinaryExpression: S.OfObject,
                AssignmentExpression: S.OfObject, ConditionalExpression: S.OfObject,
                InsideExpression: S.OfObject, ValueRange: S.OfObject, Concatenation: S.OfObject,
                Replication: S.OfObject, AssignmentPattern: S.OfObject, PatternItem: S.OfObject,
                ThisExpression: S.OfObject, SuperExpression: S.OfObject, NewExpression: S.OfObject,
                NewCopyExpression: S.OfObject, NewArrayExpression: S.OfObject,
                RandomizeWithExpression: S.OfObject, ArrayMethodWithExpression: S.OfObject,
                CallExpression: S.OfObject, SystemCall: S.OfObject, CastExpression: S.OfObject,
                ParenthesizedExpression: S.OfObject, DollarExpression: S.OfObject,
                TaggedExpression: S.OfObject, MatchesExpression: S.OfObject, PredicateExpression: S.OfObject,
                StreamingConcatenation: S.OfObject, StreamItem: S.OfObject, MinTypMaxExpression: S.OfObject,
                RootExpression: S.OfObject, EmptyQueue: S.OfObject, NamedConnection: S.OfObject,
                EmptyArgument: S.OfObject, AttributeInstance: S.OfObject, AttributeSpec: S.OfObject,
                Identifier: S.OfObject, ScopedName: S.OfObject, LocalName: S.OfObject,
                ParameterizedName: S.OfObject, InterfaceTypeName: S.OfObject,
                InterfaceMethodName: S.OfObject, UnitName: S.OfObject,  // FrameworkTerm: the framework's, by name
                bit: S.OfAny, byte: S.OfAny, shortint: S.OfAny, int: S.OfAny, longint: S.OfAny,
                real: S.OfAny, shortreal: S.OfAny})
      .spec([
          // its dialect: the singleton `Expressions.SystemVerilog.Expressions`, a branch of the framework's kind union of dialects
          (_: any) => _.Dialect.name("Expressions.SystemVerilog.Expressions.Dialect").ref(true).singleton("Expressions.SystemVerilog.Expressions").adjacencies({
              domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
              operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
              standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
          (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
              (t: any) => t.name("systemverilog").schema([_.Dialect])]),
          // its union of its kinds: its own, and invalid syntax (the Preprocessor's install adds `macrousage`)
          (_: any) => _.Term.name("Expressions.SystemVerilog.Expressions.Term").branches(own(_)),
          // the sublanguages' unions list its branches: a subterm that may be a sublanguage's kinds or an expression
          // is of the sublanguage's `Term` ("(b)")
          (_: any) => _.TypesTerm.name("Expressions.SystemVerilog.Types.Term").branches(own(_)),
          (_: any) => _.PatternsTerm.name("Expressions.SystemVerilog.Patterns.Term").branches(own(_)),
          (_: any) => _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches(own(_)),
          (_: any) => _.ConstraintsTerm.name("Expressions.SystemVerilog.Constraints.Term").branches(own(_)),
          // its names (mbse-programs' `Name`), and `super` where a `new`'s scope holds it
          (_: any) => _.Name.name("Expressions.SystemVerilog.Expressions.Name").branches([
              (t: any) => t.name("identifier").schema([_.Identifier]),
              (t: any) => t.name("scopedname").schema([_.ScopedName]),
              (t: any) => t.name("localname").schema([_.LocalName]),
              (t: any) => t.name("parameterizedname").schema([_.ParameterizedName]),
              (t: any) => t.name("interfacetypename").schema([_.InterfaceTypeName]),
              (t: any) => t.name("interfacemethodname").schema([_.InterfaceMethodName]),
              (t: any) => t.name("unitname").schema([_.UnitName]),
              (t: any) => t.name("superexpression").schema([_.SuperExpression]),
          ]),
          // literals
          (_: any) => _.Literal.name("Expressions.SystemVerilog.Expressions.Literal").refines([Framework.Literal]).properties({
              base: S.OfStr,  // a based integer's base, as written: `b`, `o`, `d` or `h` (`'hFF`)
              signed: S.OfBool,  // a based integer written signed (`'sd5`)
              separators: S.OfBool,  // whether `_` groups its digits
              unit: S.OfStr,  // a time literal's unit: `s`, `ms`, `us`, `ns`, `ps` or `fs`
              triple: S.OfBool,  // a string written between triple quotes (IEEE 1800-2023)
          }),
          (_: any) => _.Constant.name("Expressions.SystemVerilog.Expressions.Constant").properties({
              singleton: S.OfStr,  // `null`
              fill: S.OfStr,  // `'0`, `'1`, `'x` or `'z`: `0`, `1`, `x` or `z`
              bits: S.OfStr,  // a vector's bits, MSB first, of 0, 1, x and z
              size: S.OfInt,  // a sized vector's width in bits; absent where unsized
              signed: S.OfBool,  // written signed (`8'shff`)
              base: S.OfStr,  // the base it is written in: `b`, `o`, `d` or `h`
              text: S.OfStr,  // its spelling, unvalidated
              problems: many(S.OfStr),  // what is wrong with it
          }),
          // names and selects
          (_: any) => _.NameExpression.name("Expressions.SystemVerilog.Expressions.NameExpression").properties({
              name: _.Name}),
          (_: any) => _.MemberExpression.name("Expressions.SystemVerilog.Expressions.MemberExpression").properties({
              value: _.Term, member: _.Identifier}),
          (_: any) => _.IndexExpression.name("Expressions.SystemVerilog.Expressions.IndexExpression").properties({
              value: _.Term, index: _.Term}),
          (_: any) => _.RangeSelect.name("Expressions.SystemVerilog.Expressions.RangeSelect").properties({
              value: _.Term, left: _.Term, operator: S.OfStr, right: _.Term}),
          // operators
          (_: any) => _.UnaryExpression.name("Expressions.SystemVerilog.Expressions.UnaryExpression").properties({
              operator: S.OfStr, attributes: many(_.AttributeInstance), operand: _.Term}),
          (_: any) => _.IncrementExpression.name("Expressions.SystemVerilog.Expressions.IncrementExpression").properties({
              operator: S.OfStr, postfix: S.OfBool, operand: _.Term, attributes: many(_.AttributeInstance)}),
          (_: any) => _.BinaryExpression.name("Expressions.SystemVerilog.Expressions.BinaryExpression").properties({
              left: _.Term, operator: S.OfStr, attributes: many(_.AttributeInstance), right: _.Term}),
          (_: any) => _.AssignmentExpression.name("Expressions.SystemVerilog.Expressions.AssignmentExpression").properties({
              target: _.Term, operator: S.OfStr, value: _.Term}),
          (_: any) => _.ConditionalExpression.name("Expressions.SystemVerilog.Expressions.ConditionalExpression").properties({
              condition: _.Term, attributes: many(_.AttributeInstance), consequence: _.Term,
              alternative: _.Term}),
          (_: any) => _.InsideExpression.name("Expressions.SystemVerilog.Expressions.InsideExpression").properties({
              value: _.Term, set: many(_.Term)}),
          (_: any) => _.ValueRange.name("Expressions.SystemVerilog.Expressions.ValueRange").properties({
              left: _.Term, operator: S.OfStr, right: _.Term}),  // operator: a tolerance's, `+/-` or `+%-`
          (_: any) => _.Concatenation.name("Expressions.SystemVerilog.Expressions.Concatenation").properties({
              items: many(_.Term)}),
          (_: any) => _.Replication.name("Expressions.SystemVerilog.Expressions.Replication").properties({
              count: _.Term, items: many(_.Term)}),
          (_: any) => _.AssignmentPattern.name("Expressions.SystemVerilog.Expressions.AssignmentPattern").properties({
              type: _.TypesTerm, count: _.Term, items: many(_.Term)}),
          (_: any) => _.PatternItem.name("Expressions.SystemVerilog.Expressions.PatternItem").properties({
              key: _.TypesTerm,  // absent: `default`
              value: _.Term}),
          // classes and objects
          (_: any) => _.ThisExpression.name("Expressions.SystemVerilog.Expressions.ThisExpression"),
          (_: any) => _.SuperExpression.name("Expressions.SystemVerilog.Expressions.SuperExpression"),
          (_: any) => _.NewExpression.name("Expressions.SystemVerilog.Expressions.NewExpression").properties({
              scope: _.Name, arguments: many(_.Term), defaulted: S.OfBool}),
          (_: any) => _.NewCopyExpression.name("Expressions.SystemVerilog.Expressions.NewCopyExpression").properties({
              value: _.Term}),
          (_: any) => _.NewArrayExpression.name("Expressions.SystemVerilog.Expressions.NewArrayExpression").properties({
              size: _.Term, value: _.Term}),
          (_: any) => _.RandomizeWithExpression.name("Expressions.SystemVerilog.Expressions.RandomizeWithExpression").properties({
              call: _.Term, restricted: S.OfBool, variables: many(_.Identifier), items: many(_.ConstraintsTerm)}),
          // a binder: `Let`, its call its value and its `with` expression its body, each this dialect's term
          (_: any) => _.ArrayMethodWithExpression.name("Expressions.SystemVerilog.Expressions.ArrayMethodWithExpression")
              .refines([Framework.Let]).properties({value: _.Term, body: _.Term}),
          // calls
          (_: any) => _.CallExpression.name("Expressions.SystemVerilog.Expressions.CallExpression").properties({
              callee: _.Term, attributes: many(_.AttributeInstance), arguments: many(_.AssertionsTerm)}),
          (_: any) => _.SystemCall.name("Expressions.SystemVerilog.Expressions.SystemCall").properties({
              name: S.OfStr, attributes: many(_.AttributeInstance), arguments: many(_.TypesTerm)}),
          (_: any) => _.CastExpression.name("Expressions.SystemVerilog.Expressions.CastExpression").properties({
              type: _.TypesTerm, value: _.Term}),
          (_: any) => _.ParenthesizedExpression.name("Expressions.SystemVerilog.Expressions.ParenthesizedExpression").properties({
              expression: _.Term}),
          (_: any) => _.DollarExpression.name("Expressions.SystemVerilog.Expressions.DollarExpression"),
          (_: any) => _.TaggedExpression.name("Expressions.SystemVerilog.Expressions.TaggedExpression").properties({
              member: _.Identifier, value: _.Term}),
          (_: any) => _.MatchesExpression.name("Expressions.SystemVerilog.Expressions.MatchesExpression").properties({
              value: _.Term, pattern: _.PatternsTerm}),
          (_: any) => _.PredicateExpression.name("Expressions.SystemVerilog.Expressions.PredicateExpression").properties({
              conditions: many(_.Term)}),
          (_: any) => _.StreamingConcatenation.name("Expressions.SystemVerilog.Expressions.StreamingConcatenation").properties({
              operator: S.OfStr, slice: _.TypesTerm, items: many(_.StreamItem)}),
          (_: any) => _.StreamItem.name("Expressions.SystemVerilog.Expressions.StreamItem").properties({
              expression: _.Term, left: _.Term, operator: S.OfStr, right: _.Term}),
          (_: any) => _.MinTypMaxExpression.name("Expressions.SystemVerilog.Expressions.MinTypMaxExpression").properties({
              min: _.Term, typ: _.Term, max: _.Term}),
          (_: any) => _.RootExpression.name("Expressions.SystemVerilog.Expressions.RootExpression"),
          (_: any) => _.EmptyQueue.name("Expressions.SystemVerilog.Expressions.EmptyQueue"),
          (_: any) => _.NamedConnection.name("Expressions.SystemVerilog.Expressions.NamedConnection").properties({
              name: _.Identifier, value: _.AssertionsTerm, implicit: S.OfBool}),
          (_: any) => _.EmptyArgument.name("Expressions.SystemVerilog.Expressions.EmptyArgument"),
          // attributes
          (_: any) => _.AttributeInstance.name("Expressions.SystemVerilog.Expressions.AttributeInstance").properties({
              specs: many(_.AttributeSpec)}),
          (_: any) => _.AttributeSpec.name("Expressions.SystemVerilog.Expressions.AttributeSpec").properties({
              name: _.Identifier, value: _.Term}),
          // names
          (_: any) => _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier").properties({
              spelling: S.OfStr}),
          (_: any) => _.ScopedName.name("Expressions.SystemVerilog.Expressions.ScopedName").properties({
              scope: _.Name, name: _.Name}),
          (_: any) => _.LocalName.name("Expressions.SystemVerilog.Expressions.LocalName").properties({
              name: _.Identifier}),
          (_: any) => _.ParameterizedName.name("Expressions.SystemVerilog.Expressions.ParameterizedName").properties({
              name: _.Identifier, parameters: many(_.TypesTerm)}),
          (_: any) => _.InterfaceTypeName.name("Expressions.SystemVerilog.Expressions.InterfaceTypeName").properties({
              interface: _.Identifier, name: _.Identifier}),
          (_: any) => _.InterfaceMethodName.name("Expressions.SystemVerilog.Expressions.InterfaceMethodName").properties({
              port: _.Identifier, name: _.Identifier}),
          (_: any) => _.UnitName.name("Expressions.SystemVerilog.Expressions.UnitName"),
          // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
          // to its `Term`
          (_: any) => _.Expression.name("Expressions.SystemVerilog.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
              root: _.Term}),
          // --- its kinds of domain: IEEE 1800's integrals, 4-state and 2-state, their parameters, then what follows ---
          (_: any) => _.OfLogic.name("Expressions.SystemVerilog.Expressions.OfLogic").properties({
              width: S.OfInt, signed: S.OfBool,
              least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool}),  // inferred, of its known values
          (_: any) => _.OfBit.name("Expressions.SystemVerilog.Expressions.OfBit").properties({
              width: S.OfInt, signed: S.OfBool,
              least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool}),  // inferred
          (_: any) => _.DomainKind.name("Expressions.SystemVerilog.Expressions.DomainKind").branches([
              (t: any) => t.name("logic").schema([_.OfLogic]),
              (t: any) => t.name("bit").schema([_.OfBit]),
          ]),
          (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([  // a branch added: schema extension
              (t: any) => t.name("systemverilog").schema([_.DomainKind])]),
          (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([  // a branch added: schema extension
              (t: any) => t.name("systemverilog").schema([_.Term])]),
          // --- its 2-state domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its
          // domain; a 4-state domain has none: no basic scalar holds x or z ---
          (_: any) => _.bit.name("Expressions.SystemVerilog.Expressions.bit").schemas([S.OfInt]),
          (_: any) => _.byte.name("Expressions.SystemVerilog.Expressions.byte").schemas([S.OfInt]),
          (_: any) => _.shortint.name("Expressions.SystemVerilog.Expressions.shortint").schemas([S.OfInt]),
          (_: any) => _.int.name("Expressions.SystemVerilog.Expressions.int").schemas([S.OfInt]),
          (_: any) => _.longint.name("Expressions.SystemVerilog.Expressions.longint").schemas([S.OfInt]),
          (_: any) => _.real.name("Expressions.SystemVerilog.Expressions.real").schemas([S.OfFloat]),
          (_: any) => _.shortreal.name("Expressions.SystemVerilog.Expressions.shortreal").schemas([S.OfFloat]),
      ])]))]);
}

/** SystemVerilog's dialect as data: the singleton `Expressions.SystemVerilog.Expressions` owning its domains, IEEE
 * 1800's built-in types, by name (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its
 * inferred properties, and each 2-state one related to its schema (`Expressions.SystemVerilog.Expressions.int`) by
 * `Expressions.Framework.HasDomain`; and the editions it covers, by designation (`standards`, through
 * `Expressions.Framework.Covers`): Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's IEEE Std 1800-2005,
 * 2009, 2012, 2017 and 2023, each with its formal reference's parts, its common name and the kinds it has (`SINCE`),
 * invalid syntax in none and the Preprocessor's `macrousage` the Preprocessor's. Run after `install`, in a transaction
 * of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`), each edition by its common name
 * spelled as an identifier (`SystemVerilog_2023`) and each domain by its name:
 * `store.transaction(SystemVerilog.define)[0].get("int")`. */
export function define(txn: any): any {
  const [SV, Domain] = [txn.Expressions.SystemVerilog.Expressions, txn.Expressions.Framework.Domain];
  const Standard = txn.Expressions.Framework.Standard;
  const every = new Map((SV.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = editions(every, SINCE);
  return txn.uid("mbse.Expressions.SystemVerilog.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: SV.Dialect, Verilog_1995: Standard, Verilog_2001: Standard, Verilog_2005: Standard,
      SystemVerilog_2005: Standard, SystemVerilog_2009: Standard, SystemVerilog_2012: Standard,
      SystemVerilog_2017: Standard, SystemVerilog_2023: Standard,
      logic: Domain, reg: Domain, integer: Domain, time: Domain,
      bit: Domain, byte: Domain, shortint: Domain, int: Domain, longint: Domain,
      real: Domain, shortreal: Domain })
    .spec([
      // --- the editions it covers, each by its designation, with the kinds it has ---
      (_: any) => _.dialect.standards({
        "IEEE Std 1364-1995": (e: any) => e.standard(_.Verilog_1995),
        "IEEE Std 1364-2001": (e: any) => e.standard(_.Verilog_2001),
        "IEEE Std 1364-2005": (e: any) => e.standard(_.Verilog_2005),
        "IEEE Std 1800-2005": (e: any) => e.standard(_.SystemVerilog_2005),
        "IEEE Std 1800-2009": (e: any) => e.standard(_.SystemVerilog_2009),
        "IEEE Std 1800-2012": (e: any) => e.standard(_.SystemVerilog_2012),
        "IEEE Std 1800-2017": (e: any) => e.standard(_.SystemVerilog_2017),
        "IEEE Std 1800-2023": (e: any) => e.standard(_.SystemVerilog_2023) }),
      (_: any) => _.Verilog_1995.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(1995n)).names(
        ["Verilog-1995"]).kinds(kinds[0]),
      (_: any) => _.Verilog_2001.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(2001n)).names(
        ["Verilog-2001"]).kinds(kinds[1]),
      (_: any) => _.Verilog_2005.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(2005n)).names(
        ["Verilog-2005"]).kinds(kinds[2]),
      (_: any) => _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2005n)).names(
        ["SystemVerilog-2005"]).kinds(kinds[3]),
      (_: any) => _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2009n)).names(
        ["SystemVerilog-2009"]).kinds(kinds[4]),
      (_: any) => _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2012n)).names(
        ["SystemVerilog-2012"]).kinds(kinds[5]),
      (_: any) => _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2017n)).names(
        ["SystemVerilog-2017"]).kinds(kinds[6]),
      (_: any) => _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2023n)).names(
        ["SystemVerilog-2023"]).kinds(kinds[7]),
      // --- its domains ---
      (_: any) => _.dialect.domains({
        logic: (e: any) => e.domain(_.logic), reg: (e: any) => e.domain(_.reg),
        integer: (e: any) => e.domain(_.integer), time: (e: any) => e.domain(_.time),
        bit: (e: any) => e.domain(_.bit), byte: (e: any) => e.domain(_.byte),
        shortint: (e: any) => e.domain(_.shortint), int: (e: any) => e.domain(_.int),
        longint: (e: any) => e.domain(_.longint),
        real: (e: any) => e.domain(_.real), shortreal: (e: any) => e.domain(_.shortreal),
      }),
      // 4-state, with no schema: least and greatest of its known values; "logic and reg denote the same type"
      // (IEEE 1800-2023), each its own domain, of equal properties: no synonyms
      (_: any) => _.logic.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))),
      (_: any) => _.reg.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))), // logic's equal
      (_: any) => _.integer.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(32n).signed(true).least(-2147483648n).greatest(2147483647n).ordered(true)))))),
      (_: any) => _.time.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(64n).signed(false).least(0n).greatest(18446744073709551615n).ordered(true)))))),
      // 2-state
      (_: any) => _.bit.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))).schema([SV.bit]),
      (_: any) => _.byte.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(8n).signed(true).least(-128n).greatest(127n).ordered(true)))))).schema([SV.byte]),
      (_: any) => _.shortint.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(16n).signed(true).least(-32768n).greatest(32767n).ordered(true)))))).schema([SV.shortint]),
      (_: any) => _.int.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(32n).signed(true).least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([SV.int]),
      (_: any) => _.longint.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(64n).signed(true).least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([SV.longint]),
      // IEEE 754's, as its own binary64 and binary32 are
      (_: any) => _.real.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n).radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([SV.real]),
      (_: any) => _.shortreal.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n).radix(2n).precision(24n).emax(127n).ordered(
          true)))))).schema([SV.shortreal]),
    ])]))]);
}


// --- Reading a term's helpers, what it binds and what it checks ---

function nodes(value: unknown): readonly F.Node[] {
  return Array.isArray(value) ? value : [value as F.Node];
}

/** A simple identifier, letters, digits, `_` and `$` not starting with a digit or `$`, or an escaped one: `\` and
 * printable characters up to white space, as mbse-programs checks it. */
function identifierProblems(spelling: unknown): string[] {
  if (typeof spelling !== "string" || spelling === "") return [];
  if (spelling[0] === "\\") {
    if (spelling.length > 1 && [...spelling.slice(1)].every((ch) => "!" <= ch && ch <= "~")) return [];
  } else if (!"0123456789$".includes(spelling[0] as string) && /^[A-Za-z0-9_$]+$/.test(spelling)) {
    return [];
  }
  return [`${repr(spelling)} is not an identifier`];
}

/** A system task's or function's name, `$` and letters, digits, `_` and `$`, as mbse-programs checks it. */
function systemProblems(name: unknown): string[] {
  if (typeof name !== "string" || name === "") return [];
  if (name[0] !== "$" || name.length < 2 || !/^[A-Za-z0-9_$]+$/.test(name.slice(1))) {
    return [`${repr(name)} is not a system task or function name`];
  }
  return [];
}

/** The attributes that are one of a few choices, by kind: mbse-programs' kind, the attribute, and its choices. */
const CHOICES: ReadonlyMap<string, readonly [string, string, readonly string[]]> = new Map([
  ["rangeselect", ["RangeSelect", "operator", RANGE_OPERATORS] as const],
  ["streamingconcatenation", ["StreamingConcatenation", "operator", STREAM_OPERATORS] as const],
  ["streamitem", ["StreamItem", "operator", RANGE_OPERATORS] as const],
  ["valuerange", ["ValueRange", "operator", TOLERANCE_OPERATORS] as const],
]);

/** A constant's: `null`, a fill, or bits of a size, exactly one of them, unless its text is invalid. */
export function vectorProblems(attributes: ReadonlyMap<string, any>): string[] {
  const [singleton, fill, bits] = ["singleton", "fill", "bits"].map((name) => attributes.get(name) ?? null);
  const held = [singleton, fill, bits].filter((value) => value !== null);
  if (held.length !== 1) {
    return held.length === 0 && attributes.has("problems") ? []
      : ["a constant holds a singleton, a fill or bits, exactly one of them"];
  }
  if (singleton !== null) return singleton === "null" ? [] : [`a constant's singleton must be null, got ${repr(singleton)}`];
  if (fill !== null) return ["0", "1", "x", "z"].includes(fill) ? [] : [`a constant's fill must be 0, 1, x or z, got ${repr(fill)}`];
  const found = bits !== "" && [...bits].every((b: string) => "01xz".includes(b)) ? [] : [
    `a constant's bits must be 0, 1, x and z, at least one, got ${repr(bits)}`];
  const size = attributes.get("size") ?? null;
  if (size !== null && found.length === 0 && size !== BigInt(bits.length)) {
    found.push(`a constant's size must be its number of bits, ${bits.length}, got ${size}`);
  }
  return found;
}

/** A vector's digits in a base, or null when some digit would mix x, z and known bits. */
function digitsOf(bits: string, base: string): string | null {
  const known = (group: string) => [...group].every((b) => "01".includes(b));
  if (base === "d") {
    if (known(bits)) return BigInt("0b" + bits).toString();
    return new Set(bits).size === 1 ? bits[0] as string : null;
  }
  const size = BASES[base] as number;
  if (size === 1) return bits;
  const padded = "0".repeat((size - (bits.length % size)) % size) + bits;
  const digits: string[] = [];
  for (let i = 0; i < padded.length; i += size) {
    const group = padded.slice(i, i + size);
    if (known(group)) digits.push("0123456789abcdef"[parseInt(group, 2)] as string);
    else if (new Set(group).size === 1) digits.push(group[0] as string);
    else return null;
  }
  return digits.join("");
}

/** A constant's text: as written (`text`), else its default spelling: `null`, a fill, or a vector in its base where the
 * base can write its bits, else in binary. The printer writes it, and a refusal shows it (`Kind.shown`); a constant that
 * holds no value has none ("SystemVerilog constant has no value to print"). */
export function constantText(attributes: ReadonlyMap<string, any>): string {
  if (attributes.has("text")) return attributes.get("text");
  if (vectorProblems(attributes).length > 0 || !["singleton", "fill", "bits"].some((k) => attributes.has(k))) {
    throw new ValueError("SystemVerilog constant has no value to print");
  }
  if (attributes.has("singleton")) return attributes.get("singleton");
  if (attributes.has("fill")) return "'" + attributes.get("fill");
  const bits: string = attributes.get("bits");
  let base: string = attributes.get("base") ?? "b";
  let digits = digitsOf(bits, base);
  if (digits === null) [base, digits] = ["b", bits];
  const size = attributes.get("size") ?? null;
  return `${size !== null ? size : ""}'${attributes.get("signed") ? "s" : ""}${base}${digits}`;
}

function baseProblems(attributes: ReadonlyMap<string, any>, what: string): string[] {
  const base = attributes.get("base") ?? null;
  return base === null || Object.hasOwn(BASES, base) ? [] : [`${what}'s base must be b, o, d or h, got ${repr(base)}`];
}

/** A literal holds what a constant of SystemVerilog does, an int, a float or a str (the framework's literal may hold
 * more), with what its text encodes: a base for an int, a unit for a float, `triple` for a str. */
function literalProblems(attributes: ReadonlyMap<string, any>): string[] {
  const value = attributes.get("value");
  if (!["bigint", "number", "string"].includes(typeof value)) {
    return [`a SystemVerilog literal cannot hold a ${Repr.typeName(value)}`];
  }
  const found = baseProblems(attributes, "a literal");
  const unit = attributes.get("unit") ?? null;
  if (unit !== null && (!UNITS.includes(unit) || typeof value !== "number")) {
    found.push(`a time literal's unit must be s, ms, us, ns, ps or fs, its value a float, got ${repr(unit)}`);
  }
  return found;
}

/** A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
 * identifier's spelling, a system call's name, a choice among a few, a constant's bits and mbse-programs' checks.
 * Invalid syntax stands only where a term does, which the framework's validation reads. */
export function problems(node: F.Node): string[] {
  const { kind, attributes } = node;
  const found: string[] = [];
  if (kind === "identifier") found.push(...identifierProblems(attributes.get("spelling")));
  if (kind === SYSTEMCALL) found.push(...systemProblems(attributes.get("name")));
  const choice = CHOICES.get(kind);
  if (choice !== undefined) {
    const [name, attribute, choices] = choice;
    const value = attributes.get(attribute) ?? null;
    if (value !== null && !choices.includes(value)) found.push(`${name}.${attribute} cannot be ${repr(value)}`);
  }
  if (kind === CONSTANT) found.push(...vectorProblems(attributes), ...baseProblems(attributes, "a constant"));
  if (kind === ASSIGNMENTPATTERN && (node.subterms.get("count") ?? null) !== null
    && node.many.some((item) => F.kindOf(item)[0] === PATTERNITEM)) {
    found.push("a repeated AssignmentPattern has positional items only");
  }
  if (kind === PREDICATEEXPRESSION && node.many.length < 2) found.push("a PredicateExpression has two conditions or more");
  if (kind === NEWEXPRESSION && attributes.get("defaulted") === true
    && ((node.helpers.get("scope") as F.Node | undefined)?.kind !== SUPEREXPRESSION || node.many.length > 0)) {
    found.push("a defaulted NewExpression is super.new(default)");
  }
  if (kind === "streamitem") {
    const [left, operator, right] = [node.subterms.get("left") ?? null, attributes.get("operator") ?? null, node.subterms.get("right") ?? null];
    if ((operator === null) !== (right === null) || left === null && operator !== null) {
      found.push("a StreamItem's `with` has a left, and an operator and a right, or neither");
    }
  }
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

function literalCheck(record: any): string[] {
  return literalProblems(F.attributesOf(record));
}

/** The iterator an array method's call names: its one argument's name, where it is a name (`a.sum(x)`), else `item`
 * (7.12). */
function iterator(call: any): string {
  const [tag, record] = F.kindOf(call);
  if (tag === CALLEXPRESSION) {
    const args = F.node(tag, record).many;
    if (args.length === 1 && F.kindOf(args[0])[0] === NAMEEXPRESSION) {
      const name = F.nameOf(args[0]);
      if (name !== null) return name;
    }
  }
  return "item";
}

/** What an array method's call and its `with` expression have bound: its iterator, in both (its call declares it). */
export function arrayMethodScopes(record: any): ReadonlySet<string>[] {
  const value = F.node(ARRAYMETHODWITHEXPRESSION, record).subterms.get("value") ?? null;
  const bound: ReadonlySet<string> = value !== null ? new Set([iterator(value)]) : new Set();
  return [bound, bound];
}

/** The names a condition binds where it holds: a `matches`' pattern's variables, or those of each condition of a `&&&`
 * (12.6). */
function matched(condition: any): ReadonlySet<string> {
  if (condition === null) return new Set();
  const [tag, record] = F.kindOf(condition);
  const node = F.node(tag, record);
  if (tag === MATCHESEXPRESSION && node.subterms.get("pattern") !== null) {
    return Patterns.boundNames(node.subterms.get("pattern"));
  }
  if (tag === PREDICATEEXPRESSION) return new Set(node.many.flatMap((c) => [...matched(c)]));
  return new Set();
}

/** What a conditional's arguments have bound: its condition's matched variables, in its consequence (12.6.2). */
function conditionalScopes(record: any): ReadonlySet<string>[] {
  const names = matched(F.node(CONDITIONALEXPRESSION, record).subterms.get("condition") ?? null);
  return [new Set(), names, new Set(), ...F.argumentsOf(record).slice(3).map(() => new Set<string>())];
}

/** What each condition of a `&&&` has bound: the variables the conditions before it match (12.6.2). */
function predicateScopes(record: any): ReadonlySet<string>[] {
  const found: ReadonlySet<string>[] = [];
  let names = new Set<string>();
  for (const condition of F.node(PREDICATEEXPRESSION, record).many) {
    found.push(names);
    names = new Set([...names, ...matched(condition)]);
  }
  return found;
}

/** The name of the type a cast's type writes, where it is a type SystemVerilog may define by name: an integral or a
 * real keyword, without a signing or dimensions (`int`, `logic`, `real`); null for any other type, a width or a
 * signing. */
export function typeName(value: any): string | null {
  if (value === null) return null;
  const [tag, record] = F.kindOf(value);
  const attributes = F.attributesOf(record);
  if (["integervectortype", "integeratomtype", "nonintegertype"].includes(tag) && !attributes.has("signing")
    && !attributes.has("dimensions")) {
    return attributes.get("keyword") ?? null;
  }
  return null;
}

/** A cast to a type SystemVerilog defines by name must be defined in the store of the term's holder (`Domains.NAMES`;
 * another keyword's, such as `realtime`, is not read), one to a width written as a literal is to a positive one, and
 * its checks. */
function castCheck(record: any): string[] {
  const node = F.node(CASTEXPRESSION, record);
  const target = node.subterms.get("type") ?? null;
  const found = problems(node);
  const name = typeName(target);
  const [tag, held] = target !== null ? F.kindOf(target) : [null, null];
  const width = tag === LITERAL ? F.attributesOf(held).get("value") : null;
  if (typeof width === "bigint" && width < 1n) found.push(`a cast's width must be positive, got ${width}`);
  if (name !== null && Domains.NAMES.includes(name)) {
    try {
      Domains.named(Proxies.store_of(record), name);
    } catch (error) { // a ValueError: the store defines no such type
      found.push((error as Error).message);
    }
  }
  return found;
}

/** A cast to a type SystemVerilog defines by name: that type, read from the store of the term's holder; one to a width,
 * a signing or any other type is not known statically. */
function castTyped(record: any): FD.Domain | null {
  const name = typeName(F.node(CASTEXPRESSION, record).subterms.get("type")); // a valid cast holds its type
  return name !== null && Domains.NAMES.includes(name) ? Domains.named(Proxies.store_of(record), name) : null;
}

/** A literal's type: an unsized based integer's, unsigned unless written signed, of 32 bits or as many as its value
 * needs; a decimal's or a real's, read from the store of the term's holder; null where no type holds it (a string, a
 * time). */
function literalTyped(record: any): FD.Domain | null {
  const attributes = F.attributesOf(record);
  const value = attributes.get("value");
  if (typeof value === "bigint" && attributes.has("base")) return Domains.unsized(value, Boolean(attributes.get("signed")));
  if (attributes.has("unit")) return null;
  const name = Domains.of(value);
  return name === null ? null : Domains.named(Proxies.store_of(record), name);
}

/** A constant's type: a vector's, of its size and signedness (an unsized one's 32 bits, or as many as it has); a fill's
 * or `null`'s is not known statically. */
function constantTyped(record: any): FD.Domain | null {
  const attributes = F.attributesOf(record);
  if (vectorProblems(attributes).length > 0 || !attributes.has("bits")) return null;
  const bits = attributes.get("bits") as string;
  const size = attributes.has("size") ? Number(attributes.get("size")) : Math.max(bits.length, 32);
  return Domains.vector(size, Boolean(attributes.get("signed")));
}

/** An operator's result domain, of its operands' (an operator's attributes' terms aside); an operator outside its
 * vocabulary, an extension, is not known. */
function apply(vocabulary: ReadonlyMap<string, FD.Signature>, attributes: ReadonlyMap<string, any>,
  domains: FD.Domain[]): FD.Domain {
  const operator = attributes.get("operator") as string;
  const signature = vocabulary.get(operator);
  if (signature === undefined) return FD.Anything;
  const result = signature.result(domains);
  if (result === null) {
    const names = domains.map((domain) => domain.name()).join(", ");
    throw new TypeError(`${operator} cannot take (${names}); it takes ${signature.describe()}`);
  }
  return result;
}

/** `===`'s and `!==`'s type, `bit`, read from the store of the term's holder; the others' are their operands'. */
function binaryTyped(record: any): FD.Domain | null {
  const operator = F.attributesOf(record).get("operator");
  return operator === "===" || operator === "!==" ? Domains.named(Proxies.store_of(record), "bit") : null;
}

/** The domain of a literal no type holds: a string, or an int beyond 64 bits (`Kind.typed` reads the others'). */
export function untyped(_value?: unknown): FD.Domain {
  return FD.Anything;
}

/** The literal of a native value: a bigint, a number or a string. */
export function native(value: unknown): Writer | null {
  return ["bigint", "number", "string"].includes(typeof value) ? literal(value) : null;
}

/** The subterms of a kind's helpers that may be empty, wherever they nest: an attribute's value (`(* keep *)`). */
const OPTIONAL: readonly string[] = ["*.value"];

/** How the framework reads SystemVerilog's kinds. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, signature: FD.Signature = new FD.Opaque(), options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature, check: check(tag), ...options,
      optional: [...(options.optional ?? []), ...OPTIONAL] });
  /** An operator's kind: its vocabulary, every operator checked against it with `core`; its result its operands' (`arity`
   * of them), whatever its attributes hold. */
  const operator = (tag: string, vocabulary: ReadonlyMap<string, FD.Signature>, arity: number, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required: ["operator"],
      operators: (attributes) => [attributes.get("operator") as string],
      result: (attributes, domains) => apply(vocabulary, attributes, domains.slice(0, arity)),
      check: check(tag), optional: OPTIONAL, ...options });
  return {
    [LITERAL]: new F.Kind(F.LITERAL, { spelling: SPELLING, check: literalCheck, typed: literalTyped }),
    [CONSTANT]: new F.Kind(F.LITERAL, {
      spelling: SPELLING, check: check(CONSTANT), typed: constantTyped,
      shown: constantText,
    }),
    [NAMEEXPRESSION]: new F.Kind(F.REFERENCE, { required: ["name"], check: check(NAMEEXPRESSION) }),
    [MEMBEREXPRESSION]: application(MEMBEREXPRESSION, Domains.MEMBER, { required: ["member"] }),
    [INDEXEXPRESSION]: application(INDEXEXPRESSION, Domains.SELECT),
    [RANGESELECT]: application(RANGESELECT, Domains.RANGE, { required: ["operator"] }),
    [UNARYEXPRESSION]: operator(UNARYEXPRESSION, Domains.UNARY, 1),
    [INCREMENTEXPRESSION]: operator(INCREMENTEXPRESSION, Domains.INCREMENT, 1),
    [BINARYEXPRESSION]: operator(BINARYEXPRESSION, Domains.BINARY, 2, { typed: binaryTyped }),
    [ASSIGNMENTEXPRESSION]: operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT, 2),
    [CONDITIONALEXPRESSION]: application(CONDITIONALEXPRESSION, Domains.CONDITIONAL, { scopes: conditionalScopes }),
    [INSIDEEXPRESSION]: application(INSIDEEXPRESSION, Domains.INSIDE),
    [VALUERANGE]: application(VALUERANGE, Domains.SPAN),
    [CONCATENATION]: application(CONCATENATION),
    [REPLICATION]: application(REPLICATION),
    [ASSIGNMENTPATTERN]: application(ASSIGNMENTPATTERN, new FD.Opaque(), { optional: ["type", "count"] }),
    [PATTERNITEM]: application(PATTERNITEM, new FD.Opaque(), { optional: ["key"] }),
    [THISEXPRESSION]: application(THISEXPRESSION),
    [SUPEREXPRESSION]: application(SUPEREXPRESSION),
    [NEWEXPRESSION]: application(NEWEXPRESSION),
    [NEWCOPYEXPRESSION]: application(NEWCOPYEXPRESSION),
    [NEWARRAYEXPRESSION]: application(NEWARRAYEXPRESSION, new FD.Opaque(), { optional: ["value"] }),
    [RANDOMIZEWITHEXPRESSION]: application(RANDOMIZEWITHEXPRESSION),
    [ARRAYMETHODWITHEXPRESSION]: new F.Kind(F.BINDING, { signature: new FD.Opaque(), scopes: arrayMethodScopes,
      check: check(ARRAYMETHODWITHEXPRESSION) }),
    [CALLEXPRESSION]: application(CALLEXPRESSION),
    [SYSTEMCALL]: application(SYSTEMCALL, new FD.Opaque(), { required: ["name"] }),
    [CASTEXPRESSION]: application(CASTEXPRESSION, Domains.CAST, { check: castCheck, typed: castTyped }),
    [PARENTHESIZEDEXPRESSION]: application(PARENTHESIZEDEXPRESSION, Domains.PARENTHESIZED),
    [DOLLAREXPRESSION]: application(DOLLAREXPRESSION),
    [TAGGEDEXPRESSION]: application(TAGGEDEXPRESSION, new FD.Opaque(), { required: ["member"], optional: ["value"] }),
    [MATCHESEXPRESSION]: application(MATCHESEXPRESSION),
    [PREDICATEEXPRESSION]: application(PREDICATEEXPRESSION, new FD.Opaque(), { scopes: predicateScopes }),
    [STREAMINGCONCATENATION]: application(STREAMINGCONCATENATION, new FD.Opaque(), { required: ["operator"],
      optional: ["slice", "items.left", "items.right"] }),
    [MINTYPMAXEXPRESSION]: application(MINTYPMAXEXPRESSION),
    [ROOTEXPRESSION]: application(ROOTEXPRESSION),
    [EMPTYQUEUE]: application(EMPTYQUEUE),
    [NAMEDCONNECTION]: application(NAMEDCONNECTION, new FD.Opaque(), { required: ["name"], optional: ["value"] }),
    [EMPTYARGUMENT]: application(EMPTYARGUMENT),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog dialect: its kinds, as the framework reads them, and the terms of its sublanguages' dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Expressions", kinds(), { domain_of: untyped, literal: native, reads });

// --- Writers ---

/** A SystemVerilog term, written through the builders where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

function specOf(value: unknown): F.Writer {
  return DIALECT.spec(value);
}

/** An identifier, of its spelling. */
function identifierOf(spelling: string): (i: any) => any {
  return (i: any) => i.spelling(spelling);
}

/** An unsized integer, a real or a string literal (validation reports any other value). */
export function literal(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** A sized literal of `bits`, MSB first: a constant of as many bits, `signed` or not, written in `base`. */
export function vector(bits: string, signed: boolean | null = null, base: string | null = null): Writer {
  return new Writer((u: any) => u.constant((r: any) => {
    r.bits(bits).size(BigInt(bits.length));
    if (signed !== null) r.signed(signed);
    return base !== null ? r.base(base) : r;
  }));
}

/** The name `name` used as a value: a `nameexpression` of the identifier. */
export function identifier(name: string): Writer {
  return new Writer((u: any) => u.nameexpression((r: any) => r.name((n: any) => n.identifier(identifierOf(name)))));
}

/** `<operator> operand`; the operand is a spec (a native value is a literal). */
export function unary(operator: string, operand: unknown): Writer {
  const written = specOf(operand);
  return new Writer((u: any) => u.unaryexpression((r: any) => r.operator(operator).operand(written)));
}

/** `left <operator> right`; each operand a spec. */
export function binary(operator: string, left: unknown, right: unknown): Writer {
  const [l, r_] = [specOf(left), specOf(right)];
  return new Writer((u: any) => u.binaryexpression((r: any) => r.left(l).operator(operator).right(r_)));
}

/** `condition ? consequence : alternative`. */
export function conditional(condition: unknown, consequence: unknown, alternative: unknown): Writer {
  const [c, t, f] = [specOf(condition), specOf(consequence), specOf(alternative)];
  return new Writer((u: any) => u.conditionalexpression((r: any) => r.condition(c).consequence(t).alternative(f)));
}

/** `{items}`. */
export function concatenation(...items: unknown[]): Writer {
  const specs = items.map(specOf);
  return new Writer((u: any) => u.concatenation((r: any) => r.items(specs)));
}

/** `{count{items}}`. */
export function replication(count: unknown, ...items: unknown[]): Writer {
  const [c, specs] = [specOf(count), items.map(specOf)];
  return new Writer((u: any) => u.replication((r: any) => r.count(c).items(specs)));
}

/** `value[index]`: an `indexexpression`. */
export function select(value: unknown, index: unknown): Writer {
  const [v, i] = [specOf(value), specOf(index)];
  return new Writer((u: any) => u.indexexpression((r: any) => r.value(v).index(i)));
}

/** `value[left:right]`: a `rangeselect`. */
export function range_(value: unknown, left: unknown, right: unknown): Writer {
  const [v, l, r_] = [specOf(value), specOf(left), specOf(right)];
  return new Writer((u: any) => u.rangeselect((r: any) => r.value(v).left(l).operator(":").right(r_)));
}

/** `value inside {items}`, its items values or `span`s. */
export function inside(value: unknown, ...items: unknown[]): Writer {
  const [v, specs] = [specOf(value), items.map(specOf)];
  return new Writer((u: any) => u.insideexpression((r: any) => r.value(v).set(specs)));
}

/** `[left:right]`, an item of `inside`: a `valuerange`. */
export function span(left: unknown, right: unknown): Writer {
  const [l, r_] = [specOf(left), specOf(right)];
  return new Writer((u: any) => u.valuerange((r: any) => r.left(l).right(r_)));
}

/** `type'(operand)`: `type` a spec of `Types`' `Term`, written through the builders (`(t) =>
 * t.integeratomtype((a) => a.keyword("int"))`), or a bigint, a width (`8'(x)`). */
export function cast(type: unknown, operand: unknown): Writer {
  const [t, v] = [F.spec(type, native), specOf(operand)];
  return new Writer((u: any) => u.castexpression((r: any) => r.type(t).value(v)));
}

/** `value.name`. */
export function member(value: unknown, name: string): Writer {
  const v = specOf(value);
  return new Writer((u: any) => u.memberexpression((r: any) => r.value(v).member(identifierOf(name))));
}

/** `fn(args)`: a system function's call (`$clog2`, a name starting with `$`: a `systemcall`), or a call of the function
 * the name names (a `callexpression`). */
export function call(fn: string, ...args: unknown[]): Writer {
  const specs = args.map(specOf);
  if (fn.startsWith("$")) return new Writer((u: any) => u.systemcall((r: any) => r.name(fn).arguments(specs)));
  const callee = identifier(fn);
  return new Writer((u: any) => u.callexpression((r: any) => r.callee(callee).arguments(specs)));
}

/** `array.name(args)`: a call of an array's method. */
export function method(array: unknown, name: string, ...args: unknown[]): Writer {
  const [callee, specs] = [member(array, name), args.map(specOf)];
  return new Writer((u: any) => u.callexpression((r: any) => r.callee(callee).arguments(specs)));
}

/** `array.method(name) with (body)`: an `arraymethodwithexpression`, its iterator `name`. */
export function iterate(array: unknown, method_: string, name: string, body: unknown): Writer {
  const [called, b] = [method(array, method_, identifier(name)), specOf(body)];
  return new Writer((u: any) => u.arraymethodwithexpression((r: any) => r.value(called).body(b)));
}
