<!-- nav -->
[← Domains as data](../domains/README.md) · [Home](../../../README.md) · [What is evaluated, and in which dialect →](../evaluation/README.md)

# Tutorials, from domains and trivial expressions up

This proposal rebuilt this repository's tutorials, as the user asked (2026-11-10): "Before moving to `mbse-programs`,
`mbse-expressions/<language>/tutorials` needs an overhaul. The content seems to focus entirely on constraints, which
should be preceded by Jupyter notebooks that serve as both tutorial and test, building up knowledge of how domains are
represented, how native expressions correspond to modeled expressions starting with trivial expressions and building
up complexity." It was merged on 2026-11-11 (#33), built in both languages, and released as mbse-expressions 0.10.0:

1. **The scaffold** (#35): the toolkit's `dialects()`; the seven case studies on constraints renamed 9 to 15, their
   steps renumbered, T01.3 and T07.5 removed; one README per language for the two parts; the skill relinked; SKL-05,
   every tutorial with the same steps in both languages.
2. **Part I, tutorials 1 to 6** (#35): values and their domains; one value, a domain in each language; the smallest
   expression, a literal; names; operators; calls, members and subscripts.
3. **Part II trimmed** (#35): each step Part I now teaches pointing back to it.
4. **Tutorial 7, bindings** (#37), and **tutorial 8, sublanguages** (#38), after the retrofit; then tutorial 8's pages,
   8.01 to 8.17, one for each sublanguage dialect (#44), as the user asked of it (2026-11-12).

Its content is drained into mbse-basis
[CAP-303: mbse-expressions' tutorials, from domains and trivial expressions up](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-303.md),
which holds what was built, the user's request and decisions, and the choices agents made for review; *Values with
widths*, deferred with domain inference, is
[CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md#decided)'s.
The tutorials themselves are [the tutorial](../../../python3/tutorials/README.md), and the same in
[TypeScript](../../../typescript5/tutorials/README.md).

---

<!-- nav -->
[← Domains as data](../domains/README.md) · [Home](../../../README.md) · [What is evaluated, and in which dialect →](../evaluation/README.md)
