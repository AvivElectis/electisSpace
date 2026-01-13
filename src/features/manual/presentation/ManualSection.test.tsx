import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManualSection } from './ManualSection';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'manual.test.title': 'Test Section Title',
                'manual.test.content': 'This is the test content.',
                'manual.multiline.title': 'Multi-line Title',
                'manual.multiline.content': 'First paragraph.\nSecond paragraph.\nThird paragraph.',
                'manual.empty.title': 'Empty Title',
                'manual.empty.content': '',
            };
            return translations[key] || key;
        },
    }),
}));

describe('ManualSection Component', () => {
    const testSection = {
        id: 'test',
        titleKey: 'manual.test.title',
        contentKey: 'manual.test.content',
    };

    describe('rendering', () => {
        it('should render section title', () => {
            render(<ManualSection section={testSection} />);
            
            expect(screen.getByText('Test Section Title')).toBeInTheDocument();
        });

        it('should render section content', () => {
            render(<ManualSection section={testSection} />);
            
            expect(screen.getByText('This is the test content.')).toBeInTheDocument();
        });

        it('should render within Paper component', () => {
            render(<ManualSection section={testSection} />);
            
            const paper = document.querySelector('.MuiPaper-outlined');
            expect(paper).toBeInTheDocument();
        });

        it('should render title with primary color', () => {
            render(<ManualSection section={testSection} />);
            
            const title = screen.getByText('Test Section Title');
            expect(title).toHaveClass('MuiTypography-h6');
        });
    });

    describe('multi-line content', () => {
        const multilineSection = {
            id: 'multiline',
            titleKey: 'manual.multiline.title',
            contentKey: 'manual.multiline.content',
        };

        it('should render multiple paragraphs', () => {
            render(<ManualSection section={multilineSection} />);
            
            expect(screen.getByText('First paragraph.')).toBeInTheDocument();
            expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
            expect(screen.getByText('Third paragraph.')).toBeInTheDocument();
        });

        it('should split content by newlines', () => {
            render(<ManualSection section={multilineSection} />);
            
            // Each paragraph is a separate Typography
            const paragraphs = document.querySelectorAll('.MuiTypography-body1');
            expect(paragraphs.length).toBe(3);
        });
    });

    describe('isLast prop', () => {
        it('should have margin bottom when not last', () => {
            const { container } = render(<ManualSection section={testSection} isLast={false} />);
            
            const paper = container.querySelector('.MuiPaper-root');
            expect(paper).toBeInTheDocument();
        });

        it('should have no margin bottom when last', () => {
            const { container } = render(<ManualSection section={testSection} isLast={true} />);
            
            const paper = container.querySelector('.MuiPaper-root');
            expect(paper).toBeInTheDocument();
        });

        it('should default to not last', () => {
            const { container } = render(<ManualSection section={testSection} />);
            
            const paper = container.querySelector('.MuiPaper-root');
            expect(paper).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle single paragraph without newlines', () => {
            render(<ManualSection section={testSection} />);
            
            const paragraphs = document.querySelectorAll('.MuiTypography-body1');
            expect(paragraphs.length).toBe(1);
        });

        it('should filter out empty lines in content', () => {
            const sectionWithEmptyLines = {
                id: 'empty-lines',
                titleKey: 'manual.test.title',
                contentKey: 'manual.multiline.content', // has 3 paragraphs
            };
            render(<ManualSection section={sectionWithEmptyLines} />);
            
            const paragraphs = document.querySelectorAll('.MuiTypography-body1');
            expect(paragraphs.length).toBe(3);
        });
    });
});
