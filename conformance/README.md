<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)

# Conformance corpus

Each implementation builds the same corpus, statement for statement (`python3/mbse/Expressions/Conformance/Corpus.py`,
`typescript5/src/Conformance/Corpus.ts`), and commits each case's expression here, as a value written nested and
tagged with its kind's meta-schema's name, as `<implementation>/<case>.json` (indent 2) and `<case>.yaml`.

| Case | Covers |
|---|---|
| `expression` | a Basic expression through its meta-schemas: every kind and literal type, a let, shared variables, an extension operation; rebuilt with `Expressions.DIALECT.term` |
| `python` | a Python expression with every kind, imports included, and shared names |
| `matlab` | a MATLAB expression with every kind, an import included, and shared identifiers |
| `excel` | an Excel formula with every kind, cells in other sheets and books included, and shared names |
| `latex` | a LaTeX formula with every kind, a `where` included, and shared symbols |
| `domains` | Basic literals of value domains, by value and by name, decimal and `binary128` text, a conversion's domain, a bitwise operation and `pack` |
| `collections` | a Basic quantifier over an object's entries, and the collection operations |
| `ccpp` | a C expression with every kind, typed constants and a shared identifier |
| `systemverilog` | a SystemVerilog expression with every kind, sized vectors, casts and a shared identifier |

Each case is read in its own dialect's store, and rebuilt with its dialect's `term`.

The CONF test suite in each implementation checks that its own files are current, that the JSON files are
byte-identical across implementations, that every implementation's YAML reads back to the same plain value (also under
a YAML 1.1 reader), and that every implementation's JSON and YAML deserialize to the same expressions, which validate.

Regenerate:

```sh
(cd python3 && uv run python -m mbse.Expressions.Conformance.write)
(cd typescript5 && npm run conformance)
```

---

<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)
