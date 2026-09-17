-- 028_developer_ai_telegram.sql
-- Operator navbati: Telegram xabarini kuzatib borish.
--
-- NEGA: yangi ish haqida operatorlar guruhiga xabar boradi. Keyin o'sha
-- XABARNING O'ZI yangilanadi — «kutmoqda» → «Ali oldi» → «tayyor».
-- Aks holda guruhda bitta ish uchun uchta xabar yig'ilardi va qaysi ish
-- hali ochiqligini xabarlar orasidan qidirish kerak bo'lardi.
--
-- ⚠️ RAQAM 028, 026 EMAS. Bazada `026_delivery_rating.sql` va
-- `027_ledger_settlement.sql` allaqachon qo'llangan (kuryer ishi,
-- `.courier-parked` da). Nomlar boshqa bo'lsa ham bir xil raqam
-- tartibni chalkashtirardi.

ALTER TABLE developer_ai_tasks
  ADD COLUMN tg_chat_id text,
  ADD COLUMN tg_message_id bigint;
