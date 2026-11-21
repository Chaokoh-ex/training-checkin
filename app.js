{
const CFG = window.APP_CONFIG;
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I = {
  check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  undo:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  more:'<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>'
};
const ic = k => `<svg class="i" viewBox="0 0 24 24">${I[k]}</svg>`;
const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2800); };
const fmtT = iso => iso ? new Date(iso).toLocaleString('th-TH', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '';
const fmtD = d => d ? new Date(d + 'T00:00').toLocaleDateString('th-TH', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) : '';
const show = v => { for (const id of ['vLoading','vLogin','vDenied','vApp']) $(id).hidden = id !== v; };
const fail = (e, m) => { console.error(e); toast(m || 'เกิดข้อผิดพลาด: ' + (e?.message || e)); };

let RO = false, sessions = [], cur = null, people = [], filter = 'all', channel = null, active = null, pollT = null;

/* ---------- routing ---------- */
const token = new URLSearchParams(location.search).get('view');
if (token) publicView(token);
else {
  sb.auth.onAuthStateChange((ev, s) => { if (ev === 'INITIAL_SESSION' || ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(() => route(s), 0); });
}

async function route(s) {
  if (!s) { show('vLogin'); return; }
  const email = s.user.email || '';
  const { data: ok, error } = await sb.rpc('is_admin');
  if (error || !ok) { $('deniedEmail').textContent = email; show('vDenied'); return; }
  if (route.done) return; route.done = true;
  $('who').textContent = email;
  show('vApp');
  await loadSessions();
}

$('gLogin').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: {
  redirectTo: location.origin + location.pathname,
  queryParams: { login_hint: CFG.ADMIN_EMAIL_HINT, prompt: 'select_account' } } }).catch(fail);
const out = async () => { route.done = false; await sb.auth.signOut(); show('vLogin'); };
$('logout').onclick = out; $('deniedOut').onclick = out;

/* ---------- public read-only ---------- */
async function publicView(tok) {
  RO = true; document.body.classList.add('public');
  const load = async () => {
    const { data, error } = await sb.rpc('get_public_session', { p_token: tok });
    if (error || !data) { show('vApp'); $('hTitle').textContent = 'ไม่พบข้อมูล'; $('hSub').textContent = 'ลิงก์ไม่ถูกต้องหรือรอบอบรมถูกลบแล้ว'; $('list').innerHTML = '<div class="empty">ไม่พบข้อมูล</div>'; return; }
    cur = { title: data.title, course: data.course, event_date: data.event_date };
    people = data.attendees.map((a, i) => ({ ...a, id: i + 1 }));
    show('vApp'); renderHead(); render();
    $('note').textContent = 'อัปเดตอัตโนมัติทุก 20 วินาที · ล่าสุด ' + new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
  };
  await load(); pollT = setInterval(load, 20000);
}

