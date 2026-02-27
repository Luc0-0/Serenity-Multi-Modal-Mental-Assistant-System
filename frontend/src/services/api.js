/**
 * API Service Layer.
 * Centralized HTTP client with validation.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api';
const TIMEOUT_MS = 20000; // 20 seconds

/**
 * Validate Chat Response.
 * @param {object} data - API response
 * @returns {object} Validated data
 */
const validateChatResponse = (data) => {
  // Required fields
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected object');
  }

  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Invalid response: missing or empty reply');
  }

  if (!Number.isInteger(data.conversation_id) || data.conversation_id <= 0) {
    throw new Error('Invalid response: missing or invalid conversation_id');
  }

  if (!Number.isInteger(data.message_id) || data.message_id <= 0) {
    throw new Error('Invalid response: missing or invalid message_id');
  }

  // Optional crisis fields
  if (data.crisis_detected === true) {
    if (!data.crisis_severity || !['warning', 'danger', 'emergency'].includes(data.crisis_severity)) {
      throw new Error('Invalid response: crisis_detected=true requires valid crisis_severity');
    }

    if (!Array.isArray(data.resources) || data.resources.length === 0) {
      throw new Error('Invalid response: crisis_detected=true requires resources array');
    }

    // Validate resource objects
    data.resources.forEach((resource, idx) => {
      if (!resource.name || typeof resource.name !== 'string') {
        throw new Error(`Invalid response: resource[${idx}] missing name`);
      }
      if (!resource.phone && !resource.text && !resource.url) {
        throw new Error(`Invalid response: resource[${idx}] missing contact method (phone/text/url)`);
      }
    });
  }

  return data;
};

/**
 * Format user-friendly error.
 * @param {Error|object} error - Error object
 * @returns {string} User message
 */
const formatErrorMessage = (error) => {
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return 'Request timed out. The server might be slow. Please try again.';
  }

  if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
    return 'Network connection failed. Please check your internet and try again.';
  }

  if (error.message.includes('Invalid response')) {
    return 'Unexpected response from server. Please try again.';
  }

  if (error.detail) {
    return error.detail;
  }

  return 'An error occurred. Please try again.';
};

/**
 * Fetch with timeout wrapper.
 * @param {string} url - Endpoint
 * @param {object} options - Options
 * @param {number} timeout - MS
 */
const fetchWithTimeout = (url, options = {}, timeout = TIMEOUT_MS) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => {
        const err = new Error('Request timeout');
        err.name = 'TimeoutError';
        reject(err);
      }, timeout)
    ),
  ]);
};

export const sendChatMessage = async ({ user_id, message, conversation_id = null }) => {
  // Input validation
  if (!user_id || !Number.isInteger(user_id) || user_id <= 0) {
    throw {
      message: 'Invalid user ID',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (!message || typeof message !== 'string') {
    throw {
      message: 'Message is required',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw {
      message: 'Message cannot be empty',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (trimmedMessage.length > 2000) {
    throw {
      message: 'Message cannot exceed 2000 characters',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (conversation_id !== null && (!Number.isInteger(conversation_id) || conversation_id <= 0)) {
    throw {
      message: 'Invalid conversation ID',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  const payload = {
    user_id,
    message: trimmedMessage,
    conversation_id,
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/chat/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS
    );

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: formatErrorMessage(errorData),
        code: `HTTP_${response.status}`,
        retryable: response.status >= 500, // Retry on 5xx errors
        status: response.status,
      };
    }

    const data = await response.json();

    // Validate response structure
    const validatedData = validateChatResponse(data);

    return validatedData;
  } catch (error) {
    // Handle network/timeout errors
    if (error.name === 'TimeoutError') {
      throw {
        message: formatErrorMessage(error),
        code: 'TIMEOUT_ERROR',
        retryable: true,
      };
    }

    if (error.message.includes('Failed to fetch')) {
      throw {
        message: 'Network connection failed. Please check your internet.',
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    // Re-throw if already formatted error
    if (error.code) {
      throw error;
    }

    // Unexpected error
    throw {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNEXPECTED_ERROR',
      retryable: true,
    };
  }
};

/**
 * Check backend connectivity.
 * @returns {Promise<boolean>} Status
 */
export const testBackendConnection = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health/`, {}, 5000);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const getErrorDisplay = (error) => {
  return {
    message: error.message,
    isRetryable: error.retryable,
    code: error.code,
  };
};

export const sendChatMessageStream = async ({ user_id, message, conversation_id = null }, onChunk) => {
  if (!user_id || !Number.isInteger(user_id) || user_id <= 0) {
    throw {
      message: 'Invalid user ID',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (!message || typeof message !== 'string') {
    throw {
      message: 'Message is required',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw {
      message: 'Message cannot be empty',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (trimmedMessage.length > 2000) {
    throw {
      message: 'Message cannot exceed 2000 characters',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  if (conversation_id !== null && (!Number.isInteger(conversation_id) || conversation_id <= 0)) {
    throw {
      message: 'Invalid conversation ID',
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
  }

  const payload = {
    user_id,
    message: trimmedMessage,
    conversation_id,
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/chat/stream/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: formatErrorMessage(errorData),
        code: `HTTP_${response.status}`,
        retryable: response.status >= 500,
        status: response.status,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let conversationId = null;
    let messageId = null;
    let isCrisis = false;
    let crisisSeverity = null;
    let crisisResourceCount = 0;
    let fullText = '';

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
            crisisSeverity = parts[1];
            crisisResourceCount = parseInt(parts[2], 10);
            isCrisis = true;
          } else if (data.startsWith('__END__')) {
            const parts = data.split('__');
            conversationId = parseInt(parts[1], 10);
            messageId = parseInt(parts[2], 10);
          } else {
            fullText += data;
            onChunk(fullText);
          }
        }
      }
    }

    return {
      reply: fullText,
      conversation_id: conversationId,
      message_id: messageId,
      crisis_detected: isCrisis,
      crisis_severity: crisisSeverity,
    };
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw {
        message: formatErrorMessage(error),
        code: 'TIMEOUT_ERROR',
        retryable: true,
      };
    }

    if (error.message.includes('Failed to fetch')) {
      throw {
        message: 'Network connection failed. Please check your internet.',
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    if (error.code) {
      throw error;
    }

    throw {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNEXPECTED_ERROR',
      retryable: true,
    };
  }
};
