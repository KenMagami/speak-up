
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const e = React.createElement;

// Define interfaces for API responses to ensure type safety
interface Scores {
    content: number;
    composition: number;
    vocabulary: number;
    grammar: number;
}

interface Feedback {
    content: string;
    composition: string;
    vocabulary: string;
    grammar: string;
}

interface EikenResult {
    scores: Scores;
    feedback: Feedback;
    summary: string;
    modelAnswer: string;
}

interface FreestyleResult {
    scores: Scores;
    feedback: Feedback;
}

interface GrammarCorrection {
    original: string;
    corrected: string;
    explanation: string;
}

interface GrammarResult {
    corrections: GrammarCorrection[];
}

type ApiResult = EikenResult | FreestyleResult | GrammarResult;

// Grade-specific details for Eiken tests, now with multiple question types
const eikenGradeDetails: { [key: string]: { [key: string]: { prompt: string; wordCount: string; maxScore: number; passagePrompt?: string } } } = {
  '1級': {
    '意見論述問題': { prompt: "あなたは英検1級の意見論述問題を作成するAIです。以下の要件に従って、問題のTOPICを生成してください。\n\n# 要件\n- 国際関係、哲学、科学、社会システムなど、社会性の高い抽象的なトピックを扱ってください。\n- 受験者が賛成か反対かの立場を明確にして論じることができるように、「Agree or disagree: [トピック文]」という形式で生成してください。\n- 例: Agree or disagree: A lack of female leaders is a serious problem in Japan\n\n# 出力形式\n「Agree or disagree: 」から始まるトピックの英文のみを厳密に出力し、前後の説明や追加のテキストは一切含めないでください。", wordCount: "200-240", maxScore: 8 },
    '要約問題': { passagePrompt: "英検1級のライティング・要約問題用の英文を1つ生成してください。社会性の高いアカデミックな内容で、長さは200語程度にしてください。重要：生成された英文の本文のみを厳密に出力し、前後の説明やタイトル、追加のテキストは一切含めないでください。", prompt: "上記の英文を要約してください。", wordCount: "90-110", maxScore: 8 }
  },
  '準1級': {
    '意見論述問題': { prompt: "あなたは英検準1級の意見論述問題を作成するAIです。以下の要件に従って、問題セットをJSON形式で生成してください。\n\n# 要件\n- 環境、社会、教育、文化、経済など、社会性の高い抽象的なトピックを幅広く生成してください。AIやテクノロジーのような特定のテーマに偏らないように注意してください。\n- トピックの例：再生可能エネルギーの利用、伝統文化の保護、在宅勤務の普及、グローバル化の影響など。\n- そのトピックに関連する「POINTS」を4つ作成してください。POINTSは、受験者が賛成・反対のどちらの立場でも、エッセイの論拠として使いやすい単語または短いフレーズにしてください。\n- トピックは質問形式にしてください。\n\n# 出力形式 (JSON)\n厳密に以下のJSON形式で出力し、他のテキストは含めないでください。\n{\n  \"topic\": \"ここに生成したTOPICの英文を記述\",\n  \"points\": [\n    \"Point1\",\n    \"Point2\",\n    \"Point3\",\n    \"Point4\"\n  ]\n}", wordCount: "120-150", maxScore: 4 },
    '要約問題': { passagePrompt: "英検準1級のライティング・要約問題用の英文を1つ生成してください。社会問題に関する内容で、長さは100語程度にしてください。重要：生成された英文の本文のみを厳密に出力し、前後の説明やタイトル、追加のテキストは一切含めないでください。", prompt: "上記の英文を要約してください。", wordCount: "60-70", maxScore: 4 }
  },
  '2級': {
    '意見論述問題': { prompt: "あなたは英検2級の意見論述問題（QUESTION）を作成するAIです。受験者が自分の意見と理由を2つ述べやすいように、社会的なテーマ（例：海外での就労、学校給食、クレジットカードの使用など）について、一般論を提示した上で意見を問う形式の質問文を1つ生成してください。質問のレベルは「Today, many Japanese people work in foreign countries. Do you think the number of these people will increase in the future?」や「Some people say that going on a group tour is better than traveling alone. What do you think about that?」程度にしてください。重要：QUESTIONの英文のみを厳密に出力し、前後の説明や「QUESTION:」のような接頭辞は一切含めないでください。", wordCount: "80-100", maxScore: 4 },
    '要約問題': { passagePrompt: "あなたは英検2級の要約問題用の英文を作成するAIです。以下の例文と同等の語数（150語程度）と難易度で、社会的なトピックについてメリット・デメリットや複数の視点が含まれる英文を1つ生成してください。\n\n例文:\nWhen students go to college, some decide to live at home with their parents, and others decide to rent an apartment by themselves. There are other choices, too. These days, some of them choose to share a house with roommates.\n\nWhat are the reasons for this? Some students have a roommate who is good at math or science and can give advice about homework. Other students have a roommate from abroad and can learn about a foreign language through everyday conversations. Because of this, they have been able to improve their foreign language skills.\n\nOn the other hand, some students have a roommate who stays up late at night and watches TV. This can be noisy and make it difficult for others to get enough sleep. Some students have a roommate who rarely helps with cleaning the house. As a result, they have to spend a lot of time cleaning the house by themselves.\n\n重要：生成された英文の本文のみを厳密に出力し、前後の説明やタイトル、追加のテキストは一切含めないでください。", prompt: "上記の英文を要約してください。", wordCount: "45-55", maxScore: 4 }
  },
  '準2級': {
    '意見論述問題': { prompt: "あなたは英検準2級の意見論述問題（QUESTION）を作成するAIです。受験者が自分の意見と理由を2つ答えやすいように、「Do you think...?」の形式で、日常生活に関わる身近なテーマ（趣味、健康、買い物、学校生活など）に対する質問文を1つ生成してください。重要：QUESTIONの英文のみを厳密に出力し、前後の説明や「QUESTION:」のような接頭辞は一切含めないでください。", wordCount: "50-60", maxScore: 4 },
    'Eメール問題': { prompt: "あなたは英検準2級のEメール問題作成AIです。以下の指示に厳密に従って、Eメールの本文のみを生成してください。\n\n指示：\n1. 友人からのEメールを想定し、本文の長さは80語程度にすること。\n2. 内容は日常生活に関する身近なトピックにすること。\n3. 読み手が返信で答えるべき質問を1つ含めること。\n4. 返信で質問をすべき対象となる箇所として、本文中に下線部を1つ設定すること。下線は<u>タグで囲むこと。\n\n重要：Eメールの本文（例: Hi [Name], から Your friend, [Name] まで）のみを厳密に出力し、前後の説明、挨拶、追加のテキストは一切含めないでください。", wordCount: "40-50", maxScore: 4 }
  },
  '3級': {
    '意見論述問題': { prompt: "あなたは英検3級の意見論述問題（QUESTION）を作成するAIです。受験者が自分の考えとその理由を２つ英文で書きなさい。日常会話に関する基本的な質問文を1つ生成してください。質問のレベルは「Do you watch TV every day?」や「Where would you like to go this summer?」程度にしてください。重要：QUESTIONの英文のみを厳密に出力し、前後の説明や「QUESTION:」のような接頭辞は一切含めないでください。", wordCount: "25-35", maxScore: 4 },
    'Eメール問題': { prompt: "あなたは英検3級のEメール問題作成AIです。以下の指示に厳密に従って、Eメールの本文のみを生成してください。\n\n指示：\n1. 友人からの簡単なEメールを想定し、本文の長さは30〜40語程度にすること。\n2. 内容は日常生活に関するものとすること。\n3. 読み手が返信で答えるべき質問を2つ含めること。\n4. 質問箇所には<u>タグで囲んで下線部を設定すること。\n\n重要：Eメールの本文（例: Hi [Name], から Your friend, [Name] まで）のみを厳密に出力し、前後の説明、挨拶、追加のテキストは一切含めないでください。", wordCount: "15-25", maxScore: 4 }
  }
};

