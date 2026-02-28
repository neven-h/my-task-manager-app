import React from 'react';
import { Search, X } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const labelStyle = {
    display: 'block', fontWeight: 700, fontSize: '0.75rem',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'
};

const fieldStyle = {
    width: '100%', padding: '10px 12px', border: '2px solid #000',
    fontFamily: FONT_STACK, fontSize: '1rem', boxSizing: 'border-box'
};

const IOSSearchDrawer = ({ isOpen, onClose }) => {
    const { filters, setFilters, allCategories, allTags, clients, fetchTasks, clearFilters } = useTaskContext();

    if (!isOpen) return null;

    const updateFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

    const handleApply = () => {
        fetchTasks(filters);
        onClose();
    };

    const handleClear = () => {
        clearFilters();
        onClose();
    };

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
                onClick={onClose}
            />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff',
                borderTop: '3px solid #000', zIndex: 301, padding: '24px',
                fontFamily: FONT_STACK, maxHeight: '85vh', overflowY: 'auto'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: FONT_STACK }}>
                        <Search size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Search & Filter
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Keywords */}
                    <div>
                        <label style={labelStyle}>Keywords</label>
                        <input
                            type="text" placeholder="Search tasks..."
                            value={filters.search || ''}
                            onChange={e => updateFilter('search', e.target.value)}
                            style={fieldStyle}
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={filters.status || 'all'} onChange={e => updateFilter('status', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="all">All</option>
                            <option value="uncompleted">Uncompleted</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label style={labelStyle}>Category</label>
                        <select value={filters.category || 'all'} onChange={e => updateFilter('category', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="all">All Categories</option>
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Client */}
                    <div>
                        <label style={labelStyle}>Client</label>
                        <select value={filters.client || ''} onChange={e => updateFilter('client', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="">All Clients</option>
                            {clients.map(c => {
                                const name = typeof c === 'string' ? c : c.name;
                                const id = typeof c === 'string' ? c : c.id;
                                return <option key={id} value={name}>{name}</option>;
                            })}
                        </select>
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>From</label>
                            <input type="date" value={filters.dateStart || ''} onChange={e => updateFilter('dateStart', e.target.value)}
                                style={{ ...fieldStyle, fontSize: '0.9rem', padding: '10px 8px' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>To</label>
                            <input type="date" value={filters.dateEnd || ''} onChange={e => updateFilter('dateEnd', e.target.value)}
                                style={{ ...fieldStyle, fontSize: '0.9rem', padding: '10px 8px' }} />
                        </div>
                    </div>

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <div>
                            <label style={labelStyle}>Tags</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {allTags.map(tag => {
                                    const name = typeof tag === 'object' ? tag.name : tag;
                                    const isSelected = (filters.tags || []).includes(name);
                                    return (
                                        <button
                                            key={typeof tag === 'object' ? tag.id : tag}
                                            onClick={() => updateFilter('tags', isSelected
                                                ? (filters.tags || []).filter(t => t !== name)
                                                : [...(filters.tags || []), name]
                                            )}
                                            style={{
                                                padding: '4px 10px', border: '2px solid #000',
                                                background: isSelected ? THEME.primary : '#fff',
                                                color: isSelected ? '#fff' : THEME.text,
                                                fontFamily: FONT_STACK, fontSize: '0.8rem',
                                                fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Has attachment */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700 }}>
                        <input
                            type="checkbox"
                            checked={filters.hasAttachment || false}
                            onChange={e => updateFilter('hasAttachment', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Has Attachment
                    </label>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button className="mobile-btn mobile-btn-primary" onClick={handleApply} style={{ flex: 1 }}>
                        <Search size={16} style={{ marginRight: '8px' }} /> Apply
                    </button>
                    <button className="mobile-btn" onClick={handleClear} style={{ flex: 1 }}>
                        Clear All
                    </button>
                </div>
            </div>
        </>
    );
};

export default IOSSearchDrawer;
