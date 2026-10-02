/** The text of this implementation's conformance snapshots. */

import { JSON, YAML } from "@mbse/schemas/Framework";
import { build } from "./Corpus.js";

/** File name -> text for every case, as this implementation writes them, each in the store of its dialect. Pass an
 * already built corpus to reuse it. */
export function render(corpus: ReturnType<typeof build> = build()): Map<string, string> {
  const files = new Map<string, string>();
  for (const [name, [schema, root, store]] of corpus) {
    files.set(`${name}.json`, JSON.ToJSON(store).Reachable(schema, root, { indent: 2 }) + "\n");
    files.set(`${name}.yaml`, YAML.ToYAML(store).Reachable(schema, root));
  }
  return files;
}