/* ---------- sessions ---------- */
async function loadSessions(selectId) {
  const { data, error } = await sb.from('sessions').select('*').order('created_at', { ascending: false });
  if (error) return fail(error);
  sessions = data;
  let pick = selectId || (() => { try { return localStorage.getItem('sess'); } catch { return null; } })();
  if (!sessions.find(s => s.id === pick)) pick = sessions[0]?.id;
  $('sessSel').innerHTML = sessions.map(s => `<option value="${s.id}">${esc(s.title)}${s.event_date ? ' · ' + esc(new Date(s.event_date + 'T00:00').toLocaleDateString('th-TH', {day:'numeric', month:'short'})) : ''}</option>`).join('') || '<option value="">ยังไม่มีรอบอบรม</option>';
  if (pick) { $('sessSel').value = pick; await selectSession(pick); }
  else { cur = null; people = []; renderHead(); render(); }
}
async function selectSession(id) {
  cur = sessions.find(s => s.id === id);
  try { localStorage.setItem('sess', id); } catch {}
  renderHead(); await loadPeople();
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('att-' + id).on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `session_id=eq.${id}` }, () => {
    clearTimeout(selectSession.t); selectSession.t = setTimeout(loadPeople, 400);
  }).subscribe();
}
$('sessSel').onchange = e => selectSession(e.target.value);
async function loadPeople() {
  if (!cur) return;
  const { data, error } = await sb.from('attendees').select('*').eq('session_id', cur.id).order('sort').order('id');
  if (error) return fail(error);
  people = data; render();
  $('note').textContent = 'บันทึกลงฐานข้อมูลทันทีทุกครั้งที่กด';
}
function renderHead() {
  $('hTitle').textContent = cur ? cur.title : 'ยังไม่มีรอบอบรม';
  $('hSub').textContent = cur ? [cur.course, fmtD(cur.event_date)].filter(Boolean).join(' · ') || 'กดปุ่มดินสอเพื่อใส่หลักสูตรและวันที่' : 'กดปุ่ม + เพื่อสร้างรอบอบรมแรก';
  document.title = 'เช็คชื่อ · ' + (cur?.title || 'ผู้เข้าอบรม');
}
let sessMode = null;
$('sessNew').onclick = () => { sessMode = 'new'; $('sfTitle').textContent = 'เพิ่มรอบอบรม'; $('sessForm').reset(); $('sfCourse').value = cur?.course || ''; $('sfDelete').hidden = true; $('dSess').showModal(); };
$('sessEdit').onclick = () => { if (!cur) return $('sessNew').click(); sessMode = 'edit'; $('sfTitle').textContent = 'แก้ไขรอบอบรม'; $('sfName').value = cur.title; $('sfCourse').value = cur.course || ''; $('sfDate').value = cur.event_date || ''; $('sfDelete').hidden = false; $('dSess').showModal(); };
$('sessForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = { title: $('sfName').value.trim(), course: $('sfCourse').value.trim() || null, event_date: $('sfDate').value || null };
  const q = sessMode === 'new' ? sb.from('sessions').insert(row).select().single() : sb.from('sessions').update(row).eq('id', cur.id).select().single();
  const { data, error } = await q; if (error) return fail(error);
  $('dSess').close(); toast('บันทึกรอบอบรมแล้ว'); await loadSessions(data.id);
});
$('sfDelete').onclick = () => confirmBox('ลบรอบอบรมนี้?', `“${cur.title}” และรายชื่อ ลายเซ็นทั้งหมดในรอบนี้จะถูกลบถาวร กู้คืนไม่ได้`, async () => {
  const { error } = await sb.from('sessions').delete().eq('id', cur.id); if (error) return fail(error);
  $('dSess').close(); toast('ลบรอบอบรมแล้ว'); await loadSessions();
});

