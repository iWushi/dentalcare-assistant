import React from 'react';

const AppIcon = () => {
  return (
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" rx="220" fill="#F8F8F8"/>
      <defs>
        <linearGradient id="toothGradient" x1="512" y1="200" x2="512" y2="850" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A8A78"/>
          <stop offset="100%" stopColor="#1EA3A3"/>
        </linearGradient>
        <filter id="softShadow" x="200" y="200" width="624" height="624" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="15" stdDeviation="20" floodColor="#000000" floodOpacity="0.15"/>
        </filter>
      </defs>
      
      <g filter="url(#softShadow)">
        <path d="M280 350C280 250 350 200 420 200H604C674 200 744 250 744 350C744 480 720 550 680 620L640 780C630 820 580 840 550 810L512 770L474 810C444 840 394 820 384 780L344 620C304 550 280 480 280 350Z" 
              fill="url(#toothGradient)" />
        
        {/* Soft highlight for glassy feel */}
        <path d="M320 350C320 280 370 240 420 240H604C654 240 704 280 704 350C704 420 690 480 680 500" 
              stroke="white" strokeOpacity="0.2" strokeWidth="10" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export default AppIcon;