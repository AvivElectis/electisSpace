/**
 * Article Format JSON Editor Component
 * 
 * Uses vanilla-jsoneditor to display and edit SoluM article format schemas
 * Supports both read-only and editable modes
 */

import { useEffect, useRef, useState } from 'react';
import { createJSONEditor, Mode, type Content } from 'vanilla-jsoneditor';
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

    // Initialize and manage editor
    useEffect(() => {
        // Create editor if it doesn't exist
        if (editorRef.current && !jsonEditorRef.current && schema) {
            console.log('[ArticleFormatEditor] Creating new editor');
            const content: Content = { json: schema };
            jsonEditorRef.current = createJSONEditor({
                target: editorRef.current,
                props: {
                    content,
                    readOnly,
                    mode: Mode.tree,
                    onChange: (updatedContent: Content) => {
                        console.log('[ArticleFormatEditor] onChange fired', { readOnly, updatedContent });
                        if (!readOnly) {
                            console.log('[ArticleFormatEditor] Setting hasChanges to true');
                            setHasChanges(true);
                        }
                    },
                }
            });
            setHasChanges(false);
        }
        // Update content when schema changes (if editor exists)
        else if (jsonEditorRef.current && schema) {
            console.log('[ArticleFormatEditor] Updating existing editor content');
            const content: Content = { json: schema };
            jsonEditorRef.current.update(content);
            // Don't set hasChanges to false here - let the onChange handler manage it
            // setHasChanges(false); // Removed - this was preventing saves
        }

        // Cleanup on unmount
        return () => {
            if (jsonEditorRef.current) {
                jsonEditorRef.current.destroy();
                jsonEditorRef.current = null;
            }
        };
    }, [schema, readOnly]);

    const handleSave = async () => {
        console.log('[ArticleFormatEditor] handleSave called', {
            hasEditor: !!jsonEditorRef.current,
            hasOnSave: !!onSave,
            hasChanges,
            isSaving
        });

        if (jsonEditorRef.current && onSave) {
            try {
                setIsSaving(true);
                console.log('[ArticleFormatEditor] Getting content from editor');
                const content = jsonEditorRef.current.get();
                console.log('[ArticleFormatEditor] Content retrieved', { content });

                let jsonData: ArticleFormat;

                // Handle both json and text formats
                if ('json' in content) {
                    jsonData = content.json as ArticleFormat;
                } else if ('text' in content) {
                    // Parse text to JSON
                    console.log('[ArticleFormatEditor] Parsing text content to JSON');
                    jsonData = JSON.parse(content.text) as ArticleFormat;
                } else {
                    console.warn('[ArticleFormatEditor] Content has neither json nor text property', content);
                    return;
                }

                console.log('[ArticleFormatEditor] Calling onSave with JSON');
                const success = await onSave(jsonData);
                console.log('[ArticleFormatEditor] onSave returned', { success });
                if (success) {
                    setHasChanges(false);
                }
            } catch (error) {
                console.error('[ArticleFormatEditor] Save error', error);
                throw error; // Re-throw so the error notification shows
            } finally {
                setIsSaving(false);
            }
        } else {
            console.warn('[ArticleFormatEditor] Cannot save - missing editor or onSave callback');
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
