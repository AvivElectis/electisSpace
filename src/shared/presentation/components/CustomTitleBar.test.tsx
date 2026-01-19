import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomTitleBar } from './CustomTitleBar';

// Mock platform detector
vi.mock('@shared/infrastructure/platform/platformDetector', () => ({
    detectPlatform: vi.fn(),
}));

import { detectPlatform } from '@shared/infrastructure/platform/platformDetector';

describe('CustomTitleBar Component', () => {
    const mockElectronAPI = {
        windowMinimize: vi.fn(),
        windowMaximize: vi.fn(),
        windowClose: vi.fn(),
        windowIsMaximized: vi.fn(() => Promise.resolve(false)),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window.electronAPI
        (window as any).electronAPI = undefined;
    });

    describe('platform detection', () => {
        it('should not render on web platform', () => {
            vi.mocked(detectPlatform).mockReturnValue('web');
            
            const { container } = render(<CustomTitleBar />);
            expect(container.firstChild).toBeNull();
        });

        it('should not render on android platform', () => {
            vi.mocked(detectPlatform).mockReturnValue('android');
            
            const { container } = render(<CustomTitleBar />);
            expect(container.firstChild).toBeNull();
        });

        it('should render on electron platform', () => {
            vi.mocked(detectPlatform).mockReturnValue('electron');
            (window as any).electronAPI = mockElectronAPI;
            
            const { container } = render(<CustomTitleBar />);
            expect(container.firstChild).not.toBeNull();
        });
    });

    describe('rendering on electron', () => {
        beforeEach(() => {
            vi.mocked(detectPlatform).mockReturnValue('electron');
            (window as any).electronAPI = mockElectronAPI;
        });

        it('should render default title', () => {
            render(<CustomTitleBar />);
            
            expect(screen.getByText('electis Space')).toBeInTheDocument();
        });

        it('should render custom title', () => {
            render(<CustomTitleBar title="My Custom App" />);
            
            expect(screen.getByText('My Custom App')).toBeInTheDocument();
        });

        it('should render window control buttons', () => {
            render(<CustomTitleBar />);
            
            // Check for control icons
            expect(screen.getByTestId('MinimizeIcon')).toBeInTheDocument();
            expect(screen.getByTestId('CloseIcon')).toBeInTheDocument();
        });

        it('should render maximize icon when not maximized', () => {
            render(<CustomTitleBar />);
            
            expect(screen.getByTestId('CropSquareIcon')).toBeInTheDocument();
        });
    });

    describe('window controls', () => {
        beforeEach(() => {
            vi.mocked(detectPlatform).mockReturnValue('electron');
            (window as any).electronAPI = mockElectronAPI;
        });

        it('should call minimize when minimize button clicked', () => {
            render(<CustomTitleBar />);
            
            const minimizeButton = screen.getByTestId('MinimizeIcon').closest('button');
            fireEvent.click(minimizeButton!);
            
            expect(mockElectronAPI.windowMinimize).toHaveBeenCalled();
        });

        it('should call close when close button clicked', () => {
            render(<CustomTitleBar />);
            
            const closeButton = screen.getByTestId('CloseIcon').closest('button');
            fireEvent.click(closeButton!);
            
            expect(mockElectronAPI.windowClose).toHaveBeenCalled();
        });

        it('should call maximize when maximize button clicked', () => {
            render(<CustomTitleBar />);
            
            const maximizeButton = screen.getByTestId('CropSquareIcon').closest('button');
            fireEvent.click(maximizeButton!);
            
            expect(mockElectronAPI.windowMaximize).toHaveBeenCalled();
        });
    });

    describe('missing electronAPI', () => {
        beforeEach(() => {
            vi.mocked(detectPlatform).mockReturnValue('electron');
            (window as any).electronAPI = undefined;
        });

        it('should handle missing minimize gracefully', () => {
            render(<CustomTitleBar />);
            
            const minimizeButton = screen.getByTestId('MinimizeIcon').closest('button');
            expect(() => fireEvent.click(minimizeButton!)).not.toThrow();
        });

        it('should handle missing close gracefully', () => {
            render(<CustomTitleBar />);
            
            const closeButton = screen.getByTestId('CloseIcon').closest('button');
            expect(() => fireEvent.click(closeButton!)).not.toThrow();
        });

        it('should handle missing maximize gracefully', () => {
            render(<CustomTitleBar />);
            
            const maximizeButton = screen.getByTestId('CropSquareIcon').closest('button');
            expect(() => fireEvent.click(maximizeButton!)).not.toThrow();
        });
    });

    describe('styling', () => {
        beforeEach(() => {
            vi.mocked(detectPlatform).mockReturnValue('electron');
            (window as any).electronAPI = mockElectronAPI;
        });

        it('should render with fixed height', () => {
            const { container } = render(<CustomTitleBar />);
            
            const titleBar = container.firstChild;
            expect(titleBar).toHaveStyle({ height: '32px' });
        });

        it('should have flex layout', () => {
            const { container } = render(<CustomTitleBar />);
            
            const titleBar = container.firstChild;
            expect(titleBar).toHaveStyle({ display: 'flex' });
        });
    });
});
