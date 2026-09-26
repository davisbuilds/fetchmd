import { describe, expect, it } from "vitest";
import { invalidCommits } from "../scripts/release-commits.cjs";

const commit = (message: string, parentCount = 1) => ({
  commit: { message },
  parents: Array.from({ length: parentCount }, () => ({ sha: "a" })),
});

describe("release commit classification", () => {
  it("accepts standard categories, scopes, breaking markers, and conventional reverts", () => {
    const subjects = ["feat: add input", "fix(cli): correct output", "perf: reduce allocation",
      "docs: explain usage", "test: cover CLI", "chore: tidy", "build: update toolchain",
      "ci: check releases", "style: format", "refactor!: replace API", "revert: undo change"];
    expect(invalidCommits(subjects.map((subject) => commit(subject)))).toEqual([]);
  });

  it("rejects plain, unknown, and malformed subjects but skips merge commits", () => {
    const invalid = [commit("Add feature"), commit("feature: add input"), commit("fix: "),
      commit("feat(scope):\nnew input"), commit('Revert "feat: add input"')];
    expect(invalidCommits([...invalid, commit("Merge branch 'main'", 2)])).toEqual(invalid);
  });
});
