import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "py-input-compare",
  title: "Python: voting age check crashes",
  language: "python",
  category: "wrong-type",
  expectedBehavior: "Ask the user's age. If they are 18 or older, print 'You can vote!'. With input 21 it should print 'You can vote!'.",
  stdin: "21",
  bugLines: [1, 2],
  fixSnippets: ["int(input(", "int(age)", "float(input("],
  code: `age = input("How old are you? ")
if age >= 18:
    print("You can vote!")
else:
    print("Not old enough yet.")
`,
};
export default sample;
