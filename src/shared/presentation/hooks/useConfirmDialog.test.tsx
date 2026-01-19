import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useConfirmDialog } from './useConfirmDialog';

// Mock the ConfirmDialog component
vi.mock('../components/ConfirmDialog', () => ({
    ConfirmDialog: ({ 
        open, 
        options, 
        onConfirm, 
        onCancel 
    }: { 
        open: boolean; 
        options: { message: string; title?: string }; 
        onConfirm: () => void; 
        onCancel: () => void;
    }) => (
        open ? (
            <div data-testid="confirm-dialog">
                {options.title && <div data-testid="dialog-title">{options.title}</div>}
                <div data-testid="dialog-message">{options.message}</div>
                <button data-testid="confirm-btn" onClick={onConfirm}>Confirm</button>
                <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
            </div>
        ) : null
    ),
}));

// Helper component to test the hook
function TestComponent({ onResult }: { onResult: (result: boolean) => void }) {
    const { confirm, ConfirmDialog } = useConfirmDialog();
    
    const handleClick = async () => {
        const result = await confirm({ message: 'Are you sure?', title: 'Confirm' });
        onResult(result);
    };

    return (
        <>
            <button data-testid="trigger" onClick={handleClick}>Open Dialog</button>
            <ConfirmDialog />
        </>
    );
}

describe('useConfirmDialog Hook', () => {
    const mockOnResult = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('hook initialization', () => {
        it('should return confirm function', () => {
            const { result } = renderHook(() => useConfirmDialog());
            
            expect(typeof result.current.confirm).toBe('function');
        });

        it('should return ConfirmDialog component', () => {
            const { result } = renderHook(() => useConfirmDialog());
            
            expect(typeof result.current.ConfirmDialog).toBe('function');
        });
    });

    describe('dialog rendering', () => {
        it('should not show dialog initially', () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        it('should show dialog when confirm called', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });

        it('should display message in dialog', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            
            expect(screen.getByTestId('dialog-message')).toHaveTextContent('Are you sure?');
        });

        it('should display title in dialog', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            
            expect(screen.getByTestId('dialog-title')).toHaveTextContent('Confirm');
        });
    });

    describe('confirm action', () => {
        it('should close dialog when confirmed', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            
            fireEvent.click(screen.getByTestId('confirm-btn'));
            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        it('should render confirm button', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            
            expect(screen.getByTestId('confirm-btn')).toBeInTheDocument();
        });
    });

    describe('cancel action', () => {
        it('should close dialog when cancelled', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            
            fireEvent.click(screen.getByTestId('cancel-btn'));
            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        it('should render cancel button', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            fireEvent.click(screen.getByTestId('trigger'));
            
            expect(screen.getByTestId('cancel-btn')).toBeInTheDocument();
        });
    });

    describe('multiple dialogs', () => {
        it('should be reusable after closing', async () => {
            render(<TestComponent onResult={mockOnResult} />);
            
            // First dialog
            fireEvent.click(screen.getByTestId('trigger'));
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            fireEvent.click(screen.getByTestId('confirm-btn'));
            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
            
            // Second dialog
            fireEvent.click(screen.getByTestId('trigger'));
            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });
    });
});
