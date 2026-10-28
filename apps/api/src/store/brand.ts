import type { StoreBrandInput } from '@looksave/validation';

import { pool } from '../db/pool';
import { ApiError } from '../http/api-error';
import { slugify, uniqueSlug } from './slug';

/**
 * Sotuvchining O'Z brandi (033_brand_owner.sql). Har sotuvchida bitta:
 * `brands.owner_id = userId`. Admin yaratgan brendlarda owner_id = NULL.
 *
 * ⚠️ USERNAME BUTUN BRENDLAR BO'YICHA NOYOB. Band bo'lsa unique indeks
 * `23505` beradi — oldindan tekshirilmaydi (ikki so'rov orasida band
 * bo'lib qolmasligi uchun).
 */

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  username: string | null;
  logo_url: string | null;
  description: string | null;
}

export interface StoreBrandDto {
  id: string;
  name: string;
  slug: string;
  username: string | null;
  logoUrl: string | null;
  description: string | null;
}

function toDto(row: BrandRow): StoreBrandDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    username: row.username,
    logoUrl: row.logo_url,
    description: row.description,
  };
}

const COLUMNS = 'id, name, slug, username, logo_url, description';

/** Sotuvchining brandi (yo'q bo'lsa `null`). */
export async function getMyBrand(userId: string): Promise<StoreBrandDto | null> {
  const { rows } = await pool.query<BrandRow>(
    `SELECT ${COLUMNS} FROM brands WHERE owner_id = $1`,
    [userId],
  );
  return rows[0] ? toDto(rows[0]) : null;
}

/** Brand egasining id'sini qaytaradi (mahsulotга bog'lash uchun). */
export async function myBrandId(userId: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM brands WHERE owner_id = $1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

async function resolveSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  if (!base) throw new ApiError('VALIDATION_ERROR', 'Nomdan slug yasab bo`lmadi');
  const { rows } = await pool.query<{ slug: string }>(
    `SELECT slug FROM brands WHERE id <> $1`,
    [excludeId ?? '00000000-0000-0000-0000-000000000000'],
  );
  const slug = uniqueSlug(base, new Set(rows.map((row) => row.slug)));
  if (!slug) throw new ApiError('ALREADY_EXISTS', 'Bunday nomli brendlar ko`p — nomni o`zgartiring');
  return slug;
}

/**
 * Sotuvchining brandini yaratadi yoki yangilaydi (bitta upsert oqimi).
 * Panel bitta "Saqlash" tugmasi bilan ishlaydi — birinchi safar yaratadi,
 * keyingilarida yangilaydi.
 */
export async function saveMyBrand(userId: string, input: StoreBrandInput): Promise<StoreBrandDto> {
  const existing = await getMyBrand(userId);
  try {
    if (existing) {
      const slug =
        input.name === existing.name ? existing.slug : await resolveSlug(input.name, existing.id);
      await pool.query(
        `UPDATE brands
            SET name = $2, slug = $3, username = $4, logo_url = $5, description = $6
          WHERE id = $1`,
        [
          existing.id,
          input.name,
          slug,
          input.username,
          input.logoUrl ?? null,
          input.description ?? null,
        ],
      );
      return (await getMyBrand(userId))!;
    }

    const slug = await resolveSlug(input.name);
    await pool.query(
      `INSERT INTO brands (name, slug, username, logo_url, description, owner_id, is_partner)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [input.name, slug, input.username, input.logoUrl ?? null, input.description ?? null, userId],
    );
    return (await getMyBrand(userId))!;
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
      throw new ApiError('ALREADY_EXISTS', 'Bu @username band — boshqasini tanlang');
    }
    throw err;
  }
}
