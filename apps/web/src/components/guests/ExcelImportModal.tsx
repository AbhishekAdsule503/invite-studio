'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { guestService, ExcelPreviewResponse, ExcelImportRow } from '@/services/guest.service';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ExcelPreviewResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await guestService.downloadTemplate();
    } catch {
      setError('Failed to download template. Please try again.');
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload a valid Microsoft Excel file (.xlsx).');
      return;
    }

    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const result = await guestService.previewExcelImport(selectedFile);
      setPreview(result);
      setStep('PREVIEW');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Excel file.';
      setError(msg);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.status === 'VALID');

    if (validRows.length === 0) {
      setError('No valid rows found to import.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      await guestService.confirmExcelImport(validRows);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('UPLOAD');
    setFile(null);
    setPreview(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-surface-card rounded-2xl shadow-xl border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Import Guests via Excel
              </h3>
              <p className="text-xs text-charcoal-500">
                {step === 'UPLOAD'
                  ? 'Download template and upload your filled Excel sheet'
                  : 'Review preview before confirming import'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {step === 'UPLOAD' ? (
            <div className="space-y-6">
              {/* Step 1 banner */}
              <div className="p-4 rounded-xl bg-surface-warm border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <h4 className="text-sm font-semibold text-charcoal-900">1. Need the template?</h4>
                  <p className="text-xs text-charcoal-500">
                    Download our formatted Excel template with pre-configured headers.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download .xlsx Template</span>
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-200 hover:border-brand-400 bg-brand-50/20 hover:bg-brand-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal-900">
                    Click to browse or drag &amp; drop your Excel file
                  </p>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Supports Microsoft Excel (.xlsx) up to 5 MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />

                {loading && (
                  <p className="text-xs text-brand-600 font-medium animate-pulse">
                    Parsing and validating rows...
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-4">
              {preview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-surface-warm border border-surface-border text-center">
                    <p className="text-[11px] font-semibold uppercase text-charcoal-500">Total Rows</p>
                    <p className="text-xl font-bold text-charcoal-900 mt-0.5">{preview.totalRows}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <p className="text-[11px] font-semibold uppercase text-emerald-800">Valid to Import</p>
                    <p className="text-xl font-bold text-emerald-700 mt-0.5">{preview.validCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-[11px] font-semibold uppercase text-amber-800">Duplicates</p>
                    <p className="text-xl font-bold text-amber-700 mt-0.5">{preview.duplicateCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                    <p className="text-[11px] font-semibold uppercase text-red-800">Invalid</p>
                    <p className="text-xl font-bold text-red-700 mt-0.5">{preview.invalidCount}</p>
                  </div>
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="border border-surface-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-warm border-b border-surface-border uppercase font-semibold text-charcoal-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Full Name</th>
                      <th className="px-3 py-2.5">WhatsApp</th>
                      <th className="px-3 py-2.5">Relation</th>
                      <th className="px-3 py-2.5">Status &amp; Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border bg-surface-card">
                    {preview?.rows.map((r: ExcelImportRow) => (
                      <tr key={r.rowNumber} className="hover:bg-surface-warm/50">
                        <td className="px-3 py-2 text-charcoal-400 font-mono">#{r.rowNumber}</td>
                        <td className="px-3 py-2 font-medium text-charcoal-900">{r.fullName || '—'}</td>
                        <td className="px-3 py-2 text-charcoal-600 font-mono">{r.whatsappNumber || '—'}</td>
                        <td className="px-3 py-2 text-charcoal-600">{r.relation || '—'}</td>
                        <td className="px-3 py-2">
                          {r.status === 'VALID' ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          ) : r.status === 'DUPLICATE' ? (
                            <span className="inline-flex items-center text-amber-700 font-semibold space-x-1" title={r.errors.join(', ')}>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span className="truncate max-w-[180px]">{r.errors[0] || 'Duplicate'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-700 font-semibold space-x-1" title={r.errors.join(', ')}>
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span className="truncate max-w-[180px]">{r.errors[0] || 'Invalid'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-card">
          {step === 'PREVIEW' ? (
            <>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={importing}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Upload Another File</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                isLoading={importing}
                disabled={!preview || preview.validCount === 0}
              >
                <span>Confirm &amp; Import {preview?.validCount || 0} Guest(s)</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
