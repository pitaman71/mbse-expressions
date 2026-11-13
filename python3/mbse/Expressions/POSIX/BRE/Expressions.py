"""Expressions of the POSIX BRE dialect: POSIX's basic regular expressions (IEEE Std 1003.1, XBD 9.3, its grammar
9.5.2), as grep reads its patterns (XCU grep), and as C++'s `std::regex` reads them under its `basic` and `grep`
grammars ([re.synopt]).

It is a dialect of the POSIX family (the dialects proposal, Decided for stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect"; the user, 2026-11-12: "yes to a new posix family"),
named `POSIX BRE` (`Terms.dialect_name`), its tag `posix_bre`. Its terms are values of its `Term`,
`Expressions.POSIX.BRE.Term`, the branch `posix_bre` of `Expressions.Framework.Term`; its holder,
`Expressions.POSIX.BRE.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. Its
kinds, their checks and its editions are the family's (`POSIX.Kinds`): `patternlist`, `pattern`, `alternative`,
`capturinggroup` (`\\(...\\)`), `quantifier` (`*`, `\\{m,n\\}`), `characterclass`, `characterclassrange`,
`characterset` (`.`), `character`, `assertion` (`^`, `$`, where a BRE begins and ends), `backreference` (`\\1` to
`\\9`), `exclass`, `collatingelement` and `equivalence`, then invalid syntax. `DIALECT` reads its kinds, and the
family's other dialect's terms (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
[CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda u: u.character(lambda c: c.value(ord("a")))`."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from .. import Kinds as K

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "HOLDS", "EDITIONS"]

TAGS = K.tags(K.BRE)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in POSIX.1's editions (`EDITIONS`): none, so each is in
every edition."""

HOLDS = K.holds(K.BRE)
"""What each kind's terms may be, by property, besides invalid syntax: a quantifier's element no quantifier and no
anchor (`nondupl_BRE BRE_dupl_symbol`)."""

EDITIONS = K.EDITIONS


def install(txn: Any) -> Any:
    """POSIX BRE's union of its kinds, added to the framework's terms as the branch `posix_bre`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.POSIX.BRE`: run after `Framework.install`, in a transaction of its
    own, before or after its family's other install; run again, it writes nothing."""
    return K.install(K.BRE, txn)


def define(txn: Any) -> Any:
    """POSIX BRE's dialect as data: the singleton `Expressions.POSIX.BRE` owning the editions it covers, POSIX.1's, by
    designation, each with every kind. Run after `install`, in a transaction of its own; run again, it writes
    nothing."""
    return K.define(K.BRE, txn)


def _reads() -> tuple[F.Dialect, ...]:
    """The family's other dialect, imported when first needed: POSIX ERE's."""
    from ..ERE import Expressions as ERE
    return (ERE.DIALECT,)


DIALECT = F.Dialect("POSIX.BRE", K.kinds(K.BRE), domain_of=lambda value: FD.Anything, reads=_reads)
"""The POSIX BRE dialect: its kinds, as the framework reads them, and its family's other dialect's terms."""
