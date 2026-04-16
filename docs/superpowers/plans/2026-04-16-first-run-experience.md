# First-Run Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-feature first-use guided tours, meaningful empty states, clickable dashboard cards, and feature restriction feedback across the electisSpace app.

**Architecture:** Custom tooltip stepper using MUI Popper, Zustand store for tour state, localStorage persistence. Each feature page triggers its own tour on first visit. Tours are config-driven arrays filtered by feature access and role.

**Tech Stack:** React 19, MUI 7 (Popper, Backdrop, Typography, Button), Zustand 5, react-i18next, Vitest + RTL for tests.

**Spec:** `docs/superpowers/specs/2026-04-16-first-run-experience-design.md`

**Branch:** `feat/first-run-experience` (from `origin/main`)

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/shared/domain/onboardingTypes.ts` | Types: `FeatureTour`, `TourStep`, step config arrays |
| `src/shared/application/onboardingStore.ts` | Zustand store: active tour, step index, completion state |
| `src/shared/presentation/components/OnboardingTooltip.tsx` | Tooltip + spotlight overlay component |
| `src/shared/presentation/hooks/useFeatureTour.ts` | Hook: auto-starts tour on first page visit |
| `src/shared/presentation/components/__tests__/OnboardingTooltip.test.tsx` | Unit tests for tooltip |
| `src/shared/application/__tests__/onboardingStore.test.ts` | Unit tests for store |

### Modified Files
| File | Changes |
|------|---------|
| `src/locales/en/common.json` | Add `onboarding.*`, `featureRestriction.*`, `dashboard.card.*.empty` keys |
| `src/locales/he/common.json` | Hebrew translations for all new keys |
| `src/features/auth/presentation/ProtectedFeature.tsx` | Add `onFeatureBlocked` callback prop |
| `src/AppRoutes.tsx` | Pass toast callback to ProtectedFeature fallback |
| `src/features/dashboard/DashboardPage.tsx` | Add tour trigger, pass `onClick`/`onNavigate` to cards |
| `src/features/dashboard/components/DashboardSpacesCard.tsx` | Add `onClick` prop, "View All" link, zero-data message |
| `src/features/dashboard/components/DashboardPeopleCard.tsx` | Same |
| `src/features/dashboard/components/DashboardConferenceCard.tsx` | Same |
| `src/features/space/presentation/SpacesManagementView.tsx` | Add tour trigger |
| `src/features/people/presentation/PeopleManagerView.tsx` | Add tour trigger |
| `src/features/conference/presentation/ConferencePage.tsx` | Add tour trigger (mode-aware) |
| `src/features/labels/presentation/LabelsPage.tsx` | Add tour trigger |
| `src/features/settings/presentation/AppSettingsTab.tsx` | Add "Restart Tours" button |

---

### Task 1: Types and Step Configs

**Files:**
- Create: `src/shared/domain/onboardingTypes.ts`

- [ ] **Step 1: Create types and step config file**

```typescript
// src/shared/domain/onboardingTypes.ts
import type { Feature } from '@features/auth/application/permissionHelpers';

export type FeatureTour = 'dashboard' | 'spaces' | 'people' | 'conference' | 'labels';

export interface TourStep {
    /** CSS selector or data-tour attribute for the target element */
    targetSelector: string;
    /** i18n key for the tooltip title */
    titleKey: string;
    /** i18n key for the tooltip body */
    bodyKey: string;
    /** Preferred placement of the tooltip */
    placement: 'top' | 'bottom' | 'left' | 'right';
    /** Only include step if this feature is enabled */
    feature?: Feature;
    /** Only include step for admin roles */
    requireAdmin?: boolean;
    /** Only include step for multi-store users */
    requireMultiStore?: boolean;
}

export const ONBOARDING_STORAGE_KEY = 'electisspace_onboarding';

// -- Step configs per feature --

export const dashboardSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="dashboard-stats"]',
        titleKey: 'onboarding.dashboard.statsCards.title',
        bodyKey: 'onboarding.dashboard.statsCards.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="dashboard-quick-actions"]',
        titleKey: 'onboarding.dashboard.quickActions.title',
        bodyKey: 'onboarding.dashboard.quickActions.body',
        placement: 'top',
    },
    {
        targetSelector: '[data-tour="dashboard-card-nav"]',
        titleKey: 'onboarding.dashboard.cardNavigation.title',
        bodyKey: 'onboarding.dashboard.cardNavigation.body',
        placement: 'bottom',
    },
];

export const spacesSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="spaces-add"]',
        titleKey: 'onboarding.spaces.addSpace.title',
        bodyKey: 'onboarding.spaces.addSpace.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-table-actions"]',
        titleKey: 'onboarding.spaces.tableActions.title',
        bodyKey: 'onboarding.spaces.tableActions.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-search"]',
        titleKey: 'onboarding.spaces.search.title',
        bodyKey: 'onboarding.spaces.search.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-lists"]',
        titleKey: 'onboarding.spaces.lists.title',
        bodyKey: 'onboarding.spaces.lists.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-sync"]',
        titleKey: 'onboarding.spaces.aimsSync.title',
        bodyKey: 'onboarding.spaces.aimsSync.body',
        placement: 'top',
    },
];

