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
term = Basic.example(store, Basic.install(store))
schemas = [store.registered(name) for name in store.names() if name.startswith("Expressions.")]
assert all(schema.validate() == [] for schema in schemas), [schema.validate() for schema in schemas]
assert Validators.Validate(store).Reachable(store.registered("Expressions.Framework.Call"), term) == []
log = Plain.ToPlain(store).Snapshot()
back = B.Store()
Plain.FromPlain(back).Snapshot(log)
assert Plain.ToPlain(back).Snapshot() == log
assert [e.domain.name.get() for e in B.OfScalar.Builder(B.Meta.OfInt, False, B.Store()).domain] == []  # per store
print(f"{len(schemas)} schemas, valid; x + 1 > 0 built and valid; a snapshot of {len(log)} mutations round-trips")
