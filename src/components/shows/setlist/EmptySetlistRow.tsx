
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';

const EmptySetlistRow = () => {
  return (
    <TableRow>
      <TableCell colSpan={3} className="py-16 text-center text-white/60">
        No songs in the setlist yet. Add some songs using the dropdown above.
      </TableCell>
    </TableRow>
  );
};

export default EmptySetlistRow;
