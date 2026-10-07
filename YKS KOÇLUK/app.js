// YKS Koçluk • İlknur — Konu bazlı deneme analiz uygulaması (v2)
// Konu listesi topics.js içinden gelir (yks konuları.docx).

const LS_KEY = 'yks_ilknur_exams_v3';
let currentFilter = 'ALL';
let dagFilter = 'TYT';
let editingId = null;

// Düzenleme ve silme şifreleri
const EDIT_PW = '181201';
const DEL_PW = '181202';

// Her derste toplam kaç soru işaretlenmek zorunda (doğru + yanlış + boş)
const QUOTA = {
  TYT: {
    'Türkçe': 40, 'Tarih': 5, 'Coğrafya': 5, 'Felsefe': 5, 'Din': 5,
    'Matematik': 30, 'Geometri': 10, 'Fizik': 7, 'Kimya': 7, 'Biyoloji': 6
  },
  AYT: { 'Edebiyat': 24, 'Tarih': 10, 'Coğrafya': 6, 'Matematik': 40 }
};

// ---------- yardımcılar ----------
const netOf = (d, y) => d - y / 4;
const fmtNet = v => v.toFixed(2).replace('.', ',');
const fmt1 = v => v.toFixed(1).replace('.', ',');
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(iso) {
  try {
    const dt = new Date(iso + 'T12:00:00');
    const s = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
  } catch { return iso; }
}

// ---------- veri ----------
function blankExam(type) {
  return {
    id: 'e' + Date.now(),
    name: '', type, date: '2026-09-26',
    lessons: LESSONS[type].map(lname => ({
      name: lname,
      topics: (TOPICS[type][lname] || []).map(t => ({ name: t, d: 0, y: 0, b: 0 }))
    }))
  };
}

function seedExams() {
  const e1 = blankExam('TYT');
  e1.id = 'seed1'; e1.name = 'TYT Deneme 1'; e1.date = '2026-09-20';
  const set = (ex, lesson, topic, y, b) => {
    const L = ex.lessons.find(l => l.name === lesson);
    if (!L) return;
    const T = L.topics.find(t => t.name === topic);
    if (T) { T.d = 0; T.y = y; T.b = b; }
  };
  set(e1, 'Türkçe', 'Paragraf', 2, 1);
  set(e1, 'Türkçe', 'Cümlenin Ögeleri', 2, 0);
  set(e1, 'Türkçe', 'Ses Bilgisi', 0, 0);
  set(e1, 'Tarih', 'Kurtuluş Savaşı ve Antlaşmalar', 1, 0);
  set(e1, 'Coğrafya', 'İklimler', 1, 0);
  set(e1, 'Matematik', 'Problemler', 2, 1);
  set(e1, 'Matematik', 'Permütasyon ve Kombinasyon', 2, 0);
  set(e1, 'Geometri', 'Özel Üçgenler', 1, 0);
  set(e1, 'Fizik', 'Optik', 1, 1);
  set(e1, 'Kimya', 'Karışımlar', 0, 1);
  set(e1, 'Biyoloji', 'Kalıtım', 1, 0);
  set(e1, 'Felsefe', 'Bilgi Felsefesi', 0, 1);
  set(e1, 'Din', 'İbadet', 0, 0);

  const e2 = blankExam('TYT');
  e2.id = 'seed2'; e2.name = 'TYT Deneme 2'; e2.date = '2026-09-26';
  set(e2, 'Türkçe', 'Paragraf', 1, 1);
  set(e2, 'Türkçe', 'Cümlenin Ögeleri', 1, 0);
  set(e2, 'Matematik', 'Problemler', 1, 1);
  set(e2, 'Fizik', 'Optik', 0, 1);
  set(e2, 'Kimya', 'Karışımlar', 1, 0);

  const e3 = blankExam('AYT');
  e3.id = 'seed3'; e3.name = 'AYT Deneme 1'; e3.date = '2026-09-22';
  set(e3, 'Matematik', 'Türev', 2, 0);
  set(e3, 'Matematik', 'Trigonometri', 1, 1);
  set(e3, 'Matematik', 'Limit', 0, 1);
  set(e3, 'Edebiyat', 'Şiir Bilgisi', 1, 0);
  set(e3, 'Tarih', 'Milli Mücadele', 1, 0);

  return [e1, e2, e3];
}

// kaldırılan paragraf alt başlıkları tek "Paragraf" konusuna birleştirilir
const PARAGRAF_FOLD = ['Paragrafta Anlatım Teknikleri', 'Paragrafta Düşünceyi Geliştirme Yolları', 'Paragrafta Yapı', 'Paragrafta Konu-Ana Düşünce', 'Paragrafta Yardımcı Düşünce'];
function foldParagraf(exams) {
  let moved = false;
  (exams || []).forEach(e => {
    if (!e || e.type !== 'TYT') return;
    (e.lessons || []).forEach(L => {
      if (!L || L.name !== 'Türkçe' || !Array.isArray(L.topics)) return;
      const p = L.topics.find(t => t.name === 'Paragraf');
      L.topics.forEach(t => {
        if (PARAGRAF_FOLD.includes(t.name) && ((t.y || 0) + (t.b || 0) > 0)) {
          if (p) { p.y = (p.y || 0) + (t.y || 0); p.b = (p.b || 0) + (t.b || 0); }
          t.y = 0; t.b = 0;
          moved = true;
        }
      });
      const before = L.topics.length;
      L.topics = L.topics.filter(t => !PARAGRAF_FOLD.includes(t.name));
      if (L.topics.length !== before) moved = true;
    });
  });
  return moved;
}

function loadExams() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (foldParagraf(arr)) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch (e) {}
      }
      return arr;
    }
  } catch (e) {}
  // eski sürümden geçiş: konu doğruları atılır, girilmeyen sorular otomatik doğru sayılır
  try {
    const oldRaw = localStorage.getItem('yks_ilknur_exams_v2');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (Array.isArray(old) && old.length) {
        const conv = old.map(e => ({
          id: e.id, name: e.name, type: e.type, date: e.date,
          lessons: (e.lessons || []).map(L => ({
            name: L.name,
            topics: (L.topics || []).map(T => ({ name: T.name, d: 0, y: T.y || 0, b: T.b || 0 }))
          }))
        }));
        foldParagraf(conv);
        localStorage.setItem(LS_KEY, JSON.stringify(conv));
        return conv;
      }
    }
  } catch (e) {}
  const seed = seedExams();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch (e) {}
  return seed;
}
function saveExams(exams) { localStorage.setItem(LS_KEY, JSON.stringify(exams)); schedulePush(); }

// ---------- hesap ----------
// Girilmeyen sorular otomatik doğru kabul edilir:
// ders doğrusu = kota - (yanlış + boş toplamı)
function lessonMarked(L) {
  let y = 0, b = 0;
  L.topics.forEach(t => { y += t.y || 0; b += t.b || 0; });
  return { yanlis: y, bos: b, marked: y + b };
}
function lessonAutoD(type, lname, L) {
  const quota = (QUOTA[type] && QUOTA[type][lname]) || 0;
  return Math.max(quota - lessonMarked(L).marked, 0);
}
function lessonTotals(type, lname, L) {
  const m = lessonMarked(L);
  const d = lessonAutoD(type, lname, L);
  return { dogru: d, yanlis: m.yanlis, bos: m.bos, net: netOf(d, m.yanlis) };
}
function examTotals(ex) {
  let d = 0, y = 0, b = 0;
  ex.lessons.forEach(L => { const t = lessonTotals(ex.type, L.name, L); d += t.dogru; y += t.yanlis; b += t.bos; });
  return { dogru: d, yanlis: y, bos: b, net: netOf(d, y) };
}

// ---------- gezinme ----------
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.drawer-link').forEach(a => a.classList.remove('active'));
  if (name === 'exams-tyt') { name = 'exams'; setFilter('TYT'); }
  if (name === 'exams-ayt') { name = 'exams'; setFilter('AYT'); }
  document.getElementById('view-' + name).classList.add('active');
  const link = document.querySelector(`.drawer-link[data-view="${name}"]`);
  if (link) link.classList.add('active');
  closeDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goExams(type){ showView('exams'); setFilter(type); }
function setFilter(t){
  currentFilter = t;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  renderExams();
}

const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
document.getElementById('hamburgerBtn').onclick = () => { drawer.classList.add('open'); overlay.classList.add('show'); };
document.getElementById('drawerClose').onclick = closeDrawer;
overlay.onclick = closeDrawer;
function closeDrawer(){ drawer.classList.remove('open'); overlay.classList.remove('show'); }
document.querySelectorAll('.drawer-link').forEach(a => {
  a.onclick = (e) => { e.preventDefault(); showView(a.dataset.view); };
});

// ---------- anasayfa ----------
// Genel + Anasayfa'da ortak kullanılan 10'lu istatistik şeridi
function generalStripHTML() {
  const exams = loadExams();
  const calc = (type) => {
    const list = [...exams.filter(e => e.type === type)].sort((a, b) => a.date.localeCompare(b.date));
    const nets = list.map(e => examTotals(e).net);
    const last5 = list.slice(-5);
    return {
      n: list.length,
      avg: nets.length ? nets.reduce((a, v) => a + v, 0) / nets.length : null,
      avg5: last5.length ? last5.reduce((a, e) => a + examTotals(e).net, 0) / last5.length : null,
      last: nets.length ? nets[nets.length - 1] : null,
      best: nets.length ? Math.max(...nets) : null,
      worst: nets.length ? Math.min(...nets) : null,
    };
  };
  const T = calc('TYT'), A = calc('AYT');
  const f = v => v === null ? '–' : fmtNet(v);
  return `
      <div class="stat"><span>TYT Sınav Sayısı</span><b>${T.n}</b></div>
      <div class="stat"><span>Ortalama TYT Neti</span><b>${f(T.avg)}</b></div>
      <div class="stat"><span>Son 5 TYT Ort.</span><b>${f(T.avg5)}</b></div>
      <div class="stat"><span>Son TYT Neti</span><b>${f(T.last)}</b></div>
      <div class="stat"><span>En Yüksek TYT</span><b>${f(T.best)}</b></div>
      <div class="stat"><span>En Düşük TYT</span><b>${f(T.worst)}</b></div>
      <div class="stat"><span>AYT Sınav Sayısı</span><b>${A.n}</b></div>
      <div class="stat"><span>Ortalama AYT Neti</span><b>${f(A.avg)}</b></div>
      <div class="stat"><span>Son 5 AYT Ort.</span><b>${f(A.avg5)}</b></div>
      <div class="stat"><span>Son AYT Neti</span><b>${f(A.last)}</b></div>
      <div class="stat"><span>En Yüksek AYT</span><b>${f(A.best)}</b></div>
      <div class="stat"><span>En Düşük AYT</span><b>${f(A.worst)}</b></div>`;
}
function renderHome() {
  const exams = loadExams();
  const tyt = exams.filter(e => e.type === 'TYT');
  const ayt = exams.filter(e => e.type === 'AYT');
  const nets = exams.map(e => examTotals(e).net);
  const avg = exams.length ? nets.reduce((a, b) => a + b, 0) / exams.length : 0;
  const best = exams.length ? Math.max(...nets) : 0;
  const totD = exams.reduce((a, e) => a + examTotals(e).dogru, 0);
  const totY = exams.reduce((a, e) => a + examTotals(e).yanlis, 0);

  document.getElementById('homeStats').innerHTML = generalStripHTML();

  // bugünün ders programı
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const todayIso = isoDay(now);
  const todayWk = isoDay(mondayOf(now));
  const sched = loadSched();
  const todayArr = ((sched[todayWk] || {})[todayIso]) || [];
  const todayDone = todayArr.filter(t => t.done).length;
  document.getElementById('homeSched').innerHTML = todayArr.length
    ? `<p class="muted">${todayDone}/${todayArr.length} tamamlandı</p>` + todayArr.map(t =>
      `<div class="task-row${t.done ? ' tdone' : ''}"><input type="checkbox"${t.done ? ' checked' : ''} onchange="toggleTask('${todayIso}','${t.id}')"><span>${esc(t.t)}</span></div>`
    ).join('') + `<div style="margin-top:8px"><button class="link-btn" onclick="showView('schedule')">Programı aç →</button></div>`
    : `<div class="empty" style="padding:18px">Bugün program boş.<br><br><button class="btn primary" onclick="showView('schedule')">📅 Program Ekle</button></div>`;

  const recent = [...exams].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  document.getElementById('recentExams').innerHTML = recent.length ? recent.map(e => {
    const t = examTotals(e);
    return `<div class="exam-card" onclick="openDetail('${e.id}')">
      <div class="exam-top"><span class="exam-name">${esc(e.name)}</span><span class="badge ${e.type}">${e.type}</span></div>
      <div class="exam-date">${fmtDate(e.date)} • ✅ ${t.dogru} • ❌ ${t.yanlis} • ⬜ ${t.bos} • <b>${t.net.toFixed(2)} net</b></div>
    </div>`;
  }).join('') : '<div class="empty">Henüz sınav eklenmemiş.</div>';

  drawChart(exams);
}

