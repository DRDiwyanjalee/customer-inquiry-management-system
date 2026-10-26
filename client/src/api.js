
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Send API requests and return both the response and parsed data.
export async function apiRequest(path, { token, ...options } = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({
        success: false,
        message: 'The server returned an invalid response',
    }));

    return { response, data };
}
