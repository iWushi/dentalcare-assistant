import React from 'react';

const AppIcon = () => {
  return (
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#0D9488"/>
      <g transform="translate(512, 512) scale(0.85) translate(-512, -512)">
        {/* Main Tooth Outline (Stylized/Artistic) */}
        <path d="M280 360 C280 220 380 160 512 160 C644 160 744 220 744 360 C744 520 700 600 660 680 L620 840 C610 880 560 880 550 840 L512 760 L474 840 C464 880 414 880 404 840 L364 680 C324 600 280 520 280 360 Z" 
              stroke="white" stroke-width="50" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        
        {/* Artistic "Smile" / Highlight Line to give it the sketch feel */}
        <path d="M360 360 C360 360 410 300 512 300 C614 300 664 360 664 360" 
              stroke="white" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.4"/>
      </g>
    </svg>
  );
};

export default AppIcon;