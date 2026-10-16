"""Runs the draft: the framework and Basic extend mbse-schemas, Basic's vocabulary is installed in a store, and
`x + 1 > 0` is built, validated, written as a snapshot, read into another store and written again alike.

    cd python3 && uv run --all-extras python ../docs/proposals/framework-model/check.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import Basic  # noqa: E402

from mbse.Schemas.Framework import Builders as B, Plain, Validators  # noqa: E402

Basic.install_dialect()
store = B.Store()
vocabulary = Basic.install(store)
root = Basic.example(store)
f1 = Basic.function(store, root)
assert [e.formal.name.get() for e in f1.formals] == ["x"] and f1.body[0].root is root and root.body_of[0].function is f1
sized = Basic.sizes(store, vocabulary)
schemas = [store.registered(name) for name in store.names() if name.startswith("Expressions.")]
assert all(schema.validate() == [] for schema in schemas), [schema.validate() for schema in schemas]
assert Validators.Validate(store).Reachable(store.registered("Expressions.Framework.Root"), root) == []
key = f"Expressions.Framework.Root/{root.as_identity()}"
written = [m for m in Plain.ToPlain(store).Snapshot() if "exists" in m and m["exists"]["definition"]["key"] == key]
assert len(written) == 1 and "call" in written[0]["exists"]["definition"]["properties"]["term"]  # its term nested in it
schema = root.schema[0].schema  # the root's schema, then its domain: two steps (decision 21)
assert [e.domain.name.get() for e in B.OfScalar.Builder(schema, False, store).domain] == ["bool"]
log = Plain.ToPlain(store).Snapshot()
back = B.Store()
Plain.FromPlain(back).Snapshot(log)
assert Plain.ToPlain(back).Snapshot() == log
assert [e.domain.name.get() for e in B.OfScalar.Builder(B.Meta.OfInt, False, B.Store()).domain] == []  # per store


Root = store.registered("Expressions.Framework.Root")


def term_of(root):
    """A root's term, in its plain form."""
    return Plain.ToPlain(store).OfObject(Root, root)["objects"][f"Expressions.Framework.Root/{root.as_identity()}"]["term"]


def bound(schema, builder=B.OfScalar.Builder):
    """What an instantiation binds: each parameter's name, and its value's term."""
    return {e.binding.parameter[0].parameter.name.get(): term_of(e.binding.value[0].root)
            for e in builder(schema, False, store).bindings}


assert bound(sized["Int32"]) == {"width": {"literal": {"value": {"AsIntValue": 32}}}}
assert bound(sized["Word"]) == {"width": {"variable": {"name": "w"}}}
assert bound(sized["Square"], B.OfObject.Builder) == {"rows": {"variable": {"name": "n"}}, "cols": {"variable": {"name": "n"}}}
grid = sized["Board"].properties["grid"]
assert bound(grid, B.OfProperty.Builder) == {"rows": {"literal": {"value": {"AsIntValue": 8}}}}
assert all(schema.validate() == [] for schema in sized.values())
print(f"{len(schemas)} schemas, valid; x + 1 > 0 built and valid; a snapshot of {len(log)} mutations round-trips")
