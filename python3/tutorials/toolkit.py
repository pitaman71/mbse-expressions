"""What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.

A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
per logger, with the slot it rides in). Case study 6 explains how `show` works.
"""

from mbse.Expressions import Framework
from mbse.Expressions.C import Expressions as C
from mbse.Expressions.Cpp import Expressions as Cpp
from mbse.Expressions.Excel import Expressions as Excel
from mbse.Expressions.LaTeX import Expressions as Latex
from mbse.Expressions.MATLAB import Expressions as Matlab
from mbse.Expressions.Patterns import Expressions as Patterns
from mbse.Expressions.IEEE1164 import Expressions as IEEE1164
from mbse.Expressions.IEEE754 import Expressions as IEEE754
from mbse.Expressions.ISOIEC11404 import Expressions as ISOIEC11404
from mbse.Expressions.Python import Python3
from mbse.Expressions.Unicode import Expressions as Unicode
from mbse.Expressions.SystemVerilog import Expressions as SystemVerilog
from mbse.Expressions.Framework import Terms
from mbse.Schemas.Framework import Builders


def install(txn):
    """The cold chain's schemas: `Shipment`, `Logger`, and `Carries`, which relates a shipment to its loggers."""
    S = txn.Schemas
    return txn.uid("tutorials.cold_chain/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Shipment": S.OfObject, "Logger": S.OfObject, "Carries": S.OfRelation})
        .spec([
            lambda _: _.Carries.name("Carries").links([lambda t: t.name("shipment"), lambda t: t.name("logger")])
            .properties({"slot": S.OfInt}),
            lambda _: _.Logger.name("Logger").ref(True).properties({"serial": S.OfStr, "battery": S.OfInt})
            .adjacencies({"shipments": lambda t: t.relation([_.Carries]).me("logger")}),
            lambda _: _.Shipment.name("Shipment").ref(True).properties({
                "id": S.OfStr, "product": S.OfStr, "celsius": S.OfFloat,
                "readings": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfFloat])), "hours": S.OfInt,
            }).adjacencies({"loggers": lambda t: t.relation([_.Carries]).me("shipment")}),
        ])]))])


def cold_chain():
    """A store of the cold chain's schemas, which also holds expressions: of the Patterns dialect, and of every dialect the
    case studies translate into, installed after the standard dialects whose kinds of domain they use; and Patterns'
    operations named by its dialect (`Patterns.define`), which validation reads."""
    store = Builders.Store()
    for module in (Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, Matlab, Excel, Latex, C, Cpp,
                   SystemVerilog):
        store.transaction(module.install)
    store.transaction(Patterns.define)
    store.transaction(install)
    return store


def show(expression):
    """An expression of the Patterns dialect as function-call text: a literal as Python writes its value, a let, a
    quantifier, and the container constructors as `[a, b]` and `{k: v}`."""
    def render(term, arguments):
        form = Terms.form(term)
        name = form.attributes.get("name")
        if form.kind == "literal":
            return repr(form.attributes["value"])
        if form.kind == "variable":
            return name
        if form.kind == "let":
            return f"let {name} = {arguments[0]} in {arguments[1]}"
        if form.kind == "quantifier":
            return f"{form.attributes['quantifier']}({arguments[0]}, {name} => {arguments[1]})"
        if form.kind == "list":
            return f"[{', '.join(arguments)}]"
        if form.kind == "mapping":
            return "{" + ", ".join(f"{k}: {v}" for k, v in zip(arguments[0::2], arguments[1::2])) + "}"
        return f"{form.attributes['callable']}({', '.join(arguments)})"
    return Terms.fold(expression, render)