function drawChart(exams) {
  const cv = document.getElementById('netChart');
  const ctx = cv.getContext('2d');
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  cv.width = cv.offsetWidth || 600; cv.height = 180;
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!sorted.length) {
    document.getElementById('netChartNote').textContent = 'Grafik için en az 1 sınav ekle.';
    return;
  }
  const vals = sorted.map(e => examTotals(e).net);
  const max = Math.max(...vals, 10), min = Math.min(...vals, 0);
  const pad = 30;
  const X = i => pad + i * ((cv.width - pad * 2) / Math.max(sorted.length - 1, 1));
  const Y = v => cv.height - 20 - ((v - min) / Math.max(max - min, 1)) * (cv.height - 50);
  ctx.strokeStyle = '#eee'; ctx.fillStyle = '#999'; ctx.font = '11px Inter';
  for (let g = 0; g < 4; g++) {
    const v = min + (max - min) * g / 3, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(cv.width - 10, y); ctx.stroke();
    ctx.fillText(v.toFixed(0), 2, y + 4);
  }
  ctx.strokeStyle = '#6c3df5'; ctx.lineWidth = 3; ctx.beginPath();
  sorted.forEach((e, i) => { i ? ctx.lineTo(X(i), Y(vals[i])) : ctx.moveTo(X(0), Y(vals[0])); });
  ctx.stroke();
  sorted.forEach((e, i) => {
    ctx.fillStyle = '#6c3df5'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b7280'; ctx.fillText(e.name.slice(0, 10), X(i) - 18, cv.height - 4);
  });
  document.getElementById('netChartNote').textContent = `Son ${sorted.length} sınavın net gelişimi (tarih sırasına göre).`;
}