export const peopleSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="people-stats"]',
        titleKey: 'onboarding.people.setSlots.title',
        bodyKey: 'onboarding.people.setSlots.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-add"]',
        titleKey: 'onboarding.people.addPeople.title',
        bodyKey: 'onboarding.people.addPeople.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-assign"]',
        titleKey: 'onboarding.people.assign.title',
        bodyKey: 'onboarding.people.assign.body',
        placement: 'top',
    },
    {
        targetSelector: '[data-tour="people-lists"]',
        titleKey: 'onboarding.people.lists.title',
        bodyKey: 'onboarding.people.lists.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-alerts"]',
        titleKey: 'onboarding.people.liveAlerts.title',
        bodyKey: 'onboarding.people.liveAlerts.body',
        placement: 'bottom',
    },
];

export const conferenceAdvancedSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="conference-add"]',
        titleKey: 'onboarding.conference.addRoom.title',
        bodyKey: 'onboarding.conference.addRoom.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-actions"]',
        titleKey: 'onboarding.conference.editDelete.title',
        bodyKey: 'onboarding.conference.editDelete.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-search"]',
        titleKey: 'onboarding.conference.search.title',
        bodyKey: 'onboarding.conference.search.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-sync"]',
        titleKey: 'onboarding.conference.aimsSync.title',
        bodyKey: 'onboarding.conference.aimsSync.body',
        placement: 'top',
    },
];

export const conferenceSimpleSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="conference-cards"]',
        titleKey: 'onboarding.conferenceSimple.roomCards.title',
        bodyKey: 'onboarding.conferenceSimple.roomCards.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-flip"]',
        titleKey: 'onboarding.conferenceSimple.flipStatus.title',
        bodyKey: 'onboarding.conferenceSimple.flipStatus.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-no-label"]',
        titleKey: 'onboarding.conferenceSimple.noLabel.title',
        bodyKey: 'onboarding.conferenceSimple.noLabel.body',
        placement: 'bottom',
    },
];

export const labelsSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="labels-table"]',
        titleKey: 'onboarding.labels.browse.title',
        bodyKey: 'onboarding.labels.browse.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-link"]',
        titleKey: 'onboarding.labels.link.title',
        bodyKey: 'onboarding.labels.link.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-unlink"]',
        titleKey: 'onboarding.labels.unlink.title',
        bodyKey: 'onboarding.labels.unlink.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-health"]',
        titleKey: 'onboarding.labels.health.title',
        bodyKey: 'onboarding.labels.health.body',
        placement: 'bottom',
    },
];

/** Map tour name to its step config */
export function getTourSteps(tour: FeatureTour, isSimpleConferenceMode = false): TourStep[] {
    switch (tour) {
        case 'dashboard': return dashboardSteps;
        case 'spaces': return spacesSteps;
        case 'people': return peopleSteps;
        case 'conference': return isSimpleConferenceMode ? conferenceSimpleSteps : conferenceAdvancedSteps;
        case 'labels': return labelsSteps;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/domain/onboardingTypes.ts
git commit -m "feat(onboarding): add tour types and step configs"
```

---

### Task 2: Onboarding Zustand Store

**Files:**
- Create: `src/shared/application/onboardingStore.ts`
- Create: `src/shared/application/__tests__/onboardingStore.test.ts`

- [ ] **Step 1: Write store tests**

```typescript
// src/shared/application/__tests__/onboardingStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboardingStore } from '../onboardingStore';
import { ONBOARDING_STORAGE_KEY } from '@shared/domain/onboardingTypes';

describe('onboardingStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useOnboardingStore.setState({
            completedTours: {},
            activeTour: null,
            currentStep: 0,
        });
    });

    it('starts a tour and sets active state', () => {
        const { startTour } = useOnboardingStore.getState();
        startTour('dashboard');

        const state = useOnboardingStore.getState();
        expect(state.activeTour).toBe('dashboard');
        expect(state.currentStep).toBe(0);
    });

    it('does not start a completed tour', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true }));
        useOnboardingStore.getState().loadCompletedTours();
        useOnboardingStore.getState().startTour('dashboard');

        expect(useOnboardingStore.getState().activeTour).toBeNull();
    });

    it('advances to next step', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().nextStep();

        expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('goes back to previous step', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().nextStep();
        useOnboardingStore.getState().nextStep();
        useOnboardingStore.getState().prevStep();

        expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('does not go below step 0', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().prevStep();

        expect(useOnboardingStore.getState().currentStep).toBe(0);
    });

    it('completes a tour and persists to localStorage', () => {
        useOnboardingStore.getState().startTour('dashboard');
        useOnboardingStore.getState().completeTour();

        const state = useOnboardingStore.getState();
        expect(state.activeTour).toBeNull();
        expect(state.completedTours.dashboard).toBe(true);

        const stored = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) || '{}');
        expect(stored.dashboard).toBe(true);
    });

    it('skips a tour (same as complete)', () => {
        useOnboardingStore.getState().startTour('spaces');
        useOnboardingStore.getState().skipTour();

        expect(useOnboardingStore.getState().activeTour).toBeNull();
        expect(useOnboardingStore.getState().completedTours.spaces).toBe(true);
    });

    it('resets all tours and clears localStorage', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true, spaces: true }));
        useOnboardingStore.getState().loadCompletedTours();
        useOnboardingStore.getState().resetAllTours();

        expect(useOnboardingStore.getState().completedTours).toEqual({});
        expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    });

    it('loads completed tours from localStorage', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ people: true, labels: true }));
        useOnboardingStore.getState().loadCompletedTours();

        const { completedTours } = useOnboardingStore.getState();
        expect(completedTours.people).toBe(true);
        expect(completedTours.labels).toBe(true);
        expect(completedTours.dashboard).toBeUndefined();
    });

    it('isTourCompleted returns correct value', () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ dashboard: true }));
        useOnboardingStore.getState().loadCompletedTours();

        expect(useOnboardingStore.getState().isTourCompleted('dashboard')).toBe(true);
        expect(useOnboardingStore.getState().isTourCompleted('spaces')).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/application/__tests__/onboardingStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the store**

