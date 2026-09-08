import React from 'react';

interface ScoreRingProps {
  score: number;
  initialScore?: number;
  size?: number;
  strokeWidth?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score = 0,
  initialScore,
  size = 140,
  strokeWidth = 10
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let color = '#f43f5e'; // Critical
  let grade = 'Poor';
  if (safeScore >= 90) {
    color = '#10b981';
    grade = 'Excellent';
  } else if (safeScore >= 75) {
    color = '#06b6d4';
    grade = 'Good';
  } else if (safeScore >= 60) {
    color = '#f59e0b';
    grade = 'Needs Work';
  }

  const delta = initialScore !== undefined ? safeScore - initialScore : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>
      
      {/* Center Label */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
          {safeScore}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color, textTransform: 'uppercase', marginTop: 4 }}>
          {grade}
        </span>
      </div>

      {delta > 0 && (
        <div style={{
          marginTop: 8,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.15)',
          padding: '2px 8px',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          +{delta} pts improved
        </div>
      )}
    </div>
  );
};
