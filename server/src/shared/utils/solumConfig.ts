import { prisma } from '../../config/index.js';
import { SolumConfig } from '../infrastructure/services/solumService.js';

// Helper to get SoluM config
export async function getSolumConfig(organizationId: string): Promise<SolumConfig | null> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { solumConfig: true }
    });

    if (!org?.solumConfig) return null;

    // In a real implementation with encryption, decrypt here.
    const config = org.solumConfig as unknown as SolumConfig;

    return config;
}
