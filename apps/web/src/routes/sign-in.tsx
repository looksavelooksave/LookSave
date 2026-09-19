import { Form, Link, data, redirect, useNavigation } from 'react-router';

import { AuthShell, PasswordField } from '@/components/auth/AuthShell';
import authStyles from '@/components/auth/auth.css?url';
import landingStyles from '@/components/landing/landing.css?url';

import { Button, Field } from '@looksave/ui-web';

import { login } from '@/api/endpoints';
import { isLocale, type Locale } from '@/i18n/locale';
import { auth, guest, startSession } from '@/session.server';

import type { Route } from './+types/sign-in';

/**
 * Kirish — docs/15-sayt-dizayn.md §4.11.
 *
 * ⚠️ TOKEN JAVOBDA QAYTMAYDI. `action` serverda ishlaydi, tokenni
 * `httpOnly` cookie'ga soladi va brauzerga faqat yo'naltirish yuboradi.
 * JavaScript tokenni umuman ko'rmaydi (13-sayt.md §9).
 */

export const handle = { standalone: true };
export function links() {
  return [
    { rel: 'stylesheet', href: landingStyles },
    { rel: 'stylesheet', href: authStyles },
  ];
}

export function meta(): Route.MetaDescriptors {
  return [{ title: 'Kirish — LookSave' }, { name: 'robots', content: 'noindex' }];
}

/** Kirgan odam kirish sahifasini ko'rmasligi kerak */
export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const context = await auth(request, locale);
  const next = new URL(request.url).searchParams.get('next');

  if (context.user) throw redirect(next ?? `/${locale}`);

  return { locale: locale as Locale, next };
}

export async function action({ params, request }: Route.ActionArgs) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const form = await request.formData();

  const phone = String(form.get('phone') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '') || `/${locale}`;

  if (!phone || !password) {
    return data({ error: 'Telefon va parolni kiriting' }, { status: 400 });
  }

  try {
    const result = await login(phone, password, guest(request, locale));
    const cookie = await startSession(request, result);

    return redirect(next, { headers: { 'Set-Cookie': cookie } });
  } catch (error) {
    /*
     * Xato matni serverdan keladi («telefon yoki parol noto'g'ri»).
     * Umumiy «xatolik yuz berdi» odamni nima qilishni bilmay qoldiradi.
     */
    return data(
      { error: error instanceof Error ? error.message : "Kirib bo'lmadi" },
      { status: 400 },
    );
  }
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps): JSX.Element {
  const { locale, next } = loaderData;
  const navigation = useNavigation();

  return (
    <AuthShell locale={locale} mode="sign-in">
      <h1 className="auth-title">Kirish</h1>
      <p className="auth-description">
        Yana ko‘rishganimizdan xursandmiz. Shaxsiy uslubingiz sari davom eting.
      </p>

      <Form method="post" className="auth-form">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field
          name="phone"
          label="Telefon"
          type="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          required
        />

        <PasswordField
          name="password"
          label="Parol"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />

        <Button
          type="submit"
          className="auth-submit w-full"
          loading={navigation.state === 'submitting'}
        >
          Kirish
        </Button>

        {actionData?.error ? (
          <p role="alert" className="auth-error">
            {actionData.error}
          </p>
        ) : null}
      </Form>

      <p className="auth-switch">
        Hisobingiz yo'qmi?{' '}
        <Link to={`/${locale}/sign-up`} className="text-brand hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </AuthShell>
  );
}
