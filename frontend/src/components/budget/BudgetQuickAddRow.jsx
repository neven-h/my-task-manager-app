import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';

/**
 * Persistent inline quick-add row at the top of the entry list.
 *
 * Replaces the previous flow where the form was hidden behind a "+ Income /
 * + Expense" button click. The new row is:
 *   - always visible at the top of the list
 *   - keyboard-driven (Tab order works; Enter submits)
 *   - autocompletes descriptions from prior entries in the active tab
 *     (description → also prefills amount + category from the most recent
 *     entry with that description — a "use again" pattern)
 *
 * For richer flows — recurring entries, notes, custom date pickers — the
 * full BudgetEntryForm is still triggered via the page header buttons.
 * This component is intentionally minimal so the common case (logging a
 * one-off expense) takes 4 keystrokes and one Enter.
 */

const SYS = {
    primary: '#0000FF',
    accent:  '#FF0000',
    success: '#00AA00',
    text:    '#000',
    light:   '#666',
    border:  '#000',
};

const todayISO = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
};

const inputStyle = {
    padding: '7px 9px',
    border: `2px solid ${SYS.border}`,
    fontFamily: 'inherit',
    fontSize: '0.86rem',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
};

const typeBtn = (active, color) => ({
    padding: '7px 10px',
    border: `2px solid ${SYS.border}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : SYS.text,
    fontWeight: 700,
    fontSize: '0.74rem',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 70,
});

const BudgetQuickAddRow = ({ tabEntries = [], onCreate, loading = false, renovationMode = false }) => {
    const [type, setType] = useState(renovationMode ? 'outcome' : 'outcome');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [entryDate, setEntryDate] = useState(todayISO());
    const [category, setCategory] = useState('');
    const descRef = useRef(null);

    // Build a deduped suggestion list of {description, amount, category, type}
    // from existing entries — most-recent occurrence wins for prefill data.
    const suggestions = useMemo(() => {
        const map = new Map();
        for (const e of tabEntries) {
            const key = (e.description || '').trim().toLowerCase();
            if (!key) continue;
            const existing = map.get(key);
            if (!existing || e.entry_date > existing.entry_date) {
                map.set(key, e);
            }
        }
        return Array.from(map.values()).sort(
            (a, b) => (b.entry_date || '').localeCompare(a.entry_date || ''),
        );
    }, [tabEntries]);

    const datalistId = 'budget-quickadd-descriptions';

    // When the user picks a suggestion (or types something matching one),
    // pre-fill amount + category from the most recent entry with that
    // description. Cuts manual entry to one keystroke for repeat purchases.
    const handleDescriptionChange = (next) => {
        setDescription(next);
        const match = suggestions.find(
            (s) => (s.description || '').toLowerCase() === next.trim().toLowerCase(),
        );
        if (match) {
            if (!amount) setAmount(String(match.amount));
            if (!category && match.category) setCategory(match.category);
            // Don't override type — user's chip selection wins.
        }
    };

    const reset = (keepType = true) => {
        setDescription('');
        setAmount('');
        setEntryDate(todayISO());
        setCategory('');
        if (!keepType) setType('outcome');
    };

    const submit = useCallback(
        async (saveAndContinue = false) => {
            const desc = description.trim();
            const amt = parseFloat(amount);
            if (!desc || !amt || amt <= 0 || !entryDate) return;
            const ok = await onCreate({
                type,
                description: desc,
                amount: amt,
                entry_date: entryDate,
                category: category.trim() || undefined,
                notes: undefined,
            });
            if (ok) {
                reset(true);
                if (saveAndContinue) {
                    // Stay focused on description so the next entry is one keystroke away.
                    setTimeout(() => descRef.current?.focus(), 0);
                }
            }
        },
        [type, description, amount, entryDate, category, onCreate],
    );

    const onSubmit = (e) => {
        e.preventDefault();
        submit(true);
    };

    const incomeLabel = renovationMode ? 'Future' : 'Income';
    const outcomeLabel = renovationMode ? 'Paid' : 'Expense';

    return (
        <form
            onSubmit={onSubmit}
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                alignItems: 'center',
                padding: '10px 12px',
                background: '#F5F5F5',
                borderBottom: `2px solid ${SYS.border}`,
            }}
        >
            <button
                type="button"
                onClick={() => setType('income')}
                style={typeBtn(type === 'income', SYS.success)}
                title={`Set type to ${incomeLabel}`}
            >
                + {incomeLabel}
            </button>
            <button
                type="button"
                onClick={() => setType('outcome')}
                style={typeBtn(type === 'outcome', SYS.accent)}
                title={`Set type to ${outcomeLabel}`}
            >
                − {outcomeLabel}
            </button>

            <input
                ref={descRef}
                list={datalistId}
                placeholder="Description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                autoComplete="off"
                required
                style={{ ...inputStyle, flex: '2 1 180px', minWidth: 140 }}
            />
            <datalist id={datalistId}>
                {suggestions.slice(0, 50).map((s) => (
                    <option key={`${s.description}-${s.id}`} value={s.description} />
                ))}
            </datalist>

            <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="₪"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ ...inputStyle, width: 100, fontVariantNumeric: 'tabular-nums', fontFamily: 'Consolas, "Courier New", monospace' }}
            />

            <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                style={{ ...inputStyle, width: 142 }}
            />

            <input
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 110px', minWidth: 80 }}
            />

            <button
                type="submit"
                disabled={loading}
                title="Save (Enter) — form stays open so you can add another"
                style={{
                    padding: '7px 14px',
                    border: `2px solid ${SYS.border}`,
                    background: SYS.primary,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                }}
            >
                <Plus size={14} /> Add
            </button>
        </form>
    );
};

export default BudgetQuickAddRow;
