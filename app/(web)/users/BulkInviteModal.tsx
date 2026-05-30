"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download,
  Users
} from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { normalizePhone } from '@/lib/utils/phone'

interface BulkInviteModalProps {
  onSuccess: () => void
  branches: { id: string, name: string }[]
  designations: { id: string, name: string }[]
}

export default function BulkInviteModal({ onSuccess, branches, designations }: BulkInviteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 })
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 })

  const branchNames = new Set(branches.map(b => b.name.toLowerCase().trim()))
  const designationNames = new Set(designations.map(d => d.name.toLowerCase().trim()))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (logic remains same)
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file')
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData(results.data)
      }
    })
  }

  const validateData = (data: any[]) => {
    let validCount = 0
    let invalidCount = 0

    const processed = data.map(row => {
      const errors = []
      const normalizedPhone = normalizePhone(row.phone)
      
      if (!row.full_name) errors.push('Name missing')
      if (row.invite_method === 'email' && !row.email) errors.push('Email missing')
      if (row.invite_method === 'phone' && !normalizedPhone) errors.push('Phone invalid or missing')
      
      if (row.branch_name && !branchNames.has(row.branch_name.toLowerCase().trim())) {
        errors.push(`Branch "${row.branch_name}" not found`)
      }
      
      if (row.designation_name && !designationNames.has(row.designation_name.toLowerCase().trim())) {
        errors.push(`Designation "${row.designation_name}" not found`)
      }

      const role = row.role?.toLowerCase().trim()
      if (role && role !== 'member' && role !== 'manager') {
        errors.push(`Invalid role: ${row.role}`)
      }

      const isValid = errors.length === 0
      if (isValid) validCount++
      else invalidCount++

      return { ...row, errors, isValid }
    })

    setCsvData(processed)
    setStats({ total: processed.length, valid: validCount, invalid: invalidCount })
  }

  const handleProcess = async () => {
    const validRowsIndices = csvData
      .map((u, i) => u.isValid ? i : -1)
      .filter(i => i !== -1)

    if (validRowsIndices.length === 0) return

    setIsProcessing(true)
    setProgress({ current: 0, total: validRowsIndices.length, success: 0, fail: 0 })

    const updatedData = [...csvData]

    for (let i = 0; i < validRowsIndices.length; i++) {
      const rowIndex = validRowsIndices[i]
      const userData = updatedData[rowIndex]

      try {
        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: [userData] }) // Send 1 by 1 for progress tracking
        })

        const result = await res.json()

        if (res.ok && result.success > 0) {
          updatedData[rowIndex] = { ...userData, isSent: true }
          setProgress(p => ({ ...p, current: i + 1, success: p.success + 1 }))
        } else {
          const serverError = result.errors?.[0]?.error || result.error || 'Failed'
          updatedData[rowIndex] = { ...userData, isValid: false, errors: [serverError] }
          setProgress(p => ({ ...p, current: i + 1, fail: p.fail + 1 }))
        }
      } catch (err) {
        updatedData[rowIndex] = { ...userData, isValid: false, errors: ['Network Error'] }
        setProgress(p => ({ ...p, current: i + 1, fail: p.fail + 1 }))
      }
      
      setCsvData([...updatedData])
    }

    setIsProcessing(false)
    onSuccess()
    
    if (progress.fail === 0) {
      toast.success('All invitations sent successfully!')
    } else {
      toast.warning('Process complete with some errors. Check the table.')
    }
  }

  const downloadTemplate = () => {
    const headers = ['full_name', 'email', 'phone', 'enrollment_no', 'role', 'branch_name', 'designation_name', 'invite_method']
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + 
      "John Doe,john@example.com,,ENR001,member,Main Branch,Staff,email"
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "mealiez_invite_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const percentage = Math.round((progress.current / progress.total) * 100) || 0

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold gap-2 transition-all"
      >
        <Upload size={16} />
        <span>Bulk Invite</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Bulk Invitation</h2>
                  <p className="text-sm text-gray-500 font-medium">Processing your team invitations.</p>
                </div>
              </div>
              {!isProcessing && (
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white hover:shadow-md rounded-full text-gray-400 hover:text-gray-600 transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 relative">
              {/* Circular Loader Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-6">
                  <div className="relative h-48 w-48">
                    {/* Background Circle */}
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle
                        className="text-gray-100 stroke-current"
                        strokeWidth="8"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                      ></circle>
                      {/* Progress Circle */}
                      <circle
                        className="text-blue-600 stroke-current transition-all duration-500 ease-out"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                        strokeLinecap="round"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        transform="rotate(-90 50 50)"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-gray-900">{progress.current} / {progress.total}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registering...</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">Inviting Team Members</p>
                    <p className="text-xs text-gray-500">Please do not close this window...</p>
                  </div>
                </div>
              )}

              {/* Stats Bar */}
              {csvData.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Rows</div>
                    <div className="text-2xl font-black text-gray-900">{stats.total}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-3xl border border-green-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-green-600">Ready to Invite</div>
                    <div className="text-2xl font-black text-green-700">{stats.valid}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-3xl border border-red-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-red-600">Errors Found</div>
                    <div className="text-2xl font-black text-red-700">{stats.invalid}</div>
                  </div>
                </div>
              )}

              {/* Upload Zone or Preview */}
              {csvData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-4 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Upload size={32} className="text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">Select your CSV file</p>
                    <p className="text-sm text-gray-500">Make sure columns match the system fields.</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label 
                    htmlFor="csv-upload"
                    className="cursor-pointer bg-white border border-gray-200 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    Browse Files
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={downloadTemplate}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600"
                  >
                    <Download size={12} className="mr-2" /> Download Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Data Preview</h3>
                    {!isProcessing && (
                      <button 
                        onClick={() => setCsvData([])}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Clear & Re-upload
                      </button>
                    )}
                  </div>
                  <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Identifier</th>
                          <th className="px-6 py-4">Branch</th>
                          <th className="px-6 py-4">Designation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {csvData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                              {row.isSent ? (
                                <CheckCircle2 size={18} className="text-blue-500" />
                              ) : row.isValid ? (
                                <CheckCircle2 size={18} className="text-green-500 opacity-30" />
                              ) : (
                                <div className="group relative">
                                  <AlertCircle size={18} className="text-red-500 cursor-help" />
                                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 bg-gray-900 text-white text-[10px] p-2 rounded-lg whitespace-nowrap font-bold">
                                    {row.errors.join(', ')}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">{row.full_name || '-'}</td>
                            <td className="px-6 py-4 text-gray-600">{row.email || row.phone || '-'}</td>
                            <td className="px-6 py-4">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                {row.branch_name || 'Global'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                {row.designation_name || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!isProcessing && (
              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl font-black uppercase text-xs tracking-widest h-14"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcess}
                  disabled={stats.valid === 0}
                  className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  Invite {stats.valid} Members
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
