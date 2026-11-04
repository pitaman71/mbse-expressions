/** The pairwise translators between the dialects, one module per pair, each with its `TRANSLATOR`. `between(a, b)`
 * finds the translator from dialect `a` to dialect `b`, whichever way round its module declares it.
 * `Patterns_Python3.NUMPY` is a second translator between Patterns and Python3, which writes NumPy's functions.
 * Patterns <-> C and Patterns <-> Cpp are one rule set, `Patterns_C.rules`, applied to each, a member's name written as
 * each writes it. See `Framework/Translators`. */

import { Errors } from "@mbse/schemas/Framework";

import type { Dialect } from "../Framework/Terms.js";
import type { Pairwise } from "../Framework/Translators.js";
import * as Excel_Latex from "./Excel_Latex.js";
import * as Matlab_Excel from "./Matlab_Excel.js";
import * as Matlab_Latex from "./Matlab_Latex.js";
import * as Patterns_C from "./Patterns_C.js";
import * as Patterns_Cpp from "./Patterns_Cpp.js";
import * as Patterns_Excel from "./Patterns_Excel.js";
import * as Patterns_Latex from "./Patterns_Latex.js";
import * as Patterns_Matlab from "./Patterns_Matlab.js";
import * as Patterns_Python3 from "./Patterns_Python3.js";
import * as Patterns_SystemVerilog from "./Patterns_SystemVerilog.js";
import * as Python3_Excel from "./Python3_Excel.js";
import * as Python3_Latex from "./Python3_Latex.js";
import * as Python3_Matlab from "./Python3_Matlab.js";

export {
  Excel_Latex, Matlab_Excel, Matlab_Latex, Patterns_C, Patterns_Cpp, Patterns_Excel, Patterns_Latex, Patterns_Matlab,
  Patterns_Python3, Patterns_SystemVerilog, Python3_Excel, Python3_Latex, Python3_Matlab,
};

/** Every pairwise translator. */
export const TRANSLATORS: readonly Pairwise[] = [Patterns_Python3, Patterns_Matlab, Patterns_Excel, Patterns_Latex,
  Patterns_C, Patterns_Cpp, Patterns_SystemVerilog, Python3_Matlab, Python3_Excel, Python3_Latex, Matlab_Excel, Matlab_Latex,
  Excel_Latex].map((module) => module.TRANSLATOR);

/** The translator whose `forward` translates from `source` to `target`. */
export function between(source: Dialect, target: Dialect): Pairwise {
  for (const translator of TRANSLATORS) {
    if (translator.left() === source && translator.right() === target) return translator;
    if (translator.left() === target && translator.right() === source) return translator.inverse();
  }
  throw new Errors.LookupError(`no translator between ${source.name()} and ${target.name()}`);
}
