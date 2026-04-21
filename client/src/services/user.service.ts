import api from './api';
import type { User } from '../types';

export interface ProfilePayload {
  business_name?: string;
  business_email?: string;
  business_address?: string;
  business_phone?: string;
  currency?: string;
}

export const userService = {
  async updateProfile(payload: ProfilePayload): Promise<User> {
    const { data } = await api.put('/users/profile', payload);
    return data.data;
  },

  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await api.post('/users/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
