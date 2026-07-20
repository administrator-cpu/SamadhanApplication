// src/hooks/useCustomers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../api/userService';

export function useCustomers({ page = 1, limit = 10, search = '' } = {}) {
  return useQuery({
    queryKey: ['customers', { page, limit, search }],
    queryFn: () => userService.getCustomers({ page, limit, search: search || undefined }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userService.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useMyConnections() {
  return useQuery({
    queryKey: ['my-connections'],
    queryFn: userService.getMyConnections,
    staleTime: 10 * 60 * 1000,
  });
}

export function useEmployees({ page = 1, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['employees', { page, limit }],
    queryFn: () => userService.getEmployees({ page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userService.createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => userService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userService.updateEmployee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateCustomer(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userService.updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => userService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCustomerConnections(customerRowId) {
  return useQuery({
    queryKey: ['customer-connections', customerRowId],
    queryFn: () => userService.getCustomerConnections(customerRowId),
    enabled: !!customerRowId,
  });
}

export function useUpdateMyProfile() {
  return useMutation({
    mutationFn: (payload) => userService.updateMyProfile(payload),
  });
}

export function useUploadProfileImage() {
  return useMutation({
    mutationFn: (formData) => userService.uploadProfileImage(formData),
  });
}

export function useRemoveProfileImage() {
  return useMutation({
    mutationFn: () => userService.removeProfileImage(),
  });
}