// ---------- sınav listesi ----------
function renderExams() {
  const exams = loadExams();
  const list = exams
    .filter(e => currentFilter === 'ALL' || e.type === currentFilter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const box = document.getElementById('examList');
  if (!list.length) {
    box.innerHTML = `<div class="empty">Bu kategoride sınav yok.<br><br><button class="btn primary" onclick="showView('add')">➕ Sınav Ekle</button></div>`;
    return;
  }
  box.innerHTML = list.map(e => {
    const t = examTotals(e);
    return `<div class="exam-card" onclick="openDetail('${e.id}')">
      <div class="exam-top"><span class="exam-name">${esc(e.name)}</span><span class="top-right"><button class="icon-btn" title="Düzenle" onclick="event.stopPropagation();askEdit('${e.id}')">✏️</button><button class="icon-btn danger" title="Sil" onclick="event.stopPropagation();deleteExam('${e.id}')">🗑️</button><span class="badge ${e.type}">${e.type}</span></span></div>
      <div class="exam-date">📅 ${fmtDate(e.date)}</div>
      <div class="exam-nums">
        <div class="num">✅ Doğru<b>${t.dogru}</b></div>
        <div class="num">❌ Yanlış<b>${t.yanlis}</b></div>
        <div class="num">⬜ Boş<b>${t.bos}</b></div>
        <div class="num net">🎯 Net<b>${t.net.toFixed(2)}</b></div>
      </div>
    </div>`;
  }).join('');
}

// ---------- şifreli düzenle / sil ----------
function askEdit(id) {
  const pw = prompt('✏️ Düzenlemek için şifreyi gir:');
  if (pw === null) return;
  if (pw !== EDIT_PW) { alert('❌ Yanlış şifre!'); return; }
  startEdit(id);
}

function startEdit(id) {
  const ex = loadExams().find(e => e.id === id);
  if (!ex) return;
  editingId = id;
  document.getElementById('fName').value = ex.name;
  document.getElementById('fType').value = ex.type;
  document.getElementById('fDate').value = ex.date;
  buildLessonFields();
  ex.lessons.forEach((L) => {
    const li = LESSONS[ex.type].indexOf(L.name);
    if (li < 0) return;
    (L.topics || []).forEach((T) => {
      const ti = (TOPICS[ex.type][L.name] || []).indexOf(T.name);
      if (ti < 0) return;
      setNum(li, ti, 'y', T.y || 0);
      setNum(li, ti, 'b', T.b || 0);
    });
    updateLessonSum(li);
  });
  updateGrandTotal();
  document.getElementById('saveBtn').textContent = '💾 Güncelle';
  document.getElementById('editBannerName').textContent = '“' + ex.name + '”';
  document.getElementById('editBanner').style.display = 'block';
  showView('add');
}

function cancelEdit() {
  editingId = null;
  document.getElementById('examForm').reset();
  document.getElementById('fDate').value = '2026-09-26';
  document.getElementById('saveBtn').textContent = '💾 Kaydet';
  document.getElementById('editBanner').style.display = 'none';
  buildLessonFields();
}

// ---------- konu dağılımı ----------
function setDagFilter(t) {
  dagFilter = t;
  document.querySelectorAll('.dtab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  renderDagilim();
}
function toggleDag(i) {
  document.getElementById(`dag-${i}`).classList.toggle('open');
}
function dagCell(v) {
  if (v === '-' || v === null || v === undefined) return '<span class="dash">–</span>';
  return `<b>${esc(v)}</b>`;
}
function renderDagilim() {
  const list = (typeof DAGILIM !== 'undefined' && DAGILIM[dagFilter]) ? DAGILIM[dagFilter] : [];
  const box = document.getElementById('dagilimList');
  if (!box) return;
  box.innerHTML = list.map((D, i) => {
    const head = D.years.map(y => `<th>${y}</th>`).join('');
    const rows = D.rows.map(r =>
      `<tr><td class="dag-konu">${esc(r.k)}</td>${r.v.map(v => `<td>${dagCell(v)}</td>`).join('')}</tr>`
    ).join('');
    const tot = D.total.map(t => `<td class="dag-total">${t}</td>`).join('');
    return `<div class="acc" id="dag-${i}">
      <div class="acc-head" onclick="toggleDag(${i})">
        <div><b>${esc(D.lesson)}</b> <span class="muted">(${D.rows.length} konu)</span></div>
        <div class="acc-sum"><span class="k-ok">tabloyu aç</span> <span class="caret">▾</span></div>
      </div>
      <div class="acc-body">
        <div class="dag-scroll">
          <table class="dag-table">
            <tr><th class="dag-konu">Konu</th>${head}</tr>
            ${rows}
            <tr class="dag-totalrow"><td class="dag-konu">Toplam Soru</td>${tot}</tr>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ---------- istatistikler ----------
let statType = 'TYT', statLesson = null, statSort = { key: 'y', dir: -1 };

function setStatFilter(t) {
  statType = t; statLesson = null; statSort = { key: 'y', dir: -1 };
  document.querySelectorAll('.stab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  renderStats();
}
function openStatLesson(lname) {
  statLesson = lname; statSort = { key: 'y', dir: -1 };
  renderStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function backStatLessons() { statLesson = null; renderStats(); }
function sortStats(key) {
  if (statSort.key === key) statSort.dir *= -1;
  else statSort = { key, dir: (key === 'konu' ? 1 : -1) };
  renderStats();
}

function lessonAgg(type, lesson) {
  const map = {};
  (TOPICS[type][lesson] || []).forEach(t => { map[t] = { y: 0, b: 0 }; });
  const exList = loadExams().filter(e => e.type === type);
  exList.forEach(e => {
    const L = (e.lessons || []).find(l => l.name === lesson);
    if (!L) return;
    (L.topics || []).forEach(T => {
      if (!map[T.name]) return;
      map[T.name].y += T.y || 0; map[T.name].b += T.b || 0;
    });
  });
  const n = exList.length;
  return Object.entries(map).map(([name, s]) => {
    const marked = s.y + s.b;
    return {
      konu: name, y: s.y, b: s.b, marked,
      ay: n ? s.y / n : null, // deneme başına ortalama yanlış
      ab: n ? s.b / n : null, // deneme başına ortalama boş
    };
  });
}

function top3(list, key, emptyMsg) {
  const rk = 'a' + key; // y->ay, b->ab : deneme başına ortalamaya göre sırala
  const items = list.filter(r => r[rk] !== null && r[rk] > 0).sort((a, b) => b[rk] - a[rk]).slice(0, 3);
  if (!items.length) return `<div class="muted" style="font-size:13px">${emptyMsg}</div>`;
  return items.map((r, i) =>
    `<div class="top3-row"><span>${i + 1}. ${esc(r.konu)}</span><b>${fmt1(r[rk])} ort. <span class="muted" style="font-weight:400">(${r[key]})</span></b></div>`
  ).join('');
}

function renderStats() {
  const box = document.getElementById('statsBody');
  if (!box) return;
  // genel görünüm: ders ders değil, toplu istatistikler
  if (statType === 'GENEL') { renderGeneralStats(box); return; }
  // seviye 1: ders listesi
  if (!statLesson) {
    box.innerHTML = `<div class="exam-list">` + LESSONS[statType].map(lname => {
      const agg = lessonAgg(statType, lname);
      const y = agg.reduce((a, r) => a + r.y, 0), b = agg.reduce((a, r) => a + r.b, 0);
      const quota = (QUOTA[statType] && QUOTA[statType][lname]) || 0;
      const exams = loadExams().filter(e => e.type === statType);
      const d = Math.max(quota * exams.length - y - b, 0);
      const nets = exams.map(e => {
        const L = (e.lessons || []).find(l => l.name === lname);
        if (!L) return null;
        return { date: e.date, net: lessonTotals(e.type, lname, L).net };
      }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
      const last5 = nets.slice(-5);
      const avg5 = last5.length ? last5.reduce((a, h) => a + h.net, 0) / last5.length : null;
      const avgAll = nets.length ? nets.reduce((a, h) => a + h.net, 0) / nets.length : null;
      return `<div class="exam-card" onclick="openStatLesson('${esc(lname)}')">
        <div class="exam-top"><span class="exam-name">${esc(lname)}</span><span class="badge ${statType}">${statType}</span></div>
        <div class="exam-date">✅ ${d} • ❌ ${y} • ⬜ ${b}</div>
        <div class="stat-netline"><span class="big-net">🎯 ${fmtNet(netOf(d, y))} <small>net</small></span>
        <span class="stat-avgs">Son 5 ort: <b>${avg5 === null ? '–' : fmtNet(avg5)}</b> • Genel ort: <b>${avgAll === null ? '–' : fmtNet(avgAll)}</b></span></div>
      </div>`;
    }).join('') + `</div>`;
    return;
  }
  // seviye 2: ders detayı
  const agg = lessonAgg(statType, statLesson);
  const arrow = k => statSort.key === k ? (statSort.dir === -1 ? ' ▼' : ' ▲') : '';
  const th = (k, label) => `<th class="sortable${statSort.key === k ? ' sorted' : ''}" onclick="sortStats('${k}')">${label}${arrow(k)}</th>`;
  const val = (r, k) => (r[k] === null || r[k] === undefined ? -1 : r[k]);
  const sorted = [...agg].sort((a, b) => {
    if (statSort.key === 'konu') return statSort.dir * a.konu.localeCompare(b.konu, 'tr');
    return statSort.dir * (val(a, statSort.key) - val(b, statSort.key));
  });
  const pct = v => v === null ? '<span class="dash">–</span>' : fmt1(v);
  const rows = sorted.map(r =>
    `<tr><td class="dag-konu">${esc(r.konu)}</td><td><b>${r.marked}</b></td><td>${r.y}</td><td>${r.b}</td><td>${pct(r.ay)}</td><td>${pct(r.ab)}</td></tr>`
  ).join('');
  const hasData = agg.some(r => r.marked > 0);
  // deneme deneme ders netleri (tarih sırasına göre)
  const hist = loadExams()
    .filter(e => e.type === statType)
    .map(e => {
      const L = (e.lessons || []).find(l => l.name === statLesson);
      if (!L) return null;
      const t = lessonTotals(e.type, statLesson, L);
      return { date: e.date, name: e.name, dogru: t.dogru, yanlis: t.yanlis, bos: t.bos, net: t.net };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  const histRows = hist.length ? hist.map(h =>
    `<div class="topic-mini-row"><span>${fmtDate(h.date)} • ${esc(h.name)}</span><span>✅ ${h.dogru} ❌ ${h.yanlis} ⬜ ${h.bos} • <b>${fmtNet(h.net)} net</b></span></div>`
  ).join('') : '<div class="muted" style="font-size:13px">Bu dersten henüz veri yok.</div>';
  box.innerHTML = `
    <button class="back-btn" onclick="backStatLessons()">← Derslere dön</button>
    <h3 style="margin:6px 0 12px">${esc(statLesson)} <span class="badge ${statType}">${statType}</span></h3>
    ${hasData ? `<div class="top3-grid">
      <div class="card"><h3>❌ En çok yanlış</h3>${top3(agg, 'y', 'Yanlış yok 🎉')}</div>
      <div class="card"><h3>⬜ En çok boş</h3>${top3(agg, 'b', 'Boş yok 🎉')}</div>
    </div>` : `<div class="empty">Bu dersten henüz işaretleme yok. Sınav ekleyince istatistikler burada çıkacak.</div>`}
    <div class="card" style="padding:10px">
      <div class="dag-scroll">
        <table class="dag-table">
          <tr><th class="dag-konu sortable${statSort.key === 'konu' ? ' sorted' : ''}" onclick="sortStats('konu')">Konu${arrow('konu')}</th>${th('marked', 'Toplam')}${th('y', 'Yanlış')}${th('b', 'Boş')}${th('ay', 'Ort. Y')}${th('ab', 'Ort. B')}</tr>
          ${rows}
        </table>
      </div>
      <p class="muted" style="font-size:12px;margin:8px 4px 2px">Çıkan: o konudan denemelerde yanlış + boş işaretlediğin toplam soru. Ort. Y / Ort. B: deneme başına ortalama yanlış / boş sayın.</p>
    </div>
    <div class="card">
      <h3>📈 Deneme Deneme Netler — ${esc(statLesson)}</h3>
      ${histRows}
      <canvas id="lessonChart" height="160" style="margin-top:10px"></canvas>
    </div>`;
  drawLessonChart(hist);
}

function renderGeneralStats(box) {
  const exams = loadExams();
  const block = (type, cvId) => {
    const list = exams.filter(e => e.type === type);
    const nets = list.map(e => examTotals(e).net);
    const avg = nets.length ? nets.reduce((a, v) => a + v, 0) / nets.length : null;
    const best = nets.length ? Math.max(...nets) : null;
    const worstT = nets.length ? Math.min(...nets) : null;
    const ordered = [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
    const avg5t = ordered.length ? ordered.reduce((a, e) => a + examTotals(e).net, 0) / ordered.length : null;
    const tb = list.reduce((a, e) => { const t = examTotals(e); a.b += t.bos; a.y += t.yanlis; return a; }, { b: 0, y: 0 });
    return `<div class="card">
      <h3>${type} — ${list.length} deneme</h3>
      <div class="exam-nums" style="margin-bottom:10px">
        <div class="num">📊 Ort. Net<b>${avg === null ? '–' : fmtNet(avg)}</b></div>
        <div class="num">🕔 Son 5 Ort.<b>${avg5t === null ? '–' : fmtNet(avg5t)}</b></div>
        <div class="num">🏆 En Yüksek<b>${best === null ? '–' : fmtNet(best)}</b></div>
        <div class="num">📉 En Düşük<b>${worstT === null ? '–' : fmtNet(worstT)}</b></div>
        <div class="num">⬜ Toplam Boş<b>${tb.b}</b></div>
        <div class="num">❌ Toplam Yanlış<b>${tb.y}</b></div>
      </div>
      <canvas id="${cvId}" height="160"></canvas>
      ${list.length ? '' : '<p class="muted">Henüz veri yok.</p>'}
    </div>`;
  };
  box.innerHTML = `
    <div class="stats-grid">
      ${generalStripHTML()}
    </div>
    ${block('TYT', 'genTytChart')}
    ${block('AYT', 'genAytChart')}`;
  drawGenChart('genTytChart', exams.filter(e => e.type === 'TYT'));
  drawGenChart('genAytChart', exams.filter(e => e.type === 'AYT'));
}

function drawGenChart(cvId, list) {
  const cv = document.getElementById(cvId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  cv.width = cv.offsetWidth || 600; cv.height = 160;
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!sorted.length) return;
  const vals = sorted.map(e => examTotals(e).net);
  const max = Math.max(...vals, 10), min = Math.min(...vals, 0);
  const pad = 30;
  const X = i => pad + i * ((cv.width - pad * 2) / Math.max(sorted.length - 1, 1));
  const Y = v => cv.height - 20 - ((v - min) / Math.max(max - min, 1)) * (cv.height - 50);
  ctx.strokeStyle = '#eee'; ctx.fillStyle = '#999'; ctx.font = '11px Inter';
  for (let g = 0; g < 4; g++) {
    const v = min + (max - min) * g / 3, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(cv.width - 10, y); ctx.stroke();
    ctx.fillText(v.toFixed(0), 2, y + 4);
  }
  ctx.strokeStyle = '#6c3df5'; ctx.lineWidth = 3; ctx.beginPath();
  sorted.forEach((e, i) => { i ? ctx.lineTo(X(i), Y(vals[i])) : ctx.moveTo(X(0), Y(vals[0])); });
  ctx.stroke();
  sorted.forEach((e, i) => {
    ctx.fillStyle = '#6c3df5'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 2.2, 0, 7); ctx.fill();
    let lbl = e.date;
    try { lbl = new Date(e.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' }); } catch (err) {}
    ctx.fillStyle = '#6b7280'; ctx.fillText(lbl, X(i) - 14, cv.height - 4);
  });
}

function drawLessonChart(hist) {
  const cv = document.getElementById('lessonChart');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = cv.offsetWidth || 600; cv.height = 160;
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!hist.length) return;
  const vals = hist.map(h => h.net);
  const max = Math.max(...vals, 5), min = Math.min(...vals, 0);
  const pad = 30;
  const X = i => pad + i * ((cv.width - pad * 2) / Math.max(hist.length - 1, 1));
  const Y = v => cv.height - 20 - ((v - min) / Math.max(max - min, 1)) * (cv.height - 50);
  ctx.strokeStyle = '#eee'; ctx.fillStyle = '#999'; ctx.font = '11px Inter';
  for (let g = 0; g < 4; g++) {
    const v = min + (max - min) * g / 3, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(cv.width - 10, y); ctx.stroke();
    ctx.fillText(v.toFixed(0), 2, y + 4);
  }
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.beginPath();
  hist.forEach((h, i) => { i ? ctx.lineTo(X(i), Y(vals[i])) : ctx.moveTo(X(0), Y(vals[0])); });
  ctx.stroke();
  hist.forEach((h, i) => {
    ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(i), Y(vals[i]), 2.2, 0, 7); ctx.fill();
    let lbl = h.date;
    try { lbl = new Date(h.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' }); } catch (e) {}
    ctx.fillStyle = '#6b7280'; ctx.fillText(lbl, X(i) - 14, cv.height - 4);
  });
}

// ---------- biten konular ----------
let doneType = 'TYT', doneLesson = null;
const DONE_KEY = 'yks_ilknur_done_v1';

function loadDone() { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; } catch (e) { return {}; } }
function saveDone(o) { localStorage.setItem(DONE_KEY, JSON.stringify(o)); schedulePush(); }
function doneKey(type, lesson, topic) { return type + '|' + lesson + '|' + topic; }

function setDoneFilter(t) {
  doneType = t; doneLesson = null;
  document.querySelectorAll('.btab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  renderDone();
}
function openDoneLesson(lname) {
  doneLesson = lname;
  renderDone();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function backDoneLessons() { doneLesson = null; renderDone(); }

function toggleDone(li, ti, field) {
  const lname = LESSONS[doneType][li];
  const tname = (TOPICS[doneType][lname] || [])[ti];
  if (!tname) return;
  const d = loadDone();
  const k = doneKey(doneType, lname, tname);
  const cur = d[k] || { lec: false, test: false };
  cur[field] = !cur[field];
  d[k] = cur;
  saveDone(d);
  renderDone();
}

function renderDone() {
  const box = document.getElementById('doneBody');
  if (!box) return;
  const done = loadDone();
  // seviye 1: ders listesi
  if (!doneLesson) {
    box.innerHTML = `<div class="exam-list">` + LESSONS[doneType].map(lname => {
      const topics = TOPICS[doneType][lname] || [];
      const fin = topics.filter(t => {
        const s = done[doneKey(doneType, lname, t)] || {};
        return s.lec && s.test;
      }).length;
      const pct = topics.length ? Math.round(fin / topics.length * 100) : 0;
      return `<div class="exam-card" onclick="openDoneLesson('${esc(lname)}')">
        <div class="exam-top"><span class="exam-name">${esc(lname)}</span><span class="badge ${doneType}">${doneType}</span></div>
        <div class="exam-date">${fin}/${topics.length} konu bitti • %${pct}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>`;
    }).join('') + `</div>`;
    return;
  }
  // seviye 2: konu listesi
  const topics = TOPICS[doneType][doneLesson] || [];
  const agg = {};
  lessonAgg(doneType, doneLesson).forEach(r => { agg[r.konu] = r; });
  const fin = topics.filter(t => {
    const s = done[doneKey(doneType, doneLesson, t)] || {};
    return s.lec && s.test;
  }).length;
  const pct = topics.length ? Math.round(fin / topics.length * 100) : 0;
  const rows = topics.map((tname, ti) => {
    const li = LESSONS[doneType].indexOf(doneLesson);
    const s = done[doneKey(doneType, doneLesson, tname)] || { lec: false, test: false };
    const finished = s.lec && s.test;
    const a = agg[tname];
    const rate = (!a || a.ay === null)
      ? '<span class="dash">–</span>'
      : `<span class="rate-badge ${a.ay <= 0.5 ? 'good' : a.ay <= 2 ? 'mid' : 'low'}">~${fmt1(a.ay)}</span>`;
    return `<div class="done-row${finished ? ' finished' : ''}">
      <span class="done-name">${esc(tname)}</span>
      <label class="done-check"><input type="checkbox"${s.lec ? ' checked' : ''} onchange="toggleDone(${li},${ti},'lec')"><span>📖 Anlatım</span></label>
      <label class="done-check"><input type="checkbox"${s.test ? ' checked' : ''} onchange="toggleDone(${li},${ti},'test')"><span>📝 Test</span></label>
      <span class="done-rate" title="Deneme başına ortalama yanlış">${rate}</span>
    </div>`;
  }).join('');
  box.innerHTML = `
    <button class="back-btn" onclick="backDoneLessons()">← Derslere dön</button>
    <h3 style="margin:6px 0 4px">${esc(doneLesson)} <span class="badge ${doneType}">${doneType}</span></h3>
    <p class="muted">${fin}/${topics.length} konu bitti • %${pct}</p>
    <div class="bar" style="margin-bottom:12px"><i style="width:${pct}%"></i></div>
    <div class="card" style="padding:8px">${rows}</div>`;
}

// ---------- yapay zeka sohbeti ----------
const CHAT_LS = 'yks_ai_chat_v1';
let chatMem = [];      // {role, text, images?} — resimler yalnızca bellekte tutulur
let pendingImages = []; // gönderilmeyi bekleyen fotoğraflar (dataURL)

function loadChat() { try { chatMem = JSON.parse(localStorage.getItem(CHAT_LS)) || []; } catch (e) { chatMem = []; } }
function saveChat() {
  try { localStorage.setItem(CHAT_LS, JSON.stringify(chatMem.map(m => ({ role: m.role, text: m.text })))); } catch (e) {}
}

function md(t) {
  let s = esc(t);
  s = s.replace(/```([\s\S]*?)```/g, (m, c) => `<pre>${c.replace(/^\n/, '')}</pre>`);
  s = s.replace(/^### (.*)$/gm, '<b>$1</b>');
  s = s.replace(/^## (.*)$/gm, '<b>$1</b>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function renderChat() {
  const box = document.getElementById('chatBox');
  if (!box) return;
  if (!chatMem.length) {
    box.innerHTML = '<div class="chat-hint">👋 Merhaba! Ben YKS koçun. Soru sorabilir ya da sorunun fotoğrafını gönderebilirsin.<br><br>Örn: "Türevde zincir kuralını anlat" ya da 📷 ile fotoğraf ekle.</div>';
    return;
  }
  box.innerHTML = chatMem.map(m => {
    const imgs = (m.images || []).map(src => `<img src="${src}" class="chat-img" alt="soru fotoğrafı">`).join('');
    return `<div class="bubble ${m.role === 'user' ? 'me' : 'ai'}">${imgs}${m.text ? `<div>${md(m.text)}</div>` : ''}</div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

function renderPreview() {
  const p = document.getElementById('imgPreview');
  if (!p) return;
  p.innerHTML = pendingImages.map((src, i) =>
    `<span class="thumb-wrap"><img src="${src}" class="thumb"><button type="button" onclick="rmPending(${i})">✕</button></span>`
  ).join('');
}
function rmPending(i) { pendingImages.splice(i, 1); renderPreview(); }

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 2 - pendingImages.length);
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try { pendingImages.push(await fileToDataUrl(f)); } catch (err) {}
  }
  e.target.value = '';
  renderPreview();
});

document.getElementById('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inp = document.getElementById('chatInput');
  const text = inp.value.trim();
  if (!text && !pendingImages.length) return;
  const btn = document.getElementById('chatSend');
  chatMem.push({ role: 'user', text, images: [...pendingImages] });
  inp.value = '';
  pendingImages = [];
  renderPreview();
  saveChat(); renderChat();
  btn.disabled = true;
  // gönderilecek geçmişi "yazıyor…" göstergesinden ÖNCE al (son mesaj kullanıcı olmalı)
  const payload = chatMem.filter(m => m.text || (m.images || []).length).slice(-12);
  chatMem.push({ role: 'model', text: '✍️ yazıyor…' });
  renderChat();
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload }),
    });
    const j = await r.json();
    chatMem.pop();
    chatMem.push({ role: 'model', text: (r.ok && j.reply) ? j.reply : ('⚠️ ' + (j.error || 'Cevap alınamadı.')) });
  } catch (err) {
    chatMem.pop();
    chatMem.push({ role: 'model', text: '⚠️ Bağlantı hatası, internetini kontrol edip tekrar dene.' });
  }
  btn.disabled = false;
  saveChat(); renderChat();
});

