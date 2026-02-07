-- Add Title and Mortgage Insurance sectors to the companies sector CHECK constraint.
ALTER TABLE companies DROP CONSTRAINT companies_sector_check;
ALTER TABLE companies ADD CONSTRAINT companies_sector_check
  CHECK (sector IN ('P&C', 'Life', 'Health', 'Reinsurance', 'Brokers', 'Title', 'Mortgage Insurance'));
