/**
 * Wizard Draft Store — persists wizard progress to localStorage.
 * Auto-expires drafts older than 7 days on rehydration.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WizardFormData } from '../presentation/companyDialog/wizardTypes';
import type { AimsStoreInfo } from '@shared/infrastructure/services/companyService';

export interface WizardDraft {
    id: string;
    activeStep: number;
    formData: WizardFormData;
    lastUpdated: number;
    connectionStatus?: 'idle' | 'testing' | 'connected' | 'failed';
    aimsStores?: AimsStoreInfo[];
}

interface WizardDraftState {
    drafts: Record<string, WizardDraft>;
    dismissedIds: string[];
    saveDraft: (id: string, activeStep: number, formData: WizardFormData, extras?: { connectionStatus?: WizardDraft['connectionStatus']; aimsStores?: AimsStoreInfo[] }) => void;
    getDraft: (id: string) => WizardDraft | undefined;
    discardDraft: (id: string) => void;
    dismissDraft: (id: string) => void;
    undismissDraft: (id: string) => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const useWizardDraftStore = create<WizardDraftState>()(
    persist(
        (set, get) => ({
            drafts: {},
            dismissedIds: [],

            saveDraft: (id, activeStep, formData, extras) => {
                set(state => ({
                    drafts: {
                        ...state.drafts,
                        [id]: {
                            id,
                            activeStep,
                            formData,
                            lastUpdated: Date.now(),
                            connectionStatus: extras?.connectionStatus,
                            aimsStores: extras?.aimsStores,
                        },
                    },
                }));
            },

            getDraft: (id) => get().drafts[id],

            discardDraft: (id) => {
                set(state => {
                    const { [id]: _, ...rest } = state.drafts;
                    return {
                        drafts: rest,
                        dismissedIds: state.dismissedIds.filter(d => d !== id),
                    };
                });
            },

            dismissDraft: (id) => {
                set(state => ({
                    dismissedIds: state.dismissedIds.includes(id) ? state.dismissedIds : [...state.dismissedIds, id],
                }));
            },

            undismissDraft: (id) => {
                set(state => ({
                    dismissedIds: state.dismissedIds.filter(d => d !== id),
                }));
            },
        }),
        {
            name: 'electis-wizard-drafts',
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                // Auto-expire drafts older than 7 days
                const now = Date.now();
                const validDrafts: Record<string, WizardDraft> = {};
                for (const [id, draft] of Object.entries(state.drafts)) {
                    if (now - draft.lastUpdated < SEVEN_DAYS_MS) {
                        validDrafts[id] = draft;
                    }
                }
                // Clean up dismissedIds for expired drafts
                const validIds = new Set(Object.keys(validDrafts));
                state.drafts = validDrafts;
                state.dismissedIds = state.dismissedIds.filter(id => validIds.has(id));
            },
        }
    )
);
