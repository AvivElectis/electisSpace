import { Skeleton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

interface TableSkeletonProps {
    /** Number of rows to display */
    rows?: number;
    /** Number of columns to display */
    columns?: number;
    /** Whether to show the table header */
    showHeader?: boolean;
}

/**
 * Skeleton loader for table layouts
 * Displays animated placeholder for loading table data
 * 
 * @example
 * {loading ? (
 *   <TableSkeleton rows={5} columns={6} />
 * ) : (
 *   <Table>...</Table>
 * )}
 */
export function TableSkeleton({
    rows = 5,
    columns = 6,
    showHeader = true
}: TableSkeletonProps) {
    return (
        <Table>
            {showHeader && (
                <TableHead>
                    <TableRow>
                        {Array.from({ length: columns }).map((_, index) => (
                            <TableCell key={`header-${index}`}>
                                <Skeleton variant="text" width="80%" />
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
            )}
            <TableBody>
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <TableRow key={`row-${rowIndex}`}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                                <Skeleton
                                    variant="text"
                                    width={colIndex === 0 ? '60%' : '90%'}
                                />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
