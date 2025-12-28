import { useState, useCallback, useRef } from 'react';
import { ConfirmDialog as BaseConfirmDialog, type ConfirmDialogOptions } from '../components/ConfirmDialog';

export function useConfirmDialog() {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmDialogOptions>({ message: '' });
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((confirmOptions: ConfirmDialogOptions) => {
        setOptions(confirmOptions);
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setOpen(false);
        if (resolver.current) {
            resolver.current(true);
            resolver.current = null;
        }
    }, []);

    const handleCancel = useCallback(() => {
        setOpen(false);
        if (resolver.current) {
            resolver.current(false);
            resolver.current = null;
        }
    }, []);

    const DialogComponent = () => (
        <BaseConfirmDialog
            open={open}
            options={options}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );

    return {
        confirm,
        ConfirmDialog: DialogComponent
    };
}
