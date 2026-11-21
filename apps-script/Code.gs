/**
 * รับข้อมูลเช็คชื่อจากเว็บ แล้วบันทึกลง Google Sheets
 *
 * ชีต "บันทึกเวลา"   : 1 แถวต่อ 1 ครั้งที่มีคนกดบันทึก (ประวัติทั้งหมด)
 * ชีต "สรุปรายชื่อ"  : 1 แถวต่อ 1 คน อัปเดตสถานะล่าสุดเสมอ
 * โฟลเดอร์ Drive "ลายเซ็นผู้เข้าอบรม" : เก็บรูปลายเซ็น (ลิงก์อยู่ในชีต)
 *
 * วิธีติดตั้งอยู่ใน README.md
 */
const TZ = 'Asia/Bangkok';
const LOG_SHEET = 'บันทึกเวลา';
const SUMMARY_SHEET = 'สรุปรายชื่อ';
const SIG_FOLDER = 'ลายเซ็นผู้เข้าอบรม';
const SAVE_SIGNATURE_TO_DRIVE = true;

const LOG_HEAD = ['เวลาที่บันทึก', 'การกระทำ', 'ลำดับ', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'บริษัท/หน่วยงาน', 'สถานะ', 'เวลาเซ็น', 'ลายเซ็น', 'อุปกรณ์', 'หลักสูตร'];
const SUM_HEAD = ['id', 'ลำดับ', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'บริษัท/หน่วยงาน', 'สถานะ', 'เวลาเซ็น', 'ลายเซ็น', 'อัปเดตล่าสุด'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  sheet_(ss, LOG_SHEET, LOG_HEAD);
  sheet_(ss, SUMMARY_SHEET, SUM_HEAD);
  if (SAVE_SIGNATURE_TO_DRIVE) folder_();
}

function doGet() {
  return json_({ ok: true, hello: 'training check-in sheet', token_set: !!token_() });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (token_() && d.token !== token_()) return json_({ ok: false, error: 'bad token' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const log = sheet_(ss, LOG_SHEET, LOG_HEAD);
    const sum = sheet_(ss, SUMMARY_SHEET, SUM_HEAD);
    const now = fmt_(new Date());
    const ids = sum.getLastRow() > 1 ? sum.getRange(2, 1, sum.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
    const logRows = [];

    (d.people || []).forEach(p => {
      const status = p.status === 'P' ? 'มา' : p.status === 'A' ? 'ไม่มา' : 'ยังไม่เช็ค';
      const signedAt = p.signed_at ? fmt_(new Date(p.signed_at)) : '';
      const sigLink = p.signature ? saveSig_(p) : '';
      logRows.push([now, d.action || '', p.no || '', p.prefix || '', p.name || '', p.company || '', status, signedAt, sigLink, d.device || '', d.course || '']);

      const row = [p.id, p.no || '', p.prefix || '', p.name || '', p.company || '', status, signedAt, sigLink, now];
      const i = ids.indexOf(String(p.id));
      if (i >= 0) sum.getRange(i + 2, 1, 1, row.length).setValues([row]);
      else { sum.appendRow(row); ids.push(String(p.id)); }
    });

    if (d.action !== 'ซิงก์ทั้งหมด' && logRows.length) {
      log.getRange(log.getLastRow() + 1, 1, logRows.length, LOG_HEAD.length).setValues(logRows);
    } else if (logRows.length) {
      log.appendRow([now, 'ซิงก์ทั้งหมด', '', '', 'ส่งข้อมูล ' + logRows.length + ' คน', '', '', '', '', d.device || '', d.course || '']);
    }
    return json_({ ok: true, count: logRows.length });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function token_() { return PropertiesService.getScriptProperties().getProperty('TOKEN') || ''; }
function fmt_(dt) { return Utilities.formatDate(dt, TZ, 'yyyy-MM-dd HH:mm:ss'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#d4eecb');
    sh.setFrozenRows(1);
  }
  return sh;
}

function folder_() {
  const it = DriveApp.getFoldersByName(SIG_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SIG_FOLDER);
}

function saveSig_(p) {
  if (!SAVE_SIGNATURE_TO_DRIVE) return 'มีลายเซ็น';
  const m = String(p.signature).match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return 'มีลายเซ็น';
  const name = 'ลายเซ็น-' + (p.name || p.id) + '-' + (p.signed_at || '').slice(0, 19).replace(/[:T]/g, '') + '.' + m[1].split('/')[1];
  const f = folder_();
  const same = f.getFilesByName(name);
  if (same.hasNext()) return same.next().getUrl();
  return f.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name)).getUrl();
}
