import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from './Login';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/**
 * fetch stub routed by URL: /auth/me is anonymous (401); /auth/login returns
 * an HR account — used to exercise the wrong-tab warning.
 */
const stubFetch = () =>
  vi.fn((url, options = {}) => {
    if (url.endsWith('/auth/me')) {
      return Promise.resolve(jsonResponse(401, { error: 'Authentication required' }));
    }
    if (url.endsWith('/auth/login') && options.method === 'POST') {
      return Promise.resolve(
        jsonResponse(200, {
          user: { id: 1, name: 'HR Admin', email: 'admin@test.com', role: 'HR', onboarded: true },
        })
      );
    }
    if (url.endsWith('/auth/logout')) {
      return Promise.resolve(jsonResponse(200, { message: 'Logged out' }));
    }
    return Promise.resolve(jsonResponse(404, { error: 'not found' }));
  });

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', stubFetch());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows inline validation errors instead of submitting an empty form', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: /log in as candidate/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    // Only the initial /auth/me call — no login request was sent.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid email before hitting the API', async () => {
    renderLogin();
    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'Whatever1');
    await userEvent.click(screen.getByRole('button', { name: /log in as candidate/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('warns when logging into an HR account from the Candidate tab', async () => {
    renderLogin();
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@test.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@1234');
    await userEvent.click(screen.getByRole('button', { name: /log in as candidate/i }));

    expect(await screen.findByText(/registered as a HR \/ Recruiter account/i)).toBeInTheDocument();
  });
});
