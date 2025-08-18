# FlowVision GitHub & Source Code Management Best Practices

## 🎯 Overview

This document establishes comprehensive GitHub and source code management rules for the FlowVision project to maintain clean, secure, and efficient development practices. These rules are mandatory for all contributors and have been refined based on production experience.

## 🌿 Branch Management

### Branch Protection Rules

#### Main Branch Protection

- **NEVER commit directly to `main` branch**
- **ALL changes** must go through Pull Requests
- **ALWAYS require** at least 1 reviewer for PR approval
- **ALWAYS require** all CI/CD checks to pass before merge
- **ALWAYS require** up-to-date branches before merge
- **NEVER allow** force pushes to `main`
- **ALWAYS delete** head branches after merge

#### Feature Branch Strategy

```bash
# Branch naming convention
feature/description-of-work        # New features
fix/description-of-issue          # Bug fixes
hotfix/critical-issue            # Emergency fixes
chore/maintenance-task           # Maintenance work
docs/documentation-update        # Documentation changes
```

#### Branch Lifecycle

1. **Create**: Always branch from latest `main`
2. **Develop**: Keep branches focused and small
3. **Sync**: Regularly rebase with `main` to avoid conflicts
4. **Review**: Create PR when ready for review
5. **Merge**: Use squash merge for clean history
6. **Cleanup**: Delete branch after merge

### Merge Strategies

- **Default**: Squash and merge for clean commit history
- **Exception**: Merge commit only for release branches
- **NEVER**: Allow merge commits for feature branches

## 📝 Commit Standards

### Conventional Commits Format

```bash
type(scope): Description

Body with more details if needed.
```

#### Required Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Rules

- **Subject line**: 50 characters max, sentence case
- **Body lines**: 100 characters max per line
- **Always**: Use present tense ("Add feature" not "Added feature")
- **Always**: Be descriptive and specific
- **Always**: Reference issues with `#123` when applicable

#### Examples

```bash
# Good
feat(auth): Add Google OAuth integration
fix(dashboard): Resolve statistics calculation error
docs(api): Update authentication endpoint documentation

# Bad
Update stuff
Fixed bug
WIP
```

## 🔄 Pull Request Process

### PR Requirements

- **Descriptive title** following conventional commit format
- **Detailed description** explaining what, why, and how
- **Link related issues** using GitHub keywords (`fixes #123`, `closes #456`)
- **Include screenshots** for UI changes
- **Add tests** for new functionality
- **Update documentation** if needed

### PR Template Structure

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)

[Include relevant screenshots]

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements in production code
```

### Review Requirements

- **Code Quality**: Clean, readable, and maintainable
- **Testing**: Adequate test coverage
- **Security**: No exposed secrets or vulnerabilities
- **Performance**: No obvious performance regressions
- **Documentation**: Clear and up-to-date

## 🧪 Quality Gates

### Pre-Commit Hooks (Husky)

- **Lint**: ESLint and Prettier checks
- **Test**: Unit tests must pass
- **Type Check**: TypeScript compilation
- **Commit Message**: Conventional commit format validation

### CI/CD Pipeline Requirements

```yaml
Required Checks:
✅ Lint and Type Check
✅ Unit and Integration Tests
✅ Security Scan
✅ End-to-End Tests
✅ Build Verification
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: All errors must be fixed
- **Prettier**: Consistent code formatting
- **Test Coverage**: Minimum 80% for new code
- **No TODO comments**: In production branches

## 🔒 Security Best Practices

### Secrets Management

- **NEVER commit**: API keys, passwords, or tokens
- **ALWAYS use**: Environment variables for secrets
- **ALWAYS add**: `.env.local` to `.gitignore`
- **ALWAYS verify**: No secrets in commit history

### Dependency Management

- **ALWAYS audit**: Dependencies for vulnerabilities
- **ALWAYS use**: Exact versions in `package-lock.json`
- **ALWAYS review**: New dependencies before adding
- **REGULARLY update**: Dependencies with security patches

### Access Control

- **Limit write access**: Only core maintainers
- **Use branch protection**: Enforce review requirements
- **Enable 2FA**: For all contributors
- **Regular audit**: Remove inactive contributors

## 📊 Monitoring & Metrics

### GitHub Actions Monitoring

- **Track**: Build success rates
- **Monitor**: Test execution times
- **Alert**: On consecutive failures
- **Review**: Weekly CI/CD performance

### Code Quality Metrics

- **Test Coverage**: Tracked via CodeCov
- **Code Quality**: Monitored via CodeClimate
- **Security**: Scanned via CodeQL
- **Dependencies**: Tracked via Dependabot

## 🚨 Incident Response

### Hotfix Process

1. **Create**: `hotfix/critical-issue` branch from `main`
2. **Fix**: Implement minimal fix with tests
3. **Review**: Expedited review process (1 reviewer)
4. **Deploy**: Direct to production after CI passes
5. **Document**: Post-incident review and lessons learned

### Rollback Strategy

1. **Identify**: The last known good commit
2. **Create**: Revert PR with explanation
3. **Fast-track**: Through review process
4. **Deploy**: Immediately after approval
5. **Investigate**: Root cause analysis

## 🛠️ Development Workflow

### Daily Development Process

```bash
# 1. Start with fresh main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-new-feature

# 3. Develop with frequent commits
git add .
git commit -m "feat(scope): Add new functionality"

# 4. Keep branch updated
git fetch origin main
git rebase origin/main

# 5. Push and create PR
git push origin feature/my-new-feature
gh pr create --title "feat(scope): Add new functionality" --body "Description"

# 6. After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/my-new-feature
```

### Conflict Resolution

1. **Identify**: Conflict source and scope
2. **Communicate**: With team about resolution approach
3. **Resolve**: Locally with clear testing
4. **Test**: Thoroughly before pushing
5. **Document**: Resolution approach in commit message

## 📋 Maintenance Schedule

### Weekly Tasks

- [ ] Review and update dependencies
- [ ] Clean up merged branches
- [ ] Review CI/CD performance metrics
- [ ] Update documentation as needed

### Monthly Tasks

- [ ] Security audit of dependencies
- [ ] Review and update branch protection rules
- [ ] Analyze code quality trends
- [ ] Team retro on process improvements

### Quarterly Tasks

- [ ] Comprehensive security review
- [ ] Performance optimization audit
- [ ] Documentation review and updates
- [ ] Tool and process evaluation

## 🎯 Enforcement

### Automated Enforcement

- **Branch Protection**: GitHub settings enforce rules
- **Pre-commit Hooks**: Husky prevents bad commits
- **CI/CD Gates**: Actions block non-compliant code
- **Security Scanning**: Automated vulnerability detection

### Manual Enforcement

- **Code Reviews**: Human verification of standards
- **Regular Audits**: Weekly compliance checks
- **Team Training**: Ongoing education on best practices
- **Process Updates**: Continuous improvement based on learnings

## 📚 Resources

### Documentation

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

### Tools

- **GitHub CLI**: `gh` for command-line PR management
- **Husky**: Git hooks for quality gates
- **Commitizen**: Interactive commit message creation
- **Semantic Release**: Automated version management

---

## 🔄 Version History

| Version | Date       | Changes                                                   |
| ------- | ---------- | --------------------------------------------------------- |
| 1.0     | 2024-01-01 | Initial comprehensive rules based on production learnings |

---

**Note**: These rules are living documents that will evolve based on team feedback and project needs. All updates require team discussion and approval.
