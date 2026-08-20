import axios from 'axios';

// Global response interceptor.
//
// If ANY authenticated API call comes back 401 (invalid token, or — the
// important case here — the user's account was deleted while their session
// was live), we wipe the session and bounce them to /login. This means an
// admin can't keep operating after another admin deletes their account.
//
// We deliberately skip 401s from the login endpoint itself (bad credentials
// on sign-in are not a session expiry).
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const isLoginCall = /\/api\/auth\/(login|register|forgot-password|verify-reset-code|reset-password)/.test(url);

        if (status === 401 && !isLoginCall) {
            // Clear the session so the redirect target sees no token.
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('role');
            sessionStorage.removeItem('username');

            // Avoid a redirect loop if we're already on /login.
            if (!window.location.pathname.startsWith('/login')) {
                // Preserve the intent for a friendlier banner on the login page.
                const reason = error?.response?.data?.code === 'ACCOUNT_DELETED'
                    ? 'account_deleted'
                    : 'session_expired';
                window.location.replace(`/login?reason=${reason}`);
            }
        }
        return Promise.reject(error);
    }
);
