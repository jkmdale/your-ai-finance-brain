
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
          {/* Gradient definitions for the brain colors */}
          <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60E6E6" />
            <stop offset="30%" stopColor="#4DD0E1" />
            <stop offset="60%" stopColor="#42A5F5" />
            <stop offset="100%" stopColor="#7E57C2" />
          </linearGradient>
          
          <linearGradient id="dollarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E1F5FE" />
            <stop offset="50%" stopColor="#B3E5FC" />
            <stop offset="100%" stopColor="#81C784" />
          </linearGradient>

          {/* Glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Brain outline - main shape */}
        <path
          d="M25 35C25 25 30 20 40 20C45 20 49 22 52 25C55 22 59 20 64 20C74 20 79 25 79 35C79 40 77 44 74 47C74 48 74 49 74 50C74 65 65 75 50 75C35 75 26 65 26 50C26 45 26.5 40 28 36C26.5 37 25 36 25 35Z"
          stroke="url(#brainGradient)"
          strokeWidth="3"
          fill="none"
          filter="url(#glow)"
        />
        
        {/* Brain segments - left hemisphere */}
        <path
          d="M30 30C32 28 35 27 38 29"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M28 40C30 38 33 37 36 39"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M30 50C32 48 35 47 38 49"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M32 60C34 58 37 57 40 59"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        
        {/* Brain segments - right hemisphere */}
        <path
          d="M70 30C68 28 65 27 62 29"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M72 40C70 38 67 37 64 39"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M70 50C68 48 65 47 62 49"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M68 60C66 58 63 57 60 59"
          stroke="url(#brainGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        
        {/* Central division line */}
        <path
          d="M50 25C50 30 50 35 50 70"
          stroke="url(#brainGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
        
        {/* Dollar sign - centered */}
        <g transform="translate(50, 47.5)">
          {/* Vertical line */}
          <line
            x1="0"
            y1="-12"
            x2="0"
            y2="12"
            stroke="url(#dollarGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* S shape for dollar sign */}
          <path
            d="M-8 -8C-8 -12 -4 -14 0 -14C4 -14 8 -12 8 -8C8 -4 4 -2 0 -2C-4 -2 -8 0 -8 4C-8 8 -4 10 0 10C4 10 8 8 8 4"
            stroke="url(#dollarGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        
        {/* Subtle accent dots */}
        <circle cx="35" cy="32" r="1.5" fill="url(#brainGradient)" opacity="0.6" />
        <circle cx="65" cy="38" r="1" fill="url(#brainGradient)" opacity="0.5" />
        <circle cx="40" cy="65" r="1" fill="url(#brainGradient)" opacity="0.4" />
        <circle cx="60" cy="62" r="1.5" fill="url(#brainGradient)" opacity="0.6" />
      </svg>
    </div>
  );
};
