# API.md: group 3's items (Settled in domains as data's stage 3, 131 onward; numbers for the coordinator to assign)

Written in the style of items 112 to 130, for the section "Settled in domains as data's stage 3, for the user's
review". Each choice the design left open is marked *(agent)*.

13x. **Python3's, TypeScript5's, MATLAB's and Excel's stored domains.** Each of the four dialects gains a `define`,
     as the standard dialects have (item 112): its uid `mbse.Expressions.<path>.define/1`
     (`mbse.Expressions.Python.Python3.define/1`, `mbse.Expressions.TypeScript.TypeScript5.define/1`,
     `mbse.Expressions.MATLAB.Expressions.define/1`, `mbse.Expressions.Excel.Expressions.define/1`), run after the
     installs, in a transaction of its own; run again, it writes nothing. It writes the dialect's domains, owned by its
     singleton by name through `Expressions.Framework.Defines`, each with its parameters and its inferred properties
     populated by hand, and each but a token's related to its schema by `HasDomain`; its frame binds `dialect` and each
     domain by its name. Each module exports `define` beside `install`, and so does each package (Python's
     `__init__`, TypeScript's `index.ts`); the packages' paths are unchanged, so `package.json` and `deno.json` are
     too. Each install adds its domains' schemas, `Expressions.<path>.<name>`, each a `Schemas.OfAny` of the scalar it
     narrows. The domains, each named as its language names its type:
     - Python3: `bool` (ISO/IEC 11404 `boolean`), `int` (11404 `integer`: signed, unbounded, `overflow` `raise`),
       `float` (IEEE 754 `binary64`), `str` (Python3's `str`), `bytes` (11404 `octetstring`), and the tokens
       `NoneType` and `ellipsis` (Python3's `nonetype` and `ellipsis`), with no schema.
     - TypeScript5: `boolean`, `number` (`binary64`), `bigint` (11404 `integer`, unbounded), `string`
       (TypeScript5's `string`), and the token `null` (TypeScript5's `null`), with no schema.
     - MATLAB: `double` (`binary64`), `logical` (11404 `boolean`), `string` (MATLAB's new `string`).
     - Excel: `number` (`binary64`), `logical` (11404 `boolean`), `text` (Excel's new `text`), `error` (Excel's
       `error`), its `members` `#NULL!`, `#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`, `#N/A`, `#GETTING_DATA`,
       `#SPILL!`, `#CALC!`, `#FIELD!`, `#BLOCKED!`, `#CONNECT!`, `#BUSY!`, `#UNKNOWN!`, `ordered` false.
     Each `binary64` domain has IEEE 754's own `binary64`'s properties (`format`, `rounding` `roundTiesToEven`,
     `radix` 2, `precision` 53, `emax` 1023, `ordered`); each integer 11404's own `integer`'s (`signed`, `overflow`
     `raise`, `ordered`, no `width`, `least` or `greatest`); `ordered` true of the integers, `binary64`,
     `octetstring` and the string kinds, false of `boolean`, the tokens and `error`. What these dialects' evaluators
     and inference read is unchanged: their code domains (`Domains.py`, `Domains.ts`: Python3's `Int`, MATLAB's
     `Double`, ...) stay inference's `OfTypes`, CAP-232's to replace.
13x. **Two new kinds, each its dialect's own**: MATLAB's `string` (`Expressions.MATLAB.Expressions.OfString`) and
     Excel's `text` (`Expressions.Excel.Expressions.OfText`), each text as UTF-16 code units, lone surrogates among
     them, as TypeScript5's `string`; each with the one property `ordered` (as every existing string kind has).
     MATLAB's install so gains its union of kinds, `Expressions.MATLAB.Expressions.DomainKind`, added to
     `Expressions.Framework.DomainKind` as the branch `matlab`, its `Term` branch's tag; Excel's union lists `text`
     before `error` *(agent)*. The schemas' names `OfString` and `OfText` follow the existing kinds' (`OfStr`,
     `OfString`, `OfError`) *(agent)*.
13x. **An Excel error's schema narrows `str`** *(agent)*: `error` is not a token (it has members, its values the
     error codes), so by the design's rule it has a schema; Excel's evaluator holds an error value as `Domains.Error`,
     whose one field is its code, a string, and the kind's `members` are those codes; so
     `Expressions.Excel.Expressions.error` is an `OfAny` of `str`, a value its code. (A schema of its own object, or
     none, as a token's, were the alternatives; neither has a basic scalar to narrow.)
13x. **Smaller choices** *(agent)*: a domain's schema keeps its language's spelling, every name being an identifier
     (`Expressions.Python.Python3.bool`, `Expressions.TypeScript.TypeScript5.number`, `Expressions.MATLAB.Expressions.double`),
     so no name is spelled otherwise; MATLAB's and Excel's numbers narrow `float`, though a literal `18` is an int in
     the store, since both languages hold every number as a double; TypeScript5's `bigint` narrows `int` (a `bigint`
     in TypeScript's implementation); Excel's error codes are written in its `define` alone, with no new constant
     exported; the module docstrings say what each `define` writes, as the standard dialects' do.
13x. **Tests**, under their IDs in both languages: DOM-21 is added (each define's domains, in order, their kinds,
     properties, `name_of`, schemas and `HasDomain` both ways, the tokens with none, the hand-populated properties as
     the standard dialects' own, each define run again writing nothing, and the store round-tripping whole); DOM-18
     lists MATLAB's union and Excel's `text`, and writes one domain of each by hand; FRM-01 lists MATLAB's and Excel's
     new kinds; the corpus gains `python3_domains`, `typescript5_domains`, `matlab_domains` and `excel_domains`, each
     the dialect's singleton written as one document, and a list of its data cases, `DOMAINS` *(agent)*, which
     CONF-04 reads in place of `case == "domains"`.
