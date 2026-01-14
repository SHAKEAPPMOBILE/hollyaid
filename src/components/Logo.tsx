import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 28, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-4xl' },
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="gradient-wellness p-2 rounded-xl shadow-wellness">
          <Heart 
            size={sizes[size].icon} 
            className="text-primary-foreground fill-current"
          />
        </div>
        <Sparkles 
          size={sizes[size].icon * 0.4} 
          className="absolute -top-1 -right-1 text-wellness-coral animate-pulse-soft"
        />
      </div>
      {showText && (
        <span className={`font-bold ${sizes[size].text} text-foreground`}>
          Wellness<span className="text-primary">Hub</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
