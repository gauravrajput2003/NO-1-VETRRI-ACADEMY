export function isLoginRequest(url = '') {
  return /\/auth\/login(?:\/[^/?#]+)?(?:[?#]|$)/.test(url);
}

export function getLoginErrorMessage(error) {
  const status = error.response?.status;
  if (status >= 500) return 'The server is temporarily unavailable. Please try again shortly.';
  if (status === 429) return error.response?.data?.message || 'Too many login attempts. Please wait before trying again.';
  if (error.response?.data?.message) return error.response.data.message;
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) return 'The server is taking too long to respond. Please try again in a moment.';
  if (error.request || error.code === 'ERR_NETWORK' || ['Network Error', 'Failed to fetch'].includes(error.message)) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (status) return 'Unable to sign in. Please check your login details and try again.';
  return error.message || 'Unable to sign in. Please try again.';
}
