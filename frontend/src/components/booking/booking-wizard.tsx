import { Check, User, Armchair, Gift, CreditCard, ClipboardCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking-store';

// ============================================================================
// Booking Wizard - Multi-Step Progress Indicator
// ============================================================================

type BookingStep = 'travelers' | 'seats' | 'ancillaries' | 'payment' | 'review' | 'confirmation';

const STEPS: { id: BookingStep; label: string; icon: React.ReactNode }[] = [
  { id: 'travelers', label: 'Reisende', icon: <User className="h-5 w-5" /> },
  { id: 'seats', label: 'Sitze', icon: <Armchair className="h-5 w-5" /> },
  { id: 'ancillaries', label: 'Extras', icon: <Gift className="h-5 w-5" /> },
  { id: 'payment', label: 'Zahlung', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'review', label: 'Prüfen', icon: <ClipboardCheck className="h-5 w-5" /> },
];

interface BookingWizardProps {
  className?: string;
}

export function BookingWizard({ className }: BookingWizardProps) {
  const { currentStep, setStep } = useBookingStore();
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Steps */}
      <div className="hidden md:flex">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = index <= currentIndex;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              {/* Step */}
              <button
                onClick={() => isClickable && setStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center gap-2 transition-all',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
              >
                <motion.div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted && 'border-green-500 bg-green-500 text-white',
                    isCurrent && 'border-pink-500 bg-pink-500 text-white',
                    !isCompleted && !isCurrent && 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                  )}
                  whileHover={isClickable ? { scale: 1.05 } : undefined}
                  whileTap={isClickable ? { scale: 0.95 } : undefined}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.icon}
                </motion.div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-pink-500 dark:text-pink-400',
                    isCompleted && 'text-green-600 dark:text-green-400',
                    !isCurrent && !isCompleted && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector */}
              {index < STEPS.length - 1 && (
                <div className="relative mx-2 h-0.5 flex-1">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Steps */}
      <div className="flex items-center justify-between md:hidden">
        <span className="text-sm text-gray-500">
          Schritt {currentIndex + 1} von {STEPS.length}
        </span>
        <div className="flex items-center gap-2">
          {STEPS[currentIndex]?.icon}
          <span className="font-medium">{STEPS[currentIndex]?.label}</span>
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200 md:hidden dark:bg-gray-700">
        <motion.div
          className="h-full bg-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

