describe('Issue Management Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/auth');
    cy.get('input[type="email"]').type('admin@test.com');
    cy.get('input[type="password"]').type('Admin123!');
    cy.get('button[type="submit"]').click();
    
    // Wait for redirect to dashboard
    cy.url().should('not.include', '/auth');
  });

  describe('Issues Overview', () => {
    it('displays issues page with navigation', () => {
      cy.visit('/issues');
      
      // Check navigation tabs
      cy.contains('Overview').should('be.visible');
      cy.contains('Browse Issues').should('be.visible');
      cy.contains('AI Analysis').should('be.visible');
      cy.contains('Executive View').should('be.visible');
      
      // Check issues are loaded
      cy.get('[data-testid="issue-card"]').should('have.length.at.least', 1);
    });

    it('filters issues by department', () => {
      cy.visit('/issues');
      
      // Click on browse tab
      cy.contains('Browse Issues').click();
      
      // Select department filter
      cy.get('[data-testid="department-filter"]').select('Engineering');
      
      // Verify filtered results
      cy.get('[data-testid="issue-card"]').each(($card) => {
        cy.wrap($card).should('contain', 'Engineering');
      });
    });

    it('sorts issues by votes', () => {
      cy.visit('/issues');
      cy.contains('Browse Issues').click();
      
      // Sort by votes
      cy.get('[data-testid="sort-select"]').select('votes');
      
      // Verify sorting order
      cy.get('[data-testid="issue-votes"]').then(($votes) => {
        const votes = Array.from($votes).map(el => parseInt(el.textContent || '0'));
        const sortedVotes = [...votes].sort((a, b) => b - a);
        expect(votes).to.deep.equal(sortedVotes);
      });
    });
  });

  describe('Issue Creation', () => {
    it('creates a new issue successfully', () => {
      cy.visit('/issues');
      
      // Click create issue button
      cy.get('[data-testid="create-issue-btn"]').click();
      
      // Fill out issue form
      cy.get('textarea[name="description"]').type('Test issue created by Cypress');
      cy.get('select[name="department"]').select('Engineering');
      cy.get('select[name="category"]').select('Technical');
      
      // Add keywords
      cy.get('input[name="keywords"]').type('test, automation, cypress');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Verify success message
      cy.contains('Issue created successfully').should('be.visible');
      
      // Verify issue appears in list
      cy.contains('Test issue created by Cypress').should('be.visible');
    });

    it('validates required fields', () => {
      cy.visit('/issues');
      cy.get('[data-testid="create-issue-btn"]').click();
      
      // Try to submit without description
      cy.get('button[type="submit"]').click();
      
      // Check validation message
      cy.contains('Description is required').should('be.visible');
    });
  });

  describe('Issue Voting', () => {
    it('allows voting on issues', () => {
      cy.visit('/issues');
      
      // Find first issue and get initial vote count
      cy.get('[data-testid="issue-card"]').first().within(() => {
        cy.get('[data-testid="vote-count"]').invoke('text').then((initialVotes) => {
          const initialCount = parseInt(initialVotes);
          
          // Click vote button
          cy.get('[data-testid="vote-btn"]').click();
          
          // Verify vote count increased
          cy.get('[data-testid="vote-count"]').should('contain', (initialCount + 1).toString());
        });
      });
    });

    it('prevents duplicate voting', () => {
      cy.visit('/issues');
      
      cy.get('[data-testid="issue-card"]').first().within(() => {
        // Vote once
        cy.get('[data-testid="vote-btn"]').click();
        
        // Try to vote again
        cy.get('[data-testid="vote-btn"]').click();
        
        // Should show already voted message
        cy.contains('Already voted').should('be.visible');
      });
    });
  });

  describe('Issue Clustering', () => {
    it('displays cluster analysis', () => {
      cy.visit('/issues');
      
      // Navigate to clustering view
      cy.contains('Overview').click();
      cy.get('[data-testid="clustering-section"]').should('be.visible');
      
      // Verify clusters are displayed
      cy.get('[data-testid="cluster-card"]').should('have.length.at.least', 1);
      
      // Check cluster details
      cy.get('[data-testid="cluster-card"]').first().within(() => {
        cy.get('[data-testid="cluster-name"]').should('be.visible');
        cy.get('[data-testid="cluster-count"]').should('be.visible');
        cy.get('[data-testid="cluster-severity"]').should('be.visible');
      });
    });

    it('allows drilling into cluster details', () => {
      cy.visit('/issues');
      
      // Click on a cluster
      cy.get('[data-testid="cluster-card"]').first().click();
      
      // Should show cluster detail modal or page
      cy.get('[data-testid="cluster-detail"]').should('be.visible');
      
      // Verify cluster issues are listed
      cy.get('[data-testid="cluster-issue"]').should('have.length.at.least', 1);
    });
  });

  describe('Executive View', () => {
    it('displays executive-friendly clustering', () => {
      cy.visit('/issues');
      
      // Navigate to executive view
      cy.contains('Executive View').click();
      
      // Verify business areas are displayed
      cy.contains('Operations & Delivery').should('be.visible');
      cy.contains('People & Culture').should('be.visible');
      cy.contains('Client & Business Development').should('be.visible');
      cy.contains('Technology & Infrastructure').should('be.visible');
      
      // Check summary statistics
      cy.get('[data-testid="total-issues"]').should('be.visible');
      cy.get('[data-testid="strategic-issues"]').should('be.visible');
      cy.get('[data-testid="operational-issues"]').should('be.visible');
    });

    it('shows priority recommendations', () => {
      cy.visit('/issues');
      cy.contains('Executive View').click();
      
      // Verify priority section exists
      cy.get('[data-testid="priority-recommendations"]').should('be.visible');
      
      // Check for high priority items
      cy.get('[data-testid="high-priority-item"]').should('have.length.at.least', 1);
    });
  });

  describe('AI Analysis', () => {
    it('performs AI analysis on issue', () => {
      cy.visit('/issues');
      cy.contains('AI Analysis').click();
      
      // Select an issue for analysis
      cy.get('[data-testid="issue-select"]').select(1);
      
      // Trigger AI analysis
      cy.get('[data-testid="analyze-btn"]').click();
      
      // Wait for analysis to complete
      cy.get('[data-testid="ai-analysis-result"]', { timeout: 10000 }).should('be.visible');
      
      // Verify analysis components
      cy.contains('Root Cause Analysis').should('be.visible');
      cy.contains('Recommendations').should('be.visible');
      cy.contains('Priority Score').should('be.visible');
    });

    it('handles AI analysis errors gracefully', () => {
      cy.visit('/issues');
      cy.contains('AI Analysis').click();
      
      // Mock AI service failure
      cy.intercept('POST', '/api/ai/analyze-issue', {
        statusCode: 500,
        body: { error: 'AI service unavailable' },
      }).as('aiAnalysisError');
      
      cy.get('[data-testid="issue-select"]').select(1);
      cy.get('[data-testid="analyze-btn"]').click();
      
      cy.wait('@aiAnalysisError');
      
      // Should show error message
      cy.contains('AI analysis failed').should('be.visible');
    });
  });

  describe('Issue Search and Filtering', () => {
    it('searches issues by description', () => {
      cy.visit('/issues');
      cy.contains('Browse Issues').click();
      
      // Search for specific term
      cy.get('[data-testid="search-input"]').type('project management');
      
      // Verify filtered results
      cy.get('[data-testid="issue-card"]').each(($card) => {
        cy.wrap($card).should('contain.text', 'project management');
      });
    });

    it('filters by multiple criteria', () => {
      cy.visit('/issues');
      cy.contains('Browse Issues').click();
      
      // Apply multiple filters
      cy.get('[data-testid="department-filter"]').select('Engineering');
      cy.get('[data-testid="status-filter"]').select('OPEN');
      cy.get('[data-testid="category-filter"]').select('Technical');
      
      // Verify all filters are applied
      cy.get('[data-testid="issue-card"]').each(($card) => {
        cy.wrap($card).should('contain', 'Engineering');
        cy.wrap($card).should('contain', 'OPEN');
        cy.wrap($card).should('contain', 'Technical');
      });
    });

    it('clears all filters', () => {
      cy.visit('/issues');
      cy.contains('Browse Issues').click();
      
      // Apply filters
      cy.get('[data-testid="department-filter"]').select('Engineering');
      cy.get('[data-testid="status-filter"]').select('OPEN');
      
      // Clear filters
      cy.get('[data-testid="clear-filters-btn"]').click();
      
      // Verify filters are reset
      cy.get('[data-testid="department-filter"]').should('have.value', '');
      cy.get('[data-testid="status-filter"]').should('have.value', '');
    });
  });

  describe('Responsive Design', () => {
    it('works on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('/issues');
      
      // Mobile navigation should work
      cy.get('[data-testid="mobile-menu-btn"]').click();
      cy.contains('Identify').should('be.visible');
      
      // Issues should be displayed in mobile-friendly layout
      cy.get('[data-testid="issue-card"]').should('be.visible');
    });

    it('works on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit('/issues');
      
      // Tablet layout should be functional
      cy.contains('Overview').should('be.visible');
      cy.get('[data-testid="issue-card"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards', () => {
      cy.visit('/issues');
      
      // Check for proper heading structure
      cy.get('h1').should('exist');
      cy.get('[data-testid="issue-card"]').should('have.attr', 'role', 'article');
      
      // Verify keyboard navigation
      cy.get('[data-testid="create-issue-btn"]').focus();
      cy.focused().should('have.attr', 'data-testid', 'create-issue-btn');
      
      // Test with screen reader
      cy.injectAxe();
      cy.checkA11y();
    });

    it('supports keyboard navigation', () => {
      cy.visit('/issues');
      
      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Test Enter key activation
      cy.get('[data-testid="create-issue-btn"]').focus().type('{enter}');
      cy.get('[data-testid="issue-form"]').should('be.visible');
    });
  });
});
