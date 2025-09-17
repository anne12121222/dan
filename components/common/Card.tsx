
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
