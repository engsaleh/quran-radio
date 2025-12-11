
const riwayahSelect = document.getElementById("riwayah-select");
const reciterSelect = document.getElementById("reciter-select");
const surahListEl = document.getElementById("surah-list");

const stationRiwayah = document.getElementById("station-riwayah");
const stationReciter = document.getElementById("station-reciter");
const stationCount = document.getElementById("station-count");

const nowSurahEl = document.getElementById("now-surah");
const audio = document.getElementById("audio");

const radioBtn = document.getElementById("radio-btn");
const pauseBtn = document.getElementById("pause-btn");
const progressFill = document.getElementById("progress-fill");
const currentTimeEl = document.getElementById("current-time");
const totalTimeEl = document.getElementById("total-time");

const themeToggle = document.getElementById("theme-toggle");

/*
 * Although we previously maintained a hard‑coded mapping of chapter numbers to
 * Arabic surah names, this approach falls out of sync when the backend API
 * introduces new names or corrections. Each track returned from the Itqan
 * CMS API already includes a `surah_name_ar` property representing the
 * canonical Arabic title. Therefore we no longer rely on a local map and
 * instead always prefer `track.surah_name_ar` when available. A small fallback
 * map is retained only for backwards compatibility in the rare case where
 * the API omits this field. Should the API always supply `surah_name_ar`,
 * the fallback will never be used.
 */
const fallbackArabicNames = {
  1: "الفاتحة",
  2: "البقرة",
  3: "آل عمران",
  4: "النساء",
  5: "المائدة",
  6: "الأنعام",
  7: "الأعراف",
  8: "الأنفال",
  9: "التوبة",
  10: "يونس",
  11: "هود",
  12: "يوسف",
  13: "الرعد",
  14: "إبراهيم",
  15: "الحجر",
  16: "النحل",
  17: "الإسراء",
  18: "الكهف",
  19: "مريم",
  20: "طه",
  21: "الأنبياء",
  22: "الحج",
  23: "المؤمنون",
  24: "النور",
  25: "الفرقان",
  26: "الشعراء",
  27: "النمل",
  28: "القصص",
  29: "العنكبوت",
  30: "الروم",
  31: "لقمان",
  32: "السجدة",
  33: "الأحزاب",
  34: "سبأ",
  35: "فاطر",
  36: "يس",
  37: "الصافات",
  38: "ص",
  39: "الزمر",
  40: "غافر",
  41: "فصلت",
  42: "الشورى",
  43: "الزخرف",
  44: "الدخان",
  45: "الجاثية",
  46: "الأحقاف",
  47: "محمد",
  48: "الفتح",
  49: "الحجرات",
  50: "ق",
  51: "الذاريات",
  52: "الطور",
  53: "النجم",
  54: "القمر",
  55: "الرحمن",
  56: "الواقعة",
  57: "الحديد",
  58: "المجادلة",
  59: "الحشر",
  60: "الممتحنة",
  61: "الصف",
  62: "الجمعة",
  63: "المنافقون",
  64: "التغابن",
  65: "الطلاق",
  66: "التحريم",
  67: "الملك",
  68: "القلم",
  69: "الحاقة",
  70: "المعارج",
  71: "نوح",
  72: "الجن",
  73: "المزمل",
  74: "المدثر",
  75: "القيامة",
  76: "الإنسان",
  77: "المرسلات",
  78: "النبأ",
  79: "النازعات",
  80: "عبس",
  81: "التكوير",
  82: "الانفطار",
  83: "المطففين",
  84: "الانشقاق",
  85: "البروج",
  86: "الطارق",
  87: "الأعلى",
  88: "الغاشية",
  89: "الفجر",
  90: "البلد",
  91: "الشمس",
  92: "الليل",
  93: "الضحى",
  94: "الشرح",
  95: "التين",
  96: "العلق",
  97: "القدر",
  98: "البينة",
  99: "الزلزلة",
  100: "العاديات",
  101: "القارعة",
  102: "التكاثر",
  103: "العصر",
  104: "الهمزة",
  105: "الفيل",
  106: "قريش",
  107: "الماعون",
  108: "الكوثر",
  109: "الكافرون",
  110: "النصر",
  111: "المسد",
  112: "الإخلاص",
  113: "الفلق",
  114: "الناس",
};

