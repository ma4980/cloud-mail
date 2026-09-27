import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { cors } from 'hono/cors';
import { applySecurityHeaders } from '../security/response-headers';

app.use('*', cors({
	origin: (origin, c) => {
		if (!origin) return '';
		const sameOrigin = new URL(c.req.url).origin;
		const extraOrigins = String(c.env.cors_origins || '').split(',').map(item => item.trim()).filter(Boolean);
		return origin === sameOrigin || extraOrigins.includes(origin) ? origin : '';
	},
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Authorization', 'Content-Type'],
	credentials: true,
	maxAge: 86400
}));

app.use('*', async (c, next) => {
	await next();
	applySecurityHeaders(c.res.headers, { api: true });
});

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail('KV 資料庫未綁定\nKV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail('KV 資料庫未綁定\nKV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail('D1 資料庫未綁定\nD1 database not bound',502));
	}

	if (err.message?.includes('D1_ERROR: no such column')) {
		return c.json(result.fail('請依照說明文件更新資料庫\nPlease update the database as documented',502));
	}

	return c.json(result.fail(err.message, err.code));
});

export default app;


