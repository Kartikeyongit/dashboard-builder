import client from './client';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types';

export const authAPI = {
  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data),
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data),
};
