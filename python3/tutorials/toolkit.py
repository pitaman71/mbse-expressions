"""What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.

A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
per logger, with the slot it rides in). Case study 6 explains how `show` works.
"""

from mbse.Expressions import Expressions, register
from mbse.Expressions.Framework import Terms
from mbse.Schemas.Framework import Proxies, Schemas


def _native(name, type_):
    return lambda p: p.name(name).of(lambda t: t.as_native(type_))


def _listed(name, type_):
    return lambda p: p.name(name).of(lambda t: t.as_indexed(lambda i: i.of(lambda n: n.as_native(type_))))


Carries = (Schemas.OfRelation.Builder().name("Carries").links("shipment", "logger")
           .properties(_native("slot", int)).create())
Logger = (Schemas.OfObject.Builder().name("Logger").ref()
          .properties(_native("serial", str), _native("battery", int))
          .relations(lambda r: r.name("shipments").of(Carries).me("logger")).create())
Shipment = (Schemas.OfObject.Builder().name("Shipment").ref()
            .properties(_native("id", str), _native("product", str), _native("celsius", float),
                        _listed("readings", float), _native("hours", int))
            .relations(lambda r: r.name("loggers").of(Carries).me("shipment")).create())


def cold_chain():
    """A store of the cold chain's schemas, which can also hold expressions."""
    store = register(Proxies.OfStore())
    for schema in (Logger, Carries, Shipment):
        store.register(schema)
    return store


def show(expression):
    """An expression of the Basic dialect as function-call text: a literal as Python writes its value, `int16(3)` when it
    has a domain, and a conversion with its result's domain, `convert[int16](x)`."""
    def render(term, arguments):
        form = term.form()
        name = form.attributes.get("name")
        if form.kind == "literal":
            value = repr(form.attributes["value"])
            domain = form.attributes.get("domain")
            return f"{domain.name()}({value})" if domain is not None else value
        if form.kind == "variable":
            return name
        if form.kind == "let":
            return f"let {name} = {arguments[0]} in {arguments[1]}"
        if form.kind == "quantifier":
            return f"{form.attributes['quantifier']}({arguments[0]}, {name} => {arguments[1]})"
        domain = form.attributes.get("domain")  # the result's, for a conversion
        return f"{name}{f'[{domain.name()}]' if domain is not None else ''}({', '.join(arguments)})"
    return Terms.fold(Expressions.OfAny.resolve(expression), render)
