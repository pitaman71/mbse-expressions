"""The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework.Terms import Part
from mbse.Expressions.Framework.Translators import Hole, Pattern as P, Rule, holes

A, B, C, X = holes("A", "B", "C", "X")
N = Hole("N", str)  # a name: of a variable, or of a binding
K = Hole("K", str)  # the name of a property, field or column


def value(*types: type) -> Hole:
    """A literal's value, of `types`: the native types both dialects of a pair hold."""
    return Hole("V", *types)


class Patterns:
    literal = staticmethod(lambda V: P("literal", value=V))
    variable = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("call", X, P("literal", value=K), callable="get")
    has = P("call", X, P("literal", value=K), callable="has")
    implies = P("call", A, B, callable="implies")
    shr = P("call", A, B, callable="shr")
    quantifier = staticmethod(lambda name: P("quantifier", A, B, name=N, quantifier=name))
    unary = staticmethod(lambda name: P("call", A, callable=name))  # count, sum, min, max, unique
    item = P("call", A, B, callable="item")
    in_ = P("call", A, B, callable="in")


def _call(function: str, *arguments: P | Hole) -> P:
    return P("call", P("variable", name=function), *arguments)


def comparison(op: str) -> tuple[Part, ...]:
    """A Python3 comparison chain of one link, `op`, as a form's attributes hold it."""
    return (Part("comparison", {"op": op}, 1),)


def _for(conditions: int) -> tuple[Part, ...]:
    """A Python3 comprehension's one `for` clause over a name, with `conditions`, as a form's attributes hold it."""
    return (Part("comprehension", {}, 2 + conditions),)


def compares(kind: str, attribute: str, names: dict[str, str], python: str = "left") -> list[Rule]:
    """Rules for comparisons that are another dialect's operators of `kind`: each Python3 comparison of one link, a
    key of `names`, is the operator its value names (or the other way round, where Python3 is on the `right`)."""
    rules = []
    for op, other in names.items():
        mine, theirs = P("compare", A, B, comparisons=comparison(op)), P(kind, A, B, **{attribute: other})
        rules.append(Rule(mine, theirs) if python == "left" else Rule(theirs, mine))
    return rules


class Python3:
    constant = staticmethod(lambda V: P("literal", value=V))
    name = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("attribute", X, attr=K)
    has = P("call", P("variable", name="hasattr"), X, P("literal", value=K))
    implies = P("ifexp", B, A, P("literal", value=True))  # b if a else True
    ifexp = P("ifexp", B, A, C)  # b if a else c
    shr = P("binop", A, B, op=">>")
    all_ = _call("all", P("generatorexp", B, P("variable", name=N), A, generators=_for(0)))  # all(b for n in a)
    any_ = _call("any", P("generatorexp", B, P("variable", name=N), A, generators=_for(0)))
    count_where = _call("sum", P("generatorexp", P("literal", value=1), P("variable", name=N), A, B,
                                 generators=_for(1)))  # sum(1 for n in a if b)
    builtin = staticmethod(lambda function: _call(function, A))  # len, sum, min, max
    index = P("subscript", A, B)
    in_ = P("compare", A, B, comparisons=comparison("in"))
    unique = P("compare", _call("len", _call("set", A)), _call("len", A), comparisons=comparison("=="))


def _numpy(function: str) -> P:
    """The function `np.<function>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'."""
    callee = P("variable", name="np")
    for attr in function.split("."):
        callee = P("attribute", callee, attr=attr)
    return callee


class Numpy:
    """Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions."""

    call = staticmethod(lambda function, *arguments: P("call", _numpy(function), *arguments))
    get = P("subscript", X, P("literal", value=K))
    has = P("call", _numpy("logical_not"), P("call", _numpy("ma.getmaskarray"), P("subscript", X, P("literal", value=K))))
    implies = P("call", _numpy("where"), A, B, P("literal", value=True))
    prelude = P("import", Hole("B"), module="numpy", alias="np")

    @staticmethod
    def renames(kind: str, attribute: str, names: dict[str, str], arity: int) -> list[Rule]:
        """Rules for operators that are numpy functions of the same arguments."""
        arguments = holes(*(f"A{i}" for i in range(arity)))
        return [Rule(P(kind, *arguments, **{attribute: a}), Numpy.call(b, *arguments)) for a, b in names.items()]


