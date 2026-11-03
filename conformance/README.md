<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)

# Conformance corpus

Each implementation builds the same corpus, statement for statement (`python3/mbse/Expressions/Conformance/Corpus.py`,
`typescript5/src/Conformance/Corpus.ts`), and commits its snapshots here as `<implementation>/<case>.json` (the term
written nested, indent 2) and `<case>.yaml`.

| Case | Covers |
|---|---|
| `expression` | a Patterns term, written nested under `Expressions.Framework.Term`, its dialect then its kind: every kind and literal type, a let and its variable, a list |
| `python3` | a Python3 term: every kind (the framework's `literal`, `variable` and `let`, and its own `import`, `importfrom`, `ifexp`, `boolop`, `unaryop`, `compare`, `subscript`, `attribute`, `call`, `binop`, `generator`, `index`), imports included, shared names |
| `matlab` | a Matlab term: every kind (the framework's `literal`, `variable` and `call`, and its own `binary`, `unary`, `field`, `index`, `arrayfun`, `import`), shared identifiers |
| `excel` | an Excel term: every kind (the framework's `literal`, `variable`, `let` and `call`, and its own `infix`, `prefix`, `field`, `map`, `cell`), cells in other sheets and books included, shared names |
| `latex` | a Latex term: every kind (the framework's `literal`, `variable`, `let` and `call`, and its own `member`, `binary`, `unary`, `frac`), with shared symbols |
| `domains` | Patterns' dialect as data, written as one document: the singleton `Expressions.Patterns` (`Expressions.Patterns.Dialect`), naming its operations (each an `Expressions.Patterns.<name>` expression schema, by its path) and owning its domains by name, an enum and a domain packing it into `uint8` among them |
| `collections` | a Patterns quantifier over an object's entries, the collection operations and a mapping |
| `c` | a C term: every kind (the framework's `variable` and `call`, and its own `conditional`, `binary`, `unary`, `member`, `subscript`, `cast`, `constant`), typed constants and a shared identifier |
| `cpp` | the same expression as a C++ term: C's kinds, listed by C++'s union, each slot holding a C++ term |
| `systemverilog` | a SystemVerilog term: every kind (its own and the framework's `literal`, `variable` and `call`), sized vectors in a base, casts to a type and a width, a shared identifier |
| `invalid` | a Python3 term holding invalid syntax, the framework's `error` (the source it spans and the term recovered within it) and `missing` (the kind expected), and literals with their spelling (`text`), one holding no value but its problem (`problems`) |

Each case is a term value in one store holding the framework's install and every dialect's, and validates in its own
dialect (`DIALECTS` in the corpus; Patterns' by default); `invalid`'s problems are reported.

The CONF test suite in each implementation checks that its own files are current, that the JSON files are
byte-identical across implementations, that every implementation's YAML reads back to the same snapshot (also under a
YAML 1.1 reader), and that every implementation's JSON and YAML read into this implementation's store as the same terms, which validate.

Regenerate:

```sh
(cd python3 && uv run python -m mbse.Expressions.Conformance.write)
(cd typescript5 && npm run conformance)
```

---

<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)
