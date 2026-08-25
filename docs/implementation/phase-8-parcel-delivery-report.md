# Phase 8 Parcel Delivery Report

## Scope

Implemented parcel delivery over existing intercity trips:

- parcel domain, categories, prohibited categories, limits, and lifecycle;
- sender parcel creation/tracking screens;
- driver parcel handover, transit, pickup, and issue screens;
- admin parcel moderation and history screens;
- hash-only handover and pickup code model;
- trip start/cancel parcel integration;
- expiry worker support;
- seed fixtures for categories, prohibited categories, rules, and lifecycle states.

## Out Of Scope

Booking, seat hold, payment, refunds, insurance, home pickup, last-mile delivery, warehouse flows, scanner integration, external logistics, maps, chat, reviews, support, masked calls, and complex dispute resolution remain out of scope.

## Quality Notes

Known dev-tooling issue remains: targeted Playwright suites may pass all assertions while the CLI keeps an open handle and receives external timeout `124`. Ports and webServer processes must be checked separately.
