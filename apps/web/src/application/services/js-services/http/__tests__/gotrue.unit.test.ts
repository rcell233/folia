const mockGrantClient = {
  interceptors: {
    request: {
      use: jest.fn(),
    },
  },
  post: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockGrantClient),
  },
}));

jest.mock('@/application/session', () => ({
  emit: jest.fn(),
  EventType: {
    SESSION_INVALID: 'session-invalid',
    SESSION_VALID: 'session-valid',
  },
}));

jest.mock('@/application/session/sign_in', () => ({
  afterAuth: jest.fn(),
}));

jest.mock('@/application/session/token', () => ({
  getTokenParsed: jest.fn(),
  saveGoTrueAuth: jest.fn(),
}));

jest.mock('../http_api', () => ({
  verifyToken: jest.fn(),
}));

const { initGrantService, signInWithPassword } = require('../gotrue') as typeof import('../gotrue');
const { verifyToken } = require('../http_api') as { verifyToken: jest.Mock };
const { saveGoTrueAuth } = require('@/application/session/token') as { saveGoTrueAuth: jest.Mock };
const { afterAuth } = require('@/application/session/sign_in') as { afterAuth: jest.Mock };

describe('password login session setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    initGrantService('http://localhost/gotrue');
  });

  it('removes an old session and persists a refreshed token before navigating', async () => {
    const loginToken = {
      access_token: 'login-access-token',
      expires_at: 123,
      refresh_token: 'login-refresh-token',
    };
    const refreshedToken = {
      access_token: 'refreshed-access-token',
      expires_at: 456,
      refresh_token: 'refreshed-refresh-token',
    };

    localStorage.setItem('token', 'old-session');
    mockGrantClient.post.mockResolvedValueOnce({ data: loginToken }).mockResolvedValueOnce({ data: refreshedToken });
    verifyToken.mockImplementationOnce(async () => {
      expect(localStorage.getItem('token')).toBeNull();
    });

    await signInWithPassword({ email: 'admin@example.com', password: 'password', redirectTo: '/app' });

    expect(verifyToken).toHaveBeenCalledWith(loginToken.access_token);
    expect(mockGrantClient.post).toHaveBeenNthCalledWith(2, '/token?grant_type=refresh_token', {
      refresh_token: loginToken.refresh_token,
    });
    expect(saveGoTrueAuth).toHaveBeenCalledWith(JSON.stringify(refreshedToken));
    expect(saveGoTrueAuth.mock.invocationCallOrder[0]).toBeLessThan(afterAuth.mock.invocationCallOrder[0]);
  });
});
