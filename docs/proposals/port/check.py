"""Runs the drafts against mbse-schemas (0.26): the installs, an expression `x + 1 > 0` built and linked from a pattern's
constraint, and a snapshot that round-trips."""

import importlib.util
import pathlib

from mbse.Schemas.Framework import Builders as B, JSON

here = pathlib.Path(__file__).parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, here / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


Framework, Basic = load("Framework"), load("Basic")
store = B.Store()
store.transaction(Framework.install)
store.transaction(Basic.install)
for name in ("Expressions.Framework.Term", "Expressions.Framework.Expression", "Expressions.Basic.Quantifier"):
    assert store.registered(name).validate() == [], (name, store.registered(name).validate())
assert [b.name for b in store.registered("Expressions.Framework.Term").branches] == [
    "literal", "call", "variable", "let", "quantifier"]
store.transaction(Framework.install)  # run again: nothing written
store.transaction(Basic.install)


def positive(txn):
    """An expression, `x + 1 > 0`, written in the frame's notation: a term is a value, nested."""
    return txn.uid("positive/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"e": txn.Expressions.Framework.Expression})
        .spec([lambda _: _.e.root(lambda r: r.as_value(lambda a: a.as_union(lambda t: t.call(lambda c: c
            .callable("gt")
            .arguments([
                lambda x: x.as_union(lambda t: t.call(lambda c: c
                    .callable("add")
                    .arguments([
                        lambda y: y.as_union(lambda t: t.variable(lambda v: v.name("x"))),
                        lambda y: y.as_union(lambda t: t.literal(lambda l: l.value(lambda v: v.as_scalar(1)))),
                    ]))),
                lambda x: x.as_union(lambda t: t.literal(lambda l: l.value(lambda v: v.as_scalar(0)))),
            ])))))])]))])


frames = store.transaction(positive)
expression = frames[0]["e"]
text = JSON.ToJSON(store).Snapshot()
again = B.Store()
again.transaction(Framework.install)
again.transaction(Basic.install)
JSON.FromJSON(again).Snapshot(text)
assert JSON.ToJSON(again).Snapshot() == text
print("ok:", JSON.ToJSON(store)(store.registered("Expressions.Framework.Expression"), expression))
