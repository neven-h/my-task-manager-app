import React from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { THEME, FONT_STACK } from '../../../ios/theme';
import MobileUploadFlowConfig from './MobileUploadFlowConfig';
import MobileUploadFlowPreview from './MobileUploadFlowPreview';
import MobileUploadFlowSuccess from './MobileUploadFlowSuccess';
import useMobileUploadFlow from './useMobileUploadFlow';

const MobileUploadFlow = ({ isOpen, onClose, onUploadComplete }) => {
    const {
        step, setStep,
        transactionType, setTransactionType,
        tabs, selectedTabId, setSelectedTabId,
        tabsLoading, file, fileRef,
        uploading, saving, parsedData,
        savedIds, undone, undoing, error,
        handleCreateTab, handleFileSelect,
        handleUploadAndParse, handleSave, handleUndo,
    } = useMobileUploadFlow({ isOpen, onClose, onUploadComplete });

    if (!isOpen) return null;

    const selectedTabName = tabs.find(t => t.id === selectedTabId)?.name || 'Unknown';
    const totalAmount = parsedData?.transactions?.reduce((s, t) => s + (Number(t.amount) || 0), 0) || 0;

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}
                onClick={onClose}
            />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh',
                background: '#fff', borderRadius: '16px 16px 0 0',
                zIndex: 401, display: 'flex', flexDirection: 'column',
                fontFamily: FONT_STACK, overflow: 'hidden'
            }}>
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#ddd' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 16px 12px', borderBottom: '3px solid #000'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {step === 'preview' && (
                            <button
                                onClick={() => setStep('config')}
                                style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                            {step === 'config' && 'Upload Transactions'}
                            {step === 'preview' && 'Preview'}
                            {step === 'success' && (undone ? 'Undone' : 'Saved')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                    {error && (
                        <div style={{ padding: '12px', marginBottom: '16px', background: '#FFF0F0', border: '2px solid ' + THEME.accent, fontSize: '0.85rem', color: THEME.accent, fontWeight: 700 }}>
                            {error}
                        </div>
                    )}
                    {step === 'config' && (
                        <MobileUploadFlowConfig
                            transactionType={transactionType} setTransactionType={setTransactionType}
                            tabs={tabs} selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId}
                            tabsLoading={tabsLoading} file={file} fileRef={fileRef}
                            handleCreateTab={handleCreateTab} handleFileSelect={handleFileSelect}
                            handleUploadAndParse={handleUploadAndParse} uploading={uploading}
                        />
                    )}
                    {step === 'preview' && parsedData && (
                        <MobileUploadFlowPreview
                            parsedData={parsedData} totalAmount={totalAmount}
                            transactionType={transactionType} selectedTabName={selectedTabName}
                            saving={saving} handleSave={handleSave}
                        />
                    )}
                    {step === 'success' && (
                        <MobileUploadFlowSuccess
                            undone={undone} savedIds={savedIds}
                            selectedTabName={selectedTabName} parsedData={parsedData}
                            undoing={undoing} handleUndo={handleUndo} onClose={onClose}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default MobileUploadFlow;
