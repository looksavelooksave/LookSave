import { useCallback, useEffect, useRef, useState } from 'react';

import type { Task } from '../api/tasks';

/**
 * Yangi so'rov kelganda ovoz + brauzer bildirishnomasi.
 *
 * ⚠️ IKKALASI HAM FOYDALANUVCHI RUXSATINI TALAB QILADI. Brauzer ovozni
 * va Notification'ni faqat foydalanuvchi biror tugmani bosgach yoqadi
 * (autoplay siyosati). Shuning uchun operator bir marta «qo'ng'iroq»ni
 * yoqadi — o'sha bosish AudioContext'ni ochadi va ruxsat so'raydi.
 *
 * ⚠️ BIRINCHI YUKLASHDA JIMLIK. Sahifa ochilganda navbatda turgan eski
 * ishlar uchun signal berilmaydi — aks holda har yangilanishда o'nlab
 * signal chiqardi. Faqat KEYIN kelgan yangi id'lar uchun signal beriladi.
 */

const LS_KEY = 'looksave.developer-ai.alerts';

type Perm = NotificationPermission | 'unsupported';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Qisqa «ding-ding» — WebAudio bilan, tashqi fayl kerak emas. */
function ding(ctx: AudioContext): void {
  const at = ctx.currentTime;
  for (const [i, freq] of [880, 1320].entries()) {
    const t = at + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.start(t);
    osc.stop(t + 0.18);
  }
}

export function useTaskAlerts(pendingTasks: Task[]): {
  enabled: boolean;
  permission: Perm;
  toggle: () => void;
} {
  const [enabled, setEnabled] = useState<boolean>(readEnabled);
  const [permission, setPermission] = useState<Perm>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const ctxRef = useRef<AudioContext | null>(null);
  const knownIds = useRef<Set<string> | null>(null); // null = hali «primed» emas
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const toggle = useCallback((): void => {
    const next = !enabledRef.current;
    setEnabled(next);
    try {
      localStorage.setItem(LS_KEY, next ? '1' : '0');
    } catch {
      /* maxfiy rejimda localStorage yo'q — muhim emas */
    }
    if (!next) return;

    // ── Yoqilgan payt: bu foydalanuvchi bosishi — ovoz va ruxsatni ochamiz ──
    try {
      type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
      if (Ctor) {
        ctxRef.current ??= new Ctor();
        void ctxRef.current.resume();
        ding(ctxRef.current); // sinov signali — ishlayotganini bildiradi
      }
    } catch {
      /* ovoz yo'q — bildirishnoma baribir ishlaydi */
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().then(setPermission);
    }
  }, []);

  useEffect(() => {
    const ids = pendingTasks.map((task) => task.id);

    // Birinchi marta — mavjudlarni eslab qolamiz, signal bermaymiz
    if (knownIds.current === null) {
      knownIds.current = new Set(ids);
      return;
    }

    const fresh = ids.filter((id) => !knownIds.current!.has(id));
    for (const id of ids) knownIds.current.add(id);
    // Yopilgan/olib ketilganlarni to'plamdan tozalab turamiz
    for (const id of [...knownIds.current]) {
      if (!ids.includes(id)) knownIds.current.delete(id);
    }

    if (fresh.length === 0 || !enabledRef.current) return;

    if (ctxRef.current) {
      void ctxRef.current.resume().then(() => ding(ctxRef.current!));
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const body =
        fresh.length === 1 ? `Avatar #${fresh[0]!.slice(0, 8)}` : `${fresh.length} ta yangi so'rov`;
      const note = new Notification('Yangi so`rov — LookSave', { body, tag: 'looksave-queue' });
      note.onclick = (): void => {
        window.focus();
        note.close();
      };
    }
  }, [pendingTasks]);

  return { enabled, permission, toggle };
}
