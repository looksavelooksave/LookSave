import {
  advanceDeliverySchema,
  assignCourierSchema,
  deliveryQuerySchema,
  idParamSchema,
} from '@looksave/validation';
import { Router } from 'express';

import {
  acceptDelivery,
  advanceDelivery,
  assignCourier,
  listDeliveries,
} from '../delivery/deliveries';
import { getAuth, requireAuth, requireRole } from '../http/auth-middleware';
import { sendData } from '../http/respond';
import { route } from '../http/validate';

/**
 * Yetkazib berish paneli — bitta dostavka firmasi.
 *
 * ⚠️ `courier` ROLI TALAB QILINADI. Bu firma logini; oddiy mijoz yoki
 * do'kon bu marshrutlarga kira olmaydi. Rol 029 migratsiyasida qo'shilgan.
 */
export const deliveryRouter: Router = Router();

deliveryRouter.use('/delivery', requireAuth, requireRole('courier'));

/** GET /v1/delivery/orders?status=active — yetkazish navbati */
deliveryRouter.get(
  '/delivery/orders',
  route({ query: deliveryQuerySchema }, async (input, _req, res) => {
    sendData(res, await listDeliveries(input.query.status));
  }),
);

/** POST /v1/delivery/orders/:id/accept — firma topshiriqni oladi */
deliveryRouter.post(
  '/delivery/orders/:id/accept',
  route({ params: idParamSchema }, async (input, _req, res) => {
    sendData(res, await acceptDelivery(input.params.id, getAuth(res).sub));
  }),
);

/** POST /v1/delivery/orders/:id/courier — kuryer ism/telefonini yozadi */
deliveryRouter.post(
  '/delivery/orders/:id/courier',
  route({ params: idParamSchema, body: assignCourierSchema }, async (input, _req, res) => {
    sendData(
      res,
      await assignCourier(input.params.id, input.body.courierName, input.body.courierPhone),
    );
  }),
);

/** POST /v1/delivery/orders/:id/status — oldi / yetkazdi / uddalay olmadi */
deliveryRouter.post(
  '/delivery/orders/:id/status',
  route({ params: idParamSchema, body: advanceDeliverySchema }, async (input, _req, res) => {
    sendData(res, await advanceDelivery(input.params.id, input.body.to, input.body.reason));
  }),
);
