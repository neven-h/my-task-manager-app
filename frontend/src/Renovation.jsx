import React, { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import useRenovation from './hooks/useRenovation';
import useRenovationFilters from './hooks/useRenovationFilters';
import { SYS } from './components/renovation/renovationConstants';
import RenovationHeader from './components/renovation/RenovationHeader';
import RenovationSummaryBar from './components/renovation/RenovationSummaryBar';
import RenovationItemForm from './components/renovation/RenovationItemForm';
import RenovationAreaGroup from './components/renovation/RenovationAreaGroup';
import RenovationFilterBar from './components/renovation/RenovationFilterBar';
import RenovationGroupToggle from './components/renovation/RenovationGroupToggle';

const Renovation = ({ onBackToTasks }) => {
    const { items, loading, error, fetchItems, createItem, updateItem, deleteItem } = useRenovation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const filters = useRenovationFilters(items);
    const { filtered, grouped, groupMode, setGroupMode } = filters;

    const handleCreate = async (form) => {
        setSaving(true);
        try {
            await createItem({
                name: form.name,
                area: form.area || null,
                contractor: form.contractor || null,
                category: form.category || null,
                estimated_cost: form.estimated_cost !== '' ? parseFloat(form.estimated_cost) : null,
                status: form.status,
                notes: form.notes || null,
            });
            setShowAddForm(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: SYS.bg, fontFamily: 'inherit' }}>
            <RenovationHeader
                onBackToTasks={onBackToTasks}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                itemCount={items.length}
            />

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
                {showAddForm && (
                    <div style={{ border: `3px solid ${SYS.primary}`, padding: '20px', marginBottom: 28, background: '#f5f8ff' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 14 }}>
                            New Renovation Item
                        </div>
                        <RenovationItemForm
                            onSave={handleCreate}
                            onCancel={() => setShowAddForm(false)}
                            saving={saving}
                        />
                    </div>
                )}

                {filtered.length > 0 && <RenovationSummaryBar items={filtered} />}

                {loading && (
                    <div style={{ textAlign: 'center', padding: '32px', color: SYS.light, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Loading…
                    </div>
                )}
                {error && (
                    <div style={{ border: `2px solid ${SYS.accent}`, padding: '12px 16px', color: SYS.accent, marginBottom: 20, fontWeight: 600 }}>
                        Error: {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && !showAddForm && (
                    <div style={{ border: `3px solid ${SYS.border}`, padding: '48px 24px', textAlign: 'center' }}>
                        <Wrench size={40} color={SYS.light} style={{ marginBottom: 16 }} />
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No renovation items yet</div>
                        <div style={{ color: SYS.light, marginBottom: 24 }}>Add your first work item to start tracking your renovation.</div>
                        <button onClick={() => setShowAddForm(true)} style={{
                            padding: '10px 24px', border: `2px solid ${SYS.border}`,
                            background: SYS.primary, color: '#fff', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
                        }}>
                            + Add First Item
                        </button>
                    </div>
                )}

                {items.length > 0 && <RenovationFilterBar {...filters} />}
                {items.length > 0 && (
                    <RenovationGroupToggle
                        groupMode={groupMode}
                        setGroupMode={setGroupMode}
                        filteredCount={filtered.length}
                        totalCount={items.length}
                    />
                )}

                {!loading && grouped.map(([group, groupItems]) => (
                    <RenovationAreaGroup
                        key={group}
                        area={group}
                        items={groupItems}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                    />
                ))}
            </div>
        </div>
    );
};

export default Renovation;
