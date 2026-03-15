import React from 'react';
import { Paperclip } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import CustomAutocomplete from '../CustomAutocomplete';
import TaskTagsFilter from './TaskTagsFilter';

const TaskFilterPanel = () => {
    const { filters, setFilters, allCategories, allTags, clients, hasActiveFilters, clearFilters } = useTaskContext();

    return (
        <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Filters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Search</label>
                    <input type="text" placeholder="Keywords..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Status</label>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="all">All Status</option>
                        <option value="uncompleted">Uncompleted</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Category</label>
                    <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                        <option value="all">All Categories</option>
                        {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                </div>
                <CustomAutocomplete
                    label="Client" placeholder="Client name..."
                    value={filters.client}
                    onChange={(value) => setFilters({ ...filters, client: value })}
                    options={clients.map(client => typeof client === 'string' ? client : client.name)}
                />
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Date From</label>
                    <input type="date" value={filters.dateStart} onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Date To</label>
                    <input type="date" value={filters.dateEnd} onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })} />
                </div>
                <TaskTagsFilter allTags={allTags} filters={filters} setFilters={setFilters} />
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={filters.hasAttachment} onChange={(e) => setFilters(f => ({ ...f, hasAttachment: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        <Paperclip size={14} style={{ flexShrink: 0 }} /> Has Attachment
                    </label>
                </div>
                {hasActiveFilters && (
                    <button className="btn btn-white" onClick={clearFilters} style={{ width: '100%' }}>Clear Filters</button>
                )}
            </div>
        </div>
    );
};

export default TaskFilterPanel;
