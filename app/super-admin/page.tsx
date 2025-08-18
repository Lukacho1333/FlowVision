'use client';

/**
 * Super Admin Dashboard
 * SECURITY CRITICAL: Only accessible at admin.flowvision.com
 * Provides client management and system oversight for FlowVision administrators
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
}

interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  isActive: boolean;
  isSuspended: boolean;
  currentUsers: number;
  userLimit: number;
  aiUsageCurrentMonth: number;
  aiQuotaMonthly: number;
  createdAt: string;
  lastActivity?: string;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  suspendedClients: number;
  totalRevenue: number;
  totalAIUsage: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<ClientOrganization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('super_admin_session');
    if (!token) {
      router.push('/super-admin/login');
      return;
    }

    setSessionToken(token);
    validateSession(token);
  }, []);

  const validateSession = async (token: string) => {
    try {
      const response = await fetch('/super-admin/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await loadDashboardData(token);
      } else {
        localStorage.removeItem('super_admin_session');
        router.push('/super-admin/login');
      }
    } catch (error) {
      console.error('Session validation error:', error);
      router.push('/super-admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (token: string) => {
    try {
      // Load clients
      const clientsResponse = await fetch(`/super-admin/api/clients?sessionToken=${token}&limit=50`);
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.organizations || []);
        
        // Calculate stats
        const totalClients = clientsData.organizations?.length || 0;
        const activeClients = clientsData.organizations?.filter((c: ClientOrganization) => c.isActive && !c.isSuspended).length || 0;
        const suspendedClients = clientsData.organizations?.filter((c: ClientOrganization) => c.isSuspended).length || 0;
        
        setStats({
          totalClients,
          activeClients,
          suspendedClients,
          totalRevenue: 0, // TODO: Implement revenue calculation
          totalAIUsage: clientsData.organizations?.reduce((sum: number, c: ClientOrganization) => sum + c.aiUsageCurrentMonth, 0) || 0,
          systemHealth: suspendedClients > totalClients * 0.1 ? 'warning' : 'healthy'
        });
      }
    } catch (error) {
      console.error('Dashboard data loading error:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('super_admin_session');
    router.push('/super-admin/login');
  };

  const suspendClient = async (organizationId: string, reason: string) => {
    try {
      const response = await fetch('/super-admin/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          organizationId,
          updates: {
            isSuspended: true,
            suspensionReason: reason
          }
        })
      });

      if (response.ok) {
        await loadDashboardData(sessionToken);
      }
    } catch (error) {
      console.error('Client suspension error:', error);
    }
  };

  const reactivateClient = async (organizationId: string) => {
    try {
      const response = await fetch('/super-admin/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          organizationId,
          updates: {
            isSuspended: false,
            suspensionReason: null
          }
        })
      });

      if (response.ok) {
        await loadDashboardData(sessionToken);
      }
    } catch (error) {
      console.error('Client reactivation error:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'active') return matchesSearch && client.isActive && !client.isSuspended;
    if (filterStatus === 'suspended') return matchesSearch && client.isSuspended;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">FlowVision Super Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {user?.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                user?.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.mfaEnabled ? 'MFA Enabled' : 'MFA Required'}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Clients</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Clients</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Suspended</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.suspendedClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CpuChipIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">AI Usage (Month)</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalAIUsage.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  stats.systemHealth === 'healthy' ? 'bg-green-100' : 
                  stats.systemHealth === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {stats.systemHealth === 'healthy' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Health</p>
                  <p className={`text-sm font-semibold capitalize ${
                    stats.systemHealth === 'healthy' ? 'text-green-600' : 
                    stats.systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.systemHealth}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Client Organizations</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Client
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mt-4 flex space-x-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Client List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.planTier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                        client.planTier === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {client.planTier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.currentUsers} / {client.userLimit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.aiUsageCurrentMonth.toLocaleString()} / {client.aiQuotaMonthly.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.isSuspended ? 'bg-red-100 text-red-800' :
                        client.isActive ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {client.isSuspended ? 'Suspended' : client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.isSuspended ? (
                        <button
                          onClick={() => reactivateClient(client.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => suspendClient(client.id, 'Administrative suspension')}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          Suspend
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
