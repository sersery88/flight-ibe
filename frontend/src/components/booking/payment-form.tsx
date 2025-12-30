import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input, Label, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking-store';

// ============================================================================
// Payment Form - Credit Card Entry with Zod validation
// ============================================================================

const paymentSchema = z.object({
  holderName: z.string().min(3, 'Name des Karteninhabers erforderlich'),
  number: z.string().regex(/^\d{16}$/, '16 Ziffern erforderlich'),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'MM Format'),
  expiryYear: z.string().regex(/^\d{2}$/, 'JJ Format'),
  cvv: z.string().regex(/^\d{3,4}$/, '3-4 Ziffern'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSubmit: () => void;
  className?: string;
}

export function PaymentForm({ onSubmit, className }: PaymentFormProps) {
  const { setPayment, payment } = useBookingStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      holderName: payment?.creditCard?.holderName || '',
      number: payment?.creditCard?.number || '',
      expiryMonth: payment?.creditCard?.expiryMonth || '',
      expiryYear: payment?.creditCard?.expiryYear || '',
      cvv: payment?.creditCard?.cvv || '',
    },
  });

  const cardNumber = watch('number');
  const cardBrand = getCardBrand(cardNumber);

  const onFormSubmit = (data: PaymentFormData) => {
    setPayment({
      method: 'CREDIT_CARD',
      creditCard: {
        brand: cardBrand,
        ...data,
      },
    });
    onSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        {/* Card Preview */}
        <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white">
          <div className="absolute right-6 top-6">
            <CardBrandLogo brand={cardBrand} />
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="mb-4 font-mono text-xl tracking-widest">
              {formatCardNumber(cardNumber)}
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-xs text-gray-400">KARTENINHABER</div>
                <div>{watch('holderName') || 'IHR NAME'}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">GÜLTIG BIS</div>
                <div>{watch('expiryMonth') || 'MM'}/{watch('expiryYear') || 'JJ'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6">
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Lock className="h-4 w-4" />
            <span>Sichere Zahlung - Ihre Daten sind verschlüsselt</span>
          </div>

          <div className="grid gap-4">
            {/* Card Holder */}
            <div>
              <Label htmlFor="holderName">Name des Karteninhabers</Label>
              <Input id="holderName" {...register('holderName')} placeholder="MAX MUSTERMANN"
                className={cn('uppercase', errors.holderName && 'border-red-500')} />
              {errors.holderName && <p className="mt-1 text-xs text-red-500">{errors.holderName.message}</p>}
            </div>

            {/* Card Number */}
            <div>
              <Label htmlFor="number">Kartennummer</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input id="number" {...register('number')} placeholder="1234 5678 9012 3456" maxLength={16}
                  className={cn('pl-10 font-mono', errors.number && 'border-red-500')} />
              </div>
              {errors.number && <p className="mt-1 text-xs text-red-500">{errors.number.message}</p>}
            </div>

            {/* Expiry & CVV */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Monat</Label>
                <Input id="expiryMonth" {...register('expiryMonth')} placeholder="MM" maxLength={2}
                  className={cn('text-center font-mono', errors.expiryMonth && 'border-red-500')} />
              </div>
              <div>
                <Label htmlFor="expiryYear">Jahr</Label>
                <Input id="expiryYear" {...register('expiryYear')} placeholder="JJ" maxLength={2}
                  className={cn('text-center font-mono', errors.expiryYear && 'border-red-500')} />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" {...register('cvv')} type="password" placeholder="•••" maxLength={4}
                  className={cn('text-center font-mono', errors.cvv && 'border-red-500')} />
              </div>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" size="lg" disabled={!isValid}>
            Weiter zur Überprüfung
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}

// Helper functions
function getCardBrand(number: string): string {
  if (/^4/.test(number)) return 'VISA';
  if (/^5[1-5]/.test(number)) return 'MASTERCARD';
  if (/^3[47]/.test(number)) return 'AMEX';
  return 'UNKNOWN';
}

function formatCardNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '').padEnd(16, '•');
  return cleaned.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
}

function CardBrandLogo({ brand }: { brand: string }) {
  const logos: Record<string, string> = {
    VISA: 'VISA',
    MASTERCARD: 'MC',
    AMEX: 'AMEX',
  };
  return (
    <div className="rounded bg-white/20 px-2 py-1 text-sm font-bold">
      {logos[brand] || '💳'}
    </div>
  );
}