function clearChat() {
  if (!chatMem.length || confirm('Sohbet temizlensin mi?')) {
    chatMem = [];
    saveChat(); renderChat();
  }
}

// ---------- detay modal (ders + konu kırılımı) ----------
function openDetail(id) {
  const ex = loadExams().find(e => e.id === id);
  if (!ex) return;
  const t = examTotals(ex);
  const rows = ex.lessons.map((L, li) => {
    const lt = lessonTotals(ex.type, L.name, L);
    const active = L.topics.filter(T => ((T.y || 0) + (T.b || 0)) > 0);
    const detail = `<div class="topic-mini">
      <div class="topic-mini-row"><span>✅ Otomatik doğru (girilmeyen sorular)</span><span><b>${lt.dogru}</b></span></div>
      ${active.map(T =>
        `<div class="topic-mini-row"><span>${esc(T.name)}</span><span>❌ ${T.y || 0} • ⬜ ${T.b || 0}</span></div>`
      ).join('') || '<div class="muted" style="font-size:12px">Yanlış/boş işaretlenmemiş — tüm sorular doğru sayıldı.</div>'}
    </div>`;
    return `<div class="detail-lesson">
      <div class="detail-lesson-head" onclick="this.parentElement.classList.toggle('open')">
        <b>${esc(L.name)}</b>
        <span>✅ ${lt.dogru} • ❌ ${lt.yanlis} • ⬜ ${lt.bos} • 🎯 <b>${lt.net.toFixed(2)}</b> <span class="caret">▾</span></span>
      </div>
      <div class="detail-lesson-body">${detail}</div>
    </div>`;
  }).join('');
  const weak = [...ex.lessons].map(L => ({ L, t: lessonTotals(ex.type, L.name, L) })).sort((a, b) => b.t.yanlis - a.t.yanlis)[0];
  document.getElementById('modalContent').innerHTML = `
    <div class="detail-head"><h2 style="margin:0">${esc(ex.name)}</h2><span class="badge ${ex.type}">${ex.type}</span></div>
    <p class="muted">📅 ${fmtDate(ex.date)} • ✅ ${t.dogru} doğru • ❌ ${t.yanlis} yanlış • ⬜ ${t.bos} boş • 🎯 <b>${t.net.toFixed(2)} net</b></p>
    ${weak && weak.t.yanlis > 0 ? `<p>🎯 En çok yanlış: <b>${esc(weak.L.name)} (${weak.t.yanlis} yanlış)</b> — önceliği buraya ver.</p>` : ''}
    ${rows}
    <button class="danger-btn" onclick="deleteExam('${ex.id}')">🗑 Sınavı Sil</button>
  `;
  document.getElementById('examModal').classList.add('open');
}
function closeModal(){ document.getElementById('examModal').classList.remove('open'); }
document.getElementById('examModal').addEventListener('click', e => { if (e.target.id === 'examModal') closeModal(); });

function deleteExam(id) {
  const pw = prompt('🗑 Silmek için şifreyi gir:');
  if (pw === null) return;
  if (pw !== DEL_PW) { alert('❌ Yanlış şifre!'); return; }
  if (!confirm('Bu sınav silinsin mi?')) return;
  saveExams(loadExams().filter(e => e.id !== id));
  closeModal(); renderAll();
}

// ---------- SINAV EKLE: ders akordiyon + konu satırlarında +1 ----------
function buildLessonFields() {
  const type = document.getElementById('fType').value;
  const box = document.getElementById('lessonFields');
  box.innerHTML = LESSONS[type].map((lname, li) => {
    const topics = TOPICS[type][lname] || [];
    const quota = (QUOTA[type] && QUOTA[type][lname]) || 0;
    const rows = topics.map((tname, ti) => `
      <tr>
        <td class="topic-name">${esc(tname)}</td>
        <td><div class="cell"><input type="number" class="count-input" id="v-${li}-${ti}-y" value="0" min="0" max="999" oninput="syncRow(${li},${ti})"><button type="button" class="plus bad" onclick="chg(${li},${ti},'y',1)">+1</button><button type="button" class="minus" onclick="chg(${li},${ti},'y',-1)">−</button></div></td>
        <td><div class="cell"><input type="number" class="count-input" id="v-${li}-${ti}-b" value="0" min="0" max="999" oninput="syncRow(${li},${ti})"><button type="button" class="plus idle" onclick="chg(${li},${ti},'b',1)">+1</button><button type="button" class="minus" onclick="chg(${li},${ti},'b',-1)">−</button></div></td>
      </tr>`).join('');
    return `<div class="acc" id="acc-${li}">
      <div class="acc-head" onclick="toggleAcc(${li})">
        <div><b>${esc(lname)}</b> <span class="quota">${quota} soru</span></div>
        <div class="acc-sum" id="sum-${li}"></div>
      </div>
      <div class="acc-body">
        <table class="topic-table">
          <tr><th>Konu</th><th>Yanlış</th><th>Boş</th></tr>
          ${rows}
        </table>
        <button type="button" class="reset-btn" onclick="resetLesson(${li})">↺ Bu dersi sıfırla</button>
      </div>
    </div>`;
  }).join('');
  LESSONS[type].forEach((_, li) => updateLessonSum(li));
  updateGrandTotal();
}

function topicCount(li) { return (TOPICS[document.getElementById('fType').value][LESSONS[document.getElementById('fType').value][li]] || []).length; }

function getNum(li, ti, field) {
  return Number(document.getElementById(`v-${li}-${ti}-${field}`).value) || 0;
}
function setNum(li, ti, field, v) {
  document.getElementById(`v-${li}-${ti}-${field}`).value = v;
}

function chg(li, ti, field, delta) {
  let v = getNum(li, ti, field) + delta;
  if (v < 0) v = 0;
  if (v > 999) v = 999;
  setNum(li, ti, field, v);
  syncRow(li, ti);
}

function syncRow(li, ti) {
  // kutuya elle yazılanı sınırla
  ['y', 'b'].forEach(f => {
    let v = getNum(li, ti, f);
    if (v < 0) setNum(li, ti, f, 0);
    if (v > 999) setNum(li, ti, f, 999);
  });
  updateLessonSum(li);
  updateGrandTotal();
}

function updateLessonSum(li) {
  const type = document.getElementById('fType').value;
  const lname = LESSONS[type][li];
  const quota = (QUOTA[type] && QUOTA[type][lname]) || 0;
  let y = 0, b = 0;
  for (let ti = 0; ti < topicCount(li); ti++) {
    y += getNum(li, ti, 'y');
    b += getNum(li, ti, 'b');
  }
  const marked = y + b;
  const auto = Math.max(quota - marked, 0);
  const over = marked > quota;
  const durum = over
    ? `<span class="k-warn">⚠️ kota ${marked - quota} soru aşıldı!</span>`
    : `<span class="k-ok">✅ ${auto} soru otomatik doğru</span>`;
  document.getElementById(`sum-${li}`).innerHTML =
    `<span class="big-net">🎯 ${fmtNet(netOf(auto, y))} <small>net</small></span><br><span class="acc-detail">✅ ${auto} • ❌ ${y} • ⬜ ${b}</span><br>${durum} <span class="caret">▾</span>`;
  document.getElementById(`acc-${li}`).classList.toggle('acc-warn', over);
}

