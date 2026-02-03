-- ============================================
-- BOOKING SAAS - Booking Functions
-- ============================================

-- ============================================
-- FUNCTION: get_business_by_slug
-- Public endpoint for widget
-- ============================================

CREATE OR REPLACE FUNCTION get_business_by_slug(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(100),
    timezone VARCHAR(100),
    locale locale_type,
    settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.slug,
        b.timezone,
        b.locale,
        jsonb_build_object(
            'branding', b.settings->'branding',
            'opening_hours', b.settings->'opening_hours',
            'booking_rules', b.settings->'booking_rules'
        ) as settings
    FROM businesses b
    WHERE b.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_services_by_business
-- Get active services for a business (public)
-- ============================================

CREATE OR REPLACE FUNCTION get_services_by_business(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    duration_minutes INTEGER,
    price DECIMAL(10, 2),
    currency VARCHAR(3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.description,
        s.duration_minutes,
        s.price,
        s.currency
    FROM services s
    WHERE s.business_id = p_business_id
      AND s.active = true
    ORDER BY s.display_order, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_available_slots
-- Returns available time slots for a given date
-- ============================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_business_id UUID,
    p_service_id UUID,
    p_date DATE
)
RETURNS TABLE (
    slot_time TIMESTAMPTZ,
    slot_end TIMESTAMPTZ
) AS $$
DECLARE
    v_business RECORD;
    v_service RECORD;
    v_day_name TEXT;
    v_open_time TIME;
    v_close_time TIME;
    v_slot_duration INTEGER;
    v_min_notice_hours INTEGER;
    v_max_advance_days INTEGER;
    v_current_slot TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_buffer_before INTEGER;
    v_buffer_after INTEGER;
    v_max_per_day INTEGER;
    v_bookings_today INTEGER;
    v_min_booking_time TIMESTAMPTZ;
    v_max_booking_time TIMESTAMPTZ;
BEGIN
    -- Get business settings
    SELECT
        b.timezone,
        (b.settings->'booking_rules'->>'slot_duration_minutes')::INTEGER,
        (b.settings->'booking_rules'->>'min_notice_hours')::INTEGER,
        (b.settings->'booking_rules'->>'max_advance_days')::INTEGER,
        b.settings->'opening_hours'
    INTO v_business
    FROM businesses b
    WHERE b.id = p_business_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get service details
    SELECT
        s.duration_minutes,
        s.buffer_before,
        s.buffer_after,
        s.max_per_day
    INTO v_service
    FROM services s
    WHERE s.id = p_service_id
      AND s.business_id = p_business_id
      AND s.active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get day name
    v_day_name := LOWER(TO_CHAR(p_date, 'fmday'));

    -- Get opening hours for this day
    v_open_time := (v_business.opening_hours->v_day_name->>'open')::TIME;
    v_close_time := (v_business.opening_hours->v_day_name->>'close')::TIME;

    -- If closed this day, return empty
    IF v_open_time IS NULL OR v_close_time IS NULL THEN
        RETURN;
    END IF;

    -- Set defaults
    v_slot_duration := COALESCE(v_business.slot_duration_minutes, 30);
    v_min_notice_hours := COALESCE(v_business.min_notice_hours, 2);
    v_max_advance_days := COALESCE(v_business.max_advance_days, 30);
    v_buffer_before := COALESCE(v_service.buffer_before, 0);
    v_buffer_after := COALESCE(v_service.buffer_after, 0);

    -- Calculate min/max booking times
    v_min_booking_time := NOW() + (v_min_notice_hours || ' hours')::INTERVAL;
    v_max_booking_time := NOW() + (v_max_advance_days || ' days')::INTERVAL;

    -- Check if date is within allowed range
    IF p_date < CURRENT_DATE OR p_date::TIMESTAMPTZ > v_max_booking_time THEN
        RETURN;
    END IF;

    -- Check max bookings per day for this service
    IF v_service.max_per_day IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_bookings_today
        FROM bookings bo
        WHERE bo.service_id = p_service_id
          AND bo.start_time::DATE = p_date
          AND bo.status NOT IN ('cancelled');

        IF v_bookings_today >= v_service.max_per_day THEN
            RETURN;
        END IF;
    END IF;

    -- Generate slots
    v_current_slot := p_date + v_open_time;

    WHILE v_current_slot + (v_service.duration_minutes || ' minutes')::INTERVAL <= p_date + v_close_time LOOP
        v_slot_end := v_current_slot + (v_service.duration_minutes || ' minutes')::INTERVAL;

        -- Check if slot is in the future (with min notice)
        IF v_current_slot >= v_min_booking_time THEN
            -- Check if slot is available (no overlapping bookings)
            IF NOT EXISTS (
                SELECT 1
                FROM bookings bo
                WHERE bo.business_id = p_business_id
                  AND bo.status NOT IN ('cancelled')
                  AND (
                      -- Check overlap with buffer
                      (bo.start_time - (v_buffer_before || ' minutes')::INTERVAL) < v_slot_end + (v_buffer_after || ' minutes')::INTERVAL
                      AND (bo.end_time + (v_buffer_after || ' minutes')::INTERVAL) > v_current_slot - (v_buffer_before || ' minutes')::INTERVAL
                  )
            )
            -- Check if slot is not in blocked times
            AND NOT EXISTS (
                SELECT 1
                FROM blocked_times bt
                WHERE bt.business_id = p_business_id
                  AND bt.start_time < v_slot_end
                  AND bt.end_time > v_current_slot
            ) THEN
                slot_time := v_current_slot;
                slot_end := v_slot_end;
                RETURN NEXT;
            END IF;
        END IF;

        -- Move to next slot
        v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_available_dates
-- Returns dates with available slots in a month
-- ============================================

CREATE OR REPLACE FUNCTION get_available_dates(
    p_business_id UUID,
    p_service_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    available_date DATE,
    slot_count INTEGER
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_current_date DATE;
    v_count INTEGER;
BEGIN
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Start from today if start_date is in the past
    IF v_start_date < CURRENT_DATE THEN
        v_start_date := CURRENT_DATE;
    END IF;

    v_current_date := v_start_date;

    WHILE v_current_date <= v_end_date LOOP
        SELECT COUNT(*)
        INTO v_count
        FROM get_available_slots(p_business_id, p_service_id, v_current_date);

        IF v_count > 0 THEN
            available_date := v_current_date;
            slot_count := v_count;
            RETURN NEXT;
        END IF;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: create_booking
-- Creates a new booking with validation
-- ============================================

CREATE OR REPLACE FUNCTION create_booking(
    p_business_id UUID,
    p_service_id UUID,
    p_start_time TIMESTAMPTZ,
    p_customer_name VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_customer_phone VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_locale locale_type DEFAULT 'da'
)
RETURNS TABLE (
    success BOOLEAN,
    booking_id UUID,
    error_code VARCHAR(50),
    error_message TEXT
) AS $$
DECLARE
    v_service RECORD;
    v_customer_id UUID;
    v_booking_id UUID;
    v_end_time TIMESTAMPTZ;
    v_business RECORD;
    v_slot_available BOOLEAN;
BEGIN
    -- Validate business exists and get subscription info
    SELECT
        b.id,
        b.subscription_tier,
        b.monthly_booking_count,
        b.settings
    INTO v_business
    FROM businesses b
    WHERE b.id = p_business_id;

    IF NOT FOUND THEN
        success := false;
        error_code := 'BUSINESS_NOT_FOUND';
        error_message := 'Virksomheden blev ikke fundet';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check subscription limits
    IF v_business.subscription_tier = 'free' AND v_business.monthly_booking_count >= 25 THEN
        success := false;
        error_code := 'LIMIT_REACHED';
        error_message := 'Virksomheden har nået sin månedlige booking-grænse';
        RETURN NEXT;
        RETURN;
    ELSIF v_business.subscription_tier = 'starter' AND v_business.monthly_booking_count >= 100 THEN
        success := false;
        error_code := 'LIMIT_REACHED';
        error_message := 'Virksomheden har nået sin månedlige booking-grænse';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Validate service exists and is active
    SELECT
        s.id,
        s.duration_minutes,
        s.buffer_before,
        s.buffer_after
    INTO v_service
    FROM services s
    WHERE s.id = p_service_id
      AND s.business_id = p_business_id
      AND s.active = true;

    IF NOT FOUND THEN
        success := false;
        error_code := 'SERVICE_NOT_FOUND';
        error_message := 'Ydelsen blev ikke fundet eller er ikke aktiv';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Calculate end time
    v_end_time := p_start_time + (v_service.duration_minutes || ' minutes')::INTERVAL;

    -- Check if slot is available
    SELECT EXISTS (
        SELECT 1
        FROM get_available_slots(p_business_id, p_service_id, p_start_time::DATE) gas
        WHERE gas.slot_time = p_start_time
    ) INTO v_slot_available;

    IF NOT v_slot_available THEN
        success := false;
        error_code := 'SLOT_NOT_AVAILABLE';
        error_message := 'Tiden er desværre ikke længere ledig. Vælg venligst en anden tid.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id
    FROM customers c
    WHERE c.business_id = p_business_id
      AND c.email = p_customer_email;

    IF NOT FOUND THEN
        INSERT INTO customers (
            business_id,
            name,
            email,
            phone,
            preferred_contact,
            locale
        ) VALUES (
            p_business_id,
            p_customer_name,
            p_customer_email,
            p_customer_phone,
            CASE
                WHEN p_customer_phone IS NOT NULL THEN 'both'::contact_preference
                ELSE 'email'::contact_preference
            END,
            p_locale
        )
        RETURNING id INTO v_customer_id;
    ELSE
        -- Update customer info if needed
        UPDATE customers
        SET
            name = COALESCE(p_customer_name, name),
            phone = COALESCE(p_customer_phone, phone),
            preferred_contact = CASE
                WHEN p_customer_phone IS NOT NULL AND phone IS NULL THEN 'both'::contact_preference
                ELSE preferred_contact
            END
        WHERE id = v_customer_id;
    END IF;

    -- Create booking
    INSERT INTO bookings (
        business_id,
        service_id,
        customer_id,
        start_time,
        end_time,
        status,
        notes
    ) VALUES (
        p_business_id,
        p_service_id,
        v_customer_id,
        p_start_time,
        v_end_time,
        'confirmed',
        p_notes
    )
    RETURNING id INTO v_booking_id;

    -- Return success
    success := true;
    booking_id := v_booking_id;
    error_code := NULL;
    error_message := NULL;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: cancel_booking_by_token
-- Allows customers to cancel via token link
-- ============================================

CREATE OR REPLACE FUNCTION cancel_booking_by_token(
    p_token UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_booking RECORD;
BEGIN
    -- Find booking
    SELECT
        b.id,
        b.status,
        b.start_time
    INTO v_booking
    FROM bookings b
    WHERE b.cancellation_token = p_token;

    IF NOT FOUND THEN
        success := false;
        error_message := 'Booking ikke fundet';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if already cancelled
    IF v_booking.status = 'cancelled' THEN
        success := false;
        error_message := 'Bookingen er allerede aflyst';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if already completed or in the past
    IF v_booking.status = 'completed' OR v_booking.start_time < NOW() THEN
        success := false;
        error_message := 'Bookingen kan ikke længere aflyses';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Cancel booking
    UPDATE bookings
    SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'customer',
        cancellation_reason = p_reason
    WHERE id = v_booking.id;

    success := true;
    error_message := NULL;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_booking_details
-- Get booking details for confirmation/cancellation page
-- ============================================

CREATE OR REPLACE FUNCTION get_booking_details(p_token UUID)
RETURNS TABLE (
    booking_id UUID,
    business_name VARCHAR(255),
    service_name VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status booking_status,
    customer_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bo.id,
        b.name,
        s.name,
        bo.start_time,
        bo.end_time,
        bo.status,
        c.name
    FROM bookings bo
    JOIN businesses b ON bo.business_id = b.id
    JOIN services s ON bo.service_id = s.id
    JOIN customers c ON bo.customer_id = c.id
    WHERE bo.cancellation_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_bookings_needing_reminder
-- For cron job to find bookings needing reminders
-- ============================================

CREATE OR REPLACE FUNCTION get_bookings_needing_reminder()
RETURNS TABLE (
    booking_id UUID,
    business_id UUID,
    business_name VARCHAR(255),
    business_settings JSONB,
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_locale locale_type,
    customer_preferred_contact contact_preference,
    service_name VARCHAR(255),
    start_time TIMESTAMPTZ,
    cancellation_token UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bo.id,
        bo.business_id,
        b.name,
        b.settings,
        c.id,
        c.name,
        c.email,
        c.phone,
        c.locale,
        c.preferred_contact,
        s.name,
        bo.start_time,
        bo.cancellation_token
    FROM bookings bo
    JOIN businesses b ON bo.business_id = b.id
    JOIN customers c ON bo.customer_id = c.id
    JOIN services s ON bo.service_id = s.id
    WHERE bo.status = 'confirmed'
      AND bo.reminder_sent_at IS NULL
      AND bo.start_time > NOW()
      AND bo.start_time <= NOW() + INTERVAL '25 hours'
      AND bo.start_time >= NOW() + INTERVAL '23 hours'
      AND (b.settings->'notifications'->>'email_enabled')::BOOLEAN = true
         OR (b.settings->'notifications'->>'sms_enabled')::BOOLEAN = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: mark_reminder_sent
-- Mark reminder as sent for a booking
-- ============================================

CREATE OR REPLACE FUNCTION mark_reminder_sent(p_booking_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE bookings
    SET reminder_sent_at = NOW()
    WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_dashboard_stats
-- Statistics for admin dashboard
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_business_id UUID)
RETURNS TABLE (
    today_bookings BIGINT,
    week_bookings BIGINT,
    month_bookings BIGINT,
    new_customers_week BIGINT,
    no_shows_month BIGINT,
    cancellations_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM bookings
         WHERE business_id = p_business_id
           AND start_time::DATE = CURRENT_DATE
           AND status NOT IN ('cancelled'))::BIGINT,

        (SELECT COUNT(*) FROM bookings
         WHERE business_id = p_business_id
           AND start_time >= DATE_TRUNC('week', CURRENT_DATE)
           AND start_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
           AND status NOT IN ('cancelled'))::BIGINT,

        (SELECT COUNT(*) FROM bookings
         WHERE business_id = p_business_id
           AND start_time >= DATE_TRUNC('month', CURRENT_DATE)
           AND start_time < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
           AND status NOT IN ('cancelled'))::BIGINT,

        (SELECT COUNT(*) FROM customers
         WHERE business_id = p_business_id
           AND created_at >= DATE_TRUNC('week', CURRENT_DATE))::BIGINT,

        (SELECT COUNT(*) FROM bookings
         WHERE business_id = p_business_id
           AND status = 'no_show'
           AND start_time >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT,

        (SELECT COUNT(*) FROM bookings
         WHERE business_id = p_business_id
           AND status = 'cancelled'
           AND cancelled_at >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: reset_monthly_counters
-- Called by cron on 1st of month
-- ============================================

CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS VOID AS $$
BEGIN
    UPDATE businesses
    SET
        monthly_booking_count = 0,
        monthly_sms_count = 0,
        billing_cycle_start = CURRENT_DATE
    WHERE billing_cycle_start IS NULL
       OR billing_cycle_start < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
