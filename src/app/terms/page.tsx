import Link from "next/link";

export const metadata = { title: "Terms of Service | GradeMyProfessor" };

export default function TermsPage() {
  return (
    <div className="px-5 pb-10 max-w-2xl mx-auto">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <h1 className="font-display text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>Terms of Service</h1>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Last updated: February 2026</p>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>1. Acceptance</h2>
            <p>By using GMP, you agree to these terms. GMP operates under the laws of the Kingdom of Bahrain.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>2. User Conduct</h2>
            <p>Submit only honest reviews. Do not post false, defamatory, or misleading content. Do not include personal information. Do not manipulate ratings. Do not scrape or attack the platform.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>3. Content Policy</h2>
            <p>Reviews are opinions. We may remove content that: violates Bahrain law, contains personal data, is defamatory beyond opinion, threatens violence, or is spam.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>4. Professor Rights</h2>
            <p>Professors may request content review at <strong>legal@grademyprofessor.bh</strong>. We respond within 72 hours.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>5. Disclaimer</h2>
            <p>GMP is a platform for student opinions. We do not verify review accuracy. We are not affiliated with any Bahrain university.</p>
          </section>
          <section>
            <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>6. Contact</h2>
            <p>Legal: <strong>legal@grademyprofessor.bh</strong> · General: <strong>hello@grademyprofessor.bh</strong></p>
          </section>
        </div>
      </div>
    </div>
  );
}
