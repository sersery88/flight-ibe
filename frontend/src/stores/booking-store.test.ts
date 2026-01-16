import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './booking-store';
import type { FlightOffer } from '@/types/flight';

// Mock flight offer for testing
const mockFlightOffer: FlightOffer = {
  id: '1',
  type: 'flight-offer',
  source: 'GDS',
  instantTicketingRequired: false,
  nonHomogeneous: false,
  oneWay: false,
  itineraries: [
    {
      duration: 'PT2H30M',
      segments: [
        {
          departure: { iataCode: 'FRA', at: '2024-06-15T10:00:00' },
          arrival: { iataCode: 'LHR', at: '2024-06-15T11:30:00' },
          carrierCode: 'LH',
          number: '900',
          aircraft: { code: '320' },
          duration: 'PT1H30M',
          id: '1',
          numberOfStops: 0,
          blacklistedInEU: false,
        },
      ],
    },
  ],
  price: {
    currency: 'EUR',
    total: '299.00',
    base: '250.00',
    grandTotal: '299.00',
  },
  pricingOptions: {
    fareType: ['PUBLISHED'],
    includedCheckedBagsOnly: true,
  },
  validatingAirlineCodes: ['LH'],
  travelerPricings: [
    {
      travelerId: '1',
      fareOption: 'STANDARD',
      travelerType: 'ADULT',
      price: { currency: 'EUR', total: '299.00', base: '250.00' },
      fareDetailsBySegment: [
        {
          segmentId: '1',
          cabin: 'ECONOMY',
          fareBasis: 'YOWEU',
          class: 'Y',
        },
      ],
    },
  ],
};

describe('BookingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useBookingStore.getState().reset();
  });

  describe('initializeTravelers', () => {
    it('should initialize correct number of adults', () => {
      useBookingStore.getState().initializeTravelers(2, 0, 0);
      const travelers = useBookingStore.getState().travelers;

      expect(travelers).toHaveLength(2);
      expect(travelers[0].type).toBe('ADULT');
      expect(travelers[1].type).toBe('ADULT');
    });

    it('should initialize adults and children', () => {
      useBookingStore.getState().initializeTravelers(1, 2, 0);
      const travelers = useBookingStore.getState().travelers;

      expect(travelers).toHaveLength(3);
      expect(travelers[0].type).toBe('ADULT');
      expect(travelers[1].type).toBe('CHILD');
      expect(travelers[2].type).toBe('CHILD');
    });

    it('should initialize infants with associated adults', () => {
      useBookingStore.getState().initializeTravelers(2, 0, 1);
      const travelers = useBookingStore.getState().travelers;

      expect(travelers).toHaveLength(3);
      const infant = travelers.find(t => t.type === 'HELD_INFANT');
      expect(infant).toBeDefined();
      expect(infant?.associatedAdultId).toBe(travelers[0].id);
    });
  });

  describe('updateTraveler', () => {
    it('should update traveler data', () => {
      useBookingStore.getState().initializeTravelers(1, 0, 0);
      useBookingStore.getState().updateTraveler(0, {
        firstName: 'Max',
        lastName: 'Mustermann',
      });

      const traveler = useBookingStore.getState().travelers[0];
      expect(traveler.firstName).toBe('Max');
      expect(traveler.lastName).toBe('Mustermann');
    });
  });

  describe('step navigation', () => {
    it('should start at travelers step', () => {
      expect(useBookingStore.getState().currentStep).toBe('travelers');
    });

    it('should move to next step', () => {
      useBookingStore.getState().nextStep();
      expect(useBookingStore.getState().currentStep).toBe('seats');
    });

    it('should move to previous step', () => {
      useBookingStore.getState().setStep('seats');
      useBookingStore.getState().prevStep();
      expect(useBookingStore.getState().currentStep).toBe('travelers');
    });

    it('should not go before first step', () => {
      useBookingStore.getState().prevStep();
      expect(useBookingStore.getState().currentStep).toBe('travelers');
    });
  });

  describe('seat selection', () => {
    it('should add seat selection', () => {
      useBookingStore.getState().addSeat({
        segmentId: '1',
        travelerId: '1',
        seatNumber: '12A',
        price: 25,
      });

      const seats = useBookingStore.getState().selectedSeats;
      expect(seats).toHaveLength(1);
      expect(seats[0].seatNumber).toBe('12A');
    });

    it('should remove seat selection', () => {
      useBookingStore.getState().addSeat({
        segmentId: '1',
        travelerId: '1',
        seatNumber: '12A',
        price: 25,
      });
      useBookingStore.getState().removeSeat('1', '1');

      expect(useBookingStore.getState().selectedSeats).toHaveLength(0);
    });

    it('should replace existing seat for same segment/traveler', () => {
      useBookingStore.getState().addSeat({
        segmentId: '1',
        travelerId: '1',
        seatNumber: '12A',
        price: 25,
      });
      useBookingStore.getState().addSeat({
        segmentId: '1',
        travelerId: '1',
        seatNumber: '14B',
        price: 30,
      });

      const seats = useBookingStore.getState().selectedSeats;
      expect(seats).toHaveLength(1);
      expect(seats[0].seatNumber).toBe('14B');
    });
  });

  describe('price calculation', () => {
    it('should calculate total price including seats', () => {
      useBookingStore.getState().setSelectedOffer(mockFlightOffer);
      useBookingStore.getState().addSeat({
        segmentId: '1',
        travelerId: '1',
        seatNumber: '12A',
        price: 25,
      });

      const total = useBookingStore.getState().getTotalPrice();
      expect(total).toBe(324); // 299 + 25
    });

    it('should calculate total price including ancillaries', () => {
      useBookingStore.getState().setSelectedOffer(mockFlightOffer);
      useBookingStore.getState().addAncillary({
        type: 'BAGGAGE',
        travelerId: '1',
        price: 50,
      });

      const total = useBookingStore.getState().getTotalPrice();
      expect(total).toBe(349); // 299 + 50
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      useBookingStore.getState().setSelectedOffer(mockFlightOffer);
      useBookingStore.getState().initializeTravelers(2, 0, 0);
      useBookingStore.getState().setStep('payment');

      useBookingStore.getState().reset();

      const state = useBookingStore.getState();
      expect(state.selectedOffer).toBeNull();
      expect(state.travelers).toHaveLength(0);
      expect(state.currentStep).toBe('travelers');
    });
  });
});
