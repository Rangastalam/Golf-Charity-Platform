-- ============================================================================
-- GolfGives — Seed Data
-- Run AFTER all migrations. Safe to run in dev only.
-- ============================================================================

-- ─── Sample charities ────────────────────────────────────────────────────────

INSERT INTO public.charities (name, description, logo_url, website_url, total_raised, category, active)
VALUES
  (
    'Golf Foundation',
    'The Golf Foundation exists to improve the life chances of young people through the game of golf. They provide equipment, coaching and opportunities to kids who would otherwise never pick up a club.',
    NULL,
    'https://golf-foundation.org.uk',
    12480.00,
    'Youth Sport',
    TRUE
  ),
  (
    'Macmillan Cancer Support',
    'Macmillan provides medical, emotional, practical and financial support to people living with cancer and campaigns for better cancer care. GolfGives members vote them consistently into the top charity slot.',
    NULL,
    'https://www.macmillan.org.uk',
    8760.00,
    'Health',
    TRUE
  ),
  (
    'Disability Golf Alliance',
    'Making golf accessible to players of all abilities. The DGA funds adaptive equipment, inclusive coaching programmes, and accessible course design consultancy across the UK.',
    NULL,
    'https://disabilitygolfalliance.org',
    4320.00,
    'Inclusion',
    TRUE
  )
ON CONFLICT DO NOTHING;
