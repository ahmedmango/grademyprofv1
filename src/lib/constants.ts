export const VALID_TAGS = [
  "Tough Grader",
  "Clear Lectures",
  "Caring",
  "Gives Good Feedback",
  "Lots of Homework",
  "Amazing Lectures",
  "Get Ready to Read",
  "Inspirational",
  "Group Projects",
  "Hilarious",
  "Skip Class? You Won't Pass",
  "Graded by Few Things",
  "Test Heavy",
  "Extra Credit",
  "Accessible Outside Class",
] as const;

export const RATE_LIMITS = {
  MAX_REVIEWS_PER_DAY: 10,
  MAX_REVIEWS_PER_IP_HOUR: 5,
  TOXICITY_THRESHOLD: 0.7,
  MAX_COMMENT_LENGTH: 2000,
  MAX_TAGS: 3,
} as const;

export const REVIEW_STATUSES = {
  PENDING: "pending",
  LIVE: "live",
  SHADOW: "shadow",
  FLAGGED: "flagged",
  REMOVED: "removed",
} as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];
