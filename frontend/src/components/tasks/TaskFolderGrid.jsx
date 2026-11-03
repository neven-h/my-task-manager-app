import React, { useMemo, useState } from 'react';
import { Folder, FolderPlus, Inbox, Layers, Pencil } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import TaskFolderEditor from './TaskFolderEditor';

const tileStyle = (color) => ({
    position: 'relative', textAlign: 'left', cursor: 'pointer', minHeight: 132,
    background: '#fff', border: '3px solid #000', borderTop: `10px solid ${color}`,
    padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    fontFamily: 'inherit', color: '#000', minWidth: 0,
});

const Tile = ({ icon: Icon, color, name, open, total, onOpen, onEdit, detail }) => (
    <div style={{ position: 'relative', minWidth: 0 }}>
        <button type="button" onClick={onOpen} style={tileStyle(color)} aria-label={`Open ${name}, ${open} open tasks`}>
            <Icon size={22} color={color} strokeWidth={2.4} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.5px', overflowWrap: 'anywhere', paddingRight: onEdit ? 28 : 0 }}>
                {name}
            </span>
            <span style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: open ? '#FF0000' : '#000' }}>{open} open</strong>
                <span style={{ color: '#666' }}> · {total} total</span>
            </span>
            {detail && <span style={{ fontSize: '0.75rem', color: '#666', overflowWrap: 'anywhere' }}>{detail}</span>}
        </button>
        {onEdit && (
            <button type="button" onClick={onEdit} aria-label={`Edit folder ${name}`}
                style={{ position: 'absolute', top: 14, right: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Pencil size={16} />
            </button>
        )}
    </div>
);

/** Task home: one tile per folder, plus All tasks and the categories in no folder. */
const TaskFolderGrid = () => {
    const { allTasks, folders, setActiveFolder, getCategoryLabel, loading } = useTaskContext();
    const [editing, setEditing] = useState(null); // null = closed, {} = new folder, folder = edit

    const counts = useMemo(() => {
        const byCat = {};
        for (const t of allTasks) {
            const c = byCat[t.category] || (byCat[t.category] = { open: 0, total: 0 });
            c.total += 1;
            if (t.status !== 'completed') c.open += 1;
        }
        const sum = (cats) => cats.reduce((acc, cat) => ({
            open: acc.open + (byCat[cat]?.open || 0), total: acc.total + (byCat[cat]?.total || 0),
        }), { open: 0, total: 0 });
        const filed = new Set(folders.flatMap(f => f.categories));
        const unfiledCats = Object.keys(byCat).filter(c => !filed.has(c));
        return { sum, unfiledCats, all: sum(Object.keys(byCat)), unfiled: sum(unfiledCats) };
    }, [allTasks, folders]);

    const labels = (cats) => cats.map(getCategoryLabel).join(', ');

    return (
        <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 20 }}>Folders</h2>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>Loading...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                    <Tile icon={Layers} color="#000" name="All tasks" {...counts.all} onOpen={() => setActiveFolder('all')} />
                    {folders.map(f => (
                        <Tile key={f.id} icon={Folder} color={f.color} name={f.name} {...counts.sum(f.categories)}
                            detail={f.categories.length ? labels(f.categories) : 'No categories yet'}
                            onOpen={() => setActiveFolder(f.id)} onEdit={() => setEditing(f)} />
                    ))}
                    {counts.unfiledCats.length > 0 && (
                        <Tile icon={Inbox} color="#FFD500" name={folders.length ? 'Unfiled' : 'Uncategorised'} {...counts.unfiled}
                            detail={labels(counts.unfiledCats)} onOpen={() => setActiveFolder('unfiled')} />
                    )}
                    <button type="button" onClick={() => setEditing({})}
                        style={{ ...tileStyle('#0000FF'), border: '3px dashed #000', borderTop: '10px solid #0000FF', alignItems: 'center', justifyContent: 'center', fontWeight: 900, textTransform: 'uppercase' }}>
                        <FolderPlus size={24} color="#0000FF" />
                        New folder
                    </button>
                </div>
            )}
            {editing && <TaskFolderEditor folder={editing} onClose={() => setEditing(null)} />}
        </div>
    );
};

export default TaskFolderGrid;
