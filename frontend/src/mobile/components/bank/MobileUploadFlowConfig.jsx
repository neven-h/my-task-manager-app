import React from 'react';
import { Upload, Plus, FileText } from 'lucide-react';
import { THEME, FONT_STACK } from '../../../ios/theme';

const MobileUploadFlowConfig = ({
    transactionType, setTransactionType,
    tabs, selectedTabId, setSelectedTabId,
    tabsLoading, file, fileRef,
    handleCreateTab, handleFileSelect,
    handleUploadAndParse, uploading,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Transaction type */}
        <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                Transaction Type
            </label>
            <div style={{ display: 'flex', border: '3px solid #000', overflow: 'hidden' }}>
                {['credit', 'cash'].map(type => (
                    <button
                        key={type}
                        onClick={() => setTransactionType(type)}
                        style={{
                            flex: 1, padding: '12px',
                            border: 'none',
                            borderRight: type === 'credit' ? '3px solid #000' : 'none',
                            background: transactionType === type ? THEME.primary : '#fff',
                            color: transactionType === type ? '#fff' : THEME.text,
                            fontWeight: 700, fontSize: '0.9rem',
                            cursor: 'pointer', fontFamily: FONT_STACK,
                            textTransform: 'uppercase'
                        }}
                    >
                        {type === 'credit' ? 'Credit' : 'Cash'}
                    </button>
                ))}
            </div>
        </div>

        {/* Tab selector */}
        <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                Save to Tab
            </label>
            {tabsLoading ? (
                <div style={{ padding: '12px', color: THEME.muted, fontSize: '0.85rem' }}>Loading tabs...</div>
            ) : tabs.length === 0 ? (
                <div style={{ padding: '12px', color: THEME.muted, fontSize: '0.85rem' }}>No tabs yet. Create one to continue.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTabId(tab.id)}
                            style={{
                                padding: '12px 16px', border: '3px solid #000',
                                background: selectedTabId === tab.id ? THEME.primary : '#fff',
                                color: selectedTabId === tab.id ? '#fff' : THEME.text,
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: 'pointer', fontFamily: FONT_STACK, textAlign: 'left'
                            }}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={handleCreateTab}
                style={{
                    marginTop: '8px', padding: '10px 16px',
                    border: '2px dashed #000', background: '#f8f8f8',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    fontFamily: FONT_STACK, width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <Plus size={16} /> Create New Tab
            </button>
        </div>

        {/* File picker */}
        <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                File
            </label>
            <button
                onClick={() => fileRef.current?.click()}
                style={{
                    width: '100%', padding: '16px', border: '3px solid #000',
                    background: file ? '#f0f8ff' : '#f8f8f8',
                    cursor: 'pointer', fontFamily: FONT_STACK,
                    fontSize: '0.9rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}
            >
                <FileText size={20} color={THEME.muted} />
                {file ? file.name : 'Choose .csv, .xlsx, or .xls file'}
            </button>
            <input
                ref={fileRef} type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />
        </div>

        {/* Upload button */}
        <button
            onClick={handleUploadAndParse}
            disabled={!file || !selectedTabId || uploading}
            style={{
                width: '100%', padding: '16px', border: '3px solid #000',
                background: (!file || !selectedTabId || uploading) ? '#ccc' : THEME.primary,
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: (!file || !selectedTabId || uploading) ? 'not-allowed' : 'pointer',
                fontFamily: FONT_STACK, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
        >
            <Upload size={18} />
            {uploading ? 'Parsing...' : 'Upload & Preview'}
        </button>
    </div>
);

export default MobileUploadFlowConfig;
