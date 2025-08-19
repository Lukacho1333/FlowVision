'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import CorrelationDashboard from '@/components/CorrelationDashboard';
import IntelligenceDashboard from '@/components/IntelligenceDashboard';
import SystemsAnalyticsDashboard from '@/components/SystemsAnalyticsDashboard';
import {
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  LightBulbIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UsersIcon,
  ArrowPathIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import AlertSettingsModal from '@/components/AlertSettingsModal';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface HealthScore {
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  components: {
    initiativeHealth: number;
    issueVelocity: number;
    teamUtilization: number;
    roiTrend: number;
  };
  lastUpdated: Date;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'timeline' | 'resource' | 'roi' | 'issue';
  title: string;
  description: string;
  recommendation: string;
  priority: number;
  createdAt: Date;
}

interface RoiForecast {
  current: {
    totalInvestment: number;
    realizedRoi: number;
    pendingRoi: number;
    portfolioValue: number;
  };
  forecast: {
    threeMonth: number;
    sixMonth: number;
    twelveMonth: number;
    confidence: number;
  };
  topPerformers: Array<{
    id: string;
    title: string;
    roi: number;
    status: string;
  }>;
  recommendations: string[];
}

interface ExecutiveInsight {
  id: string;
  type: 'strategic' | 'operational' | 'financial' | 'risk';
  title: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  recommendation?: string; // Legacy support
  confidence?: number | { score: number }; // Legacy support - can be number or object

  // Enhanced Context (optional for backward compatibility)
  context?: {
    relatedIssues: any[];
    relatedInitiatives: any[];
    historicalPatterns: any[];
    stakeholders: any[];
    rootCauses: string[];
    contributingFactors: string[];
  };

  // Enhanced Confidence (optional for backward compatibility)
  confidenceReasoning?: {
    score: number;
    reasoning: string[];
    dataQuality: 'high' | 'medium' | 'low';
    sampleSize: number;
    historicalAccuracy?: number;
    uncertaintyFactors?: string[];
  };

  // Enhanced Action Plan (optional for backward compatibility)
  actionPlan?: {
    immediate: any[];
    shortTerm: any[];
    longTerm: any[];
  };

  // Business Impact (optional for backward compatibility)
  businessImpact?: {
    financial: {
      costOfInaction: number;
      potentialSavings: number;
      investmentRequired: number;
    };
    timeline: {
      daysToResolution: number;
      criticalDeadline?: Date;
    };
    resources: {
      peopleRequired: number;
      skillsNeeded: string[];
      toolsRequired: string[];
    };
    stakeholders: any[];
  };
}

export default function InsightsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [roiForecast, setRoiForecast] = useState<RoiForecast | null>(null);
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [utilization, setUtilization] = useState<
    Array<{ ownerId: string; name: string; activeInitiatives: number }>
  >([]);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [utilView, setUtilView] = useState<'bar' | 'heatmap'>('bar');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [alertSettings, setAlertSettings] = useState<any | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [healthRes, alertsRes, roiRes, insightsRes, utilRes] = await Promise.all([
        fetch('/api/executive/health-score'),
        fetch('/api/executive/alerts'),
        fetch('/api/executive/roi-forecast'),
        fetch('/api/executive/insights'),
        fetch('/api/executive/team-utilization'),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        // Normalize ISO date string to Date
        if (healthData.lastUpdated) {
          healthData.lastUpdated = new Date(healthData.lastUpdated);
        }
        setHealthScore(healthData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }

      if (roiRes.ok) {
        const roiData = await roiRes.json();
        setRoiForecast(roiData);
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
      }

      if (utilRes.ok) {
        const utilData = await utilRes.json();
        setUtilization(utilData.utilization || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = async () => {
    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const html2canvas = html2canvasModule.default;

      const target = reportRef.current;
      if (!target) return;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = (pdf as any).getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Simple paginate if content exceeds one page
      let position = 0;
      let remainingHeight = pdfHeight;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          position -= pageHeight;
        }
      }

      pdf.save(`executive-brief-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      // Fallback: export minimal JSON summary
      // Fetch server-side generated brief as fallback
      try {
        const res = await fetch('/api/executive/brief');
        if (res.ok) {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `executive-brief-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } catch {}
      const reportData = {
        healthScore,
        alerts: alerts.slice(0, 5),
        roiForecast,
        insights: insights.slice(0, 10),
        generatedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const loadAlertSettings = async () => {
    try {
      setSettingsError(null);
      const res = await fetch('/api/alerts/settings');
      if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
      const data = await res.json();
      setAlertSettings(data.settings || null);
    } catch (e) {
      setSettingsError('Failed to load alert settings.');
    }
  };

  const saveAlertSettings = async () => {
    if (!alertSettings) return;
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      const res = await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: alertSettings }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSettingsOpen(false);
    } catch (e) {
      setSettingsError('Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const generateExecutiveReport = async () => {

    try {

      // Generate enhanced executive summary report with server data
      const response = await fetch('/api/executive/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeCharts: true,
          includeRecommendations: true,
          format: 'pdf',
        }),
      });

      if (response.ok) {
        const reportData = await response.json();

        // Use the enhanced data with existing PDF generation
        await generateEnhancedPDF(reportData);
      } else {
        console.warn('⚠️ Enhanced report failed, using fallback');
        alert('Report generation failed, please try again.');
      }
    } catch (error) {
      console.error('❌ Failed to generate executive report:', error);
      alert(`Report generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const generateEnhancedPDF = async (reportData: any) => {

    try {

      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const { jsPDF } = jsPDFModule;
      const html2canvas = html2canvasModule.default;

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title
      pdf.setFontSize(20);
      pdf.text('Executive Summary Report', 20, 30);

      // Add generation date
      pdf.setFontSize(12);
      const dateStr = new Date(reportData.generatedAt).toLocaleDateString();
      pdf.text(`Generated: ${dateStr}`, 20, 40);

      // Add metrics
      pdf.setFontSize(14);
      pdf.text('Key Metrics:', 20, 55);
      pdf.setFontSize(12);
      pdf.text(`Total Initiatives: ${reportData.metrics.initiatives}`, 30, 65);
      pdf.text(`Total Issues: ${reportData.metrics.issues}`, 30, 72);
      pdf.text(`Weekly Activity: ${reportData.metrics.weeklyActivity} actions`, 30, 79);

      // Add status breakdown
      pdf.setFontSize(14);
      pdf.text('Initiative Status Breakdown:', 20, 95);
      pdf.setFontSize(12);
      let yPos = 105;
      Object.entries(reportData.metrics.byStatus || {}).forEach(([status, count]) => {
        pdf.text(`${status}: ${count}`, 30, yPos);
        yPos += 7;
      });

      // Add top initiatives
      if (reportData.initiatives && reportData.initiatives.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Recent Initiatives:', 20, yPos + 10);
        pdf.setFontSize(10);
        yPos += 20;

        reportData.initiatives.slice(0, 5).forEach((init: any) => {
          pdf.text(`• ${init.title} (${init.status}) - ${init.progress}%`, 25, yPos);
          pdf.text(`  Owner: ${init.owner} | Cluster: ${init.cluster}`, 25, yPos + 4);
          yPos += 12;
        });
      }

      // Add recommendations
      if (reportData.recommendations && reportData.recommendations.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Recommendations:', 20, yPos + 10);
        pdf.setFontSize(11);
        yPos += 20;

        reportData.recommendations.forEach((rec: string) => {
          pdf.text(`• ${rec}`, 25, yPos);
          yPos += 8;
        });
      }

      // Save the PDF
      const fileName = `executive-summary-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Enhanced PDF generation failed:', error);
      // Final fallback to basic export
      await exportReport();
    }
  };

  const exportDataCSV = async () => {

    try {

      // Export comprehensive CSV data
      const [initiativesRes, issuesRes, clustersRes] = await Promise.all([
        fetch('/api/initiatives'),
        fetch('/api/issues'),
        fetch('/api/ai/cluster-issues'),
      ]);

      const [initiatives, issues, clusters] = await Promise.all([
        initiativesRes.json(),
        issuesRes.json(),
        clustersRes.ok ? clustersRes.json() : { clusters: [] },
      ]);

      // Create CSV content
      const csvData = {
        initiatives: initiatives.map((init: any) => ({
          id: init.id,
          title: init.title,
          status: init.status,
          progress: init.progress,
          priority: init.priorityScore,
          roi: init.roi,
          difficulty: init.difficulty,
          budget: init.budget,
          owner: init.owner?.name || 'Unknown',
        })),
        issues: issues.map((issue: any) => ({
          id: issue.id,
          description: issue.description,
          votes: issue.votes,
          heatmapScore: issue.heatmapScore,
          department: issue.department,
          category: issue.category,
        })),
        clusters:
          clusters.clusters?.map((cluster: any) => ({
            id: cluster.id,
            name: cluster.name,
            category: cluster.category,
            severity: cluster.severity,
            issueCount: cluster.issueCount,
          })) || [],
      };

      // Convert to CSV and download
      const csvContent = Object.entries(csvData)
        .map(([type, data]) => {
          if (data.length === 0) return `${type.toUpperCase()}\nNo data available\n\n`;

          const headers = Object.keys(data[0]).join(',');
          const rows = data.map((item: any) => Object.values(item).join(','));
          return `${type.toUpperCase()}\n${headers}\n${rows.join('\n')}\n\n`;
        })
        .join('');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowvision-data-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Failed to export CSV:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const configureScheduledReports = () => {

    // Open scheduling configuration modal/dialog
    alert(
      'Scheduled Reports Configuration\n\nThis feature allows you to set up automated report generation and delivery.\n\nComing soon: Configure weekly/monthly report schedules, email delivery, and custom report templates.'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={reportRef}>
      {/* Non-blocking error banner placeholder (surface tile errors when present) */}
      {!loading &&
        (!healthScore || alerts.length === 0 || !roiForecast || insights.length === 0) && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
            <div
              className="bg-yellow-50 border border-yellow-200 rounded-md p-3"
              role="status"
              aria-live="polite"
            >
              <div className="text-sm text-yellow-800 flex items-center justify-between">
                <span>
                  Some dashboard tiles could not load the latest data. Showing what’s available.
                </span>
                <button className="text-yellow-900 underline" onClick={loadDashboardData}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Insights Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Intelligent Analysis & Strategic Intelligence for {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'systems', name: 'Systems Analytics', icon: CpuChipIcon },
              { id: 'insights', name: 'AI Insights', icon: LightBulbIcon },
              { id: 'correlations', name: 'Correlations', icon: ArrowPathIcon },
              { id: 'intelligence', name: 'AI Intelligence', icon: CpuChipIcon },
              { id: 'reports', name: 'Reports', icon: DocumentArrowDownIcon },
              { id: 'forecasting', name: 'ROI Forecasting', icon: ArrowTrendingUpIcon },
              { id: 'alerts', name: 'Alerts', icon: ExclamationTriangleIcon },
              { id: 'utilization', name: 'Team Utilization', icon: UsersIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
                {tab.id === 'alerts' && alerts.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full ml-2">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Health Score & Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Health Score</p>
                    <p
                      className={`text-3xl font-bold ${getHealthScoreColor(healthScore?.score || 0)}`}
                    >
                      {healthScore?.score || 0}
                    </p>
                  </div>
                  <div className="text-2xl">{getTrendIcon(healthScore?.trend || 'stable')}</div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${healthScore?.score || 0}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-600">
                      {alerts.filter((a) => a.type === 'critical').length}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {alerts.filter((a) => a.type === 'warning').length} warnings
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ROI Forecast</p>
                    <p className="text-3xl font-bold text-green-600">
                      {roiForecast?.forecast.threeMonth.toFixed(1)}%
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {roiForecast?.forecast.confidence}% confidence
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatCurrency(roiForecast?.current.portfolioValue || 0)}
                    </p>
                  </div>
                  <ChartBarIcon className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total investment: {formatCurrency(roiForecast?.current.totalInvestment || 0)}
                </p>
              </motion.div>
            </div>

            {/* Health Score Components */}
            {healthScore && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Score Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(healthScore.components).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{Math.round(value)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 flex items-center space-x-3">
                    <UsersIcon className="w-5 h-5 text-blue-500" />
                    <span>Review Resource Allocation</span>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 flex items-center space-x-3">
                    <ClockIcon className="w-5 h-5 text-yellow-500" />
                    <span>Address Timeline Risks</span>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 flex items-center space-x-3">
                    <CalendarIcon className="w-5 h-5 text-green-500" />
                    <span>Schedule Weekly Review</span>
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Insights</h3>
                <div className="space-y-3">
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getImpactColor(insight.impact)}`}
                        >
                          {insight.impact}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{insight.summary}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab('insights')}
                    className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all insights →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'systems' && (
          <SystemsAnalyticsDashboard />
        )}

        {activeTab === 'insights' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered Strategic Insights</h2>
            <div className="grid grid-cols-1 gap-6">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white rounded-lg shadow-card-elevated hover:shadow-card-elevated-hover transition-shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getImpactColor(insight.impact)}`}
                        >
                          {insight.impact} impact
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {insight.type}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{insight.summary}</p>

                      {/* Enhanced Context Section */}
                      {insight.context && (
                        <div className="space-y-3 mb-4">
                          {/* Root Causes */}
                          {insight.context.rootCauses && insight.context.rootCauses.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-lg">
                              <h4 className="text-sm font-semibold text-red-800 mb-1">
                                Root Causes
                              </h4>
                              <ul className="text-sm text-red-700 list-disc list-inside">
                                {insight.context.rootCauses.map((cause, idx) => (
                                  <li key={idx}>{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Related Entities */}
                          {(insight.context.relatedIssues?.length > 0 ||
                            insight.context.relatedInitiatives?.length > 0) && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                                Related Context
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {insight.context.relatedIssues?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-blue-700">
                                      Related Issues:
                                    </span>
                                    <ul className="text-blue-600 ml-2">
                                      {insight.context.relatedIssues
                                        .slice(0, 3)
                                        .map((issue: any) => (
                                          <li key={issue.id} className="truncate">
                                            • {issue.description}
                                          </li>
                                        ))}
                                      {insight.context.relatedIssues.length > 3 && (
                                        <li className="text-blue-500">
                                          +{insight.context.relatedIssues.length - 3} more
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {insight.context.relatedInitiatives?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-blue-700">
                                      Related Initiatives:
                                    </span>
                                    <ul className="text-blue-600 ml-2">
                                      {insight.context.relatedInitiatives
                                        .slice(0, 3)
                                        .map((initiative: any) => (
                                          <li key={initiative.id} className="truncate">
                                            • {initiative.title}
                                          </li>
                                        ))}
                                      {insight.context.relatedInitiatives.length > 3 && (
                                        <li className="text-blue-500">
                                          +{insight.context.relatedInitiatives.length - 3} more
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Enhanced Action Plan */}
                      {insight.actionPlan ? (
                        <div className="space-y-3">
                          {insight.actionPlan.immediate?.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-lg">
                              <h4 className="text-sm font-semibold text-red-800 mb-2">
                                🚨 Immediate Actions
                              </h4>
                              {insight.actionPlan.immediate.map((action: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-sm text-red-700 border-l-2 border-red-300 pl-3 mb-2"
                                >
                                  <div className="font-medium">{action.description}</div>
                                  <div className="text-red-600 text-xs">
                                    {action.assignee} • {action.estimatedHours}h • Due:{' '}
                                    {action.dueDate
                                      ? new Date(action.dueDate).toLocaleDateString()
                                      : 'ASAP'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {insight.actionPlan.shortTerm?.length > 0 && (
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                                ⏰ Short-term Actions
                              </h4>
                              {insight.actionPlan.shortTerm
                                .slice(0, 2)
                                .map((action: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm text-yellow-700 border-l-2 border-yellow-300 pl-3 mb-2"
                                  >
                                    <div className="font-medium">{action.description}</div>
                                    <div className="text-yellow-600 text-xs">
                                      {action.assignee} • {action.estimatedHours}h
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Recommendation:</strong>{' '}
                            {insight.recommendation || 'Further analysis needed'}
                          </p>
                        </div>
                      )}

                      {/* Business Impact */}
                      {insight.businessImpact && (
                        <div className="mt-4 bg-green-50 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-green-800 mb-2">
                            💰 Business Impact
                          </h4>
                          <div className="grid grid-cols-3 gap-3 text-xs text-green-700">
                            <div>
                              <span className="font-medium">Cost of Inaction:</span>
                              <div className="text-green-800">
                                ${insight.businessImpact.financial.costOfInaction.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Potential Savings:</span>
                              <div className="text-green-800">
                                $
                                {insight.businessImpact.financial.potentialSavings.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Timeline:</span>
                              <div className="text-green-800">
                                {insight.businessImpact.timeline.daysToResolution} days
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Confidence Display */}
                    <div className="ml-4 text-right min-w-[120px]">
                      <div className="text-sm text-gray-500">AI Confidence</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {insight.confidenceReasoning?.score ||
                          (typeof insight.confidence === 'number'
                            ? insight.confidence
                            : typeof insight.confidence === 'object'
                              ? (insight.confidence as any)?.score
                              : 0) ||
                          0}
                        %
                      </div>

                      {/* Confidence Reasoning */}
                      {insight.confidenceReasoning && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div className="mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-white text-xs ${
                                insight.confidenceReasoning.dataQuality === 'high'
                                  ? 'bg-green-500'
                                  : insight.confidenceReasoning.dataQuality === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                            >
                              {insight.confidenceReasoning.dataQuality} quality
                            </span>
                          </div>
                          <div className="text-gray-500">
                            Sample: {insight.confidenceReasoning.sampleSize} items
                          </div>
                          {insight.confidenceReasoning.historicalAccuracy && (
                            <div className="text-gray-500">
                              Accuracy: {insight.confidenceReasoning.historicalAccuracy}%
                            </div>
                          )}
                        </div>
                      )}

                      {insight.actionRequired && (
                        <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Action Required
                        </span>
                      )}

                      {/* Expandable Confidence Details */}
                      {insight.confidenceReasoning?.reasoning && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            Why this confidence?
                          </summary>
                          <div className="mt-1 text-left bg-gray-50 p-2 rounded text-gray-700">
                            <ul className="list-disc list-inside space-y-1">
                              {insight.confidenceReasoning.reasoning.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                            {insight.confidenceReasoning.uncertaintyFactors &&
                              insight.confidenceReasoning.uncertaintyFactors.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="font-medium text-red-600">
                                    Uncertainty Factors:
                                  </div>
                                  <ul className="list-disc list-inside text-red-600">
                                    {insight.confidenceReasoning.uncertaintyFactors.map(
                                      (factor, idx) => (
                                        <li key={idx}>{factor}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'correlations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Cross-System Correlation Analysis
                </h2>
                <p className="text-gray-600 mt-1">
                  Real-time pattern detection and relationship analysis across initiatives, issues,
                  and clusters
                </p>
              </div>
            </div>

            {/* Multiple correlation views for different entities */}
            <div className="space-y-8">
              {/* Cluster-based correlations */}
              {insights.length > 0 &&
                insights[0]?.context?.relatedIssues?.length &&
                insights[0].context.relatedIssues.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Issue Cluster Correlations
                    </h3>
                    <CorrelationDashboard
                      entityId={
                        insights[0].context.relatedIssues[0]?.clusterId || 'default-cluster'
                      }
                      entityType="cluster"
                      className="mb-6"
                    />
                  </div>
                )}

              {/* Initiative-based correlations */}
              {insights.length > 0 &&
                insights[0]?.context?.relatedInitiatives?.length &&
                insights[0].context.relatedInitiatives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Initiative Correlations
                    </h3>
                    <CorrelationDashboard
                      entityId={
                        insights[0].context.relatedInitiatives[0]?.id || 'default-initiative'
                      }
                      entityType="initiative"
                      className="mb-6"
                    />
                  </div>
                )}

              {/* Fallback when no specific entities are available */}
              {(!insights.length ||
                (!insights[0]?.context?.relatedIssues?.length &&
                  !insights[0]?.context?.relatedInitiatives?.length)) && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Correlations</h3>
                  <p className="text-gray-600">
                    Correlation analysis requires active initiatives or issue clusters to analyze
                    relationships.
                    <br />
                    Create some initiatives or report issues to see cross-system patterns.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'intelligence' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Intelligence Center</h2>
                <p className="text-gray-600 mt-1">
                  Predictive analytics, automated decision-making, and real-time intelligent
                  monitoring
                </p>
              </div>
            </div>

            <IntelligenceDashboard />
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Efficiency Intelligence</h2>
                <p className="text-gray-600 mt-1">
                  Transform your operational data into actionable insights
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            </div>

            {/* Report Generation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Executive Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto">
                  <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Executive Summary
                </h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Weekly efficiency report for leadership
                </p>
                <button onClick={generateExecutiveReport} className="w-full btn-primary">
                  Generate Report
                </button>
              </motion.div>

              {/* Data Export */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4 mx-auto">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Data Export
                </h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Export raw data for external analysis
                </p>
                <button onClick={exportDataCSV} className="w-full btn-secondary">
                  Export CSV
                </button>
              </motion.div>

              {/* Scheduled Reports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4 mx-auto">
                  <CalendarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Scheduled Reports
                </h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Setup automated reporting schedules
                </p>
                <button onClick={configureScheduledReports} className="w-full btn-secondary">
                  Configure
                </button>
              </motion.div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <DocumentArrowDownIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No reports generated yet
                  </h4>
                  <p className="text-gray-600">Generate your first report to get started</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'utilization' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Utilization</h2>
                <span className="text-sm text-gray-500">Owners with most active initiatives</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className={`px-3 py-1 text-sm rounded border ${utilView === 'bar' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                  onClick={() => setUtilView('bar')}
                >
                  Bar
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded border ${utilView === 'heatmap' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                  onClick={() => setUtilView('heatmap')}
                >
                  Heatmap
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              {utilView === 'bar' ? (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={utilization}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="activeInitiatives" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Active Initiatives
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {utilization.map((u) => (
                          <tr key={u.ownerId}>
                            <td className="px-4 py-2 text-sm text-gray-900">{u.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {u.activeInitiatives}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {(() => {
                    const max = Math.max(1, ...utilization.map((u) => u.activeInitiatives));
                    return (
                      <div className="space-y-2">
                        {utilization.map((u) => {
                          const ratio = Math.min(1, u.activeInitiatives / max);
                          const bg = `rgba(37, 99, 235, ${0.15 + ratio * 0.85})`;
                          return (
                            <div key={u.ownerId} className="flex items-center space-x-3">
                              <div className="w-48 text-sm text-gray-800 truncate">{u.name}</div>
                              <div className="flex-1 h-6 rounded" style={{ backgroundColor: bg }} />
                              <div className="w-12 text-right text-sm text-gray-900">
                                {u.activeInitiatives}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'forecasting' && roiForecast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">ROI Forecasting & Performance</h2>

            {/* Current ROI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Total Investment</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(roiForecast.current.totalInvestment)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Realized ROI</h3>
                <p className="text-2xl font-bold text-green-600">
                  {roiForecast.current.realizedRoi.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Pending ROI</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {roiForecast.current.pendingRoi.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Portfolio Value</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(roiForecast.current.portfolioValue)}
                </p>
              </div>
            </div>

            {/* ROI Forecast Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI Forecast Timeline</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { period: 'Current', roi: roiForecast.current.realizedRoi },
                      { period: '3 Month', roi: roiForecast.forecast.threeMonth },
                      { period: '6 Month', roi: roiForecast.forecast.sixMonth },
                      { period: '12 Month', roi: roiForecast.forecast.twelveMonth },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'ROI']} />
                    <Line type="monotone" dataKey="roi" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Forecast confidence: {roiForecast.forecast.confidence}%
              </p>
            </div>

            {/* Top Performers & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Performing Initiatives
                </h3>
                <div className="space-y-3">
                  {roiForecast.topPerformers.map((performer) => (
                    <div
                      key={performer.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{performer.title}</p>
                        <p className="text-sm text-gray-600">{performer.status}</p>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {performer.roi.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {roiForecast.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Predictive Alerts & Risk Management
              </h2>
              <button
                onClick={async () => {
                  setSettingsOpen(true);
                  await loadAlertSettings();
                }}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-black"
              >
                Alert Settings
              </button>
            </div>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            alert.type === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.type === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.type}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{alert.description}</p>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Recommendation:</strong> {alert.recommendation}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Priority</div>
                      <div className="text-xl font-bold text-gray-900">{alert.priority}/10</div>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900">No Active Alerts</h3>
                  <p className="text-gray-600">
                    Your organization is performing well with no critical issues detected.
                  </p>
                </div>
              )}
            </div>
            <AlertSettingsModal
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              settings={alertSettings}
              onSave={saveAlertSettings}
              saving={settingsSaving}
              error={settingsError}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
