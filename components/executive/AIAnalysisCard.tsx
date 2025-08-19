'use client';

import React, { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export interface AIAnalysisData {
  summary: string;
  rootCauses: string[];
  recommendations: string[];
  confidence: number;
  impactEstimate: string;
  timeToResolve?: string;
  costEstimate?: string;
  trend: 'improving' | 'stable' | 'declining';
  keyMetrics?: {
    productivityImpact?: string;
    departmentsAffected?: number;
    estimatedHours?: number;
  };
}

interface AIAnalysisCardProps {
  analysis: AIAnalysisData;
  title: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  showCreateInitiative?: boolean;
  onCreateInitiative?: () => void;
  className?: string;
}

export default function AIAnalysisCard({
  analysis,
  title,
  isExpanded = false,
  onToggle,
  showCreateInitiative = true,
  onCreateInitiative,
  className = ''
}: AIAnalysisCardProps) {
  const [isInternalExpanded, setIsInternalExpanded] = useState(false);
  
  const expanded = onToggle ? isExpanded : isInternalExpanded;
  const handleToggle = onToggle || (() => setIsInternalExpanded(!isInternalExpanded));

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'declining': return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'declining': return 'Declining';
      default: return 'Stable';
    }
  };

  return (
    <div className={`border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-50 rounded-t-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">{title}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(analysis.confidence)}`}>
            {analysis.confidence}% confidence
          </span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-5 w-5 text-blue-600" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-blue-600" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-blue-200 bg-white">
          {/* Executive Summary */}
          <div className="py-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2 text-blue-500" />
              Executive Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Key Metrics */}
          {analysis.keyMetrics && (
            <div className="py-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{analysis.keyMetrics.departmentsAffected || 'N/A'}</div>
                  <div className="text-xs text-gray-600">Departments</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">{analysis.impactEstimate}</div>
                  <div className="text-xs text-gray-600">Impact</div>
                </div>
                {analysis.timeToResolve && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{analysis.timeToResolve}</div>
                    <div className="text-xs text-gray-600">Time to Resolve</div>
                  </div>
                )}
                <div className="text-center p-3 bg-gray-50 rounded-lg flex items-center justify-center space-x-1">
                  {getTrendIcon(analysis.trend)}
                  <span className="text-sm font-medium">{getTrendText(analysis.trend)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Root Cause Analysis */}
          {analysis.rootCauses.length > 0 && (
            <div className="py-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-orange-500" />
                Root Cause Analysis
              </h4>
              <ol className="space-y-2">
                {analysis.rootCauses.map((cause, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{cause}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Strategic Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="py-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <LightBulbIcon className="h-4 w-4 mr-2 text-green-500" />
                Strategic Recommendations
              </h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <LightBulbIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cost Estimate */}
          {analysis.costEstimate && (
            <div className="py-4 border-t border-gray-100">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Estimated Investment</span>
                </div>
                <span className="text-lg font-bold text-green-600">{analysis.costEstimate}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showCreateInitiative && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  AI Analysis generated on {new Date().toLocaleDateString()}
                </div>
                <button
                  onClick={onCreateInitiative}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <LightBulbIcon className="h-4 w-4 mr-2" />
                  Create Initiative
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
