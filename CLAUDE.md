# CLAUDE.md — electisSpace Project Instructions

## GitHub Project & Wiki Workflow (MANDATORY)

Every task and deployed change in this repo MUST be tracked in the **GitHub Project** and documented in the **GitHub Wiki**. Follow this workflow strictly for every task — no exceptions.

### GitHub Project Reference

- **Project**: "electisSpace Development" (number `2`, owner `AvivElectis`)
- **Project ID**: `PVT_kwHOC2mF1s4BP2ar`
- **Status field ID**: `PVTSSF_lAHOC2mF1s4BP2arzg-I748`
  - `Todo` → `f75ad846`
  - `In Progress` → `47fc9ee4`
  - `Done` → `98236657`
- **Priority field ID**: `PVTSSF_lAHOC2mF1s4BP2arzg-I76c`
  - `High` → `c8b9a08e` | `Medium` → `38f731c0` | `Low` → `6699439f`
- **Type field ID**: `PVTSSF_lAHOC2mF1s4BP2arzg-I77w`
  - `Bug` → `6f285e6c` | `Feature` → `ae61764a` | `Enhancement` → `76068ce7` | `Chore` → `820911a8` | `Docs` → `d9710f6d`

### Step 1 — Create a GitHub Issue (before any work)

When given ANY task, FIRST create a GitHub issue and add it to the project board as **Todo**:

```bash
# Create the issue with appropriate label
gh issue create --title "<concise title>" --body "<description>" --label "<bug|enhancement|documentation>"

# Add to project board
gh project item-add 2 --owner AvivElectis --url <issue-url>

# Set Status=Todo, Priority, and Type on the project item using item-edit
```

### Step 2 — Update Status to In Progress

When starting work on a task, update the project item:

```bash
gh project item-edit --project-id PVT_kwHOC2mF1s4BP2ar --id <item-id> \
  --field-id PVTSSF_lAHOC2mF1s4BP2arzg-I748 --single-select-option-id 47fc9ee4
```

### Step 3 — Create PR Linked to Issue

When creating a PR, always reference the issue number:

```bash
gh pr create --title "<title>" --body "Closes #<issue-number>
## Summary
...
## Test plan
..."
```

### Step 4 — After PR Merge / Deploy

Once a PR is merged and deployed:

1. **Update project status to Done**:
```bash
gh project item-edit --project-id PVT_kwHOC2mF1s4BP2ar --id <item-id> \
  --field-id PVTSSF_lAHOC2mF1s4BP2arzg-I748 --single-select-option-id 98236657
```

2. **Update the GitHub Wiki** — If the change introduces a new feature, architecture change, or important operational detail, update the relevant page(s) in `docs/wiki/`. The wiki auto-publishes on push to `main` via `.github/workflows/publish-wiki.yml`.

3. **Update CHANGELOG.md** — Add an entry under the appropriate version section.

### Workflow Summary

| Phase            | Action                                                        |
|------------------|---------------------------------------------------------------|
| Task received    | Create GitHub issue → Add to project as **Todo**              |
| Work starts      | Update project status to **In Progress**                      |
| PR created       | Link PR to issue (`Closes #N`)                                |
| PR merged        | Update status to **Done**, update wiki & changelog if needed  |

### Important Notes

- Do NOT skip issue creation. Every task gets a tracked issue.
- The wiki source lives in `docs/wiki/`. Edit files there — the publish workflow handles the rest.
- When updating the wiki, only modify pages relevant to the change.
- Always set the **Priority** and **Type** fields on new project items.
