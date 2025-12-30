import { describe, it, expect} from 'vitest';
import Papa from 'papaparse';

describe('CSV Service', () => {
    describe('CSV Parsing', () => {
        it('should parse CSV with comma delimiter', () => {
            const csvData = 'ID,Name,Rank\n101,Room 101,Captain\n102,Room 102,Lieutenant';

            const result = Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
            });

            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toEqual({
                ID: '101',
                Name: 'Room 101',
                Rank: 'Captain',
            });
        });

        it('should parse CSV with semicolon delimiter', () => {
            const csvData = 'ID;Name;Rank\n101;Room 101;Captain\n102;Room 102;Lieutenant';

            const result = Papa.parse(csvData, {
                header: true,
                delimiter: ';',
                skipEmptyLines: true,
            });

            expect(result.data).toHaveLength(2);
        });

        it('should handle CSV with headers', () => {
            const csvData = 'ID,Name\n101,Test';

            const result = Papa.parse(csvData, {
                header: true,
            });

            expect(result.meta.fields).toEqual(['ID', 'Name']);
        });

        it('should handle empty CSV', () => {
            const csvData = '';

            const result = Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
            });

            expect(result.data).toHaveLength(0);
        });

        it('should handle CSV with special characters', () => {
            const csvData = 'ID,Name\n101,"Room, 101"\n102,"Room ""Special"""';

            const result = Papa.parse(csvData, {
                header: true,
            });

            expect((result.data[0] as any).Name).toBe('Room, 101');
            expect((result.data[1] as any).Name).toBe('Room "Special"');
        });
    });

    describe('CSV Generation', () => {
        it('should generate CSV from data', () => {
            const data = [
                { ID: '101', Name: 'Room 101', Rank: 'Captain' },
                { ID: '102', Name: 'Room 102', Rank: 'Lieutenant' },
            ];

            const csv = Papa.unparse(data);

            expect(csv).toContain('ID,Name,Rank');
            expect(csv).toContain('101,Room 101,Captain');
            expect(csv).toContain('102,Room 102,Lieutenant');
        });

        it('should handle empty data', () => {
            const data: any[] = [];
            const csv = Papa.unparse(data);

            expect(csv).toBe('');
        });

        it('should escape special characters', () => {
            const data = [
                { ID: '101', Name: 'Room, 101' },
            ];

            const csv = Papa.unparse(data);

            expect(csv).toContain('"Room, 101"');
        });
    });

    describe('Delimiter Detection', () => {
        it('should detect comma delimiter', () => {
            const csvData = 'ID,Name,Rank\n101,Room 101,Captain';

            const result = Papa.parse(csvData, {
                header: true,
            });

            expect(result.meta.delimiter).toBe(',');
        });

        it('should detect semicolon delimiter', () => {
            const csvData = 'ID;Name;Rank\n101;Room 101;Captain';

            const result = Papa.parse(csvData, {
                header: true,
            });

            expect(result.meta.delimiter).toBe(';');
        });

        it('should detect tab delimiter', () => {
            const csvData = 'ID\tName\tRank\n101\tRoom 101\tCaptain';

            const result = Papa.parse(csvData, {
                header: true,
            });

            expect(result.meta.delimiter).toBe('\t');
        });
    });
});
