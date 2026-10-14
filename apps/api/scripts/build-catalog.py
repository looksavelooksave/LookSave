#!/usr/bin/env python3
"""
build-catalog.py — seed-real-catalog.ts uchun catalog.json yasaydi.

Mahsulot ma'lumoti va RASMLARI ikki ochiq, keyless manbadan olinadi
(ishlaydigan, barqaror CDN, haqiqiy mahsulot fotosi):
  • dummyjson.com  — ko'ylak, poyabzal, soat, sumka, ko'zoynak, ayol toplari
  • fakestoreapi.com — kurtka/hudi bo'shlig'ini to'ldirish uchun

Chiqish: apps/api/scripts/catalog.json  (seed-real-catalog.ts o'qiydi)

⚠️ ownerPhone — PROD'da MAVJUD sotuvchi akkaunt telefoni bo'lishi SHART.
   Hozir namuna qiymat qo'yilgan; ishga tushirishdan oldin to'g'rilang.

Ishga tushirish:
   python3 apps/api/scripts/build-catalog.py
"""

import json
import subprocess

UA = "LookSave-seed/1.0 (catalog builder)"
USD_TO_UZS = 12600  # ~2026 taxminiy kurs


def fetch(url: str):
    # curl ishlatiladi — macOS Python'ning SSL sertifikat muammosini chetlab o'tadi
    out = subprocess.run(
        ["curl", "-sS", "-m", "30", "-A", UA, "-L", url],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)


# Kategoriya bo'yicha realistik UZS narx chegarasi (min, max).
# Manba USD narxlari (ayniqsa luks soat/sumka) portlab ketmasligi uchun.
PRICE_BAND = {
    "tshirt": (99_000, 450_000),
    "shirt": (149_000, 650_000),
    "hoodie": (229_000, 750_000),
    "jacket": (399_000, 1_900_000),
    "sneakers": (349_000, 2_200_000),
    "dress-shoes": (449_000, 1_900_000),
    "boots": (449_000, 1_900_000),
    "sandals": (149_000, 700_000),
    "watch": (399_000, 4_900_000),
    "bag": (299_000, 2_900_000),
    "glasses": (149_000, 1_200_000),
}


def uzs(usd: float, cat: str | None = None) -> str:
    """USD narxni UZS ga o'girib, kategoriyaga mos realistik oraliqqa qisadi."""
    val = round(usd * USD_TO_UZS / 1000) * 1000
    if cat and cat in PRICE_BAND:
        lo, hi = PRICE_BAND[cat]
        val = min(max(val, lo), hi)
    return str(int(val))


def sizes_for(slot: str, seed: int):
    """Slotga mos o'lcham + qoldiq (deterministik, seed bo'yicha)."""
    if slot == "clothing":
        pool = ["S", "M", "L", "XL"]
    elif slot == "shoes":
        pool = ["40", "41", "42", "43", "44"]
    else:  # onesize: watch, bag, glasses
        return [{"size": "onesize", "stock": 6 + (seed % 10)}]
    out = []
    for i, s in enumerate(pool):
        # 0..14 oralig'ida, lekin hech biri 0 bo'lmasin (hammasi omborda bor)
        stock = 3 + ((seed * 7 + i * 11) % 12)
        out.append({"size": s, "stock": stock})
    return out


def pick(title: str, mapping: dict, default: str) -> str:
    t = title.lower()
    for kw, val in mapping.items():
        if kw in t:
            return val
    return default


# ── Rang palitrasi (title'dan rang topilmasa — kategoriyaga qarab) ──
COLOR = {
    "white": ("#FFFFFF", {"uz": "Oq", "ru": "Белый", "en": "White"}),
    "black": ("#111111", {"uz": "Qora", "ru": "Чёрный", "en": "Black"}),
    "blue": ("#1E3A5F", {"uz": "Ko'k", "ru": "Синий", "en": "Blue"}),
    "red": ("#C0392B", {"uz": "Qizil", "ru": "Красный", "en": "Red"}),
    "green": ("#2E7D52", {"uz": "Yashil", "ru": "Зелёный", "en": "Green"}),
    "brown": ("#6B4A2B", {"uz": "Jigarrang", "ru": "Коричневый", "en": "Brown"}),
    "grey": ("#6E7076", {"uz": "Kulrang", "ru": "Серый", "en": "Grey"}),
    "gray": ("#6E7076", {"uz": "Kulrang", "ru": "Серый", "en": "Grey"}),
}


def color_for(title: str):
    t = title.lower()
    for kw, (hx, name) in COLOR.items():
        if kw in t:
            return hx, name
    return None, None


