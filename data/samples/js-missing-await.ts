import type { SampleProgram } from "@/lib/types";

const sample: SampleProgram = {
  id: "js-missing-await",
  title: "JavaScript: user is a Promise, not a user",
  language: "javascript",
  category: "async-await",
  expectedBehavior: "Load user 1 and print their name. It should print Name: Ada.",
  bugLines: [8],
  fixSnippets: ["await fetchUser", ".then("],
  code: `function fetchUser(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id, name: "Ada" }), 100);
  });
}

async function main() {
  const user = fetchUser(1);
  console.log("User:", user);
  console.log("Name:", user.name);
}

main();
`,
};
export default sample;
