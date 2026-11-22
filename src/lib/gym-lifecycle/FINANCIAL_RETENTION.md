# Financial data retention — decision required

GymDesk does **not** encode statutory retention periods in code.

Before enabling production tenant deletion (`ALLOW_TENANT_GYM_PURGE`), operators must decide:

1. **Payments, receipts, ledger transactions, subscriptions** exported in the financial archive step (`financial-export.ts`).
2. Whether copies in `gymFinancialArchives` must be retained on the platform after the gym is purged.
3. Whether optional gym data export satisfies operator backup needs (not a legal archive).

`GYM_FINANCIAL_RETENTION_POLICY` must be set to a **non-empty explicit operator retention-policy decision** (any value you choose to document your policy — GymDesk does not prescribe statutory periods) before `evaluateFinancialArchiveCompleteness` treats archives as policy-complete. Without it:

- Financial archives are written with `retentionPolicyConfigured: false` and `financialArchiveStatus: incomplete`.
- Final deletion confirmation (`confirmGymPurgeReady`) and destructive purge authority fail the `financial_archive` check (fail-closed).

**No automatic silent retention or deletion of customer financial data beyond the documented purge phases.**