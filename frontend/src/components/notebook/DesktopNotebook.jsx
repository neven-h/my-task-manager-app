import React, { useState, useRef } from 'react';
import { Bold, Italic, Strikethrough, Type, ChevronDown } from 'lucide-react';
import storage, { STORAGE_KEYS } from '../../utils/storage';

const FONT = "'Inter','Helvetica Neue',Calibri,sans-serif";

const Btn = ({ onClick, active, title, children }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick(); }} title={title}
        style={{ width: 34, height: 34, border: 'none', borderRadius: 6, fontFamily: FONT,
            background: active ? '#000' : 'transparent', color: active ? '#fff' : '#000',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
    </button>
);
const Sep = () => <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.15)', margin: '0 4px' }} />;

const BLOCK_OPTIONS = [{ label: 'Body', tag: 'p' }, { label: 'Heading 1', tag: 'h1' }, { label: 'Heading 2', tag: 'h2' }, { label: 'Heading 3', tag: 'h3' }];

const DesktopNotebook = ({ onBackToTasks }) => {
    const editorRef = useRef(null);
    const saveTimer = useRef(null);
    const loaded = useRef(false);
    const [fmt, setFmt] = useState({ bold: false, italic: false, strike: false });
    const [blockMenu, setBlockMenu] = useState(false);

    const save = html => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => { try { storage.set(STORAGE_KEYS.MOBILE_NOTEBOOK, html || ''); } catch (e) {} }, 500);
    };

    const sync = () => setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        strike: document.queryCommandState('strikeThrough'),
    });

    const onInput = () => { if (editorRef.current) { save(editorRef.current.innerHTML); sync(); } };
    const exec = cmd => { document.execCommand(cmd, false, null); editorRef.current?.focus(); onInput(); };
    const applyBlock = tag => { document.execCommand('formatBlock', false, tag); editorRef.current?.focus(); setBlockMenu(false); onInput(); };

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>
            <div style={{ height: 12, background: 'linear-gradient(90deg,#FF0000 0%,#FF0000 33.33%,#FFD500 33.33%,#FFD500 66.66%,#0000FF 66.66%,#0000FF 100%)' }} />

            {/* Header */}
            <div style={{ padding: '20px 48px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
                <button type="button" className="btn btn-white" onClick={onBackToTasks} style={{ padding: '8px 16px' }}>← Back</button>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', margin: 0 }}>Notebook</h2>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '12px 48px', borderBottom: '2px solid #eee', position: 'relative' }}>
                <Btn onClick={() => setBlockMenu(v => !v)} title="Text style">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Type size={15} /><ChevronDown size={12} /></span>
                </Btn>
                <Sep />
                <Btn onClick={() => exec('bold')} active={fmt.bold} title="Bold"><Bold size={16} strokeWidth={2.5} /></Btn>
                <Btn onClick={() => exec('italic')} active={fmt.italic} title="Italic"><Italic size={16} strokeWidth={2.5} /></Btn>
                <Btn onClick={() => exec('strikeThrough')} active={fmt.strike} title="Strikethrough"><Strikethrough size={16} strokeWidth={2.5} /></Btn>
                <Sep />
                <Btn onClick={() => exec('insertUnorderedList')} title="Bullet list">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
                        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                </Btn>
                <Btn onClick={() => exec('insertOrderedList')} title="Numbered list">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
                        <text x="2" y="8" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">1</text>
                        <text x="2" y="14" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">2</text>
                        <text x="2" y="20" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">3</text>
                    </svg>
                </Btn>

                {blockMenu && (
                    <>
                        <div onClick={() => setBlockMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                        <div style={{ position: 'absolute', top: '100%', left: 48, background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0px #000', zIndex: 50, minWidth: 150 }}>
                            {BLOCK_OPTIONS.map(({ label, tag }) => (
                                <button key={tag} type="button" onMouseDown={e => { e.preventDefault(); applyBlock(tag); }}
                                    style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                                        textAlign: 'left', fontFamily: FONT, cursor: 'pointer', borderBottom: tag !== 'h3' ? '1px solid #eee' : 'none',
                                        fontWeight: tag === 'p' ? 400 : 700, fontSize: tag === 'p' ? '0.95rem' : tag === 'h1' ? '1.1rem' : '1rem' }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Editor */}
            <div style={{ padding: '0 48px 48px', maxWidth: 860, margin: '0 auto' }}>
                <div
                    ref={el => {
                        editorRef.current = el;
                        if (el && !loaded.current) {
                            loaded.current = true;
                            try { const s = storage.get(STORAGE_KEYS.MOBILE_NOTEBOOK); if (s) el.innerHTML = s; } catch (e) {}
                        }
                    }}
                    contentEditable suppressContentEditableWarning
                    onInput={onInput} onKeyUp={sync} onMouseUp={sync}
                    data-placeholder="Start writing…"
                    style={{ marginTop: 24, padding: 28, border: '3px solid #000', boxShadow: '4px 4px 0px #000',
                        minHeight: '62vh', fontSize: '1rem', lineHeight: 1.75, outline: 'none', fontFamily: FONT }}
                />
            </div>

            <style>{`
                [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #bbb; pointer-events: none; }
                [contenteditable] h1 { font-size: 1.6rem; font-weight: 800; margin: 0.6em 0 0.2em; }
                [contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin: 0.5em 0 0.2em; }
                [contenteditable] h3 { font-size: 1.05rem; font-weight: 700; margin: 0.5em 0 0.2em; }
                [contenteditable] p  { margin: 0.2em 0; }
                [contenteditable] ul, [contenteditable] ol { padding-left: 1.4em; margin: 0.3em 0; }
            `}</style>
        </div>
    );
};

export default DesktopNotebook;
