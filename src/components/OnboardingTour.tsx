import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target?: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourKey: string; // Unique key to track completion in localStorage
  onComplete?: () => void;
  onSkip?: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  tourKey,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const storageKey = `onboarding_completed_${tourKey}`;

  useEffect(() => {
    // Check if tour was already completed
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const updateTargetPosition = useCallback(() => {
    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (isVisible) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition);
      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition);
      };
    }
  }, [isVisible, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isCenter = !step.target || !targetRect;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCenter) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const position = step.position || 'bottom';

    let style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10001,
      width: tooltipWidth,
    };

    switch (position) {
      case 'top':
        style.left = targetRect!.left + targetRect!.width / 2 - tooltipWidth / 2;
        style.bottom = window.innerHeight - targetRect!.top + padding;
        break;
      case 'bottom':
        style.left = targetRect!.left + targetRect!.width / 2 - tooltipWidth / 2;
        style.top = targetRect!.bottom + padding;
        break;
      case 'left':
        style.right = window.innerWidth - targetRect!.left + padding;
        style.top = targetRect!.top + targetRect!.height / 2 - 60;
        break;
      case 'right':
        style.left = targetRect!.right + padding;
        style.top = targetRect!.top + targetRect!.height / 2 - 60;
        break;
    }

    // Keep tooltip within viewport
    if (typeof style.left === 'number') {
      style.left = Math.max(16, Math.min(style.left, window.innerWidth - tooltipWidth - 16));
    }

    return style;
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[10000] transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Highlight cutout for target element */}
      {targetRect && (
        <div
          className="fixed z-[10000] rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* Tooltip */}
      <Card 
        className="shadow-2xl border-primary/20 animate-in fade-in-0 zoom-in-95 duration-300"
        style={getTooltipStyle()}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-1 -mt-1"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  index === currentStep 
                    ? 'w-4 bg-primary' 
                    : index < currentStep 
                      ? 'w-1.5 bg-primary/50' 
                      : 'w-1.5 bg-muted'
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  'Get Started'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default OnboardingTour;

// Utility function to reset tour (can be called from settings)
export const resetOnboardingTour = (tourKey: string) => {
  localStorage.removeItem(`onboarding_completed_${tourKey}`);
};

export const hasCompletedTour = (tourKey: string): boolean => {
  return localStorage.getItem(`onboarding_completed_${tourKey}`) === 'true';
};
