# DOM-20, for 09_Domains (both languages), and DOM-18's delta

Tested: each code cell below was appended to a scratch copy of the current 09_Domains (with DOM-18's delta applied,
the other agent's DOM-21 present) and the copy passed in each language (`uv run pytest`; the TypeScript runner with
`--typecheck`); the scratch copies are deleted. No new import is needed: 09's setup already imports `SystemVerilog`
(the package `mbse.Expressions.SystemVerilog.Expressions` / `@mbse/expressions/SystemVerilog/Expressions`),
`Builders`, `JSON`, `Validators`, `FD`, `raises` (Python) and `LookupError`, `equal`, `same`, `assert`,
`raises` (TypeScript); it reads `INSTALLS` and DOM-17's `domains` (IEEE 754's own `binary64` and `binary32`).
Place it after DOM-18, before DOM-21 (IDs in order).

## Markdown cell (both languages)

```markdown
<a id="DOM-20"></a>
## DOM-20 · SystemVerilog's domains are stored: its define writes IEEE 1800's built-in types, by name, of its kinds logic and bit or IEEE 754's, with their properties and, for the 2-state ones, their schemas
```

## Code cell, Python

```python
# SystemVerilog's define, run after the installs in a transaction of its own: its domains, IEEE 1800's built-in types,
# owned by its singleton by name, in order, each of its own kinds, `logic` (4-state) and `bit` (2-state), or of IEEE
# 754's, with its parameters and its inferred properties; each 2-state one is related to its schema, an OfAny of the
# scalar it narrows, both ways, and a 4-state one has none, since no basic scalar holds x or z.
hardware = Builders.Store()
for install in [*INSTALLS, SystemVerilog.install]:
    hardware.transaction(install)
SV_PATH = "Expressions.SystemVerilog.Expressions"


def integral(width, signed, least, greatest):
    """An integral domain's properties: its parameters, then its least and greatest known values, and ordered."""
    return {"width": width, "signed": signed, "least": least, "greatest": greatest, "ordered": True}


LOGIC, BIT = ("systemverilog", "logic"), ("systemverilog", "bit")
REAL = {"format": "binary64", "rounding": "roundTiesToEven", "radix": 2, "precision": 53, "emax": 1023, "ordered": True}
SHORTREAL = {"format": "binary32", "rounding": "roundTiesToEven", "radix": 2, "precision": 24, "emax": 127, "ordered": True}
SYSTEMVERILOG = {  # its domains in order: its kind, its properties, the scalar its schema narrows (None: 4-state, none)
    "logic": (LOGIC, integral(1, False, 0, 1), None), "reg": (LOGIC, integral(1, False, 0, 1), None),
    "integer": (LOGIC, integral(32, True, -2 ** 31, 2 ** 31 - 1), None), "time": (LOGIC, integral(64, False, 0, 2 ** 64 - 1), None),
    "bit": (BIT, integral(1, False, 0, 1), "int"), "byte": (BIT, integral(8, True, -128, 127), "int"),
    "shortint": (BIT, integral(16, True, -2 ** 15, 2 ** 15 - 1), "int"), "int": (BIT, integral(32, True, -2 ** 31, 2 ** 31 - 1), "int"),
    "longint": (BIT, integral(64, True, -2 ** 63, 2 ** 63 - 1), "int"),
    "real": (("ieee754", "ieee754"), REAL, "float"), "shortreal": (("ieee754", "ieee754"), SHORTREAL, "float"),
}
assert SystemVerilog.Expressions.define is SystemVerilog.define  # its package exports its module's
frame = hardware.transaction(SystemVerilog.define)[0]
sv_dialect = hardware.singleton(SV_PATH)
assert frame["dialect"] is sv_dialect and [str(e.name) for e in sv_dialect.domains] == list(SYSTEMVERILOG)
HardwareDomain = hardware.registered("Expressions.Framework.Domain")
for name, (kind, properties, scalar) in SYSTEMVERILOG.items():
    domain = sv_dialect.domains({"name": name})
    assert frame[name] is domain and Validators.Validate(hardware)(HardwareDomain, domain) == [], name
    assert FD.kind_of(domain)[:2] == kind and FD.properties(domain) == properties and FD.name_of(domain) == name
    if scalar is None:  # 4-state: no basic scalar holds x or z, so no schema
        assert list(domain.schema) == []
        with raises(LookupError, match=f"no schema registered as '{SV_PATH}.{name}'"):
            hardware.registered(f"{SV_PATH}.{name}")
        continue
    schema = hardware.registered(f"{SV_PATH}.{name}")
    assert schema.schemas == (hardware.registered(f"Schemas.Of{scalar.capitalize()}"),) and schema.validate() == []
    assert [e.schema for e in domain.schema] == [schema]  # HasDomain, both ways
    read = [e.domain for e in Builders.OfAny.Builder(schema, False, hardware).domain]
    assert [(FD.name_of(d), FD.kind_of(d)[:2], FD.properties(d)) for d in read] == [(name, kind, properties)]
# Its kinds, each its own record schema, their parameters, then their inferred properties; `reg` is `logic`'s equal,
# its own domain, not a synonym; `real` and `shortreal` hold IEEE 754's parameters of their formats.
for tag, record in [("logic", "OfLogic"), ("bit", "OfBit")]:
    assert list(hardware.registered(f"{SV_PATH}.{record}").properties) == ["width", "signed", "least", "greatest", "ordered"]
    assert FD.kind_of(sv_dialect.domains({"name": tag}))[2].as_schema() is hardware.registered(f"{SV_PATH}.{record}")
logic, reg = sv_dialect.domains({"name": "logic"}), sv_dialect.domains({"name": "reg"})
assert reg is not logic and FD.properties(reg) == FD.properties(logic)
assert FD.properties(domains["binary64"]) == REAL and FD.properties(domains["binary32"]) == SHORTREAL  # IEEE 754's own
# Each is a type SystemVerilog's evaluation, inference and validation read by name, as its working value: its width,
# signedness, states (by its kind) and format, labelled with its name.
assert [(t.kind, t.width, t.signed, t.states, t.format, t.name()) for t in (SystemVerilog.Domains.named(hardware, name) for name in SYSTEMVERILOG)] == [
    ("integral", 1, False, 4, None, "logic"), ("integral", 1, False, 4, None, "reg"), ("integral", 32, True, 4, None, "integer"),
    ("integral", 64, False, 4, None, "time"), ("integral", 1, False, 2, None, "bit"), ("integral", 8, True, 2, None, "byte"),
    ("integral", 16, True, 2, None, "shortint"), ("integral", 32, True, 2, None, "int"), ("integral", 64, True, 2, None, "longint"),
    ("real", 64, True, 2, "binary64", "real"), ("real", 32, True, 2, "binary32", "shortreal")]
# Run again, the define writes nothing; the store round-trips whole into one with the same installs.
snapshot = JSON.ToJSON(hardware).Snapshot()
assert hardware.transaction(SystemVerilog.define)[0]["int"] is sv_dialect.domains({"name": "int"})
assert JSON.ToJSON(hardware).Snapshot() == snapshot
again = Builders.Store()
for install in [*INSTALLS, SystemVerilog.install]:
    again.transaction(install)
JSON.FromJSON(again).Snapshot(snapshot)
assert JSON.ToJSON(again).Snapshot() == snapshot
assert {str(e.name): (FD.kind_of(e.domain)[:2], FD.properties(e.domain)) for e in again.singleton(SV_PATH).domains} == {
    name: (kind, properties) for name, (kind, properties, _) in SYSTEMVERILOG.items()}
```

