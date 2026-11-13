import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-4">
        <HelpCircle className="w-6 h-6" />
      </div>
      <h2 className="font-display font-bold text-3xl text-charcoal-900 tracking-tight">
        404 &mdash; Page Not Found
      </h2>
      <p className="mt-2 text-sm text-charcoal-600 max-w-md">
        The invitation, event, or page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

