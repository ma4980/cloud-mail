import { deleteCookie, setCookie } from 'hono/cookie';
import constant from '../const/constant';

export const SESSION_COOKIE = 'cloud_mail_session';

export function setSessionCookie(c, token) {
	setCookie(c, SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'Strict',
		path: '/',
		maxAge: constant.TOKEN_EXPIRE
	});
}

export function clearSessionCookie(c) {
	deleteCookie(c, SESSION_COOKIE, { secure: true, sameSite: 'Strict', path: '/' });
}
