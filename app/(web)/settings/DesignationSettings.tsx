"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Briefcase, Pencil, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Designation {
  id: string;
  name: string;
}

export default function DesignationSettings() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchDesignations();
  }, []);

  async function fetchDesignations() {
    try {
      const res = await fetch('/api/settings/designations');
      const data = await res.json();
      if (res.ok) {
        setDesignations(data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load designations');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        const result = await res.json();
        setDesignations([...designations, result.data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName('');
        toast.success('Designation added');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/settings/designations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (res.ok) {
        setDesignations(designations.map(d => d.id === id ? { ...d, name: editName } : d).sort((a, b) => a.name.localeCompare(b.name)));
        setEditingId(null);
        toast.success('Designation updated');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? Users with this designation will have it removed.')) return;

    try {
      const res = await fetch(`/api/settings/designations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDesignations(designations.filter(d => d.id !== id));
        toast.success('Designation deleted');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  }

  // Pagination Logic
  const totalPages = Math.ceil(designations.length / rowsPerPage);
  const paginatedData = designations.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 overflow-hidden bg-white font-sans">
      <CardHeader className="bg-gray-900 text-white p-8">
        <div className="flex items-center gap-3">
          <Briefcase className="text-blue-400" size={24} />
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Designations</CardTitle>
            <CardDescription className="text-gray-400 font-medium italic">
              Manage the job titles and roles available for your team members.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-6">
        {/* Add Form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="e.g. Senior Manager, Staff, Intern"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl h-12 font-bold"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting || !newName.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest h-12 px-6"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Add</span>
          </Button>
        </form>

        {/* Rows Per Page Selector */}
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
           <span>Total: {designations.length} items</span>
           <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-bold"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
           </div>
        </div>

        {/* List */}
        <div className="space-y-2 min-h-[300px]">
          {designations.length === 0 ? (
            <div className="text-center py-20 text-gray-400 italic text-sm font-medium">
              No designations added yet.
            </div>
          ) : (
            paginatedData.map((designation) => (
              <div 
                key={designation.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md hover:shadow-blue-500/5"
              >
                {editingId === designation.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-lg h-9 font-bold"
                      autoFocus
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleUpdate(designation.id)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check size={18} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setEditingId(null)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-gray-700">{designation.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setEditingId(designation.id);
                          setEditName(designation.name);
                        }}
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(designation.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              <ChevronLeft size={16} className="mr-1" /> Prev
            </Button>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
               Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
