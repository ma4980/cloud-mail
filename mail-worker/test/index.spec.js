import { describe, expect, it } from 'vitest';
import cryptoUtils from '../src/utils/crypto-utils.js';
import jwtUtils from '../src/utils/jwt-utils.js';

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
