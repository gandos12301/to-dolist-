// ===== Data & penyimpanan =====
const KUNCI = 'tugasku.v2';
const WARNA = { Kuliah: 'hijau', Organisasi: 'gelap', Pribadi: 'kuning' };
const CENTANG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';

// Baca/simpan ke localStorage (dibungkus try/catch agar aman kalau diblokir)
const muat = () => { try { return JSON.parse(localStorage.getItem(KUNCI)) || []; } catch (e) { return []; } };
const simpan = () => { try { localStorage.setItem(KUNCI, JSON.stringify(tugas)); } catch (e) {} };

let tugas = muat();          // {id, judul, kategori, prio, tgl, jam, catatan, selesai}
let layar = 'beranda';
let filter = 'semua';
let kata = '';
let bulan = new Date(); bulan.setDate(1);   // bulan yang tampil di Jadwal
let tglPilih = iso(new Date());             // tanggal yang dipilih di Jadwal
let form = { kategori: 'Kuliah', prio: 'Sedang' };

// ===== Helper =====
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); // cegah XSS
function z(n) { return String(n).padStart(2, '0'); } // function declaration: sudah tersedia sebelum state di atas dibuat
function iso(d) { return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; } // tanggal lokal (bukan UTC)
const dariIso = s => new Date(s + 'T00:00');
const fmt = (d, o) => d.toLocaleDateString('id-ID', o);
const titik = j => j.replace(':', '.');
const selisih = s => Math.round((dariIso(s) - dariIso(iso(new Date()))) / 864e5); // selisih hari dari hari ini
const urut = (a, b) => a.selesai - b.selesai || (a.tgl + a.jam).localeCompare(b.tgl + b.jam); // aktif dulu, tenggat terdekat

// ===== Render: Beranda =====
function renderBeranda() {
  const hariIni = iso(new Date());
  $('#tglHariIni').textContent = fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'short' });

  const h = tugas.filter(t => t.tgl === hariIni);
  const beres = h.filter(t => t.selesai).length;
  $('#judulHari').textContent = h.length ? `Hari ini ada ${h.length} tugas` : 'Hari ini masih kosong';
  $('#subHari').textContent = !h.length ? 'Tekan + untuk menambah tugas.'
    : beres === h.length ? 'Semua beres, mantap!' : `Baru ${beres} yang beres, santai tapi lanjut ya.`;
  $('[data-f=semua]').textContent = `Semua (${tugas.length})`;

  // Kartu: 2 tugas aktif dengan tenggat terdekat
  const dekat = tugas.filter(t => !t.selesai).sort(urut).slice(0, 2);
  $('#kartu').hidden = !dekat.length;
  $('#kartu').innerHTML = dekat.map(t => {
    const n = selisih(t.tgl);
    const rel = n === 0 ? 'hari ini' : n === 1 ? 'besok' : n < 0 ? `terlambat ${-n} hari` : `${n} hari lagi`;
    return `<div class="kt ${WARNA[t.kategori]}">
      <span class="lencana">${t.prio === 'Tinggi' ? 'PRIORITAS' : t.kategori.toUpperCase()}</span>
      <div><b>${esc(t.judul)}</b><small>Tenggat ${fmt(dariIso(t.tgl), { day: 'numeric', month: 'short' })} · ${rel}</small></div>
    </div>`;
  }).join('');

  // Daftar: terapkan filter chip + pencarian
  const daftar = tugas
    .filter(t => filter === 'semua' || (filter === 'hari' ? t.tgl === hariIni : t.selesai))
    .filter(t => t.judul.toLowerCase().includes(kata))
    .sort(urut);
  $('#daftar').innerHTML = daftar.length ? daftar.map(baris).join('')
    : `<p class="kosong">${tugas.length ? 'Tidak ada tugas yang cocok.' : 'Belum ada tugas. Tekan + untuk menambah.'}</p>`;
}

function baris(t) {
  const n = selisih(t.tgl);
  const hari = n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : n < 0 ? 'Terlambat' : fmt(dariIso(t.tgl), { day: 'numeric', month: 'short' });
  const sub = t.selesai ? '' : `<small class="${n < 0 ? 'telat' : ''}">${hari} · ${titik(t.jam)}</small>`;
  return `<div class="baris" data-id="${t.id}">
    <button class="ck ${t.selesai ? 'd' : ''}" data-aksi="centang" aria-label="Tandai selesai">${t.selesai ? CENTANG : ''}</button>
    <div class="isi"><b class="${t.selesai ? 'coret' : ''}">${esc(t.judul)}</b>${sub}</div>
    <button class="hapus" data-aksi="hapus" aria-label="Hapus tugas">×</button>
  </div>`;
}

