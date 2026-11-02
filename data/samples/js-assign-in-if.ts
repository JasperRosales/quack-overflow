import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "js-assign-in-if",
  title: "JavaScript: everyone is always logged in",
  language: "javascript",
  category: "wrong-operator",
  expectedBehavior: "isLoggedIn is false, so it should print 'Please log in.'",
  bugLines: [4],
  fixSnippets: ["isLoggedIn === true", "isLoggedIn == true", "if (isLoggedIn)"],
  code: `let isLoggedIn = false;

function greet() {
  if (isLoggedIn = true) {
    console.log("Welcome back!");
  } else {
    console.log("Please log in.");
  }
}

greet();
`,
};
export default sample;
