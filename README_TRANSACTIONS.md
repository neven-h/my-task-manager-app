# Bank Transactions Feature - Quick Start Guide

## ✅ Installation Complete!

All code has been written and dependencies have been installed. Your app is ready to use!

## 🚀 How to Run

### Backend
```bash
cd backend
./start.sh
```

Or manually:
```bash
cd backend
source venv/bin/activate
python3 app.py
```

The backend will start on http://192.168.31.152:5001

### Frontend
In a new terminal:
```bash
cd frontend
npm start
```

The frontend will start on http://localhost:3000

## 📝 How to Use the Feature

### 1. Navigate to Bank Transactions
- Open the app in your browser
- Click the **"Bank Transactions"** button (blue button with dollar sign icon)

### 2. Upload Your First File
- Click **"Choose File"**
- Select one of your CSV/Excel files:
  - `Moshe_transac_original.xlsx`
  - Or any CSV file in the same format
- The system will automatically:
  - Parse the file
  - Clean empty rows
  - Calculate the total amount
  - Display all transactions

### 3. Review and Save
- Review the parsed data in the preview table
- Check the total amount is correct
- Click **"Save to Database"**
- Transactions are now permanently saved and grouped by month

### 4. View Saved Transactions
- After saving, you'll see month cards appear
- Each card shows:
  - Month name (e.g., "October 2025")
  - Number of transactions
  - Total amount for that month
- Click on any month card to view detailed transactions

### 5. Compare Months
- Upload files from different months
- View them side-by-side in the month cards
- Click each month to see detailed breakdowns
- Easily spot spending patterns

## 📊 File Format

Your files should have 4 columns:
1. **Account Number** (e.g., 3986)
2. **Date** in DD.MM.YYYY format (e.g., 19.10.2025)
3. **Description** (transaction details)
4. **Amount** (numeric value, e.g., 24.60)

Example:
```
3986,19.10.2025,Store purchase,24.60
3986,20.10.2025,Restaurant meal,360.00
```

## 🎨 Features

- ✅ Upload CSV and Excel files (.csv, .xlsx, .xls)
- ✅ Automatic data cleaning (removes empty rows)
- ✅ Total amount calculation
- ✅ Transaction preview before saving
- ✅ Monthly grouping and organization
- ✅ Detailed transaction viewing
- ✅ Month-by-month comparison
- ✅ Delete entire months
- ✅ Matching brutalist design with your Task Tracker
- ✅ Hebrew text support in descriptions

## 🗑️ Managing Data

### Delete a Month
- Click the trash icon on any month card
- Confirm deletion
- All transactions for that month are removed

### Back to Tasks
- Click **"Back to Tasks"** to return to your task list
- Click **"Bank Transactions"** anytime to return

## 🔧 Technical Details

### Database
A new `bank_transactions` table has been created with these fields:
- `id` - Auto-incrementing primary key
- `account_number` - Account number from file
- `transaction_date` - Transaction date
- `description` - Transaction description
- `amount` - Transaction amount (2 decimal places)
- `month_year` - Format: YYYY-MM (for grouping)
- `upload_date` - When it was uploaded

### API Endpoints Created
- `POST /api/transactions/upload` - Upload and parse file
- `POST /api/transactions/save` - Save transactions to DB
- `GET /api/transactions/months` - Get all saved months
- `GET /api/transactions/<month_year>` - Get transactions for a month
- `DELETE /api/transactions/<id>` - Delete single transaction
- `DELETE /api/transactions/month/<month_year>` - Delete all transactions for a month

## 📁 Files Modified

### Backend
- `app.py` - Added transaction endpoints and parsing logic
- `requirements.txt` - Added pandas and openpyxl
- `venv/` - Virtual environment with all dependencies
- `uploads/` - Temporary storage for uploaded files
- `start.sh` - Quick start script

### Frontend
- `src/App.jsx` - Added navigation to transactions
- `src/BankTransactions.jsx` - New component for the feature

## 🐛 Troubleshooting

### Backend won't start
1. Make sure MySQL is running
2. Check database credentials in `app.py` (currently: user='root', password='')
3. Run: `source venv/bin/activate && python3 app.py`

### File upload fails
1. Check file format - must have 4 columns
2. Verify dates are in DD.MM.YYYY format
3. Ensure amounts are numeric values

### "No module named pandas"
Run:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend can't connect to backend
1. Verify backend is running on port 5001
2. Check the API_BASE URL in both:
   - `frontend/src/App.jsx`
   - `frontend/src/BankTransactions.jsx`
3. Make sure CORS is enabled (already configured)

## 💡 Tips

1. **Upload monthly files** - Keep your transactions organized by uploading one file per month
2. **Review before saving** - Always check the preview to ensure data parsed correctly
3. **Compare spending** - Use the month cards to quickly compare spending across months
4. **Hebrew support** - Transaction descriptions in Hebrew display correctly
5. **Clean data** - Empty rows are automatically removed, no manual cleaning needed

## 🎯 Next Steps (Optional Future Enhancements)

If you want to extend this feature, you could add:
- Export functionality (download month as CSV)
- Search and filter transactions
- Transaction categories/tags
- Spending charts and graphs
- Budget tracking
- Multi-account support
- Transaction editing
- Duplicate detection
- Monthly reports

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors (F12)
2. Check backend terminal for error messages
3. Verify MySQL is running
4. Make sure both frontend and backend are running

---

**Everything is ready to go! Just run the backend and frontend, then start uploading your transaction files!** 🎉