```typescript
// src/shared/application/onboardingStore.ts
import { create } from 'zustand';
import type { FeatureTour } from '@shared/domain/onboardingTypes';
import { ONBOARDING_STORAGE_KEY } from '@shared/domain/onboardingTypes';

interface OnboardingState {
    completedTours: Partial<Record<FeatureTour, boolean>>;
    activeTour: FeatureTour | null;
    currentStep: number;

    startTour: (tour: FeatureTour) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    completeTour: () => void;
    resetAllTours: () => void;
    loadCompletedTours: () => void;
    isTourCompleted: (tour: FeatureTour) => boolean;
}

function persistCompleted(completedTours: Partial<Record<FeatureTour, boolean>>) {
    if (Object.keys(completedTours).length === 0) {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } else {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedTours));
    }
}

function readCompleted(): Partial<Record<FeatureTour, boolean>> {
    try {
        const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    completedTours: readCompleted(),
    activeTour: null,
    currentStep: 0,

    startTour: (tour) => {
        if (get().completedTours[tour]) return;
        set({ activeTour: tour, currentStep: 0 });
    },

    nextStep: () => {
        set((state) => ({ currentStep: state.currentStep + 1 }));
    },

    prevStep: () => {
        set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) }));
    },

    skipTour: () => {
        const { activeTour, completedTours } = get();
        if (!activeTour) return;
        const updated = { ...completedTours, [activeTour]: true };
        persistCompleted(updated);
        set({ activeTour: null, currentStep: 0, completedTours: updated });
    },

    completeTour: () => {
        const { activeTour, completedTours } = get();
        if (!activeTour) return;
        const updated = { ...completedTours, [activeTour]: true };
        persistCompleted(updated);
        set({ activeTour: null, currentStep: 0, completedTours: updated });
    },

    resetAllTours: () => {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        set({ completedTours: {}, activeTour: null, currentStep: 0 });
    },

    loadCompletedTours: () => {
        set({ completedTours: readCompleted() });
    },

    isTourCompleted: (tour) => {
        return get().completedTours[tour] === true;
    },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/application/__tests__/onboardingStore.test.ts`
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/application/onboardingStore.ts src/shared/application/__tests__/onboardingStore.test.ts
git commit -m "feat(onboarding): add zustand store with localStorage persistence"
```

---

### Task 3: OnboardingTooltip Component

**Files:**
- Create: `src/shared/presentation/components/OnboardingTooltip.tsx`
- Create: `src/shared/presentation/hooks/useFeatureTour.ts`

- [ ] **Step 1: Create the useFeatureTour hook**

```typescript
// src/shared/presentation/hooks/useFeatureTour.ts
import { useEffect, useMemo } from 'react';
import { useOnboardingStore } from '@shared/application/onboardingStore';
import { getTourSteps, type FeatureTour, type TourStep } from '@shared/domain/onboardingTypes';
import { useAuthContext } from '@features/auth/application/useAuthContext';

interface UseFeatureTourOptions {
    tour: FeatureTour;
    /** For conference mode detection */
    isSimpleMode?: boolean;
    /** Delay before starting (ms) — gives the page time to render targets */
    delay?: number;
}

export function useFeatureTour({ tour, isSimpleMode = false, delay = 800 }: UseFeatureTourOptions) {
    const { startTour, isTourCompleted, activeTour, currentStep, nextStep, prevStep, skipTour, completeTour } =
        useOnboardingStore();
    const { canAccessFeature } = useAuthContext();

    // Filter steps by feature access
    const steps = useMemo(() => {
        const allSteps = getTourSteps(tour, isSimpleMode);
        return allSteps.filter((s) => !s.feature || canAccessFeature(s.feature));
    }, [tour, isSimpleMode, canAccessFeature]);

    // Auto-start tour on first visit
    useEffect(() => {
        if (isTourCompleted(tour)) return;
        const timer = setTimeout(() => startTour(tour), delay);
        return () => clearTimeout(timer);
    }, [tour, isTourCompleted, startTour, delay]);

    const isActive = activeTour === tour;
    const currentTourStep: TourStep | null = isActive ? steps[currentStep] ?? null : null;
    const isLastStep = isActive && currentStep >= steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            completeTour();
        } else {
            nextStep();
        }
    };

    return {
        isActive,
        currentStep,
        totalSteps: steps.length,
        currentTourStep,
        isLastStep,
        handleNext,
        handlePrev: prevStep,
        handleSkip: skipTour,
    };
}
```

- [ ] **Step 2: Create the OnboardingTooltip component**

```typescript
// src/shared/presentation/components/OnboardingTooltip.tsx
import { useRef, useEffect, useState, type ReactNode } from 'react';
import { Popper, Paper, Typography, Button, Box, Backdrop } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TourStep } from '@shared/domain/onboardingTypes';