function updateGrandTotal() {
  const type = document.getElementById('fType').value;
  let d = 0, y = 0, b = 0, quotaSum = 0;
  LESSONS[type].forEach((lname, li) => {
    quotaSum += (QUOTA[type] && QUOTA[type][lname]) || 0;
    for (let ti = 0; ti < topicCount(li); ti++) {
      y += getNum(li, ti, 'y');
      b += getNum(li, ti, 'b');
    }
  });
  d = Math.max(quotaSum - y - b, 0);
  const el = document.getElementById('grandTotal');
  if (el) el.innerHTML = `✅ ${d} doğru • ❌ ${y} yanlış • ⬜ ${b} boş • 🎯 <b>${fmtNet(netOf(d, y))} net</b>`;
}

function toggleAcc(li) { document.getElementById(`acc-${li}`).classList.toggle('open'); }

function resetLesson(li) {
  for (let ti = 0; ti < topicCount(li); ti++) {
    ['y', 'b'].forEach(f => setNum(li, ti, f, 0));
  }
  updateLessonSum(li);
  updateGrandTotal();
}

document.getElementById('fType').addEventListener('change', buildLessonFields);

document.getElementById('examForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('fType').value;
  const name = document.getElementById('fName').value.trim();
  const date = document.getElementById('fDate').value;
  if (!name || !date) { alert('Sınav adı ve tarihi zorunlu.'); return; }
  const lessons = LESSONS[type].map((lname, li) => ({
    name: lname,
    topics: (TOPICS[type][lname] || []).map((tname, ti) => ({
      name: tname,
      d: 0,
      y: getNum(li, ti, 'y'),
      b: getNum(li, ti, 'b'),
    }))
  }));
  // kota kontrolü: yanlış + boş toplamı kotayı aşamaz (kalan otomatik doğru)
  const problems = [];
  lessons.forEach((L) => {
    const quota = (QUOTA[type] && QUOTA[type][L.name]) || 0;
    let marked = 0;
    L.topics.forEach(T => { marked += T.y + T.b; });
    if (marked > quota) problems.push(`• ${L.name}: ${marked}/${quota} — kota ${marked - quota} soru aşıldı`);
  });
  if (problems.length) {
    alert('⚠️ Sınav kaydedilemedi, soru sayıları kotayı aşıyor:\n\n' + problems.join('\n'));
    const firstBad = lessons.findIndex((L) => {
      const quota = (QUOTA[type] && QUOTA[type][L.name]) || 0;
      let marked = 0;
      L.topics.forEach(T => { marked += T.y + T.b; });
      return marked > quota;
    });
    if (firstBad >= 0) {
      document.getElementById(`acc-${firstBad}`).classList.add('open');
      document.getElementById(`acc-${firstBad}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }
  const exams = loadExams();
  if (editingId) {
    const idx = exams.findIndex(e => e.id === editingId);
    if (idx >= 0) exams[idx] = { id: editingId, name, type, date, lessons };
    editingId = null;
    document.getElementById('saveBtn').textContent = '💾 Kaydet';
    document.getElementById('editBanner').style.display = 'none';
  } else {
    exams.push({ id: 'e' + Date.now(), name, type, date, lessons });
  }
  saveExams(exams);
  e.target.reset();
  document.getElementById('fDate').value = '2026-09-26';
  document.getElementById('fType').value = type;
  buildLessonFields();
  renderAll();
  goExams(type);
});

// ---------- öncelik ----------
let priType = 'TYT';
function norm2(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/î/g, 'i').replace(/[’‘'ʼ`]/g, '').replace(/[^a-zçğıöşü0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Elle eşleştirme: "tip|ders|normalize-konu" -> dağılım satır adı
// (dağılım başlıkları daha genel olduğunda birebir bulunamayan konular için)
const OSMAP = {
'tyt|türkçe|söz yorumu': 'Sözcükte Anlam',
'tyt|türkçe|deyim ve atasözü': 'Sözcükte Anlam',
'tyt|türkçe|sözcükte yapı ekler': 'Dil Bilgisi',
'tyt|türkçe|sözcük türleri': 'Dil Bilgisi',
'tyt|türkçe|isimler': 'Dil Bilgisi',
'tyt|türkçe|zamirler': 'Dil Bilgisi',
'tyt|türkçe|sıfatlar': 'Dil Bilgisi',
'tyt|türkçe|zarflar': 'Dil Bilgisi',
'tyt|türkçe|edat bağlaç ünlem': 'Dil Bilgisi',
'tyt|türkçe|fiiller': 'Dil Bilgisi',
'tyt|türkçe|fiilde anlam kip kişi yapı': 'Dil Bilgisi',
'tyt|türkçe|ek fiil': 'Dil Bilgisi',
'tyt|türkçe|fiilimsi': 'Dil Bilgisi',
'tyt|türkçe|fiilde çatı': 'Dil Bilgisi',
'tyt|türkçe|sözcük grupları': 'Dil Bilgisi',
'tyt|türkçe|cümlenin ögeleri': 'Dil Bilgisi',
'tyt|türkçe|cümle türleri': 'Dil Bilgisi',
'tyt|tarih|insanlığın ilk dönemleri': 'İlk ve Orta Çağlarda Türk Dünyası',
'tyt|tarih|ortaçağda dünya': 'İlk ve Orta Çağlarda Türk Dünyası',
'tyt|tarih|yerleşme ve devletleşme sürecinde selçuklu türkiyesi': 'Türklerin İslamiyeti Kabulü ve İlk Türk İslam Devletleri',
'tyt|tarih|yeni çağ avrupa tarihi': 'Değişim Çağında Avrupa ve Osmanlı',
'tyt|tarih|yakın çağ avrupa tarihi': 'Değişim Çağında Avrupa ve Osmanlı',
'tyt|tarih|osmanlı devletinde arayış yılları': 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya',
'tyt|tarih|18 yüzyılda değişim ve diplomasi': 'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)',
'tyt|tarih|en uzun yüzyıl': 'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)',
'tyt|tarih|osmanlı kültür ve medeniyeti': 'Dünya Gücü Osmanlı',
'tyt|tarih|20 yüzyılda osmanlı devleti': 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya',
'tyt|tarih|ı dünya savaşı': 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya',
'tyt|tarih|mondros ateşkesi işgaller ve cemiyetler': 'Millî Mücadele',
'tyt|tarih|kurtuluş savaşına hazırlık dönemi': 'Millî Mücadele',
'tyt|tarih|ı tbmm dönemi': 'Millî Mücadele',
'tyt|tarih|kurtuluş savaşı ve antlaşmalar': 'Millî Mücadele',
'tyt|tarih|ıı tbmm dönemi ve çok partili hayata geçiş': 'Atatürkçülük ve Türk İnkılabı',
'tyt|tarih|türk inkılabı': 'Atatürkçülük ve Türk İnkılabı',
'tyt|tarih|atatürk ilkeleri': 'Atatürkçülük ve Türk İnkılabı',
'tyt|tarih|atatürk dönemi türk dış politikası': 'Atatürkçülük ve Türk İnkılabı',
'tyt|coğrafya|iklimler': 'İklim Bilgisi',
'tyt|coğrafya|basınç ve rüzgarlar': 'Atmosfer ve Sıcaklık',
'tyt|coğrafya|nem yağış ve buharlaşma': 'İklim Bilgisi',
'tyt|coğrafya|iç kuvvetler dış kuvvetler': 'İç ve Dış Kuvvetler',
'tyt|coğrafya|su toprak ve bitkiler': 'Doğa ve İnsan',
'tyt|coğrafya|göç': 'Nüfus ve Yerleşme',
'tyt|coğrafya|çevre ve toplum': 'Doğa ve İnsan',
'tyt|felsefe|felsefenin konusu': 'Felsefenin Alanı',
'tyt|felsefe|din kültür ve medniyet': 'Din Felsefesi',
'tyt|din|hz mhammed s a v': 'Hz. Muhammed (S.A.V)',
'tyt|din|din kültür ve medniyet': 'Din, Kültür ve Medeniyet',
'tyt|din|dünya ve ahiret': 'Bilgi ve İnanç',
'tyt|din|inançla ilgili meseleler': 'Bilgi ve İnanç',
'tyt|din|anadolu da islam': 'İslam Düşüncesinde Yorumlar, Mezhepler',
'tyt|din|islam düşüncesinde tasavvufi yorumlar': 'İslam Düşüncesinde Yorumlar, Mezhepler',
'tyt|matematik|bölme ve bölünebilme': 'Bölünebilme Kuralları',
'tyt|matematik|ebob ekok': 'OBEB-OKEK',
'tyt|matematik|fonskiyonlar': 'Fonksiyonlar',
'tyt|matematik|2 dereceden denklemler': 'Denklem Çözme',
'tyt|matematik|permütasyon ve kombinasyon': 'Permütasyon-Kombinasyon',
'tyt|geometri|temel kavramlar': 'Açılar ve Üçgenler',
'tyt|geometri|doğruda açılar': 'Açılar ve Üçgenler',
'tyt|geometri|üçgende açılar': 'Açılar ve Üçgenler',
'tyt|geometri|özel üçgenler': 'Açılar ve Üçgenler',
'tyt|geometri|dik üçgen': 'Açılar ve Üçgenler',
'tyt|geometri|ikizkenar üçgen': 'Açılar ve Üçgenler',
'tyt|geometri|eşkenar üçgen': 'Açılar ve Üçgenler',
'tyt|geometri|açıortay': 'Açılar ve Üçgenler',
'tyt|geometri|kenarortay': 'Açılar ve Üçgenler',
'tyt|geometri|eşlik ve benzerlik': 'Açılar ve Üçgenler',
'tyt|geometri|üçgende alan': 'Açılar ve Üçgenler',
'tyt|geometri|üçgende benzerlik': 'Açılar ve Üçgenler',
'tyt|geometri|açı kenar bağıntıları': 'Açılar ve Üçgenler',
'tyt|geometri|özel dörtgenler': 'Çokgenler',
'tyt|geometri|dörtgenler': 'Çokgenler',
'tyt|geometri|paralelkenar': 'Çokgenler',
'tyt|geometri|çemberde açı': 'Çember ve Daire',
'tyt|geometri|çemberde uzun': 'Çember ve Daire',
'tyt|geometri|dairede çevre ve alan': 'Çember ve Daire',
'tyt|geometri|noktanın analitiği': 'Analitik Geometri',
'tyt|geometri|doğrunun analitiği': 'Analitik Geometri',
'tyt|geometri|dönüşüm geometrisi': 'Analitik Geometri',
'tyt|geometri|çemberin analitiği': 'Analitik Geometri',
'tyt|geometri|prizmalar': 'Katı Cisimler',
'tyt|geometri|küp': 'Katı Cisimler',
'tyt|geometri|silindir': 'Katı Cisimler',
'tyt|geometri|piramit': 'Katı Cisimler',
'tyt|geometri|koni': 'Katı Cisimler',
'tyt|geometri|küre': 'Katı Cisimler',
'tyt|kimya|atom ve periyodik sistem': 'Atomun Yapısı',
'tyt|kimya|doğa ve kimya': 'Kimya Her Yerde',
'tyt|biyoloji|hücrede bölünme üreme': 'Hücre Bölünmeleri ve Üreme',
'tyt|biyoloji|bitki biyolojisi': 'Bitkiler Biyolojisi',
'ayt|edebiyat|servet i fünun edebiyatı': 'Servet-i Fünun ve Fecr-i Ati Edebiyatı',
'ayt|tarih|orta çağda dünya': 'İlk ve Orta Çağlarda Türk Dünyası',
'ayt|tarih|beylikten devlete osmanlı medeniyeti': 'Beylikten Devlete Osmanlı Siyaseti (1302-1453)',
'ayt|tarih|klasik çağda osmanlı toplum düzeni': 'Sultan ve Osmanlı Merkez Teşkilatı',
'ayt|tarih|değişen dünya dengeleri karşısında osmanlı siyaseti': 'Değişim Çağında Avrupa ve Osmanlı',
'ayt|tarih|sermaye ve emek': 'XIX. ve XX. Yüzyılda Değişen Sosyoekonomik Hayat',
'ayt|tarih|xıx ve xx yüzyılda değişen gündelik hayat': 'XIX. ve XX. Yüzyılda Değişen Sosyoekonomik Hayat',
'ayt|tarih|xx yüzyıl başlarında osmanlı devleti ve dünya': '20. Yüzyıl Başlarında Osmanlı Devleti ve Dünya',
'ayt|tarih|ıı dünya savaşı sonrasında türkiye ve dünya': 'II. Dünya Savaşı Sürecinde Türkiye ve Dünya',
'ayt|coğrafya|biyoçeşitlilik': 'Ekosistemlerin Özellikleri ve İşleyişi',
'ayt|coğrafya|biyomlar': 'Ekosistemlerin Özellikleri ve İşleyişi',
'ayt|coğrafya|ekosistemin unsurları': 'Ekosistemlerin Özellikleri ve İşleyişi',
'ayt|coğrafya|enerji akışı ve madde döngüsü': 'Ekosistemlerin Özellikleri ve İşleyişi',
'ayt|coğrafya|türkiyede nüfus ve yerleşme': 'Şehirler ve Kırsal Yerleşmeler',
'ayt|coğrafya|ekonomik faaliyetler ve doğal kaynaklar': 'Dünyada Doğal Kaynak ve Ekonomi',
'ayt|coğrafya|türkiye ekonomisi': 'Ekonomi, Şehirleşme ve Göç',
'ayt|coğrafya|türkiyenin ekonomi politikaları': 'Ekonomi, Şehirleşme ve Göç',
'ayt|coğrafya|türkiye ekonomisinin sektörel dağılımı': 'Ekonomi, Şehirleşme ve Göç',
'ayt|coğrafya|geçmişten geleceğe şehir ve ekonomi': 'Ekonomi, Şehirleşme ve Göç',
'ayt|coğrafya|türkiyenin işlevsel bölgeleri ve kalkınma projeleri': 'İşlevsel Bölge ve Kalkınma Projeleri',
'ayt|coğrafya|türkiyede madenler ve enerji kaynakları': 'Türkiye’de Tarım, Sanayi, Maden ve Enerji Kaynakları',
'ayt|coğrafya|türkiyede sanayi': 'Türkiye’de Tarım, Sanayi, Maden ve Enerji Kaynakları',
'ayt|coğrafya|türkiyede hayvancılık': 'Türkiye’de Tarım, Sanayi, Maden ve Enerji Kaynakları',
'ayt|coğrafya|türkiyede ticaret ve turizm': 'Türkiye’de Turizm',
'ayt|coğrafya|göç ve şehirleşme': 'Ekonomi, Şehirleşme ve Göç',
'ayt|coğrafya|küresel ve bölgesel örgütler': 'Uluslararası Örgütler',
'ayt|coğrafya|çatışma bölgeleri': 'Jeopolitik Konum ve Ülkeler Arası Etkileşim',
'ayt|coğrafya|çevre sorunları ve türleri': 'Çevre Sorunları ve Geri Dönüşüm',
'ayt|coğrafya|madenler ve enerji kaynaklarının çevreye etkisi': 'Çevre Sorunları ve Geri Dönüşüm',
'ayt|coğrafya|doğal afetler': 'Çevre Sorunları ve Geri Dönüşüm',
'ayt|coğrafya|çevre ve toplum': 'Çevre Sorunları ve Geri Dönüşüm',
'ayt|coğrafya|çevre politikaları': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|coğrafya|çevresel örgütler': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|coğrafya|çevre anlaşmaları': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|coğrafya|doğal kaynakların sürdürülebilir kullanımı': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|coğrafya|ekolojik ayak izi': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|coğrafya|doğal çevrenin sınırlılığı': 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar',
'ayt|matematik|fonskiyonlar': 'Fonksiyonlar',
'ayt|matematik|permütasyon ve kombinasyon': 'Permütasyon-Kombinasyon-Olasılık-Binom',
'ayt|matematik|binom ve olasılık': 'Permütasyon-Kombinasyon-Olasılık-Binom',
'ayt|matematik|2 dereceden eşitsizlikler': '2. Dereceden Denklemler ve Eşitsizlikler',
'ayt|matematik|doğruda açılar': 'Doğruda ve Üçgende Açı',
'ayt|matematik|üçgende açılar': 'Doğruda ve Üçgende Açı',
'ayt|matematik|dik üçgen': 'Özel Üçgenler',
'ayt|matematik|ikizkenar üçgen': 'Özel Üçgenler',
'ayt|matematik|eşkenar üçgen': 'Özel Üçgenler',
'ayt|matematik|özel üçgenler': 'Özel Üçgenler',
'ayt|matematik|ikizkenar': 'Özel Üçgenler',
'ayt|matematik|üçgende alan': 'Üçgende Alan Benzerlik',
'ayt|matematik|üçgende benzerlik': 'Üçgende Alan Benzerlik',
'ayt|matematik|açı kenar bağıntıları': 'Açı Kenar Bağıntıları',
'ayt|matematik|çokgenler': 'Çokgenler',
'ayt|matematik|özel dörtgenler': 'Özel Dörtgenler',
'ayt|matematik|dörtgenler': 'Özel Dörtgenler',
'ayt|matematik|deltoid': 'Özel Dörtgenler',
'ayt|matematik|paralelkenar': 'Özel Dörtgenler',
'ayt|matematik|eşkenar dörtgen': 'Özel Dörtgenler',
'ayt|matematik|dikdörtgen': 'Özel Dörtgenler',
'ayt|matematik|kare': 'Özel Dörtgenler',
'ayt|matematik|yamuk': 'Özel Dörtgenler',
'ayt|matematik|çember ve daire': 'Çember ve Daire',
'ayt|matematik|katı cisimler uzay geometri': 'Katı Cisimler',
'ayt|matematik|dikdörtgenler prizması': 'Katı Cisimler',
'ayt|matematik|küp': 'Katı Cisimler',
'ayt|matematik|silindir': 'Katı Cisimler',
'ayt|matematik|piramit': 'Katı Cisimler',
'ayt|matematik|koni': 'Katı Cisimler',
'ayt|matematik|küre': 'Katı Cisimler',
};
function osymTotal(type, lesson, topic) {
  if (typeof DAGILIM === 'undefined') return null;
  const nt = norm2(topic);
  const order = [lesson, ...(DAGILIM[type] || []).map(x => x.lesson).filter(l => l !== lesson)];
  const sumRow = (D, r) => {
    let s = 0, any = false;
    r.v.forEach(v => { if (typeof v === 'number') { s += v; any = true; } });
    return any ? s / (D.years ? D.years.length : r.v.length) : null;
  };
  const findRow = target => {
    const t = norm2(target);
    for (const ln of order) {
      const D = (DAGILIM[type] || []).find(x => x.lesson === ln);
      if (!D) continue;
      const r = D.rows.find(r => norm2(r.k) === t);
      if (r) return { D, r };
    }
    return null;
  };
  // 1) birebir eşleşme (önce aynı ders)
  for (const ln of order) {
    const D = (DAGILIM[type] || []).find(x => x.lesson === ln);
    if (!D) continue;
    const r = D.rows.find(r => norm2(r.k) === nt);
    if (r) {
      const s = sumRow(D, r);
      if (s !== null) return s;
    }
  }
  // 2) elle eşleştirme haritası
  const fb = OSMAP[type.toLocaleLowerCase('tr-TR') + '|' + lesson.toLocaleLowerCase('tr-TR') + '|' + nt];
  if (fb) {
    const hit = findRow(fb);
    if (hit) {
      const s = sumRow(hit.D, hit.r);
      if (s !== null) return s;
    }
  }
  // 3) benzer isim (örn. "Sayı Problemleri" -> "Problemler")
  const fuzzy = (D, minLen) => {
    let hit = null, bestLen = 0;
    D.rows.forEach(r => {
      const nk = norm2(r.k);
      if (nt.includes(nk) || nk.includes(nt)) {
        const L = Math.min(nk.length, nt.length);
        if (L > bestLen) { bestLen = L; hit = r; }
      }
    });
    return (hit && bestLen >= minLen) ? hit : null;
  };
  for (const ln of order) {
    const D = (DAGILIM[type] || []).find(x => x.lesson === ln);
    if (!D) continue;
    const r = fuzzy(D, ln === lesson ? 5 : 8);
    if (r) {
      const s = sumRow(D, r);
      if (s !== null) return s;
    }
  }
  return null;
}
function setPriFilter(t) {
  priType = t;
  document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  renderPriority();
}
function renderPriority() {
  const box = document.getElementById('priBody');
  if (!box) return;
  const rows = [];
  LESSONS[priType].forEach(lname => {
    lessonAgg(priType, lname).forEach(r => {
      if (r.y + r.b === 0) return;
      const o = osymTotal(priType, lname, r.konu);
      const w = 1 + (o || 0) / 10;
      rows.push({ ders: lname, konu: r.konu, y: r.y, b: r.b, ay: r.ay, o, score: (r.y * 1 + r.b * 1.5) * w });
    });
  });
  rows.sort((a, b) => b.score - a.score);
  if (!rows.length) { box.innerHTML = '<div class="empty">Henüz yanlış/boş yok — harika gidiyorsun 🎉</div>'; return; }
  const cards = rows.slice(0, 5).map((r, i) =>
    `<div class="card"><h3>${i + 1}. ${esc(r.ders)} • ${esc(r.konu)}</h3>
    <div class="exam-nums"><div class="num">❌ Yanlış<b>${r.y}</b></div><div class="num">⬜ Boş<b>${r.b}</b></div><div class="num">📚 ÖSYM ort.<b>${r.o === null ? '–' : fmt1(r.o)}</b></div><div class="num net">🎯 Skor<b>${r.score.toFixed(1)}</b></div></div></div>`
  ).join('');
  const trs = rows.map((r, i) =>
    `<tr><td>${i + 1}</td><td class="dag-konu">${esc(r.ders)} • ${esc(r.konu)}</td><td>${r.o === null ? '<span class="dash">–</span>' : `<b>${fmt1(r.o)}</b>`}</td><td>${r.y}</td><td>${r.b}</td><td>${r.ay === null ? '–' : fmt1(r.ay)}</td><td><b>${r.score.toFixed(1)}</b></td></tr>`
  ).join('');
  box.innerHTML = `<h3>🔥 Önce bunlara çalış</h3>${cards}
    <div class="card" style="padding:10px"><h3>📋 Tüm sıralama</h3>
    <div class="dag-scroll"><table class="dag-table"><tr><th>#</th><th class="dag-konu">Konu</th><th>ÖSYM</th><th>Y</th><th>B</th><th>Ort. Y</th><th>Skor</th></tr>${trs}</table></div></div>`;
}

// ---------- karşılaştırma ----------
function renderCompareLists() {
  const exams = [...loadExams()].sort((a, b) => b.date.localeCompare(a.date));
  const a = document.getElementById('cmpA'), b = document.getElementById('cmpB');
  if (!a || !b) return;
  const keepA = a.value, keepB = b.value;
  const opts = exams.map(e => `<option value="${e.id}">${esc(e.name)} (${e.type}) — ${fmtDate(e.date)}</option>`).join('');
  a.innerHTML = opts; b.innerHTML = opts;
  if (exams.length > 1) {
    a.value = exams.some(e => e.id === keepA) ? keepA : exams[1].id;
    b.value = exams.some(e => e.id === keepB) ? keepB : exams[0].id;
  }
  renderCompare();
}
function renderCompare() {
  const box = document.getElementById('cmpBody');
  if (!box) return;
  const A = loadExams().find(e => e.id === document.getElementById('cmpA').value);
  const B = loadExams().find(e => e.id === document.getElementById('cmpB').value);
  if (!A || !B) { box.innerHTML = '<div class="empty">Karşılaştırmak için en az 2 deneme gerekli.</div>'; return; }
  const names = [...new Set([...A.lessons.map(l => l.name), ...B.lessons.map(l => l.name)])];
  const get = (ex, n) => {
    const L = (ex.lessons || []).find(l => l.name === n);
    return L ? lessonTotals(ex.type, n, L) : { dogru: 0, yanlis: 0, bos: 0, net: 0 };
  };
  const rows = names.map(n => {
    const a = get(A, n), b = get(B, n), d = b.net - a.net;
    const cls = d > 0 ? 'diff-up' : d < 0 ? 'diff-down' : '';
    const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '=';
    return `<tr><td class="dag-konu">${esc(n)}</td><td>${fmtNet(a.net)}</td><td>${fmtNet(b.net)}</td><td class="${cls}">${arrow} ${fmtNet(Math.abs(d))}</td></tr>`;
  }).join('');
  const ta = examTotals(A), tb = examTotals(B), td = tb.net - ta.net;
  box.innerHTML = `<div class="card" style="padding:10px"><h3>${esc(A.name)} 🆚 ${esc(B.name)}</h3>
    <div class="exam-nums" style="margin-bottom:10px"><div class="num">A Net<b>${fmtNet(ta.net)}</b></div><div class="num">B Net<b>${fmtNet(tb.net)}</b></div><div class="num net">Fark<b>${td > 0 ? '+' : ''}${fmtNet(td)}</b></div></div>
    <div class="dag-scroll"><table class="dag-table"><tr><th class="dag-konu">Ders</th><th>A Net</th><th>B Net</th><th>Fark (B−A)</th></tr>${rows}</table></div></div>`;
}

// ---------- sayaç ----------
const CD_LS = 'yks_countdown_date';
const CD_DEFAULT = '2027-06-19T10:15';
function cdDate() {
  try {
    const v = localStorage.getItem(CD_LS) || CD_DEFAULT;
    return v.length === 10 ? v + 'T10:15' : v; // eski yalnızca-tarih kayıtları
  } catch (e) { return CD_DEFAULT; }
}
function cdTarget() {
  const inp = document.getElementById('cdDate');
  const raw = (inp && inp.value) || cdDate();
  return new Date((raw.length === 10 ? raw + 'T10:15' : raw) + ':00').getTime();
}
function renderCountdown() {
  const inp = document.getElementById('cdDate');
  if (inp && !inp.value) inp.value = cdDate();
  const exams = loadExams();
  const el = document.getElementById('cdStats');
  if (el) el.innerHTML = `Toplam <b>${exams.length}</b> deneme • TYT <b>${exams.filter(e => e.type === 'TYT').length}</b> • AYT <b>${exams.filter(e => e.type === 'AYT').length}</b> • Her gün bir adım 💪`;
  tickCountdown();
}
function tickCountdown() {
  const target = cdTarget();
  let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60), sec = s % 60;
  const g = document.getElementById('cdGrid');
  if (g) g.innerHTML = `<div class="cd-box"><b>${d}</b><span>gün</span></div><div class="cd-box"><b>${h}</b><span>saat</span></div><div class="cd-box"><b>${m}</b><span>dakika</span></div><div class="cd-box"><b>${sec}</b><span>saniye</span></div>`;
  const hc = document.getElementById('homeCd');
  if (hc) hc.innerHTML = `<b>${d}</b> gün <b>${h}</b> saat <b>${m}</b> dk <b>${sec}</b> sn`;
}

// ---------- karne ----------
function renderReportLists() {
  const exams = [...loadExams()].sort((a, b) => b.date.localeCompare(a.date));
  const s = document.getElementById('repSel');
  if (!s) return;
  const keep = s.value;
  s.innerHTML = exams.map(e => `<option value="${e.id}">${esc(e.name)} (${e.type}) — ${fmtDate(e.date)}</option>`).join('');
  if (exams.some(e => e.id === keep)) s.value = keep;
  renderReport();
}
function renderReport() {
  const box = document.getElementById('repBody');
  if (!box) return;
  const ex = loadExams().find(e => e.id === document.getElementById('repSel').value);
  if (!ex) { box.innerHTML = '<div class="empty">Karne için deneme seç.</div>'; return; }
  const t = examTotals(ex);
  const rows = ex.lessons.map(L => {
    const lt = lessonTotals(ex.type, L.name, L);
    const wrongs = L.topics.filter(T => (T.y || 0) > 0).map(T => esc(T.name) + (T.y > 1 ? ` (${T.y})` : '')).join(', ') || '—';
    return `<tr><td class="dag-konu">${esc(L.name)}</td><td>${lt.dogru}</td><td>${lt.yanlis}</td><td>${lt.bos}</td><td><b>${fmtNet(lt.net)}</b></td><td style="white-space:normal;min-width:150px;font-size:12px">${wrongs}</td></tr>`;
  }).join('');
  box.innerHTML = `<div class="card"><h2 style="text-align:center">📋 Deneme Karnesi</h2>
    <p style="text-align:center" class="muted">${esc(ex.name)} • ${ex.type} • ${fmtDate(ex.date)}</p>
    <div class="exam-nums" style="margin-bottom:10px"><div class="num">✅ Doğru<b>${t.dogru}</b></div><div class="num">❌ Yanlış<b>${t.yanlis}</b></div><div class="num">⬜ Boş<b>${t.bos}</b></div><div class="num net">🎯 Net<b>${fmtNet(t.net)}</b></div></div>
    <div class="dag-scroll"><table class="dag-table"><tr><th class="dag-konu">Ders</th><th>D</th><th>Y</th><th>B</th><th>Net</th><th>Yanlış Konular</th></tr>${rows}</table></div>
    <p class="muted" style="margin-top:12px">YKS Koçluk • İlknur</p></div>`;
}
function printReport() { window.print(); }

// ---------- YZ soru ----------
let quizData = null, quizAns = {};
function initQuiz() {
  const type = document.getElementById('qType').value;
  document.getElementById('qLesson').innerHTML = LESSONS[type].map(l => `<option>${esc(l)}</option>`).join('');
  fillQuizTopics();
}
function fillQuizTopics() {
  const type = document.getElementById('qType').value;
  const lname = document.getElementById('qLesson').value;
  document.getElementById('qTopic').innerHTML = (TOPICS[type][lname] || []).map(t => `<option>${esc(t)}</option>`).join('');
}
async function genQuiz() {
  const btn = document.getElementById('qGenBtn');
  const type = document.getElementById('qType').value;
  const lesson = document.getElementById('qLesson').value;
  const topic = document.getElementById('qTopic').value;
  const n = document.getElementById('qCount').value;
  const box = document.getElementById('quizBody');
  btn.disabled = true; quizData = null; quizAns = {};
  box.innerHTML = '<div class="empty">✨ Sorular üretiliyor…</div>';
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: true, maxTokens: 8192, messages: [{ role: 'user', text: `${type} ${lesson} dersinin "${topic}" konusundan ${n} adet çoktan seçmeli (A, B, C, D, E şıklı) YKS tarzı soru üret. SADECE aşağıdaki formatta geçerli JSON döndür, başka hiçbir metin yazma: {"questions":[{"q":"soru metni","options":["A şıkkı","B şıkkı","C şıkkı","D şıkkı","E şıkkı"],"answer":2,"exp":"kısa çözüm açıklaması"}]} answer doğru şıkkın indeksidir (0-4).` }] }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'hata');
    const m = /\{[\s\S]*\}/.exec(j.reply || '');
    const data = JSON.parse(m ? m[0] : '');
    quizData = (data.questions || []).filter(q => q.q && q.options && q.options.length === 5 && Number.isInteger(q.answer));
    if (!quizData.length) throw new Error('parse');
    renderQuiz();
  } catch (e) {
    const msg = String((e && e.message) || '');
    const busy = /high demand|overload|429|503|quota|busy|try again/i.test(msg);
    box.innerHTML = `<div class="empty">⚠️ ${busy ? 'Yapay zeka şu an çok yoğun, 1-2 dakika sonra tekrar dene.' : 'Soru üretilemedi, tekrar dene.'}</div>`;
  }
  btn.disabled = false;
}
function renderQuiz() {
  const box = document.getElementById('quizBody');
  if (!box || !quizData) return;
  box.innerHTML = quizData.map((q, qi) => {
    const opts = q.options.map((o, oi) =>
      `<button type="button" class="opt-btn${quizAns[qi] === oi ? ' sel' : ''}" id="q-${qi}-${oi}" onclick="answerQuiz(${qi},${oi})"><b>${'ABCDE'[oi]})</b> ${esc(o)}</button>`
    ).join('');
    return `<div class="card" id="qc-${qi}"><p class="quiz-q">${qi + 1}. ${md(q.q)}</p>${opts}<div id="qe-${qi}"></div></div>`;
  }).join('') + `<div class="form-actions"><button class="btn primary" onclick="checkQuiz()">✅ Kontrol Et</button></div><div id="quizScore"></div>`;
}
function answerQuiz(qi, oi) { quizAns[qi] = oi; renderQuiz(); }
function checkQuiz() {
  if (!quizData) return;
  const missing = quizData.findIndex((_, qi) => quizAns[qi] === undefined);
  if (missing >= 0) {
    alert(`Tüm soruları cevapla (soru ${missing + 1} boş).`);
    document.getElementById('qc-' + missing).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  let ok = 0;
  quizData.forEach((q, qi) => {
    const good = quizAns[qi] === q.answer;
    if (good) ok++;
    q.options.forEach((_, oi) => {
      const b = document.getElementById(`q-${qi}-${oi}`);
      if (!b) return;
      b.onclick = null;
      if (oi === q.answer) b.classList.add('ok');
      else if (oi === quizAns[qi]) b.classList.add('no');
    });
    const ex = document.getElementById(`qe-${qi}`);
    if (ex) ex.innerHTML = `<p class="muted" style="font-size:13px">${good ? '✅' : '❌'} ${md(q.exp || '')}</p>`;
  });
  document.getElementById('quizScore').innerHTML = `<div class="card"><h3>${ok}/${quizData.length} doğru ${ok === quizData.length ? '🎉' : ''}</h3></div>`;
}

// ---------- ders programı ----------
let schedOffset = 0;
const SCHED_LS = 'yks_schedule_v1';
const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

function loadSched() { try { return JSON.parse(localStorage.getItem(SCHED_LS)) || {}; } catch (e) { return {}; } }
function saveSched(o) { localStorage.setItem(SCHED_LS, JSON.stringify(o)); schedulePush(); }
function isoDay(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function mondayOf(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function schedWeek() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mon = mondayOf(new Date(today.getTime() + schedOffset * 7 * 864e5));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getTime() + i * 864e5);
    days.push({ date: d, iso: isoDay(d) });
  }
  return { mon, days, todayIso: isoDay(today) };
}
function schedNav(d) {
  schedOffset = d === 0 ? 0 : schedOffset + d;
  renderSchedule();
}
function weekOfIso(iso) {
  const p = iso.split('-').map(Number);
  return isoDay(mondayOf(new Date(p[0], p[1] - 1, p[2], 12)));
}
function toggleTask(iso, id) {
  const wk = weekOfIso(iso);
  const s = loadSched();
  const arr = ((s[wk] || {})[iso]) || [];
  const t = arr.find(t => t.id === id);
  if (t) { t.done = !t.done; s[wk] = s[wk] || {}; s[wk][iso] = arr; saveSched(s); renderAll(); }
}
function addTask(di) {
  const inp = document.getElementById('sched-in-' + di);
  const text = (inp.value || '').trim();
  if (!text) return;
  const { mon, days } = schedWeek();
  const wk = isoDay(mon);
  const iso = days[di].iso;
  const s = loadSched();
  s[wk] = s[wk] || {};
  s[wk][iso] = s[wk][iso] || [];
  s[wk][iso].push({ id: 't' + Date.now(), t: text.slice(0, 120), done: false });
  saveSched(s);
  renderSchedule();
}
function delTask(iso, id) {
  const wk = weekOfIso(iso);
  const s = loadSched();
  if (s[wk] && s[wk][iso]) {
    const t = s[wk][iso].find(t => t.id === id);
    if (t && !confirm(`"${t.t}" silinsin mi? Emin misin?`)) return;
    s[wk][iso] = s[wk][iso].filter(t => t.id !== id);
    saveSched(s);
    renderSchedule();
  }
}
function copyPrevWeek() {
  const { mon } = schedWeek();
  const wk = isoDay(mon);
  const prev = isoDay(new Date(mon.getTime() - 7 * 864e5));
  const s = loadSched();
  if (!s[prev]) { alert('Önceki haftada kayıtlı program yok.'); return; }
  s[wk] = s[wk] || {};
  let n = 0;
  Object.keys(s[prev]).forEach(iso => {
    if ((s[wk][iso] || []).length) return;
    s[wk][iso] = (s[prev][iso] || []).map(t => ({ id: 't' + Date.now() + Math.floor(Math.random() * 1e6), t: t.t, done: false }));
    n += s[wk][iso].length;
  });
  saveSched(s);
  renderSchedule();
  alert(n ? `${n} madde kopyalandı.` : 'Bu haftada boş gün yok, kopyalanacak bir şey bulunamadı.');
}
function renderSchedule() {
  const label = document.getElementById('schedLabel');
  const box = document.getElementById('schedBody');
  if (!box) return;
  const { mon, days, todayIso } = schedWeek();
  const wk = isoDay(mon);
  const s = loadSched();
  const sun = new Date(mon.getTime() + 6 * 864e5);
  const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  if (label) label.textContent = `${fmt(mon)} – ${fmt(sun)}`;
  box.innerHTML = days.map((dy, di) => {
    const arr = ((s[wk] || {})[dy.iso]) || [];
    const doneN = arr.filter(t => t.done).length;
    const isToday = dy.iso === todayIso;
    const tasks = arr.map(t =>
      `<div class="task-row${t.done ? ' tdone' : ''}">
        <input type="checkbox"${t.done ? ' checked' : ''} onchange="toggleTask('${dy.iso}','${t.id}')">
        <span>${esc(t.t)}</span>
        <button type="button" class="task-del" onclick="delTask('${dy.iso}','${t.id}')">✕</button>
      </div>`
    ).join('') || '<div class="muted" style="font-size:13px">Henüz madde yok.</div>';
    return `<div class="card day-card${isToday ? ' today' : ''}">
      <div class="day-head"><b>${DAY_NAMES[di]}${isToday ? ' <span class="today-badge">Bugün</span>' : ''}</b><span class="muted">${fmt(dy.date)} • ${doneN}/${arr.length}</span></div>
      ${tasks}
      <div class="sched-add"><input type="text" id="sched-in-${di}" placeholder="Yapılacak ekle…" maxlength="120" onkeydown="if(event.key==='Enter'){addTask(${di});}"><button type="button" class="btn primary" onclick="addTask(${di})">+</button></div>
    </div>`;
  }).join('');
}

