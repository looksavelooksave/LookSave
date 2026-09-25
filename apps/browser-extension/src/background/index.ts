import type { PopupRequest, ProgressMessage } from '../shared/messages';
import { clearSession, hasSession, listTasks, login } from './api';
import { getStatus, note, runDiagnose, runTestSend, setAuto, start, stop, tick } from './queue';

/**
 * Service worker — popup bilan navbat orasidagi yagona eshik.
 *
 * ⚠️ NAVBAT SHU YERDA TURADI, POPUPDA EMAS. Popup har yopilganda
 * butunlay o'chadi: mantiq unda bo'lsa, operator oynani yopishi bilan
 * kiyintirish o'rtada uzilardi.
 */

const AUTO_ALARM = 'looksave-auto';

async function handle(request: PopupRequest): Promise<unknown> {
  switch (request.type) {
    case 'STATUS':
      return { status: getStatus(), authed: await hasSession() };

    case 'LOGIN':
      await login(request.phone, request.password);
      return { authed: true };

    case 'LOGOUT':
      await clearSession();
      return { authed: false };

    case 'TASKS':
      return { tasks: await listTasks('open') };

    case 'START': {
      /*
       * ⚠️ TEKSHIRUV SHU YERDA, `start()` NING ICHIDA EMAS. Quyida
       * natija `await` qilinmaydi — ya'ni `start()` tashlagan xato
       * `catch` ga tushib jim yo'qolardi va popup ikkinchi bosishda ham
       * «boshlandi» deb ko'rsatardi.
       */
      if (getStatus().state === 'running') throw new Error('Navbat allaqachon ishlayapti');

      /*
       * ⚠️ `await` QILINMAYDI — VA BU ATAYLAB. Navbat soatlab ishlaydi;
       * kutilsa popup shuncha vaqt javob olmasdi va Chrome xabar
       * kanalini yopib yuborardi. Holat `STATUS` orqali so'raladi.
       */
      void start(request.taskId, request.adapter).catch(() => undefined);
      return { started: true };
    }

    case 'SET_AUTO':
      await setAuto(request.enabled, request.adapter);
      return { auto: request.enabled };

    case 'DIAGNOSE':
      await runDiagnose(request.adapter);
      return { diagnosed: true };

    case 'TEST_SEND':
      await runTestSend(request.adapter);
      return { tested: true };

    case 'STOP':
      stop();
      return { stopped: true };

    default:
      return { error: 'Noma`lum so`rov' };
  }
}

/**
 * Sahifadan kelgan buyruqlar uchun tor ro'yxat.
 *
 * ⚠️ KO'PRIKDA FILTR BOR, LEKIN U YETARLI EMAS. Ko'prik ham content
 * script, ya'ni sahifaning o'zi emas — lekin u FAQAT o'zi biladigan
 * xabarlarni to'sadi. Haqiqiy chegara shu yerda: `sender.tab` bo'lsa
 * xabar sahifadan kelgan va `LOGIN` kabi buyruqlar unga ochilmaydi.
 */
const FROM_PAGE = new Set<PopupRequest['type']>([
  'STATUS',
  'START',
  'STOP',
  'SET_AUTO',
  'DIAGNOSE',
  'TEST_SEND',
]);

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const request = message as PopupRequest | ProgressMessage;

  /*
   * ⚠️ PROGRESS FILTRDAN OLDIN. U AI sahifasidagi content script'dan
   * keladi, ya'ni `sender.tab` bor — quyidagi tekshiruv uni rad
   * etardi va kiyintirish yana jim qora quti bo'lib qolardi.
   */
  if (request.type === 'PROGRESS') {
    note(`· ${request.text}`);
    respond({ ok: true });
    return true;
  }

  if (sender.tab && !FROM_PAGE.has(request.type)) {
    respond({ error: 'Bu buyruq sahifadan ishlatilmaydi' });
    return true;
  }

  handle(request)
    .then(respond)
    .catch((error: unknown) => {
      respond({ error: error instanceof Error ? error.message : 'Xatolik' });
    });

  return true;
});

/**
 * Alarmlar.
 *
 * ⚠️ IKKI XIL VAZIFA, BITTA TINGLOVCHI. `looksave-keepalive` ning ishi
 * yo'q — uyg'otishning o'zi yetarli (`queue.ts` ga qarang).
 * `looksave-auto` esa avtomatik rejimni TIKLAYDI: worker o'chirilib
 * qayta ko'tarilganda halqa o'zidan-o'zi qaytmasdi va operator ertalab
 * hech narsa qilinmaganini ko'rardi.
 */
chrome.alarms.create(AUTO_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_ALARM) void tick();
});

/* O'rnatilgandan/brauzer ochilgandan keyin darhol — alarmni kutmasdan. */
void tick();
