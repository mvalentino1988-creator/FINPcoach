import React, { useRef, useState, useEffect } from 'react';

interface MarqueeProps {
  text: string;
  className?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap relative flex items-center ${className}`}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      title={text}
    >
      <div
        ref={textRef}
        className={`inline-block ${isOverflowing && !paused ? 'animate-marquee' : ''}`}
        style={{
          willChange: 'transform',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {text}
      </div>
      {isOverflowing && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-surface-container-lowest to-transparent pointer-events-none" />
      )}
    </div>
  );
};
