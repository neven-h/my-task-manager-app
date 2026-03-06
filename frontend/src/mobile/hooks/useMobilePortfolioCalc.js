const useMobilePortfolioCalc = (entries) => {
    const getEntryValues = (entry, livePrice) => {
        const units = entry.units != null && entry.units !== '' && Number(entry.units) > 0
            ? Number(entry.units)
            : 1;
        const currency = entry.currency || 'ILS';
        const valueNum = Number(entry.value_ils);
        const safeValue = Number.isFinite(valueNum) ? valueNum : 0;
        const currentPricePerUnit = livePrice?.currentPrice ?? (safeValue / units);
        const totalValue = units * (Number.isFinite(currentPricePerUnit) ? currentPricePerUnit : safeValue);
        const basePrice = entry.base_price != null && entry.base_price !== ''
            ? parseFloat(entry.base_price)
            : null;
        const growthAmount = basePrice != null && basePrice !== 0
            ? currentPricePerUnit - basePrice
            : null;
        const growthPercent = basePrice != null && basePrice !== 0
            ? ((currentPricePerUnit - basePrice) / basePrice) * 100
            : null;
        return { units, currency, currentPricePerUnit, totalValue, growthAmount, growthPercent };
    };

    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.name ?? '';
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});

    return { getEntryValues, groupedEntries };
};

export default useMobilePortfolioCalc;
