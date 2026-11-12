"""How the framework reads the kinds of the C family, the code its dialects share: C's and C++'s expressions and their
type names (`C`, `Cpp`, `C Types`, `Cpp Types`) read their kinds through `kinds`, check them through `problems`, say
what a binder binds through `scopes`, and write the kinds C evaluates through `Writers`. An internal module of the C
family, which `C.Expressions` re-exports: it imports none of the family's dialects, so that each dialect's module reads
it, and no other, while it is loaded (the TypeScript modules of the family import one another, and a module that read
another's constants while the cycle loaded it would find them undefined). See mbse-basis [CAP-229: the C expression
dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md) and [CAP-230: the C++ expression
dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md)."""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from . import Domains

__all__ = ["EXTENSIONS", "PREFIXES", "QUOTES", "SUFFIXES", "CPP_SUFFIXES", "OPTIONAL", "SPELLING", "Writers", "type_name", "cast_type",
           "truth", "size", "untyped", "bound_names", "problems", "scopes", "kinds", "identifier_problems",
           "constant_text"]

LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE = "literal", "constant", "concatenatedstring", "variable"
PARENTHESIZEDEXPRESSION, GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION = (
    "parenthesizedexpression", "genericselection", "subscriptexpression", "callexpression")
MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION = (
    "memberexpression", "postfixexpression", "unaryexpression", "sizeofexpression")
ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION = (
    "alignofexpression", "castexpression", "binaryexpression", "conditionalexpression")
ASSIGNMENTEXPRESSION, INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION = (
    "assignmentexpression", "initializerlist", "designatedinitializer", "compoundliteralexpression")
STATEMENTEXPRESSION, EXTENSIONEXPRESSION, TYPEID = "statementexpression", "extensionexpression", "typeid"
ENUMERATOR = "enumerator"

EXTENSIONS = frozenset({STATEMENTEXPRESSION, EXTENSIONEXPRESSION})
"""GNU's extensions, outside every standard, as mbse-programs marks them."""

PREFIXES = ("L", "u8", "u", "U")
"""A character's or a string's encoding prefixes."""

QUOTES = ("'", '"')
"""A character literal's quote, and a string's."""

SUFFIXES = {
    int: re.compile(r"(?i:u?(?:l|ll|wb)?|(?:l|ll|wb)u)"),
    float: re.compile(r"[fFlL]|df|dd|dl|DF|DD|DL|[fF](?:16|32|64|128|32x|64x|128x)"),
}
"""The suffixes C writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C23's `wb`, in either case
and order) and a floating literal's (`f`, `l`, C23's decimal and interchange types' `df`, `f32`)."""

CPP_SUFFIXES = {
    int: re.compile(r"(?i:u?(?:l|ll|z)?|(?:l|ll|z)u)"),
    float: re.compile(r"[fFlL]|[fF](?:16|32|64|128)|bf16|BF16"),
}
"""The suffixes C++ writes (`Cpp.Expressions.SUFFIXES`), by the type of the literal's value: an integer's (`u`, `l`,
`ll`, C++23's `z`, in either case and order) and a floating literal's (`f`, `l`, C++23's extended types' `f16` to `f128`
and `bf16`)."""

# --- Reading a term's type name, and what its helpers bind and check ---


def _nodes(value: Any) -> tuple[F.Node, ...]:
    """A helper property's nodes: none where it is absent, one, or each of many."""
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _spelling(name: Any) -> str | None:
    """A name's spelling: an identifier's `spelling` (a `Terms.Part` or a `Node`), or None for any other name, or
    none."""
    return name.attributes.get("spelling") if name is not None and name.kind == "identifier" else None


def type_name(term: Any) -> str | None:
    """The name of the arithmetic type a type name names (a `typeid`, the term a cast's type holds), by
    `Domains.arithmetic` (`unsigned int`, `uint8_t`), or None: a type with a declarator, or of a specifier that is not a
    keyword or a type's name. Whether a store defines it is the store's (`Domains.Types`)."""
    node = F.node(*F.kind_of(term))
    if node.kind != TYPEID or "declarator" in node.helpers:
        return None
    names = []
    for specifier in node.helpers.get("specifiers", ()):
        if specifier.kind in ("primitivetypespecifier", "cvqualifier"):
            names.append(specifier.attributes.get("keyword"))
        elif specifier.kind == "namedtypespecifier":
            names.append(_spelling(specifier.helpers.get("name")))
        else:
            return None
    return Domains.arithmetic(names)


