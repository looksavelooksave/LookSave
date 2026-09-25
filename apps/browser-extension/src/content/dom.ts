/**
 * Sahifa bilan ishlashning umumiy qismi — ikkala adapter ham shuni ishlatadi.
 *
 * ⚠️ BU FAYL «BEGONA SAHIFA» BILAN GAPLASHADI. Sayt bizniki emas: uning
 * DOM'i istalgan yangilanishda o'zgaradi. Shuning uchun har funksiya
 * MUVAFFAQIYATSIZLIKNI OCHIQ AYTADI — jim `false` qaytarish o'rniga xato
 * tashlaydi. Aks holda kengaytma «ishladim» deb, aslida bo'sh xabar
 * yuborgan bo'lardi va operator buni faqat mijozning shikoyatidan bilardi.
 */

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shart bajarilguncha kutadi. Bajarilmasa — sababi bilan xato. */
export async function waitFor<T>(
  probe: () => T | null | undefined | false,
  options: { timeoutMs: number; what: string; intervalMs?: number },
): Promise<T> {
  const deadline = Date.now() + options.timeoutMs;
  const interval = options.intervalMs ?? 300;

  for (;;) {
    const value = probe();
    if (value) return value;

    if (Date.now() > deadline) {
      throw new Error(`${options.what} — kutish vaqti tugadi (${options.timeoutMs / 1000}s)`);
    }

    await sleep(interval);
  }
}

/**
 * Ko'rinadigan element bormi.
 *
 * ⚠️ SAHIFADA BIR NECHTA MATN MAYDONI BO'LADI. ChatGPT bir vaqtda ham
 * keng oyna, ham tor oyna uchun qurilma chizadi va ULARNING BIRI
 * YASHIRIN turadi (CSS bilan). Yashiriniga yozilsa hammasi «ishlagandek»
 * ko'rinadi — surat biriktiriladi, matn yoziladi, tugma bosiladi — lekin
 * ekranda hech narsa o'zgarmaydi va xabar yuborilmaydi.
 *
 * 2026-09-23 da aynan shu bo'lgan: jurnalda «yuborildi» yozilgan,
 * ChatGPT esa bo'sh turgan.
 */
function visible(element: Element): boolean {
  const box = element.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return false;

  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

/**
 * Selektorlar bo'yicha KO'RINADIGAN birinchi elementni qaytaradi.
 *
 * ⚠️ HAR SELEKTOR BO'YICHA HAMMASI KO'RIB CHIQILADI, `querySelector`
 * EMAS. Birinchi mos kelgan element yashirin bo'lsa, `querySelector`
 * aynan o'shani qaytarardi va ko'rinadigani umuman sinalmasdi.
 */
export function firstOf<T extends Element>(selectors: string[]): T | null {
  for (const selector of selectors) {
    for (const found of document.querySelectorAll<T>(selector)) {
      if (visible(found)) return found;
    }
  }
  return null;
}

/**
 * Ko'rinishiga qaramaydigan variant.
 *
 * ⚠️ FAYL MAYDONI UCHUN SHART. `input[type=file]` bu saytlarda HAR DOIM
 * yashirin bo'ladi — uni ko'rinish bo'yicha filtrlasak, hech qachon
 * topilmasdi.
 */
export function firstOfHidden<T extends Element>(selectors: string[]): T | null {
  for (const selector of selectors) {
    const found = document.querySelector<T>(selector);
    if (found) return found;
  }
  return null;
}

/**
 * Matnni contenteditable ichiga yozadi — ikki usulni sinab.
 *
 * ⚠️ HAR IKKALASIDAN KEYIN MATN JOYLASHGANI TEKSHIRILADI. Bu yerdagi
 * eng aldamchi nosozlik — matn ekranda ko'rinadi, lekin freymvorkning
 * holatiga yetmaydi: «Yuborish» BO'SH xabar yuboradi va model «rasm
 * ko'rmayapman» deb javob beradi. Xato hech qayerda chiqmaydi.
 */
export function typeInto(element: HTMLElement, text: string): string {
  /*
   * ⚠️ `<textarea>` BUTUNLAY BOSHQACHA ISHLAYDI. Yangi ChatGPT
   * qurilmasida matn maydoni haqiqiy `<textarea>`, eskisida esa
   * `contenteditable` div. Birinchisiga `execCommand` ham,
   * `textContent` ham yaramaydi — qiymat `value` da turadi.
   */
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    if (setNativeValue(element, text)) return 'value';
    throw new Error('Promptni yozib bo`lmadi — matn maydoni qiymatni qabul qilmadi');
  }

  /*
   * ⚠️ `contenteditable` DA QATOR BO'SHLIQLARI BO'SHLIQQA AYLANADI.
   * Varaq prompti bandlarga bo'lingan (`\n\n`); ProseMirror/Quill ichiga
   * `insertText` bilan yangi qator tashlansa, sayt uni Enter deb o'qib
   * xabarni yarim yo'lda yuborishi mumkin. Model uchun bandlar shart emas.
   */
  text = text.replace(/\s*\n+\s*/g, ' ');

  /*
   * ⚠️ AVVAL PASTE (2026-09-25). Yangi ChatGPT'da maydon ProseMirror:
   * `execCommand` sahifa fokusda bo'lmasa ishlamaydi (fokus popupda yoki
   * fayl maydonida qoladi), `textContent` ga yozilganini esa ProseMirror
   * o'z holatidan qaytarib o'chiradi. Sun'iy `paste` hodisasini esa u
   * fokussiz ham qabul qiladi — suratlar ham aynan shu yo'l bilan
   * biriktiriladi. Bo'sh matn (tozalash) paste bilan qilinmaydi.
   */
  if (text && insertByPaste(element, text)) return 'paste';

  if (insertByCommand(element, text)) return 'execCommand';

  /*
   * ⚠️ ZAXIRA YO'L SHART, CHUNKI POPUP OCHIQ TURSA BIRINCHISI ISHLAMAYDI.
   * `execCommand` fokusdagi HUJJATNI talab qiladi; kengaytma popupi
   * ochilganda fokus unda bo'ladi va sahifada emas. Operator esa aynan
   * popupga qarab o'tiradi — ya'ni eng ko'p uchraydigan hol.
   *
   * To'g'ridan-to'g'ri DOM'ga yozish ham yetadi: ChatGPT (ProseMirror) va
   * Gemini (Quill) ikkalasi ham matn maydonini `MutationObserver` bilan
   * kuzatadi, ya'ni qo'shilgan tugunni o'z holatiga oladi.
   */
  if (insertByDom(element, text)) return 'dom';

  throw new Error('Promptni yozib bo`lmadi — sahifa matn maydonini qabul qilmadi');
}

function insertByPaste(element: HTMLElement, text: string): boolean {
  try {
    element.focus();
    const data = new DataTransfer();
    data.setData('text/plain', text);
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  } catch {
    return false;
  }
  return contains(element, text);
}

/**
 * React boshqaradigan maydonga qiymat yozish.
 *
 * ⚠️ `el.value = matn` YETMAYDI. React qiymatni o'zi kuzatadi va
 * to'g'ridan-to'g'ri yozilganini «o'zgarmadi» deb hisoblaydi: ekranda
 * matn turadi, holatda esa bo'sh qoladi va «Yuborish» o'chiq qolaveradi.
 * Prototipdagi ASL setter chaqirilsa React uni o'z o'zgarishi deb
 * qabul qiladi.
 */
function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, text: string): boolean {
  const prototype = Object.getPrototypeOf(element) as object;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  try {
    element.focus();

    if (setter) setter.call(element, text);
    else element.value = text;

    element.dispatchEvent(new Event('input', { bubbles: true }));
  } catch {
    return false;
  }

  return element.value.includes(text.slice(0, 40));
}

/** Matn haqiqatan joylashdimi — YAGONA ishonchli tekshiruv. */
function contains(element: HTMLElement, text: string): boolean {
  const probe = text.slice(0, 40);
  return (element.textContent ?? '').includes(probe);
}

function insertByCommand(element: HTMLElement, text: string): boolean {
  try {
    element.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);

    document.execCommand('insertText', false, text);
  } catch {
    return false;
  }

  /*
   * ⚠️ `execCommand` NING QAYTARGAN QIYMATIGA ISHONMAYMIZ. U fokussiz
   * hujjatda ham ba'zan `true` qaytaradi, matn esa joylashmaydi.
   */
  return contains(element, text);
}

function insertByDom(element: HTMLElement, text: string): boolean {
  try {
    element.textContent = text;

    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
    );
  } catch {
    return false;
  }

  return contains(element, text);
}

function transferOf(files: File[]): DataTransfer {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  return transfer;
}

/**
 * Suratlarni suhbatga biriktiradi — UCHTA USULNI KETMA-KET SINAB.
 *
 * ⚠️ BITTA USULGA ISHONIB BO'LMAYDI. Sayt fayllarni qanday qabul qilishi
 * (paste / drop / yashirin fayl maydoni) versiyadan versiyaga o'zgaradi,
 * va qaysi biri ishlayotganini OLDINDAN bilish imkoni yo'q.
 *
 * ⚠️ HODISANING «BEKOR QILINDIMI» BELGISIGA QARAB XULOSA QILMAYMIZ.
 * Ilgari `paste` dan qaytgan `false` «qabul qilindi» deb o'qilardi —
 * lekin sayt hodisani ushlab, `preventDefault()` ni CHAQIRMASLIGI ham
 * mumkin. Natijada kengaytma suratlar biriktirildi deb o'ylab, bo'sh
 * so'rov yuborardi. Endi yagona o'lchov — EKRANDA biriktirma
 * paydo bo'ldimi (`probe`).
 */
export async function attachFiles(
  target: HTMLElement,
  files: File[],
  probe: () => number,
  inputs: HTMLInputElement[],
): Promise<string> {
  const dropTarget = firstOf<HTMLElement>(['form', 'main']) ?? target;

  const strategies: [string, () => void][] = [
    [
      'paste',
      () => {
        target.focus();
        target.dispatchEvent(
          new ClipboardEvent('paste', {
            clipboardData: transferOf(files),
            bubbles: true,
            cancelable: true,
          }),
        );
      },
    ],
    [
      'drop',
      () => {
        const transfer = transferOf(files);
        for (const type of ['dragenter', 'dragover', 'drop']) {
          dropTarget.dispatchEvent(
            new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true }),
          );
        }
      },
    ],
    [
      'fayl maydoni',
      () => {
        /*
         * ⚠️ OXIRGI CHORA. `input.files` ga yozish mumkin, lekin sayt
         * uni faqat `change` hodisasi bilan ko'radi. React uchun bu
         * yetarli: u native `change` ni tinglaydi va `isTrusted` ni
         * tekshirmaydi.
         */
        for (const input of inputs) {
          input.files = transferOf(files).files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    ],
  ];

  /*
   * ⚠️ SANOQLAR XATO MATNIGA QO'SHILADI. «Biriktirilmadi» o'zi hech
   * narsa aytmaydi: usul umuman ishlamadimi, yuklash sekinmi, yoki
   * tekshiruv biriktirmani tanimayaptimi — uchalasi bir xil ko'rinadi.
   */
  const tried: string[] = [];

  for (const [name, run] of strategies) {
    const seen = Math.max(probe(), 0);
    run();

    const ok = await waitFor(() => probe() >= seen + files.length, {
      timeoutMs: 20_000,
      what: name,
      intervalMs: 400,
    }).catch(() => false);

    if (ok) return name;

    tried.push(`${name}: ${seen}→${probe()}`);
  }

  throw new Error(`Suratlar biriktirilmadi (${files.length} ta kutildi; ${tried.join(', ')})`);
}

export function base64ToFile(base64: string, mime: string, name: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());

  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}

/**
 * Natija suratini o'qishga urinadi.
 *
 * ⚠️ YIQILSA XATO EMAS, `null`. Surat ko'pincha boshqa domenda turadi
 * (`*.oaiusercontent.com`) va content script uni CORS tufayli o'qiy
 * olmaydi. Bu kutilgan hol: chaqiruvchi shunda havolaning o'zini
 * workerga beradi.
 */
export async function readImage(url: string): Promise<{ mime: string; base64: string } | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;

    return { mime: blob.type, base64: await blobToBase64(blob) };
  } catch {
    return null;
  }
}

/**
 * Prompt SAHIFADAGI matn maydonida turibdimi.
 *
 * ⚠️ `isConnected` SHART. ChatGPT surat biriktirilgach matn maydonini
 * qaytadan chizadi — oldin topilgan element sahifadan uziladi, lekin
 * ichidagi matn saqlanadi. Faqat matnga qaralsa, uzilgan elementga
 * yozilgan prompt «yozildi» bo'lib ko'rinardi, xabar esa promptsiz ketardi.
 */
export function hasPrompt(element: HTMLElement, prompt: string): boolean {
  return element.isConnected && composerText(element).includes(prompt.slice(0, 40));
}

/** Matn maydonidagi hozirgi matn — `<textarea>` da `value`, aks holda `textContent`. */
function composerText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent ?? '';
}

function firePointer(element: HTMLElement): void {
  const options = { bubbles: true, cancelable: true, composed: true };

  element.dispatchEvent(new PointerEvent('pointerdown', options));
  element.dispatchEvent(new MouseEvent('mousedown', options));
  element.dispatchEvent(new PointerEvent('pointerup', options));
  element.dispatchEvent(new MouseEvent('mouseup', options));
  element.dispatchEvent(new MouseEvent('click', options));
}

function fireEnter(element: HTMLElement): void {
  element.focus();

  const options = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  };

  element.dispatchEvent(new KeyboardEvent('keydown', options));
  element.dispatchEvent(new KeyboardEvent('keypress', options));
  element.dispatchEvent(new KeyboardEvent('keyup', options));
}

/**
 * Xabarni yuboradi — UCHTA USULNI KETMA-KET SINAB.
 *
 * ⚠️ `button.click()` YETMASLIGI MUMKIN. Sayt tugmani `pointerdown`
 * orqali boshqarsa, sun'iy `click` unga umuman yetmaydi — hech narsa
 * bo'lmaydi va xato ham chiqmaydi.
 *
 * ⚠️ TEKSHIRUV — MATN MAYDONI TOZALANDIMI. Bu yagona ishonchli belgi:
 * ChatGPT ham, Gemini ham xabar ketgach maydonni bo'shatadi. Tugma
 * bosilganini sanash aldaydi — bosiladi, lekin hech narsa yuborilmaydi.
 * Aynan shu 2026-09-23 da bo'lgan: jurnalda «yuborildi» yozilgan,
 * suhbat esa bo'sh qolgan.
 */
export async function submit(
  composer: HTMLElement,
  prompt: string,
  button: () => HTMLElement | null,
): Promise<string> {
  const probe = prompt.slice(0, 40);
  const pending = (): boolean => composerText(composer).includes(probe);

  if (!pending()) throw new Error('Prompt matn maydonida yo`q — yuborishdan oldin yo`qolgan');

  const strategies: [string, () => void][] = [
    ['click', () => button()?.click()],
    [
      'pointer',
      () => {
        const target = button();
        if (target) firePointer(target);
      },
    ],
    ['Enter', () => fireEnter(composer)],
  ];

  for (const [name, run] of strategies) {
    run();

    const sent = await waitFor(() => !pending(), {
      timeoutMs: 6_000,
      what: name,
      intervalMs: 250,
    }).catch(() => false);

    if (sent) return name;
  }

  throw new Error('Yuborilmadi — click, pointer va Enter ishlamadi');
}
