-- Add STORE_ADMIN and STORE_VIEWER values to the CompanyRole enum.
-- These allow finer-grained company-level roles:
--   STORE_ADMIN  = all-stores admin access without company management
--   STORE_VIEWER = per-store view-only access

ALTER TYPE "CompanyRole" ADD VALUE 'STORE_ADMIN';
ALTER TYPE "CompanyRole" ADD VALUE 'STORE_VIEWER';