// ---------- tema (açık / koyu mod) ----------
function applyTheme() {
  let t = 'light';
  try {
    t = localStorage.getItem('yks_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
  const b = document.getElementById('themeBtn');
  if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('yks_theme', cur); } catch (e) {}
  applyTheme();
}

// ---------- motivasyon sözleri ----------
const QUOTES = [
  '💪 Bugün çözdüğün her soru, yarınki netin demek.',
  '🔥 Düzenli tekrar, zekadan güçlüdür.',
  '📈 Netler bir günde değil, her gün artar.',
  '🎯 Yanlışların, sana ne çalışman gerektiğini söylüyor.',
  '⏳ Erteleme — 25 dakikalık bir odak her şeyi değiştirir.',
  '🏆 Zirve bir anda değil, adım adım çıkılır.',
  '📚 Bugünkü 1 konu, sınavdaki 1 soru demek.',
  '💡 Anlamadığın yeri sormak, bilmediğini kabul etmektir. Devam!',
];
let quoteIdx = 0;
setInterval(() => {
  const el = document.getElementById('heroQuote');
  if (!el) return;
  quoteIdx = (quoteIdx + 1) % QUOTES.length;
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = QUOTES[quoteIdx]; el.style.opacity = 1; }, 300);
}, 9000);

// ---------- bulut senkron (tüm cihazlarda aynı veri) ----------
const DEFAULT_SYNC_KEY = 'ilknur-e7a55f3c';
const SYNC_SECRET_LS = 'yks_sync_secret';
const SYNC_TS_LS = 'yks_local_ts';
let pushTimer = null;

