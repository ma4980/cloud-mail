const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

const decodeBase64 = value => {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(normalized);
	return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const constantTimeEqual = (left, right) => {
	if (left.length !== right.length) return false;
	let result = 0;
	for (let i = 0; i < left.length; i++) result |= left[i] ^ right[i];
	return result === 0;
};

export async function verifyResendWebhook(payload, headers, secret, now = Date.now()) {
	if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
	const timestamp = Number(headers.timestamp);
	if (!Number.isFinite(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

	try {
		const secretBytes = decodeBase64(secret.startsWith('whsec_') ? secret.slice(6) : secret);
		const key = await crypto.subtle.importKey(
			'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
		);
		const signed = `${headers.id}.${headers.timestamp}.${payload}`;
		const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed)));
		return headers.signature.split(' ').some(candidate => {
			const [version, signature] = candidate.split(',');
			if (version !== 'v1' || !signature) return false;
			return constantTimeEqual(expected, decodeBase64(signature));
		});
	} catch {
		return false;
	}
}
