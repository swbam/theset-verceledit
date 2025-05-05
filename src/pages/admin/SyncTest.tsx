import React from 'react';
import { UnifiedSyncTest } from '@/components/admin/UnifiedSyncTest';
import AdminSyncStatus from '@/components/admin/AdminSyncStatus';

export default function SyncTestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <UnifiedSyncTest />
      <AdminSyncStatus />
    </div>
  );
}
