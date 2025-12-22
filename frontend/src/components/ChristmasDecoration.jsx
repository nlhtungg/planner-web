import React, { useEffect } from 'react';

// Simple snow effect - nhiều tuyết hơn, rơi chậm, ở phía sau
const Snow = () => {
  useEffect(() => {
    const snowflakes = [];
    for (let i = 0; i < 55; i++) {
      const snow = document.createElement('div');
      snow.className = 'snowflake';
      snow.style.left = Math.random() * 100 + 'vw';
      snow.style.animationDuration = 5 + Math.random() * 5 + 's'; // Rơi chậm hơn (5-10s)
      snow.style.opacity = 0.5 + Math.random() * 0.5;
      snow.style.fontSize = 12 + Math.random() * 18 + 'px';
      snow.innerText = '❄️';
      document.body.appendChild(snow);
      snowflakes.push(snow);
    }
    return () => {
      snowflakes.forEach(snow => snow.remove());
    };
  }, []);
  return null;
};

const ChristmasDecoration = () => (
  <>
    <style>{`
      .snowflake {
        position: fixed;
        top: -40px;
        pointer-events: none;
        animation: snow-fall linear infinite;
        z-index: 0;
      }
      @keyframes snow-fall {
        to {
          top: 100vh;
        }
      }
    `}</style>
    <Snow />
  </>
);

export default ChristmasDecoration;
