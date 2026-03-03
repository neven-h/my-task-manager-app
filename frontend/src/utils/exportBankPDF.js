import { formatCurrency } from './formatCurrency';

const aggregateByCategory = (transactions) => {
    const categoryData = {};
    transactions.forEach(t => {
        const desc = t.description || 'Other';
        if (!categoryData[desc]) categoryData[desc] = { count: 0, total: 0, credit: 0, cash: 0 };
        categoryData[desc].count++;
        categoryData[desc].total += t.amount;
        if (t.transaction_type === 'cash') categoryData[desc].cash += t.amount;
        else categoryData[desc].credit += t.amount;
    });
    return categoryData;
};

const formatMonthYear = (monthYear) => {
    if (!monthYear || monthYear === 'all') return 'All Transactions';
    const [year, month] = monthYear.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const exportBankTransactionsPDF = (filteredTransactions, selectedMonth) => {
    const printWindow = window.open('', '_blank');
    const { totalCredit, totalCash, total } = filteredTransactions.reduce((acc, t) => {
        acc.total += t.amount;
        if (t.transaction_type === 'credit') acc.totalCredit += t.amount;
        else if (t.transaction_type === 'cash') acc.totalCash += t.amount;
        return acc;
    }, { totalCredit: 0, totalCash: 0, total: 0 });

    const categories = aggregateByCategory(filteredTransactions);
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);
    const periodLabel = selectedMonth === 'all' ? 'All Transactions' : formatMonthYear(selectedMonth);

    printWindow.document.write(`
      <html lang="en">
      <head>
        <title>Bank Transactions Report - ${periodLabel}</title>
        <style>
          body { font-family: 'Inter', 'Helvetica Neue', Calibri, sans-serif; padding: 20px; color: #000; }
          h1 { color: #000; border-bottom: 4px solid #000; padding-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
          .summary-box { background: #fff; padding: 15px 25px; border: 3px solid #000; }
          .summary-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
          .summary-box p { margin: 0; font-size: 24px; font-weight: bold; }
          .credit { color: #0000FF; }
          .cash { color: #00AA00; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 3px solid #000; }
          th, td { border: 1px solid #000; padding: 12px; text-align: left; }
          th { background: #0000FF; color: white; }
          tr:nth-child(even) { background: #f8f8f8; }
          .amount { text-align: right; font-family: monospace; font-size: 14px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>💰 Bank Transactions Report</h1>
        <p><strong>Period:</strong> ${periodLabel}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <div class="summary">
          <div class="summary-box"><h3>Total Spending</h3><p>${formatCurrency(total)}</p></div>
          <div class="summary-box"><h3 class="credit">💳 Credit Card</h3><p class="credit">${formatCurrency(totalCredit)}</p></div>
          <div class="summary-box"><h3 class="cash">💵 Cash</h3><p class="cash">${formatCurrency(totalCash)}</p></div>
          <div class="summary-box"><h3>Transaction Count</h3><p>${filteredTransactions.length}</p></div>
        </div>
        <h2>📊 By Category</h2>
        <table>
          <thead><tr><th>Category</th><th>Count</th><th>Credit</th><th>Cash</th><th>Total</th></tr></thead>
          <tbody>
            ${sortedCategories.map(([cat, d]) => `<tr><td>${cat}</td><td>${d.count}</td><td class="amount credit">${formatCurrency(d.credit)}</td><td class="amount cash">${formatCurrency(d.cash)}</td><td class="amount" style="font-weight:bold;">${formatCurrency(d.total)}</td></tr>`).join('')}
          </tbody>
        </table>
        <h2>📋 All Transactions</h2>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            ${filteredTransactions.map(t => `<tr><td>${new Date(t.transaction_date).toLocaleDateString()}</td><td>${t.description}</td><td>${t.transaction_type === 'cash' ? '💵 Cash' : '💳 Credit'}</td><td class="amount" style="font-weight:bold;">${formatCurrency(t.amount)}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
