# RSVP privacy design – mandatory

## Product rule
The host may see only the aggregate expected-attendee count. The host must not see:
- guest names linked to responses
- individual IN/OUT choices
- individual response timestamps
- people who have not responded
- guest-level RSVP exports or drill-down

Other invitees must not see one another's responses.

## Engineering requirements
- Host API should expose only an aggregate DTO, for example `{ eventId, expectedAttendeeCount }`.
- Do not create host-facing endpoints that return RSVP rows.
- Use unguessable invitation tokens and rate limiting.
- If response updates or duplicate prevention require token-linked state, restrict it to backend processing, protect it, define retention and do not expose it to host/admin dashboards.
- Consider aggregate counter update consistency, replay protection and race conditions.
- The privacy notice must accurately describe what the platform processes. Do not promise absolute anonymity if identifiable linkage is retained by the platform.
- Add automated tests proving that host and invitee APIs cannot retrieve individual response data.