let currentPlaylist = [];
let currentIndex = -1;
let userStartedRadio = false;

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function cleanTracks(rawTracks) {
  if (!Array.isArray(rawTracks)) return [];
  const seen = new Set();
  const cleaned = [];

  rawTracks.forEach((t) => {
    if (!t || !t.chapter_number || !t.audio_url) return;

    const key = `${t.chapter_number}-${t.audio_url}`;
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(t);
    }
  });

  cleaned.sort((a, b) => a.chapter_number - b.chapter_number);
  return cleaned;
}

function updateControls() {
  const hasStation = currentPlaylist.length > 0;
  radioBtn.disabled = !hasStation;
  pauseBtn.disabled = !hasStation;
}

async function loadRiwayahs() {
  try {
    const res = await fetch("/api/riwayahs");
    const data = await res.json();
    riwayahSelect.innerHTML = "<option value=''>اختر الرواية</option>";
    data.results.forEach((r) => {
      riwayahSelect.innerHTML += `<option value='${r.id}'>${r.name_ar}</option>`;
    });
  } catch (e) {
    riwayahSelect.innerHTML =
      "<option value=''>تعذر تحميل الروايات</option>";
  }
}

async function loadReciters() {
  try {
    const res = await fetch("/api/reciters");
    const data = await res.json();
    reciterSelect.innerHTML = "<option value=''>اختر القارئ</option>";
    data.results.forEach((r) => {
      reciterSelect.innerHTML += `<option value='${r.id}'>${r.name_ar}</option>`;
    });
  } catch (e) {
    reciterSelect.innerHTML =
      "<option value=''>تعذر تحميل القرّاء</option>";
  }
}

async function buildStation() {
  const riwayahId = riwayahSelect.value;
  const reciterId = reciterSelect.value;

  currentPlaylist = [];
  currentIndex = -1;
  userStartedRadio = false;
  updateControls();

  if (!riwayahId || !reciterId) {
    surahListEl.innerHTML =
      '<div class="placeholder">اختر الرواية والقارئ أولاً.</div>';
    stationRiwayah.textContent = "—";
    stationReciter.textContent = "—";
    stationCount.textContent = "0";
    nowSurahEl.textContent = "لم يبدأ التشغيل بعد.";
    progressFill.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    totalTimeEl.textContent = "0:00";
    return;
  }

  surahListEl.innerHTML =
    '<div class="placeholder">جاري إعداد محطة الراديو...</div>';

  stationRiwayah.textContent =
    riwayahSelect.options[riwayahSelect.selectedIndex]?.textContent || "—";
  stationReciter.textContent =
    reciterSelect.options[reciterSelect.selectedIndex]?.textContent || "—";
  stationCount.textContent = "—";

  try {
    const recitationsRes = await fetch(
      `/api/recitations?reciter_id=${reciterId}&riwayah_id=${riwayahId}`
    );
    const recitationsData = await recitationsRes.json();

    if (!recitationsData.results?.length) {
      surahListEl.innerHTML =
        '<div class="placeholder">لا توجد تلاوات متاحة لهذا الاختيار.</div>';
      stationCount.textContent = "0";
      nowSurahEl.textContent = "لا توجد محطة متاحة.";
      return;
    }

    const assetId = recitationsData.results[0].id;
    const tracksRes = await fetch(`/api/recitations/${assetId}`);
    const tracksData = await tracksRes.json();

    const cleaned = cleanTracks(tracksData.results || []);

    if (!cleaned.length) {
      surahListEl.innerHTML =
        '<div class="placeholder">لا توجد سور صالحة في هذه التلاوة.</div>';
      stationCount.textContent = "0";
      nowSurahEl.textContent = "لا توجد سور متاحة.";
      return;
    }

    currentPlaylist = cleaned;
    stationCount.textContent = currentPlaylist.length.toString();
    renderSurahList();
    nowSurahEl.textContent = "جاهز للتشغيل. اضغطي تشغيل الراديو.";
    updateControls();
  } catch (e) {
    surahListEl.innerHTML =
      '<div class="placeholder">حدث خطأ أثناء إنشاء المحطة.</div>';
    stationCount.textContent = "0";
    nowSurahEl.textContent = "تعذر إنشاء المحطة.";
  }
}

