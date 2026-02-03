# Booking.gl - SaaS Booking System

A complete SaaS booking system designed for the Greenlandic market, featuring:

- **Embeddable widget** for easy integration on any website
- **Admin dashboard** for business management
- **Multi-language support** (Danish, English)
- **Email & SMS notifications** via Resend and 46elks

## Project Structure

```
booking-saas/
├── supabase/
│   ├── migrations/          # Database schema
│   ├── functions/           # Edge Functions
│   │   ├── send-email/      # Email notifications (Resend)
│   │   ├── send-sms/        # SMS notifications (46elks)
│   │   ├── process-reminders/ # Cron job for reminders
│   │   ├── handle-booking-created/ # Webhook handler
│   │   └── cancel-booking/  # Customer cancellation page
│   └── seed.sql             # Test data
├── widget/                   # Embeddable Preact widget
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── api/             # Supabase client
│   │   ├── styles/          # CSS
│   │   └── types.ts         # TypeScript types
│   └── vite.config.ts       # Build configuration
└── admin/                    # Next.js admin dashboard
    └── src/
        ├── app/             # App Router pages
        ├── components/      # Shared components
        ├── lib/             # Supabase client
        └── types/           # TypeScript types
```

## Getting Started

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations:
   ```bash
   cd supabase
   supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy
   ```

### 2. Environment Variables

Create `.env` files in each project:

**Supabase Functions (set via Supabase dashboard):**
```
RESEND_API_KEY=re_xxxxx
ELKS_API_USER=uxxxxx
ELKS_API_PASSWORD=xxxxx
SITE_URL=https://admin.booking.gl
```

**Widget (`widget/.env`):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Admin (`admin/.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Build Widget

```bash
cd widget
npm install
npm run build
```

The bundled widget will be at `dist/widget.js`.

### 4. Run Admin Dashboard

```bash
cd admin
npm install
npm run dev
```

## Widget Integration

Add this script tag to any website:

```html
<script
  src="https://booking.gl/widget.js"
  data-business="your-business-slug"
></script>
```

### Customization Options

```html
<script
  src="https://booking.gl/widget.js"
  data-business="your-business-slug"
  data-theme="dark"
  data-primary-color="#db2777"
  data-locale="en"
></script>
```

## API Reference

### Database Functions

- `get_business_by_slug(slug)` - Get business info
- `get_services_by_business(business_id)` - Get active services
- `get_available_slots(business_id, service_id, date)` - Get available time slots
- `get_available_dates(business_id, service_id, year, month)` - Get dates with availability
- `create_booking(...)` - Create a new booking
- `cancel_booking_by_token(token)` - Customer self-service cancellation
- `get_dashboard_stats(business_id)` - Admin dashboard statistics

### Edge Functions

- `POST /send-email` - Send email notification
- `POST /send-sms` - Send SMS notification
- `GET /process-reminders` - Cron job (hourly)
- `POST /handle-booking-created` - Webhook for new bookings
- `GET/POST /cancel-booking` - Customer cancellation page

## Cron Jobs

Set up the following cron job in Supabase:

```sql
-- Process reminders every hour
SELECT cron.schedule(
  'process-reminders',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  );$$
);
```

## Database Triggers

Set up webhook triggers in Supabase dashboard:

1. **New booking notification**
   - Table: `bookings`
   - Events: `INSERT`
   - Webhook URL: `https://your-project.supabase.co/functions/v1/handle-booking-created`

## Deployment

### Widget
Upload `widget/dist/widget.js` to your CDN or hosting.

### Admin Dashboard
Deploy to Vercel:
```bash
cd admin
vercel
```

## License

Proprietary - All rights reserved
