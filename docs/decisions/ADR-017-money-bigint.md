# ADR-017: Money and BigInt

Status: Accepted

Store all money as integer minor units in `BigInt` columns with explicit currency.

Why: UZS values must not use floats. `BigInt` keeps room for future aggregate and settlement values. API responses serialize money as strings or integer-safe numbers depending on contract.
