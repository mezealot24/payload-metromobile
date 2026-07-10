# Promotion Import via Payload Local API

สคริปต์นี้ใช้สำหรับตรวจและอัปโหลดข้อมูล Promotion แบบ batch ผ่าน Payload Local API โดย upsert ด้วย `slug` และไม่เรียก REST endpoint ภายนอก

## ไฟล์ที่เกี่ยวข้อง

- `scripts/upsert-promotions.ts` — CLI สำหรับ validate / upsert / publish
- `scripts/lib/promotion-import.ts` — validator และ normalizer ของ Promotion payload
- `scripts/lib/promotion-import.test.ts` — regression tests สำหรับ schema และ safety rules
- `scripts/data/promotions-jul-2026.json` — แคมเปญ RÊVER เดือนกรกฎาคม 2569 จำนวน 10 รุ่น

## Safety defaults

- รันโดยไม่ใส่ flag จะเป็น **dry-run**: อ่านไฟล์, ตรวจ schema และพิมพ์แผนเท่านั้น
- `--apply` จะ upsert เป็น **Draft**
- `--apply --publish` จึงจะ Publish และทำให้ hook revalidation ทำงาน
- สคริปต์รับเฉพาะ field ที่รองรับและตัด `heroMedia` / `gallery` ออกจาก input เสมอ จึงไม่เขียนทับรูปที่เลือกไว้ใน Admin
- ถ้าพบเอกสารมากกว่า 1 รายการที่มี slug เดียวกัน สคริปต์จะหยุดแทนการเดาว่าควรแก้รายการใด
- schema เก่า เช่น `variants`, benefit แบบ `{ text }` หรือ conditions แบบ `string[]` จะไม่ผ่าน validation

## คำสั่งเดือนกรกฎาคม 2569

```bash
# 1) รัน regression tests
pnpm test:promotions

# 2) Validate และดูแผน โดยยังไม่เขียนฐานข้อมูล
pnpm promotions:jul-2026

# 3) Upsert เป็น Draft เพื่อให้ทีมตรวจใน Payload Admin
pnpm promotions:jul-2026 -- --apply

# 4) Publish หลังตรวจข้อมูลและรูป Hero/Gallery แล้ว
pnpm promotions:jul-2026 -- --apply --publish
```

## ใช้กับไฟล์เดือนอื่น

```bash
pnpm exec tsx scripts/upsert-promotions.ts --file scripts/data/promotions-aug-2026.json
pnpm exec tsx scripts/upsert-promotions.ts --file scripts/data/promotions-aug-2026.json --apply
pnpm exec tsx scripts/upsert-promotions.ts --file scripts/data/promotions-aug-2026.json --apply --publish
```

## ขั้นตอนตรวจใน Admin ก่อน Publish

1. เปิด `Promotions` และตรวจ title, model slug, dates และ pricing overrides
2. ตรวจ benefit/condition ให้ตรงกับหน้า RÊVER ที่อยู่ใน `detailUrl`
3. เลือก `heroMedia` และ gallery ให้ตรงรุ่น เพราะ importer ตั้งใจไม่แตะ media
4. ตรวจ SEO title/description และ Preview
5. Publish แล้วตรวจ log ของ `/api/revalidate/promotion`

## Model slugs

ข้อมูลใหม่ใช้ slug ให้ตรงกับ route ฝั่ง frontend เช่น `atto-3`, `sealion-7`, `seal-5-dm-i` และ `sealion-6-dm-i` ขณะที่ legacy slugs ยังถูกเก็บเป็นตัวเลือกใน Admin เพื่อไม่ให้เอกสารเก่าแก้ไขไม่ได้

หลัง checkout branch ที่มีการแก้ model options ให้ regenerate generated types ก่อน merge:

```bash
pnpm generate:types
pnpm exec tsc --noEmit
pnpm build
```
