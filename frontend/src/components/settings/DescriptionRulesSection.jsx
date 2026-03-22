import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Check, X, Edit2 } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const DescriptionRulesSection = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ needles: '', replacement: '', sort_order: 0 });
    const [newForm, setNewForm] = useState({ needles: '', replacement: '', sort_order: 0 });
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/description-rules`, { headers: getAuthHeaders() });
            const data = await res.json();
            setRules(Array.isArray(data) ? data : []);
        } catch {
            setError('Failed to load rules');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const startEdit = (rule) => {
        setEditingId(rule.id);
        setEditForm({
            needles: Array.isArray(rule.needles) ? rule.needles.join(', ') : rule.needles,
            replacement: rule.replacement,
            sort_order: rule.sort_order ?? 0,
        });
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            const needles = editForm.needles.split(',').map(s => s.trim()).filter(Boolean);
            const res = await fetch(`${API_BASE}/admin/description-rules/${editingId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ needles, replacement: editForm.replacement, sort_order: editForm.sort_order }),
            });
            if (!res.ok) throw new Error();
            setEditingId(null);
            await load();
        } catch {
            setError('Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const deleteRule = async (id) => {
        if (!window.confirm('Delete this rule?')) return;
        try {
            await fetch(`${API_BASE}/admin/description-rules/${id}`, {
                method: 'DELETE', headers: getAuthHeaders(),
            });
            await load();
        } catch {
            setError('Failed to delete rule');
        }
    };

    const createRule = async () => {
        setSaving(true);
        try {
            const needles = newForm.needles.split(',').map(s => s.trim()).filter(Boolean);
            if (!needles.length || !newForm.replacement.trim()) {
                setError('Both substrings and replacement are required');
                return;
            }
            const res = await fetch(`${API_BASE}/admin/description-rules`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ needles, replacement: newForm.replacement.trim(), sort_order: newForm.sort_order }),
            });
            if (!res.ok) throw new Error();
            setShowNew(false);
            setNewForm({ needles: '', replacement: '', sort_order: 0 });
            await load();
        } catch {
            setError('Failed to create rule');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '6px 10px', border: '1px solid #d1d5db',
        borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box',
    };
    const btnStyle = (color = '#2563eb') => ({
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', border: 'none', borderRadius: 6,
        background: color, color: '#fff', fontWeight: 600, fontSize: '0.78rem',
        cursor: 'pointer', fontFamily: 'inherit',
    });

    return (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>
                    Description Normalization Rules
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 12 }}>
                    Admin only
                </span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#6b7280' }}>
                When a bank transaction description contains any of the listed substrings, it is replaced with the canonical name on upload.
            </p>

            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: '#dc2626', fontSize: '0.82rem', marginBottom: 12 }}>
                    {error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right', color: '#dc2626' }}>✕</button>
                </div>
            )}

            {loading ? (
                <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', width: '40%' }}>Match substrings (comma-separated)</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Replace with</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 60 }}>Order</th>
                            <th style={{ width: 80 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                {editingId === rule.id ? (
                                    <>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input style={inputStyle} value={editForm.needles}
                                                onChange={e => setEditForm(f => ({ ...f, needles: e.target.value }))} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input style={inputStyle} value={editForm.replacement}
                                                onChange={e => setEditForm(f => ({ ...f, replacement: e.target.value }))} />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <input type="number" style={{ ...inputStyle, width: 50, textAlign: 'center' }} value={editForm.sort_order}
                                                onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                                        </td>
                                        <td style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                                            <button style={btnStyle('#16a34a')} onClick={saveEdit} disabled={saving}><Check size={13} /></button>
                                            <button style={btnStyle('#6b7280')} onClick={() => setEditingId(null)}><X size={13} /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '8px 12px', color: '#374151' }}>
                                            {(Array.isArray(rule.needles) ? rule.needles : []).map((n, i) => (
                                                <span key={i} style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: 4, marginRight: 4, marginBottom: 2, fontSize: '0.78rem' }}>{n}</span>
                                            ))}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111' }}>{rule.replacement}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#9ca3af' }}>{rule.sort_order}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }} onClick={() => startEdit(rule)} title="Edit"><Edit2 size={14} /></button>
                                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }} onClick={() => deleteRule(rule.id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}

                        {showNew && (
                            <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                                <td style={{ padding: '8px 12px' }}>
                                    <input style={inputStyle} placeholder="e.g. AIRBNB UK, פיוניר אינ" value={newForm.needles}
                                        onChange={e => setNewForm(f => ({ ...f, needles: e.target.value }))} />
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                    <input style={inputStyle} placeholder="e.g. Airbnb" value={newForm.replacement}
                                        onChange={e => setNewForm(f => ({ ...f, replacement: e.target.value }))} />
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <input type="number" style={{ ...inputStyle, width: 50, textAlign: 'center' }} value={newForm.sort_order}
                                        onChange={e => setNewForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button style={btnStyle('#16a34a')} onClick={createRule} disabled={saving}><Check size={13} /> Add</button>
                                        <button style={btnStyle('#6b7280')} onClick={() => setShowNew(false)}><X size={13} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {!showNew && (
                <button style={{ ...btnStyle('#0000FF'), marginTop: 12 }} onClick={() => { setShowNew(true); setError(''); }}>
                    <Plus size={14} /> Add Rule
                </button>
            )}
        </div>
    );
};

export default DescriptionRulesSection;
