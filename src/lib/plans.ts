// Wellness Plans Configuration
export const WELLNESS_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 340,
    minutes: 500,
    hours: 8.3,
    priceId: 'price_1SqEi7GdNaB1L9YZi2z1wViF',
    productId: 'prod_TnqOv9nQuyjGf6',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 950,
    minutes: 1500,
    hours: 25,
    priceId: 'price_1SqEiJGdNaB1L9YZCJqfjMTg',
    productId: 'prod_TnqPkq4mEodBDu',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 1850,
    minutes: 3600,
    hours: 60,
    priceId: 'price_1SqEiVGdNaB1L9YZBSASxzco',
    productId: 'prod_TnqPblqQcc6hnM',
  },
} as const;

// Specialist Rate Tiers
export const SPECIALIST_TIERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    hourlyRate: 25,
    platformFee: 5,
    specialistGets: 20,
    minuteMultiplier: 1.0, // 60 mins = 60 mins used
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    hourlyRate: 40,
    platformFee: 8,
    specialistGets: 32,
    minuteMultiplier: 1.6, // 60 mins = 96 mins used
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    hourlyRate: 60,
    platformFee: 12,
    specialistGets: 48,
    minuteMultiplier: 2.4, // 60 mins = 144 mins used
  },
  master: {
    id: 'master',
    name: 'Master',
    hourlyRate: 80,
    platformFee: 16,
    specialistGets: 64,
    minuteMultiplier: 3.2, // 60 mins = 192 mins used
  },
} as const;

export type PlanType = keyof typeof WELLNESS_PLANS;
export type SpecialistTier = keyof typeof SPECIALIST_TIERS;

// Array format for easy iteration
export const PLANS = Object.values(WELLNESS_PLANS);

// Test account domains that bypass Stripe payment
export const TEST_ACCOUNT_DOMAINS = ['hollyaid.com', 'shakeapp.today'];

export const isTestAccountEmail = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  return TEST_ACCOUNT_DOMAINS.includes(domain);
};
