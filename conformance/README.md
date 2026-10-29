<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)

# Conformance corpus

Each implementation builds the same corpus, statement for statement (`python3/mbse/Expressions/Conformance/Corpus.py`,
`typescript5/src/Conformance/Corpus.ts`), and commits its snapshots here as `<implementation>/<case>.json` (the term
written nested, indent 2) and `<case>.yaml`.

| Case | Covers |
|---|---|
| `expression` | a Basic term, written nested under `Expressions.Framework.Term`: every kind and literal type, a let and its variable, an extension operation |
| `domains` | Basic literals of value domains, each naming its domain, decimal and `binary128` text, a conversion's domain, a bitwise operation and `pack` |
| `collections` | a Basic quantifier over an object's entries, and the collection operations |
| `latex` | a Latex term: every kind (`latex_where`, `latex_member`, `latex_binary`, `latex_unary`, `latex_function`, `latex_frac`, `latex_symbol`, `latex_constant`), with shared symbols |
| `matlab` | a Matlab term: every kind (the framework's `literal`, `variable` and `call`, and `matlab_binary`, `matlab_unary`, `matlab_field`, `matlab_index`, `matlab_arrayfun`, `matlab_import`), shared identifiers |

Each case is a term value in one store holding the framework's, Basic's and the ported dialects' installs, and validates
in its own dialect. The other dialects' cases (`excel`, `ccpp`, `systemverilog`) return with their
port to the store (docs/proposals/port, stage 2b).

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
