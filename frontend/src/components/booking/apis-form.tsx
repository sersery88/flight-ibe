import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { Input, Label, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useBookingStore, type TravelerData } from '@/stores/booking-store';

// ============================================================================
// APIS Form - Passport/Travel Document Entry for International Flights
// ============================================================================

const apisSchema = z.object({
  documentType: z.enum(['PASSPORT', 'IDENTITY_CARD']),
  number: z.string().min(5, 'Dokumentnummer erforderlich').max(20),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: JJJJ-MM-TT'),
  issuanceCountry: z.string().length(2, '2-Buchstaben Ländercode'),
  nationality: z.string().length(2, '2-Buchstaben Ländercode'),
});

type APISFormData = z.infer<typeof apisSchema>;

interface APISFormProps {
  travelerIndex: number;
  traveler: TravelerData;
  className?: string;
}

export function APISForm({ travelerIndex, traveler, className }: APISFormProps) {
  const { updateTraveler } = useBookingStore();

  const {
    register,
    formState: { errors },
    watch,
  } = useForm<APISFormData>({
    resolver: zodResolver(apisSchema),
    defaultValues: {
      documentType: traveler.document?.type || 'PASSPORT',
      number: traveler.document?.number || '',
      expiryDate: traveler.document?.expiryDate || '',
      issuanceCountry: traveler.document?.issuanceCountry || 'DE',
      nationality: traveler.document?.nationality || 'DE',
    },
  });

  const onBlur = () => {
    const values = watch();
    updateTraveler(travelerIndex, {
      document: {
        type: values.documentType,
        number: values.number,
        expiryDate: values.expiryDate,
        issuanceCountry: values.issuanceCountry,
        nationality: values.nationality,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('p-6', className)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold">Reisedokumente</h3>
            <p className="text-sm text-gray-500">
              {traveler.firstName} {traveler.lastName}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Document Type */}
          <div className="md:col-span-2">
            <Label>Dokumenttyp</Label>
            <div className="mt-1 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value="PASSPORT" {...register('documentType')} onBlur={onBlur}
                  className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600" />
                <span>Reisepass</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value="IDENTITY_CARD" {...register('documentType')} onBlur={onBlur}
                  className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600" />
                <span>Personalausweis</span>
              </label>
            </div>
          </div>

          {/* Document Number */}
          <div>
            <Label htmlFor={`docNumber-${travelerIndex}`}>Dokumentnummer</Label>
            <Input id={`docNumber-${travelerIndex}`} {...register('number')} onBlur={onBlur}
              placeholder="C01X00T47" className={cn('uppercase', errors.number && 'border-red-500')} />
            {errors.number && <p className="mt-1 text-xs text-red-500">{errors.number.message}</p>}
          </div>

          {/* Expiry Date */}
          <div>
            <Label htmlFor={`docExpiry-${travelerIndex}`}>Gültig bis</Label>
            <Input id={`docExpiry-${travelerIndex}`} type="date" {...register('expiryDate')} onBlur={onBlur}
              className={errors.expiryDate ? 'border-red-500' : ''} />
            {errors.expiryDate && <p className="mt-1 text-xs text-red-500">{errors.expiryDate.message}</p>}
          </div>

          {/* Issuance Country */}
          <div>
            <Label htmlFor={`issuanceCountry-${travelerIndex}`}>Ausstellungsland</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input id={`issuanceCountry-${travelerIndex}`} {...register('issuanceCountry')} onBlur={onBlur}
                placeholder="DE" maxLength={2}
                className={cn('pl-10 uppercase', errors.issuanceCountry && 'border-red-500')} />
            </div>
            {errors.issuanceCountry && <p className="mt-1 text-xs text-red-500">{errors.issuanceCountry.message}</p>}
          </div>

          {/* Nationality */}
          <div>
            <Label htmlFor={`nationality-${travelerIndex}`}>Staatsangehörigkeit</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input id={`nationality-${travelerIndex}`} {...register('nationality')} onBlur={onBlur}
                placeholder="DE" maxLength={2}
                className={cn('pl-10 uppercase', errors.nationality && 'border-red-500')} />
            </div>
            {errors.nationality && <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>}
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Diese Informationen werden für internationale Flüge benötigt (APIS - Advance Passenger Information System).
        </p>
      </Card>
    </motion.div>
  );
}

