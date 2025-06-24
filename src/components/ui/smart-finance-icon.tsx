
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
        style={{ background: 'transparent' }}
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
        
        {/* Main brain outline - centered and scaled properly */}
        <g transform="translate(50, 50)">
          <path
            d="M-25 -15C-25 -22 -20 -28 -13 -28C-10 -28 -7 -27 -5 -25C-3 -27 0 -28 3 -28C10 -28 15 -22 15 -15C18 -14 20 -11 20 -7C20 -2 16 2 11 2C10 2 9 2 8 1C9 4 9 7 8 10C6 16 1 20 -5 20C-8 20 -11 19 -13 17C-15 19 -18 20 -21 20C-27 20 -32 16 -34 10C-35 7 -35 4 -34 1C-35 2 -36 2 -37 2C-42 2 -46 -2 -46 -7C-46 -11 -44 -14 -41 -15C-41 -22 -36 -28 -29 -28C-26 -28 -23 -27 -21 -25C-19 -27 -16 -28 -13 -28"
            fill="url(#brainGradient)"
            filter="url(#glow)"
          />
          
          {/* Brain texture lines - adjusted for centering */}
          <path
            d="M-20 -20C-18 -22 -15 -21 -13 -19"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M3 -20C5 -22 8 -21 10 -19"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M-22 -10C-20 -12 -17 -11 -15 -9"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M5 -10C7 -12 10 -11 12 -9"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M-25 0C-23 -2 -20 -1 -18 1"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M8 0C10 -2 13 -1 15 1"
            stroke="#006400"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          
          {/* Central dollar sign - centered */}
          <g transform="translate(-13, -4)">
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
        </g>
      </svg>
    </div>
  );
};
