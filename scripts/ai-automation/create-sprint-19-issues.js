#!/usr/bin/env node

/**
 * Sprint 19 GitHub Issue Creator
 * Creates specific issues for Multi-Tenant Security Foundation sprint
 */

const sprint19Requirements = [
  {
    title: 'Super Admin Authentication System - Separate Portal Implementation',
    description: `Implement a completely separate super admin portal at admin.flowvision.com with isolated authentication system for FlowVision administrators to securely manage all client organizations.

CRITICAL SECURITY REQUIREMENT: Must be completely isolated from client authentication systems to prevent privilege escalation attacks.`,
    priority: 'critical',
    storyPoints: 13,
    labels: ['sprint-19', 'security', 'authentication', 'super-admin', 'priority:critical'],
    assignees: ['security-architect', 'technical-architect'],
    acceptanceCriteria: [
      'Separate authentication domain at admin.flowvision.com',
      'Multi-factor authentication required for all super admin access',
      'SUPER_ADMIN role completely isolated from client systems',
      'Comprehensive audit logging for all super admin actions',
      'Session management with 30-minute timeout policies',
      'Emergency access and client suspension capabilities',
      'Client organization creation and management interface'
    ]
  },
  {
    title: 'PostgreSQL Row-Level Security Implementation for Tenant Isolation',
    description: `Implement database-level tenant isolation using PostgreSQL Row-Level Security policies to ensure data cannot leak between organizations even if application code fails.

SECURITY REQUIREMENT: Defense in depth requires both application-level AND database-level isolation for enterprise SaaS compliance.`,
    priority: 'critical',
    storyPoints: 8,
    labels: ['sprint-19', 'security', 'database', 'rls', 'tenant-isolation', 'priority:critical'],
    assignees: ['technical-architect', 'database-engineer'],
    acceptanceCriteria: [
      'RLS policies implemented on all multi-tenant tables',
      'Automatic organizationId filtering at database level',
      'Performance testing with RLS enabled (<10% impact)',
      'Safe migration script for existing data',
      'Rollback procedures documented and tested',
      'Comprehensive cross-tenant access prevention testing'
    ]
  },
  {
    title: 'Client-Specific AI Configuration and Resource Management',
    description: `Implement per-organization AI configuration system allowing clients to use their own OpenAI API keys OR FlowVision-managed AI with transparent usage tracking and billing.

BUSINESS REQUIREMENT: Essential for SaaS model - clients need control over AI costs and data privacy while enabling flexible billing options.`,
    priority: 'high',
    storyPoints: 8,
    labels: ['sprint-19', 'ai-configuration', 'multi-tenant', 'billing', 'priority:high'],
    assignees: ['ai-architect', 'integration-specialist'],
    acceptanceCriteria: [
      'Per-organization AI configuration storage',
      'Support for client-provided OpenAI API keys',
      'FlowVision-managed AI with usage tracking',
      'Real-time quota monitoring and enforcement',
      'Billing integration for AI usage tracking',
      'Cost controls and automatic throttling',
      'Encrypted API key storage and secure handling'
    ]
  },
  {
    title: 'Enhanced Tenant Isolation and API Security Middleware',
    description: `Implement comprehensive tenant data segregation in all API endpoints with automatic tenant context enforcement and enhanced audit logging.

COMPLIANCE REQUIREMENT: Required for SOC2 and GDPR compliance - all API operations must be tenant-aware with complete audit trails.`,
    priority: 'high',
    storyPoints: 5,
    labels: ['sprint-19', 'security', 'api-security', 'tenant-isolation', 'audit', 'priority:high'],
    assignees: ['security-architect', 'full-stack-developer'],
    acceptanceCriteria: [
      'API middleware enforces tenant context on all endpoints',
      'Enhanced audit logging with tenant context',
      'Comprehensive cross-tenant access prevention testing',
      'Security penetration testing completed and passed',
      'SOC2 and GDPR compliance documentation updated',
      'Security test suite with >95% coverage'
    ]
  },
  {
    title: 'Super Admin Client Management Interface and Emergency Controls',
    description: `Build comprehensive client management interface for super admins to onboard, configure, monitor, and manage client organizations with emergency controls.

OPERATIONAL REQUIREMENT: Essential for scaling FlowVision as SaaS - streamlined client management with emergency capabilities for operational excellence.`,
    priority: 'high',
    storyPoints: 8,
    labels: ['sprint-19', 'super-admin', 'client-management', 'operations', 'priority:high'],
    assignees: ['product-manager', 'full-stack-developer'],
    acceptanceCriteria: [
      'Streamlined client organization creation wizard',
      'Custom domain assignment capabilities',
      'Subscription plan tier management',
      'Real-time client usage monitoring dashboards',
      'Emergency client suspension and reactivation',
      'AI configuration and quota management',
      'Complete audit trail of all admin actions'
    ]
  }
];

