import nodemailer from "nodemailer";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    })
  : null;

const FROM = process.env.SMTP_FROM || "Yuen House Radio <noreply@yuenhouse.org>";

export async function sendShowApprovedEmail(
  to: string,
  showTitle: string,
  scheduledStart: Date,
  note?: string | null
) {
  if (!transporter) return;

  const dateStr = scheduledStart.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = scheduledStart.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Show Approved: ${showTitle}`,
    text: [
      `Your show "${showTitle}" has been approved!`,
      ``,
      `Scheduled: ${dateStr} at ${timeStr}`,
      note ? `\nAdmin note: ${note}` : "",
      ``,
      `View your show at ${process.env.NEXTAUTH_URL}/dashboard`,
      ``,
      `— Yuen House Radio`,
    ].join("\n"),
  });
}

export async function sendShowRejectedEmail(
  to: string,
  showTitle: string,
  note: string
) {
  if (!transporter) return;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Show Request Declined: ${showTitle}`,
    text: [
      `Your show request "${showTitle}" was not approved.`,
      ``,
      `Reason: ${note}`,
      ``,
      `Feel free to submit a new request with adjustments.`,
      `${process.env.NEXTAUTH_URL}/shows/request`,
      ``,
      `— Yuen House Radio`,
    ].join("\n"),
  });
}