function renderSurahList() {
  surahListEl.innerHTML = "";
  currentPlaylist.forEach((track, idx) => {
    const item = document.createElement("div");
    item.className = "surah-item";
    item.dataset.index = idx.toString();

    const meta = document.createElement("div");
    meta.className = "surah-meta";
    // Prefer the API‑provided Arabic name when available.  Fallback to the
    // English name or a small local map only if surah_name_ar is missing.
    // Resolve the display name with graceful fallbacks:
    // 1) Use surah_name_ar directly from the API if present.
    // 2) Fall back to surah_name (English) if Arabic is unavailable.
    // 3) Fall back to our local table using either surah_number or chapter_number.
    const fallbackNameKey = track.surah_number || track.chapter_number;
    const name =
      track.surah_name_ar ||
      track.surah_name ||
      (fallbackNameKey ? fallbackArabicNames[fallbackNameKey] : "");

    meta.innerHTML = `
      <span class="surah-index">${track.chapter_number}</span>
      <span class="surah-name">${name}</span>
    `;

    const dur = document.createElement("span");
    dur.className = "surah-duration";
    dur.textContent = formatTime((track.duration_ms || 0) / 1000);

    item.appendChild(meta);
    item.appendChild(dur);

    item.addEventListener("click", () => {
      userStartedRadio = true;
      setCurrentIndex(idx, true);
    });

    surahListEl.appendChild(item);
  });
  highlightActiveSurah();
}

function highlightActiveSurah() {
  const items = surahListEl.querySelectorAll(".surah-item");
  items.forEach((el) => el.classList.remove("active"));
  if (currentIndex >= 0 && currentIndex < items.length) {
    items[currentIndex].classList.add("active");
  }
}

function setCurrentIndex(index, autoplay) {
  if (index < 0 || index >= currentPlaylist.length) return;
  currentIndex = index;
  const track = currentPlaylist[currentIndex];

  const proxiedUrl = `/api/audio?url=${encodeURIComponent(
    track.audio_url
  )}`;
  audio.src = proxiedUrl;

  // Use the Arabic name from the API when available, otherwise fall back.
  const fallbackNameKey = track.surah_number || track.chapter_number;
  const name =
    track.surah_name_ar ||
    track.surah_name ||
    (fallbackNameKey ? fallbackArabicNames[fallbackNameKey] : "");
  nowSurahEl.textContent = name ? "سورة " + name : "";
  totalTimeEl.textContent = formatTime((track.duration_ms || 0) / 1000);
  currentTimeEl.textContent = "0:00";
  progressFill.style.width = "0%";

  highlightActiveSurah();
  updateControls();

  if (autoplay && userStartedRadio) {
    audio.play().catch((e) => console.error("Play error:", e));
  }
}

function startRadio() {
  if (!currentPlaylist.length) return;
  userStartedRadio = true;
  if (currentIndex === -1) {
    setCurrentIndex(0, true);
  } else {
    audio.play().catch((e) => console.error("Play error:", e));
  }
}

// Theme toggle
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    themeToggle.textContent = "🌙";
  } else {
    themeToggle.textContent = "☀️";
  }
}

function initTheme() {
  const saved = localStorage.getItem("quran-radio-theme");
  const theme = saved === "light" || saved === "dark" ? saved : "dark";
  applyTheme(theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("quran-radio-theme", next);
});

// Events
radioBtn.addEventListener("click", () => {
  startRadio();
});

pauseBtn.addEventListener("click", () => {
  if (audio.paused) return;
  audio.pause();
});

audio.addEventListener("loadedmetadata", () => {
  totalTimeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  currentTimeEl.textContent = formatTime(audio.currentTime);
  const pct = (audio.currentTime / (audio.duration || 1)) * 100;
  progressFill.style.width = pct + "%";
});

audio.addEventListener("ended", () => {
  if (!currentPlaylist.length) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= currentPlaylist.length) {
    nextIndex = 0;
  }
  setCurrentIndex(nextIndex, true);
});

riwayahSelect.addEventListener("change", buildStation);
reciterSelect.addEventListener("change", buildStation);

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadRiwayahs();
  loadReciters();
  surahListEl.innerHTML =
    '<div class="placeholder">اختر الرواية والقارئ لإنشاء محطة الراديو.</div>';
  updateControls();
});
