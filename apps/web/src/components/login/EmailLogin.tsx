import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import isEmail from 'validator/lib/isEmail';

import { LOGIN_ACTION } from '@/components/login/const';
import { AFConfigContext } from '@/components/main/app.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createHotkey, HOT_KEY_NAME } from '@/utils/hotkeys';

function EmailLogin({ redirectTo }: { redirectTo: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'password' | 'code' | null>(null);
  const [error, setError] = useState<string>('');
  const [, setSearch] = useSearchParams();
  const service = useContext(AFConfigContext)?.service;
  const handleSubmitEmail = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    if (loadingAction) return;
    const isValidEmail = isEmail(email);

    if (!isValidEmail) {
      setError(t('signIn.invalidEmail'));
      return;
    }

    setError('');
    setLoadingAction('code');

    try {
      await service?.signInMagicLink({ email, redirectTo });
      setSearch((prev) => {
        const next = new URLSearchParams(prev);

        next.set('email', email);
        next.set('action', LOGIN_ACTION.CHECK_EMAIL);
        return next;
      });
      // eslint-disable-next-line
    } catch (e: any) {
      if (e.code === 429 || e.response?.status === 429) {
        toast.error(t('tooManyRequests'));
      } else {
        toast.error(e.message);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSubmitPassword = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (loadingAction) return;

    const isValidEmail = isEmail(email);

    if (!isValidEmail) {
      setError(t('signIn.invalidEmail'));
      return;
    }

    if (!password) {
      setError(t('signIn.enterPassword'));
      return;
    }

    if (!service) return;

    setError('');
    setLoadingAction('password');
    try {
      await service.signInWithPassword({ email, password, redirectTo });
      // eslint-disable-next-line
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleForgotPassword = () => {
    if (!isEmail(email)) {
      setError(t('signIn.invalidEmail'));
      return;
    }

    setSearch((prev) => {
      const next = new URLSearchParams(prev);

      next.set('email', email);
      next.set('action', LOGIN_ACTION.RESET_PASSWORD);
      return next;
    });
  };

  return (
    <div className={'flex w-full flex-col items-center justify-center gap-3'}>
      <div className={'flex flex-col gap-1'}>
        <Input
          data-testid="login-email-input"
          autoFocus
          size={'md'}
          variant={error ? 'destructive' : 'default'}
          type={'email'}
          className={'w-[320px]'}
          onChange={(e) => {
            setError('');
            setEmail(e.target.value);
          }}
          value={email}
          placeholder={t('signIn.pleaseInputYourEmail')}
          disabled={Boolean(loadingAction)}
          onKeyDown={(e) => {
            if (createHotkey(HOT_KEY_NAME.ENTER)(e.nativeEvent)) {
              void handleSubmitPassword(e);
            }
          }}
        />
      </div>
      <div className='flex w-[320px] flex-col gap-1'>
        <PasswordInput
          data-testid='login-password-input'
          size='md'
          className='w-full'
          value={password}
          placeholder={t('signIn.passwordHint')}
          variant={error ? 'destructive' : 'default'}
          disabled={Boolean(loadingAction)}
          onChange={(e) => {
            setError('');
            setPassword(e.target.value);
          }}
          onKeyDown={(e) => {
            if (createHotkey(HOT_KEY_NAME.ENTER)(e.nativeEvent)) {
              void handleSubmitPassword(e);
            }
          }}
        />
        {error && <div className={cn('help-text text-xs text-text-error')}>{error}</div>}
        <Button variant='link' onClick={handleForgotPassword} className='h-auto w-fit px-0 py-1 text-sm'>
          {t('signIn.forgotPassword')}
        </Button>
      </div>

      <Button
        data-testid='login-password-button'
        onClick={handleSubmitPassword}
        size='lg'
        className='w-[320px]'
        loading={loadingAction === 'password'}
        disabled={loadingAction === 'code'}
      >
        {loadingAction === 'password' ? (
          <>
            <Progress />
            {t('signIn.signingInText')}
          </>
        ) : (
          t('signIn.loginButtonText')
        )}
      </Button>
      <Button
        data-testid='login-magic-link-button'
        variant='outline'
        onClick={handleSubmitEmail}
        size='lg'
        className='w-[320px]'
        loading={loadingAction === 'code'}
        disabled={loadingAction === 'password'}
      >
        {loadingAction === 'code' ? (
          <>
            <Progress />
            {t('loading')}
          </>
        ) : (
          t('signIn.signInWithEmail')
        )}
      </Button>
    </div>
  );
}

export default EmailLogin;
