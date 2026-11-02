import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "py-average",
  title: "Python: the class average is too low",
  language: "python",
  category: "off-by-one",
  expectedBehavior: "Print the average of the four scores. It should print 75.0.",
  bugLines: [3],
  fixSnippets: ["range(len(nums))", "range(0, len(nums))", "for n in nums", "sum(nums)"],
  code: `def average(nums):
    total = 0
    for i in range(1, len(nums)):
        total += nums[i]
    return total / len(nums)

scores = [90, 80, 70, 60]
print("Average score:", average(scores))
`,
};
export default sample;
