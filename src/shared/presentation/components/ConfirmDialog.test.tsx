import { render, screen, fireEvent } from '../../../test/utils/testUtils';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
    const defaultProps = {
        open: true,
        options: {
            title: 'Confirm Action',
            message: 'Are you sure you want to proceed?',
        },
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it('should render when open', () => {
        render(<ConfirmDialog {...defaultProps} />);

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<ConfirmDialog {...defaultProps} open={false} />);

        expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should call onConfirm when confirm button clicked', () => {
        const onConfirm = vi.fn();
        render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

        const confirmButton = screen.getByRole('button', { name: /confirm|yes|ok/i });
        fireEvent.click(confirmButton);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button clicked', () => {
        const onCancel = vi.fn();
        render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

        const cancelButton = screen.getByRole('button', { name: /cancel|no/i });
        fireEvent.click(cancelButton);

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should display custom confirm button text', () => {
        render(
            <ConfirmDialog
                {...defaultProps}
                options={{
                    ...defaultProps.options,
                    confirmLabel: "Delete",
                    cancelLabel: "Keep"
                }}
            />
        );

        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
    });

    it('should support danger variant', () => {
        render(
            <ConfirmDialog
                {...defaultProps}
                options={{
                    ...defaultProps.options,
                    severity: "error"
                }}
            />
        );

        const confirmButton = screen.getByRole('button', { name: /confirm|yes|ok/i });
        expect(confirmButton).toHaveClass(/error|danger/i);
    });
});
