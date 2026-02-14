import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bold, Italic, Strikethrough } from 'lucide-react';

const NOTEBOOK_STORAGE_KEY = 'taskTracker_mobile_notebook';

const THEME = {
    bg: '#fff', primary: '#0000FF', secondary: '#FFD500', accent: '#FF0000',
    text: '#000', muted: '#666', border: '#000'
};
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileNotebookView = ({ onBack }) => {
    const editorRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const loadedRef = useRef(false);

    const saveContent = (html) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(NOTEBOOK_STORAGE_KEY, html || '');
            } catch (e) {
                console.error('Notebook save error:', e);
            }
        }, 500);
    };

    const handleInput = () => {
        if (!editorRef.current) return;
        saveContent(editorRef.current.innerHTML);
    };

    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const formatBlock = (tag) => {
        document.execCommand('formatBlock', false, tag);
        editorRef.current?.focus();
        handleInput();
    };

    const setFontSize = (level) => {
        // Browser fontSize 1-7 (small to large). Use 2=small, 4=normal, 6=large
        const map = { small: '2', normal: '4', large: '6' };
        document.execCommand('fontSize', false, map[level] || '4');
        editorRef.current?.focus();
        handleInput();
    };

    return (
        <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: FONT_STACK }}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '3px solid #000',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0 }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                        Notebook
                    </h1>
                </div>
            </div>

            {/* Editor - main content first */}
            <div
                ref={(el) => {
                    editorRef.current = el;
                    if (el && !loadedRef.current) {
                        loadedRef.current = true;
                        try {
                            const saved = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
                            if (saved) el.innerHTML = saved;
                        } catch (e) {
                            console.error('Notebook load error:', e);
                        }
                    }
                }}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                style={{
                    minHeight: '50vh',
                    padding: '20px 16px 100px 16px',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    outline: 'none',
                    fontFamily: FONT_STACK
                }}
                data-placeholder="Start typing..."
            />

            {/* Toolbar - fixed at bottom, one compact row */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 12px',
                borderTop: '2px solid #000',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
                background: '#fff',
                zIndex: 50
            }}>
                <button type="button" onClick={() => execCmd('bold')} title="Bold"
                    style={{ padding: '8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bold size={20} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => execCmd('italic')} title="Italic"
                    style={{ padding: '8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Italic size={20} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => execCmd('strikeThrough')} title="Strikethrough"
                    style={{ padding: '8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Strikethrough size={20} strokeWidth={2.5} />
                </button>
                <select onChange={(e) => setFontSize(e.target.value)} defaultValue="normal" title="Text size"
                    style={{ padding: '6px 8px', border: '2px solid #000', background: '#fff', fontFamily: FONT_STACK, fontSize: '0.8rem', marginLeft: '4px' }}>
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                </select>
                <span style={{ width: '1px', height: '20px', background: '#ccc', marginLeft: '6px' }} />
                <button type="button" onClick={() => formatBlock('h1')} title="Title"
                    style={{ padding: '6px 8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', fontFamily: FONT_STACK, fontWeight: 700, fontSize: '0.75rem' }}>
                    Title
                </button>
                <button type="button" onClick={() => formatBlock('h2')} title="Subheadline"
                    style={{ padding: '6px 8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', fontFamily: FONT_STACK, fontWeight: 700, fontSize: '0.7rem' }}>
                    Sub
                </button>
                <button type="button" onClick={() => formatBlock('h3')} title="Headline"
                    style={{ padding: '6px 8px', border: '2px solid #000', background: '#fff', cursor: 'pointer', fontFamily: FONT_STACK, fontWeight: 700, fontSize: '0.65rem' }}>
                    H3
                </button>
            </div>

            <style>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #999;
                }
                [contenteditable] h1 { font-size: 1.75rem; font-weight: 900; margin: 0.5em 0; }
                [contenteditable] h2 { font-size: 1.35rem; font-weight: 800; margin: 0.5em 0; }
                [contenteditable] h3 { font-size: 1.1rem; font-weight: 700; margin: 0.4em 0; }
            `}</style>
        </div>
    );
};

export default MobileNotebookView;
