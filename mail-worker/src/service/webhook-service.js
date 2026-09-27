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

const truncate = (value, maxLength) => {
	const text = String(value || '').trim();
	return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const htmlToText = (value) => String(value || '')
	.replace(/<style[\s\S]*?<\/style>/gi, '')
	.replace(/<script[\s\S]*?<\/script>/gi, '')
	.replace(/<br\s*\/?>/gi, '\n')
	.replace(/<\/p>/gi, '\n')
	.replace(/<[^>]+>/g, ' ')
	.replace(/&nbsp;/gi, ' ')
	.replace(/&amp;/gi, '&')
	.replace(/&lt;/gi, '<')
	.replace(/&gt;/gi, '>')
	.replace(/&quot;/gi, '"')
	.replace(/&#39;/gi, "'")
	.replace(/[ \t]+/g, ' ')
	.replace(/\n{3,}/g, '\n\n')
	.trim();

export const isDiscordWebhookUrl = (value) => {
	const url = new URL(value);
	const hostname = url.hostname.toLowerCase();
	return (hostname === 'discord.com' || hostname.endsWith('.discord.com') || hostname === 'discordapp.com')
		&& url.pathname.startsWith('/api/webhooks/');
};

export const buildWebhookPayload = (emailRow, webhookUrl) => {
	const genericPayload = {
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
	};

	if (!isDiscordWebhookUrl(webhookUrl)) {
		return genericPayload;
	}

	const preview = truncate(emailRow.text || htmlToText(emailRow.content) || '（郵件沒有文字內容）', 1800);
	const fields = [
		{ name: '寄件者', value: truncate(emailRow.name ? `${emailRow.name} <${emailRow.sendEmail}>` : emailRow.sendEmail || '未知', 1024), inline: false },
		{ name: '收件者', value: truncate(emailRow.toName ? `${emailRow.toName} <${emailRow.toEmail}>` : emailRow.toEmail || '未知', 1024), inline: false }
	];

	if (emailRow.code) {
		fields.push({ name: '驗證碼', value: truncate(emailRow.code, 1024), inline: true });
	}

	const embed = {
		title: truncate(emailRow.subject || '（無主旨）', 256),
		description: preview,
		color: 0x3399ff,
		fields,
		footer: { text: 'Cloud Mail 郵件通知' }
	};

	const date = new Date(emailRow.createTime);
	if (!Number.isNaN(date.getTime())) {
		embed.timestamp = date.toISOString();
	}

	return {
		username: 'Cloud Mail',
		content: '📬 收到新郵件',
		embeds: [embed],
		allowed_mentions: { parse: [] }
	};
};

const webhookService = {

	async sendEmail(c, emailRow, webhookUrl, retry = 0, webhookSecret) {

		webhookUrl = domainUtils.toOssDomain(webhookUrl);

		if (!webhookUrl) {
			return { success: false, error: '尚未設定 Webhook 網址' };
		}
		webhookUrl = validateWebhookUrl(webhookUrl);
		const isDiscord = isDiscordWebhookUrl(webhookUrl);
		const requestUrl = new URL(webhookUrl);
		if (isDiscord) {
			requestUrl.searchParams.set('wait', 'true');
		}

		retry = Number(retry);
		if (isNaN(retry) || retry < 0) {
			retry = 0;
		}

		const headers = {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'User-Agent': 'CloudMail/1.0 (+https://github.com/ma4980/cloud-mail)'
		};

		if (webhookSecret && !isDiscord) {
			headers['Authorization'] = webhookSecret;
		}

		const body = JSON.stringify(buildWebhookPayload(emailRow, webhookUrl));

		let lastError = '';

		for (let i = 0; i <= retry; i++) {
			try {
				const res = await fetch(requestUrl.toString(), {
					method: 'POST',
					headers,
					body,
					redirect: 'error',
					signal: AbortSignal.timeout(10000)
				});

				if (res.ok) {
					return { success: true, status: res.status };
				}

				lastError = `status: ${res.status} response: ${(await res.text()).slice(0, 1000)}`;
			} catch (e) {
				lastError = e.message;
			}
			if (i < retry) await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (2 ** i), 8000)));
		}

		console.error(`Webhook 傳送失敗: ${lastError}`);
		return { success: false, error: lastError };
	}

};

export default webhookService;
