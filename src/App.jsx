import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw, Layout, Printer, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import './index.css';

const TOTAL_PAGES = 14;
const EMPTY_PAGES = Array(TOTAL_PAGES).fill('');
const DEFAULT_PLACEHOLDER = '📂 위의 [파일 업로드] 버튼을 눌러 연습하실 MD 파일을 올려주세요.';
const SHORTCUTS = { '1': '·', '2': '•' };

/* Grid constants derived from answer-sheet image pixel analysis (1956×2526)
   All expressed as fractions of the wrapper WIDTH (aspect-ratio locked). */
const G = {
  padTop:    0.08767,   // first row top
  padBottom: 0.10001,
  padLeftOdd:  0.301,   // odd page left margin (번호 column)
  padRightOdd: 0.088,
  padLeftEven:  0.176,  // even page (mirrored)
  padRightEven: 0.213,
  lineHeight: 0.04951,  // row spacing
  fontSize:   0.021,
};

const compressText = (text) => text.replace(/#/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');

const getStoredDocs = () => {
  const raw = localStorage.getItem('pe-exam-uploaded-docs');
  return raw ? JSON.parse(raw) : [];
};

const initState = () => {
  const docs = getStoredDocs();
  const cachedRef = localStorage.getItem('pe-exam-ref-text');
  const storedDocId = localStorage.getItem('pe-exam-selected-doc-id');

  let referenceText = DEFAULT_PLACEHOLDER;
  if (docs.length === 0 && cachedRef && cachedRef !== DEFAULT_PLACEHOLDER) {
    localStorage.removeItem('pe-exam-ref-text');
    localStorage.removeItem('pe-exam-input-text');
  } else if (cachedRef) {
    referenceText = compressText(cachedRef);
  }

  let pages = [...EMPTY_PAGES];
  if (docs.length > 0) {
    const cached = localStorage.getItem('pe-exam-pages-text');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === TOTAL_PAGES) pages = parsed;
      } catch {}
    }
  }

  let selectedDocsId = 'custom';
  if (storedDocId && docs.some(d => String(d.id) === storedDocId)) {
    selectedDocsId = storedDocId;
  } else if (docs.length > 0 && cachedRef) {
    const match = docs.find(d => compressText(d.content) === cachedRef);
    if (match) selectedDocsId = String(match.id);
  }

  return { referenceText, pages, docs, selectedDocsId };
};

