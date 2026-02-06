// PIN input component for local auth

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PinInput({ 
  length = 4, 
  onComplete, 
  error = false, 
  disabled = false,
  className 
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on error
  useEffect(() => {
    if (error) {
      setValues(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [error, length]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValues.every(v => v !== '')) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      const newValues = [...values];
      newValues[index - 1] = '';
      setValues(newValues);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, length).split('');
    
    if (digits.length > 0) {
      const newValues = [...values];
      digits.forEach((digit, i) => {
        if (i < length) {
          newValues[i] = digit;
        }
      });
      setValues(newValues);
      
      // Focus appropriate input
      const nextEmptyIndex = newValues.findIndex(v => v === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[length - 1]?.blur();
        onComplete(newValues.join(''));
      }
    }
  };

  return (
    <div className={cn('flex gap-3 justify-center', className)}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value}
          disabled={disabled}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            'pin-input',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20 animate-shake',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}
