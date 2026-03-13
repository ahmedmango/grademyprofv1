// Username validation + profanity filter

const BANNED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "piss",
  "cunt", "whore", "slut", "retard", "faggot", "nigger", "nigga",
  "pussy", "cock", "porn", "sex", "nude", "naked", "hentai",
  "admin", "moderator", "mod", "staff", "official", "support",
  "grademyprof", "grademyprofessor", "gmp",
];

const BANNED_PATTERNS = [
  /(.)\1{3,}/i,           // 4+ repeated chars (e.g., "aaaa")
  /^[0-9]+$/,             // all numbers
  /^[^a-zA-Z0-9]/,        // starts with special char
  /[^a-zA-Z0-9_.]/,       // contains chars other than letters, numbers, underscore, dot
];

export interface UsernameValidation {
  valid: boolean;
  error: string | null;
}

export function validateUsername(username: string): UsernameValidation {
  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: "Username must be 20 characters or less" };
  }

  // Check banned patterns
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: "Username contains invalid characters or patterns" };
    }
  }

  // Check profanity (check lowercase, also check with common substitutions)
  const lower = trimmed.toLowerCase();
  const normalized = lower
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a");

  for (const word of BANNED_WORDS) {
    if (lower.includes(word) || normalized.includes(word)) {
      return { valid: false, error: "Username contains inappropriate language" };
    }
  }

  return { valid: true, error: null };
}

export function validateEmail(email: string): { valid: boolean; error: string | null } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email address" };
  }

  return { valid: true, error: null };
}

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey",
  "1234567", "letmein", "trustno1", "dragon", "baseball", "iloveyou",
  "master", "sunshine", "ashley", "michael", "shadow", "123123",
  "654321", "superman", "qazwsx", "password1", "password123",
]);

export function validatePassword(password: string): { valid: boolean; error: string | null } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (password.length > 100) {
    return { valid: false, error: "Password is too long" };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: "This password is too common. Please choose a stronger one" };
  }
  // Require at least 2 of: uppercase, lowercase, digit, special char
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;
  if (classes < 2) {
    return { valid: false, error: "Password must include at least 2 of: lowercase, uppercase, number, special character" };
  }
  return { valid: true, error: null };
}
