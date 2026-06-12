import nodemailer from "nodemailer";

export function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = createTransport();
  const recipients = Array.isArray(to) ? to.join(", ") : to;

  await transporter.sendMail({
    from: `"BFS Inventory" <${process.env.GMAIL_USER}>`,
    to: recipients,
    subject,
    html,
    text,
  });
}
