import { useState, useRef, useEffect } from 'react';

interface AgreementDialogProps {
  agreementText: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AgreementDialog({ agreementText, onAccept, onDecline }: AgreementDialogProps) {
  const [expanded, setExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const MAX_HEIGHT = 340; // pixels

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setIsExpandable(height > MAX_HEIGHT);
    }
  }, [agreementText]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Server Agreement
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Please read and accept the server agreement to continue
          </p>
        </div>

        {/* Agreement Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div
            ref={contentRef}
            className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${
              !expanded && isExpandable ? 'max-h-[340px]' : ''
            }`}
          >
            <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
              {agreementText}
            </pre>
          </div>

          {/* Expand button */}
          {isExpandable && !expanded && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
                title="Expand Server Agreement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Expand
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
          <button
            onClick={onDecline}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

