
import React from 'react';
import { CheckCircleIcon } from './icons';

interface ExplanationDisplayProps {
  steps: string[];
}

export const ExplanationDisplay = ({ steps }: ExplanationDisplayProps): React.ReactNode => {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3 bg-indigo-950/50 p-4 rounded-lg border border-indigo-800">
          <div className="flex-shrink-0 text-sky-400 mt-1">
            <CheckCircleIcon />
          </div>
          <p className="text-indigo-200">{step}</p>
        </div>
      ))}
    </div>
  );
};
