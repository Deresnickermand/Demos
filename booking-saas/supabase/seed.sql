-- ============================================
-- SEED DATA - Test Business (Deres Auto)
-- ============================================

-- Create test business
INSERT INTO businesses (
    id,
    name,
    slug,
    email,
    phone,
    address,
    timezone,
    locale,
    settings,
    subscription_tier
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Deres Auto',
    'deres-auto',
    'info@deresauto.gl',
    '+299 32 10 00',
    'Aqqusinersuaq 42, 3900 Nuuk',
    'America/Godthab',
    'da',
    '{
        "branding": {
            "primary_color": "#1e40af",
            "logo_url": null,
            "welcome_text": "Book din tid hos Deres Auto - Nuuks pålidelige autoværksted"
        },
        "booking_rules": {
            "min_notice_hours": 2,
            "max_advance_days": 30,
            "slot_duration_minutes": 30
        },
        "notifications": {
            "email_enabled": true,
            "sms_enabled": true,
            "reminder_hours_before": 24
        },
        "opening_hours": {
            "monday": {"open": "08:00", "close": "17:00", "breaks": [{"start": "12:00", "end": "12:30"}]},
            "tuesday": {"open": "08:00", "close": "17:00", "breaks": [{"start": "12:00", "end": "12:30"}]},
            "wednesday": {"open": "08:00", "close": "17:00", "breaks": [{"start": "12:00", "end": "12:30"}]},
            "thursday": {"open": "08:00", "close": "17:00", "breaks": [{"start": "12:00", "end": "12:30"}]},
            "friday": {"open": "08:00", "close": "16:00", "breaks": [{"start": "12:00", "end": "12:30"}]},
            "saturday": {"open": null, "close": null, "breaks": []},
            "sunday": {"open": null, "close": null, "breaks": []}
        }
    }'::jsonb,
    'starter'
);

-- Create services for Deres Auto
INSERT INTO services (business_id, name, description, duration_minutes, price, currency, buffer_after, max_per_day, display_order) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Olieskift', 'Standard olieskift inkl. oliefilter', 30, 495.00, 'DKK', 15, 8, 1),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dækskift', 'Skift mellem sommer- og vinterdæk', 45, 350.00, 'DKK', 15, 6, 2),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Stor service', 'Komplet service med 50-punkts tjek', 120, 1495.00, 'DKK', 30, 3, 3),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bremseeftersyn', 'Tjek af bremser og bremsevæske', 60, 295.00, 'DKK', 15, 4, 4),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AC service', 'Aircondition påfyldning og tjek', 45, 595.00, 'DKK', 15, 4, 5),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Syn forberedelse', 'Gennemgang før syn', 90, 695.00, 'DKK', 15, 2, 6);

-- Create some test customers
INSERT INTO customers (id, business_id, name, email, phone, preferred_contact, locale) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hans Jensen', 'hans@example.gl', '+299 55 12 34', 'both', 'da'),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Maliina Petersen', 'maliina@example.gl', '+299 55 43 21', 'email', 'kl'),
('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Peter Olsen', 'peter@example.gl', NULL, 'email', 'da');

-- Create some test bookings (for tomorrow)
INSERT INTO bookings (business_id, service_id, customer_id, start_time, end_time, status, notes) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 (SELECT id FROM services WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Olieskift'),
 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
 (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00'),
 (CURRENT_DATE + INTERVAL '1 day' + TIME '09:30'),
 'confirmed',
 'VW Golf 2019'
),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 (SELECT id FROM services WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Stor service'),
 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00'),
 (CURRENT_DATE + INTERVAL '1 day' + TIME '12:00'),
 'confirmed',
 'Toyota RAV4 2021 - første service'
),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 (SELECT id FROM services WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Dækskift'),
 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
 (CURRENT_DATE + INTERVAL '1 day' + TIME '14:00'),
 (CURRENT_DATE + INTERVAL '1 day' + TIME '14:45'),
 'pending',
 'Skift til vinterdæk'
);

-- ============================================
-- Additional test business (Hair Salon)
-- ============================================

INSERT INTO businesses (
    id,
    name,
    slug,
    email,
    phone,
    address,
    timezone,
    locale,
    settings,
    subscription_tier
) VALUES (
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Salon Nuka',
    'salon-nuka',
    'booking@salonnuka.gl',
    '+299 31 22 33',
    'Imaneq 28, 3900 Nuuk',
    'America/Godthab',
    'kl',
    '{
        "branding": {
            "primary_color": "#db2777",
            "logo_url": null,
            "welcome_text": "Velkommen til Salon Nuka - Book din tid online"
        },
        "booking_rules": {
            "min_notice_hours": 4,
            "max_advance_days": 60,
            "slot_duration_minutes": 15
        },
        "notifications": {
            "email_enabled": true,
            "sms_enabled": false,
            "reminder_hours_before": 24
        },
        "opening_hours": {
            "monday": {"open": null, "close": null, "breaks": []},
            "tuesday": {"open": "10:00", "close": "18:00", "breaks": []},
            "wednesday": {"open": "10:00", "close": "18:00", "breaks": []},
            "thursday": {"open": "10:00", "close": "20:00", "breaks": []},
            "friday": {"open": "10:00", "close": "18:00", "breaks": []},
            "saturday": {"open": "10:00", "close": "15:00", "breaks": []},
            "sunday": {"open": null, "close": null, "breaks": []}
        }
    }'::jsonb,
    'free'
);

INSERT INTO services (business_id, name, description, duration_minutes, price, currency, display_order) VALUES
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Dameklip', 'Vask, klip og føn', 60, 450.00, 'DKK', 1),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Herreklip', 'Herreklip med vask', 30, 250.00, 'DKK', 2),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Børneklip', 'Klip til børn under 12', 20, 150.00, 'DKK', 3),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Farvning', 'Helfarvning inkl. klip', 120, 1200.00, 'DKK', 4),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Highlights', 'Striber/reflekser', 150, 1500.00, 'DKK', 5);
