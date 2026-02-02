
import React from 'react';

interface GameBoySVGProps {
  screenContent: React.ReactNode;
  ledOn?: boolean;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

const GameBoySVG: React.FC<GameBoySVGProps> = ({ screenContent, ledOn = true, scale = 1, className = "", onClick }) => {
  const W = 400;
  const H = 650;

  return (
    <div 
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: `${W * scale}px`, height: `${H * scale}px`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full drop-shadow-2xl filter" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6e6e6" />
            <stop offset="100%" stopColor="#c4c4c4" />
          </linearGradient>
          <linearGradient id="lensGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#777777" />
            <stop offset="100%" stopColor="#666666" />
          </linearGradient>
          <radialGradient id="btnGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#bd3866" />
            <stop offset="100%" stopColor="#8b1d42" />
          </radialGradient>
          <linearGradient id="dpadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#333" />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>
          <filter id="bodyShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={`M 20,0 H 380 Q 400,0 400,20 V 580 Q 400,650 330,650 H 20 Q 0,650 0,630 V 20 Q 0,0 20,0 Z`} fill="url(#bodyGrad)" filter="url(#bodyShadow)"/>
        <g opacity="0.1">
           <rect x="20" y="5" width="6" height="30" rx="3" />
           <rect x="374" y="5" width="6" height="30" rx="3" />
           <path d="M 40 15 H 360" stroke="black" strokeWidth="2" />
        </g>
        <path d="M 30,50 H 370 Q 380,50 380,60 V 300 Q 380,330 350,330 H 50 Q 20,330 20,300 V 60 Q 20,50 30,50 Z" fill="url(#lensGrad)" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"/>
        <line x1="40" y1="70" x2="120" y2="70" stroke="#2d2d99" strokeWidth="3" />
        <line x1="280" y1="70" x2="360" y2="70" stroke="#992d5d" strokeWidth="3" />
        <text x="200" y="74" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fontWeight="bold" fill="#ccc" fontStyle="italic" letterSpacing="1">DOT MATRIX WITH STEREO SOUND</text>
        <circle cx="50" cy="140" r="5" fill="#333" />
        <circle cx="50" cy="140" r="4" fill={ledOn ? "#ff3333" : "#444"} opacity={ledOn ? "1" : "0.5"} />
        <text x="50" y="160" textAnchor="middle" fontSize="8" fill="#aaa" fontFamily="sans-serif" fontWeight="bold">BATTERY</text>
        <g transform="translate(30, 380)">
           <text x="0" y="0" fontSize="16" fontFamily="sans-serif" fontWeight="bold" fill="#303095" letterSpacing="0.5">
             Nintendo <tspan fontSize="24" fontFamily="serif" fontStyle="italic" fontWeight="900">GAME BOY</tspan><tspan fontSize="10" dy="-10">TM</tspan>
           </text>
        </g>
        <g transform="translate(60, 450)">
           <rect x="30" y="0" width="30" height="90" rx="4" fill="url(#dpadGrad)" filter="drop-shadow(2px 4px 6px rgba(0,0,0,0.4))" />
           <rect x="0" y="30" width="90" height="30" rx="4" fill="url(#dpadGrad)" />
           <circle cx="45" cy="45" r="10" fill="#1a1a1a" opacity="0.5" />
        </g>
        <g transform="translate(260, 470) rotate(-15)">
           <circle cx="0" cy="40" r="22" fill="url(#btnGrad)" filter="drop-shadow(3px 5px 5px rgba(0,0,0,0.4))" />
           <text x="0" y="80" textAnchor="middle" fontSize="14" fontWeight="900" fill="#303095" fontFamily="sans-serif">B</text>
           <circle cx="70" cy="10" r="22" fill="url(#btnGrad)" filter="drop-shadow(3px 5px 5px rgba(0,0,0,0.4))" />
           <text x="70" y="50" textAnchor="middle" fontSize="14" fontWeight="900" fill="#303095" fontFamily="sans-serif">A</text>
        </g>
        <g transform="translate(130, 600) rotate(-15)">
           <rect x="0" y="0" width="50" height="12" rx="6" fill="#999" stroke="#777" />
           <text x="25" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#303095" fontFamily="sans-serif" letterSpacing="1">SELECT</text>
           <rect x="70" y="0" width="50" height="12" rx="6" fill="#999" stroke="#777" />
           <text x="95" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#303095" fontFamily="sans-serif" letterSpacing="1">START</text>
        </g>
        <g transform="translate(280, 580) rotate(-15)" opacity="0.7">
           {[0, 12, 24, 36, 48, 60].map(x => (
             <rect key={x} x={x} y="0" width="6" height="60" rx="3" fill="#b0b0b0" style={{ filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5)) inset" }} />
           ))}
        </g>
        <text x="100" y="640" fontSize="10" fill="#aaa" fontWeight="bold" fontFamily="sans-serif">PHONES</text>
      </svg>
      <div 
        className="absolute z-10 flex items-center justify-center overflow-hidden bg-[#8bac0f]"
        style={{
            top: `${(80/650)*100}%`,
            left: `${(75/400)*100}%`,
            width: `${(250/400)*100}%`,
            height: `${(210/650)*100}%`,
            boxShadow: 'inset 2px 2px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'none' // Allow click to pass to SVG wrapper
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:3px_3px] pointer-events-none z-10" />
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(48,98,48,0.4)] z-20 pointer-events-none" />
        <div className="relative z-0 w-full h-full text-[#0f380f] font-mono p-2">
            {screenContent}
        </div>
      </div>
    </div>
  );
};

export default GameBoySVG;
