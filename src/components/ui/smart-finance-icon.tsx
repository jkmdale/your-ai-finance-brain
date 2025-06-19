
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
          {/* Teal gradient for the brain */}
          <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
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
        
        {/* Brain outline - main shape matching the uploaded logo */}
        <path
          d="M30 25C30 18 35 12 42 12C46 12 49 14 51 17C53 14 56 12 60 12C67 12 72 18 72 25C72 28 71 30 69 32C72 35 74 39 74 44C74 51 69 57 62 57C60 57 58 56 56 55C54 58 51 60 47 60C43 60 40 58 38 55C36 56 34 57 32 57C25 57 20 51 20 44C20 39 22 35 25 32C23 30 22 28 22 25C22 18 27 12 34 12C36 12 38 13 40 14C42 13 44 12 46 12C48 12 50 13 52 14C54 13 56 12 58 12C65 12 70 18 70 25"
          stroke="url(#brainGradient)"
          strokeWidth="3"
          fill="none"
          filter="url(#glow)"
        />
        
        {/* Brain segments - creating the folded brain texture */}
        <path
          d="M35 22C37 20 40 21 42 23"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M58 22C60 20 63 21 65 23"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M32 32C34 30 37 31 39 33"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M61 32C63 30 66 31 68 33"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M28 42C30 40 33 41 35 43"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M65 42C67 40 70 41 72 43"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M33 50C35 48 38 49 40 51"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M60 50C62 48 65 49 67 51"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Central dollar sign - positioned in the center */}
        <g transform="translate(50, 50)">
          {/* Vertical line of dollar sign */}
          <line
            x1="0"
            y1="-18"
            x2="0"
            y2="18"
            stroke="url(#brainGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          
          {/* S shape for dollar sign */}
          <path
            d="M-10 -12C-10 -16 -6 -18 0 -18C6 -18 10 -16 10 -12C10 -8 6 -6 0 -6C-6 -6 -10 -4 -10 0C-10 4 -6 6 0 6C6 6 10 4 10 0"
            stroke="url(#brainGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
