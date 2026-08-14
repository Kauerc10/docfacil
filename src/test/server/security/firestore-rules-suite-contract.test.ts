import { expect, test } from "bun:test";

test("Firestore Rules suite contains no silent testEnv early return", async () => {
  const source = await Bun.file("src/test/rules/firestore.rules.test.ts").text();

  expect(source).not.toContain("if (!testEnv) return");
  expect(source).not.toContain("testEnv = null");
  expect(source).toContain("RUN_FIRESTORE_RULES");
});
