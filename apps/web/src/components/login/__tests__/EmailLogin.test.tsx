import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AFService } from '@/application/services/services.type';
import EmailLogin from '@/components/login/EmailLogin';
import { AFConfigContext } from '@/components/main/app.hooks';

function renderLogin(service: Pick<AFService, 'signInWithPassword' | 'signInMagicLink'>) {
  return render(
    <AFConfigContext.Provider
      value={{
        service: service as AFService,
        isAuthenticated: false,
        updateCurrentUser: jest.fn(),
        openLoginModal: jest.fn(),
      }}
    >
      <MemoryRouter initialEntries={['/login?redirectTo=%2Fapp']}>
        <EmailLogin redirectTo='/app' />
      </MemoryRouter>
    </AFConfigContext.Provider>
  );
}

describe('EmailLogin', () => {
  it('shows email and password together and uses password login as the primary action', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue(undefined);

    renderLogin({ signInWithPassword, signInMagicLink: jest.fn() });

    fireEvent.change(screen.getByTestId('login-email-input'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByTestId('login-password-button'));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
        redirectTo: '/app',
      })
    );
  });

  it('keeps email-code login as the secondary action', async () => {
    const signInMagicLink = jest.fn().mockResolvedValue(undefined);

    renderLogin({ signInWithPassword: jest.fn(), signInMagicLink });

    fireEvent.change(screen.getByTestId('login-email-input'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByTestId('login-magic-link-button'));

    await waitFor(() =>
      expect(signInMagicLink).toHaveBeenCalledWith({
        email: 'user@example.com',
        redirectTo: '/app',
      })
    );
  });
});
