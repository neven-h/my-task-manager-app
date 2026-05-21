"""Constants shared between budget routes.

Centralizes the string values that travel between the API and the database
so they don't drift across files. Importing module wins type-check-style
catches over scattering raw literals.
"""

# Repetition selector accepted by POST /api/budget.
REPETITION_NONE = 'none'
REPETITION_3M = '3m'
REPETITION_6M = '6m'
REPETITION_12M = '12m'
REPETITION_UNLIMITED = 'unlimited'

# Number of rows to materialize up-front for an unlimited recurring entry.
# A future top-up job is expected to extend the chain as the user approaches
# the end of this window.
UNLIMITED_INITIAL_MONTHS = 24

# Maps repetition string -> (total_occurrences_to_materialize, db_recurring_total).
# db_recurring_total stays NULL for 'unlimited' so the UI can render an infinity
# badge instead of a fixed count.
REPETITION_MAP = {
    REPETITION_NONE:      (1, None),
    REPETITION_3M:        (3, 3),
    REPETITION_6M:        (6, 6),
    REPETITION_12M:       (12, 12),
    REPETITION_UNLIMITED: (UNLIMITED_INITIAL_MONTHS, None),
}

# Scope param accepted by PUT/DELETE /api/budget/<id> for recurring chain edits.
SCOPE_SINGLE = 'single'
SCOPE_THIS_AND_FUTURE = 'this_and_future'
SCOPE_VALUES = (SCOPE_SINGLE, SCOPE_THIS_AND_FUTURE)
