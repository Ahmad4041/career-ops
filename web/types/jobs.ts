export type JobSummary = {
  id: string;
  provider: string;
  operation: string;
  status: string;
  exitCode: number | null;
  createdAt: number;
  updatedAt: number;
  logLines: number;
  archived?: boolean;
  url?: string;
  error?: string;
};
