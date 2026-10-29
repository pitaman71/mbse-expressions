<!-- nav -->
[← Equivalence of the implementations](../docs/EQUIVALENCE.md) · [Home](../README.md) · [Python package →](../python3/README.md)

# Conformance corpus

Each implementation builds the same corpus, statement for statement (`python3/mbse/Expressions/Conformance/Corpus.py`,
`typescript5/src/Conformance/Corpus.ts`), and commits its snapshots here as `<implementation>/<case>.json` (the term
written nested, indent 2) and `<case>.yaml`.

| Case | Covers |
|---|---|
| `expression` | a Basic term, written nested under `Expressions.Framework.Term`: every kind and literal type, a let and its variable, an extension operation |
| `python` | a Python term: every kind (the framework's `let`, and `python_import`, `python_importfrom`, `python_ifexp`, `python_boolop`, `python_unaryop`, `python_compare`, `python_subscript`, `python_attribute`, `python_name`, `python_call`, `python_binop`, `python_generator`, `python_index`, `python_constant`), imports included, shared names |
| `matlab` | a Matlab term: every kind (the framework's `literal`, `variable` and `call`, and `matlab_binary`, `matlab_unary`, `matlab_field`, `matlab_index`, `matlab_arrayfun`, `matlab_import`), shared identifiers |
| `excel` | an Excel term: every kind (the framework's `literal`, `variable`, `let` and `call`, and `excel_infix`, `excel_prefix`, `excel_field`, `excel_map`, `excel_cell`), cells in other sheets and books included, shared names |
| `latex` | a Latex term: every kind (`latex_where`, `latex_member`, `latex_binary`, `latex_unary`, `latex_function`, `latex_frac`, `latex_symbol`, `latex_constant`), with shared symbols |
| `domains` | Basic literals of value domains, each naming its domain, decimal and `binary128` text, a conversion's domain, a bitwise operation and `pack` |
| `collections` | a Basic quantifier over an object's entries, and the collection operations |
| `ccpp` | a Ccpp term: every kind (the framework's `call`, and `ccpp_conditional`, `ccpp_binary`, `ccpp_unary`, `ccpp_member`, `ccpp_subscript`, `ccpp_cast`, `ccpp_constant`, `ccpp_identifier`), typed constants and a shared identifier |
| `systemverilog` | a SystemVerilog term: every kind (its own, as `systemverilog_<kind>` branches, and the framework's `call`), sized vectors in a base, casts to a type and a width, a shared identifier |

Each case is a term value in one store holding the framework's install and every dialect's, and validates in its own
dialect (`DIALECTS` in the corpus; Basic's by default).

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
