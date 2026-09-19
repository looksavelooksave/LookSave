import { Link } from 'react-router';
import { Button, Icon, type IconName } from '@looksave/ui-web';
import { Reveal } from '@/components/Reveal';
import { MotionControl } from '@/components/landing/LandingMotion';
import { PortalStage } from '@/components/landing/PortalStage';
import type { Locale } from '@/i18n/locale';

const STATS: Array<{ value: string; label: string; icon: IconName }> = [
  { value: '1 000+', label: 'Premium mahsulotlar', icon: 'premium' },
  { value: '360°', label: "3D ko'rish va aylantirish", icon: 'rotate' },
  { value: '100%', label: 'Xavfsiz va ishonchli', icon: 'authentic' },
];

export function Hero({ locale }: { locale: Locale }): JSX.Element {
  return (
    <section id="top" className="landing-hero relative isolate overflow-hidden">
      <div className="shell-wide landing-hero-layout">
        <div className="landing-hero-copy">
          <Reveal>
            <p className="landing-location">
              <span />
              AI fashion marketplace · Dubay va Toshkent
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="landing-hero-title">
              Ko'ring.
              <br />
              Kiying. <span className="headline-accent">Oling.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="landing-hero-description">
              Bitta surat — shaxsiy avataringiz. Kiyimni unda 3D da kiyib ko'ring, aylantiring, o'z
              o'lchovingizga solishtiring.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="landing-hero-actions">
              <Button asChild className="shadow-glow">
                <Link to={`/${locale}/catalog`}>
                  Katalogni ochish <Icon name="openOut" size={17} />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to={`/${locale}/try-on`}>
                  <Icon name="profile" size={18} />
                  Kiyib ko'rish
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
        <div className="landing-hero-visual">
          <PortalStage />
          <div className="landing-floating-label landing-floating-label-top">
            <Icon name="logo" size={15} />
            <span>Shaxsiy 3D avatar</span>
            <i />
          </div>
          <div className="landing-floating-label landing-floating-label-bottom">
            <span className="landing-label-icon">
              <Icon name="rotate" size={22} />
            </span>
            <div>
              <strong>Yangi o'lchamda</strong>
              <small>Ko'ring. Kiying. Oling.</small>
            </div>
            <Icon name="authentic" size={16} />
          </div>
          <MotionControl />
        </div>
        <Reveal delay={320} className="landing-stats-wrap">
          <dl className="landing-stats edge-beam" data-landing-depth>
            {STATS.map((stat) => (
              <div key={stat.value}>
                <span className="landing-stat-icon">
                  <Icon name={stat.icon} size={22} />
                </span>
                <div>
                  <dt>{stat.value}</dt>
                  <dd>{stat.label}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
