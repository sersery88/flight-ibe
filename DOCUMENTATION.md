# Flight IBE - Internet Booking Engine

> Vollständige Flugbuchungsplattform mit Amadeus API Integration

[![Rust](https://img.shields.io/badge/Rust-2024_Edition-orange)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Amadeus](https://img.shields.io/badge/Amadeus-Self--Service_API-green)](https://developers.amadeus.com/)

---

## 📋 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Architektur](#architektur)
3. [Tech Stack](#tech-stack)
4. [Backend APIs](#backend-apis)
5. [Frontend Komponenten](#frontend-komponenten)
6. [Installation](#installation)
7. [Konfiguration](#konfiguration)
8. [API Referenz](#api-referenz)
9. [NDC Integration](#ndc-integration)
10. [Deployment](#deployment)
11. [Lizenz](#lizenz)

---

## 🎯 Überblick

Flight IBE ist eine moderne, vollständige Internet Booking Engine für Flugbuchungen. Das System integriert alle verfügbaren Amadeus Self-Service APIs und bietet eine benutzerfreundliche Oberfläche für:

- **Flugsuche** - Multi-City, Hin-/Rückflug, nur Hinflug
- **Preisvergleich** - Branded Fares, Upselling
- **Sitzplatzauswahl** - Interaktive Seatmaps
- **Buchung** - Vollständiger Buchungsflow mit Passagierdaten
- **Zusatzleistungen** - Gepäck, Sitzplätze, Special Services

### Features

| Feature | Beschreibung |
|---------|--------------|
| 🔍 **Intelligente Suche** | Autocomplete für Flughäfen/Städte, flexible Datumsauswahl |
| 💰 **Preisanalyse** | Historische Preisdaten, Quartil-Ranking |
| ✈️ **Flugstatus** | Echtzeit-Flugstatus und Verspätungsvorhersagen |
| 🪑 **Sitzplatzwahl** | Interaktive Seatmaps mit Preisen |
| 🎫 **Branded Fares** | Tarifvergleich (Economy/Business/First) |
| 🌍 **Multi-City** | Komplexe Reiserouten mit mehreren Zielen |
| 🌙 **Dark Mode** | Vollständige Dark Mode Unterstützung |
| 📱 **Responsive** | Optimiert für Desktop und Mobile |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   React 19  │  │  TanStack   │  │   Zustand   │              │
│  │  TypeScript │  │   Query v5  │  │   Stores    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                         │                                        │
│                    REST API Calls                                │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                    Backend (Rust)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Axum     │  │   Amadeus   │  │    Redis    │              │
│  │   Router    │  │   Client    │  │   Cache     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              │                     │                             │
│     ┌────────▼────────┐  ┌────────▼────────┐                    │
│     │  Self-Service   │  │    Enterprise   │                    │
│     │   REST APIs     │  │   SOAP/NDC      │                    │
│     └─────────────────┘  └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                    Amadeus APIs                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Shopping │ │ Booking  │ │Analytics │ │Reference │           │
│  │   APIs   │ │   APIs   │ │   APIs   │ │   Data   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **Rust** | 2024 Edition | Systemsprache für Performance & Sicherheit |
| **Axum** | 0.8+ | Async Web Framework |
| **Tokio** | 1.x | Async Runtime |
| **Reqwest** | 0.12+ | HTTP Client |
| **Serde** | 1.x | Serialisierung/Deserialisierung |
| **Redis** | Optional | Caching Layer |
| **Tracing** | 0.1+ | Logging & Instrumentation |

### Frontend

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| **React** | 19 | UI Library mit Concurrent Features |
| **TypeScript** | 5.8+ | Type-safe JavaScript |
| **Vite** | 7.2+ | Build Tool (Rolldown) |
| **TailwindCSS** | 4.0 | Utility-first CSS |
| **TanStack Query** | 5.x | Server State Management |
| **Zustand** | 5.x | Client State Management |
| **Motion** | 12.x | Animationen (Framer Motion) |
| **React Hook Form** | 7.x | Formular-Handling |
| **Zod** | 3.x | Schema Validation |
| **HeadlessUI** | 2.x | Accessible UI Primitives |

---

## 📡 Backend APIs

### Implementierte Amadeus APIs (34 Endpoints)

#### 🛒 Shopping APIs

| API | Methode | Endpoint | Beschreibung |
|-----|---------|----------|--------------|
| Flight Offers Search | GET/POST | `/v2/shopping/flight-offers` | Flugsuche mit allen Parametern |
| Flight Offers Price | POST | `/v1/shopping/flight-offers/pricing` | Preisbestätigung mit Gepäck |
| Branded Fares Upsell | POST | `/v1/shopping/flight-offers/upselling` | Alternative Tarife |
| Seatmap Display | POST/GET | `/v1/shopping/seatmaps` | Sitzplatzpläne |
| Flight Availabilities | POST | `/v1/shopping/availability/flight-availabilities` | Verfügbarkeiten |
| Flight Inspiration | GET | `/v1/shopping/flight-destinations` | Reiseziel-Inspiration |
| Cheapest Date Search | GET | `/v1/shopping/flight-dates` | Günstigste Reisedaten |

#### 📦 Booking APIs

| API | Methode | Endpoint | Beschreibung |
|-----|---------|----------|--------------|
| Flight Create Orders | POST | `/v1/booking/flight-orders` | Buchung erstellen |
| Flight Order Get | GET | `/v1/booking/flight-orders/{id}` | Buchung abrufen |
| Flight Order Delete | DELETE | `/v1/booking/flight-orders/{id}` | Buchung stornieren |

#### 📊 Analytics APIs

| API | Methode | Endpoint | Beschreibung |
|-----|---------|----------|--------------|
| Price Analysis | GET | `/v1/analytics/itinerary-price-metrics` | Preisanalyse |
| Delay Prediction | GET | `/v1/travel/predictions/flight-delay` | Verspätungsvorhersage |
| Choice Prediction | POST | `/v2/shopping/flight-offers/prediction` | Buchungswahrscheinlichkeit |
| Busiest Period | GET | `/v1/travel/analytics/air-traffic/busiest-period` | Reisezeit-Analyse |
| Air Traffic Booked | GET | `/v1/travel/analytics/air-traffic/booked` | Buchungsstatistiken |

#### 📚 Reference Data APIs

| API | Methode | Endpoint | Beschreibung |
|-----|---------|----------|--------------|
| Location Search | GET | `/v1/reference-data/locations` | Flughäfen/Städte suchen |
| Airport by Geocode | GET | `/v1/reference-data/locations/airports` | Flughäfen nach Koordinaten |
| Airlines | GET | `/v1/reference-data/airlines` | Airline-Informationen |
| Recommended Locations | GET | `/v1/reference-data/recommended-locations` | Reiseempfehlungen |
| Check-in Links | GET | `/v2/reference-data/urls/checkin-links` | Online Check-in Links |
| Airport Routes | GET | `/v1/airport/direct-destinations` | Direktverbindungen |
| Airline Destinations | GET | `/v1/airline/destinations` | Airline-Strecken |

#### ✈️ Operations APIs

| API | Methode | Endpoint | Beschreibung |
|-----|---------|----------|--------------|
| Flight Status | GET | `/v2/schedule/flights` | Flugstatus |
| Location Score | GET | `/v1/location/analytics/category-rated-areas` | Standortbewertung |

### Backend Endpoints

```
POST   /api/flights/search          - Flugsuche
POST   /api/flights/price           - Preisbestätigung
POST   /api/flights/book            - Buchung erstellen
GET    /api/flight-order/{id}       - Buchung abrufen
DELETE /api/flight-order/{id}       - Buchung stornieren
POST   /api/seatmaps                - Sitzplätze
POST   /api/upsell                  - Branded Fares
GET    /api/locations?keyword=      - Flughafensuche
GET    /api/airlines                - Airlines
GET    /api/flight-status           - Flugstatus
GET    /api/delay-prediction        - Verspätungsvorhersage
```

### Datenmodelle (109 Rust Structs)

Die wichtigsten Typen in `crates/api-server/src/models.rs`:

```rust
// Haupttypen
FlightOffer, Itinerary, Segment, Price, TravelerPricing
FareDetailsBySegment, BaggageAllowance, Amenity, Co2Emission

// Buchung
FlightOrderRequest, FlightOrderResponse, Traveler, TravelerDocument
Contact, TicketingAgreement, AssociatedRecord

// Seatmap
SeatmapData, Deck, Seat, SeatCoordinates, SeatTravelerPricing

// Analytics
ItineraryPriceMetric, DelayPrediction, FlightChoicePrediction

// Reference
Location, Airline, CheckinLink, BusiestPeriod
```

---

## 🎨 Frontend Komponenten

### Projektstruktur

```
frontend/src/
├── api/
│   └── client.ts              # API Client mit Fetch
├── components/
│   ├── ui/                    # Base UI Components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   ├── error-boundary.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── toast.tsx
│   │   └── empty-state.tsx
│   ├── flight/                # Flight-spezifische Components
│   │   ├── airport-combobox.tsx
│   │   ├── date-picker.tsx
│   │   ├── passenger-selector.tsx
│   │   ├── cabin-class-select.tsx
│   │   ├── trip-type-toggle.tsx
│   │   ├── search-form.tsx
│   │   ├── flight-card.tsx
│   │   ├── flight-list.tsx
│   │   ├── filter-sidebar.tsx
│   │   ├── sort-dropdown.tsx
│   │   ├── flight-details-modal.tsx
│   │   ├── fare-comparison.tsx
│   │   └── seatmap-display.tsx
│   └── booking/               # Buchungs-Components
│       ├── booking-wizard.tsx
│       ├── traveler-form.tsx
│       ├── payment-form.tsx
│       ├── apis-form.tsx
│       ├── booking-summary.tsx
│       └── confirmation-page.tsx
├── hooks/
│   └── use-flights.ts         # TanStack Query Hooks
├── lib/
│   └── utils.ts               # Utility Functions
├── pages/
│   ├── results-page.tsx
│   └── booking-page.tsx
├── stores/
│   ├── search-store.ts        # Zustand: Suchzustand
│   ├── booking-store.ts       # Zustand: Buchungszustand
│   └── theme-store.ts         # Zustand: Theme (Dark Mode)
├── types/
│   └── flight.ts              # TypeScript Typen
├── App.tsx                    # Haupt-App mit Navigation
└── index.css                  # Globale Styles
```

### Komponenten-Übersicht

#### UI Components

| Komponente | Beschreibung |
|------------|--------------|
| `Button` | Primär/Secondary/Ghost/Outline Varianten |
| `Input` | Text-Eingabe mit Label-Support |
| `Card` | Container mit Header/Content/Footer |
| `Skeleton` | Loading-Placeholder |
| `Badge` | Tags und Labels |
| `ErrorBoundary` | React Error Handler |
| `LoadingSpinner` | Lade-Animationen |
| `Toast` | Benachrichtigungen |
| `EmptyState` | Leere Zustände |

#### Flight Components

| Komponente | Beschreibung |
|------------|--------------|
| `AirportCombobox` | Autocomplete mit Debounce, beliebte Flughäfen |
| `DatePicker` | Single + Range Picker mit deutschem Locale |
| `PassengerSelector` | Erwachsene/Kinder/Babys mit Limits |
| `CabinClassSelect` | Economy/Premium/Business/First |
| `TripTypeToggle` | Hin & Zurück / Nur Hinflug / Gabelflug |
| `SearchForm` | Alle Suchkomponenten zusammengeführt |
| `FlightCard` | Einzelnes Flugangebot |
| `FlightList` | Liste mit Skeleton Loading |
| `FilterSidebar` | Filter nach Stops, Airlines, Preis |
| `SortDropdown` | Sortierung nach Preis/Dauer/Zeit |
| `FlightDetailsModal` | Detailansicht mit Segmenten |
| `FareComparison` | Branded Fares Vergleich |
| `SeatmapDisplay` | Interaktive Sitzplatzauswahl |

#### Booking Components

| Komponente | Beschreibung |
|------------|--------------|
| `BookingWizard` | 5-Step Progress Indicator |
| `TravelerForm` | Passagierdaten mit Zod Validation |
| `PaymentForm` | Kreditkarte mit Live-Preview |
| `APISForm` | Pass/ID für internationale Flüge |
| `BookingSummary` | Buchungsübersicht |
| `ConfirmationPage` | Erfolgsseite mit PNR |

### State Management

#### Search Store (Zustand)

```typescript
interface SearchState {
  // Locations
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;

  // Dates
  departureDate: string;
  returnDate: string;

  // Passengers
  adults: number;
  children: number;
  infants: number;

  // Options
  cabinClass: CabinClass;
  tripType: TripType;
  nonStop: boolean;

  // Results
  searchResults: FlightOffer[];
  selectedOffer: FlightOffer | null;
  isSearching: boolean;
}
```

#### Booking Store (Zustand)

```typescript
interface BookingState {
  currentStep: number;
  selectedOffer: FlightOffer | null;
  travelers: TravelerData[];
  contact: ContactData | null;
  payment: PaymentData | null;
  selectedSeats: SelectedSeat[];
  selectedAncillaries: SelectedAncillary[];
  bookingReference: string | null;
}
```

---

## 🚀 Installation

### Voraussetzungen

- **Rust** 1.82+ (Edition 2024)
- **Node.js** 20+
- **pnpm** oder **npm**
- **Redis** (optional, für Caching)

### Backend Setup

```bash
# Repository klonen
git clone https://github.com/your-org/flight-ibe.git
cd flight-ibe

# Umgebungsvariablen setzen
cp .env.example .env
# AMADEUS_CLIENT_ID und AMADEUS_CLIENT_SECRET eintragen

# Backend bauen
cargo build --release

# Backend starten
cargo run --release
```

### Frontend Setup

```bash
# In Frontend-Verzeichnis wechseln
cd frontend

# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build
```

---

## ⚙️ Konfiguration

### Umgebungsvariablen

```bash
# Amadeus API (Pflicht)
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret

# Umgebung (optional, default: test)
AMADEUS_ENV=test              # test | production

# Redis Cache (optional)
REDIS_URL=redis://localhost:6379

# Server (optional)
HOST=0.0.0.0
PORT=3000
```

### Amadeus API Zugangsdaten

1. Registrieren bei [Amadeus for Developers](https://developers.amadeus.com/)
2. Self-Service App erstellen
3. Client ID und Secret kopieren
4. In `.env` eintragen

### Test vs Production

| Umgebung | URL | Daten |
|----------|-----|-------|
| **Test** | test.api.amadeus.com | Sandbox-Daten |
| **Production** | api.amadeus.com | Live-Daten |

> ⚠️ **Wichtig**: Für Production-Ticketing ist IATA/ARC Akkreditierung oder Consolidator-Partner nötig!

---

## 📖 API Referenz

### Flugsuche

```bash
POST /api/flights/search
Content-Type: application/json

{
  "origin": "FRA",
  "destination": "JFK",
  "departure_date": "2025-03-15",
  "return_date": "2025-03-22",
  "adults": 2,
  "children": 1,
  "infants": 0,
  "travel_class": "ECONOMY",
  "non_stop": false,
  "currency_code": "EUR",
  "max": 50
}
```

### Preisbestätigung

```bash
POST /api/flights/price
Content-Type: application/json

{
  "flight_offers": [/* FlightOffer Object */],
  "include_bags": true
}
```

### Buchung erstellen

```bash
POST /api/flights/book
Content-Type: application/json

{
  "flight_offers": [/* FlightOffer Object */],
  "travelers": [
    {
      "id": "1",
      "date_of_birth": "1990-01-15",
      "gender": "MALE",
      "name": {
        "first_name": "MAX",
        "last_name": "MUSTERMANN"
      },
      "contact": {
        "email_address": "max@example.com",
        "phones": [
          {
            "country_calling_code": "49",
            "number": "1234567890"
          }
        ]
      },
      "documents": [
        {
          "document_type": "PASSPORT",
          "number": "AB1234567",
          "expiry_date": "2030-01-01",
          "issuance_country": "DE",
          "nationality": "DE"
        }
      ]
    }
  ],
  "ticketing_agreement": {
    "option": "DELAY_TO_QUEUE",
    "date_time": "2025-03-14T23:59:00"
  }
}
```

### Seatmap abrufen

```bash
POST /api/seatmaps
Content-Type: application/json

{
  "flight_offers": [/* FlightOffer Object */]
}
```

---

## 🔌 NDC Integration

### Übersicht

NDC (New Distribution Capability) ist der IATA-Standard für direkten Airline-Content. Flight IBE unterstützt NDC über die **Amadeus Enterprise** Plattform.

### Architektur

```
┌─────────────────────────────────────────────────────┐
│                  Unified Provider                    │
│  ┌─────────────────┐     ┌─────────────────┐        │
│  │ SelfServiceProv │     │ EnterpriseNdc   │        │
│  │   (GDS/REST)    │     │   (NDC/SOAP)    │        │
│  └────────┬────────┘     └────────┬────────┘        │
│           │                       │                  │
│           └───────────┬───────────┘                  │
│                       │                              │
│              ┌────────▼────────┐                     │
│              │ CombinedProvider │                    │
│              └─────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### Trait-basierte Abstraktion

```rust
// Definiert in crates/api-server/src/ndc/traits.rs

#[async_trait]
pub trait FlightSearchProvider {
    async fn search_flights(&self, request: &FlightSearchRequest)
        -> Result<FlightOffersResponse>;
}

#[async_trait]
pub trait FlightPricingProvider {
    async fn price_offers(&self, offers: &[FlightOffer])
        -> Result<FlightPriceResponse>;
}

#[async_trait]
pub trait FlightBookingProvider {
    async fn create_order(&self, request: &FlightOrderRequest)
        -> Result<FlightOrderResponse>;
}

#[async_trait]
pub trait SeatmapProvider {
    async fn get_seatmaps(&self, offers: &[FlightOffer])
        -> Result<SeatmapResponse>;
}
```

### NDC Airlines (über Amadeus Enterprise)

| Airline | IATA | NDC Status |
|---------|------|------------|
| Lufthansa | LH | ✅ Voll |
| Swiss | LX | ✅ Voll |
| Austrian | OS | ✅ Voll |
| Air France | AF | ✅ Voll |
| KLM | KL | ✅ Voll |
| British Airways | BA | ✅ Voll |
| American Airlines | AA | ✅ Voll |
| Qantas | QF | ✅ Voll |
| Singapore Airlines | SQ | ✅ Voll |

> ⏳ **Hinweis**: NDC SOAP APIs erfordern Amadeus Enterprise Vertrag

### Self-Service vs Enterprise

| Feature | Self-Service | Enterprise |
|---------|--------------|------------|
| **API Typ** | REST/JSON | SOAP/XML |
| **Airlines** | ~400 via GDS | + 19 NDC Airlines |
| **Content** | Public Fares | + Private/Negotiated |
| **Rich Content** | ❌ | ✅ Bilder, Videos |
| **Dynamic Pricing** | ❌ | ✅ |
| **Kosten** | Free/Pay-as-go | Enterprise Vertrag |

---

## 🚢 Deployment

### Docker

```dockerfile
# Backend
FROM rust:1.82-alpine AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM alpine:latest
COPY --from=builder /app/target/release/api-server /usr/local/bin/
EXPOSE 3000
CMD ["api-server"]
```

```dockerfile
# Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/ .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AMADEUS_CLIENT_ID=${AMADEUS_CLIENT_ID}
      - AMADEUS_CLIENT_SECRET=${AMADEUS_CLIENT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Render.com Deployment

Das Projekt ist für Render.com optimiert:

1. **Web Service** für Backend (Rust)
2. **Static Site** für Frontend (Vite Build)
3. **Redis** für Caching (optional)

---

## 📊 Monitoring & Logging

### Tracing

Das Backend verwendet `tracing` für strukturiertes Logging:

```rust
#[instrument(skip(state))]
async fn search_flights(
    State(state): State<AppState>,
    Json(request): Json<FlightSearchRequest>,
) -> Result<Json<FlightOffersResponse>, AppError> {
    info!("Flight search request received");
    // ...
}
```

### Log Levels

| Level | Beschreibung |
|-------|--------------|
| ERROR | Kritische Fehler |
| WARN | Warnungen (z.B. Sandbox-Limits) |
| INFO | Normale Operationen |
| DEBUG | Detaillierte Debugging-Infos |
| TRACE | Sehr detailliert (API Responses) |

---

## 🔒 Sicherheit

### Best Practices

- ✅ API Secrets in Umgebungsvariablen
- ✅ Token-Caching mit TTL (30 Min)
- ✅ CORS konfigurierbar
- ✅ Input Validation (Zod Frontend, Serde Backend)
- ✅ Error Handling ohne Sensitive Data Leaks

### IATA/ARC Akkreditierung

Für **Production Ticketing** ist eine der folgenden Optionen nötig:

1. **IATA Akkreditierung** - Direkte Akkreditierung bei IATA
2. **ARC Akkreditierung** - Für US-Markt
3. **Consolidator Partner** - Partnerschaft mit akkreditierter Agency

> Amadeus unterstützt bei der Vermittlung von Consolidator-Partnern

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

---

## 🤝 Support

- **Amadeus Developer Portal**: https://developers.amadeus.com/
- **API Dokumentation**: https://amadeus4dev.github.io/amadeus-api-docs/
- **GitHub Issues**: Für Bug Reports und Feature Requests

---

*Erstellt mit ❤️ für die Reisebranche*
