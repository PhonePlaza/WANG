import React from 'react';

// --- Shared Styles (Based on Tailwind: px-3 py-2 border rounded-md text-base w-[500px]) ---

const BASE_WIDTH = '500px';
const BORDER_RADIUS = '6px'; // Equivalent to rounded-md
const PADDING_VERTICAL = '8px'; // Equivalent to py-2 (8px)
const TEXT_SIZE = '16px'; // Equivalent to text-base (16px)

const groupBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: BASE_WIDTH, // Fixed width
  boxSizing: 'border-box',
  border: '1px solid #D1D5DB', // Light border (default Tailwind border color)
  borderRadius: BORDER_RADIUS,
  backgroundColor: '#FFF', // Default Tailwind input background
  // If you prefer the DARK THEME from the image, use: backgroundColor: '#1E1E1E', border: '1px solid #333'
};

const addonTextStyle: React.CSSProperties = {
  backgroundColor: '#E5E7EB', // Lighter background for Addons (default Tailwind gray-200)
  color: '#4B5563', // Dark text color (default Tailwind gray-600)
  fontSize: TEXT_SIZE,
  padding: `${PADDING_VERTICAL} 12px`, // py-2 (8px) and px-3 (12px)
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  userSelect: 'none',
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flexGrow: 1,
  border: 'none',
  backgroundColor: 'transparent',
  color: '#1F2937', // Dark text color
  fontSize: TEXT_SIZE,
  outline: 'none',
  padding: `${PADDING_VERTICAL} 12px`, // py-2 (8px) and px-3 (12px)
  width: '100%',
};

// --- Sub-components ---

/** 1. Main Container: Wraps the entire group. */
export interface InputGroupProps {
  children: React.ReactNode;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children }) => {
  return (
    <div style={groupBaseStyle}>
      {children}
    </div>
  );
};

/** 2. Addon: Container for Text or other elements on the sides. */
export interface InputGroupAddonProps {
  children: React.ReactNode;
  align?: 'inline-start' | 'inline-end';
}

export const InputGroupAddon: React.FC<InputGroupAddonProps> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {children}
    </div>
  );
};

/** 3. Text: The static text element (like '$' or 'USD') inside the Addon. */
export interface InputGroupTextProps {
  children: React.ReactNode;
}

export const InputGroupText: React.FC<InputGroupTextProps> = ({ children }) => {
  return (
    <span style={addonTextStyle}>
      {children}
    </span>
  );
};

/** 4. Input: The actual text input field. */
export type InputGroupInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const InputGroupInput: React.FC<InputGroupInputProps> = (props) => {
  // We use padding on the input itself. 
  // We remove the border/background/radius since the parent <InputGroup> handles it.
  return (
    <input
      type="text"
      {...props}
      style={{...inputStyle, ...props.style}} // Allow overriding with props.style
    />
  );
};