function syncSecret() { try { return localStorage.getItem(SYNC_SECRET_LS) || DEFAULT_SYNC_KEY; } catch (e) { return DEFAULT_SYNC_KEY; } }
function localTs() { try { return Number(localStorage.getItem(SYNC_TS_LS)) || 0; } catch (e) { return 0; } }
function bumpTs() { try { localStorage.setItem(SYNC_TS_LS, String(Date.now())); } catch (e) {} }
function setSyncStatus(t) { const el = document.getElementById('syncStatus'); if (el) el.textContent = t; }

async function apiSync(method, body) {
  const secret = syncSecret();
  if (!secret) return { skip: true };
  const r = await fetch('/api/sync', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-sync-key': secret },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) {
    try { localStorage.removeItem(SYNC_SECRET_LS); } catch (e) {}
    setSyncStatus('☁ Şifre hatalı — tekrar dokun');
    return { auth: false };
  }
  if (r.status === 404) return { empty: true };
  if (!r.ok) throw new Error('sync ' + r.status);
  return await r.json();
}

function schedulePush() {
  bumpTs();
  if (!syncSecret()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushCloud, 2500);
}

async function pushCloud() {
  if (!syncSecret()) return;
  try {
    setSyncStatus('⏳ Eşitleniyor…');
    await apiSync('PUT', { v: 4, exams: loadExams(), done: loadDone(), schedule: loadSched(), updatedAt: localTs() });
    setSyncStatus('☁ ✓ Senkronize');
  } catch (e) { setSyncStatus('☁ ⚠ Çevrimdışı'); }
}