/* ---------- list ---------- */
function render() {
  const P = people, nP = P.filter(x => x.status === 'P').length, nA = P.filter(x => x.status === 'A').length, n = P.length;
  $('nPresent').textContent = nP; $('nAll').textContent = n; $('cP').textContent = nP; $('cA').textContent = nA; $('cU').textContent = n - nP - nA;
  $('bP').style.width = (n ? nP / n * 100 : 0) + '%'; $('bA').style.width = (n ? nA / n * 100 : 0) + '%';
  const q = $('q').value.trim().toLowerCase();
  const rows = P.map((x, i) => ({ x, i })).filter(({ x }) => (filter === 'all' || (x.status || 'U') === filter) && (!q || `${x.prefix} ${x.name} ${x.company}`.toLowerCase().includes(q)));
  if (!n) { $('list').innerHTML = `<div class="empty">${RO ? 'ยังไม่มีรายชื่อ' : 'ยังไม่มีรายชื่อ กด “เพิ่มชื่อ” หรือ “นำเข้าจาก Excel”'}</div>`; return; }
  $('list').innerHTML = rows.length ? rows.map(({ x, i }) => {
    const s = x.status;
    const stat = RO
      ? `<div class="stc"><span class="badge ${s || 'U'}">${s === 'P' ? ic('check') + 'มา' : s === 'A' ? ic('x') + 'ไม่มา' : 'ยังไม่เช็ค'}</span></div>`
      : `<div class="seg"><button class="y" data-a="P" aria-pressed="${s === 'P'}">${ic('check')}มา</button><button class="n" data-a="A" aria-pressed="${s === 'A'}">${ic('x')}ไม่มา</button></div>`;
    const sig = s === 'P' && x.signature ? `<button class="sig" data-a="view" aria-label="ดูลายเซ็น"><img src="${esc(x.signature)}" alt=""></button><span class="tm">${fmtT(x.signed_at)}</span>`
      : s === 'P' && !RO ? `<button class="sign" data-a="P">${ic('pen')}เซ็นชื่อ</button>`
      : s === 'P' ? '<span class="muted">มา (ยังไม่มีลายเซ็น)</span>'
      : s === 'A' ? '<span class="muted">ไม่ได้เข้าอบรม</span>' : '<span class="muted">—</span>';
    return `<div class="row" data-id="${x.id}">
      <span class="no">${i + 1}</span>
      <div class="nmb"><div style="flex:1"><div class="nm">${esc(x.prefix)} ${esc(x.name)}</div><div class="co">${esc(x.company)}</div></div>${RO ? '' : `<button class="edit" data-a="edit" aria-label="แก้ไขชื่อ" title="แก้ไขชื่อ">${ic('pen')}</button>`}</div>
      ${stat}
      <div class="sigc">${sig}${s && !RO ? `<button class="undo" data-a="U" aria-label="ล้างสถานะ" title="ล้างสถานะ">${ic('undo')}</button>` : ''}</div>
    </div>`;
  }).join('') : '<div class="empty">ไม่พบรายชื่อที่ค้นหา</div>';
}
$('chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; filter = b.dataset.f; for (const c of $('chips').children) c.setAttribute('aria-pressed', c === b); render(); });
$('q').addEventListener('input', render);

async function patch(p, fields, msg) {
  const before = { ...p }; Object.assign(p, fields); render();
  const { error } = await sb.from('attendees').update(fields).eq('id', p.id);
  if (error) { Object.assign(p, before); render(); return fail(error, 'บันทึกไม่สำเร็จ ลองอีกครั้ง'); }
  if (msg) toast(msg);
}
$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const p = people.find(x => x.id === +b.closest('.row').dataset.id), a = b.dataset.a;
  if (a === 'view') return openView(p);
  if (RO) return;
  if (a === 'P') { if (p.status === 'P' && p.signature) return openView(p); openSign(p); }
  else if (a === 'A') { if (p.status !== 'A') patch(p, { status: 'A', signature: null, signed_at: new Date().toISOString() }, 'บันทึก “ไม่มา” แล้ว'); }
  else if (a === 'U') patch(p, { status: null, signature: null, signed_at: null }, 'ล้างสถานะแล้ว');
  else if (a === 'edit') openPerson(p);
});

/* ---------- signature ---------- */
const cv = $('pad'), ctx = cv.getContext('2d'); let drawing = false, inked = false, last = null;
function sizePad() {
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#17324a'; ctx.fillStyle = '#17324a'; ctx.lineWidth = 2.6;
  inked = false; $('hint').hidden = false;
}
const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
cv.addEventListener('pointerdown', e => { e.preventDefault(); drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, 7); ctx.fill(); inked = true; $('hint').hidden = true; });
cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
const up = () => drawing = false; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
function openSign(p) { active = p; $('sName').textContent = `${p.prefix} ${p.name} · ${p.company || ''}`; $('dSign').showModal(); requestAnimationFrame(sizePad); }
$('clr').onclick = sizePad;
$('saveSig').onclick = async () => {
  if (!inked) return toast('กรุณาเซ็นชื่อก่อนบันทึก');
  const o = document.createElement('canvas'); o.width = 360; o.height = 140; const g = o.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 360, 140); const k = Math.min(360 / cv.width, 140 / cv.height);
  g.drawImage(cv, (360 - cv.width * k) / 2, (140 - cv.height * k) / 2, cv.width * k, cv.height * k);
  $('saveSig').disabled = true;
  await patch(active, { status: 'P', signature: o.toDataURL('image/jpeg', .7), signed_at: new Date().toISOString() }, 'เช็คชื่อ ' + active.name + ' เรียบร้อย');
  $('saveSig').disabled = false; $('dSign').close();
};
function openView(p) { active = p; $('vName').textContent = `${p.prefix} ${p.name}`; $('vTime').textContent = `${p.company || ''} · เซ็นเมื่อ ${fmtT(p.signed_at)}`; $('vImg').src = p.signature; $('dView').showModal(); }
$('reSign').onclick = () => { $('dView').close(); openSign(active); };

