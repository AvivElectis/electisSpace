import { useState } from 'react';
import type { MouseEvent } from 'react';
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
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
        document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
        handleClose();
    };

    const currentLang = i18n.language;

    return (
        <>
            <Tooltip title={currentLang === 'en' ? 'עברית' : 'English'}>
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                    aria-label="change language"
                >
                    <LanguageIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MenuItem onClick={() => handleLanguageChange('en')} selected={currentLang === 'en'}>
                    <ListItemIcon>
                        {currentLang === 'en' && <CheckIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>English</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleLanguageChange('he')} selected={currentLang === 'he'}>
                    <ListItemIcon>
                        {currentLang === 'he' && <CheckIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>עברית</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
