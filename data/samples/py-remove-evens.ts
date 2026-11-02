import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "py-remove-evens",
  title: "Python: removing even numbers leaves some behind",
  language: "python",
  category: "mutation-aliasing",
  expectedBehavior: "Remove every even number from the list. It should print [7, 9].",
  bugLines: [2, 4],
  fixSnippets: ["numbers[:]", "list(numbers)", "numbers.copy()", "if n % 2 != 0]", "if n % 2 == 1]"],
  code: `def remove_evens(numbers):
    for n in numbers:
        if n % 2 == 0:
            numbers.remove(n)
    return numbers

print(remove_evens([2, 4, 6, 7, 8, 9]))
`,
};
export default sample;
