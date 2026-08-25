import { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from '@/application/types';
import { ReactComponent as Logo } from '@/assets/branding/folia-icon.svg';
import EmailLogin from '@/components/login/EmailLogin';
import LoginProvider from '@/components/login/LoginProvider';
import { AFConfigContext } from '@/components/main/app.hooks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getPlatform } from '@/utils/platform';

export function Login({ redirectTo }: { redirectTo: string }) {
  const { t } = useTranslation();
  const [availableProviders, setAvailableProviders] = useState<AuthProvider[]>([]);
  const service = useContext(AFConfigContext)?.service;

  // Fetch available auth providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providers = await service?.getAuthProviders();

        setAvailableProviders(providers || []);

      } catch (error) {
        console.error('Failed to fetch auth providers:', error);
        // On error, set empty array (no OAuth providers)
        setAvailableProviders([]);
      }
    };

    void fetchProviders();
  }, [service]);

  // Filter to check if there are any OAuth providers (not EMAIL or PASSWORD)
  const hasOAuthProviders = availableProviders.some(
    provider => ![AuthProvider.EMAIL, AuthProvider.PASSWORD, AuthProvider.MAGIC_LINK].includes(provider)
  );

  const isMobile = getPlatform().isMobile;

  return (
    <div
      style={{
        justifyContent: isMobile ? 'flex-start' : 'between',
      }}
      className={'flex  h-full flex-col items-center justify-between gap-5 px-4 py-10 text-text-primary'}
    >
      <div className={'flex w-full flex-1 flex-col items-center justify-center gap-5'}>
        <div
          onClick={() => {
            window.location.href = '/';
          }}
          className={'flex w-full cursor-pointer flex-col items-center justify-center gap-5'}
        >
          <Logo className={'h-9 w-9'} />
          <div className={'text-xl font-semibold'}>{t('welcomeTo')} Folia</div>
        </div>
        <EmailLogin redirectTo={redirectTo} />
        {hasOAuthProviders && (
          <div className={'flex w-full items-center justify-center gap-2 text-text-secondary'}>
            <Separator className={'flex-1'} />
            {t('web.or')}
            <Separator className={'flex-1'} />
          </div>
        )}
        <LoginProvider redirectTo={redirectTo} availableProviders={availableProviders} />
        <div className={'flex items-center gap-1 text-sm text-text-secondary'}>
          <span>{t('signIn.dontHaveAnAccount')}</span>
          <Button
            variant={'link'}
            onClick={() => {
              const encodedRedirect = encodeURIComponent(redirectTo);

              window.location.href = `/login?action=signUpPassword&redirectTo=${encodedRedirect}`;
            }}
            className={'px-0 text-text-secondary underline'}
            data-testid="login-create-account-button"
          >
            {t('signIn.createAccount')}
          </Button>
        </div>
      </div>

    </div>
  );
}

export default Login;