## Code cell, TypeScript

```typescript
{
  // SystemVerilog's define, run after the installs in a transaction of its own: its domains, IEEE 1800's built-in types,
  // owned by its singleton by name, in order, each of its own kinds, `logic` (4-state) and `bit` (2-state), or of IEEE
  // 754's, with its parameters and its inferred properties; each 2-state one is related to its schema, an OfAny of the
  // scalar it narrows, both ways, and a 4-state one has none, since no basic scalar holds x or z.
  const hardware: any = new Builders.Store();
  for (const install of [...INSTALLS, SystemVerilog.install]) hardware.transaction(install);
  const SV_PATH = "Expressions.SystemVerilog.Expressions";
  /** An integral domain's properties: its parameters, then its least and greatest known values, and ordered. */
  const integral = (width: bigint, signed: boolean, least: bigint, greatest: bigint) => new Map<string, unknown>([
    ["width", width], ["signed", signed], ["least", least], ["greatest", greatest], ["ordered", true]]);
  const [LOGIC, BIT]: [[string, string], [string, string]] = [["systemverilog", "logic"], ["systemverilog", "bit"]];
  const REAL = new Map<string, unknown>([["format", "binary64"], ["rounding", "roundTiesToEven"], ["radix", 2n], ["precision", 53n],
    ["emax", 1023n], ["ordered", true]]);
  const SHORTREAL = new Map<string, unknown>([["format", "binary32"], ["rounding", "roundTiesToEven"], ["radix", 2n], ["precision", 24n],
    ["emax", 127n], ["ordered", true]]);
  type Expected = [[string, string], Map<string, unknown>, string | null];
  const SYSTEMVERILOG = new Map<string, Expected>([ // its domains in order: its kind, its properties, the scalar its schema narrows (null: 4-state, none)
    ["logic", [LOGIC, integral(1n, false, 0n, 1n), null]], ["reg", [LOGIC, integral(1n, false, 0n, 1n), null]],
    ["integer", [LOGIC, integral(32n, true, -(2n ** 31n), 2n ** 31n - 1n), null]], ["time", [LOGIC, integral(64n, false, 0n, 2n ** 64n - 1n), null]],
    ["bit", [BIT, integral(1n, false, 0n, 1n), "int"]], ["byte", [BIT, integral(8n, true, -128n, 127n), "int"]],
    ["shortint", [BIT, integral(16n, true, -(2n ** 15n), 2n ** 15n - 1n), "int"]], ["int", [BIT, integral(32n, true, -(2n ** 31n), 2n ** 31n - 1n), "int"]],
    ["longint", [BIT, integral(64n, true, -(2n ** 63n), 2n ** 63n - 1n), "int"]],
    ["real", [["ieee754", "ieee754"], REAL, "float"]], ["shortreal", [["ieee754", "ieee754"], SHORTREAL, "float"]],
  ]);
  assert(SystemVerilog.Expressions.define === SystemVerilog.define); // its package exports its module's
  const frame = hardware.transaction(SystemVerilog.define)[0];
  const svDialect = hardware.singleton(SV_PATH);
  assert(frame.get("dialect") === svDialect && same([...svDialect.domains].map((e: any) => `${e.name}`), [...SYSTEMVERILOG.keys()]));
  const HardwareDomain = hardware.registered("Expressions.Framework.Domain");
  const scalarSchemas: Record<string, string> = { int: "Schemas.OfInt", float: "Schemas.OfFloat" };
  for (const [name, [kind, properties, scalar]] of SYSTEMVERILOG) {
    const domain = svDialect.domains({ name });
    assert(frame.get(name) === domain && Validators.Validate(hardware)(HardwareDomain, domain).length === 0, name);
    assert(equal(FD.kindOf(domain).slice(0, 2), kind) && equal(FD.properties(domain), properties) && FD.nameOf(domain) === name);
    if (scalar === null) { // 4-state: no basic scalar holds x or z, so no schema
      assert([...domain.schema].length === 0);
      raises(LookupError, () => hardware.registered(`${SV_PATH}.${name}`), `no schema registered as '${SV_PATH}.${name}'`);
      continue;
    }
    const schema = hardware.registered(`${SV_PATH}.${name}`);
    assert(same(schema.schemas, [hardware.registered(scalarSchemas[scalar] as string)]) && schema.validate().length === 0);
    assert(same([...domain.schema].map((e: any) => e.schema), [schema])); // HasDomain, both ways
    const read = [...new Builders.OfAny.Builder(schema, false, hardware).domain].map((e: any) => e.domain);
    assert(equal(read.map((d: any) => [FD.nameOf(d), FD.kindOf(d).slice(0, 2), FD.properties(d)]), [[name, kind, properties]]));
  }
  // Its kinds, each its own record schema, their parameters, then their inferred properties; `reg` is `logic`'s equal,
  // its own domain, not a synonym; `real` and `shortreal` hold IEEE 754's parameters of their formats.
  for (const [tag, record] of [["logic", "OfLogic"], ["bit", "OfBit"]] as [string, string][]) {
    assert(same([...hardware.registered(`${SV_PATH}.${record}`).properties.keys()], ["width", "signed", "least", "greatest", "ordered"]));
    assert(FD.kindOf(svDialect.domains({ name: tag }))[2].as_schema() === hardware.registered(`${SV_PATH}.${record}`));
  }
  const [logic, reg] = [svDialect.domains({ name: "logic" }), svDialect.domains({ name: "reg" })];
  assert(reg !== logic && equal(FD.properties(reg), FD.properties(logic)));
  assert(equal(FD.properties(domains.get("binary64")), REAL) && equal(FD.properties(domains.get("binary32")), SHORTREAL)); // IEEE 754's own
  // Each is a type SystemVerilog's evaluation, inference and validation read by name, as its working value: its width,
  // signedness, states (by its kind) and format, labelled with its name.
  assert(equal([...SYSTEMVERILOG.keys()].map((name) => SystemVerilog.Domains.named(hardware, name)).map(
    (t) => [t.kind, t.width, t.signed, t.states, t.format, t.name()]), [
    ["integral", 1, false, 4, null, "logic"], ["integral", 1, false, 4, null, "reg"], ["integral", 32, true, 4, null, "integer"],
    ["integral", 64, false, 4, null, "time"], ["integral", 1, false, 2, null, "bit"], ["integral", 8, true, 2, null, "byte"],
    ["integral", 16, true, 2, null, "shortint"], ["integral", 32, true, 2, null, "int"], ["integral", 64, true, 2, null, "longint"],
    ["real", 64, true, 2, "binary64", "real"], ["real", 32, true, 2, "binary32", "shortreal"]]));
  // Run again, the define writes nothing; the store round-trips whole into one with the same installs.
  const snapshot = JSON.ToJSON(hardware).Snapshot();
  assert(hardware.transaction(SystemVerilog.define)[0].get("int") === svDialect.domains({ name: "int" }));
  assert(JSON.ToJSON(hardware).Snapshot() === snapshot);
  const again: any = new Builders.Store();
  for (const install of [...INSTALLS, SystemVerilog.install]) again.transaction(install);
  JSON.FromJSON(again).Snapshot(snapshot);
  assert(JSON.ToJSON(again).Snapshot() === snapshot);
  const restored = new Map<string, any>([...again.singleton(SV_PATH).domains].map((e: any) => [`${e.name}`, e.domain])); // keyed by name
  assert(restored.size === SYSTEMVERILOG.size && [...SYSTEMVERILOG].every(([name, [kind, properties]]) =>
    equal(FD.kindOf(restored.get(name)).slice(0, 2), kind) && equal(FD.properties(restored.get(name)), properties)));
}
```

