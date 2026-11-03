import React, { useState } from 'react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import TaskFolderEditor, { folderBtn } from './TaskFolderEditor';

/** Shown above an open folder's task list: back to the folder grid, the folder name, and edit. */
const TaskFolderBar = () => {
    const { activeFolder, setActiveFolder, folders, hasActiveFilters, clearFilters } = useTaskContext();
    const [editing, setEditing] = useState(false);
    const folder = typeof activeFolder === 'number' ? folders.find(f => f.id === activeFolder) : null;
    const name = folder?.name ?? (activeFolder === 'unfiled' ? 'Unfiled' : hasActiveFilters ? 'Search results' : 'All tasks');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setActiveFolder(null); if (hasActiveFilters) clearFilters(); }}
                style={{ ...folderBtn('#fff'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px' }}>
                <ChevronLeft size={18} /> Folders
            </button>
            <span style={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', borderLeft: `8px solid ${folder?.color || '#000'}`, paddingLeft: 10, overflowWrap: 'anywhere', minWidth: 0 }}>
                {name}
            </span>
            {folder && (
                <button type="button" onClick={() => setEditing(true)} aria-label={`Edit folder ${folder.name}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                    <Pencil size={16} />
                </button>
            )}
            {editing && folder && <TaskFolderEditor folder={folder} onClose={() => setEditing(false)} />}
        </div>
    );
};

export default TaskFolderBar;
