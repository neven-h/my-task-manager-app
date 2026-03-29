import React, { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import storage, { STORAGE_KEYS } from '../../utils/storage';
import { FONT_STACK } from '../theme';
import NotebookToolbar, { TOOLBAR_HEIGHT } from './NotebookToolbar';

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

    return (
        <div style={{ minHeight: '100dvh', background: '#fafafa', fontFamily: FONT_STACK, display: 'flex', flexDirection: 'column' }}>
            <div style={{
                background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)',
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12,
                paddingLeft: 4, paddingRight: 16, position: 'sticky', top: 0, zIndex: 100,
                display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center',
            }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeft size={22} />
                </button>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Notebook</h1>
                <div />
            </div>

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
                contentEditable suppressContentEditableWarning
                onInput={handleInput} onKeyUp={syncFormats} onMouseUp={syncFormats}
                data-placeholder="Start writing..."
                style={{ flex: 1, padding: `20px 20px ${TOOLBAR_HEIGHT + 24}px`, fontSize: '1rem', lineHeight: 1.75, outline: 'none', fontFamily: FONT_STACK, minHeight: '60vh', color: '#111' }}
            />

            <NotebookToolbar activeFormats={activeFormats} showBlockMenu={showBlockMenu} setShowBlockMenu={setShowBlockMenu} execCmd={execCmd} applyBlock={applyBlock} />

            <style>{`
                [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #bbb; pointer-events: none; }
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