/* ---------- add / edit / delete person ---------- */
let editing = null;
function openPerson(p) {
  editing = p || null; $('personForm').reset();
  $('pTitle').textContent = p ? 'แก้ไขรายชื่อ' : 'เพิ่มผู้เข้าอบรม'; $('pDelete').hidden = !p;
  if (p) { $('pPrefix').value = p.prefix || ''; $('pName').value = p.name; $('pCo').value = p.company || ''; }
  $('dPerson').showModal();
}
$('addBtn').onclick = () => { if (!cur) return toast('สร้างรอบอบรมก่อน'); openPerson(null); };
$('personForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = { prefix: $('pPrefix').value.trim(), name: $('pName').value.trim().replace(/\s+/g, ' '), company: $('pCo').value.trim() };
  if (!row.name) return;
  if (editing) { $('dPerson').close(); return patch(editing, row, 'แก้ไขแล้ว'); }
  const { error } = await sb.from('attendees').insert({ ...row, session_id: cur.id, sort: nextSort() });
  if (error) return fail(error);
  $('dPerson').close(); toast('เพิ่ม ' + row.name + ' แล้ว'); loadPeople();
});
$('pDelete').onclick = () => confirmBox('ลบชื่อนี้?', `${editing.prefix} ${editing.name} และลายเซ็น (ถ้ามี) จะถูกลบถาวร`, async () => {
  const { error } = await sb.from('attendees').delete().eq('id', editing.id); if (error) return fail(error);
  $('dPerson').close(); toast('ลบแล้ว'); loadPeople();
});
const nextSort = () => Math.max(0, ...people.map(x => x.sort || 0)) + 1;

/* ---------- import from Excel (Google Form export or simple list) ---------- */
const PREF = /^(นางสาว|นาง|นาย|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.?|Mrs\.?|Ms\.?|Miss|ดร\.)\s*/i;
const norm = s => String(s || '').replace(/\s+/g, '').replace(PREF, '').toLowerCase();
function parseRows(aoa) {
  const hi = aoa.findIndex(r => r.some(c => /ชื่อ/.test(String(c || ''))));
  if (hi < 0) return [];
  const H = aoa[hi].map(c => String(c || '').trim());
  const col = re => H.findIndex(h => re.test(h));
  const cCo = col(/บริษัท|หน่วยงาน|company/i);
  const groups = [];
  const main = H.findIndex(h => /^ชื่อ-?\s?นามสกุล$|^ชื่อ$|^name$/i.test(h)), mainP = H.findIndex(h => /^คำนำหน้า$/.test(h));
  if (main >= 0) groups.push([mainP, main]);
  for (let k = 2; k <= 10; k++) { const n = col(new RegExp('^ชื่อ-?\\s?นามสกุล\\s*' + k + '$')); if (n >= 0) groups.push([col(new RegExp('คำนำหน้า.*' + k)), n]); }
  if (!groups.length) { const n = col(/ชื่อ/); if (n >= 0) groups.push([-1, n]); }
  const out = [];
  for (const r of aoa.slice(hi + 1)) for (const [pi, ni] of groups) {
    let name = String(r[ni] ?? '').trim().replace(/\s+/g, ' '), prefix = pi >= 0 ? String(r[pi] ?? '').trim() : '';
    if (!name || name === '-') continue;
    const m = name.match(PREF); if (m) { prefix = prefix || m[1]; name = name.slice(m[0].length).trim(); }
    out.push({ prefix, name, company: cCo >= 0 ? String(r[cCo] ?? '').trim() : '' });
  }
  return out;
}
let pending = [];
$('importBtn').onclick = () => { if (!cur) return toast('สร้างรอบอบรมก่อน'); $('importFile').value = ''; $('importFile').click(); };
$('importFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const wb = XLSX.read(await f.arrayBuffer());
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const seen = new Set(people.map(p => norm(p.name)));
    const rows = parseRows(aoa).map(r => { const k = norm(r.name), dup = seen.has(k); seen.add(k); return { ...r, dup }; });
    pending = rows.filter(r => !r.dup);
    $('impInfo').textContent = rows.length ? `พบ ${rows.length} ชื่อ · ใหม่ ${pending.length} · ซ้ำ/มีอยู่แล้ว ${rows.length - pending.length} (จะข้าม)` : 'ไม่พบคอลัมน์ชื่อในไฟล์นี้';
    $('impList').innerHTML = rows.map(r => `<div class="${r.dup ? 'dup' : ''}">${esc(r.prefix)} ${esc(r.name)} <span class="muted">· ${esc(r.company)}</span></div>`).join('');
    $('impGo').disabled = !pending.length; $('impGo').textContent = `นำเข้า ${pending.length} ชื่อ`;
    $('dImport').showModal();
  } catch (err) { fail(err, 'อ่านไฟล์ไม่ได้'); }
};
$('impGo').onclick = async () => {
  let s = nextSort();
  const { error } = await sb.from('attendees').insert(pending.map(r => ({ prefix: r.prefix, name: r.name, company: r.company, session_id: cur.id, sort: s++ })));
  if (error) return fail(error);
  $('dImport').close(); toast(`นำเข้า ${pending.length} ชื่อแล้ว`); loadPeople();
};

