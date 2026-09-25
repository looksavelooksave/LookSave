import type { AdapterId, PopupRequest, RunStatus } from '../shared/messages';

/**
 * Popup — faqat ko'rsatadi va buyuradi.
 *
 * ⚠️ BU YERDA HOLAT SAQLANMAYDI. Oyna yopilishi bilan skript o'ladi;
 * haqiqiy holat workerda turadi va har soniyada so'raladi.
 */

interface TaskOption {
  id: string;
  userId: string;
  createdAt: string;
}

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} topilmadi`);
  return found as T;
}

const view = {
  auth: el('auth'),
  main: el('main'),
  error: el<HTMLParagraphElement>('error'),
  state: el('state'),
  count: el('count'),
  task: el<HTMLSelectElement>('task'),
  adapter: el<HTMLSelectElement>('adapter'),
  log: el('log'),
  start: el<HTMLButtonElement>('start'),
  stop: el<HTMLButtonElement>('stop'),
  auto: el<HTMLInputElement>('auto'),
  diagnose: el<HTMLButtonElement>('diagnose'),
  testsend: el<HTMLButtonElement>('testsend'),
};

function fail(message: string): void {
  view.error.textContent = message;
}

async function send<T>(request: PopupRequest): Promise<T> {
  const response = (await chrome.runtime.sendMessage(request)) as T & { error?: string };
  if (response && typeof response.error === 'string') throw new Error(response.error);
  return response;
}

const STATE_TEXT: Record<RunStatus['state'], string> = {
  idle: 'Bo`sh',
  running: 'Ishlayapti',
  paused: 'Pauza',
  stopped: 'To`xtatilgan',
};

function render(status: RunStatus): void {
  const running = status.state === 'running';

  view.state.textContent = status.current
    ? `${STATE_TEXT[status.state]}: ${status.current.title}`
    : status.auto && !running
      ? 'Avtomatik · navbat kutilmoqda'
      : STATE_TEXT[status.state];

  view.count.textContent = `${status.finished}/${status.total}${
    status.failed > 0 ? ` · ${status.failed} xato` : ''
  }${status.queued > 0 ? ` · navbatda ${status.queued}` : ''}`;

  /*
   * ⚠️ TUGMA AVTOMATIK REJIMDA HAM YOPILADI. Avtomatik halqa ishlayotganda
   * qo'lda ikkinchi ishni boshlash ikkita navbatni bir AI tabida
   * urishtirardi — suratlar aralashib ketardi.
   */
  view.start.disabled = running || status.auto;
  view.diagnose.disabled = running;
  view.testsend.disabled = running;
  view.stop.disabled = !running;
  view.task.disabled = running || status.auto;
  view.adapter.disabled = running;

  /* Foydalanuvchi belgini bosayotganda uni orqaga tortib olmaymiz */
  if (document.activeElement !== view.auto) view.auto.checked = status.auto;

  view.log.textContent = status.log.join('\n');
}

async function loadTasks(): Promise<void> {
  const { tasks } = await send<{ tasks: TaskOption[] }>({ type: 'TASKS' });

  view.task.replaceChildren(
    ...tasks.map((task) => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = `${task.id.slice(0, 8)} · ${new Date(task.createdAt).toLocaleString('uz-UZ')}`;
      return option;
    }),
  );

  if (tasks.length === 0) fail('Ochiq ish yo`q');
}

async function refresh(): Promise<void> {
  const { status, authed } = await send<{ status: RunStatus; authed: boolean }>({
    type: 'STATUS',
  });

  view.auth.classList.toggle('hidden', authed);
  view.main.classList.toggle('hidden', !authed);

  if (authed) render(status);
}

el<HTMLButtonElement>('login').addEventListener('click', () => {
  fail('');
  const phone = el<HTMLInputElement>('phone').value.trim();
  const password = el<HTMLInputElement>('password').value;

  void send({ type: 'LOGIN', phone, password })
    .then(async () => {
      await refresh();
      await loadTasks();
    })
    .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Kirish xatosi'));
});

el<HTMLButtonElement>('logout').addEventListener('click', () => {
  void send({ type: 'LOGOUT' }).then(refresh);
});

view.start.addEventListener('click', () => {
  fail('');
  const taskId = view.task.value;
  if (!taskId) {
    fail('Ish tanlanmagan');
    return;
  }

  void send({ type: 'START', taskId, adapter: view.adapter.value as AdapterId })
    .then(refresh)
    .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Boshlanmadi'));
});

view.stop.addEventListener('click', () => {
  void send({ type: 'STOP' }).then(refresh);
});

view.diagnose.addEventListener('click', () => {
  fail('');
  view.diagnose.textContent = 'Tekshirilmoqda…';

  void send({ type: 'DIAGNOSE', adapter: view.adapter.value as AdapterId })
    .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Tekshirilmadi'))
    .finally(() => {
      view.diagnose.textContent = 'Sahifani tekshirish';
      void refresh();
    });
});

view.testsend.addEventListener('click', () => {
  fail('');
  view.testsend.textContent = 'Sinalmoqda…';

  void send({ type: 'TEST_SEND', adapter: view.adapter.value as AdapterId })
    .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Sinalmadi'))
    .finally(() => {
      view.testsend.textContent = 'Yuborishni sinash';
      void refresh();
    });
});

view.auto.addEventListener('change', () => {
  fail('');
  void send({
    type: 'SET_AUTO',
    enabled: view.auto.checked,
    adapter: view.adapter.value as AdapterId,
  })
    .then(refresh)
    .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Rejim yoqilmadi'));
});

/*
 * ⚠️ SO'RAB TURISH, OBUNA EMAS. Worker holatni o'zi yuborsa, popup
 * yopiq paytda xabar egasiz qolib, Chrome konsolga xato yozardi.
 */
setInterval(() => void refresh().catch(() => undefined), 1_000);

void refresh()
  .then(loadTasks)
  .catch((error: unknown) => fail(error instanceof Error ? error.message : 'Ulanmadi'));
