// CODE MUHAMMAD RAIHAN
//SUBMISSION DICODING
const STORAGE_KEY = "BOOKSHELF_APP";

let books = [];
let currentFilter = "all";
let currentQuery = "";
let currentSort = "createdDesc";

let formRating = 0;
let editRating = 0;

let lastDeleted = null; 


let draggingId = null;

let scanStream = null;
let scanRAF = null;
let barcodeDetector = null;

const el = (id) => document.getElementById(id);

const dom = {
  bookForm: el("bookForm"),
  titleInput: el("bookFormTitle"),
  authorInput: el("bookFormAuthor"),
  yearInput: el("bookFormYear"),
  isCompleteInput: el("bookFormIsComplete"),
  submitSpan: el("submitSpan"),

  ratingInput: el("ratingInput"),

  searchForm: el("searchBook"),
  searchInput: el("searchBookTitle"),
  resetBtn: el("resetBtn"),

  incompleteList: el("incompleteBookList"),
  completeList: el("completeBookList"),

  sortSelect: el("sortSelect"),
  segmentedBtns: Array.from(document.querySelectorAll(".segmented__btn")),

  badgeIncomplete: el("badgeIncomplete"),
  badgeComplete: el("badgeComplete"),

  statTotal: el("statTotal"),
  statIncomplete: el("statIncomplete"),
  statComplete: el("statComplete"),
  statProgress: el("statProgress"),

  toast: el("toast"),

  themeToggle: el("themeToggle"),
  exportBtn: el("exportBtn"),
  importInput: el("importInput"),

  editModal: el("editModal"),
  editForm: el("editForm"),
  editId: el("editId"),
  editTitle: el("editTitle"),
  editAuthor: el("editAuthor"),
  editYear: el("editYear"),
  editIsComplete: el("editIsComplete"),
  editRatingInput: el("editRatingInput"),

  confirmModal: el("confirmModal"),
  deleteId: el("deleteId"),
  confirmText: el("confirmText"),
  confirmDeleteBtn: el("confirmDeleteBtn"),

  scanBtn: el("scanBtn"),
  scanModal: el("scanModal"),
  scanVideo: el("scanVideo"),
  scanStartBtn: el("scanStartBtn"),
  scanStopBtn: el("scanStopBtn"),
  scanCloseBtn: el("scanCloseBtn"),
  scanSupportNote: el("scanSupportNote"),

  droptargets: Array.from(document.querySelectorAll(".droptarget")),
};

const Icons = {
  check: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 14l-4-4 4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20a8 8 0 0 0-8-8H5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 6l1 16h10l1-16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 8h12v12H8z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 16H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6z" stroke="currentColor" stroke-width="2.2"/><path d="M14 14h2v2h-2v-2zM18 14h2v6h-6v-2h4v-4z" stroke="currentColor" stroke-width="2.2"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03z"/></svg>`,
};


function uid() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

function safeYear(value) {
  const y = Number(value);
  if (!Number.isFinite(y)) return new Date().getFullYear();
  return Math.min(Math.max(y, 0), 9999);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    books = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(books)) books = [];
  } catch {
    books = [];
  }
}

function showToast(message, withUndo = false) {
  dom.toast.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "10px";

  const text = document.createElement("span");
  text.textContent = message;
  wrap.appendChild(text);

  if (withUndo) {
    const btn = document.createElement("button");
    btn.className = "btn btn--tiny";
    btn.type = "button";
    btn.innerHTML = `${Icons.undo} Undo`;
    attachRipple(btn);
    btn.addEventListener("click", () => undoDelete());
    wrap.appendChild(btn);
  }

  dom.toast.appendChild(wrap);
  dom.toast.classList.add("is-show");
  clearTimeout(showToast._t);

  const duration = withUndo ? 6000 : 2600; // <- penting
  showToast._t = setTimeout(() => dom.toast.classList.remove("is-show"), duration);
}


function setTheme(mode) {
  if (mode === "light") document.documentElement.classList.add("light");
  else document.documentElement.classList.remove("light");
  localStorage.setItem("BOOKSHELF_THEME", mode);
}

function initTheme() {
  const saved = localStorage.getItem("BOOKSHELF_THEME");
  if (saved === "light" || saved === "dark") setTheme(saved);
  else setTheme("dark");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const mid = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark>${mid}</mark>${after}`;
}

