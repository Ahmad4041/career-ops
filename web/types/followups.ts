export type FollowupUrgency = 'urgent' | 'overdue' | 'waiting' | 'cold';

export type FollowupContact = {
  email: string;
  name: string | null;
};

export type FollowupEntry = {
  num: number;
  date: string;
  appliedDate: string;
  company: string;
  role: string;
  status: string;
  score: string;
  notes: string;
  reportPath: string | null;
  contacts: FollowupContact[];
  daysSinceApplication: number;
  daysSinceLastFollowup: number | null;
  followupCount: number;
  urgency: FollowupUrgency;
  nextFollowupDate: string | null;
  daysUntilNext: number | null;
};

export type FollowupsMetadata = {
  analysisDate: string;
  totalTracked: number;
  actionable: number;
  overdue: number;
  urgent: number;
  cold: number;
  waiting: number;
};

export type FollowupsPayload = {
  careerOpsRoot?: string;
  metadata?: FollowupsMetadata;
  entries?: FollowupEntry[];
  cadenceConfig?: Record<string, number>;
  error?: string;
};
