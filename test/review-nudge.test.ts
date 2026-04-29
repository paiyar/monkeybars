import { describe, expect, it } from "bun:test";
import { resolveNudge } from "../cli/src/review-nudge.js";
import type { Commit, ReviewFile } from "../cli/src/review-scope.js";

function commit(sha: string, subject: string, isMerge = false): Commit {
  return { sha, subject, isMerge };
}

function review(filename: string, reviewedThrough: string): ReviewFile {
  return { filename, reviewedThrough };
}

describe("resolveNudge", () => {
  it("returns null when there are no reviews", () => {
    const result = resolveNudge({
      headSha: "aaaaaaa",
      commits: [commit("aaaaaaa", "feat(T01): a")],
      reviews: []
    });
    expect(result).toBeNull();
  });

  it("returns null when the newest review covers HEAD", () => {
    const result = resolveNudge({
      headSha: "aaaaaaa",
      commits: [commit("aaaaaaa", "feat(T01): a")],
      reviews: [review("2026-04-29-aaaaaaa.md", "aaaaaaa")]
    });
    expect(result).toBeNull();
  });

  it("counts unreviewed task commits and returns the prior reviewed_through", () => {
    const result = resolveNudge({
      headSha: "ddd4444",
      commits: [
        commit("bbb2222", "feat(T02): b"),
        commit("ccc3333", "fix(T03): c"),
        commit("ddd4444", "docs(T04): d")
      ],
      reviews: [review("2026-04-29-aaa1111.md", "aaa1111")]
    });
    expect(result).toEqual({ count: 3, reviewedThrough: "aaa1111" });
  });

  it("excludes merge commits and non-task subjects from the count", () => {
    const result = resolveNudge({
      headSha: "eee5555",
      commits: [
        commit("bbb2222", "feat(T02): b"),
        commit("ccc3333", "Merge branch 'topic'", true),
        commit("ddd4444", "chore: housekeeping"),
        commit("eee5555", "fix(T03): c")
      ],
      reviews: [review("2026-04-29-aaa1111.md", "aaa1111")]
    });
    expect(result).toEqual({ count: 2, reviewedThrough: "aaa1111" });
  });

  it("picks the newest review by filename when multiple exist", () => {
    const result = resolveNudge({
      headSha: "zzz9999",
      commits: [commit("zzz9999", "feat(T10): latest")],
      reviews: [
        review("2026-04-20-old1111.md", "old1111"),
        review("2026-04-29-new2222.md", "new2222")
      ]
    });
    expect(result).toEqual({ count: 1, reviewedThrough: "new2222" });
  });

  it("returns null when no task-shape commits are in range even if non-task commits exist", () => {
    const result = resolveNudge({
      headSha: "ccc3333",
      commits: [
        commit("bbb2222", "chore: bump deps"),
        commit("ccc3333", "docs: tweak readme")
      ],
      reviews: [review("2026-04-29-aaa1111.md", "aaa1111")]
    });
    expect(result).toBeNull();
  });
});
