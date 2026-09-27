import app from '../hono/hono';
import BizError from '../error/biz-error';
import reqUtils from '../utils/req-utils';

const RULES = [
	{ path: '/login', limit: 10, window: 60 },
	{ path: '/register', limit: 5, window: 300 },
	{ path: '/public/genToken', limit: 5, window: 300 },
	{ path: '/init', limit: 5, window: 300 },
	{ path: '/oauth', limit: 30, window: 60 }
];

app.use('*', async (c, next) => {
	const rule = RULES.find(item => c.req.path.startsWith(item.path));
	if (!rule || c.req.method === 'OPTIONS') return next();

	const ip = reqUtils.getIp(c) || 'unknown';
	const bucket = Math.floor(Date.now() / (rule.window * 1000));
	const key = `rate:${rule.path}:${ip}:${bucket}`;
	const current = Number(await c.env.kv.get(key)) || 0;
	if (current >= rule.limit) {
		c.header('Retry-After', String(rule.window));
		throw new BizError('請求過於頻繁，請稍後再試。 Too many requests.', 429);
	}
	await c.env.kv.put(key, String(current + 1), { expirationTtl: rule.window + 30 });
	return next();
});
