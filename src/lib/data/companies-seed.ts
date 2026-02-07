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
  // P&C (24)
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
  { cik: "0000074260", ticker: "ORI", name: "Old Republic International", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001267238", ticker: "AIZ", name: "Assurant", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0001669162", ticker: "KNSL", name: "Kinsale Capital Group", sector: "P&C", sub_sector: "E&S Specialty", sic_code: "6331" },
  { cik: "0000084246", ticker: "RLI", name: "RLI Corp", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000230557", ticker: "SIGI", name: "Selective Insurance Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001761312", ticker: "PLMR", name: "Palomar Holdings", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000944695", ticker: "THG", name: "Hanover Insurance Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000860748", ticker: "KMPR", name: "Kemper Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000064996", ticker: "MCY", name: "Mercury General", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000776867", ticker: "WTM", name: "White Mountains Insurance Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0001273813", ticker: "AGO", name: "Assured Guaranty", sector: "P&C", sub_sector: "Financial Guaranty", sic_code: "6351" },

  // Life (15)
  { cik: "0001099219", ticker: "MET", name: "MetLife", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001137774", ticker: "PRU", name: "Prudential Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000004977", ticker: "AFL", name: "Aflac", sector: "Life", sub_sector: "Supplemental", sic_code: "6311" },
  { cik: "0001889539", ticker: "CRBG", name: "Corebridge Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001126328", ticker: "PFG", name: "Principal Financial Group", sector: "Life", sub_sector: "Retirement", sic_code: "6311" },
  { cik: "0001333986", ticker: "EQH", name: "Equitable Holdings", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000005513", ticker: "UNM", name: "Unum Group", sector: "Life", sub_sector: "Disability & Benefits", sic_code: "6311" },
  { cik: "0000320335", ticker: "GL", name: "Globe Life", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000059558", ticker: "LNC", name: "Lincoln National", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001822993", ticker: "JXN", name: "Jackson Financial", sector: "Life", sub_sector: "Annuities", sic_code: "6311" },
  { cik: "0001535929", ticker: "VOYA", name: "Voya Financial", sector: "Life", sub_sector: "Retirement", sic_code: "6311" },
  { cik: "0001276520", ticker: "GNW", name: "Genworth Financial", sector: "Life", sub_sector: "LTC / Mortgage Insurance", sic_code: "6311" },
  { cik: "0001224608", ticker: "CNO", name: "CNO Financial Group", sector: "Life", sub_sector: "Life & Health", sic_code: "6311" },
  { cik: "0001475922", ticker: "PRI", name: "Primerica", sector: "Life", sub_sector: "Life Insurance", sic_code: "6311" },
  { cik: "0001934850", ticker: "FG", name: "F&G Annuities & Life", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },

  // Health (8)
  { cik: "0000731766", ticker: "UNH", name: "UnitedHealth Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001739940", ticker: "CI", name: "Cigna Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001156039", ticker: "ELV", name: "Elevance Health", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0000049071", ticker: "HUM", name: "Humana", sector: "Health", sub_sector: "Medicare Advantage", sic_code: "6324" },
  { cik: "0001071739", ticker: "CNC", name: "Centene Corporation", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0001179929", ticker: "MOH", name: "Molina Healthcare", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0000064803", ticker: "CVS", name: "CVS Health", sector: "Health", sub_sector: "Integrated Health", sic_code: "6324" },
  { cik: "0001568651", ticker: "OSCR", name: "Oscar Health", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },

  // Reinsurance (7)
  { cik: "0001067983", ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6331" },
  { cik: "0000913144", ticker: "RNR", name: "RenaissanceRe Holdings", sector: "Reinsurance", sub_sector: "Property Cat", sic_code: "6399" },
  { cik: "0001095073", ticker: "EG", name: "Everest Group", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6399" },
  { cik: "0000898174", ticker: "RGA", name: "Reinsurance Group of America", sector: "Reinsurance", sub_sector: "Life Reinsurance", sic_code: "6311" },
  { cik: "0001576018", ticker: "SPNT", name: "SiriusPoint", sector: "Reinsurance", sub_sector: "Multi-line", sic_code: "6399" },
  { cik: "0001593275", ticker: "HG", name: "Hamilton Insurance Group", sector: "Reinsurance", sub_sector: "Specialty", sic_code: "6399" },
  { cik: "0001214816", ticker: "AXS", name: "AXIS Capital Holdings", sector: "Reinsurance", sub_sector: "Specialty", sic_code: "6399" },

  // Brokers (8)
  { cik: "0000062709", ticker: "MMC", name: "Marsh & McLennan", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000315293", ticker: "AON", name: "Aon plc", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000354190", ticker: "AJG", name: "Arthur J. Gallagher", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001140536", ticker: "WTW", name: "Willis Towers Watson", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000079282", ticker: "BRO", name: "Brown & Brown", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001849253", ticker: "RYAN", name: "Ryan Specialty Holdings", sector: "Brokers", sub_sector: "Specialty Brokerage", sic_code: "6411" },
  { cik: "0001726978", ticker: "GSHD", name: "Goosehead Insurance", sector: "Brokers", sub_sector: "Distribution", sic_code: "6411" },
  { cik: "0001781755", ticker: "BRP", name: "Baldwin Insurance Group", sector: "Brokers", sub_sector: "Distribution", sic_code: "6411" },

  // Title (3)
  { cik: "0001331875", ticker: "FNF", name: "Fidelity National Financial", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },
  { cik: "0001472787", ticker: "FAF", name: "First American Financial", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },
  { cik: "0000094344", ticker: "STC", name: "Stewart Information Services", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },

  // Mortgage Insurance (4)
  { cik: "0000876437", ticker: "MTG", name: "MGIC Investment", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0000890926", ticker: "RDN", name: "Radian Group", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0001448893", ticker: "ESNT", name: "Essent Group", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0001547903", ticker: "NMIH", name: "NMI Holdings", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
];
