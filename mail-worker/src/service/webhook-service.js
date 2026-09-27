import domainUtils from '../utils/domain-uitls';

const isPrivateHost = (hostname) => {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
	if (/^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return true;
	const match = host.match(/^172\.(\d+)\./);
	if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
	return host === '0.0.0.0' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
};

export const validateWebhookUrl = (value) => {
	const url = new URL(value);
	if (url.protocol !== 'https:' || url.username || url.password || isPrivateHost(url.hostname)) {
		throw new Error('Webhook URL must use HTTPS and a public hostname');
	}
	return url.toString();
};

const webhookService = {

	async sendEmail(c, emailRow, webhookUrl, retry = 0, webhookSecret) {

		webhookUrl = domainUtils.toOssDomain(webhookUrl);

		if (!webhookUrl) {
			return;
		}
		webhookUrl = validateWebhookUrl(webhookUrl);

		retry = Number(retry);
		if (isNaN(retry) || retry < 0) {
			retry = 0;
		}

		const headers = {
			'Content-Type': 'application/json'
		};

		if (webhookSecret) {
			headers['Authorization'] = webhookSecret;
		}

		const body = JSON.stringify({
			emailId: emailRow.emailId,
			sendEmail: emailRow.sendEmail,
			sendName: emailRow.name,
			toEmail: emailRow.toEmail,
			toName: emailRow.toName,
			subject: emailRow.subject,
			text: emailRow.text,
			content: emailRow.content,
			code: emailRow.code,
			createTime: emailRow.createTime
		});

		let lastError = '';

		for (let i = 0; i <= retry; i++) {
			try {
				const res = await fetch(webhookUrl, {
					method: 'POST',
					headers,
					body,
					redirect: 'error',
					signal: AbortSignal.timeout(10000)
				});

				if (res.ok) {
					return;
				}

				lastError = `status: ${res.status} response: ${(await res.text()).slice(0, 1000)}`;
			} catch (e) {
				lastError = e.message;
			}
			if (i < retry) await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (2 ** i), 8000)));
		}

		console.error(`Webhook 傳送失敗: ${lastError}`);
	}

};

export default webhookService;
