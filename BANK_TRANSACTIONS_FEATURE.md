# Bank Transactions Feature

## Overview
A complete bank transaction management system has been added to your Task Manager App. This feature allows you to:
- Upload CSV/Excel files containing bank transactions
- Automatically clean and parse transaction data
- View total amounts for uploaded files
- Save transactions to the database
- Compare transactions across different months
- View detailed transaction lists by month

## File Structure Changes

### Backend Files Modified/Created
1. **backend/app.py** - Added:
   - File upload configuration
   - Bank transactions database table
   - Transaction parsing and cleaning functions
   - 7 new API endpoints for transaction management

2. **backend/requirements.txt** - Added:
   - pandas==2.1.4
   - openpyxl==3.1.2

3. **backend/uploads/** - New directory for temporary file storage

### Frontend Files Modified/Created
1. **frontend/src/BankTransactions.jsx** - New component for transaction management
2. **frontend/src/App.jsx** - Updated with navigation between Tasks and Transactions

## Database Schema

### bank_transactions Table
```sql
CREATE TABLE bank_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(50),
    transaction_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_month_year (month_year),
    INDEX idx_account (account_number)
)
```

## API Endpoints

### 1. Upload Transactions
**POST** `/api/transactions/upload`
- Upload CSV or Excel file
- Returns parsed transactions and total amount
- File is automatically cleaned (empty rows removed)

**Request:** multipart/form-data with 'file' field
**Response:**
```json
{
  "success": true,
  "total_amount": 4250.50,
  "transaction_count": 57,
  "transactions": [...],
  "month_year": "2025-10"
}
```

### 2. Save Transactions
**POST** `/api/transactions/save`
- Save parsed transactions to database

**Request:**
```json
{
  "transactions": [
    {
      "account_number": "3986",
      "transaction_date": "2025-10-19",
      "description": "Store purchase",
      "amount": 24.60,
      "month_year": "2025-10"
    }
  ]
}
```

### 3. Get All Months
**GET** `/api/transactions/months`
- Returns list of months with saved transactions
- Includes transaction count and total amount per month

**Response:**
```json
[
  {
    "month_year": "2025-11",
    "transaction_count": 57,
    "total_amount": 4250.50,
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "last_upload": "2025-12-28T20:00:00"
  }
]
```

### 4. Get Transactions by Month
**GET** `/api/transactions/<month_year>`
- Returns all transactions for a specific month
- Example: `/api/transactions/2025-10`

### 5. Delete Single Transaction
**DELETE** `/api/transactions/<transaction_id>`
- Delete a specific transaction by ID

### 6. Delete Month Transactions
**DELETE** `/api/transactions/month/<month_year>`
- Delete all transactions for a specific month

## Data Cleaning Process

The system automatically cleans uploaded files:
1. Removes rows where all columns are empty
2. Removes rows with missing critical data (date, description, amount)
3. Parses dates in DD.MM.YYYY format
4. Converts amounts to numeric values
5. Generates month_year identifier (YYYY-MM format)

## Expected File Format

### CSV/Excel Structure
Files should have 4 columns in this order:
1. Account Number (optional)
2. Date (DD.MM.YYYY format)
3. Description
4. Amount (numeric)

Example:
```
3986,19.10.2025,Store purchase,24.60
3986,20.10.2025,Restaurant,360.00
```

## Usage Instructions

### Installing Dependencies

1. Backend:
```bash
cd backend
pip install -r requirements.txt
```

2. Frontend (no new dependencies needed):
```bash
cd frontend
npm install
```

### Running the Application

1. Start backend:
```bash
cd backend
python app.py
```

2. Start frontend:
```bash
cd frontend
npm start
```

### Using the Feature

1. **Navigate to Bank Transactions**
   - Click the "Bank Transactions" button in the header

2. **Upload a File**
   - Click "Choose File"
   - Select a CSV or Excel file
   - System automatically parses and displays:
     - Total amount
     - Number of transactions
     - Preview of all transactions

3. **Save to Database**
   - Review the parsed data
   - Click "Save to Database"
   - Transactions are stored and grouped by month

4. **View Saved Transactions**
   - Click on any month card to view detailed transactions
   - See total amount per month
   - Compare different months side by side

5. **Delete Transactions**
   - Click trash icon on month card to delete all transactions for that month

## Features

### Current Features
- ✅ File upload (CSV, XLSX, XLS)
- ✅ Automatic data cleaning
- ✅ Total amount calculation
- ✅ Transaction preview before saving
- ✅ Monthly grouping and comparison
- ✅ Detailed transaction views
- ✅ Delete functionality
- ✅ Responsive design matching Task Tracker style
- ✅ Error handling and user feedback

### Design
- Matches the existing Task Tracker brutalist design
- Red, Yellow, Blue color scheme
- Bold typography
- Neo-brutalist card hover effects
- Clean, modern interface

## Testing

To test with your sample files:

1. Navigate to Bank Transactions section
2. Upload: `/Users/pit/PycharmProjects/My Task Manager App/csv_files/Moshe_transac_original.xlsx`
3. Verify the data is parsed correctly
4. Save to database
5. Check the month appears in "Saved Transactions by Month"
6. Click the month to view detailed transactions

## Future Enhancements (Optional)

Potential additions you might want:
- Export transactions to CSV
- Filter transactions by description/amount
- Transaction categories/tags
- Monthly spending charts
- Budget tracking
- Multi-account support
- Transaction editing
- Duplicate detection
- Search functionality

## Troubleshooting

### Common Issues

1. **"Module not found: pandas"**
   - Run: `pip install pandas openpyxl`

2. **"Database error"**
   - Ensure MySQL is running
   - Run backend app to initialize tables: `python app.py`

3. **"Upload failed"**
   - Check file format (must be CSV or Excel)
   - Verify file has 4 columns
   - Check dates are in DD.MM.YYYY format

4. **Frontend not connecting**
   - Verify API_BASE URL in both files
   - Check backend is running on port 5001

## Notes

- All uploaded files are temporarily stored and deleted after processing
- Dates are stored in YYYY-MM-DD format in the database
- Currency is displayed in ILS (Israeli Shekel) format
- Amounts are stored with 2 decimal precision
- The system handles Hebrew text in transaction descriptions
