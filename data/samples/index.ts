import type { SampleProgram } from "@/lib/types";
import pyAverage from "./py-average";
import pyInputCompare from "./py-input-compare";
import pyRemoveEvens from "./py-remove-evens";
import jsOffByOne from "./js-off-by-one";
import jsAssignInIf from "./js-assign-in-if";
import jsMissingAwait from "./js-missing-await";

/** The six sample buggy programs, in the order from the plan. */
export const SAMPLES: SampleProgram[] = [pyAverage, pyInputCompare, pyRemoveEvens, jsOffByOne, jsAssignInIf, jsMissingAwait];

export function getSample(id: string | null | undefined): SampleProgram | undefined {
  return SAMPLES.find((s) => s.id === id);
}

/** Find a sample whose code matches (ignoring trailing whitespace), so mock mode works even if the sample param is lost. */
export function findSampleByCode(code: string): SampleProgram | undefined {
  const norm = (s: string) => s.replace(/\s+$/gm, "").trim();
  const c = norm(code);
  return SAMPLES.find((s) => norm(s.code) === c);
}
