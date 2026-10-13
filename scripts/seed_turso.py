import urllib.request
import json
import hashlib
import os

TURSO_URL = "https://wmquicksearch-tiendung14b.aws-ap-northeast-1.turso.io/v2/pipeline"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE5MDk3MzIsImlkIjoiMDFhMTM2MjQtN2QwMS03ZTg5LWEzZmEtNWVhZmM3NGZjNDhmIiwia2lkIjoidGc1eGpzeWtfU0dWNG1XQ2tKMU1CdzJFUnBNTFBmWUowbTFLM0Itc3hnWSIsInJpZCI6IjU0NTc5ZWI4LTRlYjQtNDlmZS05YmYyLTJkZGU3MDYzN2FhYyJ9.eyFaQWxaJlnv3JltIATntLd_KXToSDXwtMU000_OqdtLD_EWHKpKgS4Wlhb77nMMXp2fpOreqwa8UP9H4kk5Cg"

headers = {
    "Authorization": f"Bearer {TURSO_TOKEN}",
    "Content-Type": "application/json"
}

def execute_statements(stmts):
    requests = [{"type": "execute", "stmt": {"sql": s[0], "args": [{"type": "text", "value": str(v)} if isinstance(v, str) else {"type": "integer", "value": int(v)} for v in s[1]] if len(s) > 1 else []}} for s in stmts]
    requests.append({"type": "close"})
    
    data = json.dumps({"requests": requests}).encode("utf-8")
    req = urllib.request.Request(TURSO_URL, data=data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res

# 1. Create tables
schema_stmts = [
    ["DROP TABLE IF EXISTS products;"],
    ["""
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plu TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT DEFAULT 'kg',
        image_url TEXT DEFAULT '',
        image_public_id TEXT DEFAULT '',
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', '+7 hours')),
        updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
    );
    """],
    ["CREATE INDEX idx_products_plu ON products(plu);"],
    ["CREATE INDEX idx_products_category ON products(category);"],
    ["DROP TABLE IF EXISTS users;"],
    ["""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT (datetime('now', '+7 hours'))
    );
    """],
    ["DROP TABLE IF EXISTS app_settings;"],
    ["""
    CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
    );
    """]
]

print("Executing schema...")
res = execute_statements(schema_stmts)
print("Schema created:", [r.get("type") for r in res.get("results", [])])

# 2. Hash password wm123 with PBKDF2
salt = "eb79e264d7acc262c7f149159a521466"
key = hashlib.pbkdf2_hmac("sha256", b"wm123", salt.encode("utf-8"), 100000).hex()
user_stmt = [
    ["INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?);", ["wm_admin", key, salt, "admin"]]
]
res = execute_statements(user_stmt)
print("User wm_admin created:", res.get("results", [])[0].get("type"))

# Store default settings
settings_stmts = [
    ["INSERT INTO app_settings (key, value) VALUES (?, ?);", ["cloudinary_token", "WvyrN70XVe0uR1VFDJOdkzDX6iU"]],
    ["INSERT INTO app_settings (key, value) VALUES (?, ?);", ["app_title", "WinMart PLU Quick Search"]]
]
execute_statements(settings_stmts)

# 3. Seed data
raw_products = [
    # --- Trái Cây Nội ---
    ("46040", "Bơ sáp (tròn)", "Trái Cây Nội", "kg", ""),
    ("47127", "Bơ sáp (Boot)", "Trái Cây Nội", "kg", ""),
    ("46683", "Chuối vàng", "Trái Cây Nội", "kg", ""),
    ("46193", "Đu đủ ruột đỏ", "Trái Cây Nội", "kg", ""),
    ("46652", "Dưa hấu Hắc Mỹ Nhân", "Trái Cây Nội", "kg", ""),
    ("46205", "Dưa hấu không hạt", "Trái Cây Nội", "kg", ""),
    ("46204", "Dưa hấu Nhật", "Trái Cây Nội", "kg", ""),
    ("46196", "Dứa khóm", "Trái Cây Nội", "kg", ""),
    ("48234", "Roi (Mận)", "Trái Cây Nội", "kg", ""),
    ("46670", "Thanh long trắng", "Trái Cây Nội", "kg", ""),
    ("46581", "Thanh long đỏ", "Trái Cây Nội", "kg", ""),
    ("46624", "Xoài giống Úc", "Trái Cây Nội", "kg", ""),
    ("46623", "Xoài đài Đài Loan", "Trái Cây Nội", "kg", ""),
    ("48216", "Bưởi 5 Roi", "Trái Cây Nội", "quả", ""),
    ("46060", "Bưởi hồng da xanh", "Trái Cây Nội", "quả", ""),
    ("46162", "Chuối Tây", "Trái Cây Nội", "kg", ""),
    ("46424", "Ổi lê", "Trái Cây Nội", "kg", ""),
    ("46219", "Dưa Lê trắng", "Trái Cây Nội", "kg", ""),
    ("48746", "Dưa lưới Huỳnh Long", "Trái Cây Nội", "quả", ""),
    ("48113", "Dưa lưới vàng ruột cam", "Trái Cây Nội", "quả", ""),
    ("40277", "Dưa lưới Ichiban (xanh)", "Trái Cây Nội", "quả", ""),
    ("43235", "Dưa lê kim Cô Nương", "Trái Cây Nội", "quả", ""),
    ("46809", "Mít cắt miếng", "Trái Cây Nội", "khay", ""),
    ("48218", "Cam sành loại 1", "Trái Cây Nội", "kg", ""),
    ("46312", "Lê - Mắc - Cọp", "Trái Cây Nội", "kg", ""),
    ("48863", "Ổi Di Trạch", "Trái Cây Nội", "kg", ""),
    ("47289", "Xoài Cát Chu (PB)", "Trái Cây Nội", "kg", ""),
    ("46249", "Hồng Giòn", "Trái Cây Nội", "kg", ""),
    ("49030", "Lê mật TQ", "Trái Cây Nội", "kg", ""),
    ("47690", "Lựu hạt đỏ TQ", "Trái Cây Nội", "kg", ""),
    ("47152", "Bưởi Phúc Trạch (Quả)", "Trái Cây Nội", "quả", ""),
    ("46727", "Quýt đường VietGap", "Trái Cây Nội", "kg", ""),
    ("46682", "Mận đỏ Đường", "Trái Cây Nội", "kg", ""),
    ("49111", "Nho xanh Muscat TQ", "Trái Cây Nội", "kg", ""),
    ("47155", "Dưa lưới dài ruột cam", "Trái Cây Nội", "kg", ""),
    ("47163", "Xoài keo bao vàng", "Trái Cây Nội", "kg", ""),
    ("46627", "Xoài Tứ Quý", "Trái Cây Nội", "kg", ""),

    # --- Trái Cây Nhập Khẩu ---
    ("46543", "Táo Jazz Mỹ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46529", "WMNK Táo Queen NZL", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46520", "Táo Envy Mỹ size 88-100", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46522", "Táo Envy NZL size lớn", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46541", "WMNK Táo Royal Gala", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46526", "Táo Candine Pháp", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46550", "Táo Juliet Organic (xx Pháp)", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46506", "Táo Ambrosia NZL", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46604", "Táo Braeburn NZL", "Trái Cây Nhập Khẩu", "kg", ""),
    ("47694", "Táo Tessa Hà Lan", "Trái Cây Nhập Khẩu", "kg", ""),
    ("48181", "Táo Organic Fuji NZL", "Trái Cây Nhập Khẩu", "kg", ""),
    ("48436", "Táo Fuji Nam Phi nhỏ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46144", "Cherry đỏ Mỹ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46412", "Nho xanh không hạt Mỹ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46523", "Táo Envy NZL 88-100", "Trái Cây Nhập Khẩu", "kg", ""),
    ("49112", "Nho đỏ có hạt TQ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("49116", "Nho đỏ không hạt TQ (500g)", "Trái Cây Nhập Khẩu", "hộp", ""),
    ("49118", "WMNK Nho đỏ có hạt TQ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46544", "Táo Jazz NZL", "Trái Cây Nhập Khẩu", "kg", ""),
    ("49107", "WMNK Nho đỏ không hạt TQ", "Trái Cây Nhập Khẩu", "kg", ""),
    ("49111-T", "Nho Muscat túi", "Trái Cây Nhập Khẩu", "túi", "Mã 49111"),
    ("48212", "Lê nâu Trung Quốc", "Trái Cây Nhập Khẩu", "kg", ""),
    ("48273", "WMNK Lê Nam Phi", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46693", "Lê Tai Nung", "Trái Cây Nhập Khẩu", "kg", ""),
    ("47136", "Cam Úc (ruột vàng)", "Trái Cây Nhập Khẩu", "kg", ""),
    ("47133", "WMNK Quýt Úc", "Trái Cây Nhập Khẩu", "kg", ""),
    ("46302", "WMNK Lê Hàn Quốc", "Trái Cây Nhập Khẩu", "kg", ""),

    # --- Rau Củ ---
    ("46022", "Bắp cải trắng", "Rau Củ", "kg", ""),
    ("46098", "Cải thảo", "Rau Củ", "kg", ""),
    ("46037", "Bí xanh", "Rau Củ", "kg", ""),
    ("46168", "Củ cải trắng", "Rau Củ", "kg", ""),
    ("46074", "Cà rốt", "Rau Củ", "kg", ""),
    ("40095", "WinEco Xà lách Lolo Xanh", "Rau Củ", "gói", ""),
    ("46343", "Mướp", "Rau Củ", "kg", ""),
    ("49097", "FRESH+ Quả Mướp", "Rau Củ", "kg", ""),
    ("46344", "Mướp Nhật", "Rau Củ", "kg", ""),
    ("40143", "WINECO Mướp đắng 1L", "Rau Củ", "kg", ""),
    ("49093", "FRESH+ Mướp đắng", "Rau Củ", "kg", ""),
    ("46499", "Su su", "Rau Củ", "kg", ""),
    ("48968", "FRESH+ Su su", "Rau Củ", "kg", ""),
    ("46612", "Xà lách lolo xanh", "Rau Củ", "kg", ""),
    ("46272", "Khoai lang giống Nhật", "Rau Củ", "kg", ""),
    ("46498", "Su hào", "Rau Củ", "kg", ""),
    ("46075", "Cà tím dài", "Rau Củ", "kg", ""),
    ("46054", "Bí ngồi xanh", "Rau Củ", "kg", ""),

    # --- Thịt & Món Chế Biến ---
    ("30196", "Thịt bê rút xương HN", "Thịt & Món Chế Biến", "kg", ""),
    ("30992", "Vịt om sấu", "Thịt & Món Chế Biến", "phần", ""),
    ("30391", "Chim bồ câu", "Thịt & Món Chế Biến", "con", ""),

    # --- Thuỷ Hải Sản ---
    ("51018", "Cá trắm cắt khúc khay", "Thuỷ Hải Sản", "khay", ""),
    ("50860", "Cá basa cắt khúc", "Thuỷ Hải Sản", "kg", ""),
    ("50146", "Cá rô phi fillet", "Thuỷ Hải Sản", "kg", ""),
    ("50882", "Cá bống thừng nướng", "Thuỷ Hải Sản", "kg", ""),
    ("50923", "Cá nục nướng", "Thuỷ Hải Sản", "kg", ""),
    ("70298", "Cá bống thừng", "Thuỷ Hải Sản", "kg", ""),
    ("50773", "Cá hồng biển tươi BĐ", "Thuỷ Hải Sản", "kg", ""),
    ("70321", "Cá nục bỏ đầu", "Thuỷ Hải Sản", "kg", ""),
    ("50866", "Cá lóc cắt khúc", "Thuỷ Hải Sản", "kg", ""),
    ("50581", "Cá bạc má nướng", "Thuỷ Hải Sản", "kg", ""),
    ("50876", "Cá rô phi diêu hồng", "Thuỷ Hải Sản", "kg", ""),
    ("50567", "Cá thu nướng MV", "Thuỷ Hải Sản", "kg", ""),
    ("50903", "Lườn cá hồi", "Thuỷ Hải Sản", "kg", ""),
    ("50196", "Cá diêu hồng", "Thuỷ Hải Sản", "kg", ""),
    ("50154", "Cá Hồi Nauy Filet", "Thuỷ Hải Sản", "kg", ""),
    ("50947", "Cá Hồi Úc Filet", "Thuỷ Hải Sản", "kg", ""),

    # --- Bánh Kẹo & Thạch ---
    ("60047", "Thạch NEW CHOICE", "Bánh Kẹo & Thạch", "gói", ""),
    ("60550", "Đức Hạnh rau câu Zai Zai (dài)", "Bánh Kẹo & Thạch", "gói", ""),
    ("60658", "Đức Hạnh thạch trà sữa trân châu", "Bánh Kẹo & Thạch", "gói", "Dài"),
    ("60459", "Đức Hạnh thạch rau câu Zai Zai (ngắn)", "Bánh Kẹo & Thạch", "gói", ""),
    ("60763", "LUXUHI kẹo dẻo mix hình", "Bánh Kẹo & Thạch", "gói", ""),
    ("60764", "LUXUHI kẹo rollies fruit tape", "Bánh Kẹo & Thạch", "gói", ""),
    ("60767", "LUXUHI thạch hút trái cây", "Bánh Kẹo & Thạch", "túi", ""),
    ("60840", "RISEN Thạch Conrodito Mix", "Bánh Kẹo & Thạch", "gói", ""),
    ("60839", "RISEN Bánh Yogurt Choco", "Bánh Kẹo & Thạch", "hộp", ""),
    ("60837", "RISEN kẹo dẻo Hotdog", "Bánh Kẹo & Thạch", "gói", ""),
    ("60850", "RISEN bánh Quy Cốc Socola 11g", "Bánh Kẹo & Thạch", "cốc", ""),
    ("60886", "RISEN Lương khô Mix Vị", "Bánh Kẹo & Thạch", "hộp", "")
]

print(f"Total products to seed: {len(raw_products)}")

# Batch in chunks of 25 for fast execution
chunk_size = 25
for i in range(0, len(raw_products), chunk_size):
    chunk = raw_products[i:i + chunk_size]
    stmts = [
        ["INSERT INTO products (plu, name, category, unit, note) VALUES (?, ?, ?, ?, ?);", [p[0], p[1], p[2], p[3], p[4]]]
        for p in chunk
    ]
    res = execute_statements(stmts)
    print(f"Inserted chunk {i//chunk_size + 1}: {len(chunk)} rows")

# Verify count
count_res = execute_statements([["SELECT COUNT(*) as count FROM products;"]])
row = count_res.get("results", [])[0].get("response", {}).get("result", {}).get("rows", [])
print(f"Products in DB count: {row}")
