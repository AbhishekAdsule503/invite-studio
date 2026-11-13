'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Page Error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="font-display font-bold text-2xl text-charcoal-900 tracking-tight">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-charcoal-600 max-w-md">
        {error.message || 'An unexpected error occurred while rendering this view.'}
      </p>
      <div className="mt-6 flex items-center space-x-3">
        <Button onClick={() => reset()} variant="primary" size="md">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

