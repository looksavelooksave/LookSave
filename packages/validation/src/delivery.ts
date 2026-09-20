import { z } from 'zod';

/** Yetkazish paneli navbati: ochiq yoki yopilgan. */
export const deliveryQuerySchema = z.object({
  status: z.enum(['active', 'done']).default('active'),
});
export type DeliveryQuery = z.output<typeof deliveryQuerySchema>;

/** Kuryer biriktirish — ism va telefon operator qo'lda yozadi. */
export const assignCourierSchema = z.object({
  courierName: z.string().trim().min(2).max(120),
  courierPhone: z.string().trim().min(5).max(30),
});
export type AssignCourierInput = z.output<typeof assignCourierSchema>;

/** Holatni oldinga surish: oldi / yetkazdi / uddalay olmadi. */
export const advanceDeliverySchema = z
  .object({
    to: z.enum(['picked_up', 'delivered', 'failed']),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.to !== 'failed' || (value.reason?.length ?? 0) >= 3, {
    path: ['reason'],
    message: 'Uddalay olmaslik sababini yozing',
  });
export type AdvanceDeliveryInput = z.output<typeof advanceDeliverySchema>;
