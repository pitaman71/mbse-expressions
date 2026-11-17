/** The text of this implementation's conformance snapshots. */

import { JSON, YAML } from "@mbse/schemas/Framework";
import { build, cases } from "./Corpus.js";

/** File name -> text for every case, as this implementation writes them, read within one transaction on the corpus's
 * store. Pass an already built store (`build()`) to reuse it. */
export function render(store: any = build()): Map<string, string> {
  const files = new Map<string, string>();
  store.transaction(() => {
    for (const [name, [schema, root]] of cases(store)) {
      files.set(`${name}.json`, JSON.ToJSON(store)(schema, root, { indent: 2 }) + "\n");
      files.set(`${name}.yaml`, YAML.ToYAML(store)(schema, root));
    }
  });
  return files;
}
