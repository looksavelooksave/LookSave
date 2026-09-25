import type { CategoryCreateInput, CategoryUpdateInput } from '@looksave/validation';

import { pool } from '../db/pool';
import { ApiError } from '../http/api-error';
import { slugify, uniqueSlug } from '../store/slug';

/**
 * Kategoriyalarni admin boshqaradi (02-database §categories). Daraxt:
 * `parent_id` orqali ildiz va ichki kategoriyalar.
 */

export interface CategoryRow {
  id: string;
  parent_id: string | null;
  slug: string;
  name: Record<string, string>;
  icon: string | null;
  slot: string | null;
  gender: string;
  size_type: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: string;
  child_count: string;
}

export interface AdminCategoryDto {
  id: string;
  parentId: string | null;
  slug: string;
  name: Record<string, string>;
  icon: string | null;
  slot: string | null;
  gender: string;
  sizeType: string | null;
  sortOrder: number;
  isActive: boolean;
  /** O'chirishdan oldin ogohlantirish uchun */
  productCount: number;
  childCount: number;
}

export function toCategoryDto(row: CategoryRow): AdminCategoryDto {
  return {
    id: row.id,
    parentId: row.parent_id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    slot: row.slot,
    gender: row.gender,
    sizeType: row.size_type,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    productCount: Number(row.product_count),
    childCount: Number(row.child_count),
  };
}

const COLUMNS = `c.id, c.parent_id, c.slug, c.name, c.icon, c.slot, c.gender, c.size_type,
                 c.sort_order, c.is_active,
                 (SELECT count(*) FROM products p WHERE p.category_id = c.id) AS product_count,
                 (SELECT count(*) FROM categories k WHERE k.parent_id = c.id) AS child_count`;

/** Barcha kategoriyalar (nofaollar ham) — admin hammasini ko'radi. */
export async function findCategories(): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT ${COLUMNS} FROM categories c ORDER BY c.sort_order, c.slug`,
  );
  return rows;
}

export async function getCategory(id: string): Promise<AdminCategoryDto> {
  const { rows } = await pool.query<CategoryRow>(`SELECT ${COLUMNS} FROM categories c WHERE c.id = $1`, [
    id,
  ]);
  const row = rows[0];
  if (!row) throw ApiError.notFound('Kategoriya topilmadi');
  return toCategoryDto(row);
}

/** Slug berilmasa nomdan (ingliz → o'zbek → bor tilidan) yasaladi. */
async function resolveSlug(name: Record<string, string>, requested?: string): Promise<string> {
  if (requested) {
    const { rowCount } = await pool.query(`SELECT 1 FROM categories WHERE slug = $1`, [requested]);
    if (rowCount) throw new ApiError('ALREADY_EXISTS', 'Bu slug band');
    return requested;
  }

  const source = name['en'] ?? name['uz'] ?? Object.values(name)[0] ?? '';
  const base = slugify(source);
  if (!base)
    throw new ApiError('VALIDATION_ERROR', 'Nomdan slug yasab bo`lmadi, uni qo`lda kiriting');

  const { rows } = await pool.query<{ slug: string }>(`SELECT slug FROM categories`);
  const slug = uniqueSlug(base, new Set(rows.map((row) => row.slug)));
  if (!slug) throw new ApiError('ALREADY_EXISTS', 'Bunday nomli kategoriya juda ko`p, slug kiriting');
  return slug;
}

/** `parentId` haqiqiy kategoriyami — aks holda daraxt buziladi. */
async function assertParent(parentId: string | null | undefined, selfId?: string): Promise<void> {
  if (!parentId) return;
  if (parentId === selfId) throw new ApiError('VALIDATION_ERROR', 'Kategoriya o`ziga bola bo`la olmaydi');
  const { rows } = await pool.query<{ parent_id: string | null }>(
    `SELECT parent_id FROM categories WHERE id = $1`,
    [parentId],
  );
  const parent = rows[0];
  if (!parent) throw new ApiError('VALIDATION_ERROR', 'Ota-kategoriya topilmadi');
  // Ikki bosqichdan chuqur daraxt UI'da chalkashtiradi: ildiz → bola, bas
  if (parent.parent_id !== null) {
    throw new ApiError('VALIDATION_ERROR', 'Faqat ikki bosqich: ildiz va uning ostidagi kategoriya');
  }
}

export async function createCategory(input: CategoryCreateInput): Promise<AdminCategoryDto> {
  await assertParent(input.parentId ?? null);
  const slug = await resolveSlug(input.name, input.slug);

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO categories (parent_id, slug, name, icon, slot, gender, size_type, sort_order, is_active)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      input.parentId ?? null,
      slug,
      JSON.stringify(input.name),
      input.icon ?? null,
      input.slot ?? null,
      input.gender,
      input.sizeType ?? null,
      input.sortOrder,
      input.isActive,
    ],
  );
  return getCategory(rows[0]!.id);
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<AdminCategoryDto> {
  const current = await getCategory(id);
  if (input.parentId !== undefined) await assertParent(input.parentId, id);

  // Slug faqat ochiq yuborilganda o'zgaradi — eski havolalar buzilmasin
  let slug = current.slug;
  if (input.slug !== undefined && input.slug !== current.slug) {
    slug = await resolveSlug(input.name ?? current.name, input.slug);
  }

  await pool.query(
    `UPDATE categories
        SET parent_id = $2, slug = $3, name = $4::jsonb, icon = $5, slot = $6,
            gender = $7, size_type = $8, sort_order = $9, is_active = $10
      WHERE id = $1`,
    [
      id,
      input.parentId !== undefined ? input.parentId : current.parentId,
      slug,
      JSON.stringify(input.name ?? current.name),
      input.icon !== undefined ? input.icon : current.icon,
      input.slot !== undefined ? input.slot : current.slot,
      input.gender ?? current.gender,
      input.sizeType !== undefined ? input.sizeType : current.sizeType,
      input.sortOrder ?? current.sortOrder,
      input.isActive ?? current.isActive,
    ],
  );
  return getCategory(id);
}

/**
 * Ichki kategoriyasi yoki mahsuloti bor kategoriya o'chirilmaydi —
 * aks holda katalogda «egasiz» mahsulotlar qolardi. Admin uni o'rniga
 * NOFAOL qilishi mumkin (is_active=false).
 */
export async function deleteCategory(id: string): Promise<void> {
  const category = await getCategory(id);
  if (category.childCount > 0) {
    throw new ApiError('INVALID_STATE', 'Avval ichki kategoriyalarini o`chiring yoki ko`chiring');
  }
  if (category.productCount > 0) {
    throw new ApiError(
      'INVALID_STATE',
      `Bu kategoriyada ${category.productCount} ta mahsulot bor. Avval ularni ko'chiring yoki kategoriyani nofaol qiling.`,
    );
  }
  await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
}
