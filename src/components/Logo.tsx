import React from 'react';
import hollyaidLogo from '@/assets/hollyaid-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <img 
      src={hollyaidLogo} 
      alt="Hollyaid" 
      className={`${sizes[size]} w-auto ${className}`}
    />
  );
};

export default Logo;