export type User = {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google' | 'github';
  avatarUrl: string | null;
  createdAt: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
  loginWithProvider: (provider: 'google' | 'github') => void;
};

export type AuditStatus = 'pass' | 'warn' | 'fail';

export type AuditCheck = {
  label: string;
  status: AuditStatus;
  details: string;
};

export type AnalysisReport = {
  url: string;
  scannedAt: string;
  performanceScore: number;
  seoScore: number;
  pageSpeedSeoScore: number;
  contentSeoScore: number;
  overview: {
    title: string | null;
    metaDescription: string | null;
    headingStructure: {
      h1: string[];
      h2: string[];
    };
    imageCount: number;
    imagesWithoutAlt: number;
    pageSizeBytes: number;
    loadTimeMs: number | null;
  };
  coreWebVitals: {
    lcp: number | null;
    fcp: number | null;
    cls: number | null;
    inp: number | null;
    ttfb: number | null;
  };
  audits: AuditCheck[];
  issues: string[];
  suggestions: string[];
};

export type SavedReport = {
  id: string;
  url: string;
  createdAt: string;
  report: AnalysisReport;
};