## DOM-18's delta (both languages)

SystemVerilog's install now adds the kind `bit` beside `logic`, so DOM-18's table of each dialect's kinds gains it,
and its heading names it.

Heading: `## DOM-18 · A language's own kinds are its dialect's: SystemVerilog's logic and bit, Python3's, TypeScript5's,
MATLAB's and Excel's strings, the tokens and Excel's errors` (the other agent's current heading, with "logic" made
"logic and bit").

Python, in `LANGUAGES`:

```python
    "systemverilog": ("Expressions.SystemVerilog.Expressions", {
        "logic": ("OfLogic", ["width", "signed", "least", "greatest", "ordered"]),
        "bit": ("OfBit", ["width", "signed", "least", "greatest", "ordered"])}),
```

TypeScript, in its `LANGUAGES` map:

```typescript
    ["systemverilog", ["Expressions.SystemVerilog.Expressions", new Map([
      ["logic", ["OfLogic", ["width", "signed", "least", "greatest", "ordered"]]],
      ["bit", ["OfBit", ["width", "signed", "least", "greatest", "ordered"]]]])]],
```

Nothing else in DOM-18 changes: its hand-written `logic8` domain stays (the define does not run in its `languages`
store). DOM-17 is unchanged by this group (no SystemVerilog domain in it).
