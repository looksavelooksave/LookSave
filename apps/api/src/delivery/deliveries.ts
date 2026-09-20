/**
 * Yetkazib berish paneli domeni — bitta dostavka firmasi uchun.
 *
 * Oqim: do'kon buyurtmani 'ready' qiladi → trigger `deliveries` yozuvini
 * yaratadi (pending) → firma operatori qabul qiladi (accepted) → kuryer
 * ism/telefonini yozadi (assigned) → oldi (picked_up) → yetkazdi
 * (delivered, buyurtma 'completed' bo'ladi) yoki uddalay olmadi (failed).
 *
 * ⚠️ HIMOYA ROLDA. Marshrutlar `courier` rolini talab qiladi — bu firma
 * logini. Bir buyurtma bir yozuv (order_id UNIQUE), shuning uchun ikki
 * operator bir topshiriqni ikki marta bajarmaydi.
 */

import { pool } from '../db/pool';
import { ApiError } from '../http/api-error';
import { presignRead } from '../integrations/r2';
import { logger } from '../logger';

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'failed';

/** Panel navbati: ochiq (yetkazilmagan) yoki tarix (yetkazilgan/uddalanmagan). */
export type DeliveryFilter = 'active' | 'done';

interface DeliveryRow {
  id: string;
  status: DeliveryStatus;
  courier_name: string | null;
  courier_phone: string | null;
  accepted_by_name: string | null;
  accepted_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  fail_reason: string | null;
  created_at: Date;
  order_id: string;
  order_number: string;
  order_status: string;
  contact_name: string;
  contact_phone: string;
  address: unknown;
  note: string | null;
  subtotal: string;
  delivery_fee: string;
  total: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  store_name: string;
  store_phone: string | null;
  store_lat: number | null;
  store_lng: number | null;
}

interface ItemRow {
  order_id: string;
  size: string;
  qty: number;
  snapshot: Record<string, unknown>;
}

export interface DeliveryDto {
  id: string;
  status: DeliveryStatus;
  courierName: string | null;
  courierPhone: string | null;
  acceptedByName: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failReason: string | null;
  createdAt: string;
  order: {
    id: string;
    number: string;
    storeName: string;
    storePhone: string | null;
    storeLocation: { lat: number | null; lng: number | null };
    contactName: string;
    contactPhone: string;
    address: unknown;
    note: string | null;
    subtotal: string;
    deliveryFee: string;
    total: string;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    items: Array<{
      title: unknown;
      image: string | null;
      brand: unknown;
      size: string;
      qty: number;
    }>;
  };
}

const SELECT = `
  SELECT d.id, d.status, d.courier_name, d.courier_phone,
         u.full_name AS accepted_by_name,
         d.accepted_at, d.picked_up_at, d.delivered_at, d.fail_reason, d.created_at,
         o.id AS order_id, o.order_number, o.status AS order_status,
         o.contact_name, o.contact_phone, o.address, o.note,
         o.subtotal::text, o.delivery_fee::text, o.total::text, o.currency,
         o.payment_method, o.payment_status,
         s.name AS store_name, s.phone AS store_phone,
         ST_Y(s.location::geometry) AS store_lat, ST_X(s.location::geometry) AS store_lng
    FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    JOIN stores s ON s.id = o.store_id
    LEFT JOIN users u ON u.id = d.accepted_by`;

/** Buyurtma rasmini imzolash — do'kon suratlari xususiy bucketda bo'lishi mumkin. */
async function toDto(row: DeliveryRow, items: ItemRow[]): Promise<DeliveryDto> {
  const own = items.filter((it) => it.order_id === row.order_id);
  const mapped = await Promise.all(
    own.map(async (it) => {
      const image = (it.snapshot['image'] as string | undefined) ?? null;
      return {
        title: it.snapshot['title'] ?? null,
        image: image ? ((await presignRead(image)) ?? image) : null,
        brand: it.snapshot['brand'] ?? null,
        size: it.size,
        qty: it.qty,
      };
    }),
  );
  return {
    id: row.id,
    status: row.status,
    courierName: row.courier_name,
    courierPhone: row.courier_phone,
    acceptedByName: row.accepted_by_name,
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    pickedUpAt: row.picked_up_at?.toISOString() ?? null,
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    failReason: row.fail_reason,
    createdAt: row.created_at.toISOString(),
    order: {
      id: row.order_id,
      number: row.order_number,
      storeName: row.store_name,
      storePhone: row.store_phone,
      storeLocation: { lat: row.store_lat, lng: row.store_lng },
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      address: row.address,
      note: row.note,
      subtotal: row.subtotal,
      deliveryFee: row.delivery_fee,
      total: row.total,
      currency: row.currency,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      items: mapped,
    },
  };
}

