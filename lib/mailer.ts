import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

export interface MailAttachment {
	filename: string;
	content: Buffer;
	contentType: string;
}

export interface SendMailOptions {
	to: string | string[];
	subject: string;
	html: string;
	attachments?: MailAttachment[];
}

export async function sendMail({
	to,
	subject,
	html,
	attachments,
}: SendMailOptions) {
	return transporter.sendMail({
		from: `"BFS Inventory" <${process.env.GMAIL_USER}>`,
		to: Array.isArray(to) ? to.join(', ') : to,
		subject,
		html,
		attachments: attachments?.map((a) => ({
			filename: a.filename,
			content: a.content,
			contentType: a.contentType,
		})),
	});
}

export async function verifyMailer() {
	return transporter.verify();
}
