"""The patterns the pairwise translators share: each dialect's forms for the concepts they translate. A translator
pairs two dialects' patterns into rules; the holes are shared, so the patterns of any two dialects pair up."""

from __future__ import annotations

from typing import Any

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
    get = P("call", X, P("literal", value=K), callable="get")
    has = P("call", X, P("literal", value=K), callable="has")
    implies = P("call", A, B, callable="implies")
    shr = P("call", A, B, callable="shr")
    quantifier = staticmethod(lambda name: P("quantifier", A, B, name=N, quantifier=name))
    unary = staticmethod(lambda name: P("call", A, callable=name))  # count, sum, min, max, unique
    item = P("call", A, B, callable="item")
    in_ = P("call", A, B, callable="in")


def _call(function: str, *arguments: P | Hole) -> P:
    return P("python_call", P("variable", name=function), *arguments)


class Python:
    constant = staticmethod(lambda V: P("literal", value=V))
    name = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("python_attribute", X, attr=K)
    has = P("python_call", P("variable", name="hasattr"), X, P("literal", value=K))
    implies = P("python_ifexp", A, B, P("literal", value=True))
    ifexp = P("python_ifexp", A, B, C)
    shr = P("python_binop", A, B, operator=">>")
    all_ = _call("all", P("python_generator", A, B, name=N))
    any_ = _call("any", P("python_generator", A, B, name=N))
    count_where = _call("sum", P("python_generator", A, P("literal", value=1), B, name=N))  # sum(1 for n in a if b)
    builtin = staticmethod(lambda function: _call(function, A))  # len, sum, min, max
    index = P("python_index", A, B)
    in_ = P("python_compare", A, B, operator="in")
    unique = P("python_compare", _call("len", _call("set", A)), _call("len", A), operator="==")


def _numpy(function: str) -> P:
    """The function `np.<function>`, e.g. `np.ma.getmaskarray` for 'ma.getmaskarray'."""
    callee = P("variable", name="np")
    for attr in function.split("."):
        callee = P("python_attribute", callee, attr=attr)
    return callee


class Numpy:
    """Python in NumPy style: columns by subscript, missing values masked, operations as numpy functions."""

    call = staticmethod(lambda function, *arguments: P("python_call", _numpy(function), *arguments))
    get = P("python_subscript", X, key=K)
    has = P("python_call", _numpy("logical_not"), P("python_call", _numpy("ma.getmaskarray"), P("python_subscript", X, key=K)))
    implies = P("python_call", _numpy("where"), A, B, P("literal", value=True))
    prelude = P("python_import", Hole("B"), module="numpy", alias="np")

    @staticmethod
    def renames(kind: str, attribute: str, names: dict[str, str], arity: int) -> list[Rule]:
        """Rules for operators that are numpy functions of the same arguments."""
        arguments = holes(*(f"A{i}" for i in range(arity)))
        return [Rule(P(kind, *arguments, **{attribute: a}), Numpy.call(b, *arguments)) for a, b in names.items()]


class Matlab:
    constant = staticmethod(lambda V: P("literal", value=V))
    identifier = P("variable", name=N)
    get = P("matlab_field", X, name=K)
    has = P("call", X, P("literal", value=K), callable="isfield")
    implies = P("matlab_binary", P("matlab_unary", A, operator="~"), B, operator="||")
    shr = P("call", A, P("matlab_unary", B, operator="-"), callable="bitshift")  # a negative shift is to the right
    over = staticmethod(lambda function: P("call", P("matlab_arrayfun", A, B, name=N), callable=function))  # all(arrayfun(@(n) b, a))
    function = staticmethod(lambda name: P("call", A, callable=name))  # numel, sum, min, max
    index = P("matlab_index", A, P("matlab_binary", B, P("literal", value=1), operator="+"))  # a(b + 1): MATLAB counts from 1
    ismember = P("call", A, B, callable="ismember")
    unique = P("matlab_binary", P("call", P("call", A, callable="unique"), callable="numel"), P("call", A, callable="numel"), operator="==")


class Ccpp:
    constant = staticmethod(lambda V: P("ccpp_constant", value=V))  # untyped
    identifier = P("variable", name=N)
    get = P("ccpp_member", X, name=K)  # with '.'
    implies = P("ccpp_binary", P("ccpp_unary", A, operator="!"), B, operator="||")


class SystemVerilog:
    constant = staticmethod(lambda V: P("literal", value=V))
    identifier = P("variable", name=N)
    get = P("systemverilog_member", X, name=K)
    implies = P("systemverilog_binary", A, B, operator="->")
    iterate = staticmethod(lambda method: P("systemverilog_iterate", A, B, method=method, name=N))  # a.method(n) with (b)
    count_where = P("systemverilog_iterate", A, P("systemverilog_cast", B, type="int"), method="sum", name=N)  # a.sum(n) with (int'(b))
    method = staticmethod(lambda name: P("systemverilog_method", A, name=name))  # size, sum
    locate = staticmethod(lambda name: P("systemverilog_select", P("systemverilog_method", A, name=name), P("literal", value=0)))  # a.min()[0]
    select = P("systemverilog_select", A, B)
    inside = P("systemverilog_inside", A, B)
    unique = P("systemverilog_binary", P("systemverilog_method", P("systemverilog_method", A, name="unique"), name="size"), P("systemverilog_method", A, name="size"), operator="==")


class Excel:
    constant = staticmethod(lambda V: P("literal", value=V))
    name = P("variable", name=N)
    let = P("let", A, B, name=N)
    get = P("excel_field", X, name=K)
    has = P("call", P("call", P("excel_field", X, name=K), callable="ISERROR"), callable="NOT")
    implies = P("call", A, B, P("literal", value=True), callable="IF")
    if_ = P("call", A, B, C, callable="IF")
    shr = P("call", A, B, callable="BITRSHIFT")
    over = staticmethod(lambda function: P("call", P("excel_map", A, B, name=N), callable=function))  # AND(MAP(a, LAMBDA(n, b)))
    count_where = P("call", P("excel_map", A, P("call", B, P("literal", value=1), P("literal", value=0), callable="IF"), name=N),
                    callable="SUM")  # SUM(MAP(a, LAMBDA(n, IF(b, 1, 0))))
    function = staticmethod(lambda name: P("call", A, callable=name))  # ROWS, SUM, MIN, MAX
    index = P("call", A, P("excel_infix", B, P("literal", value=1), operator="+"), callable="INDEX")  # INDEX(a, b + 1)
    match = P("call", P("call", A, B, P("literal", value=0), callable="MATCH"), callable="ISNUMBER")  # ISNUMBER(MATCH(a, b, 0))
    unique = P("excel_infix", P("call", P("call", A, callable="UNIQUE"), callable="ROWS"), P("call", A, callable="ROWS"), operator="=")


class Latex:
    constant = staticmethod(lambda V: P("literal", value=V))
    symbol = P("variable", name=N)
    where = P("let", A, B, name=N)
    get = P("latex_member", X, name=K)
    has = P("call", X, P("literal", value=K), callable="has")
    implies = P("latex_binary", A, B, operator="\\implies")
    frac = P("latex_frac", A, B)


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