/** Panel navbati. `active` — yetkazilmagan; `done` — yopilganlar. */
export async function listDeliveries(filter: DeliveryFilter = 'active'): Promise<DeliveryDto[]> {
  const active = filter === 'active';
  const { rows } = await pool.query<DeliveryRow>(
    `${SELECT}
      WHERE d.status ${active ? "NOT IN ('delivered', 'failed')" : "IN ('delivered', 'failed')"}
      ORDER BY ${active ? 'd.created_at ASC' : 'd.updated_at DESC'}
      LIMIT 100`,
  );
  if (rows.length === 0) return [];

  const orderIds = rows.map((r) => r.order_id);
  const items = await pool.query<ItemRow>(
    `SELECT order_id, size, qty, snapshot FROM order_items WHERE order_id = ANY($1::uuid[])`,
    [orderIds],
  );
  return Promise.all(rows.map((row) => toDto(row, items.rows)));
}

async function oneById(id: string): Promise<DeliveryDto> {
  const { rows } = await pool.query<DeliveryRow>(`${SELECT} WHERE d.id = $1`, [id]);
  const row = rows[0];
  if (!row) throw ApiError.notFound('Yetkazish topshirig`i topilmadi');
  const items = await pool.query<ItemRow>(
    `SELECT order_id, size, qty, snapshot FROM order_items WHERE order_id = $1`,
    [row.order_id],
  );
  return toDto(row, items.rows);
}

/** Firma topshiriqni oladi — pending → accepted. */
export async function acceptDelivery(id: string, operatorId: string): Promise<DeliveryDto> {
  const { rowCount } = await pool.query(
    `UPDATE deliveries
        SET status = 'accepted', accepted_by = $2, accepted_at = now()
      WHERE id = $1 AND status = 'pending'`,
    [id, operatorId],
  );
  if (rowCount === 0) {
    // Allaqachon olingan yoki holati boshqa — joriy holatni qaytaramiz
    const current = await oneById(id);
    if (current.status !== 'accepted') {
      throw new ApiError('INVALID_STATE', 'Bu topshiriq allaqachon boshqa holatda');
    }
    return current;
  }
  logger.info({ deliveryId: id, operatorId }, 'delivery: qabul qilindi');
  return oneById(id);
}

/** Kuryer ism/telefonini yozadi — accepted → assigned. */
export async function assignCourier(
  id: string,
  courierName: string,
  courierPhone: string,
): Promise<DeliveryDto> {
  const { rowCount } = await pool.query(
    `UPDATE deliveries
        SET courier_name = $2, courier_phone = $3,
            status = CASE WHEN status = 'accepted' THEN 'assigned' ELSE status END,
            assigned_at = COALESCE(assigned_at, now())
      WHERE id = $1 AND status IN ('accepted', 'assigned', 'picked_up')`,
    [id, courierName, courierPhone],
  );
  if (rowCount === 0) {
    throw new ApiError('INVALID_STATE', 'Kuryer biriktirish uchun avval topshiriqni qabul qiling');
  }
  logger.info({ deliveryId: id }, 'delivery: kuryer biriktirildi');
  return oneById(id);
}

const NEXT: Record<string, DeliveryStatus[]> = {
  picked_up: ['assigned', 'accepted'],
  delivered: ['picked_up', 'assigned'],
  failed: ['pending', 'accepted', 'assigned', 'picked_up'],
};

/**
 * Holatni oldinga suradi: picked_up | delivered | failed.
 *
 * ⚠️ DELIVERED => BUYURTMA YOPILADI. Yetkazilgan buyurtma `completed`
 * bo'ladi (ombor triggeri tovarni sotilgan deb hisoblaydi). Bu bir
 * tranzaksiyada bajariladi — biri yozilib, ikkinchisi yozilmay qolmasin.
 */
export async function advanceDelivery(
  id: string,
  to: 'picked_up' | 'delivered' | 'failed',
  reason?: string,
): Promise<DeliveryDto> {
  const allowedFrom = NEXT[to] ?? [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ status: DeliveryStatus; order_id: string }>(
      `SELECT status, order_id FROM deliveries WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = rows[0];
    if (!row) throw ApiError.notFound('Yetkazish topshirig`i topilmadi');
    if (!allowedFrom.includes(row.status)) {
      throw new ApiError('INVALID_STATE', `"${row.status}" holatidan "${to}" ga o'tib bo'lmaydi`);
    }

    const stamp =
      to === 'picked_up' ? 'picked_up_at' : to === 'delivered' ? 'delivered_at' : 'created_at';
    await client.query(
      `UPDATE deliveries
          SET status = $2, fail_reason = $3
              ${to !== 'failed' ? `, ${stamp} = now()` : ''}
        WHERE id = $1`,
      [id, to, to === 'failed' ? (reason ?? null) : null],
    );

    if (to === 'delivered') {
      await client.query(
        `UPDATE orders SET status = 'completed', completed_at = now()
          WHERE id = $1 AND status = 'ready'`,
        [row.order_id],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  logger.info({ deliveryId: id, to }, 'delivery: holat yangilandi');
  return oneById(id);
}
