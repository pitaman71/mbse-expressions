"""The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up."""

from __future__ import annotations

from mbse.Expressions.Framework.Translators import Hole, Pattern as P, Rule, holes

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


class Python:
    constant = staticmethod(lambda V: P("constant", value=V))
    name = P("name", name=N)
    let = P("let", A, B, name=N)
    get = P("attribute", X, attr=K)
    has = P("call", P("name", name="hasattr"), X, P("constant", value=K))
    implies = P("ifexp", A, B, P("constant", value=True))
    ifexp = P("ifexp", A, B, C)


def _numpy(function: str) -> P:
    """The function `np.<function>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'."""
    callee = P("name", name="np")
    for attr in function.split("."):
        callee = P("attribute", callee, attr=attr)
    return callee


class Numpy:
    """Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions."""

    call = staticmethod(lambda function, *arguments: P("call", _numpy(function), *arguments))
    get = P("subscript", X, key=K)
    has = P("call", _numpy("logical_not"), P("call", _numpy("ma.getmaskarray"), P("subscript", X, key=K)))
    implies = P("call", _numpy("where"), A, B, P("constant", value=True))
    prelude = P("import", Hole("B"), module="numpy", alias="np")

    @staticmethod
    def renames(kind: str, attribute: str, names: dict[str, str], arity: int) -> list[Rule]:
        """Rules for operators that are numpy functions of the same arguments."""
        arguments = holes(*(f"A{i}" for i in range(arity)))
        return [Rule(P(kind, *arguments, **{attribute: a}), Numpy.call(b, *arguments)) for a, b in names.items()]


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
