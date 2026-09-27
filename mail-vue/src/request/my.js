import http from '@/axios/index.js';

export function loginUserInfo(silent = false) {
    return http.get('/my/loginUserInfo', silent ? {noMsg: true} : undefined)
}

export function resetPassword(password) {
    return http.put('/my/resetPassword', {password})
}

export function userDelete() {
    return http.delete('/my/delete')
}

