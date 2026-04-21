import { useState, useEffect, useCallback } from 'react';
import type { Client } from '../types';
import * as clientService from '../services/client.service';
import toast from 'react-hot-toast';

export function useClients(search?: string) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getClients(search);
      setClients(data);
    } catch {
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (data: Partial<Client>) => {
    const client = await clientService.createClient(data);
    setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success('Client added successfully');
    return client;
  };

  const update = async (id: string, data: Partial<Client>) => {
    const client = await clientService.updateClient(id, data);
    setClients((prev) => prev.map((c) => (c.id === id ? client : c)));
    toast.success('Client updated successfully');
    return client;
  };

  const remove = async (id: string) => {
    await clientService.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    toast.success('Client deleted');
  };

  return { clients, isLoading, error, refetch: fetch, create, update, remove };
}
