import { describe, it, expect } from "vitest";
import { scanContent } from "../moderation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scan(text: string) {
  return scanContent(text);
}

// ---------------------------------------------------------------------------
// Empty / clean input
// ---------------------------------------------------------------------------

describe("empty and clean input", () => {
  it("returns clean for empty string", () => {
    const r = scan("");
    expect(r.clean).toBe(true);
    expect(r.toxicity_score).toBe(0);
    expect(r.suggested_status).toBe("pending");
  });

  it("returns clean for whitespace-only string", () => {
    const r = scan("   ");
    expect(r.clean).toBe(true);
    expect(r.toxicity_score).toBe(0);
  });

  it("returns clean for a normal positive review", () => {
    const r = scan("Great professor! Very clear explanations and always available for office hours.");
    expect(r.clean).toBe(true);
    expect(r.toxicity_score).toBe(0);
    expect(r.risk_flags).toEqual({});
    expect(r.suggested_status).toBe("pending");
  });

  it("returns clean for a normal negative review", () => {
    const r = scan("Tough grader and lectures are hard to follow. Not recommended for beginners.");
    expect(r.clean).toBe(true);
    expect(r.toxicity_score).toBe(0);
    expect(r.suggested_status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// English profanity
// ---------------------------------------------------------------------------

describe("English profanity", () => {
  it("flags a single profanity word", () => {
    const r = scan("This professor is such an asshole.");
    expect(r.risk_flags.profanity).toBe(true);
    expect(r.toxicity_score).toBeGreaterThan(0);
  });

  it("toxicity increases with more profanity hits", () => {
    const single = scan("What an asshole.");
    const double = scan("What an asshole, complete shit.");
    expect(double.toxicity_score).toBeGreaterThan(single.toxicity_score);
  });

  it("removes review when profanity + toxicity >= 0.5", () => {
    // Multiple hits push toxicity over 0.5
    const r = scan("Fucking shit professor, worst asshole I ever met.");
    expect(r.risk_flags.profanity).toBe(true);
    expect(r.toxicity_score).toBeGreaterThanOrEqual(0.5);
    expect(r.suggested_status).toBe("removed");
  });

  it("does not flag partial word matches (e.g. 'classic')", () => {
    const r = scan("His teaching style is classic and well structured.");
    expect(r.risk_flags.profanity).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Arabic profanity
// ---------------------------------------------------------------------------

describe("Arabic profanity", () => {
  it("flags Arabic profanity patterns", () => {
    const r = scan("حمار هذا الأستاذ");
    expect(r.risk_flags.profanity_ar).toBe(true);
    expect(r.toxicity_score).toBeGreaterThanOrEqual(0.4);
  });

  it("adds 0.4 to toxicity for Arabic profanity", () => {
    const r = scan("حمار");
    expect(r.toxicity_score).toBe(0.4);
  });
});

// ---------------------------------------------------------------------------
// Doxxing
// ---------------------------------------------------------------------------

describe("doxxing detection", () => {
  it("flags an 8-digit CPR-style number", () => {
    const r = scan("His ID is 12345678 look him up.");
    expect(r.risk_flags.doxxing).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("flags a Bahrain phone number", () => {
    const r = scan("Call him at +973 3456 7890");
    expect(r.risk_flags.doxxing).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("flags an email address", () => {
    const r = scan("Email him at professor.smith@university.edu to complain.");
    expect(r.risk_flags.doxxing).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("flags a CPR explicit mention", () => {
    const r = scan("His CPR: 987654321");
    expect(r.risk_flags.doxxing).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("flags an address with block number", () => {
    const r = scan("Lives in block 338.");
    expect(r.risk_flags.doxxing).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("does not flag a year like 2024", () => {
    const r = scan("I took this course in 2024 and it was good.");
    expect(r.risk_flags.doxxing).toBeUndefined();
  });

  it("does not flag a normal 4-digit number", () => {
    const r = scan("Course code is 1234.");
    expect(r.risk_flags.doxxing).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Defamation
// ---------------------------------------------------------------------------

describe("defamation detection", () => {
  it("flags direct defamatory accusation", () => {
    const r = scan("He is a criminal and everyone should know.");
    expect(r.risk_flags.defamation_risk).toBe(true);
    expect(r.suggested_status).toBe("flagged");
  });

  it("flags sexual harassment accusation", () => {
    const r = scan("He sexually harassed multiple students.");
    expect(r.risk_flags.defamation_risk).toBe(true);
    expect(r.suggested_status).toBe("flagged");
  });

  it("flags corruption accusation", () => {
    const r = scan("This professor is corrupt and takes bribes.");
    expect(r.risk_flags.defamation_risk).toBe(true);
    expect(r.suggested_status).toBe("flagged");
  });

  it("flags student relationship accusation", () => {
    const r = scan("He had an affair with a student last semester.");
    expect(r.risk_flags.defamation_risk).toBe(true);
    expect(r.suggested_status).toBe("flagged");
  });

  it("defamation alone sets suggested_status to flagged (not removed)", () => {
    const r = scan("She is a racist professor.");
    expect(r.suggested_status).toBe("flagged");
    expect(r.suggested_status).not.toBe("removed");
  });
});

// ---------------------------------------------------------------------------
// Threats
// ---------------------------------------------------------------------------

describe("threat detection", () => {
  it("flags direct threat against professor", () => {
    const r = scan("I will kill him after class.");
    expect(r.risk_flags.threat).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("flags bomb/weapon mention", () => {
    const r = scan("Someone should bring a bomb to his lecture.");
    expect(r.risk_flags.threat).toBe(true);
    expect(r.suggested_status).toBe("removed");
  });

  it("threat always results in removed regardless of toxicity score", () => {
    const r = scan("Will suffer");
    expect(r.suggested_status).toBe("removed");
  });
});

// ---------------------------------------------------------------------------
// ALL CAPS
// ---------------------------------------------------------------------------

describe("ALL CAPS detection", () => {
  it("flags heavily capitalised text", () => {
    const r = scan("THIS PROFESSOR IS ABSOLUTELY TERRIBLE");
    expect(r.risk_flags.all_caps).toBe(true);
    expect(r.toxicity_score).toBeGreaterThan(0);
  });

  it("does not flag short all-caps text (under 10 letters)", () => {
    const r = scan("OK FINE");
    expect(r.risk_flags.all_caps).toBeUndefined();
  });

  it("does not flag mixed case with <60% uppercase", () => {
    const r = scan("Great professor. HIGHLY recommend taking his courses.");
    expect(r.risk_flags.all_caps).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Spam patterns
// ---------------------------------------------------------------------------

describe("spam pattern detection", () => {
  it("flags 4+ repeated characters", () => {
    const r = scan("This professor is baaaaaaad news.");
    expect(r.risk_flags.spam_pattern).toBe(true);
  });

  it("flags 4+ repeated punctuation", () => {
    const r = scan("Worst professor ever!!!!");
    expect(r.risk_flags.spam_pattern).toBe(true);
  });

  it("does not flag 3 repeated characters", () => {
    const r = scan("Sooo good.");
    expect(r.risk_flags.spam_pattern).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Low-effort negative
// ---------------------------------------------------------------------------

describe("low-effort negative", () => {
  it("flags short strongly negative comment", () => {
    const r = scan("Worst ever");
    expect(r.risk_flags.low_effort_negative).toBe(true);
  });

  it("does not flag short positive comment", () => {
    const r = scan("Best ever");
    expect(r.risk_flags.low_effort_negative).toBeUndefined();
  });

  it("does not flag longer negative comment", () => {
    const r = scan("This is the worst professor I have ever taken a class with.");
    expect(r.risk_flags.low_effort_negative).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Suggested status thresholds
// ---------------------------------------------------------------------------

describe("suggested_status thresholds", () => {
  it("pending when toxicity < 0.5 and no hard flags", () => {
    const r = scan("Not the best professor but manageable.");
    expect(r.suggested_status).toBe("pending");
  });

  it("flagged when toxicity >= 0.5 with no doxxing/threat", () => {
    // Arabic profanity (0.4) + profanity hit (0.3+) = >= 0.5 but no doxxing/threat
    const r = scan("حمار asshole");
    expect(r.toxicity_score).toBeGreaterThanOrEqual(0.5);
    // profanity + toxicity >= 0.5 → removed
    expect(r.suggested_status).toBe("removed");
  });

  it("removed when doxxing present regardless of other flags", () => {
    const r = scan("Great teacher, email him at test@test.com");
    expect(r.suggested_status).toBe("removed");
  });

  it("removed when threat present regardless of other flags", () => {
    const r = scan("Good grades but will hurt him");
    expect(r.suggested_status).toBe("removed");
  });

  it("toxicity is capped at 1.0", () => {
    const r = scan("fuck shit bitch asshole bastard dick kill him bomb threat حمار 12345678");
    expect(r.toxicity_score).toBeLessThanOrEqual(1.0);
  });
});

// ---------------------------------------------------------------------------
// clean flag accuracy
// ---------------------------------------------------------------------------

describe("clean flag", () => {
  it("clean is false when any flag is set", () => {
    const r = scan("He is an asshole.");
    expect(r.clean).toBe(false);
  });

  it("clean is true when no flags are set", () => {
    const r = scan("Very helpful and explains concepts clearly.");
    expect(r.clean).toBe(true);
  });
});