function attachRipple(btn) {
  btn.addEventListener("pointerdown", (e) => {
    const r = btn.getBoundingClientRect();
    const rx = (e.clientX - r.left) + "px";
    const ry = (e.clientY - r.top) + "px";
    btn.style.setProperty("--rx", rx);
    btn.style.setProperty("--ry", ry);
    btn.classList.remove("is-ripple");
    void btn.offsetWidth;
    btn.classList.add("is-ripple");
  });
}


function qrUrl(book) {
  const payload = {
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    rating: book.rating || 0,
    complete: book.isComplete ? 1 : 0
  };
  const data = encodeURIComponent(JSON.stringify(payload));
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${data}`;
}


function renderRatingChips(container, value, onChange) {
  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Rating ${i}`);
    btn.innerHTML = Icons.star;
    if (i > value) btn.classList.add("is-off");

    btn.addEventListener("click", () => onChange(i));
    container.appendChild(btn);
  }
}

function renderRatingStatic(value) {
  const wrap = document.createElement("div");
  wrap.className = "rating";
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement("span");
    s.className = "star" + (i > value ? " is-off" : "");
    s.innerHTML = Icons.star;
    wrap.appendChild(s);
  }
  return wrap;
}


function bookTemplate(book) {
  const container = document.createElement("div");
  container.className = "book";
  container.setAttribute("data-bookid", book.id);
  container.setAttribute("data-testid", "bookItem");

  container.draggable = true;
  container.addEventListener("dragstart", (e) => onDragStart(e, book.id));
  container.addEventListener("dragend", onDragEnd);

  const meta = document.createElement("div");
  meta.className = "book__meta";

  const h3 = document.createElement("h3");
  h3.setAttribute("data-testid", "bookItemTitle");
  h3.innerHTML = highlight(book.title, currentQuery);

  const pAuthor = document.createElement("p");
  pAuthor.setAttribute("data-testid", "bookItemAuthor");
  pAuthor.textContent = `Penulis: ${book.author}`;

  const pYear = document.createElement("p");
  pYear.setAttribute("data-testid", "bookItemYear");
  pYear.textContent = `Tahun: ${book.year}`;

  // rating badge (new)
  const ratingBadge = renderRatingStatic(book.rating || 0);

  // sub row: QR + copy + rating
  const subrow = document.createElement("div");
  subrow.className = "book__subrow";

  const qrBox = document.createElement("div");
  qrBox.className = "qr";
  qrBox.title = "QR dibuat otomatis dari data buku";

  const img = document.createElement("img");
  img.alt = "QR Code buku";
  img.loading = "lazy";
  img.src = qrUrl(book);

  const qrText = document.createElement("div");
  qrText.className = "qr__text";
  qrText.innerHTML = `<strong style="display:flex;align-items:center;gap:6px;">${Icons.qr} QR</strong><small>Scan untuk detail</small>`;

  qrBox.append(img, qrText);

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn btn--tiny";
  copyBtn.type = "button";
  copyBtn.innerHTML = `${Icons.copy} Copy`;
  copyBtn.title = "Copy detail buku";
  attachRipple(copyBtn);
  copyBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    const text = `ID: ${book.id}\nJudul: ${book.title}\nPenulis: ${book.author}\nTahun: ${book.year}\nRating: ${book.rating || 0}/5\nStatus: ${book.isComplete ? "Selesai" : "Belum selesai"}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("📋 Detail buku dicopy");
    } catch {
      showToast("❌ Clipboard tidak diizinkan browser");
    }
  });

  subrow.append(qrBox, ratingBadge, copyBtn);

  meta.append(h3, pAuthor, pYear, subrow);

  const actions = document.createElement("div");
  actions.className = "book__actions";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "btn btn--tiny";
  toggleBtn.setAttribute("data-testid", "bookItemIsCompleteButton");
  toggleBtn.innerHTML = `${Icons.check} ${book.isComplete ? "Belum selesai" : "Selesai dibaca"}`;
  attachRipple(toggleBtn);
  toggleBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    toggleComplete(book.id);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn--danger btn--tiny";
  deleteBtn.setAttribute("data-testid", "bookItemDeleteButton");
  deleteBtn.innerHTML = `${Icons.trash} Hapus`;
  attachRipple(deleteBtn);
  deleteBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openDeleteConfirm(book.id);
  });

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn btn--primary btn--tiny";
  editBtn.setAttribute("data-testid", "bookItemEditButton");
  editBtn.innerHTML = `${Icons.edit} Edit`;
  attachRipple(editBtn);
  editBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openEdit(book.id);
  });

  actions.append(toggleBtn, deleteBtn, editBtn);
  container.append(meta, actions);

  return container;
}

function matchesFilter(book) {
  if (currentFilter === "complete") return book.isComplete;
  if (currentFilter === "incomplete") return !book.isComplete;
  return true;
}

function matchesQuery(book) {
  if (!currentQuery) return true;
  return book.title.toLowerCase().includes(currentQuery.toLowerCase());
}

function sortBooks(list) {
  const copy = [...list];
  switch (currentSort) {
    case "createdAsc": copy.sort((a, b) => a.createdAt - b.createdAt); break;
    case "createdDesc": copy.sort((a, b) => b.createdAt - a.createdAt); break;
    case "titleAsc": copy.sort((a, b) => a.title.localeCompare(b.title)); break;
    case "titleDesc": copy.sort((a, b) => b.title.localeCompare(a.title)); break;
    case "yearAsc": copy.sort((a, b) => a.year - b.year); break;
    case "yearDesc": copy.sort((a, b) => b.year - a.year); break;
    case "ratingAsc": copy.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
    case "ratingDesc": copy.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    default: break;
  }
  return copy;
}


function stagger(node, i) {
  node.style.animationDelay = (i * 40) + "ms";
  return node;
}

function emptyState(text) {
  const d = document.createElement("div");
  d.className = "empty";
  d.textContent = text;
  return d;
}

function updateBadges() {
  const inc = books.filter((b) => !b.isComplete).length;
  const com = books.filter((b) => b.isComplete).length;
  dom.badgeIncomplete.textContent = String(inc);
  dom.badgeComplete.textContent = String(com);
}

function updateStats() {
  const total = books.length;
  const complete = books.filter((b) => b.isComplete).length;
  const incomplete = total - complete;
  dom.statTotal.textContent = String(total);
  dom.statComplete.textContent = String(complete);
  dom.statIncomplete.textContent = String(incomplete);
  const progress = total === 0 ? 0 : Math.round((complete / total) * 100);
  dom.statProgress.textContent = String(progress);
}

function render() {
  dom.incompleteList.innerHTML = "";
  dom.completeList.innerHTML = "";

  const filtered = sortBooks(books.filter(matchesFilter).filter(matchesQuery));
  const incomplete = filtered.filter((b) => !b.isComplete);
  const complete = filtered.filter((b) => b.isComplete);

  if (incomplete.length === 0) dom.incompleteList.append(emptyState("Belum ada buku di rak ini."));
  else incomplete.forEach((b, i) => dom.incompleteList.append(stagger(bookTemplate(b), i)));

  if (complete.length === 0) dom.completeList.append(emptyState("Belum ada buku selesai dibaca."));
  else complete.forEach((b, i) => dom.completeList.append(stagger(bookTemplate(b), i)));

  updateBadges();
  updateStats();
}


function addBook({ title, author, year, isComplete, rating }) {
  const t = title.trim();
  const a = author.trim();
  if (!t || !a) {
    dom.bookForm.classList.add("shake");
    setTimeout(() => dom.bookForm.classList.remove("shake"), 360);
    showToast("❌ Judul & penulis wajib diisi");
    return;
  }

  const book = {
    id: uid(),
    title: t,
    author: a,
    year: safeYear(year),
    isComplete: Boolean(isComplete),
    rating: Math.max(0, Math.min(5, Number(rating) || 0)),
    createdAt: Date.now(),
  };

  books.push(book);
  save();
  render();
  showToast("✅ Buku ditambahkan");
}

function toggleComplete(id) {
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return;
  books[idx].isComplete = !books[idx].isComplete;
  save();
  render();
  showToast(books[idx].isComplete ? "📗 Dipindah ke: Selesai" : "📘 Dipindah ke: Belum selesai");
}

function openEdit(id) {
  const book = books.find((b) => b.id === id);
  if (!book) return;

  dom.editId.value = book.id;
  dom.editTitle.value = book.title;
  dom.editAuthor.value = book.author;
  dom.editYear.value = book.year;
  dom.editIsComplete.checked = book.isComplete;

  editRating = book.rating || 0;
  renderRatingChips(dom.editRatingInput, editRating, (v) => {
    editRating = v;
    renderRatingChips(dom.editRatingInput, editRating, arguments.callee);
  });

  dom.editModal.showModal();
}

function saveEdit() {
  const id = dom.editId.value;
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return;

  const t = dom.editTitle.value.trim();
  const a = dom.editAuthor.value.trim();
  if (!t || !a) {
    dom.editForm.classList.add("shake");
    setTimeout(() => dom.editForm.classList.remove("shake"), 360);
    showToast("❌ Judul & penulis wajib diisi");
    return;
  }

  books[idx].title = t;
  books[idx].author = a;
  books[idx].year = safeYear(dom.editYear.value);
  books[idx].isComplete = dom.editIsComplete.checked;
  books[idx].rating = Math.max(0, Math.min(5, Number(editRating) || 0));

  save();
  render();
  showToast("✏️ Buku diperbarui");
}

function openDeleteConfirm(id) {
  const book = books.find((b) => b.id === id);
  if (!book) return;

  if (dom.confirmText) {
    dom.confirmText.textContent = `Buku "${book.title}" akan dihapus permanen.`;
  }
  const newConfirmBtn = dom.confirmDeleteBtn.cloneNode(true);
  dom.confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, dom.confirmDeleteBtn);
  
  dom.confirmDeleteBtn = newConfirmBtn;

  dom.confirmDeleteBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    deleteBook(id);
    dom.confirmModal.close();
  }, { once: true });

  dom.confirmModal.showModal();
}

function deleteBook(id) {
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return;

  const removed = books[idx];
  const removedIndex = idx;

  books.splice(idx, 1);

  save(); 
  render();

  if (lastDeleted?.timeoutId) clearTimeout(lastDeleted.timeoutId);
  lastDeleted = {
    book: removed,
    index: removedIndex,
    timeoutId: setTimeout(() => { lastDeleted = null; }, 5000),
  };

  showToast("🗑️ Buku dihapus", true);
}


function undoDelete() {
  if (!lastDeleted) return;

  clearTimeout(lastDeleted.timeoutId);

  if (books.some((b) => b.id === lastDeleted.book.id)) {
    lastDeleted = null;
    return;
  }

  books.splice(Math.min(lastDeleted.index, books.length), 0, lastDeleted.book);
  lastDeleted = null;
  save();
  render();
  showToast("✅ Undo berhasil");
}

function seedOnce() {
  const seeded = localStorage.getItem("BOOKSHELF_SEEDED") === "1";
  if (seeded) return;

  if (books.length === 0) {
    books = [
      { id: uid(), title: "Judul Buku 1", author: "Penulis Buku 1", year: 2030, rating: 4, isComplete: false, createdAt: Date.now()-20000 },
      { id: uid(), title: "Judul Buku 2", author: "Penulis Buku 2", year: 2030, rating: 5, isComplete: true, createdAt: Date.now()-10000 },
    ];
    save();
  }

  localStorage.setItem("BOOKSHELF_SEEDED", "1");
}



function exportJSON() {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookshelf-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("⬇️ Export berhasil");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(data)) throw new Error("Invalid file");
      const normalized = data
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          id: String(x.id || uid()),
          title: String(x.title || "").trim() || "Untitled",
          author: String(x.author || "").trim() || "Unknown",
          year: safeYear(x.year),
          rating: Math.max(0, Math.min(5, Number(x.rating) || 0)),
          isComplete: Boolean(x.isComplete),
          createdAt: Number(x.createdAt || Date.now()),
        }));

      books = normalized;
      save();
      render();
      showToast("⬆️ Import berhasil");
    } catch {
      showToast("❌ Import gagal (file tidak valid)");
    }
  };
  reader.readAsText(file);
}


function onDragStart(e, id) {
  draggingId = id;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", id);

  const card = e.currentTarget;
  card.classList.add("is-dragging");
}

function onDragEnd(e) {
  const card = e.currentTarget;
  card.classList.remove("is-dragging");
  draggingId = null;

  dom.droptargets.forEach((t) => t.classList.remove("is-over"));
}

function setupDropzones() {
  dom.droptargets.forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("is-over");
      e.dataTransfer.dropEffect = "move";
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("is-over");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-over");
      const id = e.dataTransfer.getData("text/plain") || draggingId;
      if (!id) return;

      const target = zone.dataset.dropzone;
      const idx = books.findIndex((b) => b.id === id);
      if (idx === -1) return;

      const shouldComplete = target === "complete";
      if (books[idx].isComplete !== shouldComplete) {
        books[idx].isComplete = shouldComplete;
        save();
        render();
        showToast(shouldComplete ? "📗 Dipindah via Drag: Selesai" : "📘 Dipindah via Drag: Belum selesai");
      }
    });
  });
}


function isBarcodeDetectorSupported() {
  return "BarcodeDetector" in window;
}

async function initBarcodeDetector() {
  if (!isBarcodeDetectorSupported()) return null;
  try {
    return new BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    try { return new BarcodeDetector(); } catch { return null; }
  }
}

async function startScan() {
  dom.scanSupportNote.textContent = "";

  if (!barcodeDetector) {
    barcodeDetector = await initBarcodeDetector();
  }

  if (!barcodeDetector) {
    dom.scanSupportNote.textContent =
      "Browser kamu belum mendukung QR scan (BarcodeDetector). Coba Chrome/Edge terbaru di HTTPS/localhost.";
    showToast("❌ QR scan tidak didukung browser");
    return;
  }

  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    dom.scanVideo.srcObject = scanStream;
    await dom.scanVideo.play();
    scanLoop();
    showToast("📷 Scan dimulai");
  } catch {
    showToast("❌ Kamera kamu jelek");
  }
}

function stopScan() {
  if (scanRAF) cancelAnimationFrame(scanRAF);
  scanRAF = null;

  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
  dom.scanVideo.srcObject = null;
  showToast("Scan berhenti bro");
}

function cleanupOldKeys() {
  const oldKeys = ["BOOKSHELF_APP", "BOOKSHELF_APP_V2", "BOOKSHELF_APP_V3"];
  oldKeys.forEach((k) => {
    if (k !== STORAGE_KEY) localStorage.removeItem(k);
  });
}

async function scanLoop() {
  if (!barcodeDetector || !dom.scanVideo || dom.scanVideo.readyState < 2) {
    scanRAF = requestAnimationFrame(scanLoop);
    return;
  }

  try {
    const codes = await barcodeDetector.detect(dom.scanVideo);
    if (codes && codes.length > 0) {
      const raw = codes[0].rawValue || "";
      handleScannedValue(raw);
      return; 
    }
  } catch {
    
  }

  scanRAF = requestAnimationFrame(scanLoop);
}

function handleScannedValue(raw) {
 
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
  
    data = { title: raw };
  }

  stopScan();
  dom.scanModal.close();

 
  if (data.title) dom.titleInput.value = String(data.title);
  if (data.author) dom.authorInput.value = String(data.author);
  if (data.year) dom.yearInput.value = String(data.year);
  if (typeof data.complete !== "undefined") dom.isCompleteInput.checked = Boolean(Number(data.complete) || data.complete);
  if (typeof data.rating !== "undefined") {
    formRating = Math.max(0, Math.min(5, Number(data.rating) || 0));
    renderRatingChips(dom.ratingInput, formRating, setFormRating);
  }

  if (data.id) {
    const idx = books.findIndex((b) => b.id === String(data.id));
    if (idx !== -1) {
      books[idx].title = String(data.title || books[idx].title);
      books[idx].author = String(data.author || books[idx].author);
      books[idx].year = safeYear(data.year ?? books[idx].year);
      books[idx].rating = Math.max(0, Math.min(5, Number(data.rating) || books[idx].rating || 0));
      books[idx].isComplete = typeof data.complete === "undefined" ? books[idx].isComplete : Boolean(Number(data.complete) || data.complete);
      save();
      render();
      showToast("Scan: buku terdeteksi & di-update");
      return;
    }
  }

  showToast("✨ Scan: data masuk ke form");
}
function setFormRating(v) {
  formRating = v;
  renderRatingChips(dom.ratingInput, formRating, setFormRating);
}


dom.isCompleteInput.addEventListener("change", () => {
  dom.submitSpan.textContent = dom.isCompleteInput.checked ? "Selesai dibaca" : "Belum selesai dibaca";
});

dom.bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addBook({
    title: dom.titleInput.value,
    author: dom.authorInput.value,
    year: dom.yearInput.value,
    isComplete: dom.isCompleteInput.checked,
    rating: formRating,
  });
  dom.bookForm.reset();
  formRating = 0;
  renderRatingChips(dom.ratingInput, formRating, setFormRating);
  dom.submitSpan.textContent = "Belum selesai dibaca";
});

dom.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  currentQuery = dom.searchInput.value.trim();
  render();
  showToast(currentQuery ? `🔎 Cari: "${currentQuery}"` : "🔎 Pencarian dikosongkan");
});

dom.searchInput.addEventListener("input", (e) => {
  currentQuery = e.target.value.trim();
  render();
});

dom.resetBtn.addEventListener("click", () => {
  dom.searchInput.value = "";
  currentQuery = "";
  currentSort = "createdDesc";
  dom.sortSelect.value = "createdDesc";
  currentFilter = "all";
  dom.segmentedBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.filter === "all"));
  render();
  showToast("🔄 Reset selesai");
});

dom.sortSelect.addEventListener("change", (e) => {
  currentSort = e.target.value;
  render();
});

dom.segmentedBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    dom.segmentedBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

dom.editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveEdit();
  dom.editModal.close();
});


dom.themeToggle.addEventListener("click", () => {
  const isLight = document.documentElement.classList.contains("light");
  setTheme(isLight ? "dark" : "light");
  showToast(isLight ? "🌙 Dark mode" : "☀️ Light mode");
});

dom.exportBtn.addEventListener("click", exportJSON);

dom.importInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  importJSON(file);
  e.target.value = "";
});


dom.scanBtn.addEventListener("click", () => {
  dom.scanModal.showModal();
  dom.scanSupportNote.textContent = isBarcodeDetectorSupported()
    ? "Siap. Klik Start untuk mulai scan."
    : "Browser kamu belum mendukung BarcodeDetector. Disarankan Chrome/Edge terbaru + HTTPS/localhost.";
});

dom.scanCloseBtn.addEventListener("click", () => {
  stopScan();
  dom.scanModal.close();
});
dom.scanStartBtn.addEventListener("click", startScan);
dom.scanStopBtn.addEventListener("click", stopScan);

dom.scanModal.addEventListener("close", () => stopScan());

(function init() {
  initTheme();
  cleanupOldKeys();
  load();

  renderRatingChips(dom.ratingInput, formRating, setFormRating);
  renderRatingChips(dom.editRatingInput, editRating, (v) => (editRating = v));

  setupDropzones();
  //seedOnce(); 
  render();
})();
