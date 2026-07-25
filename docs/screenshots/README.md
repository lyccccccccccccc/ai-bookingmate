# Screenshot Capture Guide

These screenshots are intentionally not committed yet. Capture them from the deployed application after loading polished, non-personal demo data.

## Capture Standards

- Use a desktop viewport around 1440 x 900.
- Capture PNG files at native resolution.
- Keep browser chrome out of the image where practical.
- Use professional demo names and future dates.
- Do not show passwords, access tokens, API keys, private email addresses, or Railway environment values.
- Crop consistently and confirm that dialogs, loading indicators, and temporary messages are not obscuring the main workflow.

## Required Screenshots

| Filename | Route | What to show |
| --- | --- | --- |
| `home.png` | `/` | Hero, primary actions, product preview, and feature overview |
| `services.png` | `/services` | Responsive service cards with AUD prices and durations |
| `booking-capacity.png` | `/services/:serviceId` | A group-session slot with capacity and remaining places |
| `my-bookings.png` | `/my-bookings` | Customer booking cards with status and cancellation controls |
| `admin-time-slots.png` | `/admin/time-slots` | Capacity, booked places, remaining places, filters, and status actions |
| `admin-rules.png` | `/admin/business-rules` | Active business rules and create/edit controls |
| `assistant.png` | `/assistant` | Conversation, suggested questions, answer mode, confidence, and grounding source |
| `swagger.png` | Backend `/api/docs` | Swagger endpoint groups without authentication tokens or request secrets |

## Adding Images To The Main README

After all eight images exist in this directory, replace each pending screenshot cell in the root README with an image using the same relative path. Keep the two-column table and use descriptive `alt` text.

Example:

```html
<img src="docs/screenshots/home.png" alt="AI BookingMate home page" width="100%">
```
