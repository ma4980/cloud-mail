import http from '@/axios/index.js';

export function settingSet(setting) {
    return http.put('/setting/set', setting)
}

export function settingQuery() {
    return http.get('/setting/query')
}

export function testWebhook() {
    return http.post('/setting/testWebhook')
}

export function websiteConfig() {
    return http.get('/setting/websiteConfig')
}

export function setBackground(background) {
    return http.put('/setting/setBackground',{background})
}

export function deleteBackground() {
    return http.delete('/setting/deleteBackground')
}

export function setBlackList(params) {
    return http.put('/setting/setBlacklist', params)
}

export function pushConfig() {
    return http.get('/push/config', { noMsg: true })
}

export function pushSubscribe(subscription) {
    return http.post('/push/subscribe', subscription)
}

export function pushUnsubscribe(endpoint) {
    return http.delete('/push/unsubscribe', { data: { endpoint } })
}
