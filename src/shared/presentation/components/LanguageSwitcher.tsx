import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * LanguageSwitcher Component
 * 
 * Allows users to switch between English and Hebrew.
 * Persists selection to localStorage via i18next.
 */
export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        handleClose();
    };

    const currentLang = i18n.language;

    return (
        <>
            <Tooltip title="Change Language" sx={{ mx: .5, boxShadow: '0 0 3px rgba(0, 0, 0, 0.51)', scale: 1.2 }}>
                <IconButton
                    onClick={handleClick}
                    color="inherit"
                    size="small"
                    aria-label="change language"
                >
                    <LanguageIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={() => handleLanguageChange('en')}>
                    <ListItemIcon>
                        {currentLang === 'en' && <CheckIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>English</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleLanguageChange('he')}>
                    <ListItemIcon>
                        {currentLang === 'he' && <CheckIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>עברית</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