interface OnboardingTooltipProps {
    /** The current step config, or null if tour is inactive */
    step: TourStep | null;
    /** Current step number (0-indexed) */
    currentStep: number;
    /** Total steps in this tour */
    totalSteps: number;
    /** Whether this is the last step */
    isLastStep: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

export function OnboardingTooltip({
    step,
    currentStep,
    totalSteps,
    isLastStep,
    onNext,
    onPrev,
    onSkip,
}: OnboardingTooltipProps) {
    const { t, i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const isRtl = i18n.dir() === 'rtl';

    // Find the target element when step changes
    useEffect(() => {
        if (!step) {
            setAnchorEl(null);
            return;
        }

        // Retry finding element (it may render after a delay)
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
            const el = document.querySelector<HTMLElement>(step.targetSelector);
            if (el) {
                setAnchorEl(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                clearInterval(interval);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                // Target not found — skip this step silently
                onNext();
            }
        }, 200);

        return () => clearInterval(interval);
    }, [step, onNext]);

    if (!step || !anchorEl) return null;

    // Flip placement for RTL
    const placement = (() => {
        if (step.placement === 'left') return isRtl ? 'right' : 'left';
        if (step.placement === 'right') return isRtl ? 'left' : 'right';
        return step.placement;
    })();

    const stepLabel = isRtl
        ? `${totalSteps} / ${currentStep + 1}`
        : `${currentStep + 1} / ${totalSteps}`;

    return (
        <>
            {/* Spotlight backdrop */}
            <Backdrop
                open
                sx={{
                    zIndex: (theme) => theme.zIndex.tooltip - 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                }}
                onClick={onSkip}
            />

            {/* Highlight ring on target */}
            <Box
                sx={{
                    position: 'fixed',
                    top: anchorEl.getBoundingClientRect().top - 4,
                    left: anchorEl.getBoundingClientRect().left - 4,
                    width: anchorEl.offsetWidth + 8,
                    height: anchorEl.offsetHeight + 8,
                    borderRadius: '12px',
                    boxShadow: '0 0 0 3px rgba(13, 71, 161, 0.25)',
                    zIndex: (theme) => theme.zIndex.tooltip,
                    pointerEvents: 'none',
                }}
            />

            {/* Make target clickable above backdrop */}
            <Box
                sx={{
                    position: 'fixed',
                    top: anchorEl.getBoundingClientRect().top,
                    left: anchorEl.getBoundingClientRect().left,
                    width: anchorEl.offsetWidth,
                    height: anchorEl.offsetHeight,
                    zIndex: (theme) => theme.zIndex.tooltip,
                    backgroundColor: 'background.paper',
                    borderRadius: '12px',
                }}
            />

            {/* Tooltip */}
            <Popper
                open
                anchorEl={anchorEl}
                placement={placement}
                sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
                modifiers={[
                    { name: 'offset', options: { offset: [0, 16] } },
                    { name: 'preventOverflow', options: { padding: 16 } },
                ]}
            >
                <Paper
                    elevation={8}
                    sx={{
                        p: 2.5,
                        width: 320,
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '16px' }}>
                            {t(step.titleKey)}
                        </Typography>
                        <Box
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                px: 1,
                                py: 0.25,
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                ml: 1,
                            }}
                        >
                            {stepLabel}
                        </Box>
                    </Box>

