"""The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up."""

from __future__ import annotations

from mbse.Expressions.Framework.Translators import Hole, Pattern as P, holes

A, B, C, X = holes("A", "B", "C", "X")
N = Hole("N", str)  # a name: of a variable, or of a binding
K = Hole("K", str)  # the name of a property, field or column


def value(*types: type) -> Hole:
    """A literal's value, of `types`: the native types both dialects of a pair hold."""
    return Hole("V", *types)


class Basic:
    literal = staticmethod(lambda V: P("literal", value=V))
    variable = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("operation", X, P("literal", value=K), name="get")
    has = P("operation", X, P("literal", value=K), name="has")
    implies = P("operation", A, B, name="implies")


class Numpy:
    constant = staticmethod(lambda V: P("constant", value=V))
    name = P("name", name=N)
    get = P("subscript", X, key=K)
    has = P("call", P("call", P("subscript", X, key=K), function="ma.getmaskarray"), function="logical_not")
    implies = P("call", A, B, P("constant", value=True), function="where")
    where = P("call", A, B, C, function="where")


class Matlab:
    constant = staticmethod(lambda V: P("constant", value=V))
    identifier = P("identifier", name=N)
    get = P("field", X, name=K)
    has = P("call", X, P("constant", value=K), function="isfield")
    implies = P("binary", P("unary", A, operator="~"), B, operator="||")


class Excel:
    constant = staticmethod(lambda V: P("constant", value=V))
    name = P("name", name=N)
    let = P("let", A, B, name=N)
    get = P("field", X, name=K)
    has = P("function", P("function", P("field", X, name=K), name="ISERROR"), name="NOT")
    implies = P("function", A, B, P("constant", value=True), name="IF")
    if_ = P("function", A, B, C, name="IF")
