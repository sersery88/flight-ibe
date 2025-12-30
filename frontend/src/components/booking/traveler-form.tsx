import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, CreditCard, ChevronDown, Baby } from 'lucide-react';
import { motion } from 'motion/react';
import { Input, Label, Card } from '@/components/ui';
import { cn, getTravelerTypeLabel } from '@/lib/utils';
import { useBookingStore, type TravelerData } from '@/stores/booking-store';

// ============================================================================
// Traveler Form - Individual traveler data entry with Zod validation
// ============================================================================

const travelerSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']),
  firstName: z.string().min(2, 'Mindestens 2 Zeichen').max(50),
  lastName: z.string().min(2, 'Mindestens 2 Zeichen').max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: JJJJ-MM-TT'),
  loyaltyProgramOwner: z.string().optional(),
  loyaltyProgramId: z.string().optional(),
});

type TravelerFormData = z.infer<typeof travelerSchema>;

// Common airline loyalty programs
const LOYALTY_PROGRAMS = [
  { code: '', label: 'Kein Vielfliegerprogramm' },
  { code: 'LH', label: 'Miles & More (Lufthansa)' },
  { code: 'OS', label: 'Miles & More (Austrian)' },
  { code: 'LX', label: 'Miles & More (Swiss)' },
  { code: 'SN', label: 'Miles & More (Brussels)' },
  { code: 'AF', label: 'Flying Blue (Air France)' },
  { code: 'KL', label: 'Flying Blue (KLM)' },
  { code: 'BA', label: 'Executive Club (British Airways)' },
  { code: 'IB', label: 'Iberia Plus' },
  { code: 'TK', label: 'Miles&Smiles (Turkish)' },
  { code: 'EK', label: 'Skywards (Emirates)' },
  { code: 'EY', label: 'Guest (Etihad)' },
  { code: 'QR', label: 'Privilege Club (Qatar)' },
  { code: 'SQ', label: 'KrisFlyer (Singapore)' },
  { code: 'CX', label: 'Asia Miles (Cathay)' },
  { code: 'UA', label: 'MileagePlus (United)' },
  { code: 'AA', label: 'AAdvantage (American)' },
  { code: 'DL', label: 'SkyMiles (Delta)' },
];

interface TravelerFormProps {
  index: number;
  traveler: TravelerData;
  isLead?: boolean;
  className?: string;
  // For adults with associated infant
  associatedInfant?: TravelerData;
  infantIndex?: number;
}

