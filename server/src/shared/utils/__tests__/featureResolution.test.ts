/**
 * Feature Resolution - Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
    resolveEffectiveFeatures, resolveEffectiveSpaceType,
    extractCompanyFeatures, extractSpaceType, extractStoreFeatures, extractStoreSpaceType,
    ALL_FEATURES_ENABLED, DEFAULT_SPACE_TYPE,
    type CompanyFeatures,
} from '../featureResolution.js';

describe('resolveEffectiveFeatures', () => {
    const companyF: CompanyFeatures = { spacesEnabled: true, peopleEnabled: true, conferenceEnabled: false, simpleConferenceMode: false, labelsEnabled: true, aimsManagementEnabled: true };
    const storeF: CompanyFeatures = { spacesEnabled: false, peopleEnabled: true, conferenceEnabled: true, simpleConferenceMode: true, labelsEnabled: false, aimsManagementEnabled: false };

    it('should return store features when provided', () => { expect(resolveEffectiveFeatures(companyF, storeF)).toEqual(storeF); });
    it('should return company features when no store override', () => { expect(resolveEffectiveFeatures(companyF, null)).toEqual(companyF); });
    it('should return ALL_FEATURES_ENABLED when both null', () => { expect(resolveEffectiveFeatures(null, null)).toEqual(ALL_FEATURES_ENABLED); });
});

describe('resolveEffectiveSpaceType', () => {
    it('store override wins', () => { expect(resolveEffectiveSpaceType('office', 'room')).toBe('room'); });
    it('company fallback', () => { expect(resolveEffectiveSpaceType('chair', null)).toBe('chair'); });
    it('default when both null', () => { expect(resolveEffectiveSpaceType(null, null)).toBe(DEFAULT_SPACE_TYPE); });
});

describe('extractCompanyFeatures', () => {
    it('should return ALL_FEATURES_ENABLED for null', () => { expect(extractCompanyFeatures(null)).toEqual(ALL_FEATURES_ENABLED); });
    it('should respect peopleManagerEnabled legacy flag', () => {
        const r = extractCompanyFeatures({ peopleManagerEnabled: true });
        expect(r.spacesEnabled).toBe(false);
        expect(r.peopleEnabled).toBe(true);
    });
    it('should default to spaces mode when no features and no legacy flag', () => {
        const r = extractCompanyFeatures({});
        expect(r.spacesEnabled).toBe(true);
        expect(r.peopleEnabled).toBe(false);
    });
    it('should extract from settings', () => {
        const r = extractCompanyFeatures({ companyFeatures: { spacesEnabled: false } });
        expect(r.spacesEnabled).toBe(false);
    });
});

describe('extractSpaceType', () => {
    it('should return default for null', () => { expect(extractSpaceType(null)).toBe(DEFAULT_SPACE_TYPE); });
    it('should extract from settings', () => { expect(extractSpaceType({ spaceType: 'room' })).toBe('room'); });
});

describe('extractStoreFeatures', () => {
    it('should return null for null', () => { expect(extractStoreFeatures(null)).toBeNull(); });
    it('should return null for empty settings', () => { expect(extractStoreFeatures({})).toBeNull(); });
    it('should extract store features', () => {
        const r = extractStoreFeatures({ storeFeatures: { spacesEnabled: true, peopleEnabled: false, conferenceEnabled: true, simpleConferenceMode: true, labelsEnabled: false } });
        expect(r).not.toBeNull();
        expect(r!.spacesEnabled).toBe(true);
    });
});

describe('extractStoreSpaceType', () => {
    it('should return null for null', () => { expect(extractStoreSpaceType(null)).toBeNull(); });
    it('should extract', () => { expect(extractStoreSpaceType({ storeSpaceType: 'chair' })).toBe('chair'); });
});
