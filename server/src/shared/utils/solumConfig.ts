import { prisma } from '../../config/index.js';
import { SolumConfig } from '../infrastructure/services/solumService.js';

// Helper to get SoluM config from Store settings
export async function getSolumConfig(storeId: string): Promise<SolumConfig | null> {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
            company: {
                select: {
                    name: true,
                    aimsBaseUrl: true,
                    aimsCluster: true,
                    aimsUsername: true,
                    aimsPasswordEnc: true
                }
            }
        }
    });

    if (!store) return null;

    // Build SoluM config from company AIMS settings and store code
    const company = store.company;
    if (!company.aimsBaseUrl || !company.aimsUsername) {
        return null;
    }

    // Construct the SoluM config
    const config: SolumConfig = {
        baseUrl: company.aimsBaseUrl,
        companyName: company.name,
        storeCode: store.code,
        username: company.aimsUsername,
        password: company.aimsPasswordEnc || '', // Will be decrypted in service
        cluster: company.aimsCluster || undefined,
    };

    return config;
}
