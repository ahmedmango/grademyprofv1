export const metadata = {
  title: "Privacy Policy — GradeMyProfessor Bahrain",
};

export default function PrivacyPage() {
  return (
    <div className="px-5 pb-10 pt-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>Privacy Policy</h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-tertiary)" }}>Last updated: February 23, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>1. Our Commitment to Your Privacy</h2>
          <p>GradeMyProfessor Bahrain ("we," "our," "the Platform") is committed to protecting your privacy and ensuring your anonymity. This policy explains what information we collect, how we use it, and how we protect it.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>2. Information We Collect</h2>
          <p><strong>Account Information:</strong> When you create an account, we collect your username, email address, and a hashed version of your password. Your password is encrypted and cannot be read by anyone, including our team.</p>
          <p className="mt-2"><strong>Review Content:</strong> The ratings, tags, grades, and comments you submit. This content is published anonymously — your identity is never attached to your reviews.</p>
          <p className="mt-2"><strong>Device Information:</strong> We generate an anonymous device fingerprint to prevent duplicate reviews. This fingerprint cannot be used to identify you personally.</p>
          <p className="mt-2"><strong>Technical Data:</strong> IP address (hashed and anonymized), browser type, and timestamps for security and rate-limiting purposes only.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>3. How We Use Your Information</h2>
          <p>We use your information to: verify you are a real student (not a bot); prevent abuse, spam, and duplicate reviews; notify you about the status of your reviews (via email); improve the Platform; and comply with legal obligations if required.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>4. Anonymity Guarantee</h2>
          <p><strong>Your reviews are 100% anonymous.</strong> Specifically: your username is never shown with your reviews; your email address is never shared with professors, universities, other users, or any third party; your IP address is hashed immediately and the original is never stored; there is no way for anyone — including our administrators — to connect a published review to your account by viewing the public site.</p>
          <p className="mt-2">We take this guarantee seriously. Anonymity is fundamental to the Platform's purpose of enabling honest student feedback.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>5. Information We Never Collect</h2>
          <p>We do not collect: your real name (unless you choose to use it as a username); your phone number; your university student ID; your location data; or any biometric data.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>6. Data Sharing</h2>
          <p>We do not sell, rent, or share your personal information with third parties. We may disclose information only if required by law or to protect the safety of our users.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>7. Data Security</h2>
          <p>We protect your data using: encrypted password storage (bcrypt hashing); HTTPS encryption for all data in transit; row-level security policies on our database; rate limiting to prevent abuse; and regular security reviews.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>8. Data Retention</h2>
          <p>Account information is retained as long as your account is active. If you request account deletion, we will remove your personal information within 30 days. Published reviews will remain on the Platform in anonymous form.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>9. Your Rights</h2>
          <p>You have the right to: access the personal information we hold about you; request correction of inaccurate information; request deletion of your account and personal data; withdraw consent for data processing at any time.</p>
          <p className="mt-2">To exercise these rights, contact us at the email below.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>10. Cookies</h2>
          <p>We use minimal local storage for: remembering your theme preference (light/dark); remembering your language preference; maintaining your login session. We do not use tracking cookies or any third-party analytics.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>12. Contact</h2>
          <p>For privacy-related inquiries, contact us at <strong style={{ color: "var(--accent)" }}>privacy@grademyprofessor.bh</strong></p>
        </section>
      </div>
    </div>
  );
}
