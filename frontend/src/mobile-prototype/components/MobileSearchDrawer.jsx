import React from 'react';
import { Search, X } from 'lucide-react';
import { useMobileTask } from '../MobileTaskContext';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";
const labelStyle = { display: 'block', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' };
const fieldStyle = { width: '100%', padding: '10px 12px', border: '2px solid #000', fontFamily: FONT_STACK, fontSize: '1rem', boxSizing: 'border-box' };

const MobileSearchDrawer = () => {
    const { showSearchDrawer, setShowSearchDrawer, searchFilters, setSearchFilters, categories, clients, allTags, fetchTasks, clearFilters } = useMobileTask();

    if (!showSearchDrawer) return null;

    const update = (key, value) => setSearchFilters(f => ({ ...f, [key]: value }));
    const close = () => setShowSearchDrawer(false);

    const handleApply = () => { fetchTasks(searchFilters); close(); };
    const handleClear = () => { clearFilters(); close(); };

    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} onClick={close} />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff',
                borderTop: '3px solid #000', zIndex: 301, padding: '24px',
                fontFamily: FONT_STACK, maxHeight: '85vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        <Search size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Search & Filter
                    </h2>
                    <button onClick={close} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Keywords</label>
                        <input type="text" placeholder="Search tasks..." value={searchFilters.search}
                            onChange={e => update('search', e.target.value)} style={fieldStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={searchFilters.status} onChange={e => update('status', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="all">All</option>
                            <option value="uncompleted">Uncompleted</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Category</label>
                        <select value={searchFilters.category} onChange={e => update('category', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="all">All Categories</option>
                            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Client</label>
                        <select value={searchFilters.client} onChange={e => update('client', e.target.value)} style={{ ...fieldStyle, background: '#fff' }}>
                            <option value="">All Clients</option>
                            {clients.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>From</label>
                            <input type="date" value={searchFilters.dateStart} onChange={e => update('dateStart', e.target.value)} style={{ ...fieldStyle, fontSize: '0.9rem', padding: '10px 8px' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>To</label>
                            <input type="date" value={searchFilters.dateEnd} onChange={e => update('dateEnd', e.target.value)} style={{ ...fieldStyle, fontSize: '0.9rem', padding: '10px 8px' }} />
                        </div>
                    </div>

                    {allTags.length > 0 && (
                        <div>
                            <label style={labelStyle}>Tags</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {allTags.map(tag => {
                                    const name = typeof tag === 'object' ? tag.name : tag;
                                    const id = typeof tag === 'object' ? tag.id : tag;
                                    const isSelected = searchFilters.tags.includes(name);
                                    return (
                                        <button key={id} onClick={() => update('tags', isSelected ? searchFilters.tags.filter(t => t !== name) : [...searchFilters.tags, name])}
                                            style={{ padding: '4px 10px', border: '2px solid #000', background: isSelected ? '#0000FF' : '#fff', color: isSelected ? '#fff' : '#000', fontFamily: FONT_STACK, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700 }}>
                        <input type="checkbox" checked={searchFilters.hasAttachment} onChange={e => update('hasAttachment', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        Has Attachment
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button className="mobile-btn mobile-btn-primary" onClick={handleApply} style={{ flex: 1 }}>
                        <Search size={16} style={{ marginRight: '8px' }} /> Apply
                    </button>
                    <button className="mobile-btn" onClick={handleClear} style={{ flex: 1 }}>Clear All</button>
                </div>
            </div>
        </>
    );
};

export default MobileSearchDrawer;
