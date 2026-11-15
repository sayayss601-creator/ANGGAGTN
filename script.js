
/* ==========================================
   MONEYTRACK - MAIN JAVASCRIPT
   Clean Version 3.0
========================================== */

document.addEventListener("DOMContentLoaded", function () {

  "use strict";

  // Belum login -> aplikasi tidak dijalankan (layar login dari auth.js tampil)
  if (!window.MT_USER) return;
  const UID = window.MT_USER.id;

  // ==========================================
  // 1. KONFIGURASI DAN ELEMEN HTML
  // ==========================================

  const STORAGE_KEY = "moneytrack_transaksi_v2_" + UID;
  const PHOTO_KEY = "moneytrack_foto_dev_" + UID;
  const TARGET_KEY = "moneytrack_target_tabungan_" + UID;

  const JENIS = ["pemasukan", "pengeluaran", "tabungan"];
  const LABEL = { pemasukan: "Pemasukan", pengeluaran: "Pengeluaran", tabungan: "Tabungan" };
  let filterAktif = "semua";

  const form = document.getElementById("formTransaksi");
  const keteranganInput = document.getElementById("keterangan");
  const nominalInput = document.getElementById("nominal");
  const jenisInput = document.getElementById("jenis");

  const daftar = document.getElementById("daftarTransaksi");

  const saldoElement = document.getElementById("saldo");
  const pemasukanElement = document.getElementById("pemasukan");
  const pengeluaranElement = document.getElementById("pengeluaran");

  const tanggalElement = document.getElementById("tanggalSekarang");

  const masukLabel = document.getElementById("grafikPemasukanLabel");
  const keluarLabel = document.getElementById("grafikPengeluaranLabel");

  const masukBar = document.getElementById("grafikPemasukanBar");
  const keluarBar = document.getElementById("grafikPengeluaranBar");

  const uploadFoto = document.getElementById("uploadFoto");
  const fotoProfil = document.getElementById("fotoProfilDev");
  const fotoUtama = document.getElementById("fotoProfilUtama");
  const tabunganElement = document.getElementById("tabungan");
  const tabunganLabel = document.getElementById("grafikTabunganLabel");
  const tabunganBar = document.getElementById("grafikTabunganBar");
  const filterJenis = document.getElementById("filterJenis");
  const targetInput = document.getElementById("targetInput");
  const targetInfo = document.getElementById("targetInfo");
  const targetBar = document.getElementById("targetBar");
  const tombolTarget = document.getElementById("tombolTarget");

  // ==========================================
  // 2. FORMAT RUPIAH
  // ==========================================

  function rupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(angka);
  }

  // ==========================================
  // 3. MEMBACA PENYIMPANAN
  // ==========================================

  function bacaTransaksi() {
    try {
      let data = localStorage.getItem(STORAGE_KEY);

      // Ambil data dari penyimpanan lama jika ada
      // Data lama (sebelum ada member) otomatis jadi milik Developer
      if (!data && window.MT_USER.role === "developer") {
        data = localStorage.getItem("moneytrack_transaksi_v2") ||
               localStorage.getItem("moneytrack_transaksi");
      }

      const hasil = JSON.parse(data || "[]");

      if (!Array.isArray(hasil)) return [];

      return hasil
        .filter(item => item && typeof item === "object")
        .map((item, index) => ({
          id: String(item.id || ("transaksi-" + index)),
          keterangan: String(item.keterangan || "Transaksi"),
          nominal: Number(item.nominal),
          jenis: item.jenis,
          tanggal: String(item.tanggal || "-")
        }))
        .filter(item =>
          Number.isSafeInteger(item.nominal) &&
          item.nominal > 0 &&
          JENIS.includes(item.jenis)
        );

    } catch (error) {
      console.error("Gagal membaca transaksi:", error);
      return [];
    }
  }

  let transaksi = bacaTransaksi();

  function simpanTransaksi(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan transaksi:", error);
      alert("Data gagal disimpan. Periksa penyimpanan browser.");
      return false;
    }
  }

  // ==========================================
  // 4. MEMBACA JENIS TRANSAKSI
  // ==========================================

  function bacaJenis() {
    if (!jenisInput) return "";

    const option =
      jenisInput.options[jenisInput.selectedIndex];

    const nilai = String(jenisInput.value || "").toLowerCase();

    const teks = option
      ? String(option.textContent || "").toLowerCase()
      : "";

    const gabungan = nilai + " " + teks;

    if (/tabungan|tabung|saving/.test(gabungan)) {
      return "tabungan";
    }

    if (/pemasukan|pendapatan|masuk|income/.test(gabungan)) {
      return "pemasukan";
    }

    if (/pengeluaran|belanja|keluar|expense/.test(gabungan)) {
      return "pengeluaran";
    }

    return "";
  }

  // ==========================================
  // 5. MENGHITUNG SALDO DAN STATISTIK
  // ==========================================

  function hitungKeuangan() {
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalTabungan = 0;

    transaksi.forEach(function (item) {
      if (item.jenis === "pemasukan") {
        totalMasuk += item.nominal;
      }

      if (item.jenis === "pengeluaran") {
        totalKeluar += item.nominal;
      }

      if (item.jenis === "tabungan") {
        totalTabungan += item.nominal;
      }
    });

    // Tabungan berdiri sendiri: tidak memengaruhi saldo utama
    const saldo = totalMasuk - totalKeluar;

    // Kartu dashboard
    if (saldoElement) {
      saldoElement.textContent = rupiah(saldo);
    }

    if (pemasukanElement) {
      pemasukanElement.textContent = rupiah(totalMasuk);
    }

    if (pengeluaranElement) {
      pengeluaranElement.textContent = rupiah(totalKeluar);
    }

    if (tabunganElement) tabunganElement.textContent = rupiah(totalTabungan);
    if (tabunganLabel) tabunganLabel.textContent = rupiah(totalTabungan);

    tampilkanTarget(totalTabungan);

    // Dukungan kartu dashboard tanpa ID
    const kartu = document.querySelectorAll(".cards .card h2");

    if (!saldoElement && kartu[0]) {
      kartu[0].textContent = rupiah(saldo);
    }

    if (!pemasukanElement && kartu[1]) {
      kartu[1].textContent = rupiah(totalMasuk);
    }

    if (!pengeluaranElement && kartu[2]) {
      kartu[2].textContent = rupiah(totalKeluar);
    }

    // Label grafik
    if (masukLabel) {
      masukLabel.textContent = rupiah(totalMasuk);
    }

    if (keluarLabel) {
      keluarLabel.textContent = rupiah(totalKeluar);
    }

    // Batang grafik
    const terbesar = Math.max(totalMasuk, totalKeluar, totalTabungan);

    if (tabunganBar) {
      tabunganBar.style.width =
        terbesar > 0 ? (totalTabungan / terbesar * 100) + "%" : "0%";
    }

    if (masukBar) {
      masukBar.style.width =
        terbesar > 0
          ? (totalMasuk / terbesar * 100) + "%"
          : "0%";
    }

    if (keluarBar) {
      keluarBar.style.width =
        terbesar > 0
          ? (totalKeluar / terbesar * 100) + "%"
          : "0%";
    }
  }

  // ==========================================
  // 6. MENAMPILKAN RIWAYAT TRANSAKSI
  // ==========================================

  function tampilkanTransaksi() {
    if (!daftar) return;

    daftar.replaceChildren();

    if (transaksi.length === 0) {
      const kosong = document.createElement("p");
      kosong.textContent = "Belum ada transaksi.";
      daftar.appendChild(kosong);
      return;
    }

    const tampil = transaksi.filter(function (item) {
      return filterAktif === "semua" || item.jenis === filterAktif;
    });

    if (tampil.length === 0) {
      const kosong = document.createElement("p");
      kosong.textContent = "Belum ada transaksi di kategori ini.";
      daftar.appendChild(kosong);
      return;
    }

    [...tampil].reverse().forEach(function (item) {
      const baris = document.createElement("div");
      baris.className = "transaction-item " + item.jenis;

      const informasi = document.createElement("div");

      const badge = document.createElement("span");
      badge.className = "badge " + item.jenis;
      badge.textContent = LABEL[item.jenis];

      const nama = document.createElement("strong");
      nama.textContent = item.keterangan;

      const tanggal = document.createElement("small");
      tanggal.textContent = item.tanggal;

      informasi.append(badge, nama, tanggal);

      const aksi = document.createElement("div");

      const nominal = document.createElement("strong");

      const tanda =
        item.jenis === "pemasukan" ? "+ " : item.jenis === "tabungan" ? "→ " : "- ";

      nominal.textContent = tanda + rupiah(item.nominal);

      nominal.style.color =
        { pemasukan: "#22c55e", pengeluaran: "#fb7185", tabungan: "#facc15" }[item.jenis];

      const tombolHapus = document.createElement("button");
      tombolHapus.type = "button";
      tombolHapus.textContent = "Hapus";

      tombolHapus.addEventListener("click", function () {
        hapusTransaksi(item.id);
      });

      aksi.append(nominal, tombolHapus);
      baris.append(informasi, aksi);

      daftar.appendChild(baris);
    });
  }

  // ==========================================
  // 7. TAMBAH TRANSAKSI
  // ==========================================

  if (form) {
    form.addEventListener("submit", function (event) {

      event.preventDefault();

      const keterangan = keteranganInput
        ? keteranganInput.value.trim()
        : "";

      const nominal = nominalInput
        ? Number(nominalInput.value)
        : 0;

      const jenis = bacaJenis();

      if (!keterangan) {
        alert("Masukkan keterangan transaksi!");
        if (keteranganInput) keteranganInput.focus();
        return;
      }

      if (
        !Number.isSafeInteger(nominal) ||
        nominal <= 0
      ) {
        alert("Masukkan nominal yang benar!");
        if (nominalInput) nominalInput.focus();
        return;
      }

      if (!jenis) {
        alert("Pilih jenis: Pemasukan, Pengeluaran, atau Tabungan!");
        if (jenisInput) jenisInput.focus();
        return;
      }

      const dataBaru = {
        id: Date.now().toString() +
            Math.random().toString(36).slice(2),

        keterangan: keterangan,
        nominal: nominal,
        jenis: jenis,

        tanggal: new Date().toLocaleString("id-ID")
      };

      const dataSebelumnya = transaksi;

      transaksi = [...transaksi, dataBaru];

      if (!simpanTransaksi(transaksi)) {
        transaksi = dataSebelumnya;
        return;
      }

      form.reset();

      hitungKeuangan();
      tampilkanTransaksi();

      alert("Transaksi berhasil disimpan!");
    });

  } else {
    console.error("Form transaksi tidak ditemukan!");
  }

  // ==========================================
  // 8. HAPUS TRANSAKSI
  // ==========================================

  function hapusTransaksi(id) {

    const yakin = confirm(
      "Yakin ingin menghapus transaksi ini?"
    );

    if (!yakin) return;

    const dataSebelumnya = transaksi;

    transaksi = transaksi.filter(function (item) {
      return item.id !== id;
    });

    if (!simpanTransaksi(transaksi)) {
      transaksi = dataSebelumnya;
      return;
    }

    hitungKeuangan();
    tampilkanTransaksi();
  }

  // ==========================================
  // 9. TANGGAL OTOMATIS
  // ==========================================

  function perbaruiTanggal() {
    if (!tanggalElement) return;

    tanggalElement.textContent =
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  // ==========================================
  // 10. FOTO PROFIL DEVELOPER
  // ==========================================

  function muatFotoProfil() {
    if (!fotoProfil) return;

    try {
      const foto = localStorage.getItem(PHOTO_KEY);

      if (foto) {
        fotoProfil.src = foto;
        if (fotoUtama) fotoUtama.src = foto;
      }
    } catch (error) {
      console.error("Gagal memuat foto:", error);
    }
  }

  if (uploadFoto && fotoProfil) {

    uploadFoto.addEventListener("change", function () {

      const file = uploadFoto.files
        ? uploadFoto.files[0]
        : null;

      if (!file) return;

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Gunakan foto JPG, PNG, atau WEBP.");
        uploadFoto.value = "";
        return;
      }

      if (file.size > 1024 * 1024) {
        alert("Ukuran foto maksimal 1 MB.");
        uploadFoto.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {

        const fotoBaru = event.target.result;

        try {
          localStorage.setItem(PHOTO_KEY, fotoBaru);
          fotoProfil.src = fotoBaru;
          if (fotoUtama) fotoUtama.src = fotoBaru;

          alert("Foto profil berhasil diganti!");

        } catch (error) {
          console.error("Gagal menyimpan foto:", error);
          alert("Foto gagal disimpan. Coba gambar yang lebih kecil.");
        }
      };

      reader.onerror = function () {
        alert("Gagal membaca file foto.");
      };

      reader.readAsDataURL(file);
    });
  }

  const tombolFoto = document.getElementById("tombolGantiFoto");
  if (tombolFoto && uploadFoto) {
    tombolFoto.addEventListener("click", function () { uploadFoto.click(); });
  }

  // ==========================================
  // 10b. FILTER RIWAYAT, TARGET TABUNGAN, NAVIGASI
  // ==========================================

  if (filterJenis) {
    filterJenis.addEventListener("change", function () {
      filterAktif = filterJenis.value;
      tampilkanTransaksi();
    });
  }

  function bacaTarget() {
    try {
      const t = Number(localStorage.getItem(TARGET_KEY));
      return Number.isSafeInteger(t) && t > 0 ? t : 0;
    } catch (e) { return 0; }
  }

  function tampilkanTarget(totalTabungan) {
    if (!targetInfo || !targetBar) return;
    const target = bacaTarget();
    if (!target) {
      targetInfo.textContent = "Belum ada target. Terkumpul: " + rupiah(totalTabungan);
      targetBar.style.width = "0%";
      return;
    }
    const persen = Math.min(100, Math.round(totalTabungan / target * 100));
    targetInfo.textContent = rupiah(totalTabungan) + " dari " + rupiah(target) + " (" + persen + "%)";
    targetBar.style.width = persen + "%";
  }

  if (tombolTarget && targetInput) {
    tombolTarget.addEventListener("click", function () {
      const t = Number(targetInput.value);
      if (!Number.isSafeInteger(t) || t <= 0) {
        alert("Masukkan target yang benar!");
        return;
      }
      try {
        localStorage.setItem(TARGET_KEY, String(t));
      } catch (e) {
        alert("Target gagal disimpan.");
        return;
      }
      targetInput.value = "";
      hitungKeuangan();
    });
  }

  // Navigasi antar halaman (geser kiri-kanan / klik menu)
  const pages = document.getElementById("pages");
  const menu = document.querySelectorAll(".sidebar a, .bottom-nav a");
  const urutan = ["home", "transaksi", "statistik", "video", "profil"];

  function aktifkanMenu(id) {
    menu.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }

  menu.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      const tujuan = document.querySelector(a.getAttribute("href"));
      if (tujuan && pages) pages.scrollTo({ left: tujuan.offsetLeft, behavior: "smooth" });
    });
  });

  if (pages) {
    pages.addEventListener("scroll", function () {
      const i = Math.round(pages.scrollLeft / pages.clientWidth);
      aktifkanMenu(urutan[i] || "home");
    });
  }

  // ==========================================
  // 11. MENJALANKAN DASHBOARD
  // ==========================================

  function mulaiMoneyTrack() {
    hitungKeuangan();
    tampilkanTransaksi();
    perbaruiTanggal();
    muatFotoProfil();
  }

  mulaiMoneyTrack();

  // Perbarui tanggal setiap menit
  setInterval(perbaruiTanggal, 60000);

  console.log("MONEYTRACK berhasil dijalankan!");

});
/* MONEYTRACK - Playlist musik (maks. 20 lagu) + penyimpanan media di perangkat */
(function () {
  "use strict";

  const DB_NAMA = "moneytrack_media";
  const MAKS_UKURAN = 60 * 1024 * 1024; // 60 MB per lagu
  const MAKS_LAGU = 20;
  const KEY_MATI = "moneytrack_musik_mati";

  // ---------- IndexedDB (dipakai juga oleh video.js) ----------
  function buka() {
    return new Promise(function (ok, gagal) {
      const r = indexedDB.open(DB_NAMA, 1);
      r.onupgradeneeded = function () {
        ["lagu", "video"].forEach(function (s) {
          if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { autoIncrement: true });
        });
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => gagal(r.error);
    });
  }
  function jalankan(store, mode, fn) {
    return buka().then(db => new Promise(function (ok, gagal) {
      const t = db.transaction(store, mode);
      const hasil = fn(t.objectStore(store));
      t.oncomplete = () => ok(hasil.val);
      t.onerror = t.onabort = () => gagal(t.error);
    }));
  }
  window.MT_DB = {
    semua: store => jalankan(store, "readonly", function (s) {
      const h = { val: [] };
      s.openCursor().onsuccess = function (e) {
        const c = e.target.result;
        if (c) { h.val.push(Object.assign({ id: c.key }, c.value)); c.continue(); }
      };
      return h;
    }),
    tambah: (store, obj) => jalankan(store, "readwrite", s => { s.put(obj); return {}; }),
    hapus: (store, id) => jalankan(store, "readwrite", s => { s.delete(id); return {}; })
  };

  // ---------- Elemen ----------
  const audio = document.getElementById("musikIntro");
  const tombol = document.getElementById("tombolMusik");
  const pilih = document.getElementById("pilihLagu");
  const tombolPilih = document.getElementById("tombolPilihLagu");
  const daftarEl = document.getElementById("daftarLagu");
  const status = document.getElementById("statusLagu");
  if (!audio || !tombol) return;

  let lagu = [];
  let idx = -1;
  let urlAktif = null;
  audio.loop = false;
  audio.volume = 0.7;

  const mati = () => localStorage.getItem(KEY_MATI) === "1";
  const ikon = () => { tombol.textContent = audio.paused ? "🔇" : "🎵"; };

  window.MT_MUSIK = { jeda: function () { audio.pause(); ikon(); } };

  function mainkan(i) {
    if (!lagu.length) return;
    idx = ((i % lagu.length) + lagu.length) % lagu.length;
    if (urlAktif) URL.revokeObjectURL(urlAktif);
    urlAktif = URL.createObjectURL(lagu[idx].blob);
    audio.src = urlAktif;
    audio.play().then(ikon).catch(ikon);
    gambar();
  }

  audio.addEventListener("ended", () => mainkan(idx + 1));
  audio.addEventListener("play", ikon);
  audio.addEventListener("pause", ikon);

  // ---------- Daftar lagu di Profil ----------
  function gambar() {
    if (status) {
      status.textContent = lagu.length
        ? lagu.length + " lagu dalam playlist (maks. " + MAKS_LAGU + ")"
        : "Belum ada lagu. Pilih beberapa file lagu dari perangkat Anda.";
    }
    if (!daftarEl) return;
    daftarEl.replaceChildren();
    lagu.forEach(function (l, i) {
      const baris = document.createElement("div");
      baris.className = "media-item" + (i === idx ? " aktif" : "");

      const nama = document.createElement("span");
      nama.textContent = (i + 1) + ". " + l.nama;

      const aksi = document.createElement("div");
      const p = document.createElement("button");
      p.type = "button"; p.textContent = "▶";
      p.addEventListener("click", function () { localStorage.removeItem(KEY_MATI); mainkan(i); });
      const x = document.createElement("button");
      x.type = "button"; x.textContent = "✕";
      x.addEventListener("click", function () { hapusLagu(i); });
      aksi.append(p, x);

      baris.append(nama, aksi);
      daftarEl.appendChild(baris);
    });
  }

  function muat() {
    return window.MT_DB.semua("lagu").then(function (d) { lagu = d; gambar(); }).catch(function () { gambar(); });
  }

  function hapusLagu(i) {
    if (!confirm("Hapus lagu ini?")) return;
    const sedangMain = i === idx;
    window.MT_DB.hapus("lagu", lagu[i].id).then(function () {
      if (sedangMain) { audio.pause(); audio.removeAttribute("src"); idx = -1; }
      else if (i < idx) idx--;
      return muat();
    }).then(ikon);
  }

  // ---------- Tambah lagu (boleh banyak sekaligus) ----------
  if (tombolPilih && pilih) {
    tombolPilih.addEventListener("click", () => pilih.click());
    pilih.addEventListener("change", async function () {
      const files = Array.from(pilih.files || []);
      pilih.value = "";
      let tambah = 0, lewat = [];
      for (const f of files) {
        if (lagu.length + tambah >= MAKS_LAGU) { lewat.push(f.name + " (playlist penuh)"); continue; }
        if (!f.type.startsWith("audio/")) { lewat.push(f.name + " (bukan audio)"); continue; }
        if (f.size > MAKS_UKURAN) { lewat.push(f.name + " (lebih dari 60 MB)"); continue; }
        try { await window.MT_DB.tambah("lagu", { nama: f.name, blob: f }); tambah++; }
        catch (e) { lewat.push(f.name + " (gagal disimpan)"); }
      }
      await muat();
      if (lewat.length) alert("Tidak ditambahkan:\n" + lewat.join("\n"));
      if (tambah && audio.paused && !mati()) mainkan(lagu.length - tambah);
    });
  }

  // ---------- Mulai di sentuhan pertama (browser memblokir suara otomatis) ----------
  function sentuhPertama() {
    document.removeEventListener("pointerdown", sentuhPertama);
    document.removeEventListener("keydown", sentuhPertama);
    if (lagu.length && !mati() && audio.paused && !audio.src) mainkan(0);
  }
  document.addEventListener("pointerdown", sentuhPertama);
  document.addEventListener("keydown", sentuhPertama);

  tombol.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!lagu.length) return alert("Belum ada lagu. Buka Profil > Musik Pembuka untuk menambah lagu.");
    if (audio.paused) {
      localStorage.removeItem(KEY_MATI);
      if (audio.src) audio.play().then(ikon).catch(ikon); else mainkan(0);
    } else {
      localStorage.setItem(KEY_MATI, "1");
      audio.pause();
    }
  });

  muat().then(ikon);
})();
/* MONEYTRACK - Koleksi video (file milik Anda, tersimpan di perangkat) */
(function () {
  "use strict";

  const MAKS_UKURAN = 300 * 1024 * 1024; // 300 MB per video
  const MAKS_VIDEO = 15;

  const pemutar = document.getElementById("pemutarVideo");
  const judul = document.getElementById("judulVideo");
  const pilih = document.getElementById("pilihVideo");
  const tombolPilih = document.getElementById("tombolPilihVideo");
  const daftarEl = document.getElementById("daftarVideo");
  const status = document.getElementById("statusVideo");
  if (!pemutar || !window.MT_DB) return;

  let videos = [];
  let aktif = -1;
  let urlAktif = null;

  pemutar.addEventListener("play", function () {
    if (window.MT_MUSIK) window.MT_MUSIK.jeda(); // jeda musik saat video diputar
  });

  function gambar() {
    status.textContent = videos.length
      ? videos.length + " video (maks. " + MAKS_VIDEO + ")"
      : "Belum ada video. Tambahkan file video dari perangkat Anda.";
    daftarEl.replaceChildren();
    videos.forEach(function (v, i) {
      const baris = document.createElement("div");
      baris.className = "media-item" + (i === aktif ? " aktif" : "");
      const nama = document.createElement("span");
      nama.textContent = (i + 1) + ". " + v.nama;
      const aksi = document.createElement("div");
      const p = document.createElement("button");
      p.type = "button"; p.textContent = "▶";
      p.addEventListener("click", () => putar(i));
      const x = document.createElement("button");
      x.type = "button"; x.textContent = "✕";
      x.addEventListener("click", () => hapus(i));
      aksi.append(p, x);
      baris.append(nama, aksi);
      daftarEl.appendChild(baris);
    });
  }

  function putar(i) {
    aktif = i;
    if (urlAktif) URL.revokeObjectURL(urlAktif);
    urlAktif = URL.createObjectURL(videos[i].blob);
    pemutar.src = urlAktif;
    pemutar.hidden = false;
    judul.textContent = videos[i].nama;
    pemutar.play().catch(function () {});
    gambar();
  }

  function hapus(i) {
    if (!confirm("Hapus video ini?")) return;
    const sedang = i === aktif;
    window.MT_DB.hapus("video", videos[i].id).then(function () {
      if (sedang) { pemutar.pause(); pemutar.removeAttribute("src"); pemutar.hidden = true; judul.textContent = ""; aktif = -1; }
      else if (i < aktif) aktif--;
      return muat();
    });
  }

  function muat() {
    return window.MT_DB.semua("video").then(d => { videos = d; gambar(); }).catch(gambar);
  }

  tombolPilih.addEventListener("click", () => pilih.click());
  pilih.addEventListener("change", async function () {
    const files = Array.from(pilih.files || []);
    pilih.value = "";
    let tambah = 0, lewat = [];
    for (const f of files) {
      if (videos.length + tambah >= MAKS_VIDEO) { lewat.push(f.name + " (koleksi penuh)"); continue; }
      if (!f.type.startsWith("video/")) { lewat.push(f.name + " (bukan video)"); continue; }
      if (f.size > MAKS_UKURAN) { lewat.push(f.name + " (lebih dari 300 MB)"); continue; }
      try { await window.MT_DB.tambah("video", { nama: f.name, blob: f }); tambah++; }
      catch (e) { lewat.push(f.name + " (gagal disimpan, penyimpanan perangkat mungkin penuh)"); }
    }
    await muat();
    if (lewat.length) alert("Tidak ditambahkan:\n" + lewat.join("\n"));
  });

  muat();
})();
