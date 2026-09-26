import i18next from 'i18next';
import zh from './zh.js'
import zhTw from './zh-TW.js'
import en from './en.js'
import app from '../hono/hono';

app.use('*', async (c, next) => {
	const acceptLanguage = c.req.header('accept-language')?.split(',')[0]?.trim().toLowerCase() || '';
	let lang = 'zh';
	if (acceptLanguage.startsWith('en')) {
		lang = 'en';
	} else if (/^zh-(tw|hk|mo|hant)/.test(acceptLanguage)) {
		lang = 'zh-TW';
	}
	await i18next.changeLanguage(lang);
	return await next()
})

const resources = {
	en: {
		translation: en
	},
	zh: {
		translation: zh,
	},
	'zh-TW': {
		translation: zhTw,
	},
};

i18next.init({
	fallbackLng: 'zh',
	resources,
});

export const t = (key, values) => i18next.t(key, values)

export default i18next;
