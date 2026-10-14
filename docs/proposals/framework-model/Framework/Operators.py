"""Operators: the schemas of what terms apply. (Proposed: python3/mbse/Expressions/Framework/Operators.py.)

An operator is data: a `Callable` object, with a global ID its dialect gives (`Basic.Operators.Add`), and its
parameters (`HasParameters`), each with its position and the domain of its argument. A callable's `result` is the
domain of what it gives. A domain is named: a scalar schema (`Domains`) or one of the callable's `type_parameters`,
which stands for the domain its arguments share.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Schemas as S

__all__ = ["Callable", "Parameter", "HasParameters", "SCHEMAS"]

Text, Int = S.OfScalar.Data(str), S.OfScalar.Data(int)

Names = (
    S.OfContainer.Builder()
    .index(Int)
    .element(Text)
    .create()
)
Callable = (
    S.OfObject.Builder().name("Expressions.Callable").ref()
    .properties(
        lambda prop: prop.name("name").of(Text),
        lambda prop: prop.name("type_parameters").of(Names),  # e.g. ["D"], for add(a: D, b: D) -> D
        lambda prop: prop.name("result").of(Text),  # a domain's name, or a type parameter's
    )
    .create()
)
Parameter = (
    S.OfObject.Builder().name("Expressions.Parameter").ref()
    .properties(
        lambda prop: prop.name("name").of(Text),
        lambda prop: prop.name("domain").of(Text),  # a domain's name, or a type parameter's
    )
    .create()
)
HasParameters = (
    S.OfRelation.Builder().name("Expressions.HasParameters")
    .links("callable", "parameter")
    .properties(
        lambda prop: prop.name("index").of(Int),
    )
    .unique("callable", "index")
    .create()
)
(
    S.OfObject.Builder(Callable)
    .relations(
        lambda adj: adj.name("parameters").of(HasParameters).me("callable"),
    )
    .update()
)
(
    S.OfObject.Builder(Parameter)
    .relations(
        lambda adj: adj.of(HasParameters).me("parameter"),
    )
    .update()
)

SCHEMAS = (Callable, Parameter, HasParameters)
"""The schemas of operators, in the order a store registers them."""
