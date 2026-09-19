import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { Field, type FieldProps } from '@looksave/ui-web';
import { LandingMotion, MotionControl } from '@/components/landing/LandingMotion';
import { PortalStage } from '@/components/landing/PortalStage';
import type { Locale } from '@/i18n/locale';

export function AuthShell({
  locale,
  mode,
  children,
}: {
  locale: Locale;
  mode: 'sign-in' | 'sign-up';
  children: ReactNode;
}) {
  return (
    <LandingMotion>
      <div className="auth-page">
        <div className="auth-topline">
          <Link to={`/${locale}`} className="auth-brand" aria-label="LookSave bosh sahifa">
            <img src="/img/logo-mark.png" alt="" width="44" height="44" />
            <span>
              Look<span>Save</span>
            </span>
          </Link>
          <Link to={`/${locale}`} className="auth-back">
            <ArrowLeft size={15} /> Bosh sahifa
          </Link>
        </div>
        <div className="auth-layout">
          <section className="auth-editorial" aria-label="LookSave">
            <p className="auth-eyebrow">
              <span /> DUBAY · TOSHKENT
            </p>
            <h2>
              Uslubingiz.
              <br />
              <span>Yangi o‘lchamda.</span>
            </h2>
            <p className="auth-editorial-copy">
              O‘zingizda ko‘ring. O‘zingizga mosini toping.
              <br />
              Moda endi sizdan boshlanadi.
            </p>
            <div className="auth-art">
              <PortalStage />
              <div className="auth-art-tag">
                <Sparkles size={16} /> Sizga mos olam <ArrowUpRight size={14} />
              </div>
              <MotionControl />
            </div>
            <div className="auth-editorial-bottom">
              <span>AI FASHION EXPERIENCE</span>
              <span>LOOKSAVE</span>
            </div>
          </section>
          <section className="auth-panel">
            <div className="auth-panel-icon">
              <ShieldCheck size={23} />
            </div>
            <p className="auth-eyebrow">
              {mode === 'sign-in' ? 'LOOKSAVE’GA XUSH KELIBSIZ' : 'YANGI USLUB. YANGI IMKONIYAT.'}
            </p>
            {children}
            <div className="auth-security">
              <ShieldCheck size={14} /> Shaxsiy hisob. Himoyalangan kirish.
            </div>
          </section>
        </div>
        <div className="auth-bottom">
          <span>© {new Date().getFullYear()} LookSave</span>
          <div>
            <Link to={`/${locale}/privacy`}>Maxfiylik</Link>
            <Link to={`/${locale}/terms`}>Foydalanish shartlari</Link>
          </div>
        </div>
      </div>
    </LandingMotion>
  );
}

export function PasswordField(props: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <Field {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="auth-password-toggle"
        aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
