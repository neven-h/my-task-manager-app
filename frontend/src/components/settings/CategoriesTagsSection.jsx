import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Folder, Trash2 } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SYS = {
    border: '#e5e7eb',
    accent: '#FF0000',
    light: '#666',
    text: '#111',
};

const section = {
    marginTop: 24, padding: 20, background: '#fff',
    border: `2px solid ${SYS.border}`,
};

const header = {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
};

const title = {
    fontWeight: 700, fontSize: '1rem', color: SYS.text, margin: 0,
};

const row = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 4px', borderBottom: `1px solid ${SYS.border}`,
    fontSize: '0.9rem',
};

const delBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: SYS.accent, padding: '4px 8px', display: 'flex', alignItems: 'center',
};

const swatch = (color) => ({
    width: 14, height: 14, background: color || '#0d6efd',
    border: '1px solid #000', flexShrink: 0,
});

const CategoriesTagsSection = () => {
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [cRes, tRes] = await Promise.all([
                fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE}/tags`, { headers: getAuthHeaders() }),
            ]);
            const cData = await cRes.json().catch(() => []);
            const tData = await tRes.json().catch(() => []);
            if (!cRes.ok) throw new Error(cData?.error || 'Failed to load categories');
            if (!tRes.ok) throw new Error(tData?.error || 'Failed to load tags');
            setCategories(Array.isArray(cData) ? cData : []);
            setTags(Array.isArray(tData) ? tData : []);
        } catch (e) {
            setError(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const deleteCategory = async (cat) => {
        if (!window.confirm(`Delete category "${cat.label}"? This cannot be undone.`)) return;
        setBusyId(`c-${cat.id}`);
        setError('');
        const prev = categories;
        setCategories(prev.filter(c => c.id !== cat.id));
        try {
            const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(cat.id)}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Delete failed');
            }
        } catch (e) {
            setCategories(prev);
            setError(e.message || 'Delete failed');
        } finally {
            setBusyId(null);
        }
    };

    const deleteTag = async (tag) => {
        if (!window.confirm(`Delete tag "${tag.name}"? This cannot be undone.`)) return;
        setBusyId(`t-${tag.id}`);
        setError('');
        const prev = tags;
        setTags(prev.filter(t => t.id !== tag.id));
        try {
            const res = await fetch(`${API_BASE}/tags/${tag.id}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Delete failed');
            }
        } catch (e) {
            setTags(prev);
            setError(e.message || 'Delete failed');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: SYS.text }}>
                    Categories & Tags
                </h2>
            </div>

            {error && (
                <div style={{ marginBottom: 12, padding: '10px 14px', border: `2px solid ${SYS.accent}`, background: '#fff0f0', color: SYS.accent, fontSize: '0.85rem', fontWeight: 600 }}>
                    {error}
                </div>
            )}

            <div style={section}>
                <div style={header}>
                    <Folder size={18} color="#667eea" />
                    <h3 style={title}>Categories ({categories.length})</h3>
                </div>
                {loading ? (
                    <div style={{ color: SYS.light, fontSize: '0.85rem' }}>Loading…</div>
                ) : categories.length === 0 ? (
                    <div style={{ color: SYS.light, fontSize: '0.85rem' }}>No categories yet.</div>
                ) : (
                    categories.map(c => (
                        <div key={c.id} style={row}>
                            <div style={swatch(c.color)} />
                            <span style={{ fontSize: '0.95rem' }}>{c.icon}</span>
                            <span style={{ flex: 1, color: SYS.text }}>{c.label}</span>
                            <span style={{ color: SYS.light, fontSize: '0.75rem' }}>{c.id}</span>
                            <button type="button" onClick={() => deleteCategory(c)}
                                disabled={busyId === `c-${c.id}`} style={delBtn} title="Delete">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div style={section}>
                <div style={header}>
                    <TagIcon size={18} color="#667eea" />
                    <h3 style={title}>Tags ({tags.length})</h3>
                </div>
                {loading ? (
                    <div style={{ color: SYS.light, fontSize: '0.85rem' }}>Loading…</div>
                ) : tags.length === 0 ? (
                    <div style={{ color: SYS.light, fontSize: '0.85rem' }}>No tags yet.</div>
                ) : (
                    tags.map(t => (
                        <div key={t.id} style={row}>
                            <div style={swatch(t.color)} />
                            <span style={{ flex: 1, color: SYS.text }}>{t.name}</span>
                            <button type="button" onClick={() => deleteTag(t)}
                                disabled={busyId === `t-${t.id}`} style={delBtn} title="Delete">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CategoriesTagsSection;
