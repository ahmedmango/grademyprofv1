import Link from "next/link";

export const metadata = { title: "Privacy Policy | GradeMyProfessor" };

export default function PrivacyPage() {
  return (
    <div className="px-5 pb-10 max-w-2xl mx-auto">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <h1 className="font-display text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>Privacy Policy</h1>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Last updated: February 2026</p>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>1. Overview</h2>
            <p>GradeMyProfessor (&quot;GMP&quot;) is a student-powered platform for sharing academic experiences in Bahrain. We comply with the <strong>Bahrain Personal Data Protection Law (PDPL) — Law No. 30 of 2018</strong>.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>2. Data We Collect</h2>
            <p><strong>We do NOT collect:</strong> Names, emails, phone numbers, IP addresses (stored), student IDs, CPR numbers, or any PII.</p>
            <p className="mt-2"><strong>We DO collect:</strong> Anonymous browser fingerprint hashes (one-way SHA-256, irreversible), review content you voluntarily submit, and anonymized usage data.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>3. How We Use Data</h2>
            <p>Fingerprints prevent duplicate reviews and enforce rate limits. Review content provides ratings to students. We never sell, share, or transfer data to third parties.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>4. Data Storage &amp; Security</h2>
            <p>All data is encrypted. IPs are hashed in-memory, never stored in plaintext. HTTPS/TLS for all connections. We can delete all data associated with a fingerprint hash upon request.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>5. Review Content &amp; Professors</h2>
            <p>Reviews reflect student opinions. We moderate to remove: personal information, defamatory or threatening content, hate speech, and spam. Professors may contact us for review removal.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>6. Your Rights (PDPL)</h2>
            <p>You have the right to: know what data we hold, request deletion, withdraw consent, and lodge a complaint with the Personal Data Protection Authority.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>7. Contact</h2>
            <p>Privacy inquiries: <strong>privacy@grademyprofessor.bh</strong></p>
          </section>
        </div>
      </div>
    </div>
  );
}
