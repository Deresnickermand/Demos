-- ============================================
-- BOOKING SAAS - Initial Database Schema
-- Target: Greenlandic market (booking.gl)
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Subscription tiers removed - billing handled externally or not at all
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE contact_preference AS ENUM ('email', 'sms', 'both');
CREATE TYPE notification_type AS ENUM ('confirmation', 'reminder', 'cancellation', 'change');
CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
CREATE TYPE locale_type AS ENUM ('da', 'en');

-- ============================================
-- TABLE: businesses
-- Virksomheder der bruger systemet
-- ============================================

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    timezone VARCHAR(100) DEFAULT 'America/Godthab',
    locale locale_type DEFAULT 'da',
    settings JSONB DEFAULT '{
        "branding": {
            "primary_color": "#2563eb",
            "logo_url": null,
            "welcome_text": null
        },
        "booking_rules": {
            "min_notice_hours": 2,
            "max_advance_days": 30,
            "slot_duration_minutes": 30
        },
        "notifications": {
            "email_enabled": true,
            "sms_enabled": false,
            "reminder_hours_before": 24
        },
        "opening_hours": {
            "monday": {"open": "09:00", "close": "17:00", "breaks": []},
            "tuesday": {"open": "09:00", "close": "17:00", "breaks": []},
            "wednesday": {"open": "09:00", "close": "17:00", "breaks": []},
            "thursday": {"open": "09:00", "close": "17:00", "breaks": []},
            "friday": {"open": "09:00", "close": "17:00", "breaks": []},
            "saturday": {"open": null, "close": null, "breaks": []},
            "sunday": {"open": null, "close": null, "breaks": []}
        }
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles
-- Links auth.users til businesses
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'owner',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: services
-- Ydelser hver virksomhed tilbyder
-- ============================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'DKK',
    buffer_before INTEGER DEFAULT 0,  -- minutes
    buffer_after INTEGER DEFAULT 0,   -- minutes
    max_per_day INTEGER,              -- null = unlimited
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: customers
-- Slutkunder der booker
-- ============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    preferred_contact contact_preference DEFAULT 'email',
    locale locale_type DEFAULT 'da',
    notes TEXT,
    total_bookings INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, email)
);

-- ============================================
-- TABLE: bookings
-- Selve bookingerne
-- ============================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status booking_status DEFAULT 'pending',
    notes TEXT,
    internal_notes TEXT,  -- Only visible to business
    cancellation_token UUID DEFAULT uuid_generate_v4(),
    reminder_sent_at TIMESTAMPTZ,
    confirmation_sent_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by VARCHAR(50),  -- 'customer', 'business', 'system'
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure end_time is after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ============================================
-- TABLE: notifications
-- Log over sendte beskeder
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    recipient VARCHAR(255) NOT NULL,  -- email or phone
    message_content TEXT,
    status notification_status DEFAULT 'pending',
    external_id VARCHAR(255),  -- ID from email/SMS provider
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: blocked_times
-- Blokerede tider (ferie, møder, etc.)
-- ============================================

CREATE TABLE blocked_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- Performance optimization
-- ============================================

-- Businesses
CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Services
CREATE INDEX idx_services_business ON services(business_id);
CREATE INDEX idx_services_business_active ON services(business_id, active) WHERE active = true;

-- Customers
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_email ON customers(business_id, email);
CREATE INDEX idx_customers_phone ON customers(business_id, phone) WHERE phone IS NOT NULL;

-- Bookings
CREATE INDEX idx_bookings_business ON bookings(business_id);
CREATE INDEX idx_bookings_business_start ON bookings(business_id, start_time);
CREATE INDEX idx_bookings_business_status ON bookings(business_id, status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_cancellation_token ON bookings(cancellation_token);

-- For reminder queries
CREATE INDEX idx_bookings_reminder_pending ON bookings(start_time, status)
    WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Notifications
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'pending';

-- Blocked times
CREATE INDEX idx_blocked_times_business ON blocked_times(business_id);
CREATE INDEX idx_blocked_times_range ON blocked_times(business_id, start_time, end_time);

-- ============================================
-- FUNCTIONS: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update customer booking stats
-- ============================================

CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers
        SET total_bookings = total_bookings + 1
        WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'no_show' AND NEW.status = 'no_show' THEN
        UPDATE customers
        SET no_shows = no_shows + 1
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_booking_stats
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: businesses
-- ============================================

-- Business owners can see and update their own business
CREATE POLICY "Users can view own business" ON businesses
    FOR SELECT USING (
        id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update own business" ON businesses
    FOR UPDATE USING (
        id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

-- Public can view basic business info via slug (for widget)
CREATE POLICY "Public can view business by slug" ON businesses
    FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES: profiles
-- ============================================

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- RLS POLICIES: services
-- ============================================

-- Public can view active services (for widget)
CREATE POLICY "Public can view active services" ON services
    FOR SELECT USING (active = true);

-- Business owners can manage their services
CREATE POLICY "Business owners can manage services" ON services
    FOR ALL USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

-- ============================================
-- RLS POLICIES: customers
-- ============================================

-- Only business owners can see their customers
CREATE POLICY "Business owners can view customers" ON customers
    FOR SELECT USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Business owners can manage customers" ON customers
    FOR ALL USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

-- Allow anonymous insert for public bookings
CREATE POLICY "Public can create customers" ON customers
    FOR INSERT WITH CHECK (true);

-- ============================================
-- RLS POLICIES: bookings
-- ============================================

-- Business owners can see their bookings
CREATE POLICY "Business owners can view bookings" ON bookings
    FOR SELECT USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Business owners can manage bookings" ON bookings
    FOR ALL USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

-- Allow anonymous insert for public bookings
CREATE POLICY "Public can create bookings" ON bookings
    FOR INSERT WITH CHECK (true);

-- Allow public to view own booking via cancellation token
CREATE POLICY "Public can view booking by token" ON bookings
    FOR SELECT USING (true);

-- Allow public to cancel via token
CREATE POLICY "Public can cancel own booking" ON bookings
    FOR UPDATE USING (true)
    WITH CHECK (
        -- Only allow status change to cancelled
        status = 'cancelled'
    );

-- ============================================
-- RLS POLICIES: notifications
-- ============================================

CREATE POLICY "Business owners can view notifications" ON notifications
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
        )
    );

-- System/service role can insert
CREATE POLICY "Service can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- ============================================
-- RLS POLICIES: blocked_times
-- ============================================

CREATE POLICY "Business owners can manage blocked times" ON blocked_times
    FOR ALL USING (
        business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Public can view blocked times" ON blocked_times
    FOR SELECT USING (true);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
