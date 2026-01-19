/**
 * Utility for translating and formatting flight amenities and branded fares.
 */

import { Luggage, Check, Plane, Coffee, Tv, Zap, Wifi, Crown, UtensilsCrossed } from 'lucide-react';

/**
 * Common amenity types from Amadeus/Airline APIs mapped to German labels
 */
export const AMENITY_TYPE_TRANSLATIONS: Record<string, string> = {
    'PRE_RESERVED_SEAT': 'Sitzplatzwahl',
    'CHECKED_BAGGAGE': 'Aufgabegepäck',
    'MEAL': 'Verpflegung',
    'WIFI': 'WLAN an Bord',
    'ENTERTAINMENT': 'Unterhaltung',
    'PRIORITY_BOARDING': 'Priority Boarding',
    'LOUNGE': 'Lounge-Zugang',
    'CHANGEABLE_TICKET': 'Umbuchbar',
    'REFUNDABLE_TICKET': 'Erstattbar',
    'POWER': 'Strom/USB am Sitz',
    'BEVERAGE': 'Getränke',
    'CABIN_BAGGAGE': 'Handgepäck',
};

/**
 * Common raw description keywords to German labels
 */
export const AMENITY_DESCRIPTION_MAPPINGS: Array<{ keywords: string[]; label: string }> = [
    { keywords: ['SEAT', 'RESERVED'], label: 'Sitzplatzwahl' },
    { keywords: ['BAGGAGE', 'BAG', 'HOLD'], label: 'Aufgabegepäck' },
    { keywords: ['MEAL', 'FOOD', 'SNACK'], label: 'Verpflegung' },
    { keywords: ['WIFI', 'WI-FI', 'INTERNET'], label: 'WLAN' },
    { keywords: ['ENTERTAINMENT', 'IFE', 'VIDEO'], label: 'Unterhaltung' },
    { keywords: ['PRIORITY'], label: 'Priority Boarding' },
    { keywords: ['LOUNGE'], label: 'Lounge-Zugang' },
    { keywords: ['CHANGEABLE', 'REBOOK', 'CHANGE'], label: 'Umbuchbar' },
    { keywords: ['REFUNDABLE', 'REFUND', 'CANCEL'], label: 'Erstattbar' },
    { keywords: ['POWER', 'USB', 'PLUG'], label: 'Strom/USB' },
    { keywords: ['BEVERAGE', 'DRINK'], label: 'Getränke' },
    { keywords: ['CARRY-ON', 'CABIN BAG', 'PERSONAL'], label: 'Handgepäck' },
];

/**
 * Translates a raw amenity description or type to a friendly German label.
 */
