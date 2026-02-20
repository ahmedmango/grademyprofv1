const PROFANITY_EN = [
  "fuck","shit","bitch","asshole","bastard","dick","piss",
  "cunt","whore","slut","retard","faggot",
];

const PROFANITY_AR_PATTERNS = [
  /كس\s*أم/, /ابن\s*(ال)?كلب/, /حمار/, /خنزير/, /عاهر/, /شرموط/,
];

const DOXXING_PATTERNS = [
  /\b\d{8}\b/,
  /\+?973\s?\d{4}\s?\d{4}/,
  /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\b\d{1,5}\s\w+\s(?:st|street|rd|road|ave|avenue|blvd|block|flat|building)\b/i,
  /\b(?:block|بلوك)\s*\d+/i,
  /\b(?:flat|شقة)\s*\d+/i,
  /\b\d{2}[-/]\d{2}[-/]\d{4}\b/,
  /\b(?:CPR|cpr)\s*:?\s*\d{9}\b/,
];

const DEFAMATION_PATTERNS = [
  /\b(he|she|they)\s+(is|are)\s+(a\s+)?(racist|sexist|harasser|predator|criminal|thief|corrupt)\b/i,
  /\bsexual\s+(harass|assault|abuse)/i,
  /\b(corrupt|brib|steal|embezzl|fraud)/i,
  /\b(affair|relationship)\s+with\s+(a\s+)?student/i,
];

const THREAT_PATTERNS = [
  /\b(kill|hurt|attack|punch|beat|shoot)\s+(him|her|them|the professor)\b/i,
  /\b(bomb|threat|weapon)\b/i,
  /\bwill\s+(pay|regret|suffer)\b/i,
];

export interface ScanResult {
  clean: boolean;
  toxicity_score: number;
  risk_flags: Record<string, boolean>;
  suggested_status: "pending" | "flagged" | "removed";
}

export function scanContent(comment: string): ScanResult {
  if (!comment || comment.trim().length === 0) {
    return { clean: true, toxicity_score: 0, risk_flags: {}, suggested_status: "pending" };
  }

  const flags: Record<string, boolean> = {};
  let toxicity = 0;
  const lower = comment.toLowerCase();

  const profanityHits = PROFANITY_EN.filter((w) => new RegExp(`\\b${w}`, "i").test(lower));
  if (profanityHits.length > 0) { flags.profanity = true; toxicity += 0.3 + profanityHits.length * 0.1; }

  if (PROFANITY_AR_PATTERNS.some((p) => p.test(comment))) { flags.profanity_ar = true; toxicity += 0.4; }

  for (const p of DOXXING_PATTERNS) { if (p.test(comment)) { flags.doxxing = true; toxicity += 0.5; break; } }
  for (const p of DEFAMATION_PATTERNS) { if (p.test(comment)) { flags.defamation_risk = true; toxicity += 0.3; break; } }
  for (const p of THREAT_PATTERNS) { if (p.test(comment)) { flags.threat = true; toxicity += 0.6; break; } }

  const letters = comment.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 10 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) {
    flags.all_caps = true; toxicity += 0.1;
  }

  if (/(.)\1{4,}/i.test(comment) || /[!?]{4,}/.test(comment)) { flags.spam_pattern = true; toxicity += 0.1; }

  if (comment.length < 15 && /(worst|terrible|awful|hate|garbage|trash)/i.test(lower)) {
    flags.low_effort_negative = true; toxicity += 0.15;
  }

  toxicity = Math.min(Math.round(toxicity * 100) / 100, 1.0);

  let suggested_status: ScanResult["suggested_status"] = "pending";
  if (flags.doxxing || flags.threat) suggested_status = "removed";
  else if (flags.profanity && toxicity >= 0.5) suggested_status = "removed";
  else if (toxicity >= 0.5 || flags.defamation_risk) suggested_status = "flagged";

  return { clean: Object.keys(flags).length === 0, toxicity_score: toxicity, risk_flags: flags, suggested_status };
}
