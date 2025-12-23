/**
 * Article Format JSON Editor Component
 * 
 * Uses vanilla-jsoneditor to display and edit SoluM article format schemas
 * Supports both read-only and editable modes
 */

import { useEffect, useRef, useState } from 'react';
import { createJSONEditor, type JSONEditorPropsOptional, Mode } from 'vanilla-jsoneditor';
import { Box, Typography, Button, Stack, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ArticleFormat } from '../domain/types';

// Import CSS for JSON editor
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

interface ArticleFormatEditorProps {
    schema: ArticleFormat | null;
    onSave?: (newSchema: ArticleFormat) => Promise<boolean>;
    readOnly?: boolean;
}

/**
 * JSON Editor for SoluM Article Format
 * 
 * Displays schema in tree/text view with syntax highlighting
 * Validates schema on save
 */
export function ArticleFormatEditor({
    schema,
    onSave,
    readOnly = false  // User requirement: editing allowed by default
}: ArticleFormatEditorProps) {
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement>(null);
    const jsonEditorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize editor
    useEffect(() => {
        if (editorRef.current && !jsonEditorRef.current) {
            const editorProps: JSONEditorPropsOptional = {
                content: { json: schema || {} },
                readOnly,
                mode: Mode.tree,
                onChange: () => {
                    if (!readOnly) {
                        setHasChanges(true);
                    }
                },
            };

            jsonEditorRef.current = createJSONEditor({
                target: editorRef.current,
                ...editorProps
            });
        }

        return () => {
            jsonEditorRef.current?.destroy();
            jsonEditorRef.current = null;
        };
    }, [readOnly]);

    // Update editor content when schema changes
    useEffect(() => {
        if (jsonEditorRef.current && schema) {
            jsonEditorRef.current.update({ json: schema });
            setHasChanges(false);
        }
    }, [schema]);

    const handleSave = async () => {
        if (jsonEditorRef.current && onSave) {
            try {
                setIsSaving(true);
                const content = jsonEditorRef.current.get();

                if ('json' in content) {
                    const success = await onSave(content.json as ArticleFormat);
                    if (success) {
                        setHasChanges(false);
                    }
                }
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!schema) {
        return (
            <Alert severity="info">
                {t('settings.clickFetchSchemaToStart')}
            </Alert>
        );
    }

    return (
        <Stack spacing={2}>
            <Typography variant="subtitle2">
                {t('settings.articleFormatSchema')}
            </Typography>

            <Box
                ref={editorRef}
                sx={{
                    height: 500,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    direction: 'ltr', // Force LTR for code/json
                    textAlign: 'left',
                    '& .jse-main': {
                        borderRadius: 1,
                    }
                }}
            />

            {!readOnly && onSave && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                    >
                        {isSaving ? t('common.saving') : t('common.save')}
                    </Button>
                    {hasChanges && (
                        <Typography variant="caption" color="warning.main" sx={{ alignSelf: 'center' }}>
                            {t('settings.unsavedChanges')}
                        </Typography>
                    )}
                </Box>
            )}

            {readOnly && (
                <Typography variant="caption" color="text.secondary">
                    {t('settings.editorReadOnly')}
                </Typography>
            )}
        </Stack>
    );
}
