/**
 * NativePeopleList
 *
 * Native grouped list for the People page.
 * Groups people by assigned/unassigned with space badges and section headers.
 */

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { NativeGroupedList } from '@shared/presentation/components/NativeGroupedList';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import type { Person } from '../domain/types';

interface NativePeopleListProps {
    people: Person[];
    canEdit: boolean;
}

export function NativePeopleList({ people, canEdit }: NativePeopleListProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { getLabel } = useSpaceTypeLabels();

    const sections = useMemo(() => {
        const assigned = people.filter(p => p.assignedSpaceId);
        const unassigned = people.filter(p => !p.assignedSpaceId);

        return [
            {
                title: t('people.assigned'),
                count: assigned.length,
                color: 'primary' as const,
                icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />,
                items: assigned.sort((a, b) => {
                    const aNum = parseInt(a.assignedSpaceId || '0', 10);
                    const bNum = parseInt(b.assignedSpaceId || '0', 10);
                    return aNum - bNum;
                }),
            },
            {
                title: t('people.unassigned'),
                count: unassigned.length,
                color: 'warning' as const,
                icon: <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
                items: unassigned,
            },
        ];
    }, [people, t]);

    const getDisplayName = (person: Person): string => {
        return Object.values(person.data)[0] || person.id.slice(0, 8);
    };

    const getSubtitle = (person: Person): string => {
        const values = Object.values(person.data);
        const dept = values[1] || '';
        if (person.assignedSpaceId) {
            return dept
                ? `${dept} · ${getLabel('singular')} ${person.assignedSpaceId}`
                : `${getLabel('singular')} ${person.assignedSpaceId}`;
        }
        return dept ? `${dept} · ${t('people.unassigned')}` : t('people.unassigned');
    };

    return (
        <NativeGroupedList
            sections={sections}
            keyExtractor={(p) => p.id}
            onItemTap={(person) => {
                if (canEdit) {
                    navigate(`/people/${person.id}/edit`);
                }
            }}
            renderItem={(person) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 14,
                            flexShrink: 0,
                            backgroundColor: person.assignedSpaceId ? '#e3f2fd' : '#fff3e0',
                            color: person.assignedSpaceId ? 'primary.main' : '#e65100',
                        }}
                        style={person.id ? { viewTransitionName: `badge-${person.id}` } as React.CSSProperties : undefined}
                    >
                        {person.assignedSpaceId || '—'}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 14 }} noWrap>
                            {getDisplayName(person)}
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: person.assignedSpaceId ? 'text.secondary' : '#e65100',
                            fontSize: 11,
                        }} noWrap>
                            {getSubtitle(person)}
                        </Typography>
                    </Box>
                </Box>
            )}
            fab={canEdit ? {
                label: t('people.addPerson'),
                onClick: () => navigate('/people/new'),
            } : undefined}
        />
    );
}