const App = () => {
  const initial = useState(initState)[0];
  const [referenceText, setReferenceText] = useState(initial.referenceText);
  const [pages, setPages] = useState(initial.pages);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadedDocs, setUploadedDocs] = useState(initial.docs);
  const [selectedDocsId, setSelectedDocsId] = useState(initial.selectedDocsId);

  const rightPaneRef = useRef(null);
  const wrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  const pagesTimerRef = useRef(null);
  const [taStyles, setTaStyles] = useState({});

  useEffect(() => {
    localStorage.setItem('pe-exam-ref-text', referenceText);
  }, [referenceText]);

  useEffect(() => {
    clearTimeout(pagesTimerRef.current);
    pagesTimerRef.current = setTimeout(() => {
      localStorage.setItem('pe-exam-pages-text', JSON.stringify(pages));
    }, 500);
    return () => clearTimeout(pagesTimerRef.current);
  }, [pages]);

  useEffect(() => {
    localStorage.setItem('pe-exam-uploaded-docs', JSON.stringify(uploadedDocs));
  }, [uploadedDocs]);

  useEffect(() => {
    localStorage.setItem('pe-exam-selected-doc-id', selectedDocsId);
  }, [selectedDocsId]);

  /* Compute pixel styles from wrapper width via ResizeObserver.
     Uses a plain <div> overlay for text display (bypasses iOS textarea line-height bugs).
     The hidden textarea still handles keyboard input. */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.offsetWidth;
      const isEven = currentPage % 2 === 0;
      setTaStyles({
        paddingTop:    `${w * G.padTop}px`,
        paddingBottom: `${w * G.padBottom}px`,
        paddingLeft:   `${w * (isEven ? G.padLeftEven : G.padLeftOdd)}px`,
        paddingRight:  `${w * (isEven ? G.padRightEven : G.padRightOdd)}px`,
        lineHeight:    `${w * G.lineHeight}px`,
        fontSize:      `${w * G.fontSize}px`,
      });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentPage]);

  const resetPages = useCallback(() => {
    setPages([...EMPTY_PAGES]);
    setCurrentPage(1);
  }, []);

  const totalInputText = useMemo(() => pages.join(''), [pages]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (totalInputText.length > 0) {
      if (!confirm('새 파일을 업로드하면 현재 작성 중인 내용이 초기화됩니다. 진행하시겠습니까?')) {
        e.target.value = null;
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setReferenceText(compressText(text));
      resetPages();

      const newDocId = 'uploaded-' + Date.now();
      setUploadedDocs(prev => [...prev, { id: newDocId, title: file.name.replace('.md', ''), content: text }]);
      setSelectedDocsId(newDocId);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleReset = () => {
    if (confirm('작성 중인 내용을 초기화하시겠습니까?')) {
      resetPages();
    }
  };

  const handlePageChange = (index, value) => {
    setPages(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSelectDoc = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setSelectedDocsId(val);
      return;
    }
    const selected = uploadedDocs.find(d => String(d.id) === String(val));
    if (!selected) return;

    if (totalInputText.length > 0) {
      if (!confirm('문서를 변경하면 현재 작성 중인 내용이 초기화됩니다. 변경하시겠습니까?')) return;
    }
    setSelectedDocsId(val);
    setReferenceText(compressText(selected.content));
    resetPages();
  };

  const lastFilledPageIndex = useMemo(() => {
    return pages.findLastIndex(p => p.trim()) ?? 0;
  }, [pages]);

  const insertAtCursor = (char) => {
    const el = rightPaneRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const currentStr = pages[currentPage - 1];
    handlePageChange(currentPage - 1, currentStr.substring(0, start) + char + currentStr.substring(end));
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + char.length; }, 0);
  };

  const handleKeyDown = (e) => {
    const char = e.ctrlKey && SHORTCUTS[e.key];
    if (char) {
      e.preventDefault();
      insertAtCursor(char);
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-title">
          <h1>PE Memorizer <span>Pro</span></h1>
          <span>항만 및 해안기술사 · 1교시 답안 타이핑 연습</span>
        </div>
        <div className="header-actions">
          <div className="select-wrapper">
            <Layout size={15} color="var(--text-muted)" />
            <select value={selectedDocsId} onChange={handleSelectDoc}>
              <option value="custom">직접 입력 / 수정됨</option>
              {uploadedDocs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
          </div>

          <input type="file" accept=".md,.txt" style={{display: 'none'}} ref={fileInputRef} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> 파일 업로드
          </button>
          <button onClick={handleReset}>
            <RotateCcw size={15} /> 초기화
          </button>
          <button onClick={() => window.print()} className="primary">
            <Printer size={15} /> PDF 저장 / 인쇄
          </button>
        </div>
      </header>

      <main className="workspace">
        <div className="panel left-panel">
          <div className="panel-header">기준 답안</div>
          <div className="panel-content">
            <div className="reference-text">{referenceText}</div>
          </div>
        </div>

        <div className="panel right-panel">
          <div className="panel-header">
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              타이핑 연습
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="icon-btn print-hide"
                style={{marginLeft: '10px'}}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="print-hide" style={{fontSize:'13px', fontWeight:'600', minWidth:'45px', textAlign:'center', color:'var(--text-secondary)'}}>
                {currentPage} / {TOTAL_PAGES} 쪽
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1))}
                disabled={currentPage === TOTAL_PAGES}
                className="icon-btn print-hide"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="panel-content print-booklet">
            {pages.map((pText, i) => (
              <div
                key={i}
                ref={currentPage === i + 1 ? wrapperRef : null}
                className={`textarea-wrapper ${currentPage === i + 1 ? 'active-page' : ''} ${(i + 1) % 2 === 0 ? 'even-page' : 'odd-page'} ${i > lastFilledPageIndex ? 'print-exclude' : ''}`}
              >
                <img
                  src={`/answer_form_page_${i + 1}.png`}
                  alt=""
                  className="page-background-img"
                  loading={currentPage === i + 1 ? 'eager' : 'lazy'}
                />
                {currentPage === i + 1 && (
                  <>
                    {/* Hidden textarea — handles keyboard input, cursor, selection */}
                    <textarea
                      ref={rightPaneRef}
                      value={pages[i]}
                      onChange={(e) => handlePageChange(i, e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="print-hide typing-input"
                      style={taStyles}
                    />
                    {/* Visible div overlay — renders text with correct line-height (bypasses iOS textarea bugs) */}
                    <div
                      className="print-hide text-display"
                      style={taStyles}
                      onClick={() => rightPaneRef.current?.focus()}
                    >
                      {pages[i] || <span className="placeholder-text">왼쪽의 내용을 보며 여기에 타이핑을 시작하세요... [단축키] Ctrl+1: · (가운데 점), Ctrl+2: • (목록 점)</span>}
                    </div>
                  </>
                )}
                <div className="print-show print-text-overlay">{pText}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
