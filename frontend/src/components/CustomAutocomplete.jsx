import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom Autocomplete Component
 * 
 * A brutalist-styled autocomplete dropdown that matches the app's design system
 * with thick borders, clear white background, and proper keyboard navigation.
 */
const CustomAutocomplete = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  label = null,
  required = false,
  onSelect = null,  // called when user picks from dropdown (receives selected value)
  onEnter = null    // called when user presses Enter without selecting from dropdown
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on input value
  useEffect(() => {
    if (value) {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleOptionClick = (option) => {
    if (onSelect) {
      onSelect(option);
    } else {
      onChange(option);
    }
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (onEnter) {
          onEnter();
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 700,
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label} {required && <span style={{ color: '#FF0000' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          enterKeyHint="next"
          style={{
            width: '100%',
            padding: '12px 40px 12px 12px',
            border: '3px solid #000',
            fontSize: '1rem',
            fontWeight: 500,
            background: '#fff',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          transition: 'transform 0.2s ease'
        }}>
          <ChevronDown 
            size={20} 
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          border: '3px solid #000',
          background: '#fff',
          maxHeight: '240px',
          overflowY: 'auto',
          zIndex: 2000,
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 1)'
        }}>
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '1rem',
                background: highlightedIndex === index ? '#FFD500' : '#fff',
                borderBottom: index < filteredOptions.length - 1 ? '2px solid #000' : 'none',
                transition: 'background 0.1s ease'
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredOptions.length === 0 && value && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          border: '3px solid #000',
          background: '#fff',
          padding: '12px',
          zIndex: 2000,
          color: '#666',
          fontStyle: 'italic'
        }}>
          No matches found
        </div>
      )}
    </div>
  );
};

export default CustomAutocomplete;
