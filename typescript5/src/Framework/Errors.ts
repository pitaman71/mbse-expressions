/**
 * Errors: Python's exceptions that evaluation raises and JavaScript has no counterpart for, so that both
 * implementations raise errors of the same names with the same messages. (mbse-schemas' `Errors` has the others.)
 */

/** A name that is not bound: Python's `NameError`. */
export class NameError extends Error {
  override name = "NameError";
}

/** An import that cannot be resolved: Python's `ImportError`. */
export class ImportError extends Error {
  override name = "ImportError";
}

/** A number too large for its conversion: Python's `OverflowError`. */
export class OverflowError extends Error {
  override name = "OverflowError";
}

/** Division or modulo by zero: Python's `ZeroDivisionError`. */
export class ZeroDivisionError extends Error {
  override name = "ZeroDivisionError";
}
