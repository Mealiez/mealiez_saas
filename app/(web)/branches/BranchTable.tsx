"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Search } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city: string | null;
  state: string | null;
  pincode?: string | null;
  manager_name: string | null;
  manager_phone?: string | null;
  is_active: boolean;
  created_at: string;
}

interface BranchTableProps {
  branches: Branch[];
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
}

export default function BranchTable({ branches, onEdit, onDelete }: BranchTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
            <tr>
              <th className="px-6 py-4">Branch Details</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Manager</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{branch.name}</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{branch.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-600">
                    {branch.city ? `${branch.city}, ${branch.state || ''}` : 'Location not set'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">
                    {branch.manager_name || 'Unassigned'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={branch.is_active ? 'success' : 'secondary'}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(branch)}
                    className="hover:bg-blue-50 hover:text-blue-600 rounded-lg h-8 w-8 p-0"
                    title="Edit Branch"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${branch.name}?`)) {
                        onDelete(branch.id)
                      }
                    }}
                    className="hover:bg-red-50 hover:text-red-600 rounded-lg h-8 w-8 p-0"
                    title="Delete Branch"
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                  No branches found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