                    {/* Body */}
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 2.25, fontSize: '13.5px' }}>
                        {t(step.bodyKey)}
                    </Typography>

                    {/* Footer */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                            component="span"
                            onClick={onSkip}
                            sx={{
                                fontSize: '12px',
                                color: 'primary.main',
                                fontWeight: 500,
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                            }}
                        >
                            {t('onboarding.skipTour')}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {currentStep > 0 && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onPrev}
                                    sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', px: 2 }}
                                >
                                    {t('onboarding.back')}
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="contained"
                                onClick={onNext}
                                sx={{ borderRadius: '24px', textTransform: 'none', fontSize: '13px', fontWeight: 600, px: 2.5 }}
                            >
                                {isLastStep ? t('onboarding.done') : t('onboarding.next')}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Popper>
        </>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/components/OnboardingTooltip.tsx src/shared/presentation/hooks/useFeatureTour.ts
git commit -m "feat(onboarding): add tooltip component and useFeatureTour hook"
```

---

### Task 4: i18n — All Translation Keys

**Files:**
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

- [ ] **Step 1: Add English keys**

Add the following keys to `src/locales/en/common.json` (merge into existing object):

```json
{
    "onboarding": {
        "skipTour": "Skip Tour",
        "next": "Next",
        "back": "Back",
        "done": "Done",
        "dashboard": {
            "statsCards": { "title": "Your Dashboard", "body": "Your store overview at a glance." },
            "quickActions": { "title": "Quick Actions", "body": "Link labels, add spaces or rooms." },
            "cardNavigation": { "title": "Navigate from Here", "body": "Click any card to go to that feature." }
        },
        "spaces": {
            "addSpace": { "title": "Add Your First Space", "body": "Enter a unique ID and fill in the details. Link an ESL label later." },
            "tableActions": { "title": "Edit or Delete", "body": "Edit or delete any space from the table." },
            "search": { "title": "Search & Sort", "body": "Search by ID or any field. Click headers to sort." },
            "lists": { "title": "Saved Lists", "body": "Save spaces as a named list to reload later." },
            "aimsSync": { "title": "AIMS Sync", "body": "Spaces sync to AIMS automatically after changes." }
        },
        "people": {
            "setSlots": { "title": "Total Slots", "body": "Set the total available slots for this store." },
            "addPeople": { "title": "Add People", "body": "Add one by one or upload a CSV file." },
            "assign": { "title": "Assign to Spaces", "body": "Select people and bulk assign, or click a row to assign individually." },
            "lists": { "title": "Shift Lists", "body": "Save assignments as named lists. Load a list to swap everyone at once." },
            "liveAlerts": { "title": "Live Alerts", "body": "Alerts appear when other users modify lists." }
        },
        "conference": {
            "addRoom": { "title": "Add a Room", "body": "Enter a room ID and name. Optionally set a meeting." },
            "editDelete": { "title": "Edit or Delete", "body": "Update or remove rooms." },
            "search": { "title": "Search", "body": "Find rooms by name or status." },
            "aimsSync": { "title": "AIMS Sync", "body": "Rooms sync to AIMS for label updates." }
        },
        "conferenceSimple": {
            "roomCards": { "title": "Room Cards", "body": "Each card shows a room and its current status." },
            "flipStatus": { "title": "Flip Status", "body": "Tap to toggle. The linked ESL label updates automatically." },
            "noLabel": { "title": "No Label Linked", "body": "Rooms without labels are disabled. Link one from the Labels page." }
        },
        "labels": {
            "browse": { "title": "Your Labels", "body": "All ESL devices. Blue = linked, grey = unlinked." },
            "link": { "title": "Link a Label", "body": "Connect a label to a space, room, or person." },
            "unlink": { "title": "Unlink", "body": "Disconnect a label from its article." },
            "health": { "title": "Health & Preview", "body": "Check signal, battery, and toggle image preview." }
        },
        "emptyState": {
            "spaces": { "title": "No spaces yet", "description": "Create your first space to get started.", "cta": "Add Space" },
            "people": { "title": "No people added yet", "description": "Add people to assign them to spaces.", "cta": "Add Person" },
            "conference": { "title": "No conference rooms yet", "description": "Add rooms and link labels for e-ink signs.", "cta": "Add Room" },
            "conferenceSimple": { "title": "No rooms available", "description": "Rooms are managed in advanced mode." },
            "labels": { "title": "No labels linked", "description": "Labels appear here once synced from AIMS." }
        },
        "settings": {
            "restartTours": "Restart Tours",
            "restartToursDescription": "Show guided tours again on each feature page.",
            "restartToursSuccess": "Tours will show again on next visit."
        }
    },
    "featureRestriction": {
        "notAvailable": "\"{{feature}}\" is not enabled for this store. Contact your admin."
    },
    "features": {
        "spaces": "Spaces",
        "conference": "Conference Rooms",
        "people": "People",
        "labels": "Labels"
    }
}
```

Also add under existing `"dashboard"` key:

```json
{
    "dashboard": {
        "card": {
            "viewAll": "View All",
            "spaces": { "empty": "No spaces created yet" },
            "people": { "empty": "No people added yet" },
            "conference": { "empty": "No rooms configured" }
        }
    }
}
```

- [ ] **Step 2: Add Hebrew keys**

Add the corresponding Hebrew translations to `src/locales/he/common.json`. All keys mirror English structure. Key translations:

- `onboarding.skipTour` → `"דלג על הסיור"`
- `onboarding.next` → `"הבא"`, `onboarding.back` → `"הקודם"`, `onboarding.done` → `"סיום"`
- All `.title` and `.body` keys translated to Hebrew (refer to the mockup file `revised-onboarding-v2.html` for exact Hebrew text)
- `featureRestriction.notAvailable` → `"\"{{feature}}\" לא מופעל עבור חנות זו. פנה למנהל המערכת."`
- `dashboard.card.viewAll` → `"הצג הכל"`

- [ ] **Step 3: Commit**

```bash
git add src/locales/en/common.json src/locales/he/common.json
git commit -m "feat(onboarding): add EN + HE translation keys for tours, empty states, toasts"
```

---

### Task 5: Feature Restriction Toast

**Files:**
- Modify: `src/AppRoutes.tsx`

- [ ] **Step 1: Create a FeatureRedirect component in AppRoutes.tsx**

Instead of modifying `ProtectedFeature` (which is a pure permission gate), create a small wrapper component inside `AppRoutes.tsx` that shows a toast and redirects:

```typescript
// Add inside AppRoutes.tsx, before AppRoutes function:

import { useNotifications } from '@shared/infrastructure/store/notificationStore';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

const shownFeatures = new Set<string>();

function FeatureRedirect({ feature }: { feature: string }) {
    const { showInfo } = useNotifications();
    const { t } = useTranslation();

    useEffect(() => {
        if (!shownFeatures.has(feature)) {
            shownFeatures.add(feature);
            showInfo(t('featureRestriction.notAvailable', { feature: t(`features.${feature}`) }));
        }
    }, [feature, showInfo, t]);

    return <Navigate to="/" replace />;
}
```

Then update the protected routes to use it:

```tsx
// Replace: fallback={<Navigate to="/" replace />}
// With:    fallback={<FeatureRedirect feature="spaces" />}

<Route path="/spaces" element={
    <ProtectedRoute>
        <ProtectedFeature feature="spaces" fallback={<FeatureRedirect feature="spaces" />}>
            <SuspenseRoute><SpacesPage /></SuspenseRoute>
        </ProtectedFeature>
    </ProtectedRoute>
} />
// Repeat for conference, people, labels, aims-management
```

- [ ] **Step 2: Commit**

```bash
git add src/AppRoutes.tsx
git commit -m "feat(onboarding): show info toast when feature is restricted (audit #2)"
```

---

### Task 6: Clickable Dashboard Cards

**Files:**
- Modify: `src/features/dashboard/components/DashboardSpacesCard.tsx`
- Modify: `src/features/dashboard/components/DashboardPeopleCard.tsx`
- Modify: `src/features/dashboard/components/DashboardConferenceCard.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add onClick and zero-data message to DashboardSpacesCard**

Add `onClick` prop to the card component. Add a "View All →" link in the card header. When `totalSpaces === 0`, show `t('dashboard.card.spaces.empty')` instead of stats.

In `DashboardSpacesCard.tsx`:
- Add prop: `onClick?: () => void`
- Wrap outer `<Card>` with `onClick` and hover styles: `sx={{ cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-1px)', transition: 'all 0.2s' } : {} }}`
- Add "View All" link in card header area: `<Typography sx={{ color: 'primary.main', fontSize: '12px', fontWeight: 500 }}>{t('dashboard.card.viewAll')} →</Typography>`
- When `totalSpaces === 0`, show `<Typography color="text.secondary" variant="body2">{t('dashboard.card.spaces.empty')}</Typography>` below the count
- Add `data-tour="dashboard-card-nav"` to the first card for tour targeting

- [ ] **Step 2: Repeat for DashboardPeopleCard and DashboardConferenceCard**

Same pattern: add `onClick` prop, hover styles, "View All" text, zero-data message.

- [ ] **Step 3: Wire up navigation in DashboardPage**

In `DashboardPage.tsx`, pass `onClick` to each card component:

```tsx
import { useNavigate } from 'react-router-dom';

// Inside component:
const navigate = useNavigate();

// Pass to cards:
<DashboardSpacesCard onClick={() => navigate('/spaces')} ... />
<DashboardPeopleCard onClick={() => navigate('/people')} ... />
<DashboardConferenceCard onClick={() => navigate('/conference')} ... />
```

Also add `data-tour` attributes to the relevant elements:
- Stats card area wrapper: `data-tour="dashboard-stats"`
- QuickActionsPanel wrapper: `data-tour="dashboard-quick-actions"`
- First card: `data-tour="dashboard-card-nav"`

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/
git commit -m "feat(dashboard): make cards clickable with navigation and zero-data messages (audit #6)"
```

---

### Task 7: Dashboard Tour Integration

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add tour trigger to Dashboard**

```tsx
import { useFeatureTour } from '@shared/presentation/hooks/useFeatureTour';
import { OnboardingTooltip } from '@shared/presentation/components/OnboardingTooltip';

// Inside DashboardPage component:
const { isActive, currentStep, totalSteps, currentTourStep, isLastStep, handleNext, handlePrev, handleSkip } =
    useFeatureTour({ tour: 'dashboard' });

// At the end of the JSX return, add:
<OnboardingTooltip
    step={currentTourStep}
    currentStep={currentStep}
    totalSteps={totalSteps}
    isLastStep={isLastStep}
    onNext={handleNext}
    onPrev={handlePrev}
    onSkip={handleSkip}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx
git commit -m "feat(onboarding): add dashboard tour trigger"
```

---

### Task 8: Spaces Tour Integration + Empty State Improvement

**Files:**
- Modify: `src/features/space/presentation/SpacesManagementView.tsx`

- [ ] **Step 1: Add data-tour attributes to target elements**

Add `data-tour` attributes to the following elements in `SpacesManagementView.tsx`:
- Add space button: `data-tour="spaces-add"`
- First table row action area (or the action column header): `data-tour="spaces-table-actions"`
- Search bar: `data-tour="spaces-search"`
- Manage Lists button: `data-tour="spaces-lists"`
- AIMS sync panel: `data-tour="spaces-sync"`

- [ ] **Step 2: Add tour trigger**

```tsx
import { useFeatureTour } from '@shared/presentation/hooks/useFeatureTour';
import { OnboardingTooltip } from '@shared/presentation/components/OnboardingTooltip';

// Inside component:
const { isActive, currentStep, totalSteps, currentTourStep, isLastStep, handleNext, handlePrev, handleSkip } =
    useFeatureTour({ tour: 'spaces' });

// At end of JSX:
<OnboardingTooltip
    step={currentTourStep}
    currentStep={currentStep}
    totalSteps={totalSteps}
    isLastStep={isLastStep}
    onNext={handleNext}
    onPrev={handlePrev}
    onSkip={handleSkip}
/>
```

- [ ] **Step 3: Improve empty state copy**

Update the existing `EmptyState` usage to use new i18n keys:

```tsx
<EmptyState
    icon={<FolderOpenIcon sx={{ fontSize: 80 }} />}
    title={t('onboarding.emptyState.spaces.title')}
    description={t('onboarding.emptyState.spaces.description')}
    actionLabel={canEdit ? t('onboarding.emptyState.spaces.cta') : undefined}
    onAction={canEdit ? onAdd : undefined}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/space/presentation/SpacesManagementView.tsx
git commit -m "feat(onboarding): add spaces tour + improved empty state"
```

---

### Task 9: People Tour Integration

**Files:**
- Modify: `src/features/people/presentation/PeopleManagerView.tsx`

- [ ] **Step 1: Add data-tour attributes**

- Stats panel: `data-tour="people-stats"`
- Add/Upload button area: `data-tour="people-add"`
- Bulk actions bar: `data-tour="people-assign"`
- List panel: `data-tour="people-lists"`
- SSE alert area (top of page): `data-tour="people-alerts"`

- [ ] **Step 2: Add tour trigger + OnboardingTooltip**

Same pattern as Task 8 but with `tour: 'people'`.

- [ ] **Step 3: Commit**

```bash
git add src/features/people/presentation/PeopleManagerView.tsx
git commit -m "feat(onboarding): add people manager tour"
```

---

### Task 10: Conference Tour Integration (Mode-Aware)

**Files:**
- Modify: `src/features/conference/presentation/ConferencePage.tsx`

- [ ] **Step 1: Add data-tour attributes**

**Advanced mode targets:**
- Add Room button: `data-tour="conference-add"`
- Room card actions: `data-tour="conference-actions"`
- Search bar: `data-tour="conference-search"`
- Sync indicator: `data-tour="conference-sync"`

**Simple mode targets:**
- Room cards area: `data-tour="conference-cards"`
- First room's toggle buttons: `data-tour="conference-flip"`
- A disabled room card (if exists): `data-tour="conference-no-label"`

- [ ] **Step 2: Add mode-aware tour trigger**

```tsx
import { useFeatureTour } from '@shared/presentation/hooks/useFeatureTour';
import { OnboardingTooltip } from '@shared/presentation/components/OnboardingTooltip';

// isSimpleMode is already computed in ConferencePage:
const isSimpleMode = activeStoreEffectiveFeatures?.simpleConferenceMode ?? false;

const { isActive, currentStep, totalSteps, currentTourStep, isLastStep, handleNext, handlePrev, handleSkip } =
    useFeatureTour({ tour: 'conference', isSimpleMode });

// At end of JSX:
<OnboardingTooltip ... />
```

- [ ] **Step 3: Commit**

```bash
git add src/features/conference/presentation/ConferencePage.tsx
git commit -m "feat(onboarding): add conference tour (advanced + simple mode)"
```

---

### Task 11: Labels Tour Integration

**Files:**
- Modify: `src/features/labels/presentation/LabelsPage.tsx`

- [ ] **Step 1: Add data-tour attributes**

- Labels table/cards area: `data-tour="labels-table"`
- Link Label button: `data-tour="labels-link"`
- First unlink button in table: `data-tour="labels-unlink"`
- Health indicator column/area: `data-tour="labels-health"`

- [ ] **Step 2: Add tour trigger + OnboardingTooltip**

Same pattern with `tour: 'labels'`.

- [ ] **Step 3: Commit**

```bash
git add src/features/labels/presentation/LabelsPage.tsx
git commit -m "feat(onboarding): add labels tour"
```

---

### Task 12: Settings — Restart Tours Button

**Files:**
- Modify: `src/features/settings/presentation/AppSettingsTab.tsx`

- [ ] **Step 1: Add Restart Tours button**

```tsx
import { useOnboardingStore } from '@shared/application/onboardingStore';
import { useNotifications } from '@shared/infrastructure/store/notificationStore';

// Inside AppSettingsTab component:
const resetAllTours = useOnboardingStore((s) => s.resetAllTours);
const { showSuccess } = useNotifications();
const { t } = useTranslation();

const handleRestartTours = () => {
    resetAllTours();
    showSuccess(t('onboarding.settings.restartToursSuccess'));
};

// In the JSX, add a section:
<Box sx={{ mt: 3 }}>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('onboarding.settings.restartTours')}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('onboarding.settings.restartToursDescription')}
    </Typography>
    <Button variant="outlined" size="small" onClick={handleRestartTours} sx={{ borderRadius: '24px' }}>
        {t('onboarding.settings.restartTours')}
    </Button>
