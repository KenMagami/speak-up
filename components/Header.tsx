
import React from 'react';

export const Header = (): React.ReactNode => (
  <header className="bg-indigo-900/50 p-4 shadow-lg border-b border-indigo-800 relative">
    <a href="/index.html" className="absolute top-1/2 left-4 md:left-6 -translate-y-1/2 text-sky-300 hover:text-sky-100 transition-colors font-semibold px-3 py-1 border border-sky-700 rounded-lg hover:bg-sky-800/50 text-sm md:text-base">
        &larr; Hubに戻る
    </a>
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-center text-sky-400">LogicFlow</h1>
      <p className="text-center text-indigo-300">AIが数学や論理の問題をステップバイステップで解説します</p>
    </div>
  </header>
);