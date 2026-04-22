import React from 'react';

const PATTERN = /(\*\*(.+?)\*\*|~~(.+?)~~)/g;

const renderDescription = (text) => {
    if (text == null || text === '') return null;
    const str = String(text);
    const nodes = [];
    let last = 0;
    let match;
    let i = 0;
    PATTERN.lastIndex = 0;
    while ((match = PATTERN.exec(str)) !== null) {
        if (match.index > last) {
            nodes.push(str.slice(last, match.index));
        }
        if (match[0].startsWith('**')) {
            nodes.push(React.createElement('strong', { key: `b-${i++}` }, match[2]));
        } else {
            nodes.push(React.createElement('s', { key: `s-${i++}` }, match[3]));
        }
        last = match.index + match[0].length;
    }
    if (last < str.length) nodes.push(str.slice(last));
    return nodes;
};

export default renderDescription;
