/**
 * Expressions of the POSIX ERE dialect: POSIX's extended regular expressions (IEEE Std 1003.1, XBD 9.4, its grammar
 * 9.5.3, with 9.5.2's bracket expressions), as grep reads its patterns with `-E` and awk its EREs (XCU grep, awk), and as
 * C++'s `std::regex` reads them under its `extended`, `awk` and `egrep` grammars ([re.synopt]); awk's escapes are a way of
 * printing an ERE's characters (`Text.text`'s `awk`), not a grammar of their own.
 *
 * It is a dialect of the POSIX family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"; the user, 2026-11-12: "yes to a new posix family"),
 * named `POSIX ERE` (`Terms.dialectName`), its tag `posix_ere`. Its terms are values of its `Term`,
 * `Expressions.POSIX.ERE.Term`, the branch `posix_ere` of `Expressions.Framework.Term`; its holder,
 * `Expressions.POSIX.ERE.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. Its
 * kinds, their checks and its editions are the family's (`POSIX/Kinds`): `patternlist`, `pattern`, `alternative`,
 * `capturinggroup` (`(...)`), `quantifier` (`*`, `+`, `?`, `{m,n}`, lazy where not `greedy`), `characterclass`,
 * `characterclassrange`, `characterset` (`.`), `character`, `assertion` (`^`, `$`, anywhere), `exclass`,
 * `collatingelement` and `equivalence`, then invalid syntax; no backreference, which an ERE has not. `DIALECT` reads its
 * kinds, and the family's other dialect's terms (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
 * [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
 * through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(u) => u.character((c) => c.value(97n))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as K from "../Kinds.js";
import * as BRE from "../BRE/Expressions.js";

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = K.tags(K.ERE);

/** Its own helpers, the value object schemas its kinds hold that are no kind: none. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in POSIX.1's editions (`EDITIONS`): none, so each is in
 * every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** What each kind's terms may be, by property, besides invalid syntax: a quantifier's element any atom, a quantifier
 * or an anchor too (`ERE_expression ERE_dupl_symbol`). */
export const HOLDS: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> = K.holds(K.ERE);

export const EDITIONS = K.EDITIONS;

/** POSIX ERE's union of its kinds, added to the framework's terms as the branch `posix_ere`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.POSIX.ERE`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other install; run again, it writes nothing. */
export function install(txn: any): any {
  return K.install(K.ERE, txn);
}

/** POSIX ERE's dialect as data: the singleton `Expressions.POSIX.ERE` owning the editions it covers, POSIX.1's, by
 * designation, each with every kind. Run after `install`, in a transaction of its own; run again, it writes
 * nothing. */
export function define(txn: any): any {
  return K.define(K.ERE, txn);
}

/** The family's other dialect, read when first needed: POSIX BRE's. */
function reads(): readonly F.Dialect[] {
  return [BRE.DIALECT];
}

/** The POSIX ERE dialect: its kinds, as the framework reads them, and its family's other dialect's terms. */
export const DIALECT = new F.Dialect("POSIX.ERE", K.kinds(K.ERE), { domain_of: () => FD.Anything, reads });