function mergeData(localExams, localDone, cloud) {
  const byId = {};
  [...(cloud.exams || []), ...localExams].forEach(e => { if (e && e.id) byId[e.id] = e; });
  const sched = {};
  const allWeeks = new Set([...Object.keys(loadSched()), ...Object.keys(cloud.schedule || {})]);
  const ls = loadSched(), cs = cloud.schedule || {};
  allWeeks.forEach(w => {
    sched[w] = {};
    const days = new Set([...Object.keys(ls[w] || {}), ...Object.keys(cs[w] || {})]);
    days.forEach(dy => {
      const byT = {};
      [...(cs[w][dy] || []), ...((ls[w] || {})[dy] || [])].forEach(t => { if (t && t.id) byT[t.id] = t; });
      sched[w][dy] = Object.values(byT);
    });
  });
  return { exams: Object.values(byId), done: Object.assign({}, cloud.done || {}, localDone), sched };
}

// eski bulut verisi (konu doğrularıyla kaydedilmiş) yeni modele çevrilir
function migratePayload(data) {
  if (!data || !Array.isArray(data.exams)) return data;
  const hasD = data.exams.some(e => (e.lessons || []).some(L => (L.topics || []).some(T => (T.d || 0) > 0)));
  if (!hasD) { data.v = 3; return data; }
  data.exams.forEach(e => (e.lessons || []).forEach(L => (L.topics || []).forEach(T => { T.d = 0; })));
  data.v = 3;
  return data;
}

async function pullCloud(mergeOnConflict) {
  if (!syncSecret()) { setSyncStatus('☁ Kapalı — açmak için dokun'); return; }
  try {
    setSyncStatus('⏳ Eşitleniyor…');
    const r = await apiSync('GET');
    if (r.skip || r.auth === false) return;
    if (r.empty) {
      // bulutta hiç veri yoksa yereli gönder
      try {
        await apiSync('PUT', { v: 4, exams: loadExams(), done: loadDone(), schedule: loadSched(), updatedAt: localTs() || Date.now() });
      } catch (e) {}
      setSyncStatus('☁ ✓ Senkronize');
      return;
    }
    const cloudTs = new Date(r.uploadedAt).getTime() || 0;
    const data = migratePayload(r.data);
    if (data && data.exams) foldParagraf(data.exams);
    if (data && (mergeOnConflict || cloudTs > localTs())) {
      let exams = data.exams, done = data.done, sched = data.schedule;
      if (mergeOnConflict && exams) {
        const m = mergeData(loadExams(), loadDone(), data);
        exams = m.exams; done = m.done; sched = m.sched;
        try {
          await apiSync('PUT', { v: 4, exams, done, schedule: sched, updatedAt: Date.now() });
        } catch (e) {}
      }
      if (exams) localStorage.setItem(LS_KEY, JSON.stringify(exams));
      if (done) localStorage.setItem(DONE_KEY, JSON.stringify(done));
      if (sched) localStorage.setItem(SCHED_LS, JSON.stringify(sched));
      try { localStorage.setItem(SYNC_TS_LS, String(Date.now())); } catch (e) {}
      renderAll();
    }
    setSyncStatus('☁ ✓ Senkronize');
  } catch (e) { setSyncStatus('☁ ⚠ Çevrimdışı'); }
}

function askSyncSecret() {
  // elle yenileme: buluttaki güncel veriyi çek
  pullCloud();
}

function renderAll(){ renderHome(); renderExams(); renderDagilim(); renderStats(); renderDone(); renderPriority(); renderCompareLists(); renderReportLists(); renderCountdown(); renderSchedule(); }
applyTheme();
buildLessonFields();
renderAll();
loadChat(); renderChat();
initQuiz();
document.getElementById('cmpA').addEventListener('change', renderCompare);
document.getElementById('cmpB').addEventListener('change', renderCompare);
document.getElementById('repSel').addEventListener('change', renderReport);
document.getElementById('qType').addEventListener('change', initQuiz);
document.getElementById('qLesson').addEventListener('change', fillQuizTopics);
document.getElementById('cdDate').addEventListener('change', e => { try { localStorage.setItem(CD_LS, e.target.value); } catch (err) {} tickCountdown(); });
setInterval(tickCountdown, 1000);
pullCloud();
setInterval(() => { if (document.visibilityState === 'visible' && syncSecret()) pullCloud(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && syncSecret()) pullCloud(); });
