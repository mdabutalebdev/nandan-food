import nodemailer, { Transporter } from 'nodemailer';
import config from '../config';

/**
 * Lightweight email helper built on nodemailer + the EMAIL_* env config.
 *
 * If EMAIL_USER / EMAIL_PASS aren't set (e.g. no Gmail App Password configured
 * yet) sending is skipped and `false` is returned instead of throwing — callers
 * (like the admin invite flow) fall back to showing a copyable link so the
 * feature still works before SMTP is wired up.
 */
let transporter: Transporter | null = null;

export const isEmailConfigured = (): boolean =>
    Boolean(config.email.user && config.email.pass);

const getTransporter = (): Transporter | null => {
    if (!isEmailConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.port === 465, // 465 = implicit TLS, 587 = STARTTLS
            auth: { user: config.email.user, pass: config.email.pass },
        });
    }
    return transporter;
};

export const sendEmail = async (opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}): Promise<boolean> => {
    const t = getTransporter();
    if (!t) {
        // eslint-disable-next-line no-console
        console.warn(`[email] EMAIL_USER/EMAIL_PASS not set — skipped sending "${opts.subject}" to ${opts.to}`);
        return false;
    }
    try {
        await t.sendMail({
            from: config.email.from,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            text: opts.text,
        });
        return true;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[email] send failed:', (err as Error).message);
        return false;
    }
};
