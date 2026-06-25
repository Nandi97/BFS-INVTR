import { prisma } from '@/lib/prisma';
import {
	RECIPIENT_KEYS,
	RECIPIENT_DEFAULTS,
	type RecipientKey,
} from '@/app/api/settings/email-recipients/route';

export type EmailRecipients = Record<RecipientKey, string>;

export async function getEmailRecipients(): Promise<EmailRecipients> {
	const rows = await prisma.appSetting.findMany({
		where: { key: { in: [...RECIPIENT_KEYS] } },
	});
	const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	return Object.fromEntries(
		RECIPIENT_KEYS.map((k) => [k, stored[k] ?? RECIPIENT_DEFAULTS[k]])
	) as EmailRecipients;
}
