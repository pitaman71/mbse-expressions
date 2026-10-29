"""What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.

A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
per logger, with the slot it rides in). Case study 6 explains how `show` works.
"""

from mbse.Expressions import Framework
from mbse.Expressions.Dialects import Basic, Ccpp, Excel, Latex, Matlab, Python, SystemVerilog
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
    """A store of the cold chain's schemas, which also holds expressions: of the Basic dialect, and of every dialect the
    case studies translate into."""
    store = Builders.Store()
    for module in (Framework, Basic, Python, Matlab, Excel, Latex, Ccpp, SystemVerilog):
        store.transaction(module.install)
    store.transaction(install)
    return store


def show(expression):
    """An expression of the Basic dialect as function-call text: a literal as Python writes its value, `int16(3)` when it
    has a domain, and a conversion with its result's domain, `convert[int16](x)`."""
    def render(term, arguments):
        form = Terms.form(term)
        name = form.attributes.get("name")
        domain = form.attributes.get("domain")  # a name: a literal's, or a conversion's result's
        if form.kind == "literal":
            value = repr(form.attributes["value"])
            return f"{domain}({value})" if domain is not None else value
        if form.kind == "variable":
            return name
        if form.kind == "let":
            return f"let {name} = {arguments[0]} in {arguments[1]}"
        if form.kind == "quantifier":
            return f"{form.attributes['quantifier']}({arguments[0]}, {name} => {arguments[1]})"
        return f"{form.attributes['callable']}{f'[{domain}]' if domain is not None else ''}({', '.join(arguments)})"
    return Terms.fold(expression, render)
