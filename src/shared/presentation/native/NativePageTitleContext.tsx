import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

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
        setPageTitleState((prev) => {
            if (prev.title === title && prev.showBackArrow === showBackArrow && prev.actions === actions) {
                return prev; // same reference → no re-render
            }
            return { title, showBackArrow, actions };
        });
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
    // Must run in useEffect to avoid setState-during-render infinite loops.
    // The page is a child of the NativePageTitleProvider, so calling setPageTitle
    // during render would trigger provider re-render → page re-render → repeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setPageTitle(title, showBackArrow, actions);
    }, [title, showBackArrow, actions, setPageTitle]);
}
