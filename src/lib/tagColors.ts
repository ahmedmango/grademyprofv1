// Tag classification: good (green ring), neutral (purple ring), bad (red ring)

const GOOD_TAGS = new Set([
  "Amazing Lectures",
  "Inspirational",
  "Caring",
  "Respected",
  "Accessible Outside Class",
  "Clear Grading",
  "Gives Good Feedback",
  "Hilarious",
  "Get Ready To Read",
  "Graded By Few Things",
  "Extra Credit",
  "Would Take Again",
]);

const BAD_TAGS = new Set([
  "Tough Grader",
  "Get Ready To Read",
  "Skip Class? You Won't Pass.",
  "Lots Of Homework",
  "Test Heavy",
  "Lecture Heavy",
  "So Many Papers",
  "Beware Of Pop Quizzes",
  "Unfair Grading",
  "Boring",
  "Disorganized",
  "Rude",
  "No Feedback",
]);

// Everything else is neutral (purple)

export type TagSentiment = "good" | "neutral" | "bad";

export function getTagSentiment(tag: string): TagSentiment {
  const normalized = tag.trim();
  if (GOOD_TAGS.has(normalized)) return "good";
  if (BAD_TAGS.has(normalized)) return "bad";
  return "neutral";
}

export function getTagStyles(sentiment: TagSentiment) {
  switch (sentiment) {
    case "good":
      return {
        borderColor: "#22C55E",
        color: "#22C55E",
        background: "#22C55E12",
      };
    case "bad":
      return {
        borderColor: "#EF4444",
        color: "#EF4444",
        background: "#EF444412",
      };
    case "neutral":
    default:
      return {
        borderColor: "#A78BFA",
        color: "#A78BFA",
        background: "#A78BFA12",
      };
  }
}
