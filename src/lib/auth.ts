export function setAuth() {
    // set cookie อายุ 1 วัน
    document.cookie = "hd_auth=true; path=/; max-age=86400; SameSite=Strict";
}

export function clearAuth() {
    document.cookie = "hd_auth=; path=/; max-age=0";
}