import React, { useState } from 'react';

const TaskTagsFilter = ({ allTags, filters, setFilters }) => {
    const [tagsVisible, setTagsVisible] = useState(true);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Tags</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {tagsVisible ? (
                        <button type="button" onClick={() => setTagsVisible(false)} title="Hide tags" style={{ padding: '2px 8px', border: '1.5px solid #000', background: '#000', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif', letterSpacing: '0.3px' }}>
                            Hide
                        </button>
                    ) : (
                        <button type="button" onClick={() => setTagsVisible(true)} title="Show tags" style={{ padding: '2px 8px', border: '1.5px solid #000', background: '#FFD500', color: '#000', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif', letterSpacing: '0.3px' }}>
                            Show
                        </button>
                    )}
                    {tagsVisible && allTags.length > 0 && (<>
                        <button type="button" onClick={() => setFilters(f => ({ ...f, tags: allTags.map(t => t.name) }))} title="Select all tags" style={{ padding: '2px 8px', border: '1.5px solid #000', background: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif', letterSpacing: '0.3px' }}>All</button>
                        <button type="button" onClick={() => setFilters(f => ({ ...f, tags: [] }))} title="Clear all tag filters" style={{ padding: '2px 8px', border: '1.5px solid #000', background: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif', letterSpacing: '0.3px' }}>None</button>
                    </>)}
                </div>
            </div>
            {tagsVisible && (
                <>
                    {allTags.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No tags yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {allTags.map(tag => {
                                const isSelected = filters.tags.includes(tag.name);
                                return (
                                    <button key={tag.id} type="button"
                                        onClick={() => setFilters(f => ({
                                            ...f,
                                            tags: isSelected ? f.tags.filter(t => t !== tag.name) : [...f.tags, tag.name]
                                        }))}
                                        style={{
                                            padding: '4px 10px', border: '2px solid #000',
                                            background: isSelected ? '#FFD500' : '#fff',
                                            fontWeight: isSelected ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                                            fontFamily: '"Inter", sans-serif',
                                            boxShadow: isSelected ? '2px 2px 0 #000' : 'none',
                                            transition: 'all 0.1s ease'
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {filters.tags.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                            {filters.tags.length} tag{filters.tags.length > 1 ? 's' : ''} selected
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TaskTagsFilter;
