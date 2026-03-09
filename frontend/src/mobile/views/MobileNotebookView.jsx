import React, { useState, useRef } from 'react';
import { ArrowLeft, Bold, Italic, Strikethrough, Type, ChevronDown } from 'lucide-react';
import storage, { STORAGE_KEYS } from '../../utils/storage';
import { FONT_STACK, BAUHAUS } from '../theme';

const TOOLBAR_HEIGHT = 52;

const ToolbarBtn = ({ onClick, active, title, children }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        title={title}
        style={{
            width: 44,
            height: 44,
            border: 'none',
            borderRadius: 10,
            background: active ? '#000' : 'transparent',
            color: active ? '#fff' : '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        }}
    >
        {children}
    </button>
);

const Divider = () => (
    <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.12)', flexShrink: 0, margin: '0 2px' }} />
);

const MobileNotebookView = ({ onBack }) => {
    const editorRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const loadedRef = useRef(false);
    const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, strike: false });
    const [showBlockMenu, setShowBlockMenu] = useState(false);

    const saveContent = (html) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            try { storage.set(STORAGE_KEYS.MOBILE_NOTEBOOK, html || ''); }
            catch (e) { console.error('Notebook save error:', e); }
        }, 500);
    };

    const syncFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            strike: document.queryCommandState('strikeThrough'),
        });
    };

    const handleInput = () => {
        if (!editorRef.current) return;
        saveContent(editorRef.current.innerHTML);
        syncFormats();
    };

    const execCmd = (command) => {
        document.execCommand(command, false, null);
        editorRef.current?.focus();
        handleInput();
    };

    const applyBlock = (tag) => {
        document.execCommand('formatBlock', false, tag);
        editorRef.current?.focus();
        setShowBlockMenu(false);
        handleInput();
    };

    const blockOptions = [
        { label: 'Body', tag: 'p' },
        { label: 'Heading 1', tag: 'h1' },
        { label: 'Heading 2', tag: 'h2' },
        { label: 'Heading 3', tag: 'h3' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: FONT_STACK, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                paddingBottom: 12,
                paddingLeft: 4,
                paddingRight: 16,
                position: 'sticky',
                top: 0,
                zIndex: 100,
                display: 'grid',
                gridTemplateColumns: '44px 1fr 44px',
                alignItems: 'center',
            }}>
                <button
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>
                    Notebook
                </h1>
                <div />
            </div>

            {/* Editor */}
            <div
                ref={(el) => {
                    editorRef.current = el;
                    if (el && !loadedRef.current) {
                        loadedRef.current = true;
                        try {
                            const saved = storage.get(STORAGE_KEYS.MOBILE_NOTEBOOK);
                            if (saved) el.innerHTML = saved;
                        } catch (e) { console.error('Notebook load error:', e); }
                    }
                }}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyUp={syncFormats}
                onMouseUp={syncFormats}
                data-placeholder="Start writing..."
                style={{
                    flex: 1,
                    padding: `20px 20px ${TOOLBAR_HEIGHT + 24}px`,
                    fontSize: '1rem',
                    lineHeight: 1.75,
                    outline: 'none',
                    fontFamily: FONT_STACK,
                    minHeight: '60vh',
                    color: '#111',
                }}
            />

            {/* Block type dropdown */}
            {showBlockMenu && (
                <>
                    <div
                        onClick={() => setShowBlockMenu(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                    />
                    <div style={{
                        position: 'fixed',
                        bottom: TOOLBAR_HEIGHT + 8,
                        left: 12,
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 14,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        zIndex: 50,
                        overflow: 'hidden',
                        minWidth: 150,
                    }}>
                        {blockOptions.map(({ label, tag }) => (
                            <button
                                key={tag}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyBlock(tag); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '13px 18px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontFamily: FONT_STACK,
                                    fontSize: tag === 'p' ? '0.95rem' : tag === 'h1' ? '1.2rem' : tag === 'h2' ? '1.05rem' : '0.9rem',
                                    fontWeight: tag === 'p' ? 400 : 700,
                                    cursor: 'pointer',
                                    borderBottom: tag !== 'h3' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                    color: '#111',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Toolbar */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: TOOLBAR_HEIGHT,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                background: '#fff',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                paddingRight: 8,
                gap: 2,
                zIndex: 48,
            }}>
                <ToolbarBtn onClick={() => setShowBlockMenu(v => !v)} title="Text style">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Type size={17} />
                        <ChevronDown size={13} />
                    </span>
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn onClick={() => execCmd('bold')} active={activeFormats.bold} title="Bold">
                    <Bold size={18} strokeWidth={2.5} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('italic')} active={activeFormats.italic} title="Italic">
                    <Italic size={18} strokeWidth={2.5} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('strikeThrough')} active={activeFormats.strike} title="Strikethrough">
                    <Strikethrough size={18} strokeWidth={2.5} />
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} title="Bullet list">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
                        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('insertOrderedList')} title="Numbered list">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
                        <text x="2" y="8" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">1</text>
                        <text x="2" y="14" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">2</text>
                        <text x="2" y="20" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="sans-serif">3</text>
                    </svg>
                </ToolbarBtn>
            </div>

            <style>{`
                [contenteditable][data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #bbb;
                    pointer-events: none;
                }
                [contenteditable] h1 { font-size: 1.6rem; font-weight: 800; margin: 0.6em 0 0.2em; line-height: 1.25; }
                [contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.3; }
                [contenteditable] h3 { font-size: 1.05rem; font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.3; }
                [contenteditable] p  { margin: 0.2em 0; }
                [contenteditable] ul, [contenteditable] ol { padding-left: 1.4em; margin: 0.3em 0; }
                [contenteditable] li { margin: 0.15em 0; }
            `}</style>
        </div>
    );
};

export default MobileNotebookView;
