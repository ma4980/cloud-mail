import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import { setSessionCookie } from '../security/session-cookie';

const respondWithLogin = (c, loginInfo) => {
	if (loginInfo?.token) setSessionCookie(c, loginInfo.token);
	return c.json(result.ok(loginInfo));
};

app.post('/oauth/linuxDo/login', async (c) => {
	const loginInfo = await oauthService.linuxDoLogin(c, await c.req.json());
	return respondWithLogin(c, loginInfo)
});

app.post('/oauth/github/login', async (c) => {
	const loginInfo = await oauthService.githubLogin(c, await c.req.json());
	return respondWithLogin(c, loginInfo)
});

app.post('/oauth/google/login', async (c) => {
	const loginInfo = await oauthService.googleLogin(c, await c.req.json());
	return respondWithLogin(c, loginInfo)
});

app.put('/oauth/bindUser', async (c) => {
	const loginInfo = await oauthService.bindUser(c, await c.req.json());
	return respondWithLogin(c, loginInfo)
})
