/**
 * DynamicFieldDisplay Component Tests
 * Phase 10.27 - Deep Testing System
 * 
 * Tests dynamic field rendering based on SoluM mapping config
 */

import { render, screen } from '@testing-library/react';
import { DynamicFieldDisplay } from './DynamicFieldDisplay';
import type { SolumMappingConfig } from '@features/settings/domain/types';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            language: 'en',
        },
    }),
}));

describe('DynamicFieldDisplay Component', () => {
    const mockData: Record<string, string> = {
        name: 'John Doe',
        department: 'Engineering',
        employeeId: 'EMP001',
    };

    const mockSolumConfig: SolumMappingConfig = {
        uniqueIdField: 'employeeId',
        fields: {
            name: {
                visible: true,
                friendlyNameEn: 'Full Name',
                friendlyNameHe: 'שם מלא',
            },
            department: {
                visible: true,
                friendlyNameEn: 'Department',
                friendlyNameHe: 'מחלקה',
            },
            employeeId: {
                visible: false,
                friendlyNameEn: 'Employee ID',
                friendlyNameHe: 'מזהה עובד',
            },
        },
        conferenceMapping: {
            meetingName: 'meetingName',
            meetingTime: 'meetingTime',
            participants: 'participants',
        },
    };

    describe('SoluM mode', () => {
        it('should render visible fields only', () => {
            render(
                <DynamicFieldDisplay
                    data={mockData}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            expect(screen.getByText('Full Name')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Department')).toBeInTheDocument();
            expect(screen.getByText('Engineering')).toBeInTheDocument();
            // employeeId is not visible
            expect(screen.queryByText('Employee ID')).not.toBeInTheDocument();
        });

        it('should not render fields with empty values', () => {
            render(
                <DynamicFieldDisplay
                    data={{ name: 'John', department: '' }}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            expect(screen.getByText('Full Name')).toBeInTheDocument();
            expect(screen.queryByText('Department')).not.toBeInTheDocument();
        });

        it('should return null when no fields have values', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={{ employeeId: '' }}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        it('should return null when no mapping config provided', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={mockData}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('variant rendering', () => {
        it('should render form variant by default', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={mockData}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            // Form variant uses Stack which has gap
            const stack = container.querySelector('.MuiStack-root');
            expect(stack).toBeInTheDocument();
        });

        it('should render table variant with inline format', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={mockData}
                    solumMappingConfig={mockSolumConfig}
                    variant="table"
                />
            );

            // Table variant renders with Box and inline Typography
            expect(container.querySelector('.MuiBox-root')).toBeInTheDocument();
            expect(container.textContent).toContain('Full Name');
            expect(container.textContent).toContain('Department');
        });

        it('should show bullet separator between fields in table variant', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={mockData}
                    solumMappingConfig={mockSolumConfig}
                    variant="table"
                />
            );

            // Table variant includes bullet separator between fields
            expect(container.textContent).toContain('•');
        });
    });

    describe('empty data handling', () => {
        it('should return null for empty data object', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={{}}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        it('should return null for data with only hidden fields', () => {
            const { container } = render(
                <DynamicFieldDisplay
                    data={{ employeeId: 'EMP001' }}
                    solumMappingConfig={mockSolumConfig}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });
});
