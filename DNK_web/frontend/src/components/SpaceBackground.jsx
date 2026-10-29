import React from 'react';
import '../styles/App.css';

const SpaceBackground = () => {
  return (
    <div className="space-background-container">
      <div className="galaxy-container">
        <div className="galaxy"></div>
      </div>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      <div className="space-station space-station-3"></div>
      <div className="space-particles">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SpaceBackground;
