
import React from 'react';

interface SmartFinanceIconProps {
  className?: string;
  size?: number;
}

export const SmartFinanceIcon = ({ className = "", size = 32 }: SmartFinanceIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brain outline */}
      <path
        d="M8.5 12C8.5 8.5 11.5 6 15.5 6C17.5 6 19.2 6.8 20.3 8.1C21.2 7.4 22.3 7 23.5 7C26.5 7 29 9.5 29 12.5C29 14.2 28.2 15.7 27 16.7C27 17.1 27 17.5 27 18C27 22.4 23.4 26 19 26H13C8.6 26 5 22.4 5 18C5 16.5 5.4 15.1 6.1 13.9C7.1 12.7 7.7 12.3 8.5 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Brain inner details */}
      <path
        d="M10 14C10.5 13.5 11.2 13.2 12 13.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M22 15C21.5 14.5 20.8 14.2 20 14.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M12 20C12.5 19.5 13.2 19.2 14 19.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M20 21C19.5 20.5 18.8 20.2 18 20.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Dollar sign */}
      <g transform="translate(16, 16)">
        {/* Vertical line */}
        <line
          x1="0"
          y1="-6"
          x2="0"
          y2="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* S shape */}
        <path
          d="M-2.5 -3.5C-2.5 -4.3 -1.8 -5 -1 -5H1C1.8 -5 2.5 -4.3 2.5 -3.5C2.5 -2.7 1.8 -2 1 -2H-1C-1.8 -2 -2.5 -1.3 -2.5 -0.5C-2.5 0.3 -1.8 1 -1 1H1C1.8 1 2.5 1.7 2.5 2.5C2.5 3.3 1.8 4 1 4H-1C-1.8 4 -2.5 3.3 -2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      
      {/* Subtle glow effect */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};