def _declared(node: Any) -> frozenset[str]:
    """The name a declarator declares, within its parentheses, pointers, arrays and functions: none, if abstract."""
    while node is not None and node.kind != "iddeclarator":
        node = node.helpers.get("declarator")
    if node is None:
        return frozenset()
    return frozenset({_spelling(node.helpers.get("name"))}) - {None}


def bound_names(node: F.Node) -> frozenset[str]:
    """The names a function declarator's parameters, a lambda's parameters and init captures, or a requires
    expression's parameters bind within it: each parameter declaration's declarator's name, each init capture's."""
    held = [*_nodes(node.helpers.get("parameters")), *_nodes(node.helpers.get("captures"))]
    declarator = node.helpers.get("declarator")  # a lambda's, its parameters
    if declarator is not None and node.kind == "lambdaexpression":
        held += _nodes(declarator.helpers.get("parameters"))
    declared = (_declared(p.helpers.get("declarator")) for p in held if p.kind == "parameterdeclaration")
    found = frozenset[str]().union(*declared)
    return found | ({_spelling(p.helpers.get("name")) for p in held if p.kind == "initcapture"} - {None})


_BINDERS = frozenset({"functiondeclarator", "lambdaexpression", "requiresexpression"})


def _bound(node: F.Node, inner: frozenset[str]) -> list[frozenset[str]]:
    """The names each of a node's arguments has bound, in order: within a function declarator, a lambda or a requires
    expression, its parameters' (and init captures') names; its slots, its variadic arguments, then its helpers'."""
    if node.kind in _BINDERS:
        inner = inner | bound_names(node)
    found = [inner] * (len(node.slots) + len(node.many))
    for value in node.helpers.values():
        for helper in _nodes(value):
            found += _bound(helper, inner)
    return found


def scopes(tag: str) -> Callable[[Any], list[frozenset[str]]]:
    """What each argument of a kind has bound, besides its scope's: the parameters a function declarator, a lambda or
    a requires expression declares, within it (`bound_names`)."""
    def scopes(record: Any) -> list[frozenset[str]]:
        return _bound(F.node(tag, record), frozenset())

    return scopes


_IDENTIFIER = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")

_NAMES = {"variable": "name", "identifier": "spelling"}
"""The kinds and helpers that hold an identifier's spelling, and where: the framework's variable, and an identifier,
wherever a name is held."""


def identifier_problems(value: Any) -> list[str]:
    """An identifier, as mbse-programs checks it: letters, digits, `_` and `$`, not starting with a digit; characters
    beyond ASCII are taken to be letters."""
    if type(value) is not str or not value:
        return []
    ascii_ = "".join(c if c.isascii() else "a" for c in value)
    return [] if _IDENTIFIER.fullmatch(ascii_) else [f"{value!r} is not an identifier"]


def _literal_problems(attributes: Mapping[str, Any], prefixes: tuple[str, ...],
                      suffixes: Mapping[type, re.Pattern[str]], language: str, types: Domains.Types) -> list[str]:
    """A literal's encoded properties: its prefix, its quote, its base and its suffix, each one its dialect writes, and
    its value, one of its type (`Domains.out_of_range`), read through `types`; a type neither its dialect nor its
    holder's ABI defines is reported by name."""
    problems = []
    prefix, quote, base, suffix = (attributes.get(name) for name in ("prefix", "quote", "base", "suffix"))
    if prefix is not None and prefix not in prefixes:
        problems.append(f"a literal's prefix cannot be {prefix!r}")
    if quote is not None and quote not in QUOTES:
        problems.append(f"a literal's quote cannot be {quote!r}")
    if base is not None and base not in (2, 8, 10, 16):
        problems.append(f"a literal's base cannot be {base!r}")
    if suffix is not None:
        allowed = suffixes.get(type(attributes.get("value")))
        if allowed is None or not allowed.fullmatch(suffix):
            problems.append(f"a literal's suffix cannot be {suffix!r}")
    try:
        out = Domains.out_of_range(attributes, language, types)
    except ValueError as error:  # its type is not defined in its holder's store
        out = str(error)
    return problems + ([out] if out is not None else [])


