import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface NativePageTitle {
    title: string;
    showBackArrow: boolean;
    actions?: ReactNode;
}

interface NativePageTitleContextType {
    pageTitle: NativePageTitle;
    setPageTitle: (title: string, showBackArrow?: boolean, actions?: ReactNode) => void;
}

const NativePageTitleContext = createContext<NativePageTitleContextType | null>(null);

export function NativePageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitleState] = useState<NativePageTitle>({
        title: '',
        showBackArrow: false,
    });

    const setPageTitle = useCallback((title: string, showBackArrow = false, actions?: ReactNode) => {
        setPageTitleState({ title, showBackArrow, actions });
    }, []);

    return (
        <NativePageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
            {children}
        </NativePageTitleContext.Provider>
    );
}

export function useNativePageTitle() {
    const ctx = useContext(NativePageTitleContext);
    if (!ctx) throw new Error('useNativePageTitle must be used within NativePageTitleProvider');
    return ctx;
}

export function useSetNativeTitle(title: string, showBackArrow = false, actions?: ReactNode) {
    const { setPageTitle } = useNativePageTitle();
    setPageTitle(title, showBackArrow, actions);
}
