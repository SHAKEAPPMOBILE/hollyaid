import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, Building2, Globe, ArrowRight } from 'lucide-react';
import heroImage from '@/assets/hero-wellness.jpg';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { value: '500+', label: 'Companies Waiting', icon: Building2 },
    { value: '50+', label: 'Target Countries', icon: Globe },
    { value: '10k+', label: 'Lives to Improve', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <Logo size="md" className="flex-shrink-0" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button variant="wellness" size="sm" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap" onClick={() => navigate('/auth')}>
              <span className="hidden sm:inline">Register Company</span>
              <span className="sm:hidden">Register</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-wellness-teal-light via-background to-wellness-coral-light opacity-50" />
        <div className="container relative px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 md:space-y-8 animate-fade-up">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Corporate Wellness,{' '}
                <span className="text-primary">Reimagined</span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl">
                Connect your employees with certified wellness specialists. 
                Easy booking, flexible scheduling, and measurable results 
                for happier, healthier teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button 
                  variant="wellness" 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="group w-full sm:w-auto"
                >
                  Register Your Company
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto"
                >
                  Employee Login
                </Button>
              </div>
            </div>

            {/* Hero Image & Stats */}
            <div className="space-y-4 md:space-y-6">
              <div className="relative rounded-2xl overflow-hidden shadow-wellness">
                <img 
                  src={heroImage} 
                  alt="Corporate wellness space with employees practicing mindfulness" 
                  className="w-full h-48 sm:h-64 md:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {stats.map((stat) => (
                  <Card 
                    key={stat.label}
                    className="border-0 shadow-soft hover:shadow-wellness transition-all duration-300"
                  >
                    <CardContent className="p-2 sm:p-4 text-center">
                      <stat.icon className="text-primary mx-auto mb-1 sm:mb-2" size={16} />
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;