# style teg (GARMENT_STYLES: casual, sport, streetwear, classic, minimal)
STYLE_BY_CAT = {
    "tshirt": "casual",
    "shirt": "classic",
    "hoodie": "streetwear",
    "jacket": "streetwear",
    "sneakers": "sport",
    "dress-shoes": "classic",
    "boots": "streetwear",
    "sandals": "casual",
    "watch": "minimal",
    "bag": "minimal",
    "glasses": "minimal",
}


# ── Brend nomlarini tozalash (qalbaki tovar taassurotidan qochish) ──
# Manba (test) datasetlarda real brendlar bor: Rolex $390 da = App Review xavfi.
BRANDS = [
    "rolex", "nike", "puma", "adidas", "prada", "gucci", "calvin klein",
    "heshe", "gigabyte", "aorus", "submariner", "datejust", "cellini",
    "oyster", "air jordan", "jordan", "future rider", "fjallraven", "sandisk",
]
UZ_CAT_NAME = {
    "tshirt": "Futbolka", "shirt": "Ko'ylak", "hoodie": "Hudi", "jacket": "Kurtka",
    "sneakers": "Krossovka", "dress-shoes": "Tufli", "boots": "Botinka",
    "sandals": "Sandal", "watch": "Qo'l soati", "bag": "Sumka", "glasses": "Ko'zoynak",
}
_seen_titles: set[str] = set()


def clean_title(title: str, cat: str, color_name, seed: int) -> str:
    """Brend bo'lsa generik UZ nomga almashtiradi; nomlar global noyob."""
    low = title.lower()
    if any(b in low for b in BRANDS):
        base = UZ_CAT_NAME.get(cat, "Mahsulot")
        col = (color_name or {}).get("uz") if color_name else None
        title = f"{col} {base.lower()}" if col else base
    title = " ".join(title.split()).strip()
    # global noyoblik — seed xato dedupni oldini oladi
    key = title.lower()
    if key in _seen_titles:
        n = 2
        while f"{key} {n}" in _seen_titles:
            n += 1
        title = f"{title} {n}"
        key = title.lower()
    _seen_titles.add(key)
    return title


def make_product(title, desc, cat, gender, price_usd, discount, images, seed):
    slot = (
        "clothing"
        if cat in ("tshirt", "shirt", "hoodie", "jacket")
        else "shoes"
        if cat in ("sneakers", "dress-shoes", "boots", "sandals")
        else "onesize"
    )
    hx, cname = color_for(title)
    clean = clean_title(title, cat, cname, seed)
    # tavsifda brend bo'lsa — tashlab yuboramiz (brend sizib chiqmasin)
    desc_low = (desc or "").lower()
    if any(b in desc_low for b in BRANDS):
        desc = None
    imgs = [i for i in images if i][:4]
    while len(imgs) < 3 and imgs:  # tekshiruvga kamida 3 ta kerak
        imgs.append(imgs[-1])
    base = uzs(price_usd, cat)
    p = {
        "title": clean,
        "description": (desc or "").strip()[:280] or None,
        "categorySlug": cat,
        "gender": gender,
        "basePrice": base,
        "images": imgs,
        "tags": [STYLE_BY_CAT.get(cat, "casual")],
        "sizes": sizes_for(slot, seed),
    }
    if discount and discount > 0:
        orig = price_usd / (1 - min(discount, 60) / 100)
        old = uzs(orig, cat)
        # chegaraga qisilgach eski narx baza bilan teng bo'lib qolmasin
        if int(old) > int(base):
            p["oldPrice"] = old
    if hx:
        p["colorHex"] = hx
        p["colorName"] = cname
    return p


def from_dummy(cat_slug, map_cat, gender):
    """dummyjson kategoriyasidan mahsulotlar."""
    data = fetch(f"https://dummyjson.com/products/category/{cat_slug}?limit=0")
    out = []
    for it in data.get("products", []):
        title = it["title"]
        cat = map_cat(title) if callable(map_cat) else map_cat
        if cat is None:
            continue
        out.append(
            make_product(
                title,
                it.get("description"),
                cat,
                gender,
                float(it.get("price", 0)),
                float(it.get("discountPercentage", 0) or 0),
                it.get("images", []),
                it["id"],
            )
        )
    return out


def from_fakestore(category, title_map, gender):
    data = fetch(
        "https://fakestoreapi.com/products/category/" + urllib.parse.quote(category)
    )
    out = []
    for it in data:
        title = it["title"]
        cat = title_map(title)
        if cat is None:
            continue
        out.append(
            make_product(
                title,
                it.get("description"),
                cat,
                gender,
                float(it.get("price", 0)),
                0,
                [it.get("image")],
                it["id"],
            )
        )
    return out


import urllib.parse  # noqa: E402

