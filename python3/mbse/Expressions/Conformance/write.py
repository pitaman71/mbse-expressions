"""Writes this implementation's conformance snapshots: `python -m mbse.Expressions.Conformance.write [directory]`.

The default directory is `conformance/python3` at the repository root.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from mbse.Expressions.Conformance.Corpus import build, cases
from mbse.Schemas.Framework import JSON, YAML

DEFAULT = Path(__file__).resolve().parents[4] / "conformance" / "python3"


def render(store: Any = None) -> dict[str, str]:
    """File name -> text for every case, as this implementation writes them, read within one transaction on the corpus's
    store. Pass an already built store (`build()`) to reuse it."""
    store = store if store is not None else build()
    files = {}
    with store.transaction():
        for case, (schema, root) in cases(store).items():
            files[f"{case}.json"] = JSON.ToJSON(store)(schema, root, indent=2) + "\n"
            files[f"{case}.yaml"] = YAML.ToYAML(store)(schema, root)
    return files


def main(directory: Path = DEFAULT) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for name, text in render().items():
        (directory / name).write_text(text, encoding="utf-8")
        print("wrote", directory / name)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT)