/* ---------- export / print / share ---------- */
const ST = { P: 'มา', A: 'ไม่มา' };
$('exportBtn').onclick = () => {
  const aoa = [[cur?.title || ''], [[cur?.course, fmtD(cur?.event_date)].filter(Boolean).join(' · ')], [],
    ['ลำดับ', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'บริษัท/หน่วยงาน', 'สถานะ', 'เวลาเซ็น', 'ลายเซ็น'],
    ...people.map((x, i) => [i + 1, x.prefix, x.name, x.company, ST[x.status] || 'ยังไม่เช็ค', fmtT(x.signed_at), x.signature ? 'มีลายเซ็น' : ''])];
  const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{wch:6},{wch:9},{wch:28},{wch:36},{wch:10},{wch:18},{wch:10}];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'เช็คชื่อ');
  XLSX.writeFile(wb, `เช็คชื่อ-${(cur?.title || 'อบรม').replace(/[\\/:*?"<>|]/g, '')}.xlsx`);
};
$('printBtn').onclick = () => {
  $('printArea').innerHTML = `<h1>ใบลงชื่อเข้าอบรม · ${esc(cur?.title)}</h1><p>${esc([cur?.course, fmtD(cur?.event_date)].filter(Boolean).join(' · '))} — มา ${people.filter(x => x.status === 'P').length} / ${people.length} คน</p>
  <table><thead><tr><th>#</th><th>ชื่อ-นามสกุล</th><th>บริษัท/หน่วยงาน</th><th>สถานะ</th><th>ลายเซ็น</th><th>เวลา</th></tr></thead><tbody>
  ${people.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.prefix)} ${esc(x.name)}</td><td>${esc(x.company)}</td><td>${ST[x.status] || ''}</td><td>${x.signature ? `<img src="${esc(x.signature)}" alt="">` : ''}</td><td>${fmtT(x.signed_at)}</td></tr>`).join('')}</tbody></table>`;
  setTimeout(() => window.print(), 50);
};
$('shareBtn').onclick = () => { if (!cur) return; $('shareUrl').value = location.origin + location.pathname + '?view=' + cur.share_token; $('dShare').showModal(); };
$('copyShare').onclick = async () => { try { await navigator.clipboard.writeText($('shareUrl').value); toast('คัดลอกลิงก์แล้ว'); } catch { $('shareUrl').select(); toast('กด Ctrl+C เพื่อคัดลอก'); } };

/* ---------- dialogs ---------- */
let cfFn = null;
function confirmBox(t, m, fn) { $('cfTitle').textContent = t; $('cfText').textContent = m; cfFn = fn; $('dConfirm').showModal(); }
$('cfGo').onclick = async () => { $('dConfirm').close(); if (cfFn) await cfFn(); };
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) e.target.closest('dialog').close(); });
}
