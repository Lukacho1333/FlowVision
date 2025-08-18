'use client';

/**
 * AI Configuration Manager Component
 * BUSINESS CRITICAL - Story 19.3: Client-Specific AI Configuration
 * 
 * Provides organization admins with comprehensive AI configuration management:
 * - Choose AI provider model (Client-Managed, FlowVision-Managed, Hybrid)
 * - Set quotas, cost limits, and model preferences
 * - Monitor real-time usage and billing
 * - Test AI configuration
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  CpuChipIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AIConfig {
  id: string;
  organizationId: string;
  provider: 'CLIENT_MANAGED' | 'FLOWVISION_MANAGED' | 'HYBRID';
  model: string;
  maxTokens: number;
  temperature: number;
  monthlyQuota: number;
  dailyQuota: number;
  currentMonthlyUsage: number;
  currentDailyUsage: number;
  maxMonthlyCost: number;
  currentMonthlyCost: number;
  isActive: boolean;
  lastUsed?: string;
  hasClientApiKey?: boolean;
}

interface QuotaStatus {
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  costUsed: number;
  costLimit: number;
  costRemaining: number;
  isThrottled: boolean;
  throttleReason?: string;
}

interface UsageAnalytics {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  successRate: number;
  topOperations: Array<{ operation: string; count: number; tokens: number }>;
  dailyUsage: Array<{ date: string; tokens: number; cost: number }>;
}

export default function AIConfigurationManager() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'usage' | 'analytics'>('config');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: 'FLOWVISION_MANAGED' as const,
    clientApiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7,
    monthlyQuota: 100000,
    dailyQuota: 5000,
    maxMonthlyCost: 50
  });

  useEffect(() => {
    if (session) {
      loadAIConfiguration();
      loadQuotaStatus();
      loadAnalytics();
    }
  }, [session]);

  const loadAIConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ai-config');
      
      if (response.ok) {
        const data = await response.json();
        if (data.configured && data.config) {
          setConfig(data.config);
          setFormData({
            provider: data.config.provider,
            clientApiKey: '',
            model: data.config.model,
            maxTokens: data.config.maxTokens,
            temperature: data.config.temperature,
            monthlyQuota: data.config.monthlyQuota,
            dailyQuota: data.config.dailyQuota,
            maxMonthlyCost: data.config.maxMonthlyCost
          });
        }
      } else {
        setError('Failed to load AI configuration');
      }
    } catch (err) {
      console.error('Failed to load AI config:', err);
      setError('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotaStatus = async () => {
    try {
      const response = await fetch('/api/admin/ai-config?action=status');
      if (response.ok) {
        const status = await response.json();
        setQuotaStatus(status);
      }
    } catch (err) {
      console.error('Failed to load quota status:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await fetch(
        `/api/admin/ai-config?action=analytics&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setTestResult(null);

      const response = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message);
        setConfig(result.config);
        setTestResult(result.testResult);
        await loadQuotaStatus();
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConfiguration = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          ...result.testResult
        });
        setQuotaStatus(result.quotaStatus);
      } else {
        setTestResult({
          success: false,
          error: result.error
        });
      }
    } catch (err) {
      console.error('Failed to test config:', err);
      setTestResult({
        success: false,
        error: 'Failed to test configuration'
      });
    } finally {
      setTesting(false);
    }
  };

  const resetUsage = async () => {
    if (!confirm('Are you sure you want to reset usage counters? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-usage' })
      });

      if (response.ok) {
        setSuccess('Usage counters reset successfully');
        await loadQuotaStatus();
        await loadAnalytics();
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to reset usage');
      }
    } catch (err) {
      console.error('Failed to reset usage:', err);
      setError('Failed to reset usage');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'CLIENT_MANAGED':
        return <CpuChipIcon className="h-5 w-5 text-blue-600" />;
      case 'FLOWVISION_MANAGED':
        return <Cog6ToothIcon className="h-5 w-5 text-green-600" />;
      case 'HYBRID':
        return <ChartBarIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <CpuChipIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CpuChipIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-900">AI Configuration</h2>
          </div>
          
          {config && (
            <div className="flex items-center space-x-2">
              {getProviderIcon(config.provider)}
              <span className="text-sm font-medium text-gray-600">
                {config.provider.replace('_', ' ')}
              </span>
              <div className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {quotaStatus?.isThrottled && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm text-red-800">
                AI services are throttled: {quotaStatus.throttleReason}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-sm text-green-800">{success}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {[
            { id: 'config', name: 'Configuration', icon: Cog6ToothIcon },
            { id: 'usage', name: 'Usage & Quotas', icon: ChartBarIcon },
            { id: 'analytics', name: 'Analytics', icon: CurrencyDollarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Provider Model
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    value: 'CLIENT_MANAGED',
                    title: 'Client-Managed',
                    description: 'Use your own OpenAI API key',
                    icon: <CpuChipIcon className="h-5 w-5" />
                  },
                  {
                    value: 'FLOWVISION_MANAGED',
                    title: 'FlowVision-Managed',
                    description: 'FlowVision provides AI with usage billing',
                    icon: <Cog6ToothIcon className="h-5 w-5" />
                  },
                  {
                    value: 'HYBRID',
                    title: 'Hybrid',
                    description: 'FlowVision manages but bills separately',
                    icon: <ChartBarIcon className="h-5 w-5" />
                  }
                ].map((option) => (
                  <label key={option.value} className="relative">
                    <input
                      type="radio"
                      name="provider"
                      value={option.value}
                      checked={formData.provider === option.value}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.provider === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center mb-2">
                        {option.icon}
                        <span className="ml-2 font-medium text-gray-900">{option.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Client API Key (only for CLIENT_MANAGED) */}
            {formData.provider === 'CLIENT_MANAGED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.clientApiKey}
                    onChange={(e) => setFormData({ ...formData, clientApiKey: e.target.value })}
                    placeholder={config?.hasClientApiKey ? '***Encrypted Key Stored***' : 'sk-...'}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showApiKey ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your API key is encrypted and stored securely
                </p>
              </div>
            )}

            {/* Model Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Monthly Cost ($)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.maxMonthlyCost}
                  onChange={(e) => setFormData({ ...formData, maxMonthlyCost: parseFloat(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Quotas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Token Quota
                </label>
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  value={formData.monthlyQuota}
                  onChange={(e) => setFormData({ ...formData, monthlyQuota: parseInt(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Token Quota
                </label>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={formData.dailyQuota}
                  onChange={(e) => setFormData({ ...formData, dailyQuota: parseInt(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={saveConfiguration}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>

              {config && (
                <button
                  onClick={testConfiguration}
                  disabled={testing}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {testing ? (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4 mr-2" />
                  )}
                  {testing ? 'Testing...' : 'Test Configuration'}
                </button>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  {testResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Configuration Test Successful' : 'Configuration Test Failed'}
                  </span>
                </div>
                {testResult.success && testResult.content && (
                  <div className="text-sm text-green-700 mb-2">
                    <strong>Response:</strong> {testResult.content}
                  </div>
                )}
                {testResult.success && testResult.tokensUsed && (
                  <div className="text-sm text-green-700">
                    <strong>Tokens Used:</strong> {testResult.tokensUsed}
                  </div>
                )}
                {testResult.error && (
                  <div className="text-sm text-red-700">
                    <strong>Error:</strong> {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'usage' && quotaStatus && (
          <div className="space-y-6">
            {/* Usage Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Monthly Usage */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Monthly Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tokens Used</span>
                    <span>{quotaStatus.monthlyUsed.toLocaleString()} / {quotaStatus.monthlyLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(quotaStatus.monthlyUsed, quotaStatus.monthlyLimit))}`}
                      style={{ width: `${getUsagePercentage(quotaStatus.monthlyUsed, quotaStatus.monthlyLimit)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {quotaStatus.monthlyRemaining.toLocaleString()} tokens remaining
                  </div>
                </div>
              </div>

              {/* Daily Usage */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tokens Used</span>
                    <span>{quotaStatus.dailyUsed.toLocaleString()} / {quotaStatus.dailyLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(quotaStatus.dailyUsed, quotaStatus.dailyLimit))}`}
                      style={{ width: `${getUsagePercentage(quotaStatus.dailyUsed, quotaStatus.dailyLimit)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {quotaStatus.dailyRemaining.toLocaleString()} tokens remaining
                  </div>
                </div>
              </div>

              {/* Cost Usage */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Monthly Cost</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cost Used</span>
                    <span>${quotaStatus.costUsed.toFixed(2)} / ${quotaStatus.costLimit.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(quotaStatus.costUsed, quotaStatus.costLimit))}`}
                      style={{ width: `${getUsagePercentage(quotaStatus.costUsed, quotaStatus.costLimit)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    ${quotaStatus.costRemaining.toFixed(2)} remaining
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Actions */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Emergency Actions</h3>
              <div className="space-y-4">
                <button
                  onClick={resetUsage}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Reset Usage Counters
                </button>
                <p className="text-xs text-gray-500">
                  This will reset current usage counters to zero. Use only in emergencies.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CpuChipIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalTokens.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Cost</p>
                    <p className="text-2xl font-semibold text-gray-900">${analytics.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Requests</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.requestCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Operations */}
            {analytics.topOperations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Operations</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Operation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requests
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens Used
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.topOperations.map((operation, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {operation.operation}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {operation.count.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {operation.tokens.toLocaleString()}
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
      </div>
    </div>
  );
}
