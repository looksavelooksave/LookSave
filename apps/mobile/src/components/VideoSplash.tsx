import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';

/**
 * Ilova ochilgandagi brend videosi (`assets/splash-intro.mp4`, 3.9 s,
 * 640×640, ovozsiz): krossovka va galstuk "LS" belgisiga yig'ilib, ostidan
 * "LOOK SAVE" yozuvi chiqadi.
 *
 * ⚠️ FON SOF QORA (#000), `colors.bg` EMAS. Videoning o'z foni #000 —
 * #0A0A0F ustida kvadrat chegarasi ko'rinib qolardi. Native splash foni ham
 * shu sababdan #000 (`app.json` §splash). Ilovaga o'tish erish bilan, ya'ni
 * rang farqi sezilmaydi.
 *
 * ⚠️ NATIVE MODUL. `expo-video` yangi build talab qiladi. Bu komponent
 * faqat modul mavjud bo'lganda yuklanadi (`_layout.tsx`), aks holda eski
 * `AnimatedSplash` ishlaydi — OTA update eski build'ga tushsa ilova
 * yiqilmaydi.
 *
 * Chiqish sharti: video OXIRIGACHA ko'rsatildi VA ilova tayyor. Ilova kech
 * tayyorlansa oxirgi kadr (logotip) ushlab turiladi. Video umuman
 * ochilmasa (`error` yoki qotish), `STALL_MS` dan keyin kutilmaydi.
 */

const SOURCE = require('../../assets/splash-intro.mp4') as number;

/** Video shu vaqtgacha birinchi kadrni bermasa — usiz davom etamiz */
const STALL_MS = 2500;
/** Video oxirgi kadrga yetmasa ham shundan ortiq kutilmaydi (3.9 s + zaxira) */
const MAX_PLAY_MS = 6000;

type Props = {
  /** Ilova (shrift + sessiya tiklash) tayyormi */
  appReady: boolean;
  /** Chiqish tugadi, qatlamni olib tashlash mumkin */
  onFinish: () => void;
};

function hideNativeSplash(): void {
  void SplashScreen.hideAsync().catch(() => {
    // Allaqachon yashiringan bo'lishi mumkin — bu xato emas
  });
}

export function VideoSplash({ appReady, onFinish }: Props): JSX.Element {
  const { width, height } = useWindowDimensions();
  // Kvadrat video — qisqa tomonga sig'adi, planshetda haddan oshmaydi
  const size = Math.min(width, height, 520);

  const [videoDone, setVideoDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(SOURCE, (p) => {
    p.muted = true;
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    let started = false;

    const stall = setTimeout(() => {
      if (started) return;
      hideNativeSplash();
      setVideoDone(true);
    }, STALL_MS);
    const cap = setTimeout(() => setVideoDone(true), MAX_PLAY_MS);

    const status = player.addListener('statusChange', ({ status: next }) => {
      if (next === 'readyToPlay' && !started) {
        started = true;
        // Birinchi kadr tayyor — endi native splashni olib tashlash mumkin,
        // oradagi bo'sh qora kadr ko'rinmaydi
        hideNativeSplash();
      } else if (next === 'error') {
        hideNativeSplash();
        setVideoDone(true);
      }
    });
    const ended = player.addListener('playToEnd', () => setVideoDone(true));

    return () => {
      clearTimeout(stall);
      clearTimeout(cap);
      status.remove();
      ended.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!videoDone || !appReady) return;
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: 450,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => fade.stop();
  }, [appReady, onFinish, opacity, videoDone]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
      <VideoView
        player={player}
        style={{ width: size, height: size }}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    // Ilova ustida turishi shart
    zIndex: 10,
  },
});
