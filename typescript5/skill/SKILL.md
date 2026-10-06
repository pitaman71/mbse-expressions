---
name: mbse-expressions
description: Write constraints once, as language-neutral data (expressions), then validate, evaluate, store (JSON/YAML), and translate them to and from Python, MATLAB, Excel, LaTeX, C/C++ and SystemVerilog, in Python or TypeScript. Use when formalizing the constraints of an interface or model (MBSE/SysML constraints, interface control documents, what others call business rules, constraints about mbse-schemas data), when one constraint must mean the same thing in several languages or tools, when generating Excel formulas, MATLAB, Python, C or SystemVerilog from a constraint (embedded software, hardware assertions and constraints), or when writing code that imports mbse.Expressions or @mbse/expressions.
---

# mbse-expressions

An expression here is data with a schema, not code. It is the neutral, semantically normalized formalization of the
constraints in an interface or model, such as "65 or older, with an email on file". It
is stored with the rest of the data ([mbse-schemas](https://github.com/pitaman71/mbse-schemas) objects), evaluated
the same way in Python (`mbse.Expressions`) and TypeScript (`@mbse/expressions`), and translated between expression
languages, called dialects:

- **Basic**, the core vocabulary: comparisons, Kleene logic, arithmetic and bitwise operations over value domains,
  property access, lets, and collections with quantifiers. Every binding evaluates it, and it is the neutral form of
  every constraint.
- **Python**, **Matlab** and **Excel**, which model those languages' expressions: each renders as its source text and
  evaluates by its own rules.
- **Latex**, mathematical notation: it renders, validates and translates, but has no evaluator.
- **Ccpp**, C and C++ expressions over their arithmetic types: it renders as C source and evaluates by C's rules
  (promotions, wrapping unsigned arithmetic, undefined behavior raising); it translates to and from Basic.
- **SystemVerilog**, hardware expressions and constraints over 4-state vectors and reals: it renders as SystemVerilog
  source and evaluates by IEEE 1800's rules (sizing by context, x and z propagating); it translates to and from Basic.

## When to use it

- A constraint belongs to an interface or model, and several programs, languages or tools must apply it identically.
- The constraint must be stored, versioned, diffed or sent as data, then analyzed or rewritten, not just evaluated.
- One constraint must become an Excel formula, MATLAB code, Python code or LaTeX notation, or be read back from them.
- You are choosing branches of an mbse-schemas union, or checking its values with `Validators.Validate`.

It is a poor fit for logic that is simply part of one program; write that in the program's own language.

Why the mbse repositories exist, and this one's part: [MBSE.md](https://github.com/pitaman71/mbse-expressions/blob/main/MBSE.md).

## Practices that prevent most mistakes

1. **Writers build data; nothing evaluates until asked.** `variable("this").age.ge(18)` is the expression
   `ge(get(this, 'age'), 18)`. Evaluate it with a dialect's `Evaluators.OfAny(expression, scope)`.
2. **Basic is three-valued and never coerces.** An absent property is unknown (`None`/`null`), and `and`/`or` follow
   Kleene. `1 == 1.0` is unknown, since int and float are different types; in TypeScript, an int is a `bigint` (`18n`).
3. **Only the core vocabulary is guaranteed.** Other operation names are extensions; `validate(core=True)` reports
   them, and evaluating one raises.
4. **Each dialect evaluates by its own language's rules.** A translation keeps a constraint's form, not always its
   value: a missing property is unknown in Basic, `#FIELD!` in Excel, and an error in Python and MATLAB.
5. **Nothing is imported or called unless the scope provides it.** Python modules, MATLAB packages and Excel add-ins
   come from an allowlist in the scope, so expressions from untrusted data cannot reach other code.
6. **Serialize through the dialect.** The root schema is `DIALECT.schema_of(expression)`, and decoding needs that
   dialect's `Builders`.

## Load the reference for your task

| Task | Read |
|---|---|
| Write Python: a complete program, API cheat sheet, traps | [references/python.md](references/python.md) |
| Write TypeScript: the same program, the differences from Python | [references/typescript.md](references/typescript.md) |
| Pick a dialect, write its expressions, give it a scope (imports, packages, workbooks) | [references/dialects.md](references/dialects.md) |
| Translate between dialects, or rewrite within one; what survives a round trip | [references/translating.md](references/translating.md) |
| Add a dialect or a translator | [references/extending.md](references/extending.md) |
| Model the schemas the expressions refer to | the [mbse-schemas skill](https://github.com/pitaman71/mbse-schemas/blob/main/skills/mbse-schemas/SKILL.md) |

Deeper material is in the repository: `docs/EXPRESSIONS.md` holds the design, every decision and the open questions, and
eight tutorial case studies (`python3/tutorials/`, `typescript5/tutorials/`) teach it from a first constraint to C and
SystemVerilog. Links use `https://github.com/pitaman71/mbse-expressions/blob/main/<path>`; in a
checkout, `<path>` is relative to the repository root.
