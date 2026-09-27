import { sendPushBatch } from '@mmmike/web-push/send';

const MAX_SUBSCRIPTIONS_PER_USER = 10;

const configured = env => Boolean(env.vapid_public_key && env.vapid_private_key && env.vapid_subject);

const validateEndpoint = value => {
	const url = new URL(value);
	const host = url.hostname.toLowerCase();
	const privateHost = host === 'localhost'
		|| host === '::1'
		|| /^127\./.test(host)
		|| /^10\./.test(host)
		|| /^192\.168\./.test(host)
		|| /^169\.254\./.test(host)
		|| /^172\.(1[6-9]|2\d|3[01])\./.test(host);
	if (url.protocol !== 'https:' || url.username || url.password || privateHost) {
		throw new Error('Invalid push endpoint');
	}
	return url.toString();
};

const pushService = {
	config(c) {
		return { enabled: configured(c.env), publicKey: configured(c.env) ? c.env.vapid_public_key : '' };
	},

	async subscribe(c, userId, subscription) {
		if (!configured(c.env)) throw new Error('Web Push 尚未設定');
		const endpoint = validateEndpoint(subscription?.endpoint);
		const p256dh = subscription?.keys?.p256dh;
		const auth = subscription?.keys?.auth;
		if (!p256dh || !auth || p256dh.length > 512 || auth.length > 256) throw new Error('Invalid push subscription');

		await c.env.db.prepare(`
			INSERT INTO push_subscription (user_id, endpoint, expiration_time, p256dh, auth, update_time)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(endpoint) DO UPDATE SET
				user_id = excluded.user_id,
				expiration_time = excluded.expiration_time,
				p256dh = excluded.p256dh,
				auth = excluded.auth,
				update_time = CURRENT_TIMESTAMP
		`).bind(userId, endpoint, subscription.expirationTime || null, p256dh, auth).run();

		await c.env.db.prepare(`
			DELETE FROM push_subscription
			WHERE user_id = ? AND push_id NOT IN (
				SELECT push_id FROM push_subscription WHERE user_id = ? ORDER BY update_time DESC LIMIT ?
			)
		`).bind(userId, userId, MAX_SUBSCRIPTIONS_PER_USER).run();
	},

	async unsubscribe(c, userId, endpoint) {
		if (!endpoint) return;
		await c.env.db.prepare('DELETE FROM push_subscription WHERE user_id = ? AND endpoint = ?')
			.bind(userId, endpoint).run();
	},

	async sendNewMail(c, emailRow) {
		if (!configured(c.env) || !emailRow?.userId) return { delivered: 0, gone: [], failed: [] };
		const rows = await c.env.db.prepare(`
			SELECT endpoint, expiration_time, p256dh, auth
			FROM push_subscription WHERE user_id = ?
		`).bind(emailRow.userId).all();
		const subscriptions = (rows.results || []).map(row => ({
			endpoint: row.endpoint,
			expirationTime: row.expiration_time,
			keys: { p256dh: row.p256dh, auth: row.auth }
		}));
		if (!subscriptions.length) return { delivered: 0, gone: [], failed: [] };

		const result = await sendPushBatch(subscriptions, {
			title: '您有一封新郵件',
			body: `${emailRow.name || emailRow.sendEmail || '未知寄件者'}\n${emailRow.subject || '（無主旨）'}`,
			url: '/inbox',
			tag: `cloud-mail-${emailRow.emailId}`
		}, {
			subject: c.env.vapid_subject,
			publicKey: c.env.vapid_public_key,
			privateKey: c.env.vapid_private_key
		}, { ttl: 86400, urgency: 'high', concurrency: 10 });

		if (result.gone?.length) {
			const endpoints = result.gone.map(item => item.endpoint || item).filter(Boolean);
			for (const endpoint of endpoints) {
				await c.env.db.prepare('DELETE FROM push_subscription WHERE endpoint = ?').bind(endpoint).run();
			}
		}
		if (result.failed?.length) console.error(`Web Push 傳送失敗：${result.failed.length} 個訂閱`);
		return result;
	}
};

export default pushService;
