"""Budget entries — CRUD for income/outcome cash-flow planning."""
import calendar
import logging
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from config import get_db_connection, token_required
from ._balance_forecast_helpers import invalidate_balance_forecast_cache
from .budget_balance import _validate_iso_date
from .budget_constants import (
    REPETITION_MAP, REPETITION_NONE,
    SCOPE_SINGLE, SCOPE_THIS_AND_FUTURE, SCOPE_VALUES,
)
from .budget_helpers import ensure_budget_table, serialize_entry

logger = logging.getLogger(__name__)
budget_bp = Blueprint('budget', __name__)

_ALLOWED_COLS = {'type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id', 'is_fixed'}

def _add_months_snap_day(d, months, day_of_month):
    """Return d + `months` months with day clamped to the chosen `day_of_month`,
    snapping to the last day of the target month when that day doesn't exist
    (e.g. day=31 in February). day_of_month defaults to d.day when None."""
    target_day = day_of_month or d.day
    yr, mo = d.year, d.month + months
    while mo > 12:
        mo -= 12
        yr += 1
    while mo < 1:
        mo += 12
        yr -= 1
    last_day = calendar.monthrange(yr, mo)[1]
    return date(yr, mo, min(target_day, last_day))


@budget_bp.route('/api/budget', methods=['GET'])
@token_required
def get_budget_entries(payload):
    username = payload.get('username')
    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM budget_entries WHERE owner = %s ORDER BY entry_date ASC, id ASC",
                (username,),
            )
            return jsonify([serialize_entry(e) for e in cursor.fetchall()])
    except Exception:
        logger.exception('Failed to get budget entries')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget', methods=['POST'])
