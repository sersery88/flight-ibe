# Flight IBE Strategic Plan
## Vision: Die beste Flight IBE der Welt bauen

> **Ziel:** Eine dynamische, flüssige, sichere und nachhaltige Flugbuchungsplattform, die alle 26 Amadeus-Endpunkte intelligent nutzt und branchenführende UX bietet.

---

## Marktanalyse & Best Practices

### Erkenntnisse aus der Recherche

Basierend auf [Baymard UX Benchmark 2025](https://baymard.com/blog/flight-booking-and-airlines-2025-benchmark) und [Smashing Magazine](https://www.smashingmagazine.com/2023/07/reimagining-flight-search-ux/):

**Probleme aktueller Flight IBEs:**
- Überladene UIs mit kognitiver Überlastung
- Versteckte Gebühren, mangelnde Preistransparenz
- Komplizierte Multi-Step-Prozesse
- Keine Preisvorhersagen/Empfehlungen
- Fehlende Personalisierung

**Was [Google Flights](https://www.google.com/travel/flights) & [Hopper](https://www.thetraveler.org/hopper-vs-google-flights-which-finds-the-better-deal/) richtig machen:**
- Farbcodierte Kalender mit Preisübersicht
- "Preise werden wahrscheinlich steigen"-Warnungen
- "Explore Anywhere" Inspiration-Suche
- Preis-Freeze-Optionen
- Push-Benachrichtigungen bei Preisänderungen

---

## API-Endpunkt-Strategie

### 🎯 Tier 1: Core Booking Flow (Bereits implementiert)

| Endpunkt | Feature | UX-Innovation |
|----------|---------|---------------|
| `/flight-search` | Flugsuche | ✅ Multi-City, Filter, Sortierung |
| `/flight-price` | Preisbestätigung | ✅ Gepäck-Optionen |
| `/flight-order` | Buchung | ⚠️ Bug: Frontend nutzt `/book` |
| `/seatmaps` | Sitzplatzauswahl | ✅ Interaktive 3D-Ansicht |
| `/upsell` | Tarifvergleich | ✅ Branded Fares |
| `/locations` | Airport-Suche | ✅ Autocomplete |

---

### 🚀 Tier 2: Price Intelligence (HIGH PRIORITY)

#### 2.1 Preiskalender mit `/flight-dates`
```
Feature: "Cheapest Dates Calendar"
```

**Konzept:**
- Farbcodierter Kalender wie Google Flights
- Grün = günstigste Tage, Rot = teuerste
- Hover zeigt Preis an
- Click übernimmt Datum in Suche

**UX-Flow:**
```
[Departure Field] → [📅 Flexible Daten?] → Preiskalender öffnet sich
                                          ↓
                    [===== JANUAR 2026 =====]
                    Mo  Di  Mi  Do  Fr  Sa  So
                    €89 €92 €78 €85 €120 €145 €142
                    🟢  🟢  🟢  🟡  🔴   🔴   🔴
```

**API-Integration:**
```typescript
// Neuer Hook
export function useCheapestDates(origin: string, destination: string) {
  return useQuery({
    queryKey: ['flight-dates', origin, destination],
    queryFn: () => apiClient.get('/flight-dates', { origin, destination }),
    enabled: !!origin && !!destination,
    staleTime: 30 * 60 * 1000, // 30 min cache
  });
}
```

---

#### 2.2 Preisanalyse mit `/price-metrics`
```
Feature: "Good Deal Indicator"
```

**Konzept:**
- Zeigt ob aktueller Preis gut/mittel/teuer ist
- Historischer Vergleich der letzten 12 Monate
- "Preise sind 23% unter dem Durchschnitt" Badge

**UI-Element (auf FlightCard):**
```
┌─────────────────────────────────────┐
│ FRA → BCN  12. März                 │
│ 2h 15min · Lufthansa · Direkt       │
│                                     │
│ €89    [🏷️ GUTER PREIS]            │
│        Üblich: €115 · Tiefst: €72   │
│        ████████░░ 23% günstiger     │
└─────────────────────────────────────┘
```

**Implementierung:**
```typescript
interface PriceInsight {
  currentPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  percentile: number; // 0-100, lower = better deal
  recommendation: 'GREAT_DEAL' | 'GOOD_DEAL' | 'FAIR' | 'HIGH' | 'VERY_HIGH';
}
```

---

#### 2.3 Verspätungsvorhersage mit `/flight-delay-prediction`
```
Feature: "Punctuality Score"
```

**Konzept:**
- Zeigt Wahrscheinlichkeit für Verspätungen
- Basiert auf historischen Daten
- Hilft bei Entscheidung zwischen Flügen

**UI auf FlightCard:**
```
┌─ Pünktlichkeit ─────────────────────┐
│ ✈️ LH1234                          │
│ ⏱️ 87% pünktlich                   │
│ 📊 Durchschn. Verspätung: 12 min   │
│                                     │
│ [🟢🟢🟢🟢🟢🟢🟢🟢⚪⚪]              │
└─────────────────────────────────────┘
```

---

### 🌍 Tier 3: Inspiration & Discovery (MEDIUM PRIORITY)

#### 3.1 "Wohin für €X?" mit `/flight-destinations`
```
Feature: "Inspiration Search"
```

**Konzept:**
- User gibt Budget ein, System zeigt mögliche Ziele
- Interaktive Weltkarte mit Preispunkten
- Filter nach Kontinent, Wetter, Aktivitäten

**UI-Flow:**
```
┌─────────────────────────────────────────────────┐
│  🌍 Wohin soll die Reise gehen?                │
│                                                 │
│  Budget: [€100 ▼] bis [€300 ▼]                 │
│  Von: [Frankfurt ▼]                            │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         [INTERAKTIVE WELTKARTE]         │   │
│  │    🔵 Barcelona €89                      │   │
│  │         🔵 Rom €95                       │   │
│  │    🔵 Lissabon €112                      │   │
│  │              🔵 Athen €145               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Beliebte Ziele:                               │
│  [Barcelona €89] [Rom €95] [Mallorca €78]      │
└─────────────────────────────────────────────────┘
```

**API-Integration:**
```typescript
export function useFlightInspiration(origin: string, maxPrice?: number) {
  return useQuery({
    queryKey: ['flight-destinations', origin, maxPrice],
    queryFn: () => apiClient.get('/flight-destinations', {
      origin,
      maxPrice
    }),
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
}
```

---

#### 3.2 Direktverbindungen mit `/airport-direct-destinations`
```
Feature: "Direct Flights Map"
```

**Konzept:**
- "Nur Direktflüge" Filter wird intelligent
- Zeigt alle Direktziele von gewähltem Flughafen
- Hilft bei Reiseplanung

**Use Case:**
```
User: "Ich will von Frankfurt direkt fliegen"
System: Zeigt 127 Direktziele mit Preisen
User: Klickt auf Karte → Suche startet automatisch
```

---

#### 3.3 Airline-Routen mit `/airline-destinations`
```
Feature: "Fly with [Airline]"
```

**Konzept:**
- User wählt Lieblings-Airline
- System zeigt alle Ziele dieser Airline
- Nützlich für Vielflieger/Meilenprogramme

---

### 📊 Tier 4: Analytics & Intelligence (INNOVATION)

#### 4.1 Reisezeit-Empfehlung mit `/busiest-period`
```
Feature: "Best Time to Visit"
```

**Konzept:**
- Zeigt wann Zielort am meisten/wenigsten besucht wird
- Hilft Overtourism zu vermeiden
- Preis-Korrelation anzeigen

**UI auf Suchergebnis:**
```
┌─ Barcelona Insights ────────────────┐
│ 📈 Reiseaufkommen 2026              │
│                                     │
│ Jan ░░░░                            │
│ Feb ░░░░░                           │
│ Mär ░░░░░░                          │
│ Apr ░░░░░░░░                        │
│ Mai ░░░░░░░░░░░                     │
│ Jun ████████████████ ← Hochsaison   │
│ Jul ██████████████████████          │
│ Aug █████████████████████████       │
│ Sep ░░░░░░░░░░░░                    │
│ Okt ░░░░░░░░                        │
│ Nov ░░░░                            │
│ Dez ░░░░░░░░ ← Günstig & ruhig     │
│                                     │
│ 💡 Empfehlung: Reisen Sie im März   │
│    für 34% günstigere Preise        │
└─────────────────────────────────────┘
```

---

#### 4.2 Trendanalyse mit `/air-traffic-booked`
```
Feature: "Trending Destinations"
```

**Konzept:**
- Zeigt was andere von gleichem Flughafen buchen
- Social Proof & Inspiration
- "🔥 +45% mehr Buchungen als letztes Jahr"

**Homepage-Widget:**
```
┌─ Trending von Frankfurt ────────────┐
│ 🔥 Diese Woche beliebt:             │
│                                     │
│ 1. 🇪🇸 Mallorca    +67% ↑          │
│ 2. 🇬🇷 Kreta       +45% ↑          │
│ 3. 🇵🇹 Lissabon    +38% ↑          │
│ 4. 🇮🇹 Rom         +22% ↑          │
│ 5. 🇭🇷 Dubrovnik   +18% ↑          │
└─────────────────────────────────────┘
```

---

#### 4.3 Smart Recommendations mit `/recommended-locations`
```
Feature: "Personalized Suggestions"
```

**Konzept:**
- Basierend auf bisherigen Suchen
- "Weil Sie Barcelona gesucht haben..."
- Ähnliche Ziele vorschlagen

---

#### 4.4 Ziel-Bewertung mit `/location-score`
```
Feature: "Destination Score"
```

**Konzept:**
- Zeigt Qualitäts-Score für Zielort
- Kategorien: Sicherheit, Infrastruktur, Nachtleben, etc.
- Hilft bei Entscheidung

---

### ✈️ Tier 5: Post-Booking Experience (HIGH VALUE)

#### 5.1 Flugstatus mit `/flight-status`
```
Feature: "Live Flight Tracker"
```

**Konzept:**
- Nach Buchung: Real-time Flugstatus
- Push-Benachrichtigungen bei Änderungen
- Gate-Änderungen, Verspätungen

**UI nach Buchung:**
```
┌─ Ihr Flug LH1234 ───────────────────┐
│ Status: ✅ Planmäßig               │
│                                     │
│ 🛫 Frankfurt (FRA)                  │
│    Gate B24 · Boarding 14:20        │
│                                     │
│ ⏱️ Abflug: 14:45 (pünktlich)       │
│                                     │
│ 🛬 Barcelona (BCN)                  │
│    Ankunft: 17:00                   │
│    Terminal 1                       │
│                                     │
│ [📍 Live-Tracking] [🔔 Benachrichtigen] │
└─────────────────────────────────────┘
```

---

#### 5.2 Online Check-in mit `/checkin-links`
```
Feature: "Quick Check-in"
```

**Konzept:**
- Direkt-Link zum Airline-Check-in
- Reminder 24h vor Abflug
- Deeplink in Airline-App wenn installiert

**UI:**
```
┌─ Check-in verfügbar! ───────────────┐
│ ✈️ LH1234 · Frankfurt → Barcelona  │
│ 📅 Morgen, 14:45                    │
│                                     │
│ [🎫 Jetzt einchecken bei Lufthansa] │
│                                     │
│ 💡 Tipp: Online-Check-in spart      │
│    Zeit am Flughafen                │
└─────────────────────────────────────┘
```

---

### 🗺️ Tier 6: Geo-Features (NICE TO HAVE)

#### 6.1 Nächster Flughafen mit `/airports`
```
Feature: "Airports Near Me"
```

**Konzept:**
- Automatische Standort-Erkennung
- Zeigt nächste Flughäfen mit Entfernung
- Vergleicht Preise zwischen nahen Airports

**UI:**
```
┌─ Flughäfen in Ihrer Nähe ───────────┐
│ 📍 Ihr Standort: Heidelberg         │
│                                     │
│ ✈️ Frankfurt (FRA)     85 km       │
│    Günstigster Flug: €89           │
│                                     │
│ ✈️ Stuttgart (STR)     120 km      │
│    Günstigster Flug: €95           │
│                                     │
│ ✈️ Karlsruhe (FKB)     65 km       │
│    Günstigster Flug: €72 ⭐ Tipp!  │
└─────────────────────────────────────┘
```

---

#### 6.2 Airline-Info mit `/airlines`
```
Feature: "Airline Profiles"
```

**Konzept:**
- Airline-Logos dynamisch laden
- Bewertungen, Gepäckregeln, Extras
- Alliance-Info für Codeshares

---

## 🎨 Innovative UX-Features (Neu & Einzigartig)

### Innovation 1: "Price Lock" Simulation
```
Nutzt: /price-metrics + Frontend-State
```
- User kann Preis "merken"
- System benachrichtigt wenn Preis fällt
- "Ihr gemerkter Preis €89 ist jetzt €79!"

### Innovation 2: "Trip Confidence Score"
```
Nutzt: /flight-delay-prediction + /price-metrics + /location-score
```
- Kombinierter Score aus:
  - Preisqualität (gut/schlecht)
  - Pünktlichkeitswahrscheinlichkeit
  - Ziel-Bewertung
- "Trip Score: 92/100 ⭐⭐⭐⭐⭐"

### Innovation 3: "Smart Calendar"
```
Nutzt: /flight-dates + /busiest-period + /price-metrics
```
- Kalender zeigt gleichzeitig:
  - Preise (Farbe)
  - Tourismus-Level (Icons)
  - Preis-Trend (Pfeile)

### Innovation 4: "Alternative Airport Finder"
```
Nutzt: /airports + /flight-search (parallel)
```
- "Frankfurt zu teuer? Versuchen Sie Karlsruhe (-€40)"
- Automatischer Preisvergleich nahegelegener Airports

### Innovation 5: "Eco-Score"
```
Nutzt: /flight-search (CO2-Daten aus Amadeus)
```
- CO2-Emission pro Flug anzeigen
- "Grüne" Alternativen hervorheben
- Kompensations-Option

### Innovation 6: "Fare Family Comparison Matrix"
```
Nutzt: /upsell + /flight-price
```
- Side-by-side Vergleich aller Tarife
- Interaktive Feature-Matrix
- "Was ist im Preis enthalten?"

---

## 📱 Implementierungsplan

### Phase 1: Foundation (Woche 1-2)
- [ ] Bug fixen: `/book` → `/flight-order`
- [ ] API-Client erweitern für alle Endpunkte
- [ ] Hooks für neue APIs erstellen
- [ ] TypeScript-Typen definieren

### Phase 2: Price Intelligence (Woche 3-4)
- [ ] Preiskalender-Komponente (`/flight-dates`)
- [ ] "Good Deal" Indikator (`/price-metrics`)
- [ ] Delay Prediction auf FlightCard

### Phase 3: Inspiration (Woche 5-6)
- [ ] "Wohin für €X?" Feature (`/flight-destinations`)
- [ ] Trending Destinations Widget (`/air-traffic-booked`)
- [ ] Interaktive Weltkarte

### Phase 4: Post-Booking (Woche 7-8)
- [ ] Flugstatus-Tracking (`/flight-status`)
- [ ] Check-in Links (`/checkin-links`)
- [ ] Buchungsbestätigungs-Page erweitern

### Phase 5: Polish & Innovation (Woche 9-10)
- [ ] Trip Confidence Score
- [ ] Alternative Airport Finder
- [ ] Eco-Score Integration
- [ ] Performance-Optimierung

---

## 🔧 Technische Architektur

### Frontend API Client Erweiterung
```typescript
// src/api/client.ts - Neue Funktionen

// Price Intelligence
export const getFlightDates = (origin: string, destination: string) =>
  apiClient.get('/flight-dates', { origin, destination });

export const getPriceMetrics = (params: PriceMetricsParams) =>
  apiClient.get('/price-metrics', params);

export const getDelayPrediction = (params: DelayPredictionParams) =>
  apiClient.get('/flight-delay-prediction', params);

// Inspiration
export const getFlightDestinations = (origin: string, maxPrice?: number) =>
  apiClient.get('/flight-destinations', { origin, maxPrice });

export const getAirportDirectDestinations = (departureAirportCode: string) =>
  apiClient.get('/airport-direct-destinations', { departureAirportCode });

export const getAirlineDestinations = (airlineCode: string) =>
  apiClient.get('/airline-destinations', { airlineCode });

// Analytics
export const getBusiestPeriod = (cityCode: string, period: string) =>
  apiClient.get('/busiest-period', { cityCode, period });

export const getAirTrafficBooked = (originCityCode: string, period: string) =>
  apiClient.get('/air-traffic-booked', { originCityCode, period });

export const getRecommendedLocations = (cityCodes: string) =>
  apiClient.get('/recommended-locations', { cityCodes });

export const getLocationScore = (latitude: number, longitude: number) =>
  apiClient.get('/location-score', { latitude, longitude });

// Post-Booking
export const getFlightStatus = (carrierCode: string, flightNumber: string, date: string) =>
  apiClient.get('/flight-status', { carrierCode, flightNumber, scheduledDepartureDate: date });

export const getCheckinLinks = (airlineCode: string, language?: string) =>
  apiClient.get('/checkin-links', { airlineCode, language });

// Geo
export const getAirportsByGeocode = (latitude: number, longitude: number, radius?: number) =>
  apiClient.get('/airports', { latitude, longitude, radius });

export const getAirlines = (airlineCodes?: string) =>
  apiClient.get('/airlines', { airlineCodes });
```

### Neue React Hooks
```typescript
// src/hooks/use-price-intelligence.ts
export function useCheapestDates(origin: string, destination: string);
export function usePriceMetrics(origin: string, destination: string, date: string);
export function useDelayPrediction(flightParams: DelayParams);

// src/hooks/use-inspiration.ts
export function useFlightInspiration(origin: string, maxPrice?: number);
export function useDirectDestinations(airportCode: string);
export function useTrendingDestinations(cityCode: string);

// src/hooks/use-post-booking.ts
export function useFlightStatus(carrierCode: string, flightNumber: string, date: string);
export function useCheckinLinks(airlineCode: string);
```

### Neue Komponenten
```
src/components/
├── price/
│   ├── price-calendar.tsx      # Preiskalender
│   ├── deal-indicator.tsx      # "Guter Preis" Badge
│   └── price-trend.tsx         # Preistrend-Graph
├── inspiration/
│   ├── destination-map.tsx     # Interaktive Weltkarte
│   ├── trending-widget.tsx     # Trending Destinations
│   └── budget-explorer.tsx     # "Wohin für €X?"
├── flight/
│   ├── delay-indicator.tsx     # Verspätungswahrscheinlichkeit
│   ├── eco-score.tsx           # CO2-Anzeige
│   └── trip-confidence.tsx     # Trip Score
└── post-booking/
    ├── flight-tracker.tsx      # Live Flugstatus
    ├── checkin-card.tsx        # Check-in Reminder
    └── booking-timeline.tsx    # Buchungs-Timeline
```

---

## 📈 KPIs & Erfolgsmessung

| Metrik | Ziel | Messung |
|--------|------|---------|
| Conversion Rate | +15% | A/B Test mit neuen Features |
| Time to Book | -30% | Analytics |
| User Satisfaction | >4.5/5 | Feedback-Widget |
| Return Visitors | +40% | Analytics |
| Feature Adoption | >60% | Feature-Tracking |

---

## 🔒 Sicherheit & Nachhaltigkeit

### Sicherheit
- Rate Limiting für alle API-Calls
- Input Validation (Zod/Yup)
- CORS korrekt konfiguriert
- Keine sensiblen Daten im Frontend-State

### Nachhaltigkeit
- Aggressive Caching (Redis + TanStack Query)
- Code-Splitting bereits implementiert
- Lazy Loading für schwere Komponenten
- API-Batching wo möglich

### Performance-Budget
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Bundle Size: <500KB (gzip)

---

## Fazit

Mit diesem strategischen Plan werden **alle 26 Amadeus-Endpunkte** sinnvoll genutzt:

✅ **8 bereits genutzt** (Core Booking)
🚀 **6 High-Priority** (Price Intelligence + Post-Booking)
🌍 **7 Medium-Priority** (Inspiration & Analytics)
🗺️ **5 Nice-to-Have** (Geo & Reference Data)

Die Kombination aus **branchenführenden UX-Patterns** (Google Flights, Hopper) und **innovativen Eigenentwicklungen** (Trip Confidence Score, Alternative Airport Finder) wird Flypink zur besten Flight IBE machen.
