import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';

const MotionContext = createContext({ paused: true, reduced: true, toggle: () => {} });
export const useLandingMotion = () => useContext(MotionContext);

/** One motion preference owns CSS, pointer depth and the decorative WebGL stage. */
export function LandingMotion({ children }: { children: ReactNode }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const blocks = node.querySelectorAll<HTMLElement>('section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.target.toggleAttribute('data-in-view', entry.isIntersecting),
        );
      },
      { rootMargin: '100px' },
    );
    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (paused || reduced) {
      node.style.setProperty('--landing-scroll', '0px');
      node.querySelectorAll<HTMLElement>('[data-landing-depth]').forEach((card) => {
        card.style.setProperty('--depth-x', '0deg');
        card.style.setProperty('--depth-y', '0deg');
      });
      return;
    }
    let frame = 0;
    let current: HTMLElement | null = null;
    const reset = () => {
      current?.style.setProperty('--depth-x', '0deg');
      current?.style.setProperty('--depth-y', '0deg');
      current = null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const card = (event.target as Element).closest<HTMLElement>('[data-landing-depth]');
      if (current !== card) reset();
      if (!card || !node.contains(card)) return;
      current = card;
      const bounds = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.setProperty('--depth-x', `${(0.5 - y) * 8}deg`);
        card.style.setProperty('--depth-y', `${(x - 0.5) * 8}deg`);
        card.style.setProperty('--light-x', `${x * 100}%`);
        card.style.setProperty('--light-y', `${y * 100}%`);
      });
    };
    let scrollFrame = 0;
    const scroll = () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() =>
        node.style.setProperty('--landing-scroll', `${Math.min(8, window.scrollY * 0.012)}px`),
      );
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', reset);
    window.addEventListener('scroll', scroll, { passive: true });
    scroll();
    return () => {
      reset();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', reset);
      window.removeEventListener('scroll', scroll);
    };
  }, [paused, reduced]);

  return (
    <MotionContext.Provider
      value={{ paused: paused || reduced, reduced, toggle: () => setPaused((value) => !value) }}
    >
      <div ref={root} className="landing-experience" data-motion-paused={paused || reduced}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function MotionControl(): JSX.Element {
  const { paused, reduced, toggle } = useLandingMotion();
  return (
    <button
      type="button"
      className="landing-motion-control"
      onClick={toggle}
      disabled={reduced}
      aria-label={
        reduced
          ? 'Qurilma sozlamasiga ko‘ra animatsiya o‘chirilgan'
          : paused
            ? 'Animatsiyani yoqish'
            : 'Animatsiyani to‘xtatish'
      }
      aria-pressed={paused}
    >
      {paused ? <Play size={14} /> : <Pause size={14} />}
      <span>{paused ? 'Animatsiya o‘chiq' : 'Animatsiya'}</span>
    </button>
  );
}
