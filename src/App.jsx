import { useState, useRef, useEffect, useMemo } from 'react';
import { Settings, Save, RotateCcw, PenTool, Layout, FileText, Zap, BarChart3, Printer } from 'lucide-react';
import { answersData } from './data';
import './index.css';

const compressText = (text) => text.replace(/#/g, '').split('\n').map(l => l.trim()).filter(line => line.length > 0).join('\n');

const App = () => {
  const [referenceText, setReferenceText] = useState(() => {
    const cached = localStorage.getItem('pe-exam-ref-text');
    return cached ? compressText(cached) : compressText(answersData[0].content);
  });
  const [inputText, setInputText] = useState(() => {
    const cached = localStorage.getItem('pe-exam-input-text');
    return cached || '';
  });
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [editTempText, setEditTempText] = useState(referenceText);
  const [selectedDocsId, setSelectedDocsId] = useState(() => {
      const match = answersData.find(d => compressText(d.content) === localStorage.getItem('pe-exam-ref-text'));
      return match ? match.id : 'custom';
  });

  const rightPaneRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('pe-exam-ref-text', referenceText);
  }, [referenceText]);

  useEffect(() => {
    localStorage.setItem('pe-exam-input-text', inputText);
  }, [inputText]);

  const handleEditorSave = () => {
    const newRefText = compressText(editTempText);
    setReferenceText(newRefText);
    setEditTempText(newRefText);
    setIsEditingRef(false);
    setInputText(''); 
    setSelectedDocsId('custom');
  };

  const handleReset = () => {
    if (confirm('작성 중인 내용을 초기화하시겠습니까?')) {
      setInputText('');
    }
  };

  const handleSelectDoc = (e) => {
    const val = e.target.value;
    setSelectedDocsId(val);
    if (val !== 'custom') {
      const selected = answersData.find(d => d.id === Number(val));
      if (selected) {
        if (inputText.length > 0) {
            if (!confirm('문서를 변경하면 현재 작성 중인 내용이 초기화됩니다. 변경하시겠습니까?')) {
                setSelectedDocsId(selectedDocsId);
                return;
            }
        }
        const compressed = compressText(selected.content);
        setReferenceText(compressed);
        setEditTempText(compressed);
        setInputText('');
        setIsEditingRef(false);
      }
    }
  };

  const { progress, matchCount, accuracy } = useMemo(() => {
    if (!referenceText) return { progress: 0, matchCount: 0, accuracy: 0 };
    const maxLen = referenceText.length;
    if (maxLen === 0) return { progress: 0, matchCount: 0, accuracy: 0 };
    
    let mc = 0;
    for (let i = 0; i < Math.min(inputText.length, maxLen); i++) {
        if (inputText[i] === referenceText[i]) mc++;
    }
    return {
      progress: (mc / maxLen) * 100,
      matchCount: mc,
      accuracy: inputText.length > 0 ? (mc / Math.min(inputText.length, maxLen)) * 100 : 0
    };
  }, [inputText, referenceText]);

  const renderReferenceText = () => {
    return referenceText;
  };

  const insertAtCursor = (char) => {
    const el = rightPaneRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = inputText.substring(0, start) + char + inputText.substring(end);
    setInputText(newText);
    setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + char.length;
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === '1') {
      e.preventDefault();
      insertAtCursor('·');
    } else if (e.ctrlKey && e.key === '2') {
      e.preventDefault();
      insertAtCursor('•');
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
            <FileText size={15} color="var(--text-muted)" />
            <select 
              value={selectedDocsId} 
              onChange={handleSelectDoc}
            >
                <option value="custom">직접 입력 / 수정됨</option>
                {answersData.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
            </select>
          </div>

          {isEditingRef ? (
            <button className="primary" onClick={handleEditorSave}>
              <Save size={15} /> 저장 및 적용
            </button>
          ) : (
            <>
              <button onClick={() => {
                setEditTempText(referenceText);
                setIsEditingRef(true);
              }}>
                <Settings size={15} /> 답안 편집
              </button>
              <button onClick={handleReset}>
                <RotateCcw size={15} /> 초기화
              </button>
              <button onClick={() => window.print()} className="primary">
                <Printer size={15} /> PDF 저장 / 인쇄
              </button>
            </>
          )}
        </div>
      </header>

      <main className="workspace">
        <div className="panel left-panel">
          <div className="panel-header">
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <Layout size={15} color="var(--accent)" />
              기준 답안
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              {selectedDocsId !== 'custom' && (
                  <span className="badge">기본 문서</span>
              )}
              {inputText.length > 0 && (
                <div className="stats-bar">
                  <div className="stat-item">
                    <Zap size={12} color="var(--accent)" />
                    <span className="stat-value">{inputText.length}</span>자
                  </div>
                  <div className="stat-item">
                    <BarChart3 size={12} color="var(--success)" />
                    정확도 <span className="stat-value">{Math.floor(accuracy)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="panel-content">
            {isEditingRef ? (
               <textarea 
                 value={editTempText}
                 onChange={(e) => setEditTempText(e.target.value)}
                 className="reference-text editable"
                 placeholder="암기할 텍스트를 이곳에 붙여넣고 저장하세요."
                 autoFocus
               />
            ) : (
               <div className="reference-text">
                 {renderReferenceText()}
               </div>
            )}
            
            {!isEditingRef && (
              <div className="progress-container">
                <div className="progress-bar" style={{width: `${progress}%`}} />
              </div>
            )}
          </div>
        </div>

        <div className="panel right-panel">
          <div className="panel-header">
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <PenTool size={15} color="var(--success)" />
              타이핑 연습
            </div>
            <div className="progress-display">
              진행률 <span className="percent">{Math.floor(progress)}%</span>
            </div>
          </div>
          <div className="panel-content">
             <div className="textarea-wrapper">
               <textarea 
                 ref={rightPaneRef}
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="왼쪽의 내용을 보며 여기에 타이핑을 시작하세요... [단축키] Ctrl+1: · (가운데 점), Ctrl+2: • (목록 점)"
                 disabled={isEditingRef}
                 className="print-hide"
               />
               <div className="print-show print-text-overlay">
                 {inputText}
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
