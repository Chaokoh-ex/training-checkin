/*
 * ตั้งค่าเว็บเช็คชื่อ (แก้ไฟล์นี้ไฟล์เดียว)
 *
 * SHEET_URL   : URL ของ Google Apps Script Web App (ลงท้ายด้วย /exec) ดูวิธีทำใน README.md
 *               เว้นว่างไว้ = ไม่ส่งข้อมูลไป Google Sheet (เว็บยังใช้งานได้ปกติ)
 * SHEET_TOKEN : รหัสสั้นๆ ที่ตั้งเอง ต้องตรงกับ TOKEN ใน Script Properties ของ Apps Script
 *               (กันคนอื่นส่งข้อมูลมั่วเข้า Sheet)
 *
 * SUPABASE_URL / SUPABASE_ANON_KEY : ฐานข้อมูลหลักของเว็บ ไม่ต้องแก้
 * (anon key เป็นคีย์สาธารณะ ข้อมูลถูกป้องกันด้วยลิงก์เช็คชื่อ/ลิงก์ตรวจสอบ)
 */
window.CHECKIN_CONFIG = {
  SHEET_URL: '',
  SHEET_TOKEN: '',
  SUPABASE_URL: 'https://lxwykletjdcjkchjqpvt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4d3lrbGV0amRjamtjaGpxcHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMjc3OTgsImV4cCI6MjExMDgwMzc5OH0.ubsnApO_1TUk4HZfdKDetFYh0qJj0yxl5easLwCK12w'
};
