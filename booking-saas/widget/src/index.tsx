import { render } from 'preact';
import { Widget } from './Widget';
import type { WidgetConfig } from './types';
import { initSupabase } from './api/supabase';

// Auto-execute when script loads
(function () {
  // Find the script tag that loaded this widget
  const currentScript = document.currentScript as HTMLScriptElement;

  if (!currentScript) {
    console.error('[Booking Widget] Could not find script tag');
    return;
  }

  // Parse configuration from data attributes
  const businessSlug = currentScript.getAttribute('data-business');

  if (!businessSlug) {
    console.error('[Booking Widget] Missing required data-business attribute');
    return;
  }

  const config: WidgetConfig = {
    businessSlug,
    theme: (currentScript.getAttribute('data-theme') as 'light' | 'dark') || 'light',
    primaryColor: currentScript.getAttribute('data-primary-color') || undefined,
    locale: (currentScript.getAttribute('data-locale') as 'da' | 'en') || undefined
  };

  // Optional Supabase configuration
  const supabaseUrl = currentScript.getAttribute('data-supabase-url');
  const supabaseKey = currentScript.getAttribute('data-supabase-key');

  if (supabaseUrl && supabaseKey) {
    initSupabase(supabaseUrl, supabaseKey);
  }

  // Create container element
  const container = document.createElement('div');
  container.id = `booking-widget-${businessSlug}`;

  // Insert after the script tag
  currentScript.parentNode?.insertBefore(container, currentScript.nextSibling);

  // Render the widget
  render(<Widget config={config} />, container);
})();

// Export for manual mounting
export { Widget };
export type { WidgetConfig };
