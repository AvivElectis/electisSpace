/**
 * Generate initial field mapping from article format data fields.
 * Shared between CreateCompanyWizard and EditCompanyTabs.
 */
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig, SolumFieldMapping } from './types';

export function generateInitialMapping(articleFormat: ArticleFormat): SolumMappingConfig {
    const fields: Record<string, SolumFieldMapping> = {};
    (articleFormat.articleData || []).forEach((field, index) => {
        fields[field] = {
            friendlyNameEn: field,
            friendlyNameHe: field,
            visible: true,
            order: index,
        };
    });
    return {
        uniqueIdField: articleFormat.mappingInfo?.articleId || articleFormat.articleData?.[0] || '',
        fields,
        conferenceMapping: {
            meetingName: '',
            meetingTime: '',
            participants: '',
        },
        mappingInfo: articleFormat.mappingInfo ? { ...articleFormat.mappingInfo } : undefined,
    };
}
