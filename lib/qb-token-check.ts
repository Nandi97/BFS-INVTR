import { getQboTokens } from '@/lib/qbo';
import { sendMail } from '@/lib/mailer';

const WARN_DAYS = 7;

export async function checkQbRefreshToken(): Promise<{
	daysLeft: number | null;
	alerted: boolean;
}> {
	const tokens = await getQboTokens();
	if (!tokens) return { daysLeft: null, alerted: false };

	const expiresAt = new Date(tokens.refreshTokenExpiresAt).getTime();
	const daysLeft = Math.floor((expiresAt - Date.now()) / 86_400_000);

	if (daysLeft > WARN_DAYS) return { daysLeft, alerted: false };

	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';
	const admin = process.env.GMAIL_USER!;

	const urgency =
		daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 2 ? 'CRITICAL' : 'WARNING';
	const subject = `[BFS Inventory] QB refresh token ${urgency} — ${daysLeft <= 0 ? 'already expired' : `${daysLeft}d left`}`;

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 10px; max-width: 520px; margin: 0 auto; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h1 { font-size: 18px; color: #111; margin: 0 0 8px; }
  p  { font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 16px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 20px; ${urgency === 'EXPIRED' ? 'background:#fee2e2;color:#dc2626;' : urgency === 'CRITICAL' ? 'background:#fef3c7;color:#d97706;' : 'background:#dbeafe;color:#2563eb;'} }
  .btn  { display: inline-block; margin-top: 8px; padding: 10px 20px; background: #111; color: #fff; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
  .footer { font-size: 11px; color: #aaa; margin-top: 24px; border-top: 1px solid #f0f0f0; padding-top: 16px; }
</style></head>
<body>
<div class="card">
  <h1>QuickBooks refresh token alert</h1>
  <span class="badge">${urgency}</span>
  <p>
    ${
		daysLeft <= 0
			? 'The QuickBooks refresh token for <strong>BFS Inventory</strong> has already expired. Live syncs are broken until you reconnect.'
			: `The QuickBooks refresh token for <strong>BFS Inventory</strong> expires in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.`
	}
  </p>
  <p>
    Once it expires, the nightly stock and sales syncs will stop working and no data will update automatically.
    Reconnect before the deadline to avoid disruption.
  </p>
  <a class="btn" href="${appUrl}/integrations">Reconnect QuickBooks →</a>
  <div class="footer">
    BFS Inventory · Automated alert · Token expires ${new Date(tokens.refreshTokenExpiresAt).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</div>
</body>
</html>`;

	await sendMail({ to: admin, subject, html });
	return { daysLeft, alerted: true };
}
