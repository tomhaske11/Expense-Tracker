export type CloudProvider =
  | 'google-sheets'
  | 'dropbox'
  | 'onedrive'
  | 'email'
  | 'google-drive'
  | 'notion';

export type ExportTemplate =
  | 'tax-report'
  | 'monthly-summary'
  | 'category-analysis'
  | 'yearly-overview'
  | 'budget-tracker';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface CloudIntegration {
  id: CloudProvider;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  color: string;
}

export interface ExportHistory {
  id: string;
  timestamp: string;
  provider: CloudProvider | 'local';
  template: ExportTemplate;
  recordCount: number;
  status: 'success' | 'pending' | 'failed';
  fileSize?: string;
  sharedLink?: string;
}

export interface ExportSchedule {
  id: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  template: ExportTemplate;
  destinations: CloudProvider[];
  nextRun: string;
  createdAt: string;
}

export interface ShareableLink {
  id: string;
  url: string;
  expiresAt: string;
  accessCount: number;
  password?: string;
  qrCode: string;
}

export interface TemplateConfig {
  id: ExportTemplate;
  name: string;
  description: string;
  icon: string;
  formats: string[];
  includeSummary: boolean;
  includeCharts: boolean;
}
