import app from '../hono/hono';
import result from '../model/result';
import pushService from '../service/push-service';

app.get('/push/config', c => c.json(result.ok(pushService.config(c))));

app.post('/push/subscribe', async c => {
	const user = c.get('user');
	await pushService.subscribe(c, user.userId, await c.req.json());
	return c.json(result.ok());
});

app.delete('/push/unsubscribe', async c => {
	const user = c.get('user');
	const { endpoint } = await c.req.json();
	await pushService.unsubscribe(c, user.userId, endpoint);
	return c.json(result.ok());
});
