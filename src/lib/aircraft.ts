/**
 * Aircraft type designator mappings (IATA/ICAO codes to friendly names)
 * Source: https://en.wikipedia.org/wiki/List_of_aircraft_type_designators
 */

const AIRCRAFT_MAPPINGS: Record<string, string> = {
    // Airbus
    '318': 'Airbus A318',
    '319': 'Airbus A319',
    '320': 'Airbus A320',
    '321': 'Airbus A321',
    '32A': 'Airbus A320neo',
    '32N': 'Airbus A320neo',
    '32Q': 'Airbus A321neo',
    '332': 'Airbus A330-200',
    '333': 'Airbus A330-300',
    '338': 'Airbus A330-800neo',
    '339': 'Airbus A330-900neo',
    '342': 'Airbus A340-200',
    '343': 'Airbus A340-300',
    '345': 'Airbus A340-500',
    '346': 'Airbus A340-600',
    '359': 'Airbus A350-900',
    '351': 'Airbus A350-1000',
    '35K': 'Airbus A350-1000',
    '388': 'Airbus A380-800',
    'A18': 'Airbus A318',
    'A19': 'Airbus A319',
    'A20': 'Airbus A320',
    'A21': 'Airbus A321',
    'A33': 'Airbus A330',
    'A34': 'Airbus A340',
    'A35': 'Airbus A350',
    'A38': 'Airbus A380',
    '221': 'Airbus A220-100',
    '223': 'Airbus A220-300',

    // Boeing
    '731': 'Boeing 737-100',
    '732': 'Boeing 737-200',
    '733': 'Boeing 737-300',
    '734': 'Boeing 737-400',
    '735': 'Boeing 737-500',
    '736': 'Boeing 737-600',
    '737': 'Boeing 737',
    '738': 'Boeing 737-800',
    '739': 'Boeing 737-900',
    '73G': 'Boeing 737-700',
    '73H': 'Boeing 737-800',
    '73J': 'Boeing 737-900',
    '7M7': 'Boeing 737 MAX 7',
    '7M8': 'Boeing 737 MAX 8',
    '7M9': 'Boeing 737 MAX 9',
    '7MAX': 'Boeing 737 MAX',
    '741': 'Boeing 747-100',
    '742': 'Boeing 747-200',
    '743': 'Boeing 747-300',
    '744': 'Boeing 747-400',
    '748': 'Boeing 747-8',
    '752': 'Boeing 757-200',
    '753': 'Boeing 757-300',
    '762': 'Boeing 767-200',
    '763': 'Boeing 767-300',
    '764': 'Boeing 767-400',
    '772': 'Boeing 777-200',
    '773': 'Boeing 777-300',
    '77L': 'Boeing 777-200LR',
    '77W': 'Boeing 777-300ER',
    '788': 'Boeing 787-8 Dreamliner',
    '789': 'Boeing 787-9 Dreamliner',
    '78X': 'Boeing 787-10 Dreamliner',

    // Embraer
    'E70': 'Embraer 170',
    'E75': 'Embraer 175',
    'E90': 'Embraer 190',
    'E95': 'Embraer 195',
    'E2': 'Embraer E2',
    '290': 'Embraer E190-E2',
    '295': 'Embraer E195-E2',

    // Bombardier / Mitsubishi
    'CR1': 'Canadair Regional Jet 100',
    'CR2': 'Canadair Regional Jet 200',
    'CR7': 'Canadair Regional Jet 700',
    'CR9': 'Canadair Regional Jet 900',
    'CRK': 'Canadair Regional Jet 1000',
    'DH4': 'Dash 8-400',

    // Others
    'ATR': 'ATR 42/72',
    'AT4': 'ATR 42',
    'AT7': 'ATR 72',
    'SU9': 'Sukhoi Superjet 100',
};

/**
 * Get a friendly name for an aircraft type code
 */
export function formatAircraftType(code: string | undefined): string | undefined {
    if (!code) return undefined;
    const upperCode = code.toUpperCase();
    return AIRCRAFT_MAPPINGS[upperCode] || AIRCRAFT_MAPPINGS[code] || code;
}
