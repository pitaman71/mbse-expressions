# The corpus case `systemverilog_domains`, and what CONF-04 needs

Verified in scratch scripts (not in the shared files): with `SystemVerilog.define` run in `build()`'s store, the
singleton written as one document renders byte-identical JSON in Python and TypeScript (26,932 bytes; compared with
`cmp`), and its JSON and YAML each read back, in each language, into the singleton itself (`restored is root`), valid
against its schema, with the same `Plain` snapshot, its domains in order and their kinds as below.

## Corpus.py

```python
CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp", "systemverilog",
         "systemverilog_domains", "typescript5", "invalid"]
```

In `build()`, after ISO/IEC 11404's define:

```python
    defined = store.transaction(ISOIEC11404.define)[0]  # ISO/IEC 11404's dialect and its domains
    sv_defined = store.transaction(SystemVerilog.define)[0]  # SystemVerilog's dialect and its domains, IEEE 1800's types
```

At its end, in place of the last three lines:

```python
    terms["domains"] = defined["dialect"]
    terms["systemverilog_domains"] = sv_defined["dialect"]
    Term = store.registered("Expressions.Framework.Term")
    singletons = {"domains": store.registered("Expressions.ISOIEC11404.Expressions.Dialect"),  # the cases that are data
                  "systemverilog_domains": store.registered("Expressions.SystemVerilog.Expressions.Dialect")}
    return {case: (singletons.get(case, Term), terms[case], store) for case in CASES}
```

Docstring, after the `domains` case's sentence: "The `systemverilog_domains` case is data too: SystemVerilog's dialect,
the singleton `Expressions.SystemVerilog.Expressions`, owning its domains, IEEE 1800's built-in types, by name, of its
kinds `logic` and `bit` or IEEE 754's, written as one document."

## Corpus.ts

```typescript
export const CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp",
  "systemverilog", "systemverilog_domains", "typescript5", "invalid"] as const;
```

```typescript
  const defined = store.transaction(ISOIEC11404.define)[0]; // ISO/IEC 11404's dialect and its domains
  const svDefined = store.transaction(SystemVerilog.define)[0]; // SystemVerilog's dialect and its domains, IEEE 1800's types
```

```typescript
  terms.set("domains", defined.get("dialect"));
  terms.set("systemverilog_domains", svDefined.get("dialect"));
  const Term = store.registered("Expressions.Framework.Term");
  const singletons = new Map<string, any>([ // the cases that are data
    ["domains", store.registered("Expressions.ISOIEC11404.Expressions.Dialect")],
    ["systemverilog_domains", store.registered("Expressions.SystemVerilog.Expressions.Dialect")]]);
  return new Map<string, Case>(CASES.map((name) => [name, [singletons.get(name) ?? Term, terms.get(name), store]]));
```

The same docstring sentence. (If the other groups add `c_domains`, `python3_domains`, ..., `singletons` takes one entry
each; the shape is the agent's, for review.)

## CONF-04

- **Does the existing `systemverilog` case now need the define? Yes.** Its term holds `byte'(...)`, a cast naming a
  type, and validating a cast that names a type reads the domain of that name from the store of the term's holder:
  without `SystemVerilog.define` CONF-04 reports `'byte' is not a type SystemVerilog defines` for it. With the define
  in `build()` (above), the corpus's store holds SystemVerilog's domains and CONF-04's validation of every case passes
  as is; no `store.transaction(SystemVerilog.define)` is needed in CONF-04 itself. If the corpus case is not added,
  CONF-04's first loop must run it beside `Patterns.define`:

  ```python
  for store in {id(store): store for _, _, store in corpus.values()}.values():
      store.transaction(Patterns.define)  # Patterns' operations, which validation reads from a term's holder's store
      store.transaction(SystemVerilog.define)  # SystemVerilog's types, which its validation of a cast reads
  ```

  (TypeScript the same.) The `systemverilog` case's JSON and YAML do not change.

- **The new case's check**, beside the `domains` case's (Python; TypeScript the same, as its `domains` branch is
  written):

  ```python
              if case == "systemverilog_domains":  # SystemVerilog's dialect, a singleton: read back into itself, valid
                  assert restored is root and Validators.Validate(store)(schema, restored) == []
                  names = ["logic", "reg", "integer", "time", "bit", "byte", "shortint", "int", "longint", "real", "shortreal"]
                  assert [str(e.name) for e in restored.domains] == names and list(restored.operations) == []
                  assert [FD.kind_of(e.domain)[:2] for e in restored.domains] == [("systemverilog", "logic")] * 4 + [
                      ("systemverilog", "bit")] * 5 + [("ieee754", "ieee754")] * 2
                  continue
  ```

  CONF's markdown: "One more is data: `systemverilog_domains`, SystemVerilog's dialect and its domains, read back into
  the singleton itself, valid, its domains in order, each kind its dialect's then its own." CONF-01 to CONF-03 need
  only the regenerated files (`systemverilog_domains.json`, `.yaml` in both `conformance/` directories).
