import { describe, expect, it } from "bun:test";
import {
  filterTaskCommits,
  isTaskCommit,
  parseReviewedThrough,
  pickNewestReview,
  resolveScope,
  type Commit,
  type ReviewFile
} from "../cli/src/review-scope.js";

function commit(sha: string, subject: string, isMerge = false): Commit {
  return { sha, subject, isMerge };
}

describe("review-scope", () => {
  describe("isTaskCommit", () => {
    it("matches conventional commits scoped to a task id", () => {
      expect(isTaskCommit("feat(T06): add /review-work skill")).toBe(true);
      expect(isTaskCommit("fix(T12): handle empty scope")).toBe(true);
      expect(isTaskCommit("docs(T01): update README")).toBe(true);
    });

    it("rejects commits without a task scope", () => {
      expect(isTaskCommit("chore: materialize phase-2 work file")).toBe(false);
      expect(isTaskCommit("feat: add feature")).toBe(false);
      expect(isTaskCommit("Merge branch 'main'")).toBe(false);
      expect(isTaskCommit("feat(api): add endpoint")).toBe(false);
    });
  });

  describe("filterTaskCommits", () => {
    it("drops non-task subjects and merge commits", () => {
      const commits = [
        commit("aaa1111", "feat(T01): implement a"),
        commit("bbb2222", "chore: wiring"),
        commit("ccc3333", "feat(T02): implement b"),
        commit("ddd4444", "Merge branch 'topic'", true),
        commit("eee5555", "fix(T03): correct c")
      ];
      const filtered = filterTaskCommits(commits);
      expect(filtered.map((c) => c.sha)).toEqual(["aaa1111", "ccc3333", "eee5555"]);
    });
  });

  describe("pickNewestReview", () => {
    it("returns null for an empty list", () => {
      expect(pickNewestReview([])).toBeNull();
    });

    it("picks the lexically largest filename (reviews are date-prefixed)", () => {
      const reviews: ReviewFile[] = [
        { filename: "2026-04-01-aaa1111.md", reviewedThrough: "a".repeat(40) },
        { filename: "2026-04-20-bbb2222.md", reviewedThrough: "b".repeat(40) },
        { filename: "2026-04-10-ccc3333.md", reviewedThrough: "c".repeat(40) }
      ];
      expect(pickNewestReview(reviews)?.filename).toBe("2026-04-20-bbb2222.md");
    });
  });

  describe("parseReviewedThrough", () => {
    it("extracts the head sha from the anchor line", () => {
      const body = [
        "# Review — 2026-04-28",
        "",
        "**Scope:** phase 2",
        "**Verdict:** approve",
        "**reviewed_through:** abcdef1234567890abcdef1234567890abcdef12",
        ""
      ].join("\n");
      expect(parseReviewedThrough(body)).toBe("abcdef1234567890abcdef1234567890abcdef12");
    });

    it("accepts a short sha", () => {
      const body = "**reviewed_through:** 1234567";
      expect(parseReviewedThrough(body)).toBe("1234567");
    });

    it("returns null when no anchor is present", () => {
      expect(parseReviewedThrough("no anchor here")).toBeNull();
    });
  });

  describe("resolveScope", () => {
    const head = "f".repeat(40);
    const priorSha = "a".repeat(40);

    it("falls back to the active-phase range when no prior review exists", () => {
      const commits = [commit("c1", "feat(T01): a"), commit("c2", "feat(T02): b")];
      const resolved = resolveScope({
        headSha: head,
        commits,
        reviews: [],
        fallbackBase: "merge-base-sha"
      });
      expect(resolved.source).toBe("fallback");
      expect(resolved.baseSha).toBe("merge-base-sha");
      expect(resolved.headSha).toBe(head);
      expect(resolved.commits).toEqual(commits);
    });

    it("returns empty scope when prior review's reviewed_through equals HEAD", () => {
      const resolved = resolveScope({
        headSha: head,
        commits: [commit("c1", "feat(T01): a")],
        reviews: [{ filename: "2026-04-28-fff0000.md", reviewedThrough: head }],
        fallbackBase: null
      });
      expect(resolved.source).toBe("empty");
      expect(resolved.commits).toEqual([]);
      expect(resolved.baseSha).toBe(head);
    });

    it("scopes to the N commits between prior reviewed_through and HEAD", () => {
      const commits = [
        commit("c1", "feat(T01): a"),
        commit("c2", "feat(T02): b"),
        commit("c3", "feat(T03): c")
      ];
      const resolved = resolveScope({
        headSha: head,
        commits,
        reviews: [{ filename: "2026-04-22-aaaaaaa.md", reviewedThrough: priorSha }],
        fallbackBase: null
      });
      expect(resolved.source).toBe("prior-review");
      expect(resolved.baseSha).toBe(priorSha);
      expect(resolved.commits).toHaveLength(3);
      expect(resolved.commits.map((c) => c.sha)).toEqual(["c1", "c2", "c3"]);
    });

    it("skips merge commits inside the resolved range", () => {
      const commits = [
        commit("c1", "feat(T01): a"),
        commit("m1", "Merge branch 'topic'", true),
        commit("c2", "feat(T02): b")
      ];
      const resolved = resolveScope({
        headSha: head,
        commits,
        reviews: [{ filename: "2026-04-22-aaaaaaa.md", reviewedThrough: priorSha }],
        fallbackBase: null
      });
      expect(resolved.commits.map((c) => c.sha)).toEqual(["c1", "c2"]);
    });
  });
});
