<!-- nav -->
[← Complete expression dialects](../dialects/README.md) · [Home](../../../README.md)

# Domains as data

This proposal made a domain schema-governed data, held in a store like any other model, with only the arithmetic it
implies left as code: there had been two forms of a domain, the stored one and a "working" code object, and the user
agreed there should be none: "Yes, write it up". It was built in four stages, each in both languages at 100% coverage,
and released as mbse-expressions 0.9.0:

1. **The framework and the standard dialects** (#27): each dialect's kinds of domain by schema extension, their
   parameters and their inferred properties populated by hand, and the reading interface; the published standards
   ISO/IEC 11404, IEEE 754, IEEE 1164 and Unicode each a dialect of its own, holding the kinds and domains Patterns
   held, named as each standard names them; `Uses` dropped; the package root exporting `Framework` alone; Patterns at
   `Expressions.Patterns.Expressions`; Python3's complex number its `constant`'s `complex`.
2. **Patterns' code domains gone** (#28): its data classes and `read`, and its validation reading the operations its
   dialect names through the term's holder, a lone Patterns call refused.
3. **Every other dialect's domains stored** (#30): C's, C++'s, SystemVerilog's, Python3's, TypeScript5's, MATLAB's and
   Excel's, only for the types their standards define; LaTeX's none; C's, C++'s and SystemVerilog's code type tables
   gone; and the ABI dialects `SystemV.AMD64` and `Arm.AAPCS64`, which a C or C++ expression names as its `abi`.
4. **Standards as tagged data** (#31): each dialect's editions, found by designation or common name, with the kinds
   each has, in place of `STANDARDS`.

Its content is drained into mbse-basis, which holds what was built, the user's decisions quoted in full, the choices
agents made for review, and what stays open:

- [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md): the stored domains of every dialect, their kinds and properties, the scope
  of what is stored, and the corpus's own fixtures.
- [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md): ISO/IEC 11404's dialect, `state`, `packed`,
  `octet` and `modulo`, and Patterns holding no kinds or domains.
- [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md): the framework's schemas, install order and no `Uses`, validation through the
  holder, no lone terms, the package root and Patterns' place.
- [CAP-267: C and C++ terms read under the ABI their holder names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md): the ABI dialects and what each defines.
- [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md): editions as data, and whether Excel's formulas are ISO/IEC 29500-1's,
  left open.
- [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md): what stays code until inference, and operations' result domains.
- [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md): when this was taken up, the releases (0.9.0, then stage 6 and the retrofit in
  0.10.0) and the user's direction on process; and the dialects' own items,
  [CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md), [CAP-228: the TypeScript5 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md),
  [CAP-229: the C expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-229.md), [CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md) and
  [CAP-100: six languages' expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-100.md).
- [PRI-042: optionality kept](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-042), the user's rule that settled which ABI a term is read under.

The tech debt it incurred is mbse-basis [CAP-254: an install's uid changed with its content](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-254.md),
[CAP-258: expressions validated in time proportional to their size](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-258.md),
[CAP-259: domain inference replaced without changing evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-259.md) and
[CAP-260: dialects extending Patterns checked by their own operations](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-260.md), and the domains' consistency checks
[CAP-043: constraints resolved in any direction](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-043.md)'s. The API each stage settled is
[the port's API](../port/API.md), items 112 to 161.

---

<!-- nav -->
[← Complete expression dialects](../dialects/README.md) · [Home](../../../README.md)
