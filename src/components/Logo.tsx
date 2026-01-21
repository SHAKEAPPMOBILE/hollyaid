import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import hollyaidLogo from '@/assets/hollyaid-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  clickable?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', clickable = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sizes = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-16',
  };

  const handleClick = () => {
    if (!clickable) return;
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <img 
      src={hollyaidLogo} 
      alt="Hollyaid" 
      className={`${sizes[size]} w-auto transition-transform duration-200 ${clickable ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
      onClick={handleClick}
    />
  );
};

export default Logo;