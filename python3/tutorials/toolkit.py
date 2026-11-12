"""What the tutorials share: `dialects()`, the store Part I starts from; the cold chain's schemas and `cold_chain()`, a
store of them, which Part II starts from; and `show`, which writes an expression as text.

A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
per logger, with the slot it rides in). Case study 13 explains how `show` works.
"""

from mbse.Expressions import Framework
from mbse.Expressions.C import Expressions as C, Preprocessor as CPreprocessor, Types as CTypes
from mbse.Expressions.Cpp import Expressions as Cpp, Types as CppTypes
from mbse.Expressions.Excel import Expressions as Excel
from mbse.Expressions.LaTeX import Expressions as Latex
from mbse.Expressions.MATLAB import Expressions as Matlab
from mbse.Expressions.Patterns import Expressions as Patterns
from mbse.Expressions.IEEE1164 import Expressions as IEEE1164
from mbse.Expressions.IEEE754 import Expressions as IEEE754
from mbse.Expressions.ISOIEC11404 import Expressions as ISOIEC11404
from mbse.Expressions.Python import Patterns as PythonPatterns, Python3, Types as PythonTypes
from mbse.Expressions.TypeScript import Patterns as TypeScriptPatterns, TypeScript5, Types as TypeScriptTypes
from mbse.Expressions.Arm import AAPCS64
from mbse.Expressions.SystemV import AMD64
from mbse.Expressions.Unicode import Expressions as Unicode
from mbse.Expressions.SystemVerilog import Assertions as SVAssertions, Constraints as SVConstraints, \
    Expressions as SystemVerilog, Patterns as SVPatterns, Preprocessor as SVPreprocessor, Types as SVTypes
from mbse.Expressions.Framework import Terms
from mbse.Schemas.Framework import Builders


def dialects():
    """A store that holds expressions of every dialect, and no schemas of its own: the framework's install, then the
    standard dialects' (ISO/IEC 11404, IEEE 754, IEEE 1164, Unicode), whose kinds of domain the others use, then every
    language's dialect, TypeScript5's among them, the two ABI dialects (`SystemV.AMD64`, `Arm.AAPCS64`) and
    SystemVerilog's six, then the sublanguages' dialects of Python, TypeScript, C and C++ (`Python Types`, `Python
    Patterns`, `TypeScript Types`, `TypeScript Patterns`, `C Types`, `Cpp Types`, `C Preprocessor`), each after its
    family's, each in a transaction of its own; then each one's `define`, the standard dialects' first, each in a
    transaction of its own, writing its singleton, its operations, its domains and the editions it covers. LaTeX
    defines nothing. Part I starts from it; tutorial 1 builds such a store by hand."""
    store = Builders.Store()
    for module in (Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, TypeScript5, Matlab, Excel,
                   Latex, C, Cpp, AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints,
                   SVPreprocessor, PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes,
                   CPreprocessor):
        store.transaction(module.install)
    for module in (ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, TypeScript5, Matlab, Excel, C, Cpp,
                   AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor,
                   PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor):
        store.transaction(module.define)
    return store


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
    case studies translate into, installed after the standard dialects whose kinds of domain they use, with the two ABI
    dialects C's and C++'s terms are read under (x86-64's System V ABI, `SystemV.AMD64`, and Arm's AAPCS64,
    `Arm.AAPCS64`); Patterns' operations named by its dialect (`Patterns.define`), which validation reads; and C's,
    C++'s, the ABIs' and SystemVerilog's types, their domains (each dialect's `define`), which their evaluation reads,
    with SystemVerilog's sublanguages' dialects (`Types`, `Patterns`, `Assertions`, `Constraints`, `Preprocessor`),
    whose terms its terms hold, and the editions each covers; and Python's, C's and C++'s new dialects (`Python Types`,
    `Python Patterns`, `C Types`, `Cpp Types`, `C Preprocessor`), each after its family's."""
    store = Builders.Store()
    for module in (Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, Matlab, Excel, Latex, C, Cpp,
                   AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor,
                   PythonTypes, PythonPatterns, CTypes, CppTypes, CPreprocessor):
        store.transaction(module.install)
    for module in (Patterns, C, Cpp, AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints,
                   SVPreprocessor, CTypes, CppTypes, CPreprocessor):
        store.transaction(module.define)
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
