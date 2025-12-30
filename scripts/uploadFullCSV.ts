/**
 * Script to upload full CSV to AIMS
 * Run with: npx tsx scripts/uploadFullCSV.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// AIMS Configuration
const AIMS_CONFIG = {
    companyName: 'TST',
    username: 'aviv@electis.co.il',
    password: 'REDACTED_PASSWORD',
    storeNumber: '01',
    cluster: 'common' as const,
    baseUrl: 'https://eu.common.solumesl.com',
    syncInterval: 300,
    tokens: undefined as any,
};

async function main() {
    console.log('📂 Loading CSV file...');
    
    // Read the CSV file
    const csvPath = join(__dirname, '../docs/archive/names_formatted.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const header = lines[0].split(';');
    console.log('📋 CSV Headers:', header);
    
    const rows = lines.slice(1).filter(line => line.trim().length > 0);
    console.log(`👥 Found ${rows.length} people in CSV`);
    
    // Import the login and push functions
    const { login, pushArticles } = await import('../src/shared/infrastructure/services/solumService');
    
    // Login to AIMS
    console.log('🔐 Logging into AIMS...');
    const tokens = await login(AIMS_CONFIG);
    AIMS_CONFIG.tokens = tokens;
    console.log('✅ Login successful!');
    
    // Build articles from CSV rows
    const articles: any[] = [];
    let poolCounter = 1;
    
    for (const row of rows) {
        const values = row.split(';');
        const name = values[0]?.trim() || '';
        const englishName = values[1]?.trim() || '';
        const rank = values[2]?.trim() || '';
        const title = values[3]?.trim() || '';
        const meetingName = values[4]?.trim() || '';
        const meetingTime = values[5]?.trim() || '';
        const participants = values[6]?.trim() || '';
        
        // Skip rows with no name AND no title (completely empty)
        if (!name && !title) {
            console.log(`  ⏭️ Skipping empty row ${poolCounter}`);
            poolCounter++;
            continue;
        }
        
        const poolId = `POOL-${String(poolCounter).padStart(4, '0')}`;
        
        articles.push({
            articleId: poolId,
            ITEM_NAME: name,
            ENGLISH_NAME: englishName,
            RANK: rank,
            TITLE: title,
            MEETING_NAME: meetingName,
            MEETING_TIME: meetingTime,
            PARTICIPANTS: participants,
            __PERSON_UUID__: crypto.randomUUID(),
            __VIRTUAL_SPACE__: poolId,
        });
        
        poolCounter++;
    }
    
    console.log(`📦 Built ${articles.length} articles to upload`);
    
    // Upload in batches of 10
    const batchSize = 10;
    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)} (${batch.length} articles)...`);
        
        await pushArticles(
            AIMS_CONFIG,
            AIMS_CONFIG.storeNumber,
            tokens.accessToken,
            batch
        );
    }
    
    console.log('');
    console.log('✅ Upload complete!');
    console.log(`📊 Total articles uploaded: ${articles.length}`);
    console.log('');
    console.log('Sample articles:');
    articles.slice(0, 5).forEach(a => {
        console.log(`  ${a.articleId}: ${a.ITEM_NAME || '(no name)'} - ${a.TITLE}`);
    });
}

main().catch(console.error);
