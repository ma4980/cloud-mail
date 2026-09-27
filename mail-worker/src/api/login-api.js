import app from '../hono/hono';
import loginService from '../service/login-service';
import result from '../model/result';
import userContext from '../security/user-context';
import { clearSessionCookie, setSessionCookie } from '../security/session-cookie';

app.post('/login', async (c) => {
	const token = await loginService.login(c, await c.req.json());
	setSessionCookie(c, token);
	return c.json(result.ok({ token: token }));
});

app.post('/session/adopt', async c => {
	setSessionCookie(c, c.get('jwt'));
	return c.json(result.ok());
});

app.post('/register', async (c) => {
	const jwt = await loginService.register(c, await c.req.json());
	return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
	await loginService.logout(c, userContext.getUserId(c));
	clearSessionCookie(c);
	return c.json(result.ok());
});

