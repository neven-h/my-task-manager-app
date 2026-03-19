import React from 'react';
import { SpendingChart } from './SpendingChart';

const ForecastChartPanel = ({ data, adjust, isDesktop }) => (
    <div style={{ padding: isDesktop ? '18px 24px 10px' : '14px 20px 6px' }}>
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            background: isDesktop ? '#f8fafc' : '#ffffff',
            padding: isDesktop ? '18px 18px 14px' : '12px 12px 10px',
            boxShadow: isDesktop ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: isDesktop ? 'row' : 'column',
                alignItems: isDesktop ? 'center' : 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 12,
            }}>
                <div>
                    <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        marginBottom: 4,
                    }}>
                        Monthly spending — actual vs forecast
                    </div>
                    <div style={{
                        fontSize: isDesktop ? '0.95rem' : '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                        lineHeight: 1.45,
                        maxWidth: isDesktop ? '80%' : '100%',
                    }}>
                        Compare recent monthly spending with the forecast for the next months.
                    </div>
                </div>
                {adjust !== 0 && (
                    <span style={{
                        alignSelf: isDesktop ? 'center' : 'flex-start',
                        background: adjust < 0 ? '#dcfce7' : '#fee2e2',
                        color: adjust < 0 ? '#166534' : '#b91c1c',
                        borderRadius: 999,
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                    }}>
                        {adjust > 0 ? '+' : ''}{adjust}% scenario
                    </span>
                )}
            </div>
            <div style={{
                padding: isDesktop ? '8px 8px 0' : '0',
            }}>
                <SpendingChart
                    monthly_history={data.monthly_history}
                    predicted_monthly={data.predicted_monthly}
                    adjust={adjust}
                />
            </div>
        </div>
    </div>
);

export default ForecastChartPanel;
