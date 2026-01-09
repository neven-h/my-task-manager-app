// FIX 2: Better Amount Column Font
// Copy this entire style object and replace the amount column style

// LOCATION: BankTransactions.jsx, line ~1376
// FIND: The <td> with "fontFamily: 'monospace'" in the amount column

// REPLACE THE ENTIRE STYLE OBJECT WITH THIS:
// style={{
//   padding: '0.65rem 0.75rem',
//   textAlign: 'right',
//   fontWeight: '700',
//   fontFamily: 'Consolas, "Courier New", monospace',
//   fontVariantNumeric: 'tabular-nums',
//   letterSpacing: '0.05em',
//   fontSize: '0.95rem',
//   color: t.amount < 0 ? colors.accent : colors.text
// }}
//
// // ALSO UPDATE line ~838 in the same file (expense distribution chart)
// // FIND: fontFamily: 'monospace',
// // ADD AFTER IT:
// fontVariantNumeric: 'tabular-nums',
// letterSpacing: '0.05em',
