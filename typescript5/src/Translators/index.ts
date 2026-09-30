/** The pairwise translators between the dialects, one module per pair, each with its `TRANSLATOR`. `between(a, b)`
 * finds the translator from dialect `a` to dialect `b`, whichever way round its module declares it.
 * `Basic_Python.NUMPY` is a second translator between Basic and Python, which writes NumPy's functions. See
 * `Framework/Translators`. */

import { Errors } from "@mbse/schemas/Framework";

import type { Dialect } from "../Framework/Terms.js";
import type { Pairwise } from "../Framework/Translators.js";
import * as Basic_Excel from "./Basic_Excel.js";
import * as Basic_Latex from "./Basic_Latex.js";
import * as Basic_Matlab from "./Basic_Matlab.js";
import * as Basic_Python from "./Basic_Python.js";
import * as Excel_Latex from "./Excel_Latex.js";
import * as Matlab_Excel from "./Matlab_Excel.js";
import * as Matlab_Latex from "./Matlab_Latex.js";
import * as Python_Excel from "./Python_Excel.js";
import * as Python_Latex from "./Python_Latex.js";
import * as Python_Matlab from "./Python_Matlab.js";

export {
  Basic_Excel, Basic_Latex, Basic_Matlab, Basic_Python, Excel_Latex, Matlab_Excel, Matlab_Latex, Python_Excel,
  Python_Latex, Python_Matlab,
};

/** Every pairwise translator. */
export const TRANSLATORS: readonly Pairwise[] = [Basic_Python, Basic_Matlab, Basic_Excel, Basic_Latex, Python_Matlab,
  Python_Excel, Python_Latex, Matlab_Excel, Matlab_Latex, Excel_Latex].map((module) => module.TRANSLATOR);

/** The translator whose `forward` translates from `source` to `target`. */
export function between(source: Dialect, target: Dialect): Pairwise {
  for (const translator of TRANSLATORS) {
    if (translator.left() === source && translator.right() === target) return translator;
    if (translator.left() === target && translator.right() === source) return translator.inverse();
  }
  throw new Errors.LookupError(`no translator between ${source.name()} and ${target.name()}`);
}
