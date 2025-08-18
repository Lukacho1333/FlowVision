-- PostgreSQL Row-Level Security Migration
-- SECURITY CRITICAL: Database-level tenant isolation
-- Story 19.2: Implement RLS policies for multi-tenant data isolation

-- Enable RLS on all multi-tenant tables
-- This ensures data cannot leak between organizations even if application code fails

BEGIN;

-- Create function to get current organization ID from session
CREATE OR REPLACE FUNCTION current_organization_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_organization_id', true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_super_admin', true)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- User RLS Policy: Users can only see users from their organization
CREATE POLICY tenant_isolation_users ON "User"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on Issue table
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;

-- Issue RLS Policy: Issues are isolated by organization
CREATE POLICY tenant_isolation_issues ON "Issue"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on Initiative table
ALTER TABLE "Initiative" ENABLE ROW LEVEL SECURITY;

-- Initiative RLS Policy: Initiatives are isolated by organization
CREATE POLICY tenant_isolation_initiatives ON "Initiative"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on BusinessProfile table
ALTER TABLE "BusinessProfile" ENABLE ROW LEVEL SECURITY;

-- BusinessProfile RLS Policy: Business profiles are isolated by organization
CREATE POLICY tenant_isolation_business_profiles ON "BusinessProfile"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on IssueCluster table
ALTER TABLE "IssueCluster" ENABLE ROW LEVEL SECURITY;

-- IssueCluster RLS Policy: Issue clusters are isolated by organization
CREATE POLICY tenant_isolation_issue_clusters ON "IssueCluster"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on Comment table
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

-- Comment RLS Policy: Comments are isolated through their parent entities
CREATE POLICY tenant_isolation_comments ON "Comment"
    FOR ALL
    TO PUBLIC
    USING (
        -- Comments on initiatives
        ("initiativeId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Initiative" 
            WHERE "id" = "Comment"."initiativeId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        -- Comments on issues
        ("issueId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Issue" 
            WHERE "id" = "Comment"."issueId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        -- Comments on ideas
        ("ideaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Idea" 
            WHERE "id" = "Comment"."ideaId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR is_super_admin()
    )
    WITH CHECK (
        -- Same logic for WITH CHECK
        ("initiativeId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Initiative" 
            WHERE "id" = "Comment"."initiativeId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        ("issueId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Issue" 
            WHERE "id" = "Comment"."issueId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        ("ideaId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Idea" 
            WHERE "id" = "Comment"."ideaId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR is_super_admin()
    );

-- Enable Row Level Security on Vote table
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;

-- Vote RLS Policy: Votes are isolated through their parent entities
CREATE POLICY tenant_isolation_votes ON "Vote"
    FOR ALL
    TO PUBLIC
    USING (
        -- Votes on initiatives
        ("initiativeId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Initiative" 
            WHERE "id" = "Vote"."initiativeId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        -- Votes on issues
        ("issueId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Issue" 
            WHERE "id" = "Vote"."issueId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR is_super_admin()
    )
    WITH CHECK (
        -- Same logic for WITH CHECK
        ("initiativeId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Initiative" 
            WHERE "id" = "Vote"."initiativeId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR
        ("issueId" IS NOT NULL AND EXISTS (
            SELECT 1 FROM "Issue" 
            WHERE "id" = "Vote"."issueId" 
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        ))
        OR is_super_admin()
    );

-- Enable Row Level Security on AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- AuditLog RLS Policy: Audit logs are isolated by organization
CREATE POLICY tenant_isolation_audit_logs ON "AuditLog"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on Idea table
ALTER TABLE "Idea" ENABLE ROW LEVEL SECURITY;

-- Idea RLS Policy: Ideas are isolated by organization
CREATE POLICY tenant_isolation_ideas ON "Idea"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on RequirementCard table
ALTER TABLE "RequirementCard" ENABLE ROW LEVEL SECURITY;

-- RequirementCard RLS Policy: Requirement cards are isolated by organization
CREATE POLICY tenant_isolation_requirement_cards ON "RequirementCard"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on Team table
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;

-- Team RLS Policy: Teams are isolated by organization
CREATE POLICY tenant_isolation_teams ON "Team"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on ResourceAssignment table
ALTER TABLE "ResourceAssignment" ENABLE ROW LEVEL SECURITY;

-- ResourceAssignment RLS Policy: Resource assignments are isolated by organization
CREATE POLICY tenant_isolation_resource_assignments ON "ResourceAssignment"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Enable Row Level Security on AIConfiguration table
ALTER TABLE "AIConfiguration" ENABLE ROW LEVEL SECURITY;

-- AIConfiguration RLS Policy: AI configurations are isolated by user's organization
CREATE POLICY tenant_isolation_ai_configurations ON "AIConfiguration"
    FOR ALL
    TO PUBLIC
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "id" = "AIConfiguration"."userId"
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        )
        OR is_super_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "id" = "AIConfiguration"."userId"
            AND ("organizationId" = current_organization_id() OR is_super_admin())
        )
        OR is_super_admin()
    );

-- Enable Row Level Security on SystemConfiguration table
ALTER TABLE "SystemConfiguration" ENABLE ROW LEVEL SECURITY;

-- SystemConfiguration RLS Policy: System configurations are isolated by organization
CREATE POLICY tenant_isolation_system_configurations ON "SystemConfiguration"
    FOR ALL
    TO PUBLIC
    USING (
        "organizationId" = current_organization_id()
        OR is_super_admin()
        OR "organizationId" IS NULL -- Global configurations visible to all
    )
    WITH CHECK (
        "organizationId" = current_organization_id()
        OR is_super_admin()
    );

-- Organizations table is exempt from RLS - it's managed by super admin only
-- Super admin users need access to all organizations for management

-- Create index for performance optimization with RLS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organization_rls ON "User" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_organization_rls ON "Issue" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_initiative_organization_rls ON "Initiative" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_profile_organization_rls ON "BusinessProfile" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_organization_rls ON "AuditLog" ("organizationId");

-- Create function to set tenant context for application
CREATE OR REPLACE FUNCTION set_tenant_context(org_id TEXT, is_admin BOOLEAN DEFAULT FALSE) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id, false);
  PERFORM set_config('app.is_super_admin', is_admin::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', '', false);
  PERFORM set_config('app.is_super_admin', 'false', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to application user
GRANT EXECUTE ON FUNCTION current_organization_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_super_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO PUBLIC;

COMMIT;

-- Performance monitoring query for RLS impact
-- Run this after deployment to monitor performance
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "User" WHERE "organizationId" = 'morrison-ae';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "Issue" WHERE "organizationId" = 'morrison-ae';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "Initiative" WHERE "organizationId" = 'morrison-ae';
*/