@token_required
def create_budget_entry(payload):
    username = payload.get('username')
    data = request.get_json() or {}
    entry_type  = data.get('type')
    description = (data.get('description') or '').strip()
    amount      = data.get('amount')
    entry_date  = data.get('entry_date')

    if entry_type not in ('income', 'outcome'):
        return jsonify({'error': 'type must be "income" or "outcome"'}), 400
    if not description:
        return jsonify({'error': 'description is required'}), 400
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({'error': 'amount must be a positive number'}), 400
    if not entry_date:
        return jsonify({'error': 'entry_date is required'}), 400

    category = (data.get('category') or '').strip() or None
    notes    = (data.get('notes')    or '').strip() or None
    tab_id   = data.get('tab_id') or None

    # Recurring config. 'none' (default) creates exactly one row, preserving
    # all existing client behavior. Any other value materializes a chain of
    # rows: same recurring_id (= root row id), sequential recurring_seq,
    # entry_date stepped forward one month at a time with day snapped to the
    # last valid day of each target month (e.g. day=31 in Feb → Feb 28/29).
    repetition = (data.get('repetition') or REPETITION_NONE).strip().lower()
    if repetition not in REPETITION_MAP:
        return jsonify({'error': "repetition must be one of: none, 3m, 6m, 12m, unlimited"}), 400
    total_occurrences, recurring_total = REPETITION_MAP[repetition]
    is_recurring = repetition != REPETITION_NONE

    try:
        root_date = datetime.strptime(_validate_iso_date(entry_date, 'entry_date'), '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'entry_date must be YYYY-MM-DD'}), 400

    recurring_day_raw = data.get('recurring_day')
    if is_recurring:
        if recurring_day_raw is None or recurring_day_raw == '':
            recurring_day = root_date.day
        else:
            try:
                recurring_day = int(recurring_day_raw)
            except (TypeError, ValueError):
                return jsonify({'error': 'recurring_day must be an integer 1-31'}), 400
            if not (1 <= recurring_day <= 31):
                return jsonify({'error': 'recurring_day must be between 1 and 31'}), 400
    else:
        recurring_day = None

    # When marking a row recurring, the user almost always also wants is_fixed
    # (the two concepts overlap: fixed monthly obligation + scheduled chain).
    # Accept explicit is_fixed from the payload but default to True for any
    # recurring entry.
    is_fixed_input = data.get('is_fixed')
    is_fixed = bool(is_fixed_input) if is_fixed_input is not None else is_recurring

    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)

            insert_sql = (
                "INSERT INTO budget_entries "
                "(type, description, amount, entry_date, category, notes, owner, tab_id, "
                " is_fixed, recurring_id, recurring_day, recurring_total, recurring_seq) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s, %s,%s,%s,%s,%s)"
            )

            # Root row first. recurring_id is filled in after insert so it can
            # point at its own id (self-reference for one-shot lookups).
            cursor.execute(
                insert_sql,
                (entry_type, description, amount, root_date.isoformat(),
                 category, notes, username, tab_id,
                 is_fixed, None, recurring_day, recurring_total,
                 1 if is_recurring else None),
            )
            root_id = cursor.lastrowid
            created_ids = [root_id]

            if is_recurring:
                cursor.execute(
                    "UPDATE budget_entries SET recurring_id = %s WHERE id = %s",
                    (root_id, root_id),
                )
                # Materialize occurrences 2..N. Each row inherits the root's
                # config and is scheduled one calendar month after the previous.
                for seq in range(2, total_occurrences + 1):
                    occ_date = _add_months_snap_day(root_date, seq - 1, recurring_day)
                    cursor.execute(
                        insert_sql,
                        (entry_type, description, amount, occ_date.isoformat(),
                         category, notes, username, tab_id,
                         is_fixed, root_id, recurring_day, recurring_total, seq),
                    )
                    created_ids.append(cursor.lastrowid)

            conn.commit()
            # Return the root row for client convenience (matches old behavior).
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (root_id,))
            entry = serialize_entry(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify({**entry, 'created_ids': created_ids}), 201
    except Exception:
        logger.exception('Failed to create budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


# Columns that propagate to "this and all future" when editing a recurring
# chain. entry_date and tab_id are deliberately excluded — date is the schedule
# itself (changing one row's date shouldn't reschedule the chain), and tab_id
# moves a row to a different budget tab which we only allow per-row.
_RECURRING_BULK_COLS = {'type', 'description', 'amount', 'category', 'notes', 'is_fixed'}


@budget_bp.route('/api/budget/<int:entry_id>', methods=['PUT'])
@token_required
def update_budget_entry(payload, entry_id):
    username = payload.get('username')
    data = request.get_json() or {}
    # scope: 'single' (default) updates only this row;
    # 'this_and_future' propagates the update to every row in the same
    # recurring chain whose entry_date >= the target row's entry_date.
    scope = (data.get('scope') or SCOPE_SINGLE).strip().lower()
    if scope not in SCOPE_VALUES:
        return jsonify({'error': "scope must be 'single' or 'this_and_future'"}), 400

    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403

            fields, params = [], []
            bulk_fields, bulk_params = [], []
            for col in ('type', 'description', 'amount', 'entry_date', 'category', 'notes', 'tab_id', 'is_fixed'):
                if col not in data or col not in _ALLOWED_COLS:
                    continue
                val = data[col]
                if col == 'amount':
                    val = float(val)
                elif col == 'description':
                    val = (val or '').strip()
                elif col in ('category', 'notes'):
                    val = (val or '').strip() or None
                elif col == 'is_fixed':
                    val = bool(val)
                fields.append(f"{col} = %s")
                params.append(val)
                if col in _RECURRING_BULK_COLS:
                    bulk_fields.append(f"{col} = %s")
                    bulk_params.append(val)

            if not fields:
                return jsonify({'error': 'No fields to update'}), 400

            # Always update the target row (this guarantees scope='single'
            # behavior and ensures the target reflects any non-bulk columns
            # like entry_date even under 'this_and_future').
            cursor.execute(
                f"UPDATE budget_entries SET {', '.join(fields)} WHERE id = %s",
                [*params, entry_id],
            )
            updated_count = 1

            if scope == SCOPE_THIS_AND_FUTURE and entry.get('recurring_id') and bulk_fields:
                # Propagate to the rest of the chain at or after this row's date.
                # The target row itself is included in this range too, but it's
                # already updated above and re-updating it is a no-op.
                cursor.execute(
                    f"UPDATE budget_entries SET {', '.join(bulk_fields)} "
                    f"WHERE owner = %s AND recurring_id = %s AND entry_date >= %s",
                    [*bulk_params, username, entry['recurring_id'], entry['entry_date']],
                )
                updated_count = cursor.rowcount

            conn.commit()
            cursor.execute("SELECT * FROM budget_entries WHERE id = %s", (entry_id,))
            updated = serialize_entry(cursor.fetchone())
        invalidate_balance_forecast_cache(username)
        return jsonify({**updated, 'updated_count': updated_count})
    except Exception:
        logger.exception('Failed to update budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


@budget_bp.route('/api/budget/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_budget_entry(payload, entry_id):
    username = payload.get('username')
    # scope can come via JSON body OR query string (some clients can't send a
    # body with DELETE). Same semantics as PUT.
    body = request.get_json(silent=True) or {}
    scope = (body.get('scope') or request.args.get('scope') or SCOPE_SINGLE).strip().lower()
    if scope not in SCOPE_VALUES:
        return jsonify({'error': "scope must be 'single' or 'this_and_future'"}), 400

    try:
        with get_db_connection() as conn:
            ensure_budget_table(conn)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, owner, recurring_id, entry_date "
                "FROM budget_entries WHERE id = %s",
                (entry_id,),
            )
            entry = cursor.fetchone()
            if not entry:
                return jsonify({'error': 'Entry not found'}), 404
            if entry.get('owner') != username:
                return jsonify({'error': 'Access denied'}), 403

            if scope == SCOPE_THIS_AND_FUTURE and entry.get('recurring_id'):
                cursor.execute(
                    "DELETE FROM budget_entries "
                    "WHERE owner = %s AND recurring_id = %s AND entry_date >= %s",
                    (username, entry['recurring_id'], entry['entry_date']),
                )
                deleted_count = cursor.rowcount
            else:
                cursor.execute("DELETE FROM budget_entries WHERE id = %s", (entry_id,))
                deleted_count = cursor.rowcount
            conn.commit()
        invalidate_balance_forecast_cache(username)
        return jsonify({'success': True, 'deleted_count': deleted_count})
    except Exception:
        logger.exception('Failed to delete budget entry')
        return jsonify({'error': 'An internal error occurred'}), 500


# Register batch routes onto budget_bp (must come after blueprint definition)
from . import budget_batch  # noqa: E402, F401
