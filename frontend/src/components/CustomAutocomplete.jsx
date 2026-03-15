import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import AutocompleteDropdown from './AutocompleteDropdown';

/**
 * Custom Autocomplete Component
 * Brutalist-styled autocomplete dropdown with keyboard navigation.
 */
const CustomAutocomplete = ({
  value, onChange, options = [], placeholder = "Select...",
  label = null, required = false, onSelect = null, onEnter = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      setFilteredOptions(options.filter(option => option.toLowerCase().includes(value.toLowerCase())));
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => { onChange(e.target.value); setIsOpen(true); setHighlightedIndex(-1); };
  const handleOptionClick = (option) => {
    if (onSelect) { onSelect(option); } else { onChange(option); }
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setIsOpen(true); return; }
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (onEnter) {
          onEnter(); setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault(); setIsOpen(false); break;
      case 'Tab':
        setIsOpen(false); break;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label} {required && <span style={{ color: '#FF0000' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef} type="text" value={value}
          onChange={handleInputChange} onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown} placeholder={placeholder}
          required={required} autoComplete="off" enterKeyHint="next"
          style={{ width: '100%', padding: '12px 40px 12px 12px', border: '3px solid #000', fontSize: '1rem', fontWeight: 500, background: '#fff', boxSizing: 'border-box' }}
        />
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </div>
      {isOpen && (
        <AutocompleteDropdown
          filteredOptions={filteredOptions}
          highlightedIndex={highlightedIndex}
          onOptionClick={handleOptionClick}
          onMouseEnter={setHighlightedIndex}
          value={value}
        />
      )}
    </div>
  );
};

export default CustomAutocomplete;
