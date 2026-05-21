// Frontend mirror of backend/routes/budget_constants.py. Keep in sync.

export const REPETITION_NONE      = 'none';
export const REPETITION_3M        = '3m';
export const REPETITION_6M        = '6m';
export const REPETITION_12M       = '12m';
export const REPETITION_UNLIMITED = 'unlimited';

export const REPETITION_OPTIONS = [
    { value: REPETITION_NONE,      label: 'One-time entry' },
    { value: REPETITION_3M,        label: 'Every month — 3 months' },
    { value: REPETITION_6M,        label: 'Every month — 6 months' },
    { value: REPETITION_12M,       label: 'Every month — 12 months' },
    { value: REPETITION_UNLIMITED, label: 'Every month — unlimited' },
];

export const SCOPE_SINGLE          = 'single';
export const SCOPE_THIS_AND_FUTURE = 'this_and_future';
