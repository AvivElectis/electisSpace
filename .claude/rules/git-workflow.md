---
paths:
  - ".github/**"
  - "CHANGELOG.md"
  - "docs/wiki/**"
---

# Git & GitHub Workflow Rules

## Branch Strategy
- `main` is the production branch — never push directly
- Feature branches from `main`: `feat/`, `fix/`, `chore/`, `tests/`, `docs/`
- PRs require review before merge

## Commit Messages
- Use conventional format: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`
- Concise first line (< 72 chars), optional body for details
- Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` when AI-assisted

## MANDATORY: Project Board Tracking
Every task MUST follow this workflow:
1. Create GitHub issue
2. Add to "electisSpace Development" project board (number 2, owner AvivElectis)
3. Set Status: In Progress, Type: Feature/Bug/Chore/Docs
4. Create PR referencing issue (`Closes #N`)
5. Before merge: update CHANGELOG.md and wiki if needed
6. After merge: set project status to Done

### GraphQL IDs for gh api
```
Project:  PVT_kwHOC2mF1s4BP2ar
Status:   PVTSSF_lAHOC2mF1s4BP2arzg-I748
  Options: Todo (f75ad846) / In Progress (47fc9ee4) / Done (98236657)
Priority: PVTSSF_lAHOC2mF1s4BP2arzg-I76c
  Options: High (c8b9a08e) / Medium (38f731c0) / Low (6699439f)
Type:     PVTSSF_lAHOC2mF1s4BP2arzg-I77w
  Options: Bug (6f285e6c) / Feature (ae61764a) / Enhancement (76068ce7) / Chore (820911a8) / Docs (d9710f6d)
```

## CHANGELOG.md
- Follow Keep a Changelog format (keepachangelog.com)
- Categories: Added, Changed, Fixed, Removed, Security
- Add entries under `[Unreleased]` section during development
- Move to version section on release

## Wiki Documentation
- Source in `docs/wiki/` — auto-published via `.github/workflows/publish-wiki.yml`
- Update relevant wiki chapters when architecture changes
- Chapters: Overview, Client Architecture, Server Architecture, Auth & Security, Data Flow, Infrastructure

## Security: GitGuardian
- All commits are scanned for hardcoded secrets
- Never commit passwords, tokens, or API keys
- For test constants: use named variables with `// pragma: allowlist secret`
- If GitGuardian flags a commit: rewrite history to remove secret from ALL commits, not just add a fix commit

## Release Process
- Version bumps: update `package.json` (client) and `server/package.json`
- Release notes: update `releaseNotesContent` in both locale files
- GitHub Actions: `.github/workflows/release.yml` handles desktop builds
- Tag format: `v2.5.0`
