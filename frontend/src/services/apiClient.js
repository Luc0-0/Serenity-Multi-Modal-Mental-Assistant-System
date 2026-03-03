// Build API base URL - prioritize environment variable
const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Production: construct backend URL from frontend domain
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev) {
    // On Railway with separate backend/frontend services
    // Try to detect backend from environment or construct from hostname
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 
      `${window.location.protocol}//${window.location.hostname.replace('frontend', 'backend')}`;
    return backendUrl;
  }
  
  // Development default (no /api - let services handle it)
  return 'http://localhost:8000';
})();

console.debug('[API Client] Configured with base URL:', API_BASE_URL);
const TIMEOUT_MS = 10000;

class APIClient {
  constructor(baseURL = API_BASE_URL, timeout = TIMEOUT_MS) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      const response = await Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            this.timeout
          )
        ),
      ]);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: error.detail || `HTTP ${response.status}`,
          data: error,
        };
      }

      return await response.json();
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      throw error;
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async stream(endpoint, data, onChunk) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: error.detail || `HTTP ${response.status}`,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let metadata = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data.startsWith('__CRISIS__')) {
              const parts = data.split('__');
              metadata.crisis = {
                severity: parts[1],
                resourceCount: parseInt(parts[2], 10),
              };
            } else if (data.startsWith('__END__')) {
              const parts = data.split('__');
              metadata.conversationId = parseInt(parts[1], 10);
              metadata.messageId = parseInt(parts[2], 10);
            } else {
              onChunk(data, metadata);
            }
          }
        }
      }

      return metadata;
    } finally {
      reader.releaseLock();
    }
  }
}

export const apiClient = new APIClient();