const GitHubIssueCreator = require('./github-issue-creator.js');

class Sprint19IssueCreator extends GitHubIssueCreator {
  constructor() {
    super();
    this.sprint = 'Sprint 19: Multi-Tenant Security Foundation';
    this.milestone = 'Sprint 19 - Multi-Tenant Security Foundation';
  }

  /**
   * Generate Sprint 19 specific issue body
   */
  generateIssueBody(requirement) {
    const storyPoints = requirement.storyPoints;
    const acceptanceCriteria = requirement.acceptanceCriteria || [];
    
    return `## 🔒 Sprint 19: Multi-Tenant Security Foundation

### 📋 User Story

${requirement.description}

## 🎯 Acceptance Criteria

${acceptanceCriteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

## 📊 Story Points

**Estimated**: ${storyPoints} points  
**Sprint**: Sprint 19 (2 weeks)  
**Priority**: ${requirement.priority.toUpperCase()}

## 🛡️ Security Requirements

- [ ] Security Architect approval required
- [ ] Penetration testing validation
- [ ] Expert profile consultation completed
- [ ] Security audit checkpoint passed

## 🏷️ Labels

${requirement.labels.map(label => `- \`${label}\``).join('\n')}

## 👨‍💻 Expert Team Assignment

**Primary**: ${requirement.assignees.join(', ')}  
**Review Required**: Security Architect, Technical Architect

## 🔗 Related Sprint 19 Stories

- Part of Multi-Tenant Security Foundation
- Enables production-ready SaaS deployment
- Required for enterprise security compliance

## 📋 Definition of Done

- [ ] All acceptance criteria completed
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Comprehensive testing completed
- [ ] Documentation updated
- [ ] Audit logging verified

---

*Generated by AI Project Orchestrator for Sprint 19*  
*Security Foundation Sprint - Critical for Production SaaS*  
*Created: ${new Date().toISOString()}*
`;
  }

  /**
   * Override milestone for Sprint 19
   */
  getCurrentMilestone() {
    return this.milestone;
  }

  /**
   * Sprint 19 specific story point estimation
   */
  estimateStoryPoints(requirement) {
    return requirement.storyPoints || super.estimateStoryPoints(requirement);
  }

  /**
   * Sprint 19 specific categorization
   */
  categorizeRequirement(requirement) {
    if (requirement.labels.includes('security')) return 'security';
    if (requirement.labels.includes('super-admin')) return 'admin-management';
    if (requirement.labels.includes('ai-configuration')) return 'ai-config';
    if (requirement.labels.includes('database')) return 'database';
    return 'multi-tenant';
  }
}

// CLI execution
if (require.main === module) {
  const creator = new Sprint19IssueCreator();
  
  console.log('🚀 Creating Sprint 19: Multi-Tenant Security Foundation Issues...\n');
  
  creator.parseRequirementsToIssues(sprint19Requirements)
    .then(issues => {
      console.log(`✅ Generated ${issues.length} Sprint 19 GitHub issues`);
      console.log(`📊 Total Story Points: ${issues.reduce((sum, issue) => sum + issue.storyPoints, 0)}`);
      
      const commands = creator.generateGitHubCLICommands(issues);
      console.log('\n🔧 GitHub CLI Commands for Sprint 19:\n');
      
      commands.forEach((cmd, i) => {
        console.log(`# Sprint 19 Story ${i + 1}: ${issues[i].title}`);
        console.log(`# Priority: ${sprint19Requirements[i].priority.toUpperCase()} | Points: ${issues[i].storyPoints}`);
        console.log(cmd);
        console.log('');
      });
      
      return creator.saveIssuesToFile(issues.map((issue, i) => ({
        ...issue,
        sprintInfo: {
          sprint: 'Sprint 19',
          storyNumber: `19.${i + 1}`,
          securityCritical: true,
          expertReviewRequired: true
        }
      })));
    })
    .then(filepath => {
      console.log(`💾 Sprint 19 issues saved to: ${filepath}`);
      console.log('\n🛡️ SECURITY NOTICE: All Sprint 19 stories require Security Architect approval');
      console.log('🎯 SPRINT GOAL: Production-ready multi-tenant SaaS with enterprise security');
      console.log('\n🚀 Ready to create Sprint 19 GitHub issues!');
    })
    .catch(console.error);
}

module.exports = Sprint19IssueCreator;
