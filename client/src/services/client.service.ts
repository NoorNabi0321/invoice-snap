import api from './api';
import type { Client } from '../types';

export async function getClients(search?: string): Promise<Client[]> {
  const params = search ? { search } : {};
  const res = await api.get('/clients', { params });
  return res.data.data;
}

export async function getClient(id: string): Promise<Client> {
  const res = await api.get(`/clients/${id}`);
  return res.data.data;
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const res = await api.post('/clients', data);
  return res.data.data;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const res = await api.put(`/clients/${id}`, data);
  return res.data.data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