class Matlab:
    constant = staticmethod(lambda V: P("literal", value=V))
    identifier = P("variable", name=N)
    get = P("field", X, name=K)
    has = P("call", X, P("literal", value=K), callable="isfield")
    implies = P("binary", P("unary", A, operator="~"), B, operator="||")
    shr = P("call", A, P("unary", B, operator="-"), callable="bitshift")  # a negative shift is to the right
    over = staticmethod(lambda function: P("call", P("arrayfun", A, B, name=N), callable=function))  # all(arrayfun(@(n) b, a))
    function = staticmethod(lambda name: P("call", A, callable=name))  # numel, sum, min, max
    index = P("index", A, P("binary", B, P("literal", value=1), operator="+"))  # a(b + 1): MATLAB counts from 1
    ismember = P("call", A, B, callable="ismember")
    unique = P("binary", P("call", P("call", A, callable="unique"), callable="numel"), P("call", A, callable="numel"), operator="==")


class CFamily:
    """The kinds of the C family, which C and C++ share."""

    constant = staticmethod(lambda V: P("constant", value=V))  # untyped
    identifier = P("variable", name=N)
    get = P("member", X, name=K)  # with '.'
    implies = P("binary", P("unary", A, operator="!"), B, operator="||")


class SystemVerilog:
    constant = staticmethod(lambda V: P("literal", value=V))
    identifier = P("variable", name=N)
    get = P("member", X, name=K)
    implies = P("binary", A, B, operator="->")
    iterate = staticmethod(lambda method: P("iterate", A, B, method=method, name=N))  # a.method(n) with (b)
    count_where = P("iterate", A, P("cast", B, type="int"), method="sum", name=N)  # a.sum(n) with (int'(b))
    method = staticmethod(lambda name: P("method", A, name=name))  # size, sum
    locate = staticmethod(lambda name: P("select", P("method", A, name=name), P("literal", value=0)))  # a.min()[0]
    select = P("select", A, B)
    inside = P("inside", A, B)
    unique = P("binary", P("method", P("method", A, name="unique"), name="size"), P("method", A, name="size"), operator="==")


class Excel:
    constant = staticmethod(lambda V: P("literal", value=V))
    name = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("field", X, name=K)
    has = P("call", P("call", P("field", X, name=K), callable="ISERROR"), callable="NOT")
    implies = P("call", A, B, P("literal", value=True), callable="IF")
    if_ = P("call", A, B, C, callable="IF")
    shr = P("call", A, B, callable="BITRSHIFT")
    over = staticmethod(lambda function: P("call", P("map", A, B, name=N), callable=function))  # AND(MAP(a, LAMBDA(n, b)))
    count_where = P("call", P("map", A, P("call", B, P("literal", value=1), P("literal", value=0), callable="IF"), name=N),
                    callable="SUM")  # SUM(MAP(a, LAMBDA(n, IF(b, 1, 0))))
    function = staticmethod(lambda name: P("call", A, callable=name))  # ROWS, SUM, MIN, MAX
    index = P("call", A, P("infix", B, P("literal", value=1), operator="+"), callable="INDEX")  # INDEX(a, b + 1)
    match = P("call", P("call", A, B, P("literal", value=0), callable="MATCH"), callable="ISNUMBER")  # ISNUMBER(MATCH(a, b, 0))
    unique = P("infix", P("call", P("call", A, callable="UNIQUE"), callable="ROWS"), P("call", A, callable="ROWS"), operator="=")


class Latex:
    constant = staticmethod(lambda V: P("literal", value=V))
    symbol = P("variable", name=N)
    where = P("let", A, B, name=N)
    get = P("member", X, name=K)
    has = P("call", X, P("literal", value=K), callable="has")
    implies = P("binary", A, B, operator="\\implies")
    frac = P("frac", A, B)


COLLECTIONS: dict[str, dict[str, P]] = {
    "Python": {"all": Python3.all_, "any": Python3.any_, "count where": Python3.count_where, "count": Python3.builtin("len"),
               **{name: Python3.builtin(name) for name in ("sum", "min", "max")}, "item": Python3.index, "in": Python3.in_},
    "Matlab": {"all": Matlab.over("all"), "any": Matlab.over("any"), "count where": Matlab.over("nnz"),
               "count": Matlab.function("numel"), **{name: Matlab.function(name) for name in ("sum", "min", "max")},
               "item": Matlab.index, "in": Matlab.ismember},
    "Excel": {"all": Excel.over("AND"), "any": Excel.over("OR"), "count where": Excel.count_where,
              "count": Excel.function("ROWS"), **{name: Excel.function(name.upper()) for name in ("sum", "min", "max")},
              "item": Excel.index, "in": Excel.match},
}
"""Each dialect's forms of the collection concepts: the quantifiers `all`, `any` and `count where`, and `count`, `sum`,
`min`, `max`, `item` and `in`. `unique`, written as an idiom that does not read back, is not among them."""


def collections(left: str, right: str) -> list[Rule]:
    """Rules that translate the collection concepts of the dialect `left` into those of `right`, and back."""
    return [Rule(pattern, COLLECTIONS[right][concept]) for concept, pattern in COLLECTIONS[left].items()]
