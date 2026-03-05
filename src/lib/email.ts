import { Resend } from "resend";
import logger from "@/lib/logger";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM = "GradeMyProf <noreply@grademyprofessor.net>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.net";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e3;width:100%;max-width:560px">
        <tr>
          <td style="background:#0a0a0a;padding:20px 32px">
            <p style="margin:0;color:#E87B35;font-size:18px;font-weight:700;letter-spacing:-0.3px">GradeMyProf</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9f9f8;border-top:1px solid #e5e5e3;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af;font-style:italic">"What Students Say"</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReviewLive(
  to: string,
  username: string,
  professorName: string,
  courseCode: string,
  professorSlug?: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not set — skipping sendReviewLive");
    return;
  }
  logger.debug("[email] sendReviewLive →", `prof="${professorName}" course="${courseCode}"`);
  const profileUrl = professorSlug ? `${APP_URL}/p/${professorSlug}` : APP_URL;
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: "Your review is now live ✓",
      html: baseTemplate(`
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111110">Your review is live!</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7">
          Hi <strong style="color:#111110">${escapeHtml(username)}</strong> — your review for
          <strong style="color:#111110">${escapeHtml(professorName)}</strong>${courseCode ? ` (${escapeHtml(courseCode)})` : ""}
          has been approved and is now visible to other students.
        </p>
        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.7">
          Your feedback helps fellow students make better decisions at enrollment. Thank you for contributing.
        </p>
        <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.6">
          Your review is posted 100% anonymously — your name and email are never shared publicly.
        </p>
        <a href="${profileUrl}" style="color:#E87B35;font-size:14px;font-weight:600;text-decoration:none">View →</a>
      `),
    });
    if (error) {
      logger.error("[email] sendReviewLive Resend error:", JSON.stringify(error));
    } else {
      logger.debug("[email] sendReviewLive delivered, id:", data?.id);
    }
  } catch (err) {
    logger.error("[email] sendReviewLive threw:", err);
  }
}

export async function sendReviewMilestone(
  to: string,
  username: string,
  professorName: string,
  courseCode: string,
  professorSlug?: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not set — skipping sendReviewMilestone");
    return;
  }
  logger.debug("[email] sendReviewMilestone →", `prof="${professorName}" course="${courseCode}"`);
  const profileUrl = professorSlug ? `${APP_URL}/p/${professorSlug}` : APP_URL;
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: "5 students found your review helpful ★",
      html: baseTemplate(`
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111110">Your review is making a difference!</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7">
          Hi <strong style="color:#111110">${escapeHtml(username)}</strong> — your review for
          <strong style="color:#111110">${escapeHtml(professorName)}</strong>${courseCode ? ` (${escapeHtml(courseCode)})` : ""}
          has just been marked helpful by <strong style="color:#111110">5 students</strong>.
        </p>
        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.7">
          Real feedback like yours helps students make smarter choices at enrollment. Keep it up.
        </p>
        <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.6">
          Your review is posted 100% anonymously — your name and email are never shared publicly.
        </p>
        <a href="${profileUrl}" style="color:#E87B35;font-size:14px;font-weight:600;text-decoration:none">View →</a>
      `),
    });
    if (error) {
      logger.error("[email] sendReviewMilestone Resend error:", JSON.stringify(error));
    } else {
      logger.debug("[email] sendReviewMilestone delivered, id:", data?.id);
    }
  } catch (err) {
    logger.error("[email] sendReviewMilestone threw:", err);
  }
}

export async function sendAdminNewReview(opts: {
  professorName: string;
  courseCode: string;
  ratingQuality: number;
  ratingDifficulty: number;
  comment: string;
  status: string;
  reviewId: string;
  isLoggedIn: boolean;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!process.env.RESEND_API_KEY || !adminEmail) {
    logger.warn("[email] skipping admin notification — RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not set");
    return;
  }
  logger.debug("[email] sendAdminNewReview →", `prof="${opts.professorName}" status=${opts.status}`);
  const modUrl = `${APP_URL}/admin`;
  const preview = opts.comment.length > 200 ? opts.comment.slice(0, 200) + "…" : opts.comment;
  const statusColor: Record<string, string> = {
    live: "#16a34a", pending: "#d97706", flagged: "#dc2626", removed: "#991b1b",
  };
  const color = statusColor[opts.status] || "#6b7280";
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: adminEmail,
      subject: `New review: ${opts.professorName} (${opts.courseCode || "no course"}) — ${opts.status}`,
      html: baseTemplate(`
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111110">New Review Submitted</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280;width:110px">Professor</td>
            <td style="padding:8px 0;font-size:14px;color:#111110;font-weight:600">${escapeHtml(opts.professorName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280">Course</td>
            <td style="padding:8px 0;font-size:14px;color:#111110">${escapeHtml(opts.courseCode || "—")}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280">Quality / Difficulty</td>
            <td style="padding:8px 0;font-size:14px;color:#111110">${opts.ratingQuality} / ${opts.ratingDifficulty}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280">Status</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:${color}">${escapeHtml(opts.status.toUpperCase())}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280">Logged in</td>
            <td style="padding:8px 0;font-size:14px;color:#111110">${opts.isLoggedIn ? "Yes" : "No (anonymous)"}</td>
          </tr>
        </table>
        ${preview ? `
        <div style="background:#f9f9f8;border:1px solid #e5e5e3;border-radius:10px;padding:16px;margin-bottom:20px">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Comment</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(preview)}</p>
        </div>` : ""}
        <a href="${modUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Open Mod Queue →</a>
      `),
    });
    if (error) {
      logger.error("[email] sendAdminNewReview Resend error:", JSON.stringify(error));
    } else {
      logger.debug("[email] sendAdminNewReview delivered, id:", data?.id);
    }
  } catch (err) {
    logger.error("[email] sendAdminNewReview threw:", err);
  }
}

export async function sendReviewRejected(
  to: string,
  username: string,
  professorName: string,
  reason?: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not set — skipping sendReviewRejected");
    return;
  }
  logger.debug("[email] sendReviewRejected →", `prof="${professorName}"`);
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: "Update on your GradeMyProf review",
      html: baseTemplate(`
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111110">Your review wasn't approved</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7">
          Hi <strong style="color:#111110">${escapeHtml(username)}</strong> — your review for
          <strong style="color:#111110">${escapeHtml(professorName)}</strong>
          didn't meet our content guidelines and has been removed.
        </p>
        ${reason ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em">Reason</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(reason)}</p>
        </div>` : ""}
        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.7">
          You're welcome to submit a new review that follows our
          <a href="${APP_URL}/terms" style="color:#E87B35;text-decoration:none">community guidelines</a>.
          Honest, constructive feedback is always welcome.
        </p>
        <p style="margin:0 0 20px;font-size:12px;color:#9ca3af">
          You're receiving this because you have an account at GradeMyProf.
        </p>
        <a href="${APP_URL}" style="color:#E87B35;font-size:14px;font-weight:600;text-decoration:none">View →</a>
      `),
    });
    if (error) {
      logger.error("[email] sendReviewRejected Resend error:", JSON.stringify(error));
    } else {
      logger.debug("[email] sendReviewRejected delivered, id:", data?.id);
    }
  } catch (err) {
    logger.error("[email] sendReviewRejected threw:", err);
  }
}