export function translateAmenity(description: string, amenityType?: string): string {
    // 1. Try type mapping first
    if (amenityType && AMENITY_TYPE_TRANSLATIONS[amenityType.toUpperCase()]) {
        return AMENITY_TYPE_TRANSLATIONS[amenityType.toUpperCase()];
    }

    // 2. Try description keyword mapping
    const upperDesc = description.toUpperCase();
    for (const mapping of AMENITY_DESCRIPTION_MAPPINGS) {
        if (mapping.keywords.some(kw => upperDesc.includes(kw))) {
            return mapping.label;
        }
    }

    // 3. Clean up common raw patterns
    let clean = description;
    clean = clean.replace(/PRE RESERVED SEAT ASSIGNMENT/gi, 'Sitzplatzreservierung');
    clean = clean.replace(/CHECKED BAGGAGE/gi, 'Aufgabegepäck');
    clean = clean.replace(/UP TO (\d+)KG/gi, 'bis $1kg');

    // 4. Return original (capitalized) if nothing found
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Returns an appropriate Lucide icon for an amenity
 */
export function getAmenityIcon(amenityType?: string, description?: string) {
    const type = (amenityType || '').toUpperCase();
    const desc = (description || '').toUpperCase();

    if (type.includes('BAGGAGE') || desc.includes('BAG')) return Luggage;
    if (type.includes('MEAL') || desc.includes('MEAL') || desc.includes('FOOD')) return UtensilsCrossed;
    if (type.includes('WIFI') || desc.includes('WI-FI')) return Wifi;
    if (type.includes('ENTERTAINMENT') || desc.includes('IFE')) return Tv;
    if (type.includes('LOUNGE')) return Crown;
    if (type.includes('PRIORITY')) return Zap;
    if (type.includes('POWER') || desc.includes('USB')) return Zap;
    if (type.includes('BEVERAGE') || desc.includes('DRINK')) return Coffee;
    if (desc.includes('SEAT')) return Plane;

    return Check;
}

/**
 * Formats a branded fare name to be more user-friendly.
 * Amadeus brandedFareLabel often contains technical or shortened names.
 */
export function formatBrandedFareName(name: string): string {
    if (!name) return '';

    const upper = name.toUpperCase().replace(/\s/g, '');

    // 1. Direct high-priority mappings
    const directMappings: Record<string, string> = {
        'ECOGREIC': 'Economy Green',
        'PREBASE': 'Premium Economy Base',
        'PREGREIC': 'Premium Economy Green',
        'BUSBASE': 'Business Basic',
        'BUSGREIC': 'Business Green',
        'YBASIC': 'Economy Basic',
        'YVALUE': 'Economy Value',
        'YCOMFORT': 'Economy Comfort',
        'YDELUXE': 'Economy Deluxe',
        'JVALUE': 'Business Value',
        'JCOMFORT': 'Business Comfort',
        'JDELUXE': 'Business Deluxe',
        'PREMLIGHT': 'Premium Economy Light',
        'PREMSTAND': 'Premium Economy Standard',
        'PREMFLEX': 'Premium Economy Flex',
        'PRESAVER': 'Premium Economy Saver',
        'PREFLEX': 'Premium Economy Flex',
        'BUSSAVER': 'Business Saver',
        'BUSFLEX': 'Business Flex',
        'BSFLXPLUS': 'Business Flex Plus',
        'BSSAVER': 'Business Saver',
        'BSFLEX': 'Business Flex',
        'FSTFLEX': 'First Flex',
        'FSTFLXPLUS': 'First Flex Plus',
        'BUSINESSSEMIF': 'Business Semi-Flex',
        'FULLFLEX': 'Full Flex',
        'ECOMFORT': 'Economy Comfort',
        'BELITE': 'Business Elite',
        'ECONVENIEN': 'Economy Convenience',
        'ECONOMYLIGHT': 'Economy Light',
        'ECONOMYCLASSIC': 'Economy Classic',
        'ECONOMYFLEX': 'Economy Flex',
        'ECOSMART': 'Economy Smart',
        'ECOFLEX': 'Economy Flex',
        'ECOSAVER': 'Economy Saver',
        'ECOPROMO': 'Economy Promo',
        'BIZSMART': 'Business Smart',
        'BIZFLEX': 'Business Flex',
        'BIZSAVER': 'Business Saver',
        'PREMECON': 'Premium Economy',
        'PRMECON': 'Premium Economy',
    };

    if (directMappings[upper]) {
        return directMappings[upper];
    }

    // 2. Pattern-based replacements
    let formatted = name;

    // Handle common prefixes
    if (upper.startsWith('ECO') && !upper.startsWith('ECONOMY')) {
        formatted = 'Economy ' + name.substring(3).trim();
    } else if (upper.startsWith('BIZ') && !upper.startsWith('BUSINESS')) {
        formatted = 'Business ' + name.substring(3).trim();
    }

    // Handle common suffixes/middles
    formatted = formatted
        .replace(/LGT$/i, ' Light')
        .replace(/SMT$/i, ' Smart')
        .replace(/FLX$/i, ' Flex')
        .replace(/CONVENIEN$/i, ' Convenience')
        .replace(/Basic/i, ' Basic')
        .replace(/Plus/i, ' Plus');

    // 3. Clean up and Title Case
    return formatted
        .trim()
        .split(/[\s_-]+/)
        .map(word => {
            // Special case for short common technical codes
            if (word.toUpperCase() === 'LGT') return 'Light';
            if (word.toUpperCase() === 'SMT') return 'Smart';
            if (word.toUpperCase() === 'FLX') return 'Flex';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}
