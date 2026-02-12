import { render, screen } from '../../../test/utils/testUtils';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
    it('should render without crashing', () => {
        render(<LoadingSpinner />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
        const customMessage = 'Loading data...';
        render(<LoadingSpinner message={customMessage} />);
        expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('progressbar');
        expect(spinner).toHaveAttribute('aria-busy', 'true');
    });
});
