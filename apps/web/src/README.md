# Frontend feature convention

Each feature owns its pages, components and feature-specific hooks. Keep generic reusable UI in `components/ui`, app-wide layout in `components/common`, API wrappers in `services`, route definitions in `routes`, and shared helpers in `lib`/`utils`.

Suggested route groups:
- `/` public marketing pages
- `/auth/*` registration and login
- `/app/*` subscriber workspace
- `/invite/:token` public invitation and RSVP experience
- `/admin/*` Super Admin area (protected by server-enforced role checks)
