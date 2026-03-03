import React from 'react';
import { Tag, X } from 'lucide-react';
import CustomAutocomplete from '../CustomAutocomplete';

const TaskTagsSection = ({ allTags, tags, tagInput, onTagInputChange, onAdd, onRemove, onSelect }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tags
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
                <CustomAutocomplete
                    value={tagInput}
                    onChange={onTagInputChange}
                    options={allTags.map(t => t.name).filter(n => !tags.includes(n))}
                    placeholder="Type or select a tag..."
                    onSelect={(val) => { if (val) onSelect(val); }}
                    onEnter={onAdd}
                />
            </div>
            <button type="button" onClick={onAdd} className="btn btn-white" style={{ padding: '12px 20px', alignSelf: 'flex-start' }}>
                <Tag size={16} style={{ marginRight: '4px' }} /> Add
            </button>
        </div>
        {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                        {tag}
                        <button type="button" onClick={() => onRemove(tag)}><X size={14} /></button>
                    </span>
                ))}
            </div>
        )}
    </div>
);

export default TaskTagsSection;
