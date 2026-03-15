import React from 'react';

const AutocompleteDropdown = ({ filteredOptions, highlightedIndex, onOptionClick, onMouseEnter, value }) => {
    if (filteredOptions.length > 0) {
        return (
            <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                border: '3px solid #000', background: '#fff', maxHeight: '240px',
                overflowY: 'auto', zIndex: 2000, boxShadow: '4px 4px 0px rgba(0,0,0,1)'
            }}>
                {filteredOptions.map((option, index) => (
                    <div key={option} onClick={() => onOptionClick(option)} onMouseEnter={() => onMouseEnter(index)}
                        style={{
                            padding: '12px', cursor: 'pointer', fontWeight: 500, fontSize: '1rem',
                            background: highlightedIndex === index ? '#FFD500' : '#fff',
                            borderBottom: index < filteredOptions.length - 1 ? '2px solid #000' : 'none',
                            transition: 'background 0.1s ease'
                        }}
                    >
                        {option}
                    </div>
                ))}
            </div>
        );
    }
    if (value && filteredOptions.length === 0) {
        return (
            <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                border: '3px solid #000', background: '#fff', padding: '12px',
                zIndex: 2000, color: '#666', fontStyle: 'italic'
            }}>
                No matches found
            </div>
        );
    }
    return null;
};

export default AutocompleteDropdown;
