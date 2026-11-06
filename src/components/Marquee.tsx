import React from 'react';

interface MarqueeProps {
  text: string;
  className?: string;
}

/** Testo sempre statico e troncato: niente scorrimento, più leggibile a bordo vasca. */
export const Marquee: React.FC<MarqueeProps> = ({ text, className = '' }) => (
  <span className={`inline-block max-w-full truncate align-middle ${className}`} title={text}>
    {text}
  </span>
);
