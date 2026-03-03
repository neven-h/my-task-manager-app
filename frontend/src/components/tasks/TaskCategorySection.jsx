import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const TaskCategorySection = ({ allCategories, selectedCategories, loading, onToggle, onCreate }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#0d6efd');
    const [icon, setIcon] = useState('📁');

    const handleCreate = async () => {
        const ok = await onCreate(name, color, icon);
        if (ok) { setName(''); setColor('#0d6efd'); setIcon('📁'); setShowAddForm(false); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Categories (Select one or more)
                </label>
                <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="btn btn-white" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <Plus size={14} /> New Category
                </button>
            </div>

            {showAddForm && (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '8px' }}>
                        <input type="text" placeholder="Category name..." value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: '0.9rem' }} />
                        <input type="text" placeholder="Icon" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: '60px', fontSize: '0.9rem', textAlign: 'center' }} />
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '50px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={handleCreate} disabled={loading || !name.trim()} className="btn btn-primary"
                            style={{ padding: '6px 16px', fontSize: '0.85rem', flex: 1, opacity: (loading || !name.trim()) ? 0.5 : 1, cursor: (loading || !name.trim()) ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                        <button type="button" onClick={() => { setShowAddForm(false); setName(''); setColor('#0d6efd'); setIcon('📁'); }} disabled={loading} className="btn btn-white" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {allCategories.map(cat => (
                    <div key={cat.id}
                        className={`category-pill ${selectedCategories.includes(cat.id) ? 'selected' : ''}`}
                        onClick={() => onToggle(cat.id)}
                        style={{ backgroundColor: selectedCategories.includes(cat.id) ? (cat.color || '#0d6efd') : undefined }}>
                        {cat.icon} {cat.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskCategorySection;
