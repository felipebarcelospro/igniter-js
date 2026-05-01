import { IgniterCollectionPath } from "../src/utils/path";

const pattern = ".content/posts/{id}.mdx";
const filePath = "/Volumes/Sandbox/Sandbox/igniter-js/igniter-js/packages/collections/examples/with-model/.content/posts/28cdee84-6270-43f0-ba37-aeb828ea5e84.mdx";

console.log("extract =>", IgniterCollectionPath.extract(pattern, filePath));

const regexPattern = pattern
  .replace(/[.+^${}()|[\]\\]/g, "\\$&")
  .replace(/\\\{[^}]+\\\}/g, "([^/]+)");
console.log("regexPattern =>", regexPattern);

const match = filePath.match(new RegExp(`${regexPattern}$`));
console.log("match =>", match);
