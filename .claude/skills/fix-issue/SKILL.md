---
name: fix-issue
description: Fix a GitHub issue end-to-end — investigate, fix, test, commit, and update project board
user-invocable: true
---

# Fix Issue Workflow

When the user invokes `/fix-issue <number>`, follow these steps:

## 1. Fetch Issue Details
```bash
gh issue view <number> --json title,body,labels,assignees
```

## 2. Investigate
- Read the issue description and understand the expected vs actual behavior
- Search the codebase for relevant files using the issue context
- Identify the root cause before making changes

## 3. Create Branch
```bash
git checkout -b fix/<short-description> main
```

## 4. Implement Fix
- Make minimal, focused changes that fix the issue
- Follow DDD layer separation (check `.claude/rules/client.md` or `server.md`)
- Add/update translations in both EN and HE if user-facing text changes
- Never introduce new dependencies without discussing first

## 5. Test
- Run relevant unit tests: `npx vitest run --reporter=verbose`
- If server changes: `cd server && npx vitest run`
- Run E2E tests if UI changes: `npx playwright test --grep "relevant test"`
- Verify the fix doesn't break existing functionality

## 6. Commit and Push
- Stage only relevant files (never `git add .`)
- Use conventional commit: `fix: <description>`
- Push with upstream tracking: `git push -u origin fix/<short-description>`

## 7. Create PR
```bash
gh pr create --title "fix: <description>" --body "Closes #<number>

## Summary
- <what was wrong>
- <what was fixed>

## Test plan
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual verification
"
```

## 8. Update Project Board
- Add issue to project board if not already there
- Set Status to "In Progress"
- Set Type to "Bug"
