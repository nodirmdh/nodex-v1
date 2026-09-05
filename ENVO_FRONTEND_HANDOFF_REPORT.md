# ENVO Frontend Handoff Report

Scope: Client, Driver and Admin frontend/demo review only. Backend, Render/API deploy, Payments, production CI and existing Admin/API-client uncommitted work were not touched.

## New Fixes From Visual Review

- Client favorite drivers now has a dedicated `/favorite-drivers` page instead of a dead/missing shortcut.
- Client home now shows `Отправить посылку` immediately after the main route-search card.
- Client support no longer opens a ticket modal immediately on page load. Tickets open only after user selection; support chat remains available through messages.
- Client message detail now supports a demo file attachment action and visible attached-file state.
- Client parcel flow now collects receiver phone number and parcel photo for the driver before handoff confirmation.
- Client booking now uses tariff `Старт` and includes quick presets for `3 места сзади` and `1 справа спереди, 2 по бокам середины и 3 сзади`.
- Client booking reliability card no longer exposes confusing internal delay-state buttons; users are directed to driver chat or support.

## Visual Notes For Next Pass

- Client: review final Russian copy consistency in older demo screens that still say `Demo`, `Rewards`, or English route helpers.
- Driver: existing flows are interactive, but several labels are still mixed Russian/English in older reward/create-trip pages.
- Admin: main operational screens are visible; old real-data pass files remain uncommitted separately and should be handled in a separate admin-data branch/pass.

## Screenshots To Capture After Deploy

- Client home with parcel block near the top.
- Client favorite drivers page.
- Client support/messages chat with attachment.
- Client booking Start seat presets.
- Client parcel confirmation with receiver phone/photo.
- Driver home/flows smoke screenshot.
- Admin dashboard/avoid-match/reliability smoke screenshot.
