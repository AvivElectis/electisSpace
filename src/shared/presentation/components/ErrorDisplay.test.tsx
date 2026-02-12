import { render, screen, fireEvent } from '../../../test/utils/testUtils';
import { ErrorDisplay } from './ErrorDisplay';

describe('ErrorDisplay Component', () => {
    it('should render error message', () => {
        const errorMessage = 'An error occurred';
        render(<ErrorDisplay message={errorMessage} />);

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should render error title when provided', () => {
        render(<ErrorDisplay message="Error" title="Error Title" />);

        expect(screen.getByText('Error Title')).toBeInTheDocument();
    });

    it('should render retry button when onRetry provided', () => {
        const onRetry = vi.fn();
        render(<ErrorDisplay message="Error" onRetry={onRetry} />);

        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', () => {
        const onRetry = vi.fn();
        render(<ErrorDisplay message="Error" onRetry={onRetry} />);

        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not render retry button when onRetry not provided', () => {
        render(<ErrorDisplay message="Error" />);

        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
});
