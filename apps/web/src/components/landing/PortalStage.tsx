import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLandingMotion } from './LandingMotion';

const PortalCanvas = lazy(() => import('./PortalCanvas'));
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The CSS portal remains visible when WebGL is unavailable or its chunk fails. */
export function PortalStage(): JSX.Element {
  const { paused } = useLandingMotion();
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: '80px' },
    );
    observer.observe(element);
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      setSupported(!!gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setSupported(false);
    }
    const update = () => setForeground(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <div ref={host} className="landing-portal-stage" aria-hidden="true">
      <div className="landing-portal-fallback">
        <i />
        <i />
        <span />
      </div>
      {supported && (
        <StageBoundary>
          <Suspense fallback={null}>
            <PortalCanvas active={visible && foreground && !paused} />
          </Suspense>
        </StageBoundary>
      )}
      <div className="landing-stage-mist" />
    </div>
  );
}
