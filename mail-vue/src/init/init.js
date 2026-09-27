import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";
import {adoptSession} from '@/request/login.js'
import {syncBackgroundPush} from '@/utils/notification-utils.js'

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
        await adoptSession(legacyToken)
        localStorage.removeItem('token')
        localStorage.setItem('cloud-mail-authenticated', '1')
    }
    if (!settingStore.lang) {
        const browserLang = navigator.language.toLowerCase()
        let lang = 'en'
        if (browserLang.startsWith('zh')) {
            lang = /^(zh-tw|zh-hk|zh-mo)/.test(browserLang) ? 'zh-TW' : 'zh'
        }
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    const [setting, user] = await Promise.all([
        websiteConfig(),
        loginUserInfo(true).catch(() => null)
    ]);
    settingStore.settings = setting;
    settingStore.domainList = setting.domainList;
    document.title = setting.title;

    if (user) {
        localStorage.setItem('cloud-mail-authenticated', '1')
        accountStore.currentAccountId = user.account.accountId;
        accountStore.currentAccount = user.account;
        userStore.user = user;

        const routers = permsToRouter(user.permKeys);
        routers.forEach(routerData => {
            router.addRoute('layout', routerData);
        });
        void syncBackgroundPush();
    } else {
        localStorage.removeItem('cloud-mail-authenticated')
    }
}
