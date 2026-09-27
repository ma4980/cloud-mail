import { afterEach, describe, expect, it, vi } from 'vitest';
import cryptoUtils from '../src/utils/crypto-utils.js';
import jwtUtils from '../src/utils/jwt-utils.js';
import webhookService, { buildWebhookPayload, isDiscordWebhookUrl } from '../src/service/webhook-service.js';

describe('credential security', () => {
	it('hashes new passwords with versioned PBKDF2 and verifies them', async () => {
		const password = 'correct horse battery staple';
		const { salt, hash } = await cryptoUtils.hashPassword(password);

		expect(hash).toMatch(/^pbkdf2-sha256\$100000\$/);
		expect(await cryptoUtils.verifyPassword(password, salt, hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('wrong password', salt, hash)).toBe(false);
	});

	it('continues to verify legacy SHA-256 hashes for migration', async () => {
		const password = 'legacy password';
		const salt = 'legacy-salt';
		const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password));
		const legacyHash = btoa(String.fromCharCode(...new Uint8Array(buffer)));

		expect(cryptoUtils.isLegacyHash(legacyHash)).toBe(true);
		expect(await cryptoUtils.verifyPassword(password, salt, legacyHash)).toBe(true);
	});

	it('rejects unsupported PBKDF2 work factors without calling Web Crypto', async () => {
		const unsupportedHash = `pbkdf2-sha256$310000$${btoa('placeholder')}`;

		expect(await cryptoUtils.verifyPassword('password', 'salt', unsupportedHash)).toBe(false);
	});
});

describe('JWT security', () => {
	const context = { env: { jwt_secret: 'a-test-secret-that-is-long-enough' } };

	it('issues an expiring HS256 token and verifies it', async () => {
		const token = await jwtUtils.generateToken(context, { userId: 1 }, 60);
		const payload = await jwtUtils.verifyToken(context, token);

		expect(payload.userId).toBe(1);
		expect(payload.exp).toBeGreaterThan(payload.iat);
	});

	it('rejects a token with a modified algorithm header', async () => {
		const token = await jwtUtils.generateToken(context, { userId: 1 }, 60);
		const [, payload, signature] = token.split('.');
		const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
			.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

		expect(await jwtUtils.verifyToken(context, `${header}.${payload}.${signature}`)).toBeNull();
	});
});

describe('webhook payloads', () => {
	const email = {
		emailId: 42,
		sendEmail: 'sender@example.com',
		name: 'Sender',
		toEmail: 'mail@example.net',
		toName: 'Inbox',
		subject: 'Test message',
		text: 'Hello from Cloud Mail',
		content: '<p>Hello from Cloud Mail</p>',
		code: '123456',
		createTime: '2026-09-27T12:00:00.000Z'
	};

	it('formats Discord webhook notifications as a visible message', () => {
		const url = 'https://discord.com/api/webhooks/123/token';
		const payload = buildWebhookPayload(email, url);

		expect(isDiscordWebhookUrl(url)).toBe(true);
		expect(payload.content).toBe('📬 收到新郵件');
		expect(payload.embeds[0].title).toBe('Test message');
		expect(payload.embeds[0].fields).toContainEqual(expect.objectContaining({ name: '驗證碼', value: '123456' }));
		expect(payload.allowed_mentions).toEqual({ parse: [] });
	});

	it('keeps the existing JSON contract for generic webhooks', () => {
		const payload = buildWebhookPayload(email, 'https://hooks.example.com/mail');

		expect(payload.emailId).toBe(42);
		expect(payload.embeds).toBeUndefined();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('waits for Discord to confirm the notification', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
		const delivery = await webhookService.sendEmail({}, email, 'https://discord.com/api/webhooks/123/token');
		const [url, options] = fetchMock.mock.calls[0];

		expect(delivery).toEqual({ success: true, status: 200 });
		expect(url).toContain('wait=true');
		expect(options.headers['User-Agent']).toContain('CloudMail/1.0');
		expect(options.redirect).toBe('manual');
	});
});