# ── Mahsulotlarni yig'ish ──
men_shirts = from_dummy(
    "mens-shirts",
    lambda t: "tshirt" if ("tshirt" in t.lower() or "t-shirt" in t.lower()) else "shirt",
    "male",
)
men_shoes = from_dummy(
    "mens-shoes",
    lambda t: pick(t, {"boot": "boots", "formal": "dress-shoes", "loafer": "dress-shoes", "oxford": "dress-shoes"}, "sneakers"),
    "male",
)
men_watches = from_dummy("mens-watches", "watch", "male")
women_shoes = from_dummy(
    "womens-shoes",
    lambda t: pick(t, {"heel": "dress-shoes", "sandal": "sandals", "boot": "boots", "pump": "dress-shoes"}, "sneakers"),
    "female",
)
women_bags = from_dummy("womens-bags", "bag", "female")
women_watches = from_dummy("womens-watches", "watch", "female")
# ⚠️ dummyjson "tops" aslida ko'ylak/frock (dress) — LookSave'da dress kategoriyasi
# yo'q, shuning uchun ishlatilmaydi (tshirt deb belgilash noto'g'ri bo'lardi).
sunglasses = from_dummy("sunglasses", "glasses", "unisex")

men_clothing = from_fakestore(
    "men's clothing",
    lambda t: pick(t.lower(), {"jacket": "jacket", "tshirt": "tshirt", "t-shirt": "tshirt", "slim fit": "shirt", "shirt": "shirt"}, None),
    "male",
)
women_clothing = from_fakestore(
    "women's clothing",
    lambda t: pick(t.lower(), {"hooded": "hoodie", "jacket": "jacket", "snowboard": "jacket", "windbreaker": "jacket", "rain": "jacket", "t shirt": "tshirt", "t-shirt": "tshirt", "shirt": "shirt"}, None),
    "female",
)

# ── Do'konlar (haqiqiy Toshkent tumanlari/koordinatalari) ──
# Har do'konga mavjud mahsulotlardan logotip (birinchi rasm) beriladi.
def logo(products):
    return products[0]["images"][0] if products else None


stores = [
    {
        "name": "Milano Moda",
        "slug": "milano-moda",
        "city": "Toshkent",
        "address": "Yunusobod tumani, Amir Temur ko'chasi 108",
        "landmark": "Yunusobod metrosi yonida",
        "phone": "+998901110201",
        "lat": 41.3615, "lng": 69.2897,
        "description": "Erkaklar uchun ko'ylak, futbolka va kurtkalar",
        "products": men_shirts + men_clothing,
    },
    {
        "name": "Qadam Oyoq Kiyim",
        "slug": "qadam-shoes",
        "city": "Toshkent",
        "address": "Chilonzor tumani, Bunyodkor shoh ko'chasi 12",
        "landmark": "Chilonzor metrosi",
        "phone": "+998901110202",
        "lat": 41.2756, "lng": 69.2039,
        "description": "Erkak va ayollar uchun krossovka, tufli, botinka",
        "products": men_shoes + women_shoes,
    },
    {
        "name": "Vaqt Aksessuar",
        "slug": "vaqt-accessories",
        "city": "Toshkent",
        "address": "Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 45",
        "landmark": "Oybek metrosi",
        "phone": "+998901110203",
        "lat": 41.3275, "lng": 69.3412,
        "description": "Soat, ko'zoynak va premium aksessuarlar",
        "products": men_watches + sunglasses,
    },
    {
        "name": "Ayol Butik",
        "slug": "ayol-butik",
        "city": "Toshkent",
        "address": "Yakkasaroy tumani, Shota Rustaveli ko'chasi 24",
        "landmark": "Yakkasaroy bozori yonida",
        "phone": "+998901110204",
        "lat": 41.2850, "lng": 69.2550,
        "description": "Ayollar uchun futbolka, kurtka, hudi va soat",
        "products": women_clothing + women_watches,
    },
    {
        "name": "Sumka Gallery",
        "slug": "sumka-gallery",
        "city": "Toshkent",
        "address": "Shayxontohur tumani, Navoiy ko'chasi 30",
        "landmark": "Chorsu bozori yaqinida",
        "phone": "+998901110205",
        "lat": 41.3200, "lng": 69.2200,
        "description": "Ayollar sumkalari",
        "products": women_bags,
    },
]
for s in stores:
    lg = logo(s["products"])
    if lg:
        s["logoUrl"] = lg
    s["currency"] = "UZS"

catalog = {
    # ⚠️ PROD'da MAVJUD sotuvchi akkaunt telefoni bo'lsin!
    "ownerPhone": "+998936558959",
    "stores": stores,
}

out_path = __file__.rsplit("/", 1)[0] + "/catalog.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

total = sum(len(s["products"]) for s in stores)
print(f"✓ catalog.json yozildi: {len(stores)} do'kon, {total} mahsulot")
for s in stores:
    cats = {}
    for p in s["products"]:
        cats[p["categorySlug"]] = cats.get(p["categorySlug"], 0) + 1
    print(f"  · {s['name']}: {len(s['products'])} ta — {cats}")
