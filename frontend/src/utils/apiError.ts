import axios from 'axios';

interface ErrorBody {
  message?: string;
  error?: string;
}

/**
 * Turn an unknown thrown value into a message that is safe to show a user.
 * Prefers the API's `message` field, then the HTTP error, then a fallback.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ErrorBody | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error.response?.status === 401) return 'Your session expired. Sign in again.';
    if (error.response?.status === 403) return 'You do not have permission to do that.';
    if (error.response?.status === 404) return 'That item no longer exists.';
    if (error.response?.status === 429) return 'Too many requests. Wait a moment and try again.';
    if (error.response?.status && error.response.status >= 500) {
      return 'The server could not complete the request. Try again shortly.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
