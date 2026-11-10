# Test plans: group 3's changes (DOM-21, and DOM-18 adjusted)

## python3/tests/TestPlan.md, the `09_Domains.ipynb` row

- The count: DOM `12` -> `13` (DOM-21 added; DOM-19 and DOM-20, the other groups', add theirs).
- DOM-18's text, at the row's end: replace "TypeScript5's `string` and the token `null`, C's and C++'s `nullptr_t`, told
  apart by `kind_of`'s dialect, and Excel's `error`" with "TypeScript5's `string` and the token `null`, MATLAB's
  `string`, C's and C++'s `nullptr_t`, told apart by `kind_of`'s dialect, and Excel's `text` and `error`".
- Append, after DOM-18's text (after DOM-19's and DOM-20's when they are added):

  "; Python3's, TypeScript5's, MATLAB's and Excel's stored domains (DOM-21), each dialect's `define` run after the
  installs in a transaction of its own and exported by its package: its domains owned by its singleton by name, in
  order, each named as its language names its type (Python3's `bool`, `int`, `float`, `str`, `bytes` and the tokens
  `NoneType` and `ellipsis`; TypeScript5's `boolean`, `number`, `bigint`, `string` and the token `null`; MATLAB's
  `double`, `logical` and `string`; Excel's `number`, `logical`, `text` and `error`, its members Excel's fifteen error
  codes in `ERROR.TYPE`'s order then those added since), each valid, of ISO/IEC 11404's `boolean`, `integer` or
  `octetstring`, IEEE 754's `binary64` or its dialect's own kind (MATLAB's `string` and Excel's `text` new), read
  through `kind_of`, `properties` and `name_of`; each but a token's related to its schema, `Expressions.<path>.<name>`,
  a `Schemas.OfAny` of the scalar it narrows (an Excel error, its code: `str`), by `HasDomain` both ways; a token with
  none; each define run again writing nothing, and the store round-tripping whole into one with the same installs"

- The total: `Total: 104 cases` -> `105` for DOM-21 (plus DOM-19 and DOM-20), and in its parenthesis, after "DOM-02
  retired in its stage 2, with Patterns' code domains": "; DOM-21 added in its stage 3, Python3's, TypeScript5's,
  MATLAB's and Excel's stored domains" (or one clause naming DOM-19 to DOM-21 together).

## typescript5/tests/TestPlan.md, the `09_Domains.ipynb` row

- The count: DOM `12` -> `13`.
- Its differences: nothing new for DOM-21 beyond what the row already says (the reading interface camelCase,
  `kindOf`, `nameOf`; properties `Map`s and a container an array; ints `bigint`, so IEEE 754's `radix`, `precision`
  and `emax` are `2n`, `53n`, `1023n`). If a mention is wanted: "a define's frame is a `Map` (`frame.get("int")`)
  (DOM-21)".
- The total: as in Python's.
