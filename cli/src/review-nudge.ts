import { filterTaskCommits, pickNewestReview, type Commit, type ReviewFile } from "./review-scope.js";

export interface ResolveNudgeInput {
  headSha: string;
  commits: Commit[];
  reviews: ReviewFile[];
}

export interface Nudge {
  count: number;
  reviewedThrough: string;
}

export function resolveNudge(input: ResolveNudgeInput): Nudge | null {
  const { headSha, commits, reviews } = input;
  const newest = pickNewestReview(reviews);
  if (!newest) return null;
  if (newest.reviewedThrough === headSha) return null;

  const unreviewed = filterTaskCommits(commits);
  if (unreviewed.length === 0) return null;

  return { count: unreviewed.length, reviewedThrough: newest.reviewedThrough };
}
