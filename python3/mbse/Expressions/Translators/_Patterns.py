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
    shr = P("operation", A, B, name="shr")
    quantifier = staticmethod(lambda name: P("quantifier", A, B, name=N, quantifier=name))
    unary = staticmethod(lambda name: P("operation", A, name=name))  # count, sum, min, max, unique
    item = P("operation", A, B, name="item")
    in_ = P("operation", A, B, name="in")


def _call(function: str, *arguments: P | Hole) -> P:
    return P("call", P("name", name=function), *arguments)


class Python:
    constant = staticmethod(lambda V: P("constant", value=V))
    name = P("name", name=N)
    let = P("let", A, B, name=N)
    get = P("attribute", X, attr=K)
    has = P("call", P("name", name="hasattr"), X, P("constant", value=K))
    implies = P("ifexp", A, B, P("constant", value=True))
    ifexp = P("ifexp", A, B, C)
    shr = P("binop", A, B, operator=">>")
    all_ = _call("all", P("generator", A, B, name=N))
    any_ = _call("any", P("generator", A, B, name=N))
    count_where = _call("sum", P("generator", A, P("constant", value=1), B, name=N))  # sum(1 for n in a if b)
    builtin = staticmethod(lambda function: _call(function, A))  # len, sum, min, max
    index = P("index", A, B)
    in_ = P("compare", A, B, operator="in")
    unique = P("compare", _call("len", _call("set", A)), _call("len", A), operator="==")


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
    shr = P("call", A, P("unary", B, operator="-"), function="bitshift")  # a negative shift is to the right
    over = staticmethod(lambda function: P("call", P("arrayfun", A, B, name=N), function=function))  # all(arrayfun(@(n) b, a))
    function = staticmethod(lambda name: P("call", A, function=name))  # numel, sum, min, max
    index = P("index", A, P("binary", B, P("constant", value=1), operator="+"))  # a(b + 1): MATLAB counts from 1
    ismember = P("call", A, B, function="ismember")
    unique = P("binary", P("call", P("call", A, function="unique"), function="numel"), P("call", A, function="numel"), operator="==")


class Ccpp:
    constant = staticmethod(lambda V: P("constant", value=V))  # untyped
    identifier = P("identifier", name=N)
    get = P("member", X, name=K)  # with '.'
    implies = P("binary", P("unary", A, operator="!"), B, operator="||")


class SystemVerilog:
    constant = staticmethod(lambda V: P("constant", value=V))
    identifier = P("identifier", name=N)
    get = P("member", X, name=K)
    implies = P("binary", A, B, operator="->")
    iterate = staticmethod(lambda method: P("iterate", A, B, method=method, name=N))  # a.method(n) with (b)
    count_where = P("iterate", A, P("cast", B, type="int"), method="sum", name=N)  # a.sum(n) with (int'(b))
    method = staticmethod(lambda name: P("method", A, name=name))  # size, sum
    locate = staticmethod(lambda name: P("select", P("method", A, name=name), P("constant", value=0)))  # a.min()[0]
    select = P("select", A, B)
    inside = P("inside", A, B)
    unique = P("binary", P("method", P("method", A, name="unique"), name="size"), P("method", A, name="size"), operator="==")


class Excel:
    constant = staticmethod(lambda V: P("constant", value=V))
    name = P("name", name=N)
    let = P("let", A, B, name=N)
    get = P("field", X, name=K)
    has = P("function", P("function", P("field", X, name=K), name="ISERROR"), name="NOT")
    implies = P("function", A, B, P("constant", value=True), name="IF")
    if_ = P("function", A, B, C, name="IF")
    shr = P("function", A, B, name="BITRSHIFT")
    over = staticmethod(lambda function: P("function", P("map", A, B, name=N), name=function))  # AND(MAP(a, LAMBDA(n, b)))
    count_where = P("function", P("map", A, P("function", B, P("constant", value=1), P("constant", value=0), name="IF"), name=N),
                    name="SUM")  # SUM(MAP(a, LAMBDA(n, IF(b, 1, 0))))
    function = staticmethod(lambda name: P("function", A, name=name))  # ROWS, SUM, MIN, MAX
    index = P("function", A, P("infix", B, P("constant", value=1), operator="+"), name="INDEX")  # INDEX(a, b + 1)
    match = P("function", P("function", A, B, P("constant", value=0), name="MATCH"), name="ISNUMBER")  # ISNUMBER(MATCH(a, b, 0))
    unique = P("infix", P("function", P("function", A, name="UNIQUE"), name="ROWS"), P("function", A, name="ROWS"), operator="=")


class Latex:
    constant = staticmethod(lambda V: P("constant", value=V))
    symbol = P("symbol", name=N)
    where = P("where", A, B, name=N)
    get = P("member", X, name=K)
    has = P("function", X, P("constant", value=K), name="has")
    implies = P("binary", A, B, operator="\\implies")
    frac = P("frac", A, B)


COLLECTIONS: dict[str, dict[str, P]] = {
    "Python": {"all": Python.all_, "any": Python.any_, "count where": Python.count_where, "count": Python.builtin("len"),
               **{name: Python.builtin(name) for name in ("sum", "min", "max")}, "item": Python.index, "in": Python.in_},
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
