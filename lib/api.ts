const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(getApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const fieldErrors = Array.isArray(data?.errors)
      ? data.errors.map((item: { message: string }) => item.message).join(', ')
      : null;

    throw new Error(fieldErrors || data?.message || 'Request failed');
  }

  return data as T;
}
