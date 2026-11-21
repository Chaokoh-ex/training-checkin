# ระบบเช็คชื่อผู้เข้าอบรม

เว็บเช็คชื่อผู้เข้าอบรม (มา / ไม่มา / ลายเซ็น) ใช้ Supabase เก็บข้อมูลและล็อกอินด้วย Google

- ผู้ดูแล: ล็อกอินด้วย `chaokoh.ex@gmail.com` เท่านั้น (สิทธิ์อยู่ในตาราง `public.admins`)
- ผู้ตรวจสอบ: เปิดลิงก์ `?view=...` ได้โดยไม่ต้องล็อกอิน ดูอย่างเดียว
- Supabase project: `training-checkin` (`lxwykletjdcjkchjqpvt`, Singapore)

## ตั้งค่าครั้งแรก

1. **เปิด GitHub Pages**: Settings → Pages → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save
   เว็บจะอยู่ที่ `https://chaokoh-ex.github.io/training-checkin/`
2. **สร้าง Google OAuth Client** ที่ https://console.cloud.google.com/apis/credentials
   - Create credentials → OAuth client ID → Web application
   - Authorized redirect URI: `https://lxwykletjdcjkchjqpvt.supabase.co/auth/v1/callback`
3. **เปิด Google ใน Supabase**: Dashboard → Authentication → Sign In / Providers → Google → ใส่ Client ID และ Client Secret → Save
4. **ตั้ง URL ใน Supabase**: Authentication → URL Configuration
   - Site URL: `https://chaokoh-ex.github.io/training-checkin/`
   - Redirect URLs: เพิ่ม `https://chaokoh-ex.github.io/training-checkin/**`

## เพิ่มผู้ดูแลคนอื่น

```sql
insert into public.admins(email) values ('someone@gmail.com');
```
