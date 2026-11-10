# Corpus: group 3's cases (`python3_domains`, `typescript5_domains`, `matlab_domains`, `excel_domains`)

Each case is data, as `domains` is: the dialect's singleton, written as one document of its schema
(`Expressions.<path>.Dialect`), owning its stored domains by name. The corpus's store runs the four defines after the
installs (and after ISO/IEC 11404's define), each in a transaction of its own. Checked on HEAD plus group 3's source,
in a scratch copy (`scratchpad/g3ws/mbse-expressions`): both languages' renders are byte-identical in JSON for every
case (YAML differs only in quoting, as for the existing cases), the existing cases' files are unchanged, and with the
new files and the CONF-04 edit below, 04_Conformance passes in both languages; whole suites and coverage pass at 100% in
both.

*(agent)* The new cases are appended to `CASES` after `invalid`, in the order the design lists them, and a new export
`DOMAINS` (case -> singleton path) names the cases that are data, replacing `case == "domains"` in `build()` and in
CONF-04; C's, C++'s, the ABI dialects' and SystemVerilog's `*_domains` cases join `CASES`, `DOMAINS` and CONF-04's
`STORED` the same way. The corpus's module docstrings (both languages) should say: "The `domains` case and the
`<dialect>_domains` cases are data: each a dialect's singleton, owning its domains by name, ..., written as one
document (`DOMAINS`)."

The conformance files to regenerate (writers): `conformance/{python3,typescript5}/{python3,typescript5,matlab,excel}_domains.{json,yaml}`
(new). No existing file changes from group 3.

## Corpus.py and Corpus.ts (diff against HEAD)

```diff
--- g3base/python3/mbse/Expressions/Conformance/Corpus.py	2026-11-10 06:08:10
+++ g3ws/mbse-expressions/python3/mbse/Expressions/Conformance/Corpus.py	2026-11-10 06:00:31
@@ -41,12 +41,18 @@
 from mbse.Schemas.Framework import Builders
 
 CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp", "systemverilog",
-         "typescript5", "invalid"]
+         "typescript5", "invalid", "python3_domains", "typescript5_domains", "matlab_domains", "excel_domains"]
 
 DIALECTS = {"python3": P.DIALECT, "matlab": M.DIALECT, "excel": X.DIALECT, "latex": L.DIALECT, "c": CE.DIALECT,
             "cpp": CPP.DIALECT, "systemverilog": SV.DIALECT, "typescript5": TS.DIALECT, "invalid": P.DIALECT}
 """The dialect that reads each case, where it is not Patterns."""
 
+DOMAINS = {"domains": "Expressions.ISOIEC11404.Expressions", "python3_domains": "Expressions.Python.Python3",
+           "typescript5_domains": "Expressions.TypeScript.TypeScript5", "matlab_domains": "Expressions.MATLAB.Expressions",
+           "excel_domains": "Expressions.Excel.Expressions"}
+"""The cases that are data, not terms: each a dialect's singleton, by its path, written as one document of its schema,
+the path's `Dialect`."""
+
 def build():
     E = Expressions
     store = Builders.Store()
@@ -65,6 +71,9 @@
     store.transaction(SystemVerilog.install)
     store.transaction(TypeScript5.install)
     defined = store.transaction(ISOIEC11404.define)[0]  # ISO/IEC 11404's dialect and its domains
+    stored = {case: store.transaction(module.define)[0]["dialect"] for case, module in [  # each dialect's stored domains
+        ("python3_domains", Python3), ("typescript5_domains", TypeScript5), ("matlab_domains", Matlab),
+        ("excel_domains", Excel)]}
 
     # --- domains: ISO/IEC 11404's dialect and its domains, owned by name; a state domain and a domain packing it into octet
     # added ---
@@ -315,5 +324,7 @@
             ("collections", collections), ("c", c), ("cpp", cpp), ("systemverilog", systemverilog),
             ("typescript5", TS.DIALECT.spec(typescript5)), ("invalid", invalid)]}
     terms["domains"] = defined["dialect"]
-    Term, Dialect = store.registered("Expressions.Framework.Term"), store.registered("Expressions.ISOIEC11404.Expressions.Dialect")
-    return {case: (Dialect if case == "domains" else Term, terms[case], store) for case in CASES}
+    terms.update(stored)
+    Term = store.registered("Expressions.Framework.Term")
+    return {case: (store.registered(f"{DOMAINS[case]}.Dialect") if case in DOMAINS else Term, terms[case], store)
+            for case in CASES}
--- g3base/typescript5/src/Conformance/Corpus.ts	2026-11-10 06:08:10
+++ g3ws/mbse-expressions/typescript5/src/Conformance/Corpus.ts	2026-11-10 06:00:31
@@ -41,7 +41,7 @@
 const TS = TypeScript5.Expressions;
 
 export const CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp",
-  "systemverilog", "typescript5", "invalid"] as const;
+  "systemverilog", "typescript5", "invalid", "python3_domains", "typescript5_domains", "matlab_domains", "excel_domains"] as const;
 
 /** The dialect that reads each case, where it is not Patterns. */
 export const DIALECTS: ReadonlyMap<string, Terms.Dialect> = new Map([
@@ -50,6 +50,14 @@
   ["invalid", P.DIALECT],
 ]);
 
+/** The cases that are data, not terms: each a dialect's singleton, by its path, written as one document of its schema,
+ * the path's `Dialect`. */
+export const DOMAINS: ReadonlyMap<string, string> = new Map([
+  ["domains", "Expressions.ISOIEC11404.Expressions"], ["python3_domains", "Expressions.Python.Python3"],
+  ["typescript5_domains", "Expressions.TypeScript.TypeScript5"], ["matlab_domains", "Expressions.MATLAB.Expressions"],
+  ["excel_domains", "Expressions.Excel.Expressions"],
+]);
+
 /** A case: its root schema, its root term, and the store it is built in. */
 export type Case = [any, any, any];
 
@@ -71,6 +79,9 @@
   store.transaction(SystemVerilog.install);
   store.transaction(TypeScript5.install);
   const defined = store.transaction(ISOIEC11404.define)[0]; // ISO/IEC 11404's dialect and its domains
+  const stored = new Map<string, any>(([ // each dialect's stored domains
+    ["python3_domains", Python3], ["typescript5_domains", TypeScript5], ["matlab_domains", Matlab],
+    ["excel_domains", Excel]] as [string, any][]).map(([name, module]) => [name, store.transaction(module.define)[0].get("dialect")]));
 
   // --- domains: ISO/IEC 11404's dialect and its domains, owned by name; a state domain and a domain packing it into octet
   // added ---
@@ -316,6 +327,8 @@
     ["typescript5", TS.DIALECT.spec(typescript5)], ["invalid", invalid],
   ] as [string, Framework.Terms.Writer][]).map(([name, writer]) => [name, store.Expressions.Framework.Term(writer)])));
   terms.set("domains", defined.get("dialect"));
-  const [Term, Dialect] = [store.registered("Expressions.Framework.Term"), store.registered("Expressions.ISOIEC11404.Expressions.Dialect")];
-  return new Map<string, Case>(CASES.map((name) => [name, [name === "domains" ? Dialect : Term, terms.get(name), store]]));
+  for (const [name, dialect] of stored) terms.set(name, dialect);
+  const Term = store.registered("Expressions.Framework.Term");
+  return new Map<string, Case>(CASES.map((name) => [name, [
+    DOMAINS.has(name) ? store.registered(`${DOMAINS.get(name)}.Dialect`) : Term, terms.get(name), store]]));
 }
```

## CONF-04 (04_Conformance, both languages; diffs against HEAD)

Setup cell: import `DOMAINS`. CONF-04's code cell: a table `STORED` of each data case's domains (names in order, each
one's kind, dialect tag then kind), asserted to list the same cases as `DOMAINS`; the `domains` branch generalized to
every case in `DOMAINS`, asserting as before: read back into itself, valid, its domains' names in order, no
operations, and each domain's `name_of` and `kind_of`.

### python3/tests/04_Conformance.ipynb, cell 1
```diff
--- 
+++ 
@@ -4,3 +4,3 @@
 
-from mbse.Expressions.Conformance.Corpus import CASES, DIALECTS, build
+from mbse.Expressions.Conformance.Corpus import CASES, DIALECTS, DOMAINS, build
 from mbse.Expressions.Conformance.write import render
```

### python3/tests/04_Conformance.ipynb, cell 9
```diff
--- 
+++ 
@@ -1 +1,15 @@
+ISO = "isoiec11404"
+STORED = {  # each case that is data: its dialect's domains, in order, by name, each its kind, its dialect's tag then its own
+    "domains": {"boolean": (ISO, "boolean"), "integer": (ISO, "integer"), "octetstring": (ISO, "octetstring"),
+                "octet": (ISO, "octet"), "modulo(256)": (ISO, "modulo"), "state": (ISO, "state"), "mode": (ISO, "packed")},
+    "python3_domains": {"bool": (ISO, "boolean"), "int": (ISO, "integer"), "float": ("ieee754", "ieee754"),
+                        "str": ("python3", "str"), "bytes": (ISO, "octetstring"), "NoneType": ("python3", "nonetype"),
+                        "ellipsis": ("python3", "ellipsis")},
+    "typescript5_domains": {"boolean": (ISO, "boolean"), "number": ("ieee754", "ieee754"), "bigint": (ISO, "integer"),
+                            "string": ("typescript5", "string"), "null": ("typescript5", "null")},
+    "matlab_domains": {"double": ("ieee754", "ieee754"), "logical": (ISO, "boolean"), "string": ("matlab", "string")},
+    "excel_domains": {"number": ("ieee754", "ieee754"), "logical": (ISO, "boolean"), "text": ("excel", "text"),
+                      "error": ("excel", "error")},
+}
+assert list(STORED) == list(DOMAINS)
 for store in {id(store): store for _, _, store in corpus.values()}.values():
@@ -8,9 +22,6 @@
             assert Plain.ToPlain(store)(schema, restored) == snapshots[case], f"{other}/{case}.{suffix}"
-            if case == "domains":  # ISO/IEC 11404's dialect, a singleton: read back into itself, its domains valid
+            if case in DOMAINS:  # a dialect, a singleton: read back into itself, its domains valid
                 assert restored is root and Validators.Validate(store)(schema, restored) == []
-                names = ["boolean", "integer", "octetstring", "octet", "modulo(256)", "state", "mode"]
-                assert [str(e.name) for e in restored.domains] == names and list(restored.operations) == []
-                assert [FD.name_of(e.domain) for e in restored.domains] == names and [
-                    FD.kind_of(e.domain)[:2] for e in restored.domains] == [("isoiec11404", kind) for kind in (
-                        "boolean", "integer", "octetstring", "octet", "modulo", "state", "packed")]
+                assert [str(e.name) for e in restored.domains] == list(STORED[case]) and list(restored.operations) == []
+                assert [(FD.name_of(e.domain), FD.kind_of(e.domain)[:2]) for e in restored.domains] == list(STORED[case].items())
                 continue
```

### typescript5/tests/04_Conformance.ipynb, cell 1
```diff
--- 
+++ 
@@ -3,3 +3,3 @@
 
-import { CASES, DIALECTS, build } from "../src/Conformance/Corpus.js";
+import { CASES, DIALECTS, DOMAINS, build } from "../src/Conformance/Corpus.js";
 import { render } from "../src/Conformance/write.js";
```

### typescript5/tests/04_Conformance.ipynb, cell 9
```diff
--- 
+++ 
@@ -1 +1,15 @@
+const ISO = "isoiec11404";
+const STORED = new Map<string, [string, [string, string]][]>([ // each case that is data: its dialect's domains, in order, by name, each its kind, its dialect's tag then its own
+  ["domains", [["boolean", [ISO, "boolean"]], ["integer", [ISO, "integer"]], ["octetstring", [ISO, "octetstring"]],
+    ["octet", [ISO, "octet"]], ["modulo(256)", [ISO, "modulo"]], ["state", [ISO, "state"]], ["mode", [ISO, "packed"]]]],
+  ["python3_domains", [["bool", [ISO, "boolean"]], ["int", [ISO, "integer"]], ["float", ["ieee754", "ieee754"]],
+    ["str", ["python3", "str"]], ["bytes", [ISO, "octetstring"]], ["NoneType", ["python3", "nonetype"]],
+    ["ellipsis", ["python3", "ellipsis"]]]],
+  ["typescript5_domains", [["boolean", [ISO, "boolean"]], ["number", ["ieee754", "ieee754"]], ["bigint", [ISO, "integer"]],
+    ["string", ["typescript5", "string"]], ["null", ["typescript5", "null"]]]],
+  ["matlab_domains", [["double", ["ieee754", "ieee754"]], ["logical", [ISO, "boolean"]], ["string", ["matlab", "string"]]]],
+  ["excel_domains", [["number", ["ieee754", "ieee754"]], ["logical", [ISO, "boolean"]], ["text", ["excel", "text"]],
+    ["error", ["excel", "error"]]]],
+]);
+assert(same([...STORED.keys()], [...DOMAINS.keys()]));
 for (const store of new Set([...corpus.values()].map(([, , store]) => store))) {
@@ -9,9 +23,7 @@
       assert(equal(Plain.ToPlain(store)(schema, restored), snapshots.get(name)), `${other}/${name}.${suffix}`);
-      if (name === "domains") { // ISO/IEC 11404's dialect, a singleton: read back into itself, its domains valid
+      if (DOMAINS.has(name)) { // a dialect, a singleton: read back into itself, its domains valid
         assert(restored === root && Validators.Validate(store)(schema, restored).length === 0);
-        const names = ["boolean", "integer", "octetstring", "octet", "modulo(256)", "state", "mode"];
-        assert(same([...restored.domains].map((e: any) => `${e.name}`), names) && [...restored.operations].length === 0);
-        assert(same([...restored.domains].map((e: any) => FD.nameOf(e.domain)), names) && equal(
-          [...restored.domains].map((e: any) => FD.kindOf(e.domain).slice(0, 2)), [
-            "boolean", "integer", "octetstring", "octet", "modulo", "state", "packed"].map((kind) => ["isoiec11404", kind])));
+        const kinds = STORED.get(name) as [string, [string, string]][];
+        assert(same([...restored.domains].map((e: any) => `${e.name}`), kinds.map(([domain]) => domain)) && [...restored.operations].length === 0);
+        assert(equal([...restored.domains].map((e: any) => [FD.nameOf(e.domain), FD.kindOf(e.domain).slice(0, 2)]), kinds));
         continue;
```

The suite's introduction (markdown, both languages) changes its "One case is data, not a term: `domains`, ..." to:
"The cases that are data, not terms, are dialects' singletons, each written as one document: `domains`, ISO/IEC
11404's dialect, its domains, owned by name, each kind its dialect's then its own, an enum and a packed one among them;
and each dialect's stored domains (`python3_domains`, `typescript5_domains`, `matlab_domains`, `excel_domains`); their
domains validate."
