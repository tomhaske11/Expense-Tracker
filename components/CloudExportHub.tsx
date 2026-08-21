'use client';

import { useState, useMemo } from 'react';
import { Expense } from '@/types/expense';
import {
  CloudProvider,
  CloudIntegration,
  ExportHistory,
  ExportSchedule,
  ExportTemplate,
  TemplateConfig,
  ScheduleFrequency,
} from '@/types/cloud';
import { formatDate, formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { format, addDays } from 'date-fns';

interface CloudExportHubProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

const CLOUD_INTEGRATIONS: CloudIntegration[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: '📊',
    description: 'Export directly to a Google Sheets spreadsheet',
    connected: true,
    lastSync: new Date().toISOString(),
    color: '#34A853',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    description: 'Save exports to your Dropbox folder',
    connected: false,
    color: '#0061FF',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    icon: '☁️',
    description: 'Sync with Microsoft OneDrive',
    connected: true,
    lastSync: addDays(new Date(), -2).toISOString(),
    color: '#0078D4',
  },
  {
    id: 'email',
    name: 'Email',
    icon: '✉️',
    description: 'Send exports to your email',
    connected: true,
    color: '#EA4335',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '💾',
    description: 'Store in Google Drive',
    connected: false,
    color: '#4285F4',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'Create a Notion database',
    connected: false,
    color: '#000000',
  },
];

const EXPORT_TEMPLATES: TemplateConfig[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    description: 'Formatted for tax filing with category summaries',
    icon: '📋',
    formats: ['PDF', 'CSV'],
    includeSummary: true,
    includeCharts: false,
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: 'Overview of monthly spending patterns',
    icon: '📅',
    formats: ['PDF', 'Email'],
    includeSummary: true,
    includeCharts: true,
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    description: 'Deep dive into spending by category',
    icon: '📊',
    formats: ['PDF', 'Google Sheets'],
    includeSummary: true,
    includeCharts: true,
  },
  {
    id: 'yearly-overview',
    name: 'Yearly Overview',
    description: 'Annual spending trends and insights',
    icon: '📈',
    formats: ['PDF'],
    includeSummary: true,
    includeCharts: true,
  },
  {
    id: 'budget-tracker',
    name: 'Budget Tracker',
    description: 'Compare spending against budget goals',
    icon: '🎯',
    formats: ['Google Sheets', 'PDF'],
    includeSummary: true,
    includeCharts: true,
  },
];

export default function CloudExportHub({ isOpen, onClose, expenses }: CloudExportHubProps) {
  const [activeTab, setActiveTab] = useState<'quick' | 'integrations' | 'schedule' | 'history' | 'share'>('quick');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('monthly-summary');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('monthly');

  // Mock export history
  const exportHistory: ExportHistory[] = useMemo(() => [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      provider: 'email',
      template: 'monthly-summary',
      recordCount: expenses.length,
      status: 'success',
      fileSize: '234 KB',
    },
    {
      id: '2',
      timestamp: addDays(new Date(), -2).toISOString(),
      provider: 'google-sheets',
      template: 'category-analysis',
      recordCount: expenses.length,
      status: 'success',
      sharedLink: 'https://sheets.google.com/example',
    },
    {
      id: '3',
      timestamp: addDays(new Date(), -7).toISOString(),
      provider: 'onedrive',
      template: 'tax-report',
      recordCount: expenses.length,
      status: 'success',
      fileSize: '1.2 MB',
    },
  ], [expenses.length]);

  const handleQuickExport = async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
    alert(`Exported ${expenses.length} expenses using ${selectedTemplate} template to ${selectedProvider}!`);
  };

  const handleGenerateShareLink = () => {
    const mockLink = `https://expensetracker.app/shared/${Math.random().toString(36).substr(2, 9)}`;
    setShareableLink(mockLink);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header with cloud theme */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    ☁️
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Cloud Export Hub</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Share, sync, and automate your expense data
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6 overflow-x-auto">
              {[
                { id: 'quick', label: 'Quick Export', icon: '⚡' },
                { id: 'integrations', label: 'Integrations', icon: '🔌' },
                { id: 'schedule', label: 'Automation', icon: '⏰' },
                { id: 'history', label: 'History', icon: '📜' },
                { id: 'share', label: 'Share', icon: '🔗' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Quick Export Tab */}
            {activeTab === 'quick' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Export Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {EXPORT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTemplate === template.id
                            ? 'border-blue-600 bg-white shadow-lg scale-105'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-3xl mb-2">{template.icon}</div>
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                        <div className="flex gap-1 mt-3 flex-wrap">
                          {template.formats.map((fmt) => (
                            <span key={fmt} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {fmt}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Destination</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CLOUD_INTEGRATIONS.filter(i => i.connected).map((integration) => (
                      <button
                        key={integration.id}
                        onClick={() => setSelectedProvider(integration.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedProvider === integration.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{integration.icon}</div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        {integration.connected && (
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">Connected</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedProvider === 'email' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleQuickExport}
                  disabled={isExporting}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isExporting ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting to {selectedProvider}...
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🚀</span>
                      Export {expenses.length} Expenses Now
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-4">
                {CLOUD_INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                          style={{ backgroundColor: `${integration.color}15` }}
                        >
                          {integration.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                            {integration.connected ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Connected
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                Not Connected
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{integration.description}</p>
                          {integration.lastSync && (
                            <p className="text-xs text-gray-500 mt-2">
                              Last synced: {formatDate(integration.lastSync)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                          integration.connected
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                        }`}
                      >
                        {integration.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Schedule/Automation Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Create Automated Export</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={scheduleFrequency}
                        onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value as ExportTemplate)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {EXPORT_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all">
                      Create Schedule
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-yellow-900">Pro Tip</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Set up monthly exports to Google Sheets for automatic budget tracking and analysis
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {exportHistory.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          {CLOUD_INTEGRATIONS.find(i => i.id === item.provider)?.icon || '📄'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {EXPORT_TEMPLATES.find(t => t.id === item.template)?.name}
                            </h4>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(item.timestamp)} • {item.recordCount} records • {item.fileSize || 'Cloud'}
                          </p>
                        </div>
                      </div>
                      {item.sharedLink && (
                        <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Share Tab */}
            {activeTab === 'share' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Generate Shareable Link</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create a secure, time-limited link to share your expense data with accountants, partners, or team members
                  </p>

                  <button
                    onClick={handleGenerateShareLink}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all"
                  >
                    Generate Secure Link
                  </button>

                  {shareableLink && (
                    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Shareable Link</p>
                          <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {shareableLink}
                          </p>
                        </div>
                        <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Copy
                        </button>
                      </div>

                      <div className="flex items-center justify-center py-4">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                          <QRCodeSVG value={shareableLink} size={200} />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 text-center mt-4">
                        🔒 Link expires in 7 days • 0 views • Password protected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
