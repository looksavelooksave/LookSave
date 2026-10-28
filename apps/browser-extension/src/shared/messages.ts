/**
 * Uch qism orasidagi xabarlar: popup ⇄ background ⇄ content script.
 *
 * ⚠️ HAMMA XABAR SHU YERDA E'LON QILINADI. Chrome xabarlari tipsiz
 * `unknown` bo'lib keladi — bitta joyda turmasa, qism nomini o'zgartirgan
 * odam ikkinchi tomonni buzganini bilmaydi.
 */

export interface DressJob {
  variantId: string;
  title: string;
  slot: string;
  done: boolean;
}

export type RunState = 'idle' | 'running' | 'paused' | 'stopped';

export interface RunStatus {
  state: RunState;
  /** Avtomatik rejim — navbatni o'zi oladi va ketma-ket bajaradi */
  auto: boolean;
  taskId: string | null;
  /** Hozir nima qilinyapti — avatar yasash yoki kiyim kiydirish */
  current: { title: string } | null;
  /** Navbatda qolgan ochiq ishlar */
  queued: number;
  /** Joriy ishdagi qadamlar (avatar + kiyimlar) */
  total: number;
  finished: number;
  failed: number;
  /** Oxirgi hodisalar — popupda ko'rinadi, eng yangisi boshida */
  log: string[];
}

/** popup → background */
export type PopupRequest =
  | { type: 'STATUS' }
  | { type: 'LOGIN'; phone: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'TASKS' }
  | { type: 'START'; taskId: string; adapter: AdapterId }
  /*
   * ⚠️ `SET_AUTO` — `START` NING TAKRORI EMAS. `START` bitta ishni
   * bajaradi va to'xtaydi; `SET_AUTO` esa rejimni YOQADI: kengaytma
   * navbatni o'zi kuzatadi, yangi ish tushsa hech kim bosmasdan boshlaydi.
   */
  | { type: 'SET_AUTO'; enabled: boolean; adapter: AdapterId }
  | { type: 'DIAGNOSE'; adapter: AdapterId }
  | { type: 'TEST_SEND'; adapter: AdapterId }
  | { type: 'STOP' };

/**
 * content script → background: «hozir shu qadamdaman».
 *
 * ⚠️ USIZ KIYINTIRISH QORA QUTI. Bitta qadam ikki daqiqagacha kutishi
 * mumkin (surat yuklash, javob yozilishi) va tashqaridan bu «qotib
 * qolgan» dan farq qilmaydi. Operator 0/1 va bo'sh jurnalni ko'rib,
 * kengaytma ishlamayapti deb o'ylaydi.
 */
export interface ProgressMessage {
  type: 'PROGRESS';
  text: string;
}

/** background → content script */
export type ContentRequest =
  /*
   * ⚠️ DIAGNOSTIKA — NAVBATGA UMUMAN TEGMAYDI. Uning yagona vazifasi:
   * operator o'z hisobidagi sahifada nima ishlayotganini KO'RSATISH.
   * Busiz har tuzatish ko'r-ko'rona taxmin bo'lardi — sayt tuzilishi
   * hisobga qarab ham farq qiladi va uni tashqaridan bilib bo'lmaydi.
   */
  | { type: 'DIAGNOSE' }
  /*
   * ⚠️ FAQAT YUBORISHNI SINAYDI. Surat ham, kiyintirish ham yo'q:
   * qisqa matn yoziladi va HAQIQATAN yuboriladi. Sababi — «yuborish»
   * yagona tasdiqlanmagan bo'g'in bo'lib qolgan edi, uni sinash uchun
   * esa har safar uch daqiqalik to'liq kiyintirishni kutish kerak edi.
   */
  | { type: 'TEST_SEND' }
  | { type: 'PING' }
  | {
      type: 'DRESS';
      prompt: string;
      /** Tartib MUHIM: avatar, kiyim, (ixtiyoriy) yuz */
      images: { name: string; mime: string; base64: string }[];
      timeoutMs: number;
    };

export type ContentResponse =
  | { ok: true; type: 'PONG'; adapter: AdapterId }
  | { ok: true; type: 'REPORT'; lines: string[] }
  | { ok: true; type: 'IMAGE'; mime: string; base64: string }
  /*
   * ⚠️ IKKINCHI YO'L — CORS UCHUN. AI sayti natijani ba'zan boshqa
   * domendagi (`*.oaiusercontent.com`) manzilda beradi va content script
   * uni o'qiy olmaydi. Shunda faqat havola qaytariladi va suratni worker
   * oladi — unda `host_permissions` bor.
   */
  | { ok: true; type: 'IMAGE_URL'; url: string }
  | { ok: false; error: string };

export type AdapterId = 'chatgpt' | 'gemini';

export const ADAPTER_URL: Record<AdapterId, string> = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
};

export const ADAPTER_MATCH: Record<AdapterId, string[]> = {
  chatgpt: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  gemini: ['https://gemini.google.com/*'],
};
