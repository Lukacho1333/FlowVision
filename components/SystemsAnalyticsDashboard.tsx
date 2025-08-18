'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';

interface SystemHealth {
  systemName: string;
  issueCount: number;
  averageSeverity: number;
  healthScore: number;
}

interface CrossSystemIssue {
  id: string;
  description: string;
  affectedSystems: string[];
  impactScore: number;
  urgency: string;
}

interface SystemROI {
  systemName: string;
  projectedROI: number;
  paybackPeriod: number;
  totalInvestment: number;
  potentialSavings: number;
  recommendation: string;
}

interface SystemsData {
  systemHealth: {
    overallScore: number;
    trend: string;
  };
  systemMetrics: SystemHealth[];
  criticalSystems: any[];
  crossSystemIssues: CrossSystemIssue[];
  systemROIAnalysis: SystemROI[];
  investmentPriorities: any[];
}

export default function SystemsAnalyticsDashboard() {
  const [activeView, setActiveView] = useState('health');
  const [systemsData, setSystemsData] = useState<SystemsData | null>(null);
  const [crossSystemData, setCrossSystemData] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemsData();
  }, []);

  const loadSystemsData = async () => {
    try {
      setLoading(true);
      
      const [healthRes, crossSystemRes, roiRes] = await Promise.all([
        fetch('/api/executive/systems-health'),
        fetch('/api/executive/cross-system-analysis'),
        fetch('/api/executive/roi-impact-by-system'),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemsData(prev => ({
          ...prev,
          systemHealth: healthData.systemHealth,
          systemMetrics: healthData.systemMetrics || [],
          criticalSystems: healthData.criticalSystems || [],
        } as SystemsData));
      }

      if (crossSystemRes.ok) {
        const crossSystemData = await crossSystemRes.json();
        setCrossSystemData(crossSystemData);
        setSystemsData(prev => ({
          ...prev,
          crossSystemIssues: crossSystemData.crossSystemIssues || [],
        } as SystemsData));
      }

      if (roiRes.ok) {
        const roiData = await roiRes.json();
        setRoiData(roiData);
        setSystemsData(prev => ({
          ...prev,
          systemROIAnalysis: roiData.systemROIAnalysis || [],
          investmentPriorities: roiData.investmentPriorities || [],
        } as SystemsData));
      }

    } catch (error) {
      console.error('Failed to load systems data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
    if (trend === 'declining') return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
    return <ClockIcon className="w-5 h-5 text-gray-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Systems Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Executive-level insights into system health, cross-system dependencies, and ROI optimization
          </p>
        </div>
      </div>

      {/* View Selection */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'health', name: 'System Health', icon: ChartBarIcon },
          { id: 'cross-system', name: 'Cross-System Analysis', icon: ArrowPathIcon },
          { id: 'roi', name: 'ROI by System', icon: CurrencyDollarIcon },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeView === view.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <view.icon className="w-4 h-4" />
            <span>{view.name}</span>
          </button>
        ))}
      </div>

      {/* System Health View */}
      {activeView === 'health' && systemsData && (
        <div className="space-y-6">
          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Health</p>
                  <p className={`text-3xl font-bold ${getHealthScoreColor(systemsData.systemHealth?.overallScore || 0)}`}>
                    {systemsData.systemHealth?.overallScore || 0}
                  </p>
                </div>
                {getTrendIcon(systemsData.systemHealth?.trend || 'stable')}
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${systemsData.systemHealth?.overallScore || 0}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Systems Monitored</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {systemsData.systemMetrics?.length || 0}
                  </p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Active system categories</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Systems</p>
                  <p className="text-3xl font-bold text-red-600">
                    {systemsData.criticalSystems?.length || 0}
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Require immediate attention</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cross-System Issues</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {systemsData.crossSystemIssues?.length || 0}
                  </p>
                </div>
                <ArrowPathIcon className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Multi-system coordination needed</p>
            </motion.div>
          </div>

          {/* System Health Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemsData.systemMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="systemName" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'healthScore' ? `${value}%` : value,
                      name === 'healthScore' ? 'Health Score' : 
                      name === 'issueCount' ? 'Issues' : 'Avg Severity'
                    ]}
                  />
                  <Bar dataKey="healthScore" fill="#2563eb" name="healthScore" />
                  <Bar dataKey="issueCount" fill="#dc2626" name="issueCount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Critical Systems Table */}
          {systemsData.criticalSystems && systemsData.criticalSystems.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Critical Systems Requiring Attention</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issues
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommendation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {systemsData.criticalSystems.map((system, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {system.systemName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {system.issueCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {system.riskScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              system.status === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : system.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {system.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {system.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-System Analysis View */}
      {activeView === 'cross-system' && crossSystemData && (
        <div className="space-y-6">
          {/* Cross-System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Complexity Score</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {crossSystemData.analysis?.complexityScore || 0}
                  </p>
                </div>
                <ArrowPathIcon className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">System interdependency level</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cross-System Issues</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {crossSystemData.crossSystemIssues?.length || 0}
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Issues spanning multiple systems</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Multi-System Initiatives</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {crossSystemData.initiativeImpacts?.length || 0}
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Initiatives affecting multiple systems</p>
            </div>
          </div>

          {/* System Dependencies Visualization */}
          {crossSystemData.systemDependencies && crossSystemData.systemDependencies.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Dependencies</h3>
              <div className="space-y-4">
                {crossSystemData.systemDependencies.slice(0, 5).map((dependency: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium text-gray-900">{dependency.systemA}</span>
                        <ArrowPathIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{dependency.systemB}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {dependency.initiatives?.length || 0} shared initiatives
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Strength: {dependency.totalStrength || 0}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          dependency.highestRisk === 'high'
                            ? 'bg-red-100 text-red-800'
                            : dependency.highestRisk === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {dependency.highestRisk} risk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-System Issues */}
          {crossSystemData.crossSystemIssues && crossSystemData.crossSystemIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Cross-System Issues</h3>
              </div>
              <div className="p-6 space-y-4">
                {crossSystemData.crossSystemIssues.slice(0, 5).map((issue: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{issue.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {issue.affectedSystems?.map((system: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {system}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Impact: {issue.impactScore || 0}
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            issue.urgency === 'high'
                              ? 'bg-red-100 text-red-800'
                              : issue.urgency === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {issue.urgency} urgency
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROI by System View */}
      {activeView === 'roi' && roiData && (
        <div className="space-y-6">
          {/* ROI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Investment</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(roiData.portfolioOverview?.totalInvestment || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expected ROI</p>
                  <p className="text-3xl font-bold text-green-600">
                    {roiData.portfolioOverview?.expectedROI || 0}%
                  </p>
                </div>
                <ArrowTrendingUpIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Risk Level</p>
                  <p className="text-3xl font-bold text-yellow-600 capitalize">
                    {roiData.portfolioOverview?.riskLevel || 'Unknown'}
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Systems Analyzed</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {roiData.portfolioOverview?.systemsCount || 0}
                  </p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* ROI vs Investment Scatter Plot */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI vs Investment by System</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="totalInvestment" 
                    name="Investment"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    dataKey="projectedROI" 
                    name="ROI %" 
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'totalInvestment' ? formatCurrency(value as number) : `${value}%`,
                      name === 'totalInvestment' ? 'Investment' : 'ROI'
                    ]}
                    labelFormatter={(label) => `System: ${label}`}
                  />
                  <Scatter 
                    data={roiData.systemROIAnalysis || []} 
                    fill="#2563eb"
                    dataKey="projectedROI"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top ROI Systems */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top ROI Systems</h3>
              </div>
              <div className="p-6 space-y-4">
                {roiData.systemROIAnalysis?.slice(0, 5).map((system: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{system.systemName}</p>
                      <p className="text-sm text-gray-500">
                        Investment: {formatCurrency(system.totalInvestment)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Payback: {system.paybackPeriod} months
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {system.projectedROI}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Investment Priorities</h3>
              </div>
              <div className="p-6 space-y-4">
                {roiData.investmentPriorities?.slice(0, 5).map((priority: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{priority.systemName}</p>
                      <p className="text-sm text-gray-500">{priority.recommendedAction}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {priority.overallPriority}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          priority.priorityLevel === 'high'
                            ? 'bg-red-100 text-red-800'
                            : priority.priorityLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {priority.priorityLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
