const encoder = new TextEncoder();
// Cloudflare Workers Web Crypto currently rejects PBKDF2 iteration counts
// above 100,000. Keep the work factor at the runtime's supported maximum.
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_MAX_ITERATIONS = 100000;
const PBKDF2_PREFIX = 'pbkdf2-sha256';

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const constantTimeEqual = (left, right) => {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let i = 0; i < left.length; i++) {
		difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
	}
	return difference === 0;
};

const saltHashUtils = {

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array));
	},


	async hashPassword(password) {
		const salt = this.generateSalt();
		const hash = await this.genHashPassword(password, salt);
		return { salt, hash };
	},

	async genHashPassword(password, salt) {
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);
		const hashBuffer = await crypto.subtle.deriveBits({
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: encoder.encode(salt),
			iterations: PBKDF2_ITERATIONS
		}, key, 256);
		return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(hashBuffer)}`;
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (storedHash?.startsWith(`${PBKDF2_PREFIX}$`)) {
			const [, iterationsText, expected] = storedHash.split('$');
			const iterations = Number(iterationsText);
			if (
				!Number.isSafeInteger(iterations) ||
				iterations < 100000 ||
				iterations > PBKDF2_MAX_ITERATIONS ||
				!expected
			) return false;
			const key = await crypto.subtle.importKey('raw', encoder.encode(inputPassword), 'PBKDF2', false, ['deriveBits']);
			const hashBuffer = await crypto.subtle.deriveBits({
				name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations
			}, key, 256);
			return constantTimeEqual(toBase64(hashBuffer), expected);
		}

		// 舊版相容：登入成功後由 login-service 自動升級成 PBKDF2。
		const legacyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + inputPassword));
		return constantTimeEqual(toBase64(legacyBuffer), storedHash || '');
	},

	isLegacyHash(hash) {
		return !hash?.startsWith(`${PBKDF2_PREFIX}$`);
	},

	genRandomPwd(length = 16) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const values = new Uint8Array(length);
		crypto.getRandomValues(values);
		return Array.from(values, value => chars[value % chars.length]).join('');
	}
};

export default saltHashUtils;
