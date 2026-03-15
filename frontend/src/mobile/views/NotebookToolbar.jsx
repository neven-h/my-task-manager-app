import React from 'react';
import { Bold, Italic, Strikethrough, Type, ChevronDown } from 'lucide-react';

const TOOLBAR_HEIGHT = 52;

const ToolbarBtn = ({ onClick, active, title, children }) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title} style={{
        width: 44, height: 44, border: 'none', borderRadius: 10,
        background: active ? '#000' : 'transparent', color: active ? '#fff' : '#000',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
        {children}
    </button>
);

const Divider = () => (
    <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.12)', flexShrink: 0, margin: '0 2px' }} />
);

const BLOCK_OPTIONS = [
    { label: 'Body', tag: 'p' },
    { label: 'Heading 1', tag: 'h1' },
    { label: 'Heading 2', tag: 'h2' },
    { label: 'Heading 3', tag: 'h3' },
];

const NotebookToolbar = ({ activeFormats, showBlockMenu, setShowBlockMenu, execCmd, applyBlock }) => (
    <>
        {showBlockMenu && (
            <>
                <div onClick={() => setShowBlockMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{
                    position: 'fixed', bottom: TOOLBAR_HEIGHT + 8, left: 12,
                    background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 14,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', minWidth: 150,
                }}>
                    {BLOCK_OPTIONS.map(({ label, tag }) => (
                        <button key={tag} type="button"
                            onMouseDown={(e) => { e.preventDefault(); applyBlock(tag); }}
                            style={{
                                display: 'block', width: '100%', padding: '13px 18px',
                                background: 'none', border: 'none', textAlign: 'left',
                                fontFamily: 'inherit', cursor: 'pointer', color: '#111',
                                fontSize: tag === 'p' ? '0.95rem' : tag === 'h1' ? '1.2rem' : tag === 'h2' ? '1.05rem' : '0.9rem',
                                fontWeight: tag === 'p' ? 400 : 700,
                                borderBottom: tag !== 'h3' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </>
        )}
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: TOOLBAR_HEIGHT,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: '#fff', borderTop: '1px solid rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, gap: 2, zIndex: 48,
        }}>
            <ToolbarBtn onClick={() => setShowBlockMenu(v => !v)} title="Text style">
                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Type size={17} /><ChevronDown size={13} />
                </span>
            </ToolbarBtn>
            <Divider />
            <ToolbarBtn onClick={() => execCmd('bold')} active={activeFormats.bold} title="Bold"><Bold size={18} strokeWidth={2.5} /></ToolbarBtn>
            <ToolbarBtn onClick={() => execCmd('italic')} active={activeFormats.italic} title="Italic"><Italic size={18} strokeWidth={2.5} /></ToolbarBtn>
            <ToolbarBtn onClick={() => execCmd('strikeThrough')} active={activeFormats.strike} title="Strikethrough"><Strikethrough size={18} strokeWidth={2.5} /></ToolbarBtn>
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
    </>
);

export { TOOLBAR_HEIGHT };
export default NotebookToolbar;