// Generate year options (100 years back from today)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
// Infant years - only last 2 years
const infantYears = [currentYear, currentYear - 1, currentYear - 2];
const months = [
  { value: '01', label: 'Januar' },
  { value: '02', label: 'Februar' },
  { value: '03', label: 'März' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

export function TravelerForm({ index, traveler, isLead = false, className, associatedInfant, infantIndex }: TravelerFormProps) {
  const { updateTraveler } = useBookingStore();

  // Parse existing date of birth
  const [dobYear, setDobYear] = useState(() => traveler.dateOfBirth?.split('-')[0] || '');
  const [dobMonth, setDobMonth] = useState(() => traveler.dateOfBirth?.split('-')[1] || '');
  const [dobDay, setDobDay] = useState(() => traveler.dateOfBirth?.split('-')[2] || '');

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    if (!dobYear || !dobMonth) return 31;
    return new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate();
  }, [dobYear, dobMonth]);

  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TravelerFormData>({
    resolver: zodResolver(travelerSchema),
    defaultValues: {
      gender: traveler.gender,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      dateOfBirth: traveler.dateOfBirth,
      loyaltyProgramOwner: traveler.loyaltyProgram?.programOwner || '',
      loyaltyProgramId: traveler.loyaltyProgram?.id || '',
    },
  });

  const onBlur = () => {
    const values = watch();
    updateTraveler(index, {
      ...values,
      loyaltyProgram: values.loyaltyProgramOwner && values.loyaltyProgramId ? {
        programOwner: values.loyaltyProgramOwner,
        id: values.loyaltyProgramId,
      } : undefined,
    });
  };

  const updateDateOfBirth = (year: string, month: string, day: string) => {
    if (year && month && day) {
      const formattedDate = `${year}-${month}-${day.padStart(2, '0')}`;
      setValue('dateOfBirth', formattedDate);
      updateTraveler(index, { dateOfBirth: formattedDate });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn('p-6', className)}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
              <User className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold">Reisender {index + 1}</h3>
              <p className="text-sm text-gray-500">{getTravelerTypeLabel(traveler.type)}</p>
            </div>
          </div>
          {isLead && (
            <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
              Hauptreisender
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Gender */}
          <div className="md:col-span-2">
            <Label>Anrede</Label>
            <div className="mt-1 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value="MALE" {...register('gender')} onBlur={onBlur}
                  className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600" />
                <span>Herr</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value="FEMALE" {...register('gender')} onBlur={onBlur}
                  className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600" />
                <span>Frau</span>
              </label>
            </div>
          </div>

          {/* First Name */}
          <div>
            <Label htmlFor={`firstName-${index}`}>Vorname</Label>
            <Input id={`firstName-${index}`} {...register('firstName')} onBlur={onBlur}
              placeholder="Max" className={errors.firstName ? 'border-red-500' : ''} />
            {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor={`lastName-${index}`}>Nachname</Label>
            <Input id={`lastName-${index}`} {...register('lastName')} onBlur={onBlur}
              placeholder="Mustermann" className={errors.lastName ? 'border-red-500' : ''} />
            {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
          </div>

          {/* Date of Birth - Custom Picker with Year/Month/Day dropdowns */}
          <div className="md:col-span-2">
            <Label>Geburtsdatum</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {/* Day */}
              <div className="relative">
                <select
                  value={dobDay}
                  onChange={(e) => {
                    setDobDay(e.target.value);
                    updateDateOfBirth(dobYear, dobMonth, e.target.value);
                  }}
                  className={cn(
                    'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                    'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                    'dark:border-gray-600 dark:bg-gray-800',
                    errors.dateOfBirth && 'border-red-500'
                  )}
                >
                  <option value="">Tag</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day.toString().padStart(2, '0')}>
                      {day}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Month */}
              <div className="relative">
                <select
                  value={dobMonth}
                  onChange={(e) => {
                    setDobMonth(e.target.value);
                    updateDateOfBirth(dobYear, e.target.value, dobDay);
                  }}
                  className={cn(
                    'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                    'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                    'dark:border-gray-600 dark:bg-gray-800',
                    errors.dateOfBirth && 'border-red-500'
                  )}
                >
                  <option value="">Monat</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Year */}
              <div className="relative">
                <select
                  value={dobYear}
                  onChange={(e) => {
                    setDobYear(e.target.value);
                    updateDateOfBirth(e.target.value, dobMonth, dobDay);
                  }}
                  className={cn(
                    'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                    'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                    'dark:border-gray-600 dark:bg-gray-800',
                    errors.dateOfBirth && 'border-red-500'
                  )}
                >
                  <option value="">Jahr</option>
                  {years.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {errors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p>}
            {/* Hidden input for form validation */}
            <input type="hidden" {...register('dateOfBirth')} />
          </div>

          {/* Frequent Flyer Program - für Erwachsene und Kinder */}
          {(traveler.type === 'ADULT' || traveler.type === 'CHILD') && (
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Vielfliegerprogramm (optional)
              </Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    {...register('loyaltyProgramOwner')}
                    onBlur={onBlur}
                    className={cn(
                      'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                      'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                      'dark:border-gray-600 dark:bg-gray-800'
                    )}
                  >
                    {LOYALTY_PROGRAMS.map((program) => (
                      <option key={program.code} value={program.code}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                <Input
                  {...register('loyaltyProgramId')}
                  onBlur={onBlur}
                  placeholder="Kartennummer"
                  disabled={!watch('loyaltyProgramOwner')}
                  className={cn(!watch('loyaltyProgramOwner') && 'opacity-50')}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Geben Sie Ihre Vielfliegernummer ein, um Meilen zu sammeln und ggf. bessere Sitzplatzoptionen zu erhalten.
              </p>
            </div>
          )}
        </div>

        {/* Associated Infant Section */}
        {associatedInfant && infantIndex !== undefined && (
          <InfantSection infant={associatedInfant} infantIndex={infantIndex} adultLastName={watch('lastName')} />
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Infant Section - Displayed within adult's card
// ============================================================================

interface InfantSectionProps {
  infant: TravelerData;
  infantIndex: number;
  adultLastName: string;
}

function InfantSection({ infant, infantIndex, adultLastName }: InfantSectionProps) {
  const { updateTraveler } = useBookingStore();

  const [dobYear, setDobYear] = useState(() => infant.dateOfBirth?.split('-')[0] || '');
  const [dobMonth, setDobMonth] = useState(() => infant.dateOfBirth?.split('-')[1] || '');
  const [dobDay, setDobDay] = useState(() => infant.dateOfBirth?.split('-')[2] || '');

  const daysInMonth = useMemo(() => {
    if (!dobYear || !dobMonth) return 31;
    return new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate();
  }, [dobYear, dobMonth]);

  const updateInfantField = (field: string, value: string) => {
    updateTraveler(infantIndex, { [field]: value });
  };

  const updateDateOfBirth = (year: string, month: string, day: string) => {
    if (year && month && day) {
      const formattedDate = `${year}-${month}-${day.padStart(2, '0')}`;
      updateTraveler(infantIndex, { dateOfBirth: formattedDate });
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
          <Baby className="h-4 w-4 text-pink-600" />
        </div>
        <div>
          <h4 className="font-medium">Baby (auf dem Schoß)</h4>
          <p className="text-xs text-gray-500">Unter 2 Jahren, reist mit diesem Erwachsenen</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gender */}
        <div className="md:col-span-2">
          <Label>Geschlecht</Label>
          <div className="mt-1 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`infant-gender-${infantIndex}`}
                value="MALE"
                checked={infant.gender === 'MALE'}
                onChange={() => updateInfantField('gender', 'MALE')}
                className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600"
              />
              <span>Männlich</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`infant-gender-${infantIndex}`}
                value="FEMALE"
                checked={infant.gender === 'FEMALE'}
                onChange={() => updateInfantField('gender', 'FEMALE')}
                className="h-4 w-4 border-neutral-300 accent-pink-500 focus:ring-pink-500 dark:border-neutral-600"
              />
              <span>Weiblich</span>
            </label>
          </div>
        </div>

        {/* First Name */}
        <div>
          <Label>Vorname</Label>
          <Input
            value={infant.firstName}
            onChange={(e) => updateInfantField('firstName', e.target.value)}
            placeholder="Vorname des Babys"
          />
        </div>

        {/* Last Name - optional, defaults to adult's last name */}
        <div>
          <Label>Nachname <span className="font-normal text-gray-400">(optional)</span></Label>
          <Input
            value={infant.lastName}
            onChange={(e) => updateInfantField('lastName', e.target.value)}
            placeholder={adultLastName || 'Wie Erwachsener'}
          />
          <p className="mt-1 text-xs text-gray-500">
            Nur ausfüllen, wenn abweichend vom Erwachsenen
          </p>
        </div>

        {/* Date of Birth */}
        <div className="md:col-span-2">
          <Label>Geburtsdatum</Label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {/* Day */}
            <div className="relative">
              <select
                value={dobDay}
                onChange={(e) => {
                  setDobDay(e.target.value);
                  updateDateOfBirth(dobYear, dobMonth, e.target.value);
                }}
                className={cn(
                  'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                  'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                  'dark:border-gray-600 dark:bg-gray-800'
                )}
              >
                <option value="">Tag</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day.toString().padStart(2, '0')}>
                    {day}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Month */}
            <div className="relative">
              <select
                value={dobMonth}
                onChange={(e) => {
                  setDobMonth(e.target.value);
                  updateDateOfBirth(dobYear, e.target.value, dobDay);
                }}
                className={cn(
                  'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                  'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                  'dark:border-gray-600 dark:bg-gray-800'
                )}
              >
                <option value="">Monat</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Year - nur letzte 2 Jahre für Infants */}
            <div className="relative">
              <select
                value={dobYear}
                onChange={(e) => {
                  setDobYear(e.target.value);
                  updateDateOfBirth(e.target.value, dobMonth, dobDay);
                }}
                className={cn(
                  'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                  'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                  'dark:border-gray-600 dark:bg-gray-800'
                )}
              >
                <option value="">Jahr</option>
                {infantYears.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

