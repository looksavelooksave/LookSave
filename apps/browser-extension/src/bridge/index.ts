import type { PopupRequest } from '../shared/messages';

/**
 * Panel ↔ kengaytma ko'prigi.
 *
 * Bu content script FAQAT bizning panel sahifasida ishlaydi va sahifaga
 * kengaytma bilan gaplashish imkonini beradi — operator kiyintirishni
 * popupdan emas, panelning o'zidan boshlaydi.
 *
 * ⚠️ NEGA `externally_connectable` EMAS. U rasmiyroq yo'l, lekin sahifa
 * kengaytmaning ID'sini BILISHI shart. `Load unpacked` da ID papka
 * yo'lidan hosil bo'ladi va har operatorda boshqacha chiqadi — ya'ni
 * panelni har kishi uchun qaytadan yig'ish kerak bo'lardi. Ko'prik esa
 * ID'ni umuman talab qilmaydi.
 *
 * ⚠️ FAQAT UCHTA BUYRUQ O'TADI. Kirish (`LOGIN`) ataylab yo'q: parol
 * popupda qoladi va sahifadagi hech qanday skript unga tegmaydi.
 */

const ALLOWED = new Set<PopupRequest['type']>(['STATUS', 'START', 'STOP']);

interface PanelMessage {
  source?: string;
  id?: string;
  request?: PopupRequest;
}

function reply(id: string, payload: unknown): void {
  window.postMessage({ source: 'looksave-extension', id, payload }, location.origin);
}

window.addEventListener('message', (event: MessageEvent<PanelMessage>) => {
  /*
   * ⚠️ IKKALA TEKSHIRUV HAM KERAK. `origin` — xabar bizning
   * sahifamizdan kelganini, `source` — uni sahifaning o'zi yuborganini
   * bildiradi. Ikkinchisisiz ichma-ich qo'yilgan begona iframe ham
   * kiyintirishni boshlata olardi.
   */
  if (event.origin !== location.origin || event.source !== window) return;

  const message = event.data;
  if (message?.source !== 'looksave-panel' || !message.request || !message.id) return;
  if (!ALLOWED.has(message.request.type)) return;

  const id = message.id;

  void chrome.runtime
    .sendMessage(message.request)
    .then((response) => reply(id, response))
    .catch((error: unknown) => {
      reply(id, { error: error instanceof Error ? error.message : 'Kengaytma javob bermadi' });
    });
});

/**
 * Borligini e'lon qiladi.
 *
 * ⚠️ SAHIFA KENGAYTMANI BOSHQA YO'L BILAN KO'RA OLMAYDI. Xabar yuborib
 * javob kutish ham mumkin edi, lekin kengaytma o'rnatilmagan bo'lsa javob
 * UMUMAN kelmaydi — panel esa har safar taymaut kutib o'tirardi. Belgi
 * esa darhol ko'rinadi.
 */
document.documentElement.dataset['looksaveExtension'] = '1';
