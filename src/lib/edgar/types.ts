export interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    "us-gaap"?: Record<string, XbrlConcept>;
    "ifrs-full"?: Record<string, XbrlConcept>;
    dei?: Record<string, XbrlConcept>;
  };
}

export interface XbrlConcept {
  label: string;
  description: string;
  units: Record<string, XbrlUnit[]>;
}

export interface XbrlUnit {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}
