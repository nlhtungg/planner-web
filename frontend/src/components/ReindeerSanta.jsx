import React, { useState, useEffect } from 'react';

const ReindeerSanta = () => {
  // Giới hạn vùng chạy: từ 80px bên trái (không chạy sang ngoài cùng) đến 320px từ phải
  const TRACK_LEFT = 80;
  const TRACK_RIGHT = window.innerWidth - 320;
  const TRACK_TOP = 75; // Vị trí trên header
  
  const [x, setX] = useState(TRACK_RIGHT);
  const [direction, setDirection] = useState(-1); // -1: sang trái, 1: sang phải

  useEffect(() => {
    const run = () => {
      setX(prev => {
        let next = prev + direction * 3; // Tốc độ chạy
        
        // Đổi hướng khi chạm biên (không ra ngoài cùng bên trái)
        if (next < TRACK_LEFT) {
          setDirection(1);
          return TRACK_LEFT;
        }
        if (next > TRACK_RIGHT) {
          setDirection(-1);
          return TRACK_RIGHT;
        }
        return next;
      });
    };
    
    const interval = setInterval(run, 30);
    return () => clearInterval(interval);
  }, [direction, TRACK_RIGHT]);

  return (
    <>
      <style>{`
        .reindeer-santa-wrapper {
          position: fixed;
          top: ${TRACK_TOP}px;
          left: 0;
          z-index: 9999;
          pointer-events: none;
        }
        
        .reindeer-santa {
          display: flex;
          align-items: center;
          gap: 4px;
          filter: drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3));
          animation: bounce 0.5s ease-in-out infinite;
        }
        
        .reindeer-santa.flipped {
          flex-direction: row-reverse;
        }
        
        .reindeer {
          font-size: 36px;
          animation: run 0.3s infinite;
        }
        
        .sled {
          font-size: 24px;
        }
        
        .santa {
          font-size: 32px;
          animation: wave 1s infinite;
        }
        
        .bells {
          font-size: 18px;
          margin: 0 2px;
          animation: jingle 0.5s infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes run {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.05); }
        }
        
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        
        @keyframes jingle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(10deg) scale(1.1); }
        }
      `}</style>
      
      <div className="reindeer-santa-wrapper" style={{ left: x }}>
        <div className={`reindeer-santa${direction === -1 ? ' flipped' : ''}`}>
          <span className="reindeer">🦌</span>
          <span className="bells">🔔</span>
          <span className="sled">🛷</span>
          <span className="santa">🎅</span>
          <span className="bells">🔔</span>
        </div>
      </div>
    </>
  );
};

export default ReindeerSanta;
