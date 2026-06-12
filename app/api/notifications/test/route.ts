import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { testEmailTemplate } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email address is required" }, { status: 400 });
  }

  const recipient = email.trim();

  try {
    await sendMail({
      to:      recipient,
      subject: "✅ BFS Inventory — Test Email",
      html:    testEmailTemplate(recipient),
    });

    await prisma.emailLog.create({
      data: {
        type:       "DAILY_DIGEST",
        subject:    "Test Email",
        recipients: [recipient],
        status:     "SENT",
        sentAt:     new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: `Test email sent to ${recipient}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await prisma.emailLog.create({
      data: {
        type:       "DAILY_DIGEST",
        subject:    "Test Email (failed)",
        recipients: [recipient],
        status:     "FAILED",
        error:      msg,
      },
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
