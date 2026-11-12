/**
 * Expressions of the POSIX BRE dialect: POSIX's basic regular expressions (IEEE Std 1003.1, XBD 9.3, its grammar
 * 9.5.2), as grep reads its patterns (XCU grep), and as C++'s `std::regex` reads them under its `basic` and `grep`
 * grammars ([re.synopt]).
 *
 * It is a dialect of the POSIX family (the dialects proposal, Decided for stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"; the user, 2026-11-12: "yes to a new posix family"),
 * named `POSIX BRE` (`Terms.dialectName`), its tag `posix_bre`. Its terms are values of its `Term`,
 * `Expressions.POSIX.BRE.Term`, the branch `posix_bre` of `Expressions.Framework.Term`; its holder,
 * `Expressions.POSIX.BRE.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. Its
 * kinds, their checks and its editions are the family's (`POSIX/Kinds`): `patternlist`, `pattern`, `alternative`,
 * `capturinggroup` (`\(...\)`), `quantifier` (`*`, `\{m,n\}`), `characterclass`, `characterclassrange`,
 * `characterset` (`.`), `character`, `assertion` (`^`, `$`, where a BRE begins and ends), `backreference` (`\1` to
 * `\9`), `exclass`, `collatingelement` and `equivalence`, then invalid syntax. `DIALECT` reads its kinds, and the
 * family's other dialect's terms (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
 * [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
 * through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(u) => u.character((c) => c.value(97n))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as K from "../Kinds.js";
import * as ERE from "../ERE/Expressions.js";

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = K.tags(K.BRE);

/** Its own helpers, the value object schemas its kinds hold that are no kind: none. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in POSIX.1's editions (`EDITIONS`): none, so each is in
 * every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** What each kind's terms may be, by property, besides invalid syntax: a quantifier's element no quantifier and no
 * anchor (`nondupl_BRE BRE_dupl_symbol`). */
export const HOLDS: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> = K.holds(K.BRE);

export const EDITIONS = K.EDITIONS;

/** POSIX BRE's union of its kinds, added to the framework's terms as the branch `posix_bre`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.POSIX.BRE`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other install; run again, it writes nothing. */
export function install(txn: any): any {
  return K.install(K.BRE, txn);
}

/** POSIX BRE's dialect as data: the singleton `Expressions.POSIX.BRE` owning the editions it covers, POSIX.1's, by
 * designation, each with every kind. Run after `install`, in a transaction of its own; run again, it writes
 * nothing. */
export function define(txn: any): any {
  return K.define(K.BRE, txn);
}

/** The family's other dialect, read when first needed: POSIX ERE's. */
function reads(): readonly F.Dialect[] {
  return [ERE.DIALECT];
}

/** The POSIX BRE dialect: its kinds, as the framework reads them, and its family's other dialect's terms. */
export const DIALECT = new F.Dialect("POSIX.BRE", K.kinds(K.BRE), { domain_of: () => FD.Anything, reads });
