import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, CreditCard, ChevronDown, Baby, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
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
  // Contact fields for lead traveler
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  phone: z.string().min(6, 'Mindestens 6 Zeichen').optional().or(z.literal('')),
  // Address fields for lead traveler
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
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

// Countries list (sorted alphabetically, Swiss German names)
const COUNTRIES = [
  { code: 'CH', name: 'Schweiz' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'AT', name: 'Österreich' },
  { code: 'FR', name: 'Frankreich' },
  { code: 'IT', name: 'Italien' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: '', name: '──────────' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'EG', name: 'Ägypten' },
  { code: 'AL', name: 'Albanien' },
  { code: 'DZ', name: 'Algerien' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua und Barbuda' },
  { code: 'GQ', name: 'Äquatorialguinea' },
  { code: 'AR', name: 'Argentinien' },
  { code: 'AM', name: 'Armenien' },
  { code: 'AZ', name: 'Aserbaidschan' },
  { code: 'ET', name: 'Äthiopien' },
  { code: 'AU', name: 'Australien' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesch' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgien' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivien' },
  { code: 'BA', name: 'Bosnien und Herzegowina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brasilien' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgarien' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'DK', name: 'Dänemark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominikanische Republik' },
  { code: 'DJ', name: 'Dschibuti' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'CI', name: 'Elfenbeinküste' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estland' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'FJ', name: 'Fidschi' },
  { code: 'FI', name: 'Finnland' },
  { code: 'GA', name: 'Gabun' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgien' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GR', name: 'Griechenland' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'IN', name: 'Indien' },
  { code: 'ID', name: 'Indonesien' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IR', name: 'Iran' },
  { code: 'IE', name: 'Irland' },
  { code: 'IS', name: 'Island' },
  { code: 'IL', name: 'Israel' },
  { code: 'JM', name: 'Jamaika' },
  { code: 'JP', name: 'Japan' },
  { code: 'YE', name: 'Jemen' },
  { code: 'JO', name: 'Jordanien' },
  { code: 'KH', name: 'Kambodscha' },
  { code: 'CM', name: 'Kamerun' },
  { code: 'CA', name: 'Kanada' },
  { code: 'CV', name: 'Kap Verde' },
  { code: 'KZ', name: 'Kasachstan' },
  { code: 'QA', name: 'Katar' },
  { code: 'KE', name: 'Kenia' },
  { code: 'KG', name: 'Kirgisistan' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'CO', name: 'Kolumbien' },
  { code: 'KM', name: 'Komoren' },
  { code: 'CD', name: 'Kongo (Demokratische Republik)' },
  { code: 'CG', name: 'Kongo (Republik)' },
  { code: 'HR', name: 'Kroatien' },
  { code: 'CU', name: 'Kuba' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LA', name: 'Laos' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LV', name: 'Lettland' },
  { code: 'LB', name: 'Libanon' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libyen' },
  { code: 'LT', name: 'Litauen' },
  { code: 'LU', name: 'Luxemburg' },
  { code: 'MG', name: 'Madagaskar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Malediven' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MA', name: 'Marokko' },
  { code: 'MH', name: 'Marshallinseln' },
  { code: 'MR', name: 'Mauretanien' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexiko' },
  { code: 'FM', name: 'Mikronesien' },
  { code: 'MD', name: 'Moldau' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolei' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MZ', name: 'Mosambik' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NZ', name: 'Neuseeland' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Niederlande' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'Nordkorea' },
  { code: 'MK', name: 'Nordmazedonien' },
  { code: 'NO', name: 'Norwegen' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua-Neuguinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippinen' },
  { code: 'PL', name: 'Polen' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'RO', name: 'Rumänien' },
  { code: 'RU', name: 'Russland' },
  { code: 'SB', name: 'Salomonen' },
  { code: 'ZM', name: 'Sambia' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé und Príncipe' },
  { code: 'SA', name: 'Saudi-Arabien' },
  { code: 'SE', name: 'Schweden' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbien' },
  { code: 'SC', name: 'Seychellen' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'ZW', name: 'Simbabwe' },
  { code: 'SG', name: 'Singapur' },
  { code: 'SK', name: 'Slowakei' },
  { code: 'SI', name: 'Slowenien' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ES', name: 'Spanien' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'KN', name: 'St. Kitts und Nevis' },
  { code: 'LC', name: 'St. Lucia' },
  { code: 'VC', name: 'St. Vincent und die Grenadinen' },
  { code: 'ZA', name: 'Südafrika' },
  { code: 'SD', name: 'Sudan' },
  { code: 'KR', name: 'Südkorea' },
  { code: 'SS', name: 'Südsudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SY', name: 'Syrien' },
  { code: 'TJ', name: 'Tadschikistan' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tansania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad und Tobago' },
  { code: 'TD', name: 'Tschad' },
  { code: 'CZ', name: 'Tschechien' },
  { code: 'TN', name: 'Tunesien' },
  { code: 'TR', name: 'Türkei' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'HU', name: 'Ungarn' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Usbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatikanstadt' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'AE', name: 'Vereinigte Arabische Emirate' },
  { code: 'US', name: 'Vereinigte Staaten' },
  { code: 'GB', name: 'Vereinigtes Königreich' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'CF', name: 'Zentralafrikanische Republik' },
  { code: 'CY', name: 'Zypern' },
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
      email: traveler.email || '',
      phone: traveler.phone || '',
      street: traveler.address?.street || '',
      postalCode: traveler.address?.postalCode || '',
      city: traveler.address?.city || '',
      country: traveler.address?.country || 'Schweiz',
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
      address: values.street || values.postalCode || values.city || values.country ? {
        street: values.street || '',
        postalCode: values.postalCode || '',
        city: values.city || '',
        country: values.country || '',
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

        {/* Important notice about names */}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Wichtiger Hinweis</p>
            <p className="mt-1 text-xs">
              Die Namen müssen exakt wie im Reisepass angegeben werden.
              Bitte überprüfen Sie, dass Vor- und Nachname nicht vertauscht sind.
            </p>
          </div>
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

          {/* Contact Fields - Only for Lead Traveler */}
          {isLead && (
            <>
              {/* Email */}
              <div>
                <Label htmlFor={`email-${index}`} className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail
                </Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  {...register('email')}
                  onBlur={onBlur}
                  placeholder="max.mustermann@email.ch"
                  className={cn('mt-1', errors.email && 'border-red-500')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor={`phone-${index}`} className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefonnummer
                </Label>
                <Input
                  id={`phone-${index}`}
                  type="tel"
                  {...register('phone')}
                  onBlur={onBlur}
                  placeholder="+41 79 123 45 67"
                  className={cn('mt-1', errors.phone && 'border-red-500')}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Wohnadresse
                </Label>
                <div className="mt-1 grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('street')}
                    onBlur={onBlur}
                    placeholder="Strasse und Hausnummer"
                    className="md:col-span-2"
                  />
                  <Input
                    {...register('postalCode')}
                    onBlur={onBlur}
                    placeholder="PLZ"
                  />
                  <Input
                    {...register('city')}
                    onBlur={onBlur}
                    placeholder="Ort"
                  />
                  <div className="relative">
                    <select
                      {...register('country')}
                      onBlur={onBlur}
                      className={cn(
                        'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm',
                        'focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500',
                        'dark:border-gray-600 dark:bg-gray-800'
                      )}
                    >
                      {COUNTRIES.map((country) => (
                        <option
                          key={country.code || country.name}
                          value={country.name}
                          disabled={country.code === ''}
                        >
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </>
          )}

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
          <h4 className="font-medium">Baby (auf dem Schoss)</h4>
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

