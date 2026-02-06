/**
 * API Client that works in both server and client contexts
 * - Server-side: Uses internal Docker network (http://backend:3001/api)
 * - Client-side: Uses public URL (http://localhost:3001/api)
 */

const isServer = typeof window === 'undefined';

// Server-side API URL (internal Docker network)
const SERVER_API_URL = process.env.API_URL || 'http://backend:3001/api';

// Client-side API URL (browser accessible)
const CLIENT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Get the appropriate API URL based on execution context
 */
export function getApiUrl(): string {
  return isServer ? SERVER_API_URL : CLIENT_API_URL;
}

/**
 * Fetch wrapper that automatically uses the correct API URL
 */
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = `${getApiUrl()}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API client with common endpoints
 */
export const apiClient = {
  // Products
  products: {
    getAll: (params?: Record<string, any>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiFetch(`/products${query}`);
    },
    getFeatured: (limit: number = 8) => apiFetch(`/products/featured?limit=${limit}`),
    getTrending: (limit: number = 8) => apiFetch(`/products/trending?limit=${limit}`),
    getDeals: (limit: number = 8) => apiFetch(`/products/deals?limit=${limit}`),
    getNewArrivals: (limit: number = 8) => apiFetch(`/products/new-arrivals?limit=${limit}`),
    getById: (id: string) => apiFetch(`/products/${id}`),
    getBySlug: (slug: string) => apiFetch(`/products/slug/${slug}`),
  },

  // Categories
  categories: {
    getAll: () => apiFetch('/categories'),
    getById: (id: string) => apiFetch(`/categories/${id}`),
  },

  // Countries
  countries: {
    getAll: () => apiFetch('/countries'),
  },

  // Health check
  health: () => apiFetch('/health'),
};
