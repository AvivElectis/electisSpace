# Appendix A — Glossary

| Term | Definition |
|------|-----------|
| **AIMS** | SoluM's Article Information Management System -- the platform that manages ESL labels |
| **Article** | An AIMS concept: a data record linked to one or more physical labels |
| **ESL** | Electronic Shelf Label -- e-ink displays managed via AIMS |
| **Label Code** | Unique identifier for a physical ESL device |
| **External ID** | The identifier used as the AIMS `articleId` for a space or conference room |
| **Virtual Space ID** | A person's logical identifier (before slot assignment) |
| **Assigned Space ID** | The physical slot number a person is assigned to (used as AIMS `articleId` in people mode) |
| **Reconciliation** | The periodic process of diffing DB state against AIMS state and correcting discrepancies |
| **Singleflight** | A concurrency pattern that deduplicates in-flight requests for the same resource |
| **Store** | An operational unit within a company, mapped to an AIMS store number |
