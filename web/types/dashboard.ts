export type AppRow = {
  number: number;
  date: string;
  company: string;
  role: string;
  status: string;
  score: number;
  scoreRaw: string;
  hasPdf: boolean;
  reportPath: string;
  reportNumber: string;
  notes: string;
  jobUrl: string;
  linkedPdfBasename: string | null;
  linkedHtmlBasename: string | null;
  linkedTexBasename: string | null;
  duplicateOf: number | null;
  duplicateNote: string | null;
};

export type PipelineMetrics = {
  total: number;
  byStatus: Record<string, number>;
  avgScore: number;
  topScore: number;
  withPdf: number;
  actionable: number;
};

export type TrackerPayload = {
  careerOpsRoot: string;
  trackerPath: string | null;
  candidateSlug: string | null;
  metrics: PipelineMetrics;
  applications: AppRow[];
  error?: string;
};
