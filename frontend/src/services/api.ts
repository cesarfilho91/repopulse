import type { Repository, RepositoryDetails } from '../types/github';

const configuredUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const API_BASE_URL = (configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`).replace(/\/$/, '');

interface ApiErrorPayload {
  error?: string;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal, headers: { Accept: 'application/json' } });
  const payload = await response.json() as T | ApiErrorPayload;

  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload).error || 'Não foi possível concluir a consulta.');
  }

  return payload as T;
}

export async function searchRepositories(query: string, signal?: AbortSignal): Promise<Repository[]> {
  const payload = await request<{ data: Repository[] }>(`/api/search?q=${encodeURIComponent(query)}`, signal);
  return payload.data;
}

export async function getRepositoryDetails(fullName: string, signal?: AbortSignal): Promise<RepositoryDetails> {
  const [owner, repo] = fullName.split('/');
  return (await request<{ data: RepositoryDetails }>(`/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, signal)).data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>('/api/health');
    return true;
  } catch {
    return false;
  }
}
