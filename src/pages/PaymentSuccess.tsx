import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    verifySubscription();
  }, [user]);

  const verifySubscription = async () => {
    if (!user) {
      setVerifying(false);
      return;
    }

    try {
      // Call check-subscription to update company status
      await supabase.functions.invoke('check-subscription');
    } catch (error) {
      console.error('Error verifying subscription:', error);
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full py-6 px-8">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your company subscription is now active. You can now invite employees to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifying ? (
              <p className="text-sm text-muted-foreground">Verifying subscription...</p>
            ) : (
              <Button 
                variant="wellness" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/complete-profile')}
              >
                Complete Your Profile
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentSuccess;
