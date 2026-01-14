import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, Users, Building2, Calendar, Shield, 
  Globe, TrendingUp, Sparkles, ArrowRight
} from 'lucide-react';
import heroImage from '@/assets/hero-wellness.jpg';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { value: '500+', label: 'Companies Waiting', icon: Building2 },
    { value: '50+', label: 'Target Countries', icon: Globe },
    { value: '10k+', label: 'Lives to Improve', icon: Heart },
  ];

  const companyBenefits = [
    {
      icon: TrendingUp,
      title: 'Improve Employee Well-Being',
      description: 'Offer proactive, holistic care that supports mental, emotional, and physical wellness.',
    },
    {
      icon: Shield,
      title: 'Reduce Healthcare Costs',
      description: 'Preventive wellness programs can significantly lower long-term healthcare expenses.',
    },
    {
      icon: Users,
      title: 'Boost Team Productivity',
      description: 'Healthy, happy employees are more engaged and perform better.',
    },
    {
      icon: Calendar,
      title: 'Easy Management',
      description: 'Invite up to 100 employees and manage their wellness journey from one dashboard.',
    },
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
                {stats.map((stat, index) => (
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

      {/* Why Join Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Companies Choose <span className="text-primary">WellnessHub</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Elevate your workplace well-being with tailored, holistic care your teams will actually use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyBenefits.map((benefit, index) => (
              <Card 
                key={benefit.title}
                className="border-0 shadow-soft hover:shadow-wellness transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit">
                    <benefit.icon className="text-primary" size={28} />
                  </div>
                  <h3 className="font-semibold text-lg">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your team started with wellness in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Register Your Company', description: 'Sign up with your company email and complete the quick onboarding process.' },
              { step: '2', title: 'Invite Your Team', description: 'Add up to 100 employees to your wellness platform with a simple invitation.' },
              { step: '3', title: 'Start Booking', description: 'Employees browse specialists and book consultations that fit their schedule.' },
            ].map((item, index) => (
              <div key={item.step} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto shadow-wellness">
                  {item.step}
                </div>
                <h3 className="font-semibold text-xl">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Workplace?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join hundreds of companies already prioritizing employee wellness. 
            Start your journey today.
          </p>
          <Button 
            variant="coral" 
            size="xl"
            onClick={() => navigate('/auth')}
            className="bg-background text-foreground hover:bg-background/90"
          >
            Get Started Now
            <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2026 WellnessHub. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;