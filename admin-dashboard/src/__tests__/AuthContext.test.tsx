import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';

const mockMe = vi.fn();
const mockLoginApi = vi.fn();
const mockRegisterApi = vi.fn();

vi.mock('../api/auth', () => ({
  authApi: {
    me: () => mockMe(),
    login: (data: any) => mockLoginApi(data),
    register: (data: any) => mockRegisterApi(data),
  },
}));

function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : 'no-user'}</span>
      <span data-testid="auth">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{auth.loading ? 'loading' : 'done'}</span>
      <button onClick={() => auth.login('9999999999', 'pass')}>Login</button>
      <button onClick={() => auth.register({ name: 'Test', phone: '9999999999', password: 'pass' })}>Register</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows loading initially when token exists', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    mockMe.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading').textContent).toBe('loading');
    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('loads user from me() when token exists', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    mockMe.mockResolvedValue({ data: { id: '1', name: 'Test User', phone: '9999999999', role: 'OWNER' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Test User');
      expect(screen.getByTestId('auth').textContent).toBe('yes');
      expect(screen.getByTestId('loading').textContent).toBe('done');
    });
  });

  it('clears token on me() failure', async () => {
    localStorage.setItem('accessToken', 'bad-token');
    localStorage.setItem('refreshToken', 'bad-refresh');
    mockMe.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  it('shows done loading when no token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
    });
  });

  it('login updates user and stores tokens', async () => {
    mockLoginApi.mockResolvedValue({
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: { id: '2', name: 'New User', phone: '8888888888', role: 'OWNER' },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));

    await act(async () => {
      fireEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('New User');
      expect(screen.getByTestId('auth').textContent).toBe('yes');
      expect(localStorage.getItem('accessToken')).toBe('new-access');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    });
  });

  it('register updates user and stores tokens', async () => {
    mockRegisterApi.mockResolvedValue({
      data: {
        accessToken: 'reg-access',
        refreshToken: 'reg-refresh',
        user: { id: '3', name: 'Reg User', phone: '7777777777', role: 'OWNER' },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));

    await act(async () => {
      fireEvent.click(screen.getByText('Register'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Reg User');
      expect(localStorage.getItem('accessToken')).toBe('reg-access');
      expect(localStorage.getItem('refreshToken')).toBe('reg-refresh');
    });
  });

  it('logout clears user and tokens', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    mockMe.mockResolvedValue({ data: { id: '1', name: 'Test', phone: '9999999999', role: 'OWNER' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('useAuth throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });
});
