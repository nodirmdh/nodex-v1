# Known Issues

- Playwright smoke suites can finish assertions while the CLI process keeps an open handle and exits only through an external timeout. WebServer processes and ports are released; diagnosis is tracked separately.
- Phase 11 uses mock/manual payment adapters. Real provider settlement, chargebacks, and provider-specific payout rails are future integrations.
