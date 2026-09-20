import { api } from './client';

/**
 * Yetkazib berish navbati — `/v1/delivery/*`.
 *
 * Server `courier` rolini talab qiladi; panel ham shuni tekshiradi, lekin
 * haqiqiy himoya serverda.
 */

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'failed';

export type DeliveryFilter = 'active' | 'done';

export interface DeliveryItem {
  title: string | null;
  image: string | null;
  brand: string | null;
  size: string;
  qty: number;
}

export interface DeliveryOrder {
  id: string;
  number: string;
  storeName: string;
  storePhone: string | null;
  storeLocation: { lat: number | null; lng: number | null };
  contactName: string;
  contactPhone: string;
  /** { text, lat, lng, landmark } — delivery uchun */
  address: { text?: string; lat?: number; lng?: number; landmark?: string } | null;
  note: string | null;
  subtotal: string;
  deliveryFee: string;
  total: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  items: DeliveryItem[];
}

export interface Delivery {
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
  order: DeliveryOrder;
}

export const listDeliveries = (status: DeliveryFilter): Promise<Delivery[]> =>
  api<Delivery[]>(`/delivery/orders?status=${status}`);

export const acceptDelivery = (id: string): Promise<Delivery> =>
  api<Delivery>(`/delivery/orders/${id}/accept`, { method: 'POST' });

export const assignCourier = (
  id: string,
  courierName: string,
  courierPhone: string,
): Promise<Delivery> =>
  api<Delivery>(`/delivery/orders/${id}/courier`, {
    method: 'POST',
    body: { courierName, courierPhone },
  });

export const advanceDelivery = (
  id: string,
  to: 'picked_up' | 'delivered' | 'failed',
  reason?: string,
): Promise<Delivery> =>
  api<Delivery>(`/delivery/orders/${id}/status`, {
    method: 'POST',
    body: reason ? { to, reason } : { to },
  });
