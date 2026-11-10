# FRM-01: what group 3 changes (05_Framework, both languages)

MATLAB's install now adds its union of kinds, `Expressions.MATLAB.Expressions.DomainKind`, as the branch `matlab` of
`Expressions.Framework.DomainKind` (its one kind `string`); Excel's union gains the kind `text`, before `error`. So two
assertions of FRM-01's code cell change in each language: the map of each dialect's kinds (`matlab` inserted after
`python3`, in install order; `excel` now `text`, `error`), and the list of the dialects that have a union of kinds
(MATLAB no longer excluded). Nothing else in 05_Framework changes; FRM-01's markdown is unchanged.

The diffs below are against HEAD (before the SystemVerilog group's edits, which also touch the first of these lines:
keep their `"systemverilog": ["logic", "bit"]`). Checked: with these edits on HEAD plus group 3's source, 05_Framework
passes in both languages.

## Python (`python3/tests/05_Framework.ipynb`, FRM-01's code cell)

Replace

```python
    "ieee1164": ["ieee1164"], "unicode": ["unicode"], "python3": ["str", "nonetype", "ellipsis"], "excel": ["error"],
```

with

```python
    "ieee1164": ["ieee1164"], "unicode": ["unicode"], "python3": ["str", "nonetype", "ellipsis"], "matlab": ["string"],
    "excel": ["text", "error"],
```

and

```python
    d.union.removesuffix(".Term") + ".DomainKind" for d in DIALECTS if d.name() not in ("Patterns", "MATLAB", "LaTeX")]
```

with

```python
    d.union.removesuffix(".Term") + ".DomainKind" for d in DIALECTS if d.name() not in ("Patterns", "LaTeX")]
```

## TypeScript (`typescript5/tests/05_Framework.ipynb`, FRM-01's code cell)

Replace

```ts
  ["ieee1164", ["ieee1164"]], ["unicode", ["unicode"]], ["python3", ["str", "nonetype", "ellipsis"]], ["excel", ["error"]],
```

with

```ts
  ["ieee1164", ["ieee1164"]], ["unicode", ["unicode"]], ["python3", ["str", "nonetype", "ellipsis"]], ["matlab", ["string"]],
  ["excel", ["text", "error"]],
```

and

```ts
  .filter((d) => !["Patterns", "MATLAB", "LaTeX"].includes(d.name())).map((d) => d.union.replace(/\.Term$/, "") + ".DomainKind")));
```

with

```ts
  .filter((d) => !["Patterns", "LaTeX"].includes(d.name())).map((d) => d.union.replace(/\.Term$/, "") + ".DomainKind")));
```

## As diffs (against HEAD)

### python3/tests/05_Framework.ipynb, cell 3
```diff
--- 
+++ 
@@ -17,6 +17,6 @@
     "isoiec11404": ["boolean", "integer", "modulo", "bitstring", "octet", "octetstring", "state", "packed"], "ieee754": ["ieee754"],
-    "ieee1164": ["ieee1164"], "unicode": ["unicode"], "python3": ["str", "nonetype", "ellipsis"], "excel": ["error"],
+    "ieee1164": ["ieee1164"], "unicode": ["unicode"], "python3": ["str", "nonetype", "ellipsis"], "matlab": ["string"], "excel": ["text", "error"],
     "c": ["nullptr_t"], "cpp": ["nullptr_t"], "systemverilog": ["logic"], "typescript5": ["string", "null"]}
 assert [b.schema.name for b in DomainKind.branches[4:]] == [  # each dialect's own union of kinds, named by its path
-    d.union.removesuffix(".Term") + ".DomainKind" for d in DIALECTS if d.name() not in ("Patterns", "MATLAB", "LaTeX")]
+    d.union.removesuffix(".Term") + ".DomainKind" for d in DIALECTS if d.name() not in ("Patterns", "LaTeX")]
 assert all(list(b.schema.adjacencies) == ["domains", "operations"] for b in Dialects.branches)
```

### typescript5/tests/05_Framework.ipynb, cell 3
```diff
--- 
+++ 
@@ -19,6 +19,7 @@
   ["isoiec11404", ["boolean", "integer", "modulo", "bitstring", "octet", "octetstring", "state", "packed"]], ["ieee754", ["ieee754"]],
-  ["ieee1164", ["ieee1164"]], ["unicode", ["unicode"]], ["python3", ["str", "nonetype", "ellipsis"]], ["excel", ["error"]],
+  ["ieee1164", ["ieee1164"]], ["unicode", ["unicode"]], ["python3", ["str", "nonetype", "ellipsis"]], ["matlab", ["string"]],
+  ["excel", ["text", "error"]],
   ["c", ["nullptr_t"]], ["cpp", ["nullptr_t"]], ["systemverilog", ["logic"]], ["typescript5", ["string", "null"]]])));
 assert(same(DomainKind.branches.slice(4).map((b: any) => b.schema.name), DIALECTS // each dialect's own union of kinds, named by its path
-  .filter((d) => !["Patterns", "MATLAB", "LaTeX"].includes(d.name())).map((d) => d.union.replace(/\.Term$/, "") + ".DomainKind")));
+  .filter((d) => !["Patterns", "LaTeX"].includes(d.name())).map((d) => d.union.replace(/\.Term$/, "") + ".DomainKind")));
 assert(Dialects.branches.every((b: any) => same([...b.schema.adjacencies.keys()], ["domains", "operations"])));
```

