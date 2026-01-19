import type { FlightOffer } from '@/types/flight';

/**
 * Check if two flight offers represent the same flight
 * (same flight numbers, same departure times, same route)
 */
export function isSameFlight(offer1: FlightOffer, offer2: FlightOffer): boolean {
  // Must have same number of itineraries
  if (offer1.itineraries.length !== offer2.itineraries.length) {
    return false;
  }

  // Check each itinerary
  for (let i = 0; i < offer1.itineraries.length; i++) {
    const itin1 = offer1.itineraries[i];
    const itin2 = offer2.itineraries[i];

    // Must have same number of segments
    if (itin1.segments.length !== itin2.segments.length) {
      return false;
    }

    // Check each segment
    for (let j = 0; j < itin1.segments.length; j++) {
      const seg1 = itin1.segments[j];
      const seg2 = itin2.segments[j];

      // Check carrier code and flight number
      if (seg1.carrierCode !== seg2.carrierCode || seg1.number !== seg2.number) {
        return false;
      }

      // Check departure airport and time (within 5 minutes tolerance)
      if (seg1.departure.iataCode !== seg2.departure.iataCode) {
        return false;
      }

      const dep1 = new Date(seg1.departure.at);
      const dep2 = new Date(seg2.departure.at);
      const timeDiff = Math.abs(dep1.getTime() - dep2.getTime());
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        return false;
      }

      // Check arrival airport
      if (seg1.arrival.iataCode !== seg2.arrival.iataCode) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Find the same flight in a list of offers
 */
export function findMatchingFlight(
  targetOffer: FlightOffer,
  offers: FlightOffer[]
): FlightOffer | null {
  return offers.find(offer => isSameFlight(targetOffer, offer)) || null;
}
