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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button variant="wellness" onClick={() => navigate('/auth')}>
              Register Company
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-wellness-teal-light via-background to-wellness-coral-light opacity-50" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Corporate Wellness,{' '}
                <span className="text-primary">Reimagined</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                Connect your employees with certified wellness specialists. 
                Easy booking, flexible scheduling, and measurable results 
                for happier, healthier teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="wellness" 
                  size="xl"
                  onClick={() => navigate('/auth')}
                  className="group"
                >
                  Register Your Company
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="xl"
                  onClick={() => navigate('/auth')}
                >
                  Employee Login
                </Button>
              </div>
            </div>

            {/* Hero Image & Stats */}
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden shadow-wellness">
                <img 
                  src={heroImage} 
                  alt="Corporate wellness space with employees practicing mindfulness" 
                  className="w-full h-64 md:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                  <Card 
                    key={stat.label}
                    className="border-0 shadow-soft hover:shadow-wellness transition-all duration-300"
                  >
                    <CardContent className="p-4 text-center">
                      <stat.icon className="text-primary mx-auto mb-2" size={20} />
                      <p className="text-xl md:text-2xl font-bold text-primary">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
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