const Header = () => e('header', { className: 'header' },
  e('h1', null, 'WriteRight'),
  e('p', null, 'Your Personal AI English Writing Coach')
);

const HomeScreen = ({ handleNavigation }: { handleNavigation: (view: string) => void }) => {
  const features = [
    { key: 'eiken', title: '英検ライティング', description: '級別・形式別のお題で英作文を練習・採点' },
    { key: 'freestyle', title: '自由英作文', description: '文章を総合的に評価・フィードバック' },
    { key: 'grammar', title: '文法チェック', description: '英文の文法的な誤りを瞬時に修正' }
  ];

  return e('div', { className: 'home-grid' },
    features.map(feature => e('div', {
      key: feature.key,
      className: 'card feature-card',
      onClick: () => handleNavigation(feature.key)
    },
      e('h2', null, feature.title),
      e('p', null, feature.description)
    ))
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => e('button', { className: 'back-button', onClick },
    e('span', { "aria-hidden": true }, '←'),
    'ホームに戻る'
);

const ScoreCircle = ({ score, maxScore, size, strokeWidth }: { score: number, maxScore: number, size: number, strokeWidth: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / maxScore) * circumference;
  const percentage = Math.round((score / maxScore) * 100);

  const hue = (percentage / 100) * 120; // 0% = red (0), 100% = green (120)
  const color = `hsl(${hue}, 80%, 50%)`;

  return e('div', { className: 'score-circle', style: { width: size, height: size } },
    e('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`},
      e('circle', {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        strokeWidth: strokeWidth,
        fill: 'none',
      }),
      e('circle', {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        strokeWidth: strokeWidth,
        fill: 'none',
        stroke: color,
        strokeDasharray: circumference,
        strokeDashoffset: offset,
        strokeLinecap: 'round',
        transform: `rotate(-90 ${size/2} ${size/2})`
      })
    ),
    e('div', { className: 'score-circle-inner' },
      e('span', { className: 'score-value', style: { fontSize: size * 0.25 } }, score),
      e('span', { className: 'score-max', style: { fontSize: size * 0.15, marginLeft: '4px' } }, `/${maxScore}`)
    )
  );
};

const ResultDisplay = ({ result, grade, questionType, maxScore }: { result: ApiResult, grade?: string, questionType?: string, maxScore?: number }) => {
  if ('corrections' in result) {
    const res = result as GrammarResult;
    if (res.corrections.length === 0) {
      return e('div', { className: 'results-container card' },
        e('div', { className: 'results-header' }, e('h2', null, '文法チェック結果')),
        e('div', { className: 'feedback-card' },
          e('h3', null, '素晴らしい！'),
          e('p', null, '文法的な誤りは見つかりませんでした。')
        )
      );
    }
    return e('div', { className: 'results-container card grammar-result' },
      e('div', { className: 'results-header' }, e('h2', null, '文法チェック結果')),
      e('div', { className: 'feedback-section' },
        res.corrections.map((corr, index) =>
          e('div', { key: index, className: 'feedback-card' },
            e('h3', null, `修正点 ${index + 1}`),
            e('p', null, '原文: ', e('span', { className: 'original' }, corr.original)),
            e('p', null, '修正案: ', e('span', { className: 'corrected' }, corr.corrected)),
            e('p', null, e('strong', null, '解説: '), corr.explanation)
          )
        )
      )
    );
  }

  const res = result as EikenResult | FreestyleResult;
  const isEiken = 'summary' in res;
  const eikenRes = isEiken ? (res as EikenResult) : null;
  const currentMaxScore = isEiken ? maxScore! : 10;
  const totalMaxScore = currentMaxScore * 4;
  const totalScore = res.scores.content + res.scores.composition + res.scores.vocabulary + res.scores.grammar;

  return e('div', { className: 'results-container card' },
    e('div', { className: 'results-header' }, e('h2', null, isEiken ? '英検ライティング 採点結果' : '自由英作文 評価結果')),
    e('div', { className: 'total-score-gauge-wrapper' },
      e(ScoreCircle, { score: totalScore, maxScore: totalMaxScore, size: 180, strokeWidth: 15 }),
      e('div', { className: 'total-score-label' }, `総合評価: ${totalScore} / ${totalMaxScore}`)
    ),
    e('div', { className: 'score-breakdown-title' }, '項目別スコア'),
    e('div', { className: 'scores-grid' },
      Object.entries(res.scores).map(([category, score]) =>
        e('div', { key: category, className: 'score-circle-wrapper' },
          e(ScoreCircle, { score, maxScore: currentMaxScore, size: 100, strokeWidth: 8 }),
          e('div', { className: 'score-category' }, category)
        )
      )
    ),
    e('div', { className: 'feedback-section' },
      isEiken && eikenRes?.summary && e('div', { className: 'feedback-card' },
        e('h3', null, '総合アドバイス'),
        e('p', null, eikenRes.summary)
      ),
      Object.entries(res.feedback).map(([category, feedbackText]) =>
        e('div', { key: category, className: 'feedback-card' },
          e('h3', null, category),
          e('p', null, feedbackText)
        )
      ),
      isEiken && eikenRes?.modelAnswer && e('div', { className: 'feedback-card' },
        e('h3', null, '模範解答'),
        e('p', { style: { whiteSpace: 'pre-wrap' } }, eikenRes.modelAnswer)
      )
    )
  );
};

const EikenScreen = ({ handleNavigation, eikenGrade, setEikenGrade, eikenQuestionType, setEikenQuestionType, topic, setTopic, generateEikenTopic, handleImageImport, scoreEikenEssay, isLoading, error, result, setResult, userInput, setUserInput, eikenPoints }: any) => {
  const [showImageUpload, setShowImageUpload] = React.useState(false);
  const takePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const uploadImageInputRef = React.useRef<HTMLInputElement>(null);

  const wordCount = userInput.split(/\s+/).filter(Boolean).length;
  const targetWordCount = eikenGradeDetails[eikenGrade]?.[eikenQuestionType]?.wordCount || 'N/A';
  
  const questionTypesForGrade = React.useMemo(() => Object.keys(eikenGradeDetails[eikenGrade] || {}), [eikenGrade]);

  React.useEffect(() => {
    if (!questionTypesForGrade.includes(eikenQuestionType)) {
      setEikenQuestionType(questionTypesForGrade[0]);
    }
    setUserInput('');
    setTopic('');
    setResult(null);
  }, [eikenGrade, eikenQuestionType, questionTypesForGrade, setEikenQuestionType, setResult, setTopic, setUserInput]);

  React.useEffect(() => {
    const isEmail = (eikenGrade === '準2級' || eikenGrade === '3級') && eikenQuestionType === 'Eメール問題';
    if (topic && isEmail) {
        const nameMatch = topic.match(/(?:Your friend|Best wishes|From|Sincerely|Love),\s*(\w+)/i);
        const friendName = nameMatch ? nameMatch[1] : 'Friend';
        const initialText = `Hi ${friendName},\n\nThanks for your e-mail.\n\n\nBest wishes,`;
        setUserInput(initialText);
    }
  }, [topic, eikenGrade, eikenQuestionType, setUserInput]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          handleImageImport(file);
          setShowImageUpload(false);
      }
      // Reset file input value to allow re-uploading the same file
      event.target.value = '';
  };

  const handleTakePhoto = () => {
    takePhotoInputRef.current?.click();
  };
  const handleUploadImage = () => {
    uploadImageInputRef.current?.click();
  };
  
  const isGrade3EmailQuestion = eikenGrade === '3級' && eikenQuestionType === 'Eメール問題';
  const isGradePre2EmailQuestion = eikenGrade === '準2級' && eikenQuestionType === 'Eメール問題';
  const isSummaryQuestion = eikenQuestionType === '要約問題';
  const isGrade1OpinionQuestion = eikenGrade === '1級' && eikenQuestionType === '意見論述問題';
  const isGradePre1OpinionQuestion = eikenGrade === '準1級' && eikenQuestionType === '意見論述問題';
  const isGrade2OpinionQuestion = eikenGrade === '2級' && eikenQuestionType === '意見論述問題';
  const isGradePre2OpinionQuestion = eikenGrade === '準2級' && eikenQuestionType === '意見論述問題';
  const isGrade3OpinionQuestion = eikenGrade === '3級' && eikenQuestionType === '意見論述問題';
  const isGrade1SummaryQuestion = eikenGrade === '1級' && eikenQuestionType === '要約問題';
  const isGradePre1SummaryQuestion = eikenGrade === '準1級' && eikenQuestionType === '要約問題';


  let friendName = '友達';
  if (topic && (isGrade3EmailQuestion || isGradePre2EmailQuestion)) {
      const nameMatch = topic.match(/(?:Your friend|Best wishes|From|Sincerely|Love),\s*(\w+)/i);
      if (nameMatch && nameMatch[1]) {
          friendName = nameMatch[1];
      }
  }

  return e('div', { className: 'card' },
    e(BackButton, { onClick: () => handleNavigation('home') }),
    e('div', { className: 'screen-content' },
      e('div', { className: 'form-group form-group-horizontal' },
        e('label', { htmlFor: 'eiken-grade' }, '受験級:'),
        e('select', {
          id: 'eiken-grade',
          value: eikenGrade,
          onChange: (ev: React.ChangeEvent<HTMLSelectElement>) => setEikenGrade(ev.target.value),
          disabled: isLoading,
          "aria-label": "Select Eiken Grade"
        },
          Object.keys(eikenGradeDetails).map(grade => e('option', { key: grade, value: grade }, grade))
        ),
         e('label', { htmlFor: 'eiken-question-type' }, '問題形式:'),
        e('select', {
          id: 'eiken-question-type',
          value: eikenQuestionType,
          onChange: (ev: React.ChangeEvent<HTMLSelectElement>) => setEikenQuestionType(ev.target.value),
          disabled: isLoading,
          "aria-label": "Select Eiken Question Type"
        },
          questionTypesForGrade.map(qType => e('option', { key: qType, value: qType }, qType))
        )
      ),
      e('div', { className: 'topic-source-selector' },
        e('button', { className: 'btn btn-primary', onClick: () => setShowImageUpload(prev => !prev), disabled: isLoading }, '問題を取り込む'),
        e('button', { className: 'btn btn-primary', onClick: () => { generateEikenTopic(); setShowImageUpload(false); }, disabled: isLoading }, '問題を生成')
      ),
      showImageUpload && e('div', { className: 'image-upload-options' },
          e('button', { className: 'btn btn-primary', onClick: handleTakePhoto }, '写真を撮る'),
          e('button', { className: 'btn btn-primary', onClick: handleUploadImage }, '画像をアップロード'),
      ),
      isLoading && !topic && !result && e('div', { className: 'loading-spinner', role: 'status', "aria-label": "Loading topic" }),
      topic && e('div', { className: 'topic-card' }, 
        isGrade3EmailQuestion && e(React.Fragment, null,
            e('h3', { className: 'topic-section-title' }, 'Eメール問題'),
            e('p', { className: 'topic-instruction-text' }, `あなたは、外国人の友達 (${friendName}) から以下のEメールを受け取りました。 Eメールを読み、それに対する返信メールを英文で書きなさい。`),
            e('p', { className: 'topic-instruction-text' }, `あなたが書く返信メールの中で、友達 (${friendName}) からの2つの質問 (下線部) に対応する内容を、あなた自身で自由に考えて答えなさい。`),
            e('p', { className: 'topic-instruction-text' }, `あなたが書く返信メールの中でに書く英文の語数の目安は、 ${targetWordCount}語です。`),
            e('p', { className: 'topic-instruction-text' }, '解答欄の外に書かれたものは採点されません。'),
            e('p', { className: 'topic-instruction-text' }, `解答が友達 (${friendName}) のEメールに対応していないと判断された場合は, 0点と採点されることがあります。 友達 (${friendName}) のEメールの内容をよく読んでから答えてください。`),
            e('p', { className: 'topic-instruction-text' }, '［　］ の下の Best wishes, の後にあなたの名前を書く必要はありません。'),
            e('hr', { className: 'instructions-divider'}),
        ),
        isGradePre2EmailQuestion && e(React.Fragment, null,
            e('h3', { className: 'topic-section-title' }, 'Eメール問題'),
            e('p', { className: 'topic-instruction-text' }, `●あなたは外国人の知り合い (${friendName}) から、Eメールで質問を受け取りました。この質問にわかりやすく答える返信メールを英文で書きなさい。`),
            e('p', { className: 'topic-instruction-text' }, `●あなたが書く返信メールの中で、(${friendName}) のEメール文中の下線部についてあなたがより理解を深めるために、下線部の特徴を問う具体的な質問を2つしなさい。`),
            e('p', { className: 'topic-instruction-text' }, `●あなたが書く返信メールの中に書く英文の語数の目安は${targetWordCount}語です。`),
            e('p', { className: 'topic-instruction-text' }, `●解答が (${friendName}) のEメールに対応していないと判断された場合は、0点と採点されることがあります。(${friendName}) のEメールの内容をよく読んでから答えて下さい。`),
            e('p', { className: 'topic-instruction-text' }, '●□の下のBest wishes.の後にあなたの名前を書く必要はありません。'),
            e('hr', { className: 'instructions-divider'}),
        ),
        isGradePre1SummaryQuestion && e(React.Fragment, null,
             e('h3', { className: 'topic-section-title' }, '要約問題'),
             e('p', { className: 'topic-instruction-text' }, '● Read the article below and summarize it in your own words as far as possible in English.'),
             e('p', { className: 'topic-instruction-text' }, `● Summarize it between ${targetWordCount} words.`),
             e('p', { className: 'topic-instruction-text' }, '● Write your summary in the space provided on Side A of your answer sheet. Any writing outside the space will not be graded.'),
             e('hr', { className: 'instructions-divider'}),
        ),
        isGrade1SummaryQuestion && e(React.Fragment, null,
             e('h3', { className: 'topic-section-title' }, '要約問題'),
             e('p', { className: 'topic-instruction-text' }, '● Read the article below and summarize it in your own words as far as possible in English.'),
             e('p', { className: 'topic-instruction-text' }, `● Summarize it between ${targetWordCount} words.`),
             e('p', { className: 'topic-instruction-text' }, '● Write your summary in the space provided on Side A of your answer sheet. Any writing outside the space will not be graded.'),
             e('hr', { className: 'instructions-divider'}),
        ),
        isSummaryQuestion && !isGradePre1SummaryQuestion && !isGrade1SummaryQuestion && e(React.Fragment, null,
             e('h3', { className: 'topic-section-title' }, '要約問題'),
             e('p', { className: 'topic-instruction-text' }, '● 以下の英文を読んで、その内容を英語で要約し、解答欄に記入しなさい。'),
             e('p', { className: 'topic-instruction-text' }, `● 語数の目安は${targetWordCount}語です。`),
             e('p', { className: 'topic-instruction-text' }, '● 解答欄の外に書かれたものは採点されません。'),
             e('p', { className: 'topic-instruction-text' }, '● 解答が英文の要約になっていないと判断された場合は、0点と採点されることがあります。英文をよく読んでから答えてください。'),
             e('hr', { className: 'instructions-divider'}),
        ),
        isGrade1OpinionQuestion && e(React.Fragment, null,
             e('p', { className: 'topic-instruction-text' }, '● Write an essay on the given TOPIC.'),
             e('p', { className: 'topic-instruction-text' }, '● Give THREE reasons to support your answer.'),
             e('p', { className: 'topic-instruction-text' }, '● Structure: introduction, main body, and conclusion'),
             e('p', { className: 'topic-instruction-text' }, `● Suggested length: ${targetWordCount} words`),
             e('p', { className: 'topic-instruction-text' }, '● Write your essay in the space provided on Side B of your answer sheet. Any writing outside the space will not be graded.'),
             e('hr', { className: 'instructions-divider'}),
             e('h3', { className: 'topic-section-title' }, 'TOPIC'),
             e('p', { style: { fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' } }, topic),
        ),
        isGradePre1OpinionQuestion && e(React.Fragment, null,
             e('p', { className: 'topic-instruction-text' }, '● Write an essay on the given TOPIC.'),
             e('p', { className: 'topic-instruction-text' }, '● Use Two of the Points below to support your answer.'),
             e('p', { className: 'topic-instruction-text' }, '● Structure: Introduction, main body, and conclusion'),
             e('p', { className: 'topic-instruction-text' }, `● Suggested length: ${targetWordCount} words`),
             e('hr', { className: 'instructions-divider'}),
             e('h3', { className: 'topic-section-title' }, 'TOPIC'),
             e('p', { style: { fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '1.5rem' } }, topic),
             e('h3', { className: 'topic-section-title' }, 'POINTS'),
             e('div', { className: 'points-container' },
                eikenPoints.map((point: string) => e('div', { key: point, className: 'point-item' }, `・ ${point}`))
             )
        ),
        isGrade2OpinionQuestion && e(React.Fragment, null,
             e('p', { className: 'topic-instruction-text' }, '● QUESTIONについて、あなたの意見とその理由を２つ書きなさい。'),
             e('p', { className: 'topic-instruction-text' }, `● 語数の目安は${targetWordCount}語です。`),
             e('p', { className: 'topic-instruction-text' }, '● 解答は、解答欄に書きなさい。解答欄の外に書かれたものは採点されません。'),
             e('p', { className: 'topic-instruction-text' }, '● 解答がQUESTIONに対応していないと判断された場合は、0点と採点されることがあります。QUESTIONをよく読んでから答えてください。'),
             e('hr', { className: 'instructions-divider'}),
             e('h3', { className: 'topic-section-title' }, 'QUESTION')
        ),
        isGradePre2OpinionQuestion && e(React.Fragment, null,
             e('p', { className: 'topic-instruction-text' }, '● QUESTIONについて、あなたの意見とその理由を２つ英文で書きなさい。'),
             e('p', { className: 'topic-instruction-text' }, `● 語数の目安は${targetWordCount}語です。`),
             e('p', { className: 'topic-instruction-text' }, '● 解答は、解答欄に書きなさい。解答欄の外に書かれたものは採点されません。'),
             e('p', { className: 'topic-instruction-text' }, '● 解答がQUESTIONに対応していないと判断された場合は、0点と採点されることがあります。QUESTIONをよく読んでから答えてください。'),
             e('hr', { className: 'instructions-divider'}),
             e('h3', { className: 'topic-section-title' }, 'QUESTION')
        ),
        isGrade3OpinionQuestion && e(React.Fragment, null,
             e('p', { className: 'topic-instruction-text' }, '● QUESTIONについて、あなたの考えとその理由を２つ英文で書きなさい。'),
             e('p', { className: 'topic-instruction-text' }, `● 語数の目安は${targetWordCount}語です。`),
             e('p', { className: 'topic-instruction-text' }, '● 解答は、解答欄に書きなさい。解答欄の外に書かれたものは採点されません。'),
             e('p', { className: 'topic-instruction-text' }, '● 解答がQUESTIONに対応していないと判断された場合は、0点と採点されることがあります。QUESTIONをよく読んでから答えてください。'),
             e('hr', { className: 'instructions-divider'}),
             e('h3', { className: 'topic-section-title' }, 'QUESTION')
        ),
        !isGradePre1OpinionQuestion && !isGrade1OpinionQuestion && e('p', { dangerouslySetInnerHTML: { __html: topic } })
      ),
      topic && e('div', { className: 'form-group' },
        e('textarea', {
          id: 'user-input-eiken',
          value: userInput,
          onChange: (ev: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(ev.target.value),
          placeholder: 'ここに英文を入力してください',
          disabled: isLoading,
          "aria-label": "Enter your essay here"
        }),
        e('div', { className: 'textarea-footer' },
          e('span', null, `Word Count: ${wordCount} (目安: ${targetWordCount})`)
        )
      ),
      topic && e('button', { className: 'btn btn-primary', onClick: scoreEikenEssay, disabled: isLoading || wordCount === 0 },
        '採点する'
      ),
      isLoading && (result || topic) && e('div', { className: 'loading-spinner', role: 'status', "aria-label": "Loading result" }),
      error && e('p', { className: 'error-message' }, error),
      result && e(ResultDisplay, { result, grade: eikenGrade, questionType: eikenQuestionType, maxScore: eikenGradeDetails[eikenGrade]?.[eikenQuestionType]?.maxScore }),
      e('input', { ref: takePhotoInputRef, type: 'file', accept: 'image/*', capture: 'environment', className: 'hidden-file-input', onChange: handleFileChange }),
      e('input', { ref: uploadImageInputRef, type: 'file', accept: 'image/*', className: 'hidden-file-input', onChange: handleFileChange })
    )
  );
};

const FreestyleScreen = ({ handleNavigation, scoreFreestyleEssay, isLoading, error, result, userInput, setUserInput }: any) => {
  const wordCount = userInput.split(/\s+/).filter(Boolean).length;

  return e('div', { className: 'card' },
    e(BackButton, { onClick: () => handleNavigation('home') }),
    e('div', { className: 'screen-content' },
      e('div', { className: 'form-group' },
        e('label', { htmlFor: 'user-input-freestyle' }, '評価したい英文を入力してください'),
        e('textarea', {
          id: 'user-input-freestyle',
          value: userInput,
          onChange: (ev: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(ev.target.value),
          placeholder: 'ここに英文を入力してください',
          disabled: isLoading,
          "aria-label": "Enter your text here"
        }),
        e('div', { className: 'textarea-footer' },
          e('span', null, `Word Count: ${wordCount}`)
        )
      ),
      e('button', { className: 'btn btn-primary', onClick: scoreFreestyleEssay, disabled: isLoading || wordCount === 0 },
        '評価する'
      ),
      isLoading && e('div', { className: 'loading-spinner', role: 'status', "aria-label": "Loading result" }),
      error && e('p', { className: 'error-message' }, error),
      result && e(ResultDisplay, { result })
    )
  );
};

const GrammarScreen = ({ handleNavigation, checkGrammar, isLoading, error, result, userInput, setUserInput }: any) => {
  const wordCount = userInput.split(/\s+/).filter(Boolean).length;

  return e('div', { className: 'card' },
    e(BackButton, { onClick: () => handleNavigation('home') }),
    e('div', { className: 'screen-content' },
      e('div', { className: 'form-group' },
        e('label', { htmlFor: 'user-input-grammar' }, 'チェックしたい英文を入力してください'),
        e('textarea', {
          id: 'user-input-grammar',
          value: userInput,
          onChange: (ev: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(ev.target.value),
          placeholder: 'ここに英文を入力してください',
          disabled: isLoading,
          "aria-label": "Enter your text here"
        }),
        e('div', { className: 'textarea-footer' },
          e('span', null, `Word Count: ${wordCount}`)
        )
      ),
      e('button', { className: 'btn btn-primary', onClick: checkGrammar, disabled: isLoading || wordCount === 0 },
        'チェックする'
      ),
      isLoading && e('div', { className: 'loading-spinner', role: 'status', "aria-label": "Loading result" }),
      error && e('p', { className: 'error-message' }, error),
      result && e(ResultDisplay, { result })
    )
  );
};


const App = () => {
  const [currentView, setCurrentView] = React.useState('home');
  const [userInput, setUserInput] = React.useState('');
  const [eikenGrade, setEikenGrade] = React.useState('3級');
  const [eikenQuestionType, setEikenQuestionType] = React.useState('意見論述問題');
  const [topic, setTopic] = React.useState('');
  const [eikenPoints, setEikenPoints] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const ai = React.useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  const handleNavigation = (view: string) => {
    setCurrentView(view);
    setUserInput('');
    setTopic('');
    setEikenPoints([]);
    setResult(null);
    setError(null);
  };

  const generateEikenTopic = async () => {
    setIsLoading(true);
    setError(null);
    setTopic('');
    setEikenPoints([]);
    setResult(null);
    setUserInput('');

    try {
        const details = eikenGradeDetails[eikenGrade][eikenQuestionType];
        
        if (eikenGrade === '準1級' && eikenQuestionType === '意見論述問題') {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: details.prompt,
                config: { responseMimeType: "application/json" }
            });
            const parsedResult = JSON.parse(response.text.trim());
            setTopic(parsedResult.topic);
            setEikenPoints(parsedResult.points);
        } else if (details.passagePrompt) { // For summary questions
            const passageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: details.passagePrompt
            });
            const passage = passageResponse.text;
            setTopic(passage);
        } else { // For other questions
            const topicResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: details.prompt
            });
            setTopic(topicResponse.text.trim());
        }
    } catch (err) {
        console.error("Error generating Eiken topic:", err);
        setError("トピックの生成中にエラーが発生しました。もう一度お試しください。");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleImageImport = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setTopic('');
    setEikenPoints([]);
    setResult(null);
    setUserInput('');

    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            const imagePart = { inlineData: { mimeType: file.type, data: base64String } };

            let promptText = `This is an image of an Eiken Grade ${eikenGrade}, type "${eikenQuestionType}" writing test problem. Please extract only the topic/passage text from this image. Output only the text itself, without any extra explanations or formatting.`;
            let config = {};

            if (eikenGrade === '準1級' && eikenQuestionType === '意見論述問題') {
                promptText = `This is an image of an Eiken Grade Pre-1 writing test problem. Please extract the TOPIC and the 4 POINTS from this image. Output the result in a strict JSON format: {"topic": "...", "points": ["...", "...", "...", "..."]}. Do not include any other text.`;
                config = { responseMimeType: "application/json" };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: promptText }] },
                config
            });

            const extractedText = response.text.trim();

            if (eikenGrade === '準1級' && eikenQuestionType === '意見論述問題') {
                const parsedResult = JSON.parse(extractedText);
                setTopic(parsedResult.topic);
                setEikenPoints(parsedResult.points);
            } else {
                setTopic(extractedText);
            }

        } catch (err) {
            console.error("Error importing Eiken topic from image:", err);
            setError("画像からのトピック読み込みに失敗しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const createPrompt = (template: string, replacements: { [key: string]: string | number }) => {
    return template.replace(/\{(\w+)\}/g, (placeholder, key) => {
        return replacements[key] !== undefined ? String(replacements[key]) : placeholder;
    });
  };

  const scoreEikenEssay = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const details = eikenGradeDetails[eikenGrade][eikenQuestionType];
    const maxScore = details.maxScore;
    
    let topicForPrompt = topic.replace(/<[^>]*>/g, ''); // Remove HTML tags from topic
    if (eikenGrade === '準1級' && eikenQuestionType === '意見論述問題' && eikenPoints.length > 0) {
        topicForPrompt += `\n\nPOINTS:\n${eikenPoints.map(p => `・${p}`).join('\n')}`;
    }
    
    const promptTemplate = `
      あなたは英検の採点官AIです。以下のユーザーの英作文を、指定された級と問題形式の採点基準に基づいて厳格に評価してください。

      # 採点情報
      - 受験級: {grade}
      - 問題形式: {questionType}
      - お題: {topic}

      # ユーザーの英作文
      {essay}

      # 採点基準
      評価は「内容」「構成」「語彙」「文法」の4つの観点で行ってください。
      各観点の満点は {maxScore} 点です。評価は0点から満点までの整数で行ってください。

      # 出力形式
      以下のJSON形式に厳密に従って、日本語で回答を生成してください。JSON以外のテキストは絶対に追加しないでください。

      {
        "scores": {
          "content": <内容のスコア(整数)>,
          "composition": <構成のスコア(整数)>,
          "vocabulary": <語彙のスコア(整数)>,
          "grammar": <文法のスコア(整数)>
        },
        "feedback": {
          "content": "<内容に関する具体的で分かりやすいフィードバック>",
          "composition": "<構成に関する具体的で分かりやすいフィードバック>",
          "vocabulary": "<語彙に関する具体的で分かりやすいフィードバック>",
          "grammar": "<文法に関する具体的で分かりやすいフィードバック>"
        },
        "summary": "<全体的な評価と、今後の改善点に関する総合的なアドバイス>",
        "modelAnswer": "<このお題に対する模範解答。シンプルで分かりやすい文章で作成してください。>"
      }
    `;
    
    const prompt = createPrompt(promptTemplate, {
        grade: eikenGrade,
        questionType: eikenQuestionType,
        topic: topicForPrompt,
        essay: userInput,
        maxScore: maxScore
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonStr = response.text.trim();
        const parsedResult: EikenResult = JSON.parse(jsonStr);
        setResult(parsedResult);
    } catch (err) {
        console.error("Error scoring Eiken essay:", err);
        setError("採点中にエラーが発生しました。もう一度お試しください。");
    } finally {
        setIsLoading(false);
    }
  };
  
  const scoreFreestyleEssay = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const promptTemplate = `
      あなたは英語のエキスパートAIです。以下のユーザーの英作文を総合的に評価してください。

      # ユーザーの英作文
      {essay}

      # 評価基準
      評価は「内容(Content)」「構成(Composition)」「語彙(Vocabulary)」「文法(Grammar)」の4つの観点で行ってください。
      各観点の満点は10点です。評価は0点から10点までの整数で行ってください。

      # 出力形式
      以下のJSON形式に厳密に従って、日本語で回答を生成してください。JSON以外のテキストは絶対に追加しないでください。

      {
        "scores": {
          "content": <内容のスコア(整数)>,
          "composition": <構成のスコア(整数)>,
          "vocabulary": <語彙のスコア(整数)>,
          "grammar": <文法のスコア(整数)>
        },
        "feedback": {
          "content": "<内容に関する具体的で分かりやすいフィードバック>",
          "composition": "<構成に関する具体的で分かりやすいフィードバック>",
          "vocabulary": "<語彙に関する具体的で分かりやすいフィードバック>",
          "grammar": "<文法に関する具体的で分かりやすいフィードバック>"
        }
      }
    `;

    const prompt = createPrompt(promptTemplate, { essay: userInput });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonStr = response.text.trim();
        const parsedResult: FreestyleResult = JSON.parse(jsonStr);
        setResult(parsedResult);
    } catch (err) {
        console.error("Error scoring freestyle essay:", err);
        setError("評価中にエラーが発生しました。もう一度お試しください。");
    } finally {
        setIsLoading(false);
    }
  };

  const checkGrammar = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const prompt = `
      以下の英文に含まれる文法的な誤りをすべて特定し、修正案と日本語での簡単な解説を加えてください。
      誤りがない場合は、correctionsを空の配列 [] にしてください。

      英文:
      "${userInput}"

      出力は必ず以下のJSON形式に従ってください。JSON以外のテキストは絶対に追加しないでください。
      {
        "corrections": [
          {
            "original": "誤りを含む元の文の一部",
            "corrected": "文法的に正しい修正案",
            "explanation": "なぜそのように修正するのかの簡単な日本語での解説"
          }
        ]
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const jsonStr = response.text.trim();
        const parsedResult: GrammarResult = JSON.parse(jsonStr);
        setResult(parsedResult);
    } catch (err) {
        console.error("Error checking grammar:", err);
        setError("文法チェック中にエラーが発生しました。もう一度お試しください。");
    } finally {
        setIsLoading(false);
    }
  };

  const renderScreen = () => {
    switch (currentView) {
      case 'eiken':
        return e(EikenScreen, { handleNavigation, eikenGrade, setEikenGrade, eikenQuestionType, setEikenQuestionType, topic, setTopic, generateEikenTopic, handleImageImport, scoreEikenEssay, isLoading, error, result, setResult, userInput, setUserInput, eikenPoints });
      case 'freestyle':
        return e(FreestyleScreen, { handleNavigation, scoreFreestyleEssay, isLoading, error, result, userInput, setUserInput, setResult });
      case 'grammar':
        return e(GrammarScreen, { handleNavigation, checkGrammar, isLoading, error, result, userInput, setUserInput, setResult });
      default:
        return e(HomeScreen, { handleNavigation });
    }
  };

  return e('div', { className: 'app-container' },
    e('a', { href: '/index.html', className: 'back-to-hub-link' }, '← Hubに戻る'),
    e(Header),
    renderScreen()
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(e(React.StrictMode, null, e(App)));
