-- Do'kon tumani — TZ 1-qism, 8 filtrdan 4-si.
--
-- Nullable: eski do'konlarda ma'lumot yo'q, sotuvchi profilida keyinroq
-- to'ldiradi. Shahar bilan birga filtrda ishlatiladi (case-insensitive).

ALTER TABLE stores ADD COLUMN district TEXT;

-- Shahar + tuman birgalikda tez-tez qidiriladi (filtr sheet'da ikkisi
-- birga): birgalikda indeks GIN gin_trgm_ops shart emas — tenglik
-- solishtiruviga oddiy btree yetadi.
CREATE INDEX stores_city_district_idx ON stores (country, lower(city), lower(district));
