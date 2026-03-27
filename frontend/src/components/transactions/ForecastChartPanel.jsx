import React from 'react';
import { BalanceRunwayChart } from './BalanceRunwayChart';

const ForecastChartPanel = ({ data, adjust, isDesktop, startingBalance }) => (
    <div style={{ padding: isDesktop ? '18px 20px 10px' : '14px 16px 6px' }}>
        <div style={{
            border: '2px solid #000',
            borderRadius: 0,
            background: '#fff',
            padding: isDesktop ? '16px 18px 14px' : '12px 12px 10px',
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
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#000',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 4,
                    }}>
                        Projected account balance
                    </div>
                    <div style={{
                        fontSize: isDesktop ? '0.88rem' : '0.82rem',
                        fontWeight: 600,
                        color: '#000',
                        lineHeight: 1.45,
                        maxWidth: isDesktop ? '80%' : '100%',
                    }}>
                        How your balance is projected to change based on your spending forecast.
                    </div>
                </div>
                {adjust !== 0 && (
                    <span style={{
                        alignSelf: isDesktop ? 'center' : 'flex-start',
                        background: adjust < 0 ? '#00AA00' : '#FF0000',
                        color: '#fff',
                        borderRadius: 0,
                        border: '2px solid #000',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                    }}>
                        {adjust > 0 ? '+' : ''}{adjust}% scenario
                    </span>
                )}
            </div>
            <BalanceRunwayChart
                startingBalance={startingBalance}
                predicted_monthly={data.predicted_monthly}
                adjust={adjust}
            />
        </div>
    </div>
);

export default ForecastChartPanel;
