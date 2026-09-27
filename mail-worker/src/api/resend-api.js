import resendService from '../service/resend-service';
import app from '../hono/hono';
import { verifyResendWebhook } from '../utils/resend-webhook-utils';
app.post('/webhooks',async (c) => {
	try {
		const payload = await c.req.text();
		const webhookSecret = c.env.resend_webhook_secret;
		if (!webhookSecret) {
			console.error('RESEND_WEBHOOK_SECRET is not configured; webhook event ignored.');
			return c.text('Webhook signature verification is not configured', 503);
		}
		const valid = await verifyResendWebhook(payload, {
			id: c.req.header('svix-id'),
			timestamp: c.req.header('svix-timestamp'),
			signature: c.req.header('svix-signature')
		}, webhookSecret);
		if (!valid) return c.text('Invalid webhook signature', 401);
		await resendService.webhooks(c, JSON.parse(payload));
		return c.text('success', 200)
	} catch (e) {
		return  c.text(e.message, 500)
	}
})
