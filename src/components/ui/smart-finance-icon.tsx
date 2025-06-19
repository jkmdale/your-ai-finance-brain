
import React from 'react';

interface SmartFinanceIconProps {
  className?: string;
  size?: number;
}

export const SmartFinanceIcon = ({ className = "", size = 32 }: SmartFinanceIconProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <defs>
          {/* Teal to blue gradient for the brain */}
          <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#20B2AA" />
            <stop offset="50%" stopColor="#008B8B" />
            <stop offset="100%" stopColor="#006400" />
          </linearGradient>
          
          {/* Glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main brain outline matching uploaded logo */}
        <path
          d="M25 35C25 28 30 22 37 22C40 22 43 23 45 25C47 23 50 22 53 22C60 22 65 28 65 35C68 36 70 39 70 43C70 48 66 52 61 52C60 52 59 52 58 51C59 54 59 57 58 60C56 66 51 70 45 70C42 70 39 69 37 67C35 69 32 70 29 70C23 70 18 66 16 60C15 57 15 54 16 51C15 52 14 52 13 52C8 52 4 48 4 43C4 39 6 36 9 35C9 28 14 22 21 22C24 22 27 23 29 25C31 23 34 22 37 22"
          fill="url(#brainGradient)"
          filter="url(#glow)"
        />
        
        {/* Brain texture lines */}
        <path
          d="M30 30C32 28 35 29 37 31"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M53 30C55 28 58 29 60 31"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M28 40C30 38 33 39 35 41"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M55 40C57 38 60 39 62 41"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M25 50C27 48 30 49 32 51"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M58 50C60 48 63 49 65 51"
          stroke="#006400"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Central dollar sign */}
        <g transform="translate(37, 46)">
          {/* Vertical line of dollar sign */}
          <line
            x1="0"
            y1="-14"
            x2="0"
            y2="14"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          
          {/* S shape for dollar sign */}
          <path
            d="M-8 -10C-8 -13 -5 -14 0 -14C5 -14 8 -13 8 -10C8 -7 5 -5 0 -5C-5 -5 -8 -3 -8 0C-8 3 -5 5 0 5C5 5 8 3 8 0"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