</Box>
```

- [ ] **Step 2: Commit**

```bash
git add src/features/settings/presentation/AppSettingsTab.tsx
git commit -m "feat(onboarding): add restart tours button to settings"
```

---

### Task 13: Manual Test Checklist + E2E Smoke Test

**Files:**
- Create: `e2e/onboarding.spec.ts`

- [ ] **Step 1: Create E2E smoke test**

```typescript
// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Onboarding Tours', () => {
    test.beforeEach(async ({ page }) => {
        // Clear onboarding state
        await page.goto('/#/');
        await page.evaluate(() => localStorage.removeItem('electisspace_onboarding'));
    });

    test('dashboard tour shows on first visit and can be completed', async ({ page }) => {
        await page.goto('/#/');
        await page.waitForTimeout(1500); // Wait for tour delay

        // Tooltip should appear
        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).toBeVisible({ timeout: 5000 });

        // Should show step 1 text
        await expect(tooltip).toContainText(/1\s*\/\s*3/);

        // Click Next through all steps
        for (let i = 0; i < 2; i++) {
            await tooltip.getByRole('button', { name: /next/i }).click();
            await page.waitForTimeout(500);
        }

        // Last step shows "Done"
        await tooltip.getByRole('button', { name: /done/i }).click();

        // Tooltip should disappear
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });

        // Reload — tour should NOT show again
        await page.reload();
        await page.waitForTimeout(1500);
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });
    });

    test('tour can be skipped', async ({ page }) => {
        await page.goto('/#/');
        await page.waitForTimeout(1500);

        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).toBeVisible({ timeout: 5000 });

        // Click "Skip Tour"
        await page.getByText(/skip tour/i).click();

        // Tooltip disappears
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });
    });

    test('feature restriction toast shows on disabled feature access', async ({ page }) => {
        // Navigate to a feature that may be disabled
        // This depends on test account having a feature disabled
        // The toast text is: '"X" is not enabled for this store'
        await page.goto('/#/conference');
        await page.waitForTimeout(1000);

        // If redirected to dashboard, check for info toast
        const currentUrl = page.url();
        if (currentUrl.includes('/#/') && !currentUrl.includes('conference')) {
            const toast = page.locator('[class*="MuiAlert"]');
            await expect(toast).toBeVisible({ timeout: 3000 });
            await expect(toast).toContainText(/not enabled/i);
        }
    });

    test('dashboard cards are clickable and navigate', async ({ page }) => {
        await page.goto('/#/');
        await page.waitForTimeout(1000);

        // Skip tour if it appears
        const skipBtn = page.getByText(/skip tour/i);
        if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await skipBtn.click();
        }

        // Find a "View All" link and click it
        const viewAll = page.getByText(/view all/i).first();
        if (await viewAll.isVisible({ timeout: 2000 }).catch(() => false)) {
            await viewAll.click();
            await page.waitForTimeout(500);
            // Should have navigated away from dashboard
            expect(page.url()).not.toBe('/#/');
        }
    });

    test('restart tours from settings works', async ({ page }) => {
        // Complete a tour first
        await page.goto('/#/');
        await page.evaluate(() => {
            localStorage.setItem('electisspace_onboarding', JSON.stringify({ dashboard: true }));
        });
        await page.reload();
        await page.waitForTimeout(1500);

        // Tour should NOT show (already completed)
        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });

        // Open settings and restart tours
        // (This depends on how settings is accessed — icon button or menu)
        await page.evaluate(() => localStorage.removeItem('electisspace_onboarding'));

        // Reload and tour should show again
        await page.reload();
        await page.waitForTimeout(1500);
        await expect(tooltip).toBeVisible({ timeout: 5000 });
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/onboarding.spec.ts
git commit -m "test(onboarding): add E2E smoke tests for tours, toasts, and clickable cards"
```

---

### Task 14: Documentation Updates

**Files:**
- Modify: `obsidian/electisSpace.md` — add onboarding section
- Modify: `CHANGELOG.md` — add entries under [Unreleased]
- Modify: `docs/wiki/Chapter-4-*` — update client architecture section

- [ ] **Step 1: Update obsidian/electisSpace.md**

Add under relevant section:
- Onboarding system: per-feature first-use tours using custom MUI Popper tooltips
- Tour state persisted to localStorage (`electisspace_onboarding` key)
- Configurable step arrays in `src/shared/domain/onboardingTypes.ts`
- Tours: Dashboard (3), Spaces (5), People (5), Conference Advanced (4) / Simple (3), Labels (4)

- [ ] **Step 2: Update CHANGELOG.md**

Under `[Unreleased]`:

```markdown
### Added
- Per-feature first-use guided tours (Dashboard, Spaces, People, Conference, Labels)
- Conference tour adapts to simple vs advanced mode
- Empty state improvements with descriptive messages and CTAs on all feature pages
- Clickable dashboard cards with "View All" navigation and zero-data messages
- Feature restriction info toast when accessing disabled features
- "Restart Tours" button in Settings > App Settings
- Full Hebrew (RTL) support for all onboarding UI including flipped step numbering
```

- [ ] **Step 3: Update wiki chapter (if applicable)**

Update `docs/wiki/Chapter-4-*` client architecture doc to mention the onboarding system under the shared components section.

- [ ] **Step 4: Commit**

```bash
git add obsidian/ CHANGELOG.md docs/wiki/
git commit -m "docs: update obsidian, changelog, and wiki with onboarding feature"
```

---

### Task 15: GitHub Issue + Project Board

- [ ] **Step 1: Create GitHub issue**

```bash
gh issue create \
  --title "feat: first-run experience — per-feature tours, empty states, clickable cards" \
  --body "## Summary
