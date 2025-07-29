'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const isDev = process.env.NODE_ENV === 'development';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <main className="p-4 md:p-6">
      <div className="mb-8 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong!</AlertTitle>
          <AlertDescription>
            An error occurred while loading this page. Please try again.
          </AlertDescription>
        </Alert>

        <div className="space-y-4" style={{ display: isDev ? 'block' : 'none'}}>
          <h2 className="font-semibold text-lg md:text-xl">
            Error Details
          </h2>

          <Alert>
            <AlertTitle>Error Message</AlertTitle>
            <AlertDescription>
              <p className="font-mono text-sm p-4 bg-muted rounded-md">
                {error.message || 'Unknown error'}
              </p>
            </AlertDescription>
          </Alert>

          {error.digest && (
            <Alert>
              <AlertTitle>Error Digest</AlertTitle>
              <AlertDescription>
                <p className="font-mono text-sm p-4 bg-muted rounded-md">
                  {error.digest}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              If this error persists, please contact support with the error details above.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => reset()}
                variant="default"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
