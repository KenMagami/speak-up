
import React, { useState } from 'react';

interface AnswerFormProps {
  onCheckAnswer: (answer: string) => void;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  correctAnswer: string;
}

// FIX: Changed component signature to use React.FC to correctly type it as a React component, allowing special props like 'key'.
export const AnswerForm: React.FC<AnswerFormProps> = ({ onCheckAnswer, isSubmitted, isCorrect, correctAnswer }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckAnswer(answer);
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-sky-400 mb-3">最終的な答えは？</h3>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="答えを入力"
          className="flex-grow bg-indigo-950/70 border border-indigo-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={isSubmitted}
        />
        <button
          type="submit"
          className="bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-indigo-600 disabled:opacity-50"
          disabled={isSubmitted}
        >
          答え合わせ
        </button>
      </form>
      {isSubmitted && (
        <div className={`mt-4 p-4 rounded-lg text-center ${isCorrect ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {isCorrect ? '正解です！' : `残念、不正解です。正しい答えは「${correctAnswer}」です。`}
        </div>
      )}
    </div>
  );
};
