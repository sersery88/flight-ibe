-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (reuse from hotel)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Flights table (cached from Amadeus)
CREATE TABLE flights (
    id VARCHAR(255) PRIMARY KEY,
    flight_id VARCHAR(255) UNIQUE NOT NULL,
    airline_code VARCHAR(3),
    flight_number VARCHAR(10),
    departure_airport IATA_CODE VARCHAR(3),
    arrival_airport VARCHAR(3),
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    stops INTEGER DEFAULT 0,
    aircraft JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flights_departure_airport ON flights(departure_airport);
CREATE INDEX idx_flights_arrival_airport ON flights(arrival_airport);
CREATE INDEX idx_flights_departure_time ON flights(departure_time);

-- Flight Offers table
CREATE TABLE flight_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id VARCHAR(255) UNIQUE NOT NULL,
    search_hash VARCHAR(64),
    price_total DECIMAL(10,2),
    currency_code VARCHAR(3),
    offer_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_flight_offers_search_hash ON flight_offers(search_hash);
CREATE INDEX idx_flight_offers_expires_at ON flight_offers(expires_at);

-- Bookings table
CREATE TABLE flight_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    order_id VARCHAR(255) UNIQUE,
    offer_id UUID REFERENCES flight_offers(id),
    pnr VARCHAR(10),
    status VARCHAR(50) NOT NULL,
    departure_date DATE,
    return_date DATE,
    adults INTEGER NOT NULL,
    children INTEGER NOT NULL,
    infants INTEGER NOT NULL,
    total_price DECIMAL(10,2),
    currency_code VARCHAR(3),
    passenger_data JSONB,
    booking_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_flight_bookings_user_id ON flight_bookings(user_id);
CREATE INDEX idx_flight_bookings_status ON flight_bookings(status);
CREATE INDEX idx_flight_bookings_order_id ON flight_bookings(order_id);

-- Search cache table
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_params_hash VARCHAR(64) UNIQUE NOT NULL,
    search_params JSONB NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_search_cache_hash ON search_cache(search_params_hash);
CREATE INDEX idx_search_cache_expires_at ON search_cache(expires_at);

-- Rate limit tracking
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    last_reset TIMESTAMP WITH TIME ZONE NOT NULL,
    requests_remaining INTEGER NOT NULL,
    requests_total INTEGER NOT NULL,
    reset_interval_seconds INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_rate_limits_endpoint ON rate_limits(endpoint);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_flights_updated_at BEFORE UPDATE ON flights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_flight_offers_updated_at BEFORE UPDATE ON flight_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_flight_bookings_updated_at BEFORE UPDATE ON flight_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
