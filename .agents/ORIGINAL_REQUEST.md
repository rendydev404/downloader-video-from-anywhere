# Original User Request

## Initial Request — 2026-06-18T17:21:16Z

Add Google Analytics tracking to the existing Next.js web application, and scaffold a static Admin Dashboard UI for future Supabase database integration.

Working directory: c:\Users\AK\Desktop\Project\downloader
Integrity mode: development

## Requirements

### R1. Integrate Google Analytics
Add Google Analytics to the application so the owner can track visitors, real-time analytics, and traffic directly on the official Google Analytics dashboard. You may use `@next/third-parties/google` or standard script injection.

### R2. Scaffold Admin Dashboard UI
Create a new `/admin` route that displays a professional, dark-themed dashboard layout. It should include a Sidebar, a Header, and clean placeholder cards/sections ready to be populated with database data (Supabase) in the future.

## Acceptance Criteria

### Google Analytics
- [ ] A Google Analytics script or component is successfully integrated into the root layout.
- [ ] The GA ID can be easily configured via an environment variable (`NEXT_PUBLIC_GA_ID`).

### Admin Dashboard UI
- [ ] Navigating to `/admin` renders without any errors.
- [ ] The UI includes a clear sidebar for navigation and a main content area with placeholder cards.
- [ ] The design aesthetic matches the application's premium dark mode style.
