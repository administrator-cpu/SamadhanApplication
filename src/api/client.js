import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ;

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback);
}

function onRefreshed(newToken) {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
}

let onSessionExpired = () => { };
export function setOnSessionExpired(callback) {
    onSessionExpired = callback;
}

apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await storage.getItemAsync('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
           
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            if (error.response.status === 401 && !originalRequest._retry) {

                if (originalRequest.url?.includes('/refresh') || originalRequest.url?.includes('/login')) {
                    return Promise.reject({
                        status: error.response.status,
                        message: error.response.data?.message || 'Invalid email or password.',
                        data: error.response.data,
                    });
                }

                originalRequest._retry = true;

                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        subscribeTokenRefresh((newToken) => {
                            if (newToken) {
                                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                resolve(apiClient(originalRequest));
                            } else {
                                reject(error);
                            }
                        });
                    });
                }

                isRefreshing = true;

                try {
                    const refreshToken = await storage.getItemAsync('refresh_token');
                    if (!refreshToken) {
                        throw new Error('No refresh token available');
                    }

                    const { data } = await axios.post(`${BASE_URL}/refresh`, { refreshToken });

                    const newAccessToken = data?.data?.accessToken;
                    const newRefreshToken = data?.data?.refreshToken;

                    if (!newAccessToken) {
                        throw new Error('Refresh response missing accessToken');
                    }

                    await storage.setItemAsync('auth_token', newAccessToken);
                    if (newRefreshToken) {
                        await storage.setItemAsync('refresh_token', newRefreshToken);
                    }

                    isRefreshing = false;
                    onRefreshed(newAccessToken);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);

                } catch (refreshError) {
                    isRefreshing = false;
                    onRefreshed(null);


                    await clearSession();
                    onSessionExpired();

                    return Promise.reject({ status: 401, message: 'Session expired. Please log in again.' });
                }
            }

            return Promise.reject({
                status: error.response.status,
                message: error.response.data?.message || 'An error occurred on the server.',
                data: error.response.data,
            });

        } else if (error.request) {
            return Promise.reject({
                status: 0,
                message: 'Network error. Please check your internet connection and try again.',
                isNetworkError: true,
            });
        }

        return Promise.reject({ status: 0, message: error.message || 'An unexpected error occurred.' });
    }
);

async function clearSession() {
    await storage.deleteItemAsync('auth_token');
    await storage.deleteItemAsync('refresh_token');
}

export default apiClient;