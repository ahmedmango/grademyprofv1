// Content scanning for reviews — rule-based v1

const PROFANITY_LIST = [
  // Extend with a proper list in production
  "fuck", "shit", "bitch", "asshole", "bastard", "damn", "crap", "dick", "piss",
];

const DOXXING_PATTERNS = [
  /\b\d{8}\b/,                             // 8-digit phone (Bahrain)
  /\+?973\s?\d{8}/,                        // Bahrain phone with country code
  /[\w.+-]+@[\w-]+\.[\w.]+/,               // Email
  /\b\d{1,5}\s\w+\s(?:st|street|rd|road|ave|avenue|blvd)\b/i,
];

const DEFAMATION_PATTERNS = [
  /\b(he|she|they)\s+(is|are)\s+(a\s+)?(racist|sexist|harasser|predator|criminal)\b/i,
  /\bsexual\s+(harass|assault)/i,
  /\b(corrupt|bribe|steal)/i,
];

export interface ScanResult {
  clean: boolean;
  toxicity_score: number;
  risk_flags: Record<string, boolean>;
  suggested_status: "pending" | "flagged" | "removed";
}

export function scanContent(comment: string): ScanResult {
  const flags: Record<string, boolean> = {};
  let toxicity = 0;

  const lower = comment.toLowerCase();

  // Profanity
  const profanityHits = PROFANITY_LIST.filter((w) => lower.includes(w));
  if (profanityHits.length > 0) {
    flags.profanity = true;
    toxicity += 0.4 + profanityHits.length * 0.1;
  }

  // Doxxing
  for (const pattern of DOXXING_PATTERNS) {
    if (pattern.test(comment)) {
      flags.doxxing = true;
      toxicity += 0.5;
      break;
    }
  }

  // Defamation
  for (const pattern of DEFAMATION_PATTERNS) {
    if (pattern.test(comment)) {
      flags.defamation_risk = true;
      toxicity += 0.3;
      break;
    }
  }

  // ALL CAPS (>60%)
  const letters = comment.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 10 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) {
    flags.all_caps = true;
    toxicity += 0.15;
  }

  toxicity = Math.min(toxicity, 1.0);

  // Everything goes to pending by default — but auto-remove doxxing/profanity,
  // and flag high-toxicity for priority moderation
  let suggested_status: ScanResult["suggested_status"] = "pending";
  if (flags.doxxing || flags.profanity) suggested_status = "removed";
  else if (toxicity >= 0.7 || flags.defamation_risk) suggested_status = "flagged";

  return {
    clean: Object.keys(flags).length === 0,
    toxicity_score: Math.round(toxicity * 100) / 100,
    risk_flags: flags,
    suggested_status,
  };
}
