"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateBranchModalProps {
  onSuccess: () => void;
}

export default function CreateBranchModal({ onSuccess }: CreateBranchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    manager_name: '',
    manager_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          toast.error(data.error, {
            description: 'Please upgrade your plan to add more branches.'
          });
        } else {
          throw new Error(data.error || 'Failed to create branch');
        }
        return;
      }

      toast.success('Branch created successfully');
      setForm({
        name: '', code: '', address: '', city: '', 
        state: '', pincode: '', manager_name: '', manager_phone: ''
      });
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 px-6"
      >
        <span className="mr-2">➕</span> Add Branch
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">New Mess Branch</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 transition-all shadow-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Main Mess"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Branch Code</Label>
                  <Input
                    id="code"
                    required
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="BRANCH-01"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m_name">Manager Name</Label>
                  <Input
                    id="m_name"
                    value={form.manager_name}
                    onChange={e => setForm({ ...form, manager_name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m_phone">Manager Phone</Label>
                  <Input
                    id="m_phone"
                    value={form.manager_phone}
                    onChange={e => setForm({ ...form, manager_phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 rounded-xl"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg transition-all"
                >
                  {isLoading ? 'Creating...' : 'Create Branch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
