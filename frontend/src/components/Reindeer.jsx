import React, { useState, useEffect, useRef } from 'react';

const Reindeer = () => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: 100 });
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [followMouse, setFollowMouse] = useState(true);
  const mousePos = useRef({ x: 0, y: 0 });

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Reindeer animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        let newDirection = direction;

        if (followMouse) {
          // Follow mouse with smooth movement
          const targetX = mousePos.current.x;
          const targetY = mousePos.current.y;
          
          newX = prev.x + (targetX - prev.x) * 0.1; // Smooth interpolation
          newY = prev.y + (targetY - prev.y) * 0.1;
          
          // Update direction based on mouse position
          newDirection = targetX > prev.x ? 1 : -1;
        } else {
          // Run across screen
          newX = prev.x + direction * 5;
          
          // Bounce at edges
          if (newX > window.innerWidth) {
            newX = window.innerWidth;
            newDirection = -1;
          } else if (newX < 0) {
            newX = 0;
            newDirection = 1;
          }
        }

        setDirection(newDirection);
        return { x: newX, y: newY };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [direction, followMouse]);

  // Toggle between running and following mouse
  const toggleMode = () => {
    setFollowMouse(!followMouse);
  };

  return (
    <>
      <style>{`
        @keyframes run {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1); }
        }
        
        @keyframes jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .reindeer-container {
          position: fixed;
          pointer-events: none;
          font-size: 80px;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
          animation: jump 0.6s ease-in-out infinite;
          cursor: pointer;
          z-index: 50;
        }

        .reindeer-container.flipped {
          transform: scaleX(-1);
        }

        .reindeer-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 10px 15px;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          z-index: 40;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .reindeer-toggle:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        .reindeer-toggle:active {
          transform: scale(0.95);
        }
      `}</style>

      <div
        className={`reindeer-container ${direction === -1 ? 'flipped' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) ${direction === -1 ? 'scaleX(-1)' : 'scaleX(1)'}`
        }}
      >
        🦌
      </div>

      <button
        onClick={toggleMode}
        className="reindeer-toggle"
        title={followMouse ? 'Click to make it run' : 'Click to follow mouse'}
      >
        {followMouse ? '🎄 Following' : '🏃 Running'}
      </button>
    </>
  );
};

export default Reindeer;
