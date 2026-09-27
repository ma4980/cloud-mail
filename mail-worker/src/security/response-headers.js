const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	"script-src 'self' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"connect-src 'self' https://api.iconify.design https://challenges.cloudflare.com",
	"frame-src https://challenges.cloudflare.com",
	"worker-src 'self' blob:",
	"manifest-src 'self'"
].join('; ');

export function applySecurityHeaders(headers, { api = false } = {}) {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
	headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
	headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	if (api) {
		headers.set('Cache-Control', 'no-store');
		headers.set('Pragma', 'no-cache');
	}
}

export function secureResponse(response, options) {
	const secured = new Response(response.body, response);
	applySecurityHeaders(secured.headers, options);
	return secured;
}
