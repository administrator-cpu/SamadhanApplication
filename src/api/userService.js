// src/api/userService.js — create this new file
import apiClient from './client';

export const userService = {
    getCustomers: async (params = {}) => {
        const { data } = await apiClient.get('/users/customers', { params });
        return data.data;
    },

    createCustomer: async (payload) => {
        const { data } = await apiClient.post('/users/customers', payload);
        return data.data;
    },

    updateCustomer: async (id, payload) => {
        const { data } = await apiClient.put(`/users/customers/${id}`, payload);
        return data.data;
    },

    deleteCustomer: async (id) => {
        const { data } = await apiClient.delete(`/users/customers/${id}`);
        return data.data;
    },

    getMyConnections: async () => {
        const { data } = await apiClient.get('/users/my-connections');
        return data.data;
    },

    getConnectionsByEmail: async (email) => {
        const { data } = await apiClient.get('/users/customers/connections-by-email', {
            params: { email },
        });
        return data.data;
    },

    getCustomerConnections: async (customerId) => {
        const { data } = await apiClient.get(`/users/customers/${customerId}/connections`);
        return data.data?.connections ?? data.data ?? [];
    },
    registerPushToken: async (token, platform) => {
        const { data } = await apiClient.post('/users/push-token', { token, platform });
        return data.data;
    },

    removePushToken: async () => {
        const { data } = await apiClient.delete('/users/push-token');
        return data.data;
    },

    getEmployees: async (params = {}) => {
        const { data } = await apiClient.get('/users/employees', { params });
        return data.data;
    },

    createEmployee: async (payload) => {
        const { data } = await apiClient.post('/users/employees', payload);
        return data.data;
    },

    updateEmployee: async (id, payload) => {
        const { data } = await apiClient.put(`/users/employees/${id}`, payload);
        return data.data;
    },

    deleteEmployee: async (id) => {
        const { data } = await apiClient.delete(`/users/employees/${id}`);
        return data.data;
    },

    updateMyProfile: async (payload) => {
        const { data } = await apiClient.put('/users/profile', payload);
        return data.data;
    },

    uploadProfileImage: async (formData) => {
        const { data } = await apiClient.post('/users/profile/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            transformRequest: (data) => data, 
        });
        return data.data;
    },

    removeProfileImage: async () => {
        const { data } = await apiClient.delete('/users/profile/image');
        return data.data;
    },
};