import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';
import userContext from "../security/user-context";
import webhookService from '../service/webhook-service';

app.put('/setting/set', async (c) => {
	await settingService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/setting/testWebhook', async (c) => {
	const setting = await settingService.query(c);
	const delivery = await webhookService.sendEmail(c, {
		emailId: 0,
		sendEmail: 'test@cloud-mail.local',
		name: 'Cloud Mail',
		toEmail: c.env.admin,
		toName: '管理員',
		subject: 'Cloud Mail 測試通知',
		text: 'Webhook 設定成功，您之後收到新郵件時會在這裡看到通知。',
		content: '<p>Webhook 設定成功，您之後收到新郵件時會在這裡看到通知。</p>',
		code: '123456',
		createTime: new Date().toISOString()
	}, setting.webhookUrl, 0, setting.webhookSecret);

	if (!delivery.success) {
		return c.json(result.fail(`Webhook 測試失敗：${delivery.error}`, 502));
	}

	return c.json(result.ok(delivery));
});

app.get('/setting/query', async (c) => {
	const setting = await settingService.get(c);
	return c.json(result.ok(setting));
});

app.get('/setting/websiteConfig', async (c) => {
	const setting = await settingService.websiteConfig(c);
	return c.json(result.ok(setting));
})

app.put('/setting/setBackground', async (c) => {
	const key = await settingService.setBackground(c, await c.req.json());
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackground', async (c) => {
	await settingService.deleteBackground(c);
	return c.json(result.ok());
});

app.put('/setting/setBlacklist', async (c) => {
	const setting = await settingService.setBlacklist(c, await c.req.json());
	return c.json(result.ok(setting));
})

