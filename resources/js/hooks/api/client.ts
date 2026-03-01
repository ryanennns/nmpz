import axios from 'axios';
import type { AxiosInstance } from 'axios';

export function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export function createClient(): AxiosInstance {
    const client = axios.create({
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    client.interceptors.request.use((config) => {
        config.headers = config.headers ?? {};
        config.headers['X-XSRF-TOKEN'] = getCsrfToken();
        return config;
    });

    return client;
}
