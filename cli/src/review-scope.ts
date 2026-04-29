export interface Commit {
  sha: string;
  subject: string;
  isMerge: boolean;
}

export interface ReviewFile {
  filename: string;
  reviewedThrough: string;
}

export interface ResolveScopeInput {
  headSha: string;
  commits: Commit[];
  reviews: ReviewFile[];
  fallbackBase: string | null;
}

export type ScopeSource = "prior-review" | "fallback" | "empty";

export interface ResolvedScope {
  baseSha: string | null;
  headSha: string;
  commits: Commit[];
  source: ScopeSource;
}

const TASK_SUBJECT_RE = /^[a-z]+\(T\d+\):\s/;
const REVIEWED_THROUGH_RE = /^\*\*reviewed_through:\*\*\s+([0-9a-f]{7,40})\s*$/im;

export function isTaskCommit(subject: string): boolean {
  return TASK_SUBJECT_RE.test(subject);
}

export function filterTaskCommits(commits: Commit[]): Commit[] {
  return commits.filter((commit) => !commit.isMerge && isTaskCommit(commit.subject));
}

export function pickNewestReview(reviews: ReviewFile[]): ReviewFile | null {
  if (reviews.length === 0) return null;
  const sorted = [...reviews].sort((a, b) => (a.filename < b.filename ? 1 : a.filename > b.filename ? -1 : 0));
  return sorted[0];
}

export function parseReviewedThrough(body: string): string | null {
  const match = body.match(REVIEWED_THROUGH_RE);
  return match ? match[1] : null;
}

export function resolveScope(input: ResolveScopeInput): ResolvedScope {
  const { headSha, commits, reviews, fallbackBase } = input;
  const newest = pickNewestReview(reviews);

  if (newest) {
    if (newest.reviewedThrough === headSha) {
      return { baseSha: newest.reviewedThrough, headSha, commits: [], source: "empty" };
    }
    return {
      baseSha: newest.reviewedThrough,
      headSha,
      commits: filterTaskCommits(commits),
      source: "prior-review"
    };
  }

  if (!fallbackBase) {
    return { baseSha: null, headSha, commits: filterTaskCommits(commits), source: "fallback" };
  }

  if (fallbackBase === headSha) {
    return { baseSha: fallbackBase, headSha, commits: [], source: "empty" };
  }

  return { baseSha: fallbackBase, headSha, commits: filterTaskCommits(commits), source: "fallback" };
}
