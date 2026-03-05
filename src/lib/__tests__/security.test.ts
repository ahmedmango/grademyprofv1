import { describe, it, expect } from "vitest";
import { sha256Short } from "../hash";
import { signJWT, verifyJWT } from "../jwt";

// ---------------------------------------------------------------------------
// Re-export pure functions from route files for testing
// (We replicate them here since they're file-scoped)
// ---------------------------------------------------------------------------

function sanitizeWord(w: string): string {
  return w.replace(/[^\w\-.']/g, "").replace(/[%_]/g, "").slice(0, 50);
}

function csvSafe(val: string): string {
  let s = String(val).replace(/"/g, '""');
  s = s.replace(/^[=+\-@]/, "'$&");
  return `"${s}"`;
}

// ---------------------------------------------------------------------------
// SHA-256 hash
// ---------------------------------------------------------------------------

describe("sha256Short", () => {
  it("returns a 16-char hex string", async () => {
    const h = await sha256Short("192.168.1.1");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("produces deterministic output", async () => {
    const a = await sha256Short("test-input");
    const b = await sha256Short("test-input");
    expect(a).toBe(b);
  });

  it("different inputs produce different hashes", async () => {
    const a = await sha256Short("input-a");
    const b = await sha256Short("input-b");
    expect(a).not.toBe(b);
  });

  it("handles empty string", async () => {
    const h = await sha256Short("");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------------------
// ILIKE wildcard injection — sanitizeWord
// ---------------------------------------------------------------------------

describe("sanitizeWord (ILIKE injection)", () => {
  it("strips % wildcard", () => {
    expect(sanitizeWord("%admin%")).toBe("admin");
  });

  it("strips _ single-char wildcard", () => {
    expect(sanitizeWord("a_b_c")).toBe("abc");
  });

  it("strips both % and _", () => {
    expect(sanitizeWord("%_test_%")).toBe("test");
  });

  it("preserves normal alphanumeric words", () => {
    expect(sanitizeWord("Ahmed")).toBe("Ahmed");
  });

  it("preserves hyphens, dots, apostrophes", () => {
    expect(sanitizeWord("O'Brien-Smith.Jr")).toBe("O'Brien-Smith.Jr");
  });

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeWord(long)).toHaveLength(50);
  });

  it("strips SQL special characters (keeps apostrophe for names)", () => {
    expect(sanitizeWord("'; DROP TABLE--")).toBe("'DROPTABLE--");
    expect(sanitizeWord("; DROP TABLE")).toBe("DROPTABLE");
  });

  it("returns empty for pure wildcards", () => {
    expect(sanitizeWord("%%%___")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// CSV formula injection — csvSafe
// ---------------------------------------------------------------------------

describe("csvSafe (CSV formula injection)", () => {
  it("wraps value in quotes", () => {
    expect(csvSafe("hello")).toBe('"hello"');
  });

  it("escapes double quotes", () => {
    expect(csvSafe('say "hi"')).toBe('"say ""hi"""');
  });

  it("prefixes leading = with apostrophe", () => {
    expect(csvSafe("=CMD()")).toBe("\"'=CMD()\"");
  });

  it("prefixes leading + with apostrophe", () => {
    expect(csvSafe("+1234")).toBe("\"'+1234\"");
  });

  it("prefixes leading - with apostrophe", () => {
    expect(csvSafe("-1234")).toBe("\"'-1234\"");
  });

  it("prefixes leading @ with apostrophe", () => {
    expect(csvSafe("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });

  it("does not prefix normal strings", () => {
    expect(csvSafe("normal")).toBe('"normal"');
  });

  it("handles combined injection attempts", () => {
    const result = csvSafe('=1+2";=CMD()');
    expect(result.startsWith("\"'=")).toBe(true);
    expect(result).toContain('""');
  });
});

// ---------------------------------------------------------------------------
// Session JWT verification
// ---------------------------------------------------------------------------

describe("getSessionUser logic (JWT verification)", () => {
  const SECRET = "test-secret-key";

  it("valid JWT returns correct payload", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: "user-123", username: "testuser", email: "test@example.com", exp: now + 3600 },
      SECRET,
    );
    const payload = await verifyJWT(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-123");
    expect(payload!.username).toBe("testuser");
    expect(payload!.email).toBe("test@example.com");
  });

  it("expired JWT returns null", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: "user-123", username: "testuser", email: "test@example.com", exp: now - 10 },
      SECRET,
    );
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it("wrong secret returns null", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: "user-123", username: "testuser", email: "test@example.com", exp: now + 3600 },
      SECRET,
    );
    const payload = await verifyJWT(token, "wrong-secret");
    expect(payload).toBeNull();
  });

  it("tampered token returns null", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: "user-123", username: "testuser", email: "test@example.com", exp: now + 3600 },
      SECRET,
    );
    // Tamper with payload
    const parts = token.split(".");
    parts[1] = parts[1].slice(0, -2) + "xx";
    const tampered = parts.join(".");
    const payload = await verifyJWT(tampered, SECRET);
    expect(payload).toBeNull();
  });

  it("garbage string returns null", async () => {
    const payload = await verifyJWT("not.a.jwt", SECRET);
    expect(payload).toBeNull();
  });

  it("empty string returns null", async () => {
    const payload = await verifyJWT("", SECRET);
    expect(payload).toBeNull();
  });
});
