import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      <p className="text-sm text-charcoal-500 font-medium">Loading INVITE STUDIO...</p>
    </div>
  );
}