def constant_text(attributes: Mapping[str, Any]) -> str:
    """A constant's text: as written (`text`), else its default spelling, `nullptr`. The printer writes it, and a
    refusal shows it (`Kind.shown`)."""
    return attributes.get("text", "nullptr")


def _constant_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A constant holds `nullptr`, unless its text is invalid, its problems said."""
    singleton = attributes.get("singleton")
    if singleton is None:
        return [] if "problems" in attributes else ["a constant needs a singleton"]
    return [] if singleton == "nullptr" else [f"a constant's singleton must be nullptr, got {singleton!r}"]


def problems(node: F.Node, types: Domains.Types, suffixes: Mapping[type, re.Pattern[str]] = SUFFIXES,
             prefixes: tuple[str, ...] = PREFIXES, language: str = "C") -> list[str]:
    """A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
    identifier's spelling, a literal's encoded properties and its value's range, in `language` (`C` or `C++`), its type
    read through `types`, a member's operator, invalid syntax in a sublanguage, an enumeration's enumerators within its
    body."""
    kind, attributes = node.kind, node.attributes
    found = F.invalid_problems(kind, attributes) if kind in ("error", "missing") else []
    found += identifier_problems(attributes.get(_NAMES.get(kind, "")))
    if kind == MEMBEREXPRESSION and attributes.get("operator") not in (None, ".", "->"):
        found.append(f"a memberexpression's operator must be '.' or '->', got {attributes['operator']!r}")
    found += _constant_problems(attributes) if kind == CONSTANT else []
    if kind == "enumspecifier" and not attributes.get("body") and (node.many or attributes.get("trailing_comma")):
        found.append("an EnumSpecifier with enumerators has a body")
    found += _literal_problems(attributes, prefixes, suffixes, language, types) if kind == LITERAL else []
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner, types, suffixes, prefixes, language)
    return found


_ANY1 = FD.Function((FD.Anything,), FD.Anything)

OPTIONAL = ("*.size", "*.last", "*.condition", "*.default", "*.requires", "*.base", "*.trailing_return")
"""The slots of a kind's helpers that may be empty, wherever its type names nest them: an array declarator's size, a
designator's range's last index, a noexcept specifier's condition, a parameter's default argument or a type
parameter's default type, a lambda's or a template parameter's requires clause, an enumeration's fixed type, and a
function's or a lambda's trailing return type."""


_KEYWORD_TYPES = frozenset(Domains.NAMES)
"""The types C's keywords name, which a store's dialects must define; a type's name may be a program's own."""


def cast_type(name: str | None, types: Domains.Types) -> Domains.CType | None:
    """The arithmetic type a cast names, by its name (`type_name`), read through `types`: one its keywords name must be
    defined (`int`), one a type's name names may be a program's own, so not arithmetic (`my_t`); None for a type that is
    not arithmetic."""
    if name is None:
        return None
    return types.named(name) if name in _KEYWORD_TYPES else types.find(name)


def _path(language: str) -> str:
    return "C.Expressions" if language == "C" else "Cpp.Expressions"


def truth(language: str) -> Callable[[Any], FD.Domain]:
    """A kind's domain that is `bool`, read from the store of the term's holder (a comparison's, `!`'s,
    `noexcept`'s)."""
    return lambda record: Domains.Types(record, _path(language)).named("bool")


def size(language: str) -> Callable[[Any], FD.Domain]:
    """`sizeof`'s and `alignof`'s domain, `size_t`, read from the store of the term's holder."""
    return lambda record: Domains.Types(record, _path(language)).named("size_t")


_TRUTHS = frozenset({"<", "<=", ">", ">=", "==", "!=", "&&", "||", "!"})


def _operator_truth(language: str) -> Callable[[Any], FD.Domain | None]:
    """An operator's domain where it is `bool` (a comparison, `&&`, `||`, `!`), read from the store of the term's
    holder; None for any other, whose domain is its signature's."""
    read = truth(language)
    return lambda record: read(record) if F.attributes_of(record).get("operator") in _TRUTHS else None


SPELLING = {"C": ("text", "problems", "quote", "base", "separators"),
            "C++": ("text", "problems", "base", "separators", "raw", "delimiter")}
"""A literal's spelling, in each language: what its text writes beside its value, not what it is. A character's quote is
C's spelling, `'a'` an `int` as `97` is, and not C++'s, where `'a'` is a `char`: there it is what the literal is."""


def kinds(language: str, tags: tuple[str, ...], prefixes: tuple[str, ...],
          suffixes: Mapping[type, re.Pattern[str]]) -> dict[str, F.Kind]:
    """How the framework reads the kinds of the C family that a dialect has (`tags`, in its `Term`'s order: those it
    shares with the other language of the family), in `language` (`C` or `C++`), whose binary operators, literals'
    types, prefixes and suffixes differ."""

    def check(tag: str) -> Callable[[Any], list[str]]:
        return lambda record: problems(F.node(tag, record), Domains.Types(record, _path(language)), suffixes, prefixes,
                                       language)

    def typed_cast(record: Any) -> FD.Domain | None:
        """A cast's arithmetic type, which is its domain, read from the store of the term's holder."""
        return cast_type(type_name(F.node(CASTEXPRESSION, record).slots["type"]), Domains.Types(record, _path(language)))

    def application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (),
                    **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=signature, check=check(tag),
                      scopes=scopes(tag), optional=optional + OPTIONAL, **options)

    def operator(tag: str, vocabulary: Mapping[str, FD.Signature], **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=("operator",),
                      check=check(tag), scopes=scopes(tag), **options)

    every: dict[str, Callable[[], F.Kind]] = {
        LITERAL: lambda: F.Kind(F.LITERAL, spelling=SPELLING[language], check=check(LITERAL),
                                typed=lambda record: Domains.literal(F.attributes_of(record), language,
                                                                     Domains.Types(record, _path(language)))),
        CONSTANT: lambda: F.Kind(F.LITERAL, spelling=("text", "problems"), check=check(CONSTANT),
                                 typed=lambda record: Domains.NULLPTR,
                                 shown=constant_text),
        CONCATENATEDSTRING: lambda: application(CONCATENATEDSTRING, FD.Opaque(Domains.String)),
        VARIABLE: lambda: F.Kind(F.REFERENCE, required=("name",), check=check(VARIABLE)),
        PARENTHESIZEDEXPRESSION: lambda: application(PARENTHESIZEDEXPRESSION, _ANY1),
        GENERICSELECTION: lambda: application(GENERICSELECTION, optional=("type",)),  # an association's: `default`
        SUBSCRIPTEXPRESSION: lambda: application(SUBSCRIPTEXPRESSION, Domains.SUBSCRIPT),
        CALLEXPRESSION: lambda: application(CALLEXPRESSION, Domains.CALL),
        MEMBEREXPRESSION: lambda: application(MEMBEREXPRESSION, Domains.MEMBER, required=("operator", "member")),
        POSTFIXEXPRESSION: lambda: operator(POSTFIXEXPRESSION, Domains.POSTFIX),
        UNARYEXPRESSION: lambda: operator(UNARYEXPRESSION, Domains.UNARY, typed=_operator_truth(language)),
        SIZEOFEXPRESSION: lambda: application(SIZEOFEXPRESSION, Domains.SIZE, typed=size(language)),
        ALIGNOFEXPRESSION: lambda: application(ALIGNOFEXPRESSION, Domains.SIZE, required=("keyword",),
                                               typed=size(language)),
        CASTEXPRESSION: lambda: application(CASTEXPRESSION, Domains.CAST, typed=typed_cast),
        BINARYEXPRESSION: lambda: operator(BINARYEXPRESSION, Domains.BINARY if language == "C" else Domains.BINARY_CPP,
                                           typed=_operator_truth(language)),
        CONDITIONALEXPRESSION: lambda: application(CONDITIONALEXPRESSION, Domains.CONDITIONAL,
                                                   optional=("consequence",)),
        ASSIGNMENTEXPRESSION: lambda: operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
        INITIALIZERLIST: lambda: application(INITIALIZERLIST),
        DESIGNATEDINITIALIZER: lambda: application(DESIGNATEDINITIALIZER, required=("initializer",)),
        COMPOUNDLITERALEXPRESSION: lambda: application(COMPOUNDLITERALEXPRESSION, required=("initializer",)),
        STATEMENTEXPRESSION: lambda: application(STATEMENTEXPRESSION),
        EXTENSIONEXPRESSION: lambda: application(EXTENSIONEXPRESSION, _ANY1),
        TYPEID: lambda: application(TYPEID),
        ENUMERATOR: lambda: application(ENUMERATOR, required=("name",), optional=("value",)),
    }
    return {tag: every[tag]() for tag in tags if tag in every}


