import { type Sector } from "@/types/database";

export interface CompanySeed {
  cik: string;
  ticker: string;
  name: string;
  sector: Sector;
  sub_sector: string | null;
  sic_code: string;
}

export const COMPANIES_SEED: CompanySeed[] = [
  // P&C (15)
  { cik: "0000896159", ticker: "CB", name: "Chubb Limited", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000080661", ticker: "PGR", name: "Progressive Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000086312", ticker: "TRV", name: "Travelers Companies", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000899051", ticker: "ALL", name: "Allstate Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000005272", ticker: "AIG", name: "American International Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000874766", ticker: "HIG", name: "Hartford Financial Services", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000947484", ticker: "ACGL", name: "Arch Capital Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000011544", ticker: "WRB", name: "W.R. Berkley Corporation", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000020286", ticker: "CINF", name: "Cincinnati Financial", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001096343", ticker: "MKL", name: "Markel Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000021175", ticker: "CNA", name: "CNA Financial", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000922621", ticker: "ERIE", name: "Erie Indemnity", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0001042046", ticker: "AFG", name: "American Financial Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000073124", ticker: "ORI", name: "Old Republic International", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001267238", ticker: "AIZ", name: "Assurant", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },

  // Life (9)
  { cik: "0001099219", ticker: "MET", name: "MetLife", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001137774", ticker: "PRU", name: "Prudential Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000004977", ticker: "AFL", name: "Aflac", sector: "Life", sub_sector: "Supplemental", sic_code: "6311" },
  { cik: "0001889539", ticker: "CRBG", name: "Corebridge Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001126328", ticker: "PFG", name: "Principal Financial Group", sector: "Life", sub_sector: "Retirement", sic_code: "6311" },
  { cik: "0001333986", ticker: "EQH", name: "Equitable Holdings", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000005513", ticker: "UNM", name: "Unum Group", sector: "Life", sub_sector: "Disability & Benefits", sic_code: "6311" },
  { cik: "0000882184", ticker: "GL", name: "Globe Life", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000059558", ticker: "LNC", name: "Lincoln National", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },

  // Health (7)
  { cik: "0000731766", ticker: "UNH", name: "UnitedHealth Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001739940", ticker: "CI", name: "Cigna Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001156039", ticker: "ELV", name: "Elevance Health", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0000049071", ticker: "HUM", name: "Humana", sector: "Health", sub_sector: "Medicare Advantage", sic_code: "6324" },
  { cik: "0001071739", ticker: "CNC", name: "Centene Corporation", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0001179929", ticker: "MOH", name: "Molina Healthcare", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0000064803", ticker: "CVS", name: "CVS Health", sector: "Health", sub_sector: "Integrated Health", sic_code: "6324" },

  // Reinsurance (4)
  { cik: "0001067983", ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6331" },
  { cik: "0000913144", ticker: "RNR", name: "RenaissanceRe Holdings", sector: "Reinsurance", sub_sector: "Property Cat", sic_code: "6399" },
  { cik: "0001095073", ticker: "EG", name: "Everest Group", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6399" },
  { cik: "0000898174", ticker: "RGA", name: "Reinsurance Group of America", sector: "Reinsurance", sub_sector: "Life Reinsurance", sic_code: "6311" },

  // Brokers (6)
  { cik: "0000062709", ticker: "MMC", name: "Marsh & McLennan", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000315293", ticker: "AON", name: "Aon plc", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000354190", ticker: "AJG", name: "Arthur J. Gallagher", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001140536", ticker: "WTW", name: "Willis Towers Watson", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000079282", ticker: "BRO", name: "Brown & Brown", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001849253", ticker: "RYAN", name: "Ryan Specialty Holdings", sector: "Brokers", sub_sector: "Specialty Brokerage", sic_code: "6411" },
];
