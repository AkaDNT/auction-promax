import assert from "node:assert/strict";
import test from "node:test";
import { stripMarkdownCodeFences } from "./MarkdownContent.mjs";

test("strips four-backtick source appendices including embedded triple fences", () => {
  const markdown = [
    "Visible [guide](guide.md)",
    "````markdown",
    "Example:",
    "```powershell",
    "[int]($bytes.Length / 2)",
    "```",
    "````",
  ].join("\n");

  assert.equal(stripMarkdownCodeFences(markdown), "Visible [guide](guide.md)");
});