def untyped(value: Any) -> FD.Domain:
    """The domain of a literal no type holds, an int beyond every type its suffix allows (`Kind.typed` reads the
    others'): not known."""
    return FD.Anything


def _identifier_name(spelling: str) -> Any:
    """A name that is an identifier: its spelling, written in a `Name`."""
    return lambda n: n.identifier(lambda i: i.spelling(spelling))


class Writers:
    """The writers of the kinds the C family evaluates, for one dialect: its `Terms.Dialect`, whose `spec` writes a
    native value as its literal, and its `Writer`. C's are this module's functions; `Cpp`'s, its own."""

    def __init__(self, dialect: F.Dialect, writer: type[F.Writer]):
        self.dialect, self.writer = dialect, writer

    def literal(self, value: Any, suffix: str | None = None) -> Any:
        """The literal `value` (a bool, an int, a float or a str), with `suffix` as written (`u`, `ull`, `f`, `L`),
        which gives its type."""

        def record(r: Any) -> Any:
            if value is not None:
                r.value(lambda p: p.as_scalar(value))
            return r if suffix is None else r.suffix(suffix)

        return self.writer(lambda u: u.literal(record))

    def identifier(self, name: str) -> Any:
        """The variable `name`: an identifier used as an expression."""
        return self.writer(lambda u: u.variable(lambda r: r.name(name)))

    def unary(self, operator: str, operand: Any) -> Any:
        """`<operator> operand`; the operand is a spec (a native value is a literal)."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.unaryexpression(lambda r: r.operator(operator).operand(operand)))

    def binary(self, operator: str, left: Any, right: Any) -> Any:
        """`left <operator> right`; each operand is a spec."""
        left, right = self.dialect.spec(left), self.dialect.spec(right)
        return self.writer(lambda u: u.binaryexpression(lambda r: r.left(left).operator(operator).right(right)))

    def conditional(self, condition: Any, consequence: Any, alternative: Any) -> Any:
        """`condition ? consequence : alternative`."""
        condition, consequence = self.dialect.spec(condition), self.dialect.spec(consequence)
        alternative = self.dialect.spec(alternative)
        return self.writer(lambda u: u.conditionalexpression(
            lambda r: r.condition(condition).consequence(consequence).alternative(alternative)))

    def cast(self, type: Any, operand: Any) -> Any:
        """`(type) operand`, `type` a spec of its family's Types' `Term` (C Types', Cpp Types'), written through the
        builders (`lambda t: t.typeid(lambda i: i.specifiers([lambda s: s.primitivetypespecifier(lambda p: p.keyword(
        "int"))]))`)."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.castexpression(lambda r: r.type(type).operand(operand)))

    def member(self, object: Any, name: str, operator: str = ".") -> Any:
        """`object.name`, or `object->name` with the operator '->'."""
        object = self.dialect.spec(object)
        return self.writer(lambda u: u.memberexpression(
            lambda r: r.object(object).operator(operator).member(_identifier_name(name))))

    def subscript(self, object: Any, *indices: Any) -> Any:
        """`object[index]` (C++23's `object[i, j]` with several)."""
        object, specs = self.dialect.spec(object), [self.dialect.spec(index) for index in indices]
        return self.writer(lambda u: u.subscriptexpression(lambda r: r.object(object).indices(specs)))

    def call(self, function: Any, *arguments: Any) -> Any:
        """`function(arguments...)`: a function by its name (a `str`, the variable that names it), or any term."""
        function = self.identifier(function) if type(function) is str else self.dialect.spec(function)
        specs = [self.dialect.spec(argument) for argument in arguments]
        return self.writer(lambda u: u.callexpression(lambda r: r.function(function).arguments(specs)))
