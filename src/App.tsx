import React, { useState } from 'react';
import { BookOpen, Loader2, Baby, Palette, AudioLines, Pencil, Upload, Download, Plus, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

interface Page {
  pageNumber: number;
  storyText: string;
  imagePrompt: string;
  animationPrompt: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface StoryBook {
  title: string;
  theme: string;
  language: string;
  pages: Page[];
}

const DEFAULT_PAGE_COUNT = 3;
const MAX_PAGE_COUNT = 30;

const emptyPage = (pageNumber: number): Page => ({
  pageNumber,
  storyText: '',
  imagePrompt: '',
  animationPrompt: '',
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getExtensionFromBlob = (blob: Blob, fallback: string) => {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
  };

  return mimeMap[blob.type] || fallback;
};

export default function App() {
  const [title, setTitle] = useState('我的自訂繪本');
  const [theme, setTheme] = useState('自由創作');
  const [pages, setPages] = useState(DEFAULT_PAGE_COUNT);
  const [language, setLanguage] = useState('粵語');
  const [isExporting, setIsExporting] = useState(false);
  const [story, setStory] = useState<StoryBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizePages = (items: Page[]) => items.map((page, index) => ({ ...page, pageNumber: index + 1 }));

  const handleCreateBlank = () => {
    if (pages < 1 || pages > MAX_PAGE_COUNT) {
      setError(`頁數必須在 1 到 ${MAX_PAGE_COUNT} 之間`);
      return;
    }

    setError(null);
    setStory({
      title: title.trim() || '我的自訂繪本',
      theme: theme.trim() || '自由創作',
      language,
      pages: Array.from({ length: pages }).map((_, index) => emptyPage(index + 1)),
    });
  };

  const updateStoryMeta = (field: keyof Pick<StoryBook, 'title' | 'theme' | 'language'>, value: string) => {
    setStory(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const updatePage = (pageIndex: number, updates: Partial<Page>) => {
    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page, index) => (index === pageIndex ? { ...page, ...updates } : page)),
      };
    });
  };

  const addPage = () => {
    setStory(prev => {
      if (!prev) return prev;
      if (prev.pages.length >= MAX_PAGE_COUNT) {
        setError(`最多只能建立 ${MAX_PAGE_COUNT} 頁`);
        return prev;
      }
      setError(null);
      return {
        ...prev,
        pages: [...prev.pages, emptyPage(prev.pages.length + 1)],
      };
    });
  };

  const removePage = (pageIndex: number) => {
    setStory(prev => {
      if (!prev || prev.pages.length <= 1) return prev;
      return {
        ...prev,
        pages: normalizePages(prev.pages.filter((_, index) => index !== pageIndex)),
      };
    });
  };

  const handleAudioUpload = (pageIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      updatePage(pageIndex, { audioUrl: loadEvent.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (pageIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      updatePage(pageIndex, { imageUrl: loadEvent.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (pageIndex: number) => updatePage(pageIndex, { imageUrl: undefined });

  const clearAudio = (pageIndex: number) => updatePage(pageIndex, { audioUrl: undefined });

  const exportToZip = async () => {
    if (!story) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const imageFolder = zip.folder('images');
      const audioFolder = zip.folder('audio');
      const storyboardFolder = zip.folder('storyboard');
      const manifestPages = [];
      let htmlPages = '';

      for (const page of story.pages) {
        let imageSrc = '';
        let audioSrc = '';

        if (page.imageUrl) {
          try {
            const response = await fetch(page.imageUrl);
            const blob = await response.blob();
            const extension = getExtensionFromBlob(blob, 'png');
            const filename = `page-${page.pageNumber}.${extension}`;
            imageFolder?.file(filename, blob);
            imageSrc = `./images/${filename}`;
          } catch (packagingError) {
            console.error('Failed to package image for page', page.pageNumber, packagingError);
          }
        }

        if (page.audioUrl) {
          try {
            const response = await fetch(page.audioUrl);
            const blob = await response.blob();
            const extension = getExtensionFromBlob(blob, 'wav');
            const filename = `page-${page.pageNumber}.${extension}`;
            audioFolder?.file(filename, blob);
            audioSrc = `./audio/${filename}`;
          } catch (packagingError) {
            console.error('Failed to package audio for page', page.pageNumber, packagingError);
          }
        }

        manifestPages.push({
          pageNumber: page.pageNumber,
          storyText: page.storyText,
          imageFile: imageSrc || null,
          audioFile: audioSrc || null,
        });

        const safeStoryText = escapeHtml(page.storyText).replace(/\n/g, '<br>');

        htmlPages += `
          <article class="book-page story-page" data-page="${page.pageNumber}">
            <div class="paper story-paper">
              <div class="illustration-area">
                ${imageSrc ? `<img src="${imageSrc}" alt="第 ${page.pageNumber} 頁插圖" />` : '<div class="placeholder">尚未上傳插圖</div>'}
              </div>
              <div class="story-area">
                <div class="story-text">${safeStoryText || '<span class="muted">尚未填寫故事文本</span>'}</div>
                ${audioSrc ? `<audio class="audio-player" controls preload="metadata" playsinline src="${audioSrc}"></audio>` : '<div class="audio-missing">本頁未上傳配音</div>'}
              </div>
            </div>
          </article>
        `;
      }

      const safeTitle = escapeHtml(story.title || '我的自訂繪本');
      const safeTheme = escapeHtml(story.theme || '自由創作');
      const contentPageCount = story.pages.length;
      const totalSlides = contentPageCount + 1;

      const htmlContent = `<!DOCTYPE html>
<html lang="${story.language.includes('English') ? 'en' : 'zh-Hant'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #fffdf6;
      --paper-edge: #f4d99b;
      --ink: #78350f;
      --muted: #a16207;
      --background: #fdf7e8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(253, 230, 138, 0.55), transparent 34rem),
        linear-gradient(135deg, #fff7ed 0%, var(--background) 48%, #fff1f2 100%);
      display: flex;
      justify-content: center;
      padding: 22px 14px;
    }
    .reader-shell {
      width: min(1180px, 100%);
      display: grid;
      gap: 14px;
    }
    .book-stage, .controls {
      border: 1px solid rgba(217, 119, 6, 0.18);
      box-shadow: 0 24px 60px rgba(120, 53, 15, 0.12);
    }
    .book-stage {
      position: relative;
      min-height: 82vh;
      background: linear-gradient(90deg, rgba(146, 64, 14, 0.08), transparent 7%, transparent 93%, rgba(146, 64, 14, 0.08)), #fffdf7;
      border-radius: 34px;
      overflow: hidden;
      perspective: 1600px;
    }
    .book-page {
      position: absolute;
      inset: 0;
      opacity: 0;
      transform: rotateY(18deg) translateX(42px) scale(0.975);
      transform-origin: left center;
      transition: opacity 360ms ease, transform 520ms ease;
      pointer-events: none;
      padding: clamp(14px, 2.4vw, 30px);
    }
    .book-page.active {
      opacity: 1;
      transform: rotateY(0deg) translateX(0) scale(1);
      pointer-events: auto;
      z-index: 2;
    }
    .book-page.turning-back { transform-origin: right center; }
    .paper {
      width: 100%;
      height: 100%;
      min-height: calc(82vh - 60px);
      background: var(--paper);
      border: 1px solid var(--paper-edge);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7), 0 20px 45px rgba(120, 53, 15, 0.1);
    }
    .cover-paper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: clamp(28px, 6vw, 78px);
      background:
        radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.32), transparent 18rem),
        radial-gradient(circle at 84% 72%, rgba(251, 146, 60, 0.22), transparent 18rem),
        #fff7d6;
    }
    .cover-paper h1 {
      margin: 0 0 20px;
      font-size: clamp(2.8rem, 9vw, 6.7rem);
      line-height: 1.05;
      letter-spacing: 0.04em;
      color: #92400e;
    }
    .cover-paper p { margin: 8px 0; color: var(--muted); font-size: clamp(1rem, 2.4vw, 1.45rem); font-weight: 800; }
    .story-paper {
      display: grid;
      grid-template-rows: minmax(0, 76%) minmax(130px, 24%);
    }
    .illustration-area {
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      overflow: hidden;
    }
    .illustration-area img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: white;
    }
    .placeholder { color: #b45309; font-size: clamp(1.35rem, 3vw, 2.2rem); font-weight: 900; opacity: 0.55; }
    .story-area {
      text-align: center;
      padding: clamp(12px, 1.8vw, 22px) clamp(18px, 4vw, 58px);
      background: linear-gradient(180deg, #ffffff 0%, #fffaf0 100%);
      border-top: 1px solid rgba(217, 119, 6, 0.16);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      min-height: 0;
      overflow: hidden;
    }
    .story-text {
      width: min(920px, 100%);
      flex: 1 1 auto;
      min-height: 0;
      max-height: 100%;
      margin: 0 auto;
      padding: 2px 8px;
      font-size: clamp(0.95rem, 2vw, 1.45rem);
      line-height: 1.34;
      font-weight: 650;
      color: #451a03;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .story-text.scrollable { overflow-y: auto; }
    .audio-player { width: min(500px, 100%); height: 34px; flex: 0 0 34px; }
    .audio-missing { color: #d6a75d; font-size: 0.95rem; font-weight: 700; flex: 0 0 auto; }
    .muted { color: #a8a29e; }
    .controls {
      background: rgba(255, 251, 235, 0.92);
      border-radius: 999px;
      padding: 12px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10px;
      align-items: center;
    }
    button {
      border: 0;
      border-radius: 999px;
      padding: 14px 22px;
      font-size: 1rem;
      font-weight: 900;
      color: white;
      background: #d97706;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(217, 119, 6, 0.22);
    }
    button:disabled { background: #fcd34d; cursor: not-allowed; box-shadow: none; }
    .page-status { text-align: center; color: #92400e; font-weight: 900; min-width: 160px; }
    @media (max-width: 720px) {
      body { padding: 10px 8px; }
      .book-stage { min-height: 80vh; border-radius: 24px; }
      .book-page { padding: 10px; }
      .paper { min-height: calc(80vh - 20px); border-radius: 20px; }
      .story-paper { grid-template-rows: minmax(0, 74%) minmax(120px, 26%); }
      .story-area { padding: 12px 12px 16px; }
      .story-text { font-size: clamp(0.9rem, 4.2vw, 1.18rem); line-height: 1.36; }
      .controls { grid-template-columns: 1fr; border-radius: 24px; }
      .page-status { order: -1; }
    }
  </style>
</head>
<body>
  <main class="reader-shell">
    <section class="book-stage" aria-label="翻頁式繪本閱讀器">
      <article class="book-page cover-page" data-page="cover">
        <div class="paper cover-paper">
          <h1>${safeTitle}</h1>
          <p>${safeTheme}</p>
          <p>${escapeHtml(story.language)}</p>
        </div>
      </article>
      ${htmlPages}
    </section>

    <nav class="controls" aria-label="翻頁控制">
      <button type="button" id="prevPage">上一頁</button>
      <div class="page-status"><span id="currentPage">1</span> / ${totalSlides}</div>
      <button type="button" id="nextPage">下一頁</button>
    </nav>
  </main>

  <script>
    const pages = Array.from(document.querySelectorAll('.book-page'));
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const currentPageLabel = document.getElementById('currentPage');
    let currentIndex = 0;

    function pauseAllAudio() {
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
      });
    }

    function fitStoryText(page) {
      const text = page.querySelector('.story-text');
      if (!text) return;

      text.classList.remove('scrollable');
      text.style.fontSize = '';

      const computed = window.getComputedStyle(text);
      let fontSize = Number.parseFloat(computed.fontSize) || 18;
      const minimumFontSize = 11;
      let guard = 0;

      while ((text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1) && fontSize > minimumFontSize && guard < 40) {
        fontSize -= 1;
        text.style.fontSize = fontSize + 'px';
        guard += 1;
      }

      if (text.scrollHeight > text.clientHeight + 1) {
        text.classList.add('scrollable');
      }
    }

    function playPageAudio(page, resetToStart = true) {
      const audio = page.querySelector('audio');
      if (!audio) return;

      if (resetToStart) {
        try { audio.currentTime = 0; } catch (error) {}
      }

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // 瀏覽器若阻擋自動播放，仍保留播放器讓使用者手動播放與拖拉。
        });
      }
    }

    function showPage(nextIndex, direction = 'forward', shouldTryAudio = true) {
      if (!pages.length) return;
      currentIndex = Math.max(0, Math.min(nextIndex, pages.length - 1));
      pauseAllAudio();
      pages.forEach((page, index) => {
        page.classList.toggle('active', index === currentIndex);
        page.classList.toggle('turning-back', direction === 'back');
      });
      currentPageLabel.textContent = String(currentIndex + 1);
      prevButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === pages.length - 1;

      const activePage = pages[currentIndex];
      window.requestAnimationFrame(() => {
        fitStoryText(activePage);
        if (shouldTryAudio) playPageAudio(activePage);
      });
    }

    prevButton.addEventListener('click', () => showPage(currentIndex - 1, 'back', true));
    nextButton.addEventListener('click', () => showPage(currentIndex + 1, 'forward', true));
    document.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') showPage(currentIndex - 1, 'back', true);
      if (event.key === 'ArrowRight') showPage(currentIndex + 1, 'forward', true);
    });
    window.addEventListener('resize', () => fitStoryText(pages[currentIndex]));
    showPage(0, 'forward', false);
  </script>
</body>
</html>`;

      const storyboardData = {
        title: story.title,
        theme: story.theme,
        language: story.language,
        exportedAt: new Date().toISOString(),
        pages: manifestPages,
      };

      zip.file('index.html', htmlContent);
      storyboardFolder?.file('storyboard.json', JSON.stringify(storyboardData, null, 2));
      storyboardFolder?.file(
        'storyboard.md',
        `# ${story.title || '我的自訂繪本'}\n\n主題：${story.theme || '自由創作'}\n\n語言：${story.language}\n\n` +
          story.pages
            .map(
              page =>
                `## 第 ${page.pageNumber} 頁\n\n${page.storyText || '（空白）'}\n`,
            )
            .join('\n'),
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${story.title || '繪本'}-flipbook.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Export failed:', exportError);
      alert('打包失敗，請重試！');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[380px_1fr] gap-8">
        <aside className="bg-white p-6 rounded-[2rem] shadow-sm border border-amber-100 h-fit lg:sticky lg:top-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300" />

          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
              <Baby size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-amber-900 tracking-tight">繪本 Storyboard 工具</h1>
              <p className="text-sm font-medium text-amber-600/80">手動建立、上傳素材與打包匯出</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">繪本標題</label>
              <input
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="例如：小兔子的森林旅行"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">故事主題</label>
              <input
                type="text"
                value={theme}
                onChange={event => setTheme(event.target.value)}
                placeholder="例如：勇敢交朋友、睡前冒險"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">頁數 (1-{MAX_PAGE_COUNT})</label>
                <input
                  type="number"
                  min="1"
                  max={MAX_PAGE_COUNT}
                  value={pages}
                  onChange={event => setPages(parseInt(event.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">語言</label>
                <select
                  value={language}
                  onChange={event => setLanguage(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all appearance-none"
                >
                  <option value="粵語">粵語</option>
                  <option value="繁體中文">繁體中文</option>
                  <option value="简体中文">简体中文</option>
                  <option value="English">English</option>
                  <option value="日本語">日本語</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateBlank}
            className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl py-3.5 font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            建立空白 Storyboard
          </button>

          <div className="text-xs leading-relaxed text-slate-500 bg-amber-50 border border-amber-100 rounded-2xl p-4">
            此版本為純手動工作流，不需要任何外部金鑰或自動生成服務。你可以手動輸入故事文本，並上傳插圖及配音後匯出 ZIP。
          </div>
        </aside>

        <main className="flex flex-col gap-6">
          {!story && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 lg:h-[600px] border-2 border-dashed border-amber-200/60 rounded-[2rem] bg-amber-50/30">
              <div className="bg-amber-100 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <BookOpen size={48} className="text-amber-500 opacity-80" />
              </div>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">建立空白故事板</h2>
              <p className="text-amber-700/70 max-w-md">
                在左側設定標題、主題、語言和頁數，然後建立空白 storyboard。建立後可逐頁填寫文本、備註及上傳素材。
              </p>
            </div>
          )}

          {story && (
            <>
              <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-amber-700 uppercase tracking-wider">標題</label>
                      <input
                        value={story.title}
                        onChange={event => updateStoryMeta('title', event.target.value)}
                        className="w-full text-2xl md:text-3xl font-extrabold tracking-tight text-amber-950 bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-amber-700 uppercase tracking-wider">主題</label>
                      <input
                        value={story.theme}
                        onChange={event => updateStoryMeta('theme', event.target.value)}
                        className="w-full font-medium text-amber-800 bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <button
                      onClick={exportToZip}
                      disabled={isExporting}
                      className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                      {isExporting ? '打包壓縮中...' : '打包下載 ZIP'}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <select
                      value={story.language}
                      onChange={event => updateStoryMeta('language', event.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="粵語">粵語</option>
                      <option value="繁體中文">繁體中文</option>
                      <option value="简体中文">简体中文</option>
                      <option value="English">English</option>
                      <option value="日本語">日本語</option>
                    </select>
                    <button
                      onClick={addPage}
                      className="bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl px-4 py-2 font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      新增頁面
                    </button>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                {story.pages.map((page, index) => (
                  <section key={page.pageNumber} className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xl shrink-0">
                          {page.pageNumber}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">第 {page.pageNumber} 頁</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer bg-emerald-50 border border-emerald-100">
                          <Upload size={14} />
                          上傳配音
                          <input type="file" accept="audio/*" className="hidden" onChange={event => handleAudioUpload(index, event)} />
                        </label>
                        <label className="text-xs font-bold text-purple-600 hover:bg-purple-100 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer bg-purple-50 border border-purple-100">
                          <Upload size={14} />
                          上傳插圖
                          <input type="file" accept="image/*" className="hidden" onChange={event => handleImageUpload(index, event)} />
                        </label>
                        <button
                          onClick={() => removePage(index)}
                          disabled={story.pages.length <= 1}
                          className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-red-100 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                          刪除
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-[1fr_1fr] gap-8">
                      <div className="space-y-6">
                        <section>
                          <h4 className="flex items-center justify-between gap-2 text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">
                            <span className="flex items-center gap-2"><AudioLines size={18} /> 故事文本 / 配音稿</span>
                            <Pencil size={14} className="opacity-50" />
                          </h4>
                          <textarea
                            value={page.storyText}
                            onChange={event => updatePage(index, { storyText: event.target.value })}
                            placeholder="在這裡填寫本頁故事文本或配音稿。"
                            className="w-full bg-emerald-50/50 outline-none border border-emerald-100 focus:ring-2 focus:ring-emerald-400 text-emerald-900 p-5 rounded-2xl text-lg leading-relaxed font-medium resize-y min-h-[180px] transition-all"
                          />
                          {page.audioUrl && (
                            <div className="mt-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100 space-y-2">
                              <audio controls src={page.audioUrl} className="w-full h-10 outline-none" />
                              <button onClick={() => clearAudio(index)} className="text-xs font-bold text-emerald-700 hover:underline">
                                移除配音檔
                              </button>
                            </div>
                          )}
                        </section>
                      </div>

                      <div className="space-y-6">
                        <section>
                          <h4 className="flex items-center justify-between gap-2 text-sm font-bold text-purple-600 uppercase tracking-wider mb-3">
                            <span className="flex items-center gap-2"><Palette size={18} /> 插圖素材</span>
                          </h4>
                          {page.imageUrl ? (
                            <div className="mb-4 space-y-2">
                              <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="w-full h-auto aspect-video object-cover rounded-2xl shadow-sm border border-slate-100" />
                              <button onClick={() => clearImage(index)} className="text-xs font-bold text-purple-700 hover:underline">
                                移除插圖
                              </button>
                            </div>
                          ) : (
                            <div className="min-h-[220px] rounded-2xl border-2 border-dashed border-purple-100 bg-purple-50/40 flex items-center justify-center text-sm font-bold text-purple-300">
                              尚未上傳插圖
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
