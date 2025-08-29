

import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ProblemInput } from './components/ProblemInput';
import { ExplanationDisplay } from './components/ExplanationDisplay';
import { AnswerForm } from './components/AnswerForm';
import { LoadingSpinner } from './components/LoadingSpinner';
import { getExplanationAndAnswer } from './services/geminiService';
import type { ExplanationResponse, ProblemPayload } from './logicflow-types';
import { LightbulbIcon } from './components/icons';

export default function App(): React.ReactNode {
  const [explanationSteps, setExplanationSteps] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for user profile in localStorage on initial load.
    const user = localStorage.getItem('userProfile');
    if (user) {
      setIsAuthenticated(true);
    } else {
      // If no user, redirect to the main login page.
      window.location.href = '/index.html';
    }
  }, []);

  const resetState = () => {
    setExplanationSteps([]);
    setCorrectAnswer('');
    setUserAnswer('');
    setIsAnswerSubmitted(false);
    setIsCorrect(null);
    setError(null);
  };

  const handleGenerate = useCallback(async (payload: ProblemPayload) => {
    resetState();
    setIsLoading(true);

    try {
      const result: ExplanationResponse = await getExplanationAndAnswer(payload);
      setExplanationSteps(result.explanation);
      setCorrectAnswer(result.finalAnswer);
    } catch (err) {
      console.error(err);
      setError('解説の生成中にエラーが発生しました。しばらくしてからもう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCheckAnswer = useCallback((answer: string) => {
    setUserAnswer(answer);
    // Simple string comparison. Could be improved with normalization.
    const isAnswerCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    setIsCorrect(isAnswerCorrect);
    setIsAnswerSubmitted(true);
  }, [correctAnswer]);

  // Render a blank screen or a loader while checking auth to prevent flicker
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input */}
          <div className="bg-indigo-900/50 rounded-2xl p-6 shadow-2xl border border-indigo-800">
            <ProblemInput onGenerate={handleGenerate} isLoading={isLoading} />
          </div>

          {/* Right Column: Output */}
          <div className="bg-indigo-900/50 rounded-2xl p-6 shadow-2xl border border-indigo-800 flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-sky-400 flex items-center gap-2">
              <LightbulbIcon />
              AIによるステップ解説
            </h2>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <LoadingSpinner />
                <p className="text-indigo-300">解説を生成しています...</p>
              </div>
            )}
            {error && (
              <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && explanationSteps.length === 0 && (
              <div className="flex items-center justify-center h-full text-indigo-400 text-center p-8 border-2 border-dashed border-indigo-700 rounded-lg">
                <p>ここに解説がステップバイステップで表示されます。</p>
              </div>
            )}
            {!isLoading && explanationSteps.length > 0 && (
              <>
                <ExplanationDisplay steps={explanationSteps} />
                <div className="border-t border-indigo-700 my-4"></div>
                <AnswerForm
                  onCheckAnswer={handleCheckAnswer}
                  isSubmitted={isAnswerSubmitted}
                  isCorrect={isCorrect}
                  correctAnswer={correctAnswer}
                  key={correctAnswer} // Reset form when a new problem is generated
                />
              </>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-indigo-400 text-sm">
        <p>Powered by Google Gemini API</p>
      </footer>
    </div>
  );
}