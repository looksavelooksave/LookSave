import { firstOf, firstOfHidden } from '../dom';
import { looksLikeResult, type Adapter } from './types';

/**
 * Google Gemini (gemini.google.com).
 *
 * ⚠️ BU YERDA `data-testid` YO'Q. Gemini — Angular ilovasi va uning
 * belgilari maxsus element nomlari (`rich-textarea`, `model-response`)
 * hamda `aria-label` lar. Sinf nomlari (`.ql-editor`) Quill muharriridan
 * keladi va ancha barqaror, lekin `aria-label` TIL BO'YICHA O'ZGARADI —
 * shuning uchun ingliz, rus va o'zbek variantlari ham sanab o'tilgan.
 */
export const gemini: Adapter = {
  id: 'gemini',

  matches() {
    return location.hostname.endsWith('gemini.google.com');
  },

  composer() {
    return firstOf<HTMLElement>([
      'rich-textarea div[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ]);
  },

  sendButton() {
    const button = firstOf<HTMLButtonElement>([
      'button.send-button',
      'button[aria-label*="Send"]',
      'button[aria-label*="Отправить"]',
      'button[aria-label*="Yuborish"]',
    ]);

    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true'
      ? button
      : null;
  },

  busy() {
    return Boolean(
      firstOf([
        'button[aria-label*="Stop"]',
        'button[aria-label*="Остановить"]',
        '.stop-icon',
        'progress-bar:not([hidden])',
      ]),
    );
  },

  fileInputs() {
    const any = firstOfHidden<HTMLInputElement>([
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
    ]);
    return any ? [any] : [];
  },

  attachmentCount() {
    /* ⚠️ `blob:` — ChatGPT adapteridagi bilan bir xil sabab. */
    const blobs = document.querySelectorAll('img[src^="blob:"]');
    if (blobs.length > 0) return blobs.length;

    const thumbs = document.querySelectorAll(
      'uploader-file-preview, .file-preview-container img, [data-test-id="file-preview"]',
    );
    return thumbs.length > 0 ? thumbs.length : -1;
  },

  lastReplyText() {
    const turns = document.querySelectorAll<HTMLElement>(
      'model-response, message-content.model-response-text',
    );

    const last = turns[turns.length - 1];
    return last ? (last.textContent ?? '').trim() : '';
  },

  resultImages() {
    const turns = document.querySelectorAll<HTMLElement>(
      'model-response, message-content.model-response-text',
    );

    const images: HTMLImageElement[] = [];
    for (const turn of turns) {
      for (const image of turn.querySelectorAll<HTMLImageElement>('img')) {
        if (looksLikeResult(image)) images.push(image);
      }
    }

    return images;
  },
};
