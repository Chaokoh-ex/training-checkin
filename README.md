# เว็บเช็คชื่อผู้เข้าอบรม

เว็บเช็คชื่อออนไลน์ ใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์ กด "มา" แล้วเซ็นชื่อด้วยนิ้ว ปากกา หรือเมาส์ ข้อมูลเก็บในฐานข้อมูล Supabase (ทุกเครื่องเห็นตรงกัน) และส่งสำเนาไป **Google Sheets** ทุกครั้งที่กดบันทึก

## ไฟล์ในโฟลเดอร์นี้

```
index.html                   หน้าเว็บทั้งหมด
config.js                    ตั้งค่า (ใส่ URL ของ Google Sheet ที่นี่)
apps-script/Code.gs          โค้ดฝั่ง Google Sheets
apps-script/appsscript.json  ตั้งค่า Apps Script (เขตเวลากรุงเทพฯ)
README.md                    คู่มือนี้
```

## ลิงก์ใช้งาน

- **ลิงก์เช็คชื่อ** (แก้ไขได้): `https://chaokoh-ex.github.io/training-checkin/?k=<edit_key>`
- **ลิงก์ตรวจสอบ** (ดูอย่างเดียว): `https://chaokoh-ex.github.io/training-checkin/?k=<share_token>`
- เปิดโดยไม่มี `?k=` จะไม่เห็นข้อมูล ลิงก์เช็คชื่อเปรียบเหมือนรหัสผ่าน อย่าแชร์ในที่สาธารณะ

## ขั้นที่ 1: ขึ้น GitHub Pages

1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repository (รวมโฟลเดอร์ `apps-script`)
2. **Settings › Pages** › Source: *Deploy from a branch* › Branch: `main` / `(root)` › Save
3. รอประมาณ 1 นาที เว็บจะอยู่ที่ `https://<username>.github.io/<repo>/`

## ขั้นที่ 2: เชื่อม Google Sheets (ไม่บังคับ)

1. สร้าง Google Sheets ใหม่ เช่น ชื่อ "เช็คชื่ออบรม"
2. เมนู **ส่วนขยาย › Apps Script** ลบโค้ดเดิม แล้ววางเนื้อหาจาก `apps-script/Code.gs`
3. ไอคอนเฟือง **Project Settings**
   - ติ๊ก *Show "appsscript.json"* แล้ววางเนื้อหาจาก `apps-script/appsscript.json`
   - ส่วน **Script Properties** › Add property › ชื่อ `TOKEN` › ค่าเป็นรหัสที่ตั้งเอง เช่น `coconut2026`
4. กลับหน้า Editor เลือกฟังก์ชัน `setup` › กด **Run** › อนุญาตสิทธิ์ (Sheets + Drive สำหรับเก็บรูปลายเซ็น)
5. **Deploy › New deployment** › ประเภท **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด Deploy แล้วคัดลอก **Web app URL** (ลงท้าย `/exec`)
6. เปิด URL นั้นในเบราว์เซอร์ ควรเห็น `{"ok":true,...,"token_set":true}`
7. แก้ `config.js`:

```js
window.CHECKIN_CONFIG = {
  SHEET_URL: 'https://script.google.com/macros/s/xxxxxxxx/exec',
  SHEET_TOKEN: 'coconut2026',
  ...
};
```

8. อัปโหลด `config.js` ขึ้น GitHub อีกครั้ง รอ 1 นาทีแล้วรีเฟรชเว็บ
9. ในลิงก์เช็คชื่อจะมีปุ่ม **ส่งทั้งหมดไป Google Sheet** กดครั้งแรกเพื่อส่งรายชื่อทั้งหมดเข้า Sheet

## ข้อมูลที่ได้ใน Google Sheets

| ชีต | เนื้อหา |
|---|---|
| **บันทึกเวลา** | 1 แถวต่อการกด 1 ครั้ง: เวลาที่บันทึก, การกระทำ (มา/ไม่มา/ล้างสถานะ/เพิ่มชื่อ), ชื่อ, บริษัท, สถานะ, เวลาเซ็น, ลิงก์รูปลายเซ็น, อุปกรณ์ (มือถือ/แท็บเล็ต/คอมพิวเตอร์) |
| **สรุปรายชื่อ** | 1 แถวต่อ 1 คน แสดงสถานะล่าสุดเสมอ |

รูปลายเซ็นเก็บในโฟลเดอร์ Drive ชื่อ **ลายเซ็นผู้เข้าอบรม** (เป็นส่วนตัวของเจ้าของ Sheet) ถ้าไม่ต้องการ ให้ตั้ง `SAVE_SIGNATURE_TO_DRIVE = false` ใน `Code.gs`

## หมายเหตุ

- ข้อมูลหลักอยู่ใน Supabase เว็บยังทำงานได้แม้ Google Sheet มีปัญหา ถ้าข้อมูลใน Sheet ขาดหาย กด **ส่งทั้งหมดไป Google Sheet** เพื่อเติมให้ครบ
- แก้ `Code.gs` ภายหลัง ต้อง **Deploy › Manage deployments › แก้ไข › Version: New version** (URL เดิม)
- ใช้ได้กับ Chrome, Safari, Edge บนมือถือ แท็บเล็ต และคอมพิวเตอร์ หน้าจอแนวนอนบนมือถือจะซ่อนภาพต้นมะพร้าวเพื่อให้เห็นรายชื่อมากขึ้น
