"use client";

import { useState, useEffect } from 'react';
import BranchTable from './BranchTable';
import CreateBranchModal from './CreateBranchModal';
import { toast } from 'sonner';

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch branches');
      setBranches(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleEdit = (branch: Branch) => {
    // TODO: Implement Edit Modal
    toast.info(`Editing ${branch.name} - Feature coming soon!`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
            <span className="text-blue-600">🏢</span> Branch Management
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1 uppercase tracking-widest">
            Manage multiple locations and assign localized staff.
          </p>
        </div>
        <CreateBranchModal onSuccess={fetchBranches} />
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 animate-pulse">
          <div className="h-64 bg-gray-100 rounded-3xl" />
        </div>
      ) : branches.length > 0 ? (
        <BranchTable branches={branches} onEdit={handleEdit} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-4xl">📍</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">No Branches Yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2 font-medium">
              Start by adding your first mess branch. You can then assign members and track attendance by location.
            </p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-start gap-4">
        <div className="bg-indigo-100 p-2 rounded-lg text-xl">ℹ️</div>
        <div>
          <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Enterprise Multi-Location</h4>
          <p className="text-xs text-indigo-700/80 font-medium mt-1 leading-relaxed">
            Branch management allows you to segment your organization. Staff members assigned to a branch will only see data relevant to their location, while Admins maintain full cross-branch visibility.
          </p>
        </div>
      </div>
    </div>
  );
}
