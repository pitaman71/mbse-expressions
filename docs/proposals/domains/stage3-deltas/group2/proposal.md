# Stage 3's design: what group 2 (SystemVerilog) found underspecified or wrong

None of these stops the build; each was taken the simplest way consistent with the record, marked *(agent)*, and is
for the "Found while building" paragraph of Stage 3's design.

1. **Inference has no store where a constant is typed.** `Terms.Dialect`'s `domain_of(value)` takes a value only, so it
   cannot reach a holder. SystemVerilog types an unsized constant through `Kind.typed(record)` of its `literal` kind
   instead (a record of a held term reaches the store, `Proxies.store_of(record)`), and its `domain_of` gives `Anything`
   for a constant no type holds *(agent)*. C's literal typing (group 1) meets the same wall; C already types through
   `typed`. The design's "What reads the stored domains" should say so; no framework change was needed.
2. **A rule over working values sometimes needs a named type no operand carries.** `common` gives `real` for a
   `shortreal` among integrals (IEEE 1800, as the code has it): neither operand is `real`. Signatures get domains, not
   the store. Resolved by `SvType.domain`, the stored domain a type was read from (compared by nothing), through whose
   store `common` reads `real` *(agent)*. The design says `SvType` is "built of" a stored domain, not that it keeps it;
   it should, or say how a rule reaches a type its operands do not name. C's usual arithmetic conversions (group 1)
   produce types no operand has too (`int` from two `char`s), so the same answer, or a framework one, applies there.
3. **`===`'s `bit` in inference.** A signature's result for `===` is a code constant; to read `bit` from the store, the
   `binary` kind gains a `typed(record)` that gives `bit` for `===` and `!==` (the framework lets `typed` override an
   application's result), the signature keeping an unnamed 1-bit 2-state vector as its placeholder *(agent)*. An
   alternative, dropping the name (`bit [0:0]`, as `==` gives `logic [0:0]`), would be a behavior change; not taken.
4. **IEEE 754's kind has no `width` yet** (group 1 adds it: "IEEE 754's own `binary64` and `binary32` gain it"). A
   real's width (`$bits(1.5)` is 64) is read from its format's interchange width, `Ieee754.WIDTHS[format]`, for now
   *(agent)*. Once group 1's `width` lands, SystemVerilog's define should write `width` on `real` and `shortreal` (64,
   32) "as IEEE 754's own domains have them", `Domains.named` read it, DOM-20's `REAL`/`SHORTREAL` and the corpus's
   `systemverilog_domains` follow. Tech debt until then, specific: `python3/.../SystemVerilog/Expressions/Domains.py`
   and `typescript5/src/SystemVerilog/Expressions/Domains.ts`, `named`'s `Ieee754.WIDTHS` read.
5. **"SystemVerilog's evaluator so reads the store"** reads as "always". Built as "only where a named type is read",
   in all three entry points alike (validation: a cast naming a type; inference: a constant, a cast, `===`; evaluation:
   wherever it computes in a named type), so a lone term that reads none (`4'b1010 & 4'b0110`) still evaluates *(agent)*.
   In practice evaluation reaches the store for nearly every expression (any unsized constant is an `integer`). The
   design should say which.
6. **The cast's refusal.** A cast's type was checked against the code table ("a cast's type must be a built-in type,
   signed or unsigned, got 'word'"); a type is now "one SystemVerilog defines" in the store, so an unknown name and an
   undefined store give the one message, `'word' is not a type SystemVerilog defines` *(agent)*. DIA-13's assertion
   changes.
7. **No by-name reader of a dialect's domains in `Framework.Domains`.** Stage 2 added `operations(dialect)`; there is no
   `domains(dialect)` (or `domain(dialect, name)`). The path (`dialect.domains({"name": name})`) raises `LookupError`
   when absent, which TypeScript can only narrow with an `instanceof` re-throw branch no input reaches (PRI-039). So
   `Domains.named` reads `Objects.entries(dialect, "domains")` by name *(agent)*, in both languages. Proposed framework
   change, for the coordinator: `Framework.Domains.domains(dialect)`, a dialect's domains by name, each its
   `Readers.OfObject`, as `operations` is; C's and the ABI dialects' lookups would use it too.
8. **The corpus's `systemverilog` case already needs the define**: its `byte'(...)` cast is validated within a holder by
   CONF-04, which now reads `byte` from the store. Stage 3's design names the new `systemverilog_domains` case but not
   that the existing case changes what its store must hold.
9. **The skill's install list** (SKILL.md, practice 1: "then Patterns' `define`, which names the operations validation
   reads") should add each dialect's `define` whose evaluation, inference or validation reads its domains
   (`SystemVerilog.define`, and the other groups'); the skill is the coordinator's.