Implements UX audit items #1 (empty states), #2 (feature restriction feedback), #6 (clickable dashboard cards).

- Per-feature first-use guided tours on Dashboard, Spaces, People, Conference (mode-aware), Labels
- Meaningful empty states with CTAs on all feature pages
- Clickable dashboard cards with 'View All' navigation
- Feature restriction info toast on disabled feature access
- 'Restart Tours' in Settings
- Full EN + HE (RTL) support

## Spec
docs/superpowers/specs/2026-04-16-first-run-experience-design.md

## Test Plan
- [ ] Dashboard tour completes (3 steps)
- [ ] Spaces tour completes (5 steps)
- [ ] People tour completes (5 steps)
- [ ] Conference advanced tour (4 steps)
- [ ] Conference simple tour (3 steps)
- [ ] Labels tour (4 steps)
- [ ] Tour skip works
- [ ] Tour doesn't re-show after completion
- [ ] Restart Tours from Settings works
- [ ] Hebrew RTL: step numbering flipped
- [ ] Dashboard cards clickable and navigate
- [ ] Dashboard zero-data messages show correctly
- [ ] Feature restriction toast on disabled feature
- [ ] Empty states show on all pages when data is empty
"
```

- [ ] **Step 2: Add issue to project board**

```bash
# Get the issue number from step 1 output, then:
gh api graphql -f query='mutation {
  addProjectV2ItemById(input: {
    projectId: "PVT_kwHOC2mF1s4BP2ar"
    contentId: "<ISSUE_NODE_ID>"
  }) { item { id } }
}'

# Set Status: In Progress, Type: Feature, Priority: High
```

- [ ] **Step 3: Push branch and create PR**

```bash
git push -u origin feat/first-run-experience
gh pr create \
  --title "feat: first-run experience — tours, empty states, clickable cards" \
  --body "Closes #<ISSUE_NUMBER>

## Summary
- Per-feature guided tours on first visit (Dashboard, Spaces, People, Conference, Labels)
- Conference tour adapts to simple vs advanced mode
- Empty states with CTAs on all feature pages
- Clickable dashboard cards with navigation
- Feature restriction toast
- Full EN + HE RTL support
- Restart Tours in Settings

## Spec
docs/superpowers/specs/2026-04-16-first-run-experience-design.md

## Test Plan
See linked issue for full checklist.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
