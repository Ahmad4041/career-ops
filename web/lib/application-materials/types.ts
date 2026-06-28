export type MaterialPhase = 'summary' | 'coverLetter' | 'recruiterMessage' | 'customQuestions';

export type CustomQaItem = { question: string; answer: string };

export type ApplicationMaterials = {
  applicationNumber: number;
  company: string;
  role: string;
  reportPath: string;
  updatedAt: string;
  summary: string;
  /** Optional opening line, e.g. "Dear Hiring Manager," — stored separately from body */
  coverLetterSalutation: string;
  coverLetter: string;
  recruiterMessage: string;
  /** Raw questions (one per line) before generate */
  customQuestionsInput: string;
  customQa: CustomQaItem[];
};

export const EMPTY_MATERIALS = (n: number, company: string, role: string, reportPath: string): ApplicationMaterials => ({
  applicationNumber: n,
  company,
  role,
  reportPath,
  updatedAt: new Date().toISOString(),
  summary: '',
  coverLetterSalutation: '',
  coverLetter: '',
  recruiterMessage: '',
  customQuestionsInput: '',
  customQa: [],
});
