import JwtUtils from '../utils/jwt-utils';
import constant from '../const/constant';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE } from './session-cookie';

const userContext = {
	getUserId(c) {
		return c.get('user').userId;
	},

	getUser(c) {
		return c.get('user');
	},

	async getToken(c) {
		const jwt = c.get('jwt') || c.req.header(constant.TOKEN_HEADER) || getCookie(c, SESSION_COOKIE);
		const result = await JwtUtils.verifyToken(c,jwt);
		return result?.token;
	},
};
export default userContext;
