---
"@kohaku-eth/privacy-pools": minor
---

feat: add opt-in `obfuscateAmounts` to `prepareUnshield`, so withdrawals no longer expose exact note balances. The requested total is preserved and every spent note keeps at least 1% as change (non-final notes keep a random 1–25%). The gross is capped at 97% of the approved balance; above it, preparation throws the exported `PPv1AmountObfuscationError` before any proof or signature. Withdrawals that need several notes require `{ mode: 'paymaster', batch: true }`. The new `analyzePPv1Withdrawal` checks a note snapshot for full-note spends and the protected ceiling. The option defaults to false, which keeps the current behaviour.
