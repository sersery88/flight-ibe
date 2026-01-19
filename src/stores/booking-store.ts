'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { FlightOffer, BagOption } from '@/types/flight';

// ============================================================================
// Booking Store - Booking Flow State Management
// ============================================================================

export interface TravelerData {
  id: string;
  type: 'ADULT' | 'CHILD' | 'HELD_INFANT';
  gender: 'MALE' | 'FEMALE';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  // Address (for lead traveler)
  address?: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  // APIS (Passport) data
  document?: {
    type: 'PASSPORT' | 'IDENTITY_CARD';
    number: string;
    expiryDate: string;
    issuanceCountry: string;
    nationality: string;
  };
  // Loyalty program
  loyaltyProgram?: {
    programOwner: string;
    id: string;
  };
  // For infants: the adult they are associated with
  associatedAdultId?: string;
}

export interface ContactData {
  email: string;
  phone: string;
  purpose: 'STANDARD' | 'EMERGENCY';
}

export interface PaymentData {
  method: 'CREDIT_CARD' | 'INVOICE';
  creditCard?: {
    brand: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    holderName: string;
  };
}

export interface SelectedSeat {
  segmentId: string;
  travelerId: string;
  seatNumber: string;
  price?: number;
}

export interface SelectedAncillary {
  type: string;
  subType?: string; // For special meals: VGML, VEGAN, KSML, MOML, NLML etc.
  travelerId: string;
  segmentId?: string;
  itineraryId?: number; // 0 = outbound, 1 = return, undefined = all directions
  price: number;
}

type BookingStep = 'travelers' | 'seats' | 'ancillaries' | 'payment' | 'review' | 'confirmation';

interface BookingState {
  // Current step
  currentStep: BookingStep;

  // Selected flight
  selectedOffer: FlightOffer | null;
  pricedOffer: FlightOffer | null;

  // Available baggage options from pricing API
  availableBagOptions: Record<string, BagOption>;

  // Travelers
  travelers: TravelerData[];

  // Contact
  contact: ContactData | null;

  // Seats
  selectedSeats: SelectedSeat[];

  // Ancillaries
  selectedAncillaries: SelectedAncillary[];

  // Payment
  payment: PaymentData | null;

  // Booking result
  bookingReference: string | null;
  pnr: string | null;

  // Loading states
  isPricing: boolean;
  isBooking: boolean;

  // Actions
  setStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSelectedOffer: (offer: FlightOffer) => void;
  setPricedOffer: (offer: FlightOffer) => void;
  setAvailableBagOptions: (bags: Record<string, BagOption>) => void;
  initializeTravelers: (adults: number, children: number, infants: number) => void;
  updateTraveler: (index: number, data: Partial<TravelerData>) => void;
  setContact: (contact: ContactData) => void;
  addSeat: (seat: SelectedSeat) => void;
  removeSeat: (segmentId: string, travelerId: string) => void;
  addAncillary: (ancillary: SelectedAncillary) => void;
  removeAncillary: (type: string, travelerId: string, itineraryId?: number) => void;
  setPayment: (payment: PaymentData) => void;
  setBookingResult: (reference: string, pnr: string) => void;
  setIsPricing: (isPricing: boolean) => void;
  setIsBooking: (isBooking: boolean) => void;
  getTotalPrice: () => number;
  reset: () => void;
}

const STEPS: BookingStep[] = ['travelers', 'seats', 'ancillaries', 'payment', 'review', 'confirmation'];

const generateTravelerId = (index: number) => `traveler-${index + 1}`;

export const useBookingStore = create<BookingState>()(
  devtools(
    (set, get) => ({
  currentStep: 'travelers',
  selectedOffer: null,
  pricedOffer: null,
  availableBagOptions: {},
  travelers: [],
  contact: null,
  selectedSeats: [],
  selectedAncillaries: [],
  payment: null,
  bookingReference: null,
  pnr: null,
  isPricing: false,
  isBooking: false,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      set({ currentStep: STEPS[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEPS[currentIndex - 1] });
    }
  },

  setSelectedOffer: (offer) => set({ selectedOffer: offer }),

  setPricedOffer: (offer) => set({ pricedOffer: offer }),

  setAvailableBagOptions: (bags) => set({ availableBagOptions: bags }),

  initializeTravelers: (adults, children, infants) => {
    const travelers: TravelerData[] = [];
    // Create adults first
    for (let i = 0; i < adults; i++) {
      travelers.push({ id: generateTravelerId(i), type: 'ADULT', gender: 'MALE', firstName: '', lastName: '', dateOfBirth: '' });
    }
    // Create children
    for (let i = 0; i < children; i++) {
      travelers.push({ id: generateTravelerId(adults + i), type: 'CHILD', gender: 'MALE', firstName: '', lastName: '', dateOfBirth: '' });
    }
    // Create infants and associate each with an adult (max 1 infant per adult)
    for (let i = 0; i < infants; i++) {
      const associatedAdultId = travelers[i]?.id; // Associate with adult at same index
      travelers.push({
        id: generateTravelerId(adults + children + i),
        type: 'HELD_INFANT',
        gender: 'MALE',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        associatedAdultId,
      });
    }
    set({ travelers });
  },

  updateTraveler: (index, data) => set((state) => ({
    travelers: state.travelers.map((t, i) => i === index ? { ...t, ...data } : t),
  })),

  setContact: (contact) => set({ contact }),

  addSeat: (seat) => set((state) => ({
    selectedSeats: [...state.selectedSeats.filter(s => !(s.segmentId === seat.segmentId && s.travelerId === seat.travelerId)), seat],
  })),

  removeSeat: (segmentId, travelerId) => set((state) => ({
    selectedSeats: state.selectedSeats.filter(s => !(s.segmentId === segmentId && s.travelerId === travelerId)),
  })),

  addAncillary: (ancillary) => set((state) => ({ selectedAncillaries: [...state.selectedAncillaries, ancillary] })),

  removeAncillary: (type, travelerId, itineraryId) => set((state) => ({
    selectedAncillaries: state.selectedAncillaries.filter(a => {
      if (a.type !== type || a.travelerId !== travelerId) return true;
      // If itineraryId is provided, only remove matching itinerary
      if (itineraryId !== undefined) return a.itineraryId !== itineraryId;
      // If no itineraryId, remove all matching type+traveler
      return false;
    }),
  })),

  setPayment: (payment) => set({ payment }),

  setBookingResult: (reference, pnr) => set({ bookingReference: reference, pnr, currentStep: 'confirmation' }),

  setIsPricing: (isPricing) => set({ isPricing }),
  setIsBooking: (isBooking) => set({ isBooking }),

  getTotalPrice: () => {
    const { pricedOffer, selectedOffer, selectedSeats, selectedAncillaries } = get();
    // Use pricedOffer if available, otherwise fall back to selectedOffer
    const offer = pricedOffer || selectedOffer;
    let total = offer ? parseFloat(offer.price.grandTotal) : 0;
    total += selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0);
    total += selectedAncillaries.reduce((sum, a) => sum + a.price, 0);
    return total;
  },

  reset: () => set({
    currentStep: 'travelers',
    selectedOffer: null,
    pricedOffer: null,
    availableBagOptions: {},
    travelers: [],
    contact: null,
    selectedSeats: [],
    selectedAncillaries: [],
    payment: null,
    bookingReference: null,
    pnr: null,
    isPricing: false,
    isBooking: false,
  }),
}),
    { name: 'BookingStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