// ===== Render: Jadwal =====
function renderJadwal() {
  $('#bulanJudul').textContent = fmt(bulan, { month: 'long', year: 'numeric' });
  const awal = (bulan.getDay() + 6) % 7;                                          // Senin = kolom 0
  const jumlah = new Date(bulan.getFullYear(), bulan.getMonth() + 1, 0).getDate(); // jumlah hari di bulan ini
  const sel = Math.ceil((awal + jumlah) / 7) * 7;
  const ada = new Set(tugas.map(t => t.tgl));
  const hariIni = iso(new Date());

  let html = '';
  for (let i = 0; i < sel; i++) {
    const d = new Date(bulan.getFullYear(), bulan.getMonth(), i - awal + 1);
    const k = iso(d), luar = d.getMonth() !== bulan.getMonth();
    const kls = ['d1', luar && 'f', !luar && ada.has(k) && 'm', k === hariIni && 't', k === tglPilih && 'p'].filter(Boolean).join(' ');
    html += `<button class="${kls}" data-tgl="${k}">${d.getDate()}</button>`;
  }
  $('#kal').innerHTML = html;

  // Agenda untuk tanggal terpilih
  const a = tugas.filter(t => t.tgl === tglPilih).sort((x, y) => x.jam.localeCompare(y.jam));
  $('#agendaJudul').textContent = fmt(dariIso(tglPilih), { weekday: 'long', day: 'numeric', month: 'short' });
  $('#agendaJml').textContent = `${a.length} agenda`;
  $('#agenda').innerHTML = a.length ? a.map(t => `
    <div class="waktu"><time>${titik(t.jam)}</time>
      <div class="agenda ${WARNA[t.kategori]}"><b class="${t.selesai ? 'coret' : ''}">${esc(t.judul)}</b>
        <small>${t.kategori}${t.catatan ? ' · ' + esc(t.catatan) : ''}</small></div>
    </div>`).join('') : '<p class="kosong">Tidak ada agenda di tanggal ini.</p>';
}

const render = () => { renderBeranda(); renderJadwal(); };

// ===== Form tugas baru =====
function tandai() { // sorot chip yang dipilih
  $$('.pilih').forEach(g => [...g.children].forEach(b => b.classList.toggle('a', b.dataset.v === form[g.dataset.nama])));
}

function bukaForm() {
  form = { kategori: 'Kuliah', prio: 'Sedang' };
  $('#fJudul').value = '';
  $('#fTgl').value = layar === 'jadwal' ? tglPilih : iso(new Date()); // dari Jadwal: pakai tanggal terpilih
  $('#fJam').value = '23:59';
  $('#fCatatan').value = '';
  $('#galat').hidden = true;
  tandai();
}

function simpanTugas() {
  const judul = $('#fJudul').value.trim();
  if (!judul) { $('#galat').hidden = false; $('#fJudul').focus(); return; }
  tugas.push({
    id: Date.now(), judul, kategori: form.kategori, prio: form.prio,
    tgl: $('#fTgl').value || iso(new Date()), jam: $('#fJam').value || '23:59',
    catatan: $('#fCatatan').value.trim(), selesai: false
  });
  simpan();
  pindah('beranda');
}

// ===== Navigasi antar layar =====
function pindah(nama) {
  if (nama === 'tambah') bukaForm(); // dipanggil sebelum `layar` berubah, supaya tahu asal layar
  layar = nama;
  $$('.layar').forEach(s => s.hidden = s.id !== nama);
  $$('.nb').forEach(b => b.classList.toggle('on', b.dataset.ke === nama));
  document.body.dataset.layar = nama;
  window.scrollTo(0, 0);
  render();
  if (nama === 'tambah') $('#fJudul').focus();
}

// ===== Event =====
$$('[data-ke]').forEach(b => b.onclick = () => pindah(b.dataset.ke));
$('#simpan').onclick = simpanTugas;
$('#fJudul').addEventListener('input', () => $('#galat').hidden = true);
$('#cari').addEventListener('input', e => { kata = e.target.value.trim().toLowerCase(); renderBeranda(); });

$('#filter').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  filter = b.dataset.f;
  [...$('#filter').children].forEach(x => x.classList.toggle('a', x === b));
  renderBeranda();
});

$$('.pilih').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  form[g.dataset.nama] = b.dataset.v;
  tandai();
}));

// Centang selesai / hapus (event delegation pada daftar)
$('#daftar').addEventListener('click', e => {
  const b = e.target.closest('[data-aksi]'); if (!b) return;
  const id = +b.closest('.baris').dataset.id;
  if (b.dataset.aksi === 'centang') { const t = tugas.find(x => x.id === id); t.selesai = !t.selesai; }
  else tugas = tugas.filter(x => x.id !== id);
  simpan(); render();
});

// Kalender: pilih tanggal & ganti bulan
$('#kal').addEventListener('click', e => {
  const b = e.target.closest('[data-tgl]'); if (!b) return;
  tglPilih = b.dataset.tgl;
  const d = dariIso(tglPilih);
  bulan = new Date(d.getFullYear(), d.getMonth(), 1);
  renderJadwal();
});
$('#bulanSbl').onclick = () => { bulan = new Date(bulan.getFullYear(), bulan.getMonth() - 1, 1); renderJadwal(); };
$('#bulanSsd').onclick = () => { bulan = new Date(bulan.getFullYear(), bulan.getMonth() + 1, 1); renderJadwal(); };

render();
