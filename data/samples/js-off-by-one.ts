import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "js-off-by-one",
  title: "JavaScript: total of scores is NaN",
  language: "javascript",
  category: "off-by-one",
  expectedBehavior: "Add up all the scores and print the total. It should print Total: 259.",
  bugLines: [3],
  fixSnippets: ["i < scores.length", "< scores.length", "scores.length - 1", "length-1"],
  code: `const scores = [88, 92, 79];
let total = 0;
for (let i = 0; i <= scores.length; i++) {
  console.log("Adding score:", scores[i]);
  total += scores[i];
}
console.log("Total:", total);
`,
};
export default sample;
