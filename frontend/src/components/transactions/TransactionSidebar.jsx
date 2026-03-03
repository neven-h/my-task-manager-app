import React from 'react';
import TransactionUploadSection from './TransactionUploadSection';
import TransactionMonthsList from './TransactionMonthsList';

const TransactionSidebar = () => (
    <div>
        <TransactionUploadSection />
        <TransactionMonthsList />
    </div>
);

export default TransactionSidebar;
