"""Evaluators of the Numpy dialect: compute an expression with numpy, as the code `Expressions.render` writes would.

`Evaluators.OfAny(expression, scope)` binds names to arrays, scalars or records, and returns what numpy returns.
Numpy's rules apply, not Basic's:

- Evaluation is vectorized: a name bound to a column of n values gives n results, broadcast against constants.
- Two-valued logic, eagerly evaluated: every argument of every call is computed (`where` included).
- Numpy promotes types: `add(1, 1.5)` is 2.5, and `equal(1, 1.0)` is True.
- Missing values are masked (`numpy.ma`). Reading a property an object does not have gives `numpy.ma.masked`, and
  masks propagate through calls; `ma.getmaskarray` tells which values are masked. A missing column of a mapping, and
  a name that is not bound, raise as in Python.

It needs numpy (`pip install mbse-expressions[numpy]`).
"""

from __future__ import annotations

import functools
from collections.abc import Mapping
from typing import Any

import numpy

from mbse.Expressions.Framework import Evaluators as F
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions

__all__ = ["OfAny"]


def _function(path: str) -> F.Implementation:
    function = functools.reduce(getattr, path.split("."), numpy)
    return lambda arguments, node: function(*(argument() for argument in arguments))


def _subscript(arguments: list[F.Thunk], node: Any) -> Any:
    value = arguments[0]()
    if isinstance(value, Mapping) or getattr(getattr(value, "dtype", None), "names", None) is not None:
        return value[node.key]
    if not Domains.is_record(value):
        raise TypeError(f"cannot subscript a {type(value).__name__} with {node.key!r}")
    return Validators.properties_of(value).get(node.key, numpy.ma.masked)


def _unbound(kind: str, name: str) -> Any:
    raise NameError(f"name {name!r} is not defined")


_interpreter = F.Interpreter(
    Expressions.DIALECT, {"call": {name: _function(name) for name in Domains.SIGNATURES}, "subscript": _subscript},
    unbound=_unbound)


def OfAny(expression: Any, scope: Mapping[str, Any] | None = None) -> Any:
    """The value of an expression, with the names in `scope` bound."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
