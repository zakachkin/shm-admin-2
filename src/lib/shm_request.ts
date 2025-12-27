import { useAuthStore } from '../store/authStore';

const RATE_LIMIT_MS = 200;
let lastRequestTime = 0;
let rateLimitChain: Promise<void> = Promise.resolve();

const scheduleRequest = () => {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, RATE_LIMIT_MS - (now - lastRequestTime));
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestTime = Date.now();
  });
  return rateLimitChain;
};

export async function shm_request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const sessionId = useAuthStore.getState().getSessionId();

  await scheduleRequest();

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'session-id': sessionId } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const basePath = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
    window.location.href = `${basePath}/login`;
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return data;

}

export async function shm_request_with_status<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ status: number; data: T }> {
  const sessionId = useAuthStore.getState().getSessionId();

  await scheduleRequest();

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'session-id': sessionId } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data };
}

export interface ApiListResponse<T = any> {
  data: T[];
  total: number;
}

export function normalizeListResponse<T = any>(res: any): ApiListResponse<T> {
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const data = res.data || [];
  const total = res.items ?? res.total ?? data.length;
  return { data, total };
}

export async function shm_login(login: string, password: string, otpToken?: string): Promise<any> {
  const response = await fetch('shm/v1/user/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      login, 
      password,
      ...(otpToken ? { otp_token: otpToken } : {})
    }),
  });

  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }

  const data = await response.json();

  if (data.status === 'fail' && data.msg === 'INVALID_OTP_TOKEN') {
    throw new Error('Неверный OTP код');
  }

  if (data.otp_required) {
    return { otpRequired: true, login: data.login };
  }

  const sessionId = data.id;

  if (!sessionId) {
    throw new Error('Не получен session_id');
  }

  const userResponse = await fetch('shm/v1/user', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'session-id': sessionId,
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    const user = userData.data?.[0] || userData;
    return { user, sessionId };
  }

  return {
    user: {
      user_id: 0,
      login,
      gid: 1
    },
    sessionId
  };
}
