
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { db } from "./firebase"; // Import the initialized db instance
import { factbookContentData, myWayContentData } from "./data";

// --- Type Declarations ---
declare global {
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
    // Firebase Environment Variables
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
  }

  interface Window {
    google: any;
    onGoogleLibraryLoad: () => void;
  }
}

interface UserProfile {
    name: string;
    email: string;
    picture: string;
    role?: 'student' | 'teacher';
    grade?: number | null;
    class?: number | null;
    studentNumber?: number | null;
    isAuthorizedTeacher?: boolean;
}

interface ScoreResult {
    pronunciationScore: number;
    fluencyScore: number;
    intonationScore: number;
}

interface Sentence {
    en: string;
    ja?: string;
}

interface FactbookChapter {
    chapter: string;
    sentences: Sentence[];
}

interface MyWaySection {
    section: string;
    sentences: Sentence[];
}

interface MyWayLesson {
    lesson: string;
    sections: MyWaySection[];
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    questions: string[];
    assignedClasses?: string[];
    retakePolicy?: 'once' | 'multiple';
    updatedAt?: string;
}

interface TestResultFromDB {
    studentEmail: string;
    studentName: string;
    testTitle: string;
    completedAt: string;
    scores: {
        pronunciation: number;
        fluency: number;
        intonation: number;
    };
}


// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const appContainer = document.getElementById('app') as HTMLElement;
const googleSignInButton = document.getElementById('google-signin-button') as HTMLDivElement;

// User Profile Elements
const userProfileEl = document.getElementById('user-profile') as HTMLDivElement;
const userNameEl = document.getElementById('user-name') as HTMLSpanElement;
const userAvatarEl = document.getElementById('user-avatar') as HTMLImageElement;
const signOutBtn = document.getElementById('signout-btn') as HTMLButtonElement;
const adminLink = document.getElementById('admin-link') as HTMLAnchorElement;


// Assignments Section
const assignmentsSection = document.getElementById('assignments-section') as HTMLElement;
const openAssignmentsBtn = document.getElementById('open-assignments-btn') as HTMLDivElement;
const newAssignmentsBadge = document.getElementById('new-assignments-badge') as HTMLSpanElement;

// Assignment Details Modal
const assignmentDetailsModal = document.getElementById('assignment-details-modal') as HTMLDivElement;
const closeAssignmentDetailsModalBtn = document.getElementById('close-assignment-details-modal-btn') as HTMLButtonElement;
const incompleteAssignmentsList = document.getElementById('incomplete-assignments-list') as HTMLDivElement;
const completedAssignmentsList = document.getElementById('completed-assignments-list') as HTMLDivElement;

// Result Details Modal
const resultDetailsModal = document.getElementById('result-details-modal') as HTMLDivElement;
const closeResultDetailsModalBtn = document.getElementById('close-result-details-modal-btn') as HTMLButtonElement;
const resultModalTitle = document.getElementById('result-modal-title') as HTMLHeadingElement;
const resultModalDate = document.getElementById('result-modal-date') as HTMLParagraphElement;
const resultPronunciationEl = document.getElementById('result-pronunciation') as HTMLParagraphElement;
const resultFluencyEl = document.getElementById('result-fluency') as HTMLParagraphElement;
const resultIntonationEl = document.getElementById('result-intonation') as HTMLParagraphElement;


// Practice Section Elements
const practiceSection = document.getElementById('practice-section') as HTMLElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const recordBtnIcon = recordBtn.querySelector('svg') as SVGElement;
const playModelBtn = document.getElementById('play-model-btn') as HTMLButtonElement;
const sentenceInputEl = document.getElementById('sentence-input') as HTMLTextAreaElement;
const clearSentenceBtn = document.getElementById('clear-sentence-btn') as HTMLButtonElement;
const selectSentenceBtn = document.getElementById('select-sentence-btn') as HTMLButtonElement;
const startTestBtn = document.getElementById('start-test-btn') as HTMLButtonElement;

// Test Section Elements
const testSection = document.getElementById('test-section') as HTMLElement;
const testProgressEl = document.getElementById('test-progress') as HTMLParagraphElement;
const testSentenceDisplayEl = document.getElementById('test-sentence-display') as HTMLDivElement;
const testRecordBtn = document.getElementById('test-record-btn') as HTMLButtonElement;
const testRecordBtnIcon = testRecordBtn.querySelector('svg') as SVGElement;
const testPlayModelBtn = document.getElementById('test-play-model-btn') as HTMLButtonElement;
const nextQuestionBtn = document.getElementById('next-question-btn') as HTMLButtonElement;
const endTestBtn = document.getElementById('end-test-btn') as HTMLButtonElement;


// Results Elements
const resultsSection = document.getElementById('results-section') as HTMLElement;
const loader = document.getElementById('loader') as HTMLElement;
const resultsContent = document.getElementById('results-content') as HTMLElement;
const pronunciationScoreEl = document.getElementById('pronunciation-score') as HTMLParagraphElement;
const fluencyScoreEl = document.getElementById('fluency-score') as HTMLParagraphElement;
const intonationScoreEl = document.getElementById('intonation-score') as HTMLParagraphElement;
const pronunciationGaugeEl = document.getElementById('pronunciation-gauge') as HTMLDivElement;
const fluencyGaugeEl = document.getElementById('fluency-gauge') as HTMLDivElement;
const intonationGaugeEl = document.getElementById('intonation-gauge') as HTMLDivElement;
const transcriptionTextEl = document.getElementById('transcription-text') as HTMLDivElement;
const adviceTextEl = document.getElementById('advice-text') as HTMLParagraphElement;
const overallProgressCircle = document.getElementById('overall-progress-circle') as unknown as SVGCircleElement;
const overallScoreValueEl = document.getElementById('overall-score-value') as HTMLSpanElement;

// Sentence Modal Elements
const sentenceModal = document.getElementById('sentence-modal') as HTMLDivElement;
const closeSentenceModalBtn = document.getElementById('close-sentence-modal-btn') as HTMLButtonElement;
const factbookListEl = document.getElementById('factbook-list') as HTMLDivElement;
const mywayListEl = document.getElementById('myway-list') as HTMLDivElement;
const modalTabs = document.querySelectorAll('#sentence-modal .modal-tab-btn');
const modalTabContents = document.querySelectorAll('#sentence-modal .modal-tab-content');

// Test Setup Modal Elements
const testSetupModal = document.getElementById('test-setup-modal') as HTMLDivElement;
const closeTestSetupBtn = document.getElementById('close-test-setup-modal-btn') as HTMLButtonElement;
const testSetupModalTabs = document.querySelectorAll('#test-setup-modal .modal-tab-btn');
const testSetupModalTabContents = document.querySelectorAll('#test-setup-modal .modal-tab-content');
const factbookChapterListEl = document.getElementById('factbook-chapter-list') as HTMLDivElement;
const mywaySectionListEl = document.getElementById('myway-section-list') as HTMLDivElement;
const factbookQuestionCountInput = document.getElementById('factbook-question-count') as HTMLInputElement;
const startFactbookTestBtn = document.getElementById('start-factbook-test-btn') as HTMLButtonElement;
const startMyWayTestBtn = document.getElementById('start-myway-test-btn') as HTMLButtonElement;

// Test Summary Modal Elements
const testSummaryModal = document.getElementById('test-summary-modal') as HTMLDivElement;
const closeSummaryBtn = document.getElementById('close-summary-modal-btn') as HTMLButtonElement;
const summaryPronunciationEl = document.getElementById('summary-pronunciation') as HTMLParagraphElement;
const summaryFluencyEl = document.getElementById('summary-fluency') as HTMLParagraphElement;
const summaryIntonationEl = document.getElementById('summary-intonation') as HTMLParagraphElement;

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal') as HTMLDivElement;
const profileModalTitle = document.getElementById('profile-modal-title') as HTMLHeadingElement;
const profileModalIntro = document.getElementById('profile-modal-intro') as HTMLParagraphElement;
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn') as HTMLButtonElement;
const profileForm = document.getElementById('profile-form') as HTMLFormElement;
const roleSelectionGroup = document.getElementById('role-selection-group') as HTMLDivElement;
const roleRadios = document.querySelectorAll<HTMLInputElement>('input[name="user-role"]');
const studentInfoFields = document.getElementById('student-info-fields') as HTMLDivElement;
const userGradeInput = document.getElementById('user-grade') as HTMLInputElement;
const userClassInput = document.getElementById('user-class') as HTMLInputElement;
const userStudentNumberInput = document.getElementById('user-student-number') as HTMLInputElement;
const saveProfileBtn = document.getElementById('save-profile-btn') as HTMLButtonElement;


// Toast Notification
const toastNotification = document.getElementById('toast-notification') as HTMLDivElement;


// --- App State ---
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;
let isLoading = false;
let currentUser: UserProfile | null = null;
let isInitialProfileSetup = false;
let voices: SpeechSynthesisVoice[] = [];

// Test Mode State
let isTestModeActive = false;
let testQuestions: string[] = [];
let currentQuestionIndex = 0;
let testResults: ScoreResult[] = [];
let currentTestTitle: string | null = null;


const micIcon = `<path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>`;
const stopIcon = `<path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z"/>`;

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check for cached user
    const cachedUser = localStorage.getItem('userProfile');
    if (cachedUser) {
        const user = JSON.parse(cachedUser);
        checkUserProfile(user);
    } else {
        showLogin();
    }
}

// --- Authentication ---
window.onGoogleLibraryLoad = () => {
    window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(
        googleSignInButton,
        { theme: 'outline', size: 'large' }
    );
};

async function handleCredentialResponse(response: any) {
    const idToken = response.credential;
    // Decode JWT to get user profile
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decodedToken = JSON.parse(jsonPayload);
    
    const isAllowedDomain = decodedToken.hd === 'seibudai-chiba.jp';
    const isAllowedEmail = decodedToken.email === 'kenmagami1003@gmail.com';

    if (!isAllowedDomain && !isAllowedEmail) {
        alert('このアプリケーションを利用する権限がありません。');
        return;
    }

    const user: UserProfile = {
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture,
    };

    localStorage.setItem('userProfile', JSON.stringify(user));
    await checkUserProfile(user);
}

async function checkUserProfile(user: UserProfile) {
    try {
        const isAuthorizedTeacher = await api.isUserTeacher(user.email);
        const userDoc = await api.getUserProfile(user.email);

        if (userDoc) {
            currentUser = { ...user, ...userDoc, isAuthorizedTeacher };
            showApp(currentUser);
        } else {
            currentUser = { ...user, isAuthorizedTeacher };
            if (isAuthorizedTeacher) {
                currentUser.role = 'teacher';
            }
            openProfileModal(true); // Initial setup
        }
    } catch (error) {
        console.error("Error checking user profile:", error);
        showToast("ユーザー情報の確認に失敗しました。", "error");
        showLogin();
    }
}

function signOut() {
    currentUser = null;
    localStorage.removeItem('userProfile');
    window.google.accounts.id.disableAutoSelect();
    showLogin();
}

// --- UI Updates ---
function showLogin() {
    loginScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

async function showApp(user: UserProfile) {
    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    userProfileEl.classList.remove('hidden');
    userNameEl.textContent = user.name;
    userAvatarEl.src = user.picture;

    // Check authorization status to show admin link
    if (user.isAuthorizedTeacher) {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }

    loadInitialAssignmentData(user);
}

function setLoading(isLoadingState: boolean) {
    isLoading = isLoadingState;
    recordBtn.disabled = isLoading;
    // You can add more UI updates for loading state here, e.g., showing a spinner
}

function getScoreClass(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'score-high';
    if (percentage >= 50) return 'score-medium';
    return 'score-low';
}

function updateGauge(gaugeEl: HTMLElement, score: number, maxScore: number = 10) {
    const percentage = (score / maxScore) * 100;
    gaugeEl.style.width = `${percentage}%`;
    const scoreClass = getScoreClass(score, maxScore);
    gaugeEl.classList.remove('score-low', 'score-medium', 'score-high');
    gaugeEl.classList.add(scoreClass);
}

function displayResults(result: any, originalSentence: string) {
    // Safely get scores, defaulting to 0 if null or undefined
    const pronunciationScore = result.pronunciationScore ?? 0;
    const fluencyScore = result.fluencyScore ?? 0;
    const intonationScore = result.intonationScore ?? 0;
    const transcription = result.transcription || "";
    const incorrectWords = result.incorrectWords || [];
    const advice = result.advice || "アドバイスはありません。";

    // Update score text
    pronunciationScoreEl.textContent = `${pronunciationScore}/10`;
    fluencyScoreEl.textContent = `${fluencyScore}/10`;
    intonationScoreEl.textContent = `${intonationScore}/10`;

    // Update gauge bars
    updateGauge(pronunciationGaugeEl, pronunciationScore);
    updateGauge(fluencyGaugeEl, fluencyScore);
    updateGauge(intonationGaugeEl, intonationScore);

    // Update transcription with highlights
    transcriptionTextEl.innerHTML = ''; // Clear previous
    const originalWords = originalSentence.split(/(\s+)/); // Keep spaces
    const incorrectWordsSet = new Set(incorrectWords.map((w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '')));

    originalWords.forEach(word => {
        if (word.trim() === '') {
            transcriptionTextEl.appendChild(document.createTextNode(word));
            return;
        }
        const span = document.createElement('span');
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9']/g, '');
        
        if (incorrectWordsSet.has(cleanWord)) {
            span.className = 'incorrect-word';
        } else {
            span.className = 'correct-word';
        }
        span.textContent = word;
        transcriptionTextEl.appendChild(span);
    });


    // Update advice
    adviceTextEl.textContent = advice;
    
    // Update overall score
    const overallScore = pronunciationScore + fluencyScore + intonationScore;
    const maxScore = 30;
    
    // Animate overall score value
    let currentScore = 0;
    const increment = overallScore / 50; // Animate over 50 steps
    const interval = setInterval(() => {
        currentScore += increment;
        if (currentScore >= overallScore) {
            currentScore = overallScore;
            clearInterval(interval);
        }
        overallScoreValueEl.textContent = Math.round(currentScore).toString();
    }, 20);

    // Update circular progress bar
    const circumference = overallProgressCircle.r.baseVal.value * 2 * Math.PI;
    overallProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (overallScore / maxScore) * circumference;
    overallProgressCircle.style.strokeDashoffset = offset.toString();
    
    const overallScoreClass = getScoreClass(overallScore, maxScore);
    overallProgressCircle.classList.remove('score-low', 'score-medium', 'score-high');
    overallProgressCircle.classList.add(overallScoreClass);
}

// --- Gemini API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function evaluatePronunciation(audioBase64: string, sentence: string): Promise<any> {
    setLoading(true);
    resultsSection.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const audioPart = {
            inlineData: {
                mimeType: 'audio/webm',
                data: audioBase64,
            },
        };

        const systemInstruction = `あなたは英語の発音指導のエキスパートです。あなたの仕事は、お手本の英文と、ユーザーがその英文を読み上げた音声データを基に、英語の発話を評価することです。
        - 発音の正確さ、流暢さ、イントネーションを分析してください。
        - 各項目を0から10のスケールで採点してください。
        - ユーザーの発話を正確に文字起こししてください。
        - お手本の英文と比較し、発音が不正確だった単語を特定してください。
        - ユーザーが改善するための、明確で、建設的で、励みになるようなアドバイスを日本語で提供してください。
        - あなたの応答は、提供されたスキーマに準拠したJSON形式でなければなりません。`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    audioPart,
                    { text: `私の発音を評価してください。お手本の文は次の通りです: "${sentence}"` }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        pronunciationScore: { type: Type.NUMBER, description: "発音の正確さに関する0～10のスコア。" },
                        fluencyScore: { type: Type.NUMBER, description: "流暢さに関する0～10のスコア。" },
                        intonationScore: { type: Type.NUMBER, description: "イントネーションとリズムに関する0～10のスコア。" },
                        transcription: { type: Type.STRING, description: "ユーザーの発話の正確な文字起こし。" },
                        incorrectWords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "お手本の英文の中で、発音が不正確だった単語のリスト。"
                        },
                        advice: { type: Type.STRING, description: "改善のための詳細なフィードバックとヒント（日本語）。" },
                    },
                    required: ["pronunciationScore", "fluencyScore", "intonationScore", "transcription", "incorrectWords", "advice"]
                },
            },
        });

        let jsonStr = response.text.trim();
        
        // Robust JSON parsing
        const jsonMatch = jsonStr.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            jsonStr = jsonMatch[2];
        } else {
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }
        }

        try {
            const result = JSON.parse(jsonStr);
            displayResults(result, sentence);

            if (isTestModeActive) {
                testResults.push({
                    pronunciationScore: result.pronunciationScore ?? 0,
                    fluencyScore: result.fluencyScore ?? 0,
                    intonationScore: result.intonationScore ?? 0,
                });
                nextQuestionBtn.classList.remove('hidden');
                testRecordBtn.disabled = true;
                testPlayModelBtn.disabled = true;
            }
            return result;
        } catch (parseError) {
             console.error("Error parsing JSON from AI response:", parseError);
             console.error("Original string from AI:", jsonStr);
             throw new Error("Invalid JSON response from AI.");
        }


    } catch (error) {
        console.error("Error evaluating pronunciation:", error);
        adviceTextEl.textContent = '評価中にエラーが発生しました。AIからの応答が不適切な形式である可能性があります。もう一度お試しください。';
        // Hide loader and show error message
    } finally {
        setLoading(false);
        loader.classList.add('hidden');
        resultsContent.classList.remove('hidden');
    }
}


// --- Media Recorder ---
async function startRecording() {
    if (isRecording) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                const sentenceToEvaluate = isTestModeActive ? testQuestions[currentQuestionIndex] : sentenceInputEl.value;
                evaluatePronunciation(base64String, sentenceToEvaluate);
            };
            reader.readAsDataURL(audioBlob);
             // Stop all tracks to release the microphone
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordButtonState();
    } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。");
    }
}

function stopRecording() {
    if (!mediaRecorder || !isRecording) return;
    mediaRecorder.stop();
    isRecording = false;
    updateRecordButtonState();
}

function updateRecordButtonState() {
    const currentRecordBtn = isTestModeActive ? testRecordBtn : recordBtn;
    const currentIcon = isTestModeActive ? testRecordBtnIcon : recordBtnIcon;

    if (isRecording) {
        currentRecordBtn.classList.add('recording');
        currentRecordBtn.setAttribute('aria-label', '録音を停止');
        currentIcon.innerHTML = stopIcon;
    } else {
        currentRecordBtn.classList.remove('recording');
        currentRecordBtn.setAttribute('aria-label', '録音を開始');
        currentIcon.innerHTML = micIcon;
    }
}

// --- Text-to-Speech ---
function populateVoiceList() {
    if (typeof speechSynthesis === 'undefined') return;
    voices = speechSynthesis.getVoices();
}

function playModelAudio(text: string) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const usVoice = voices.find(voice => voice.lang === 'en-US' && !voice.name.includes('Google 日本語'));
        if (usVoice) {
            utterance.voice = usVoice;
        } else {
            utterance.lang = 'en-US';
        }
        
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        alert("お使いのブラウザは音声合成に対応していません。");
    }
}


// --- Sentence Selection Modal ---
let FACTBOOK_DATA: FactbookChapter[] = [];
let MYWAY_DATA: (MyWayLesson | MyWaySection)[] = [];


function populateSentenceModal() {
    factbookListEl.innerHTML = '';
    mywayListEl.innerHTML = '';

    // Populate Factbook
    FACTBOOK_DATA.forEach(chapter => {
        const chapterBtn = document.createElement('button');
        chapterBtn.className = 'chapter-title';
        chapterBtn.textContent = chapter.chapter;
        factbookListEl.appendChild(chapterBtn);
        
        const sentenceList = document.createElement('div');
        sentenceList.className = 'sentence-list hidden';
        
        chapter.sentences.forEach(sentence => {
            const item = document.createElement('div');
            item.className = 'sentence-item';
            item.innerHTML = `<p class="en">${sentence.en}</p>${sentence.ja ? `<span class="ja">${sentence.ja}</span>` : ''}`;
            item.onclick = () => {
                sentenceInputEl.value = sentence.en;
                sentenceInputEl.dispatchEvent(new Event('input')); // Trigger input event for button states
                sentenceModal.classList.add('hidden');
            };
            sentenceList.appendChild(item);
        });
        
        factbookListEl.appendChild(sentenceList);
        chapterBtn.onclick = () => {
            chapterBtn.classList.toggle('active');
            sentenceList.classList.toggle('hidden');
        };
    });

    // Populate My Way
    MYWAY_DATA.forEach(item => {
        if ('lesson' in item) { // It's a MyWayLesson
            const lessonBtn = document.createElement('button');
            lessonBtn.className = 'chapter-title';
            lessonBtn.textContent = item.lesson;
            mywayListEl.appendChild(lessonBtn);

            const sectionContainer = document.createElement('div');
            sectionContainer.className = 'sentence-list hidden';

            item.sections.forEach(section => {
                const sectionBtn = document.createElement('button');
                sectionBtn.className = 'chapter-title lesson-title';
                sectionBtn.textContent = section.section;
                sectionContainer.appendChild(sectionBtn);

                const sentenceList = document.createElement('div');
                sentenceList.className = 'sentence-list lesson-sentence-list hidden';
                
                section.sentences.forEach(sentence => {
                    const sentenceEl = document.createElement('div');
                    sentenceEl.className = 'sentence-item';
                    sentenceEl.innerHTML = `<p class="en">${sentence.en}</p>`; // Assuming no JA for MyWay in this context
                    sentenceEl.onclick = () => {
                        sentenceInputEl.value = sentence.en;
                        sentenceInputEl.dispatchEvent(new Event('input'));
                        sentenceModal.classList.add('hidden');
                    };
                    sentenceList.appendChild(sentenceEl);
                });
                sectionContainer.appendChild(sentenceList);
                sectionBtn.onclick = (e) => {
                    e.stopPropagation();
                    sectionBtn.classList.toggle('active');
                    sentenceList.classList.toggle('hidden');
                };
            });

            mywayListEl.appendChild(sectionContainer);
            lessonBtn.onclick = () => {
                lessonBtn.classList.toggle('active');
                sectionContainer.classList.toggle('hidden');
            };
        }
    });
}

// --- Test Mode ---
function setupTestModal() {
    factbookChapterListEl.innerHTML = '';
    mywaySectionListEl.innerHTML = '';

    // Factbook chapters for test selection
    FACTBOOK_DATA.forEach((chapter, index) => {
        const id = `fb-chapter-${index}`;
        const item = document.createElement('div');
        item.className = 'test-selection-item';
        item.innerHTML = `
            <input type="checkbox" id="${id}" value="${chapter.chapter}" name="factbook-chapters">
            <label for="${id}">${chapter.chapter}</label>
        `;
        factbookChapterListEl.appendChild(item);
    });

    // MyWay sections for test selection
    MYWAY_DATA.forEach((lesson, lessonIndex) => {
        if ('lesson' in lesson) {
            lesson.sections.forEach((section, sectionIndex) => {
                const id = `mw-section-${lessonIndex}-${sectionIndex}`;
                const item = document.createElement('div');
                item.className = 'test-selection-item';
                item.innerHTML = `
                    <input type="radio" id="${id}" value="${lesson.lesson}|${section.section}" name="myway-section">
                    <label for="${id}">${lesson.lesson} - ${section.section}</label>
                `;
                mywaySectionListEl.appendChild(item);
            });
        }
    });
}

function startTest(questions: string[], title: string) {
    if (questions.length === 0) {
        alert('選択された範囲に問題がありません。');
        return;
    }
    isTestModeActive = true;
    testQuestions = questions;
    currentQuestionIndex = 0;
    testResults = [];
    currentTestTitle = title;
    
    practiceSection.classList.add('hidden');
    assignmentsSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    testSection.classList.remove('hidden');
    testSetupModal.classList.add('hidden');
    nextQuestionBtn.classList.add('hidden');
    testRecordBtn.disabled = false;
    testPlayModelBtn.disabled = false;

    loadTestQuestion();
}

function loadTestQuestion() {
    testProgressEl.textContent = `問題 ${currentQuestionIndex + 1} / ${testQuestions.length}`;
    testSentenceDisplayEl.textContent = testQuestions[currentQuestionIndex];
    resultsSection.classList.add('hidden');
    nextQuestionBtn.classList.add('hidden');
    testRecordBtn.disabled = false;
    testPlayModelBtn.disabled = false;
}

async function endTest() {
    if (testResults.length > 0 && currentUser) {
        showTestSummary();
        
        const numResults = testResults.length;
        const avgPronunciation = testResults.reduce((sum, r) => sum + r.pronunciationScore, 0) / numResults;
        const avgFluency = testResults.reduce((sum, r) => sum + r.fluencyScore, 0) / numResults;
        const avgIntonation = testResults.reduce((sum, r) => sum + r.intonationScore, 0) / numResults;

        const resultData = {
            studentEmail: currentUser.email,
            studentName: currentUser.name,
            studentGrade: currentUser.grade,
            studentClass: currentUser.class,
            studentNumber: currentUser.studentNumber,
            testTitle: currentTestTitle,
            completedAt: new Date().toISOString(),
            scores: {
                pronunciation: parseFloat(avgPronunciation.toFixed(1)),
                fluency: parseFloat(avgFluency.toFixed(1)),
                intonation: parseFloat(avgIntonation.toFixed(1)),
            }
        };

        try {
            await api.submitTestResult(resultData);
            showToast('テスト結果を送信しました。');
        } catch (error) {
            console.error("Failed to submit test results:", error);
            showToast('テスト結果の送信に失敗しました。', 'error');
        }
    }
    
    isTestModeActive = false;
    testQuestions = [];
    currentQuestionIndex = 0;
    testResults = [];
    currentTestTitle = null;

    practiceSection.classList.remove('hidden');
    assignmentsSection.classList.remove('hidden');
    if (currentUser) {
        loadInitialAssignmentData(currentUser); // Reload assignments
    }
    testSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

function showTestSummary() {
    const numResults = testResults.length;
    const avgPronunciation = testResults.reduce((sum, r) => sum + r.pronunciationScore, 0) / numResults;
    const avgFluency = testResults.reduce((sum, r) => sum + r.fluencyScore, 0) / numResults;
    const avgIntonation = testResults.reduce((sum, r) => sum + r.intonationScore, 0) / numResults;

    summaryPronunciationEl.textContent = `${avgPronunciation.toFixed(1)}/10`;
    summaryFluencyEl.textContent = `${avgFluency.toFixed(1)}/10`;
    summaryIntonationEl.textContent = `${avgIntonation.toFixed(1)}/10`;

    testSummaryModal.classList.remove('hidden');
}

// --- Profile Modal ---
function openProfileModal(isInitial = false) {
    isInitialProfileSetup = isInitial;
    profileForm.reset();

    // Show/hide role selection based on authorization
    if (currentUser?.isAuthorizedTeacher) {
        roleSelectionGroup.classList.remove('hidden');
    } else {
        roleSelectionGroup.classList.add('hidden');
    }

    if (isInitial) {
        profileModalTitle.textContent = "ようこそ！";
        profileModalIntro.textContent = "最初にプロフィール情報を登録してください。";
        closeProfileModalBtn.classList.add('hidden');
        saveProfileBtn.textContent = "登録する";
        if (currentUser?.isAuthorizedTeacher) {
            (document.getElementById('role-teacher') as HTMLInputElement).checked = true;
        }
    } else {
        profileModalTitle.textContent = "プロフィール設定";
        profileModalIntro.textContent = "役割やプロフィール情報を編集できます。";
        closeProfileModalBtn.classList.remove('hidden');
        saveProfileBtn.textContent = "更新する";

        if (currentUser) {
            const currentRole = currentUser.role || (currentUser.isAuthorizedTeacher ? 'teacher' : 'student');
            (document.getElementById(`role-${currentRole}`) as HTMLInputElement).checked = true;
            userGradeInput.value = currentUser.grade?.toString() || '';
            userClassInput.value = currentUser.class?.toString() || '';
            userStudentNumberInput.value = currentUser.studentNumber?.toString() || '';
        }
    }

    toggleStudentFields();
    profileModal.classList.remove('hidden');
}


function closeProfileModal() {
    if (!isInitialProfileSetup) {
        profileModal.classList.add('hidden');
    }
}

function toggleStudentFields() {
    const selectedRole = (document.querySelector('input[name="user-role"]:checked') as HTMLInputElement)?.value;
    const isStudent = selectedRole === 'student';

    studentInfoFields.classList.toggle('hidden', !isStudent);
    userGradeInput.required = isStudent;
    userClassInput.required = isStudent;
    userStudentNumberInput.required = isStudent;
}

async function handleSaveProfile(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUser) return;

    // A non-authorized user's role is always 'student'.
    // An authorized user can select their role.
    const selectedRole = currentUser.isAuthorizedTeacher
        ? (document.querySelector('input[name="user-role"]:checked') as HTMLInputElement).value as 'student' | 'teacher'
        : 'student';

    const profileData: Partial<UserProfile> = {
        role: selectedRole,
    };

    if (selectedRole === 'student') {
        const grade = parseInt(userGradeInput.value, 10);
        const userClass = parseInt(userClassInput.value, 10);
        const studentNumber = parseInt(userStudentNumberInput.value, 10);

        if (isNaN(grade) || isNaN(userClass) || isNaN(studentNumber)) {
            showToast("有効な数値を入力してください。", "error");
            return;
        }
        profileData.grade = grade;
        profileData.class = userClass;
        profileData.studentNumber = studentNumber;
    } else {
        profileData.grade = null;
        profileData.class = null;
        profileData.studentNumber = null;
    }

    try {
        if (isInitialProfileSetup) {
            await api.createUserProfile({ ...currentUser, ...profileData });
            showToast("プロフィールを登録しました！");
        } else {
            await api.updateUserProfile(currentUser.email, profileData);
            showToast("プロフィールを更新しました。");
        }
        
        // The `teachers` collection is the single source of truth and is not managed by the app.
        // This prevents users from granting themselves teacher privileges.

        currentUser = { ...currentUser, ...profileData };
        profileModal.classList.add('hidden');
        
        // Refresh app view with new info
        showApp(currentUser);

    } catch (error) {
        console.error("Error saving profile:", error);
        showToast("プロフィールの保存に失敗しました。", "error");
    }
}


// --- API Service (Firebase) ---
const api = {
    async isUserTeacher(email: string): Promise<boolean> {
        const docRef = db.collection("teachers").doc(email);
        const docSnap = await docRef.get();
        return docSnap.exists;
    },
    
    async getUserProfile(email: string): Promise<any> {
        const docRef = db.collection("users").doc(email);
        const docSnap = await docRef.get();
        return docSnap.exists ? docSnap.data() : null;
    },
    
    async createUserProfile(userData: UserProfile) {
        const { email, ...data } = userData;
        return db.collection("users").doc(email).set({
            ...data,
            createdAt: new Date().toISOString()
        });
    },

    async updateUserProfile(email: string, updateData: Partial<UserProfile>) {
        return db.collection("users").doc(email).update({
            ...updateData,
            updatedAt: new Date().toISOString()
        });
    },

    async getAssignments(user: UserProfile): Promise<Assignment[]> {
        if (!user.grade || !user.class) return []; // Only for students with class info
        
        try {
            const userClassStr = `${user.grade}-${user.class}`;
            const assignmentsCol = db.collection('assignments');
            const assignmentSnapshot = await assignmentsCol.where('assignedClasses', 'array-contains', userClassStr).get();
            
            const assignmentList = assignmentSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    questions: data.questions,
                    assignedClasses: data.assignedClasses,
                    retakePolicy: data.retakePolicy,
                    updatedAt: data.updatedAt,
                };
            });
            // Sort by updatedAt descending
            assignmentList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            return assignmentList as Assignment[];
        } catch (error) {
            console.error("Error fetching assignments from Firestore:", error);
            throw error;
        }
    },
    
    async getTestResultsForStudent(email: string): Promise<TestResultFromDB[]> {
        const snapshot = await db.collection('testResults').where('studentEmail', '==', email).get();
        return snapshot.docs.map(doc => doc.data() as TestResultFromDB);
    },

    async submitTestResult(resultData: any): Promise<{success: boolean}> {
        console.log("Submitting test results to Firestore:", JSON.stringify(resultData, null, 2));
        try {
            await db.collection('testResults').add(resultData);
            return { success: true };
        } catch (error) {
            console.error("Error submitting test result to Firestore:", error);
            throw error;
        }
    }
};

async function loadInitialAssignmentData(user: UserProfile) {
    if (!user || user.role !== 'student' || !user.grade || !user.class) {
        assignmentsSection.classList.add('hidden');
        return;
    }
    assignmentsSection.classList.remove('hidden');

    try {
        const [assignments, results] = await Promise.all([
            api.getAssignments(user),
            api.getTestResultsForStudent(user.email)
        ]);

        const completedTestTitles = new Set(results.map(r => r.testTitle));
        const incompleteAssignments = assignments.filter(a => {
            const isOnceAndCompleted = a.retakePolicy === 'once' && completedTestTitles.has(a.title);
            return !isOnceAndCompleted;
        });

        if (incompleteAssignments.length > 0) {
            newAssignmentsBadge.textContent = incompleteAssignments.length.toString();
            newAssignmentsBadge.classList.remove('hidden');
        } else {
            newAssignmentsBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error("Failed to load initial assignment data:", error);
        const p = openAssignmentsBtn.querySelector('p');
        if (p) p.textContent = "課題の読み込みに失敗しました";
    }
}

async function openAssignmentsModal() {
    if (!currentUser) return;
    
    incompleteAssignmentsList.innerHTML = '<div class="assignment-item loading">課題を読み込んでいます...</div>';
    completedAssignmentsList.innerHTML = '';
    assignmentDetailsModal.classList.remove('hidden');

    try {
        const [assignments, results] = await Promise.all([
            api.getAssignments(currentUser),
            api.getTestResultsForStudent(currentUser.email)
        ]);
        
        const resultsByTitle = new Map<string, TestResultFromDB>();
        results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        results.forEach(r => {
            if (!resultsByTitle.has(r.testTitle)) {
                resultsByTitle.set(r.testTitle, r);
            }
        });

        const incomplete: Assignment[] = [];
        const completed: { assignment: Assignment, result: TestResultFromDB }[] = [];

        assignments.forEach(assignment => {
            const result = resultsByTitle.get(assignment.title);
            const isOnce = assignment.retakePolicy === 'once';
            
            if (result) {
                completed.push({ assignment, result });
            }
            if (!isOnce || !result) {
                incomplete.push(assignment);
            }
        });

        // Render Incomplete Assignments
        incompleteAssignmentsList.innerHTML = '';
        if (incomplete.length > 0) {
            incomplete.forEach(assignment => {
                const item = document.createElement('div');
                item.className = 'assignment-item';
                let descriptionHTML = `<p>${assignment.description}</p>`;
                if (assignment.retakePolicy) {
                    descriptionHTML += `<span class="retake-policy-badge">${assignment.retakePolicy === 'once' ? '1回のみ' : '何度でも'}</span>`;
                }
                item.innerHTML = `<h3>${assignment.title}</h3>${descriptionHTML}`;
                item.onclick = () => {
                    startTest(assignment.questions, assignment.title);
                    assignmentDetailsModal.classList.add('hidden');
                };
                incompleteAssignmentsList.appendChild(item);
            });
        } else {
            incompleteAssignmentsList.innerHTML = '<div class="assignment-item">未完了の課題はありません。</div>';
        }

        // Render Completed Assignments
        completedAssignmentsList.innerHTML = '';
        if (completed.length > 0) {
            completed.sort((a, b) => new Date(b.result.completedAt).getTime() - new Date(a.result.completedAt).getTime());
            completed.forEach(({ assignment, result }) => {
                const item = document.createElement('div');
                item.className = 'assignment-item completed-item';
                const totalScore = result.scores.pronunciation + result.scores.fluency + result.scores.intonation;
                item.innerHTML = `
                    <h3>${assignment.title}</h3>
                    <p>${assignment.description}</p>
                    <div class="assignment-result-info">
                        <span>受験日: ${new Date(result.completedAt).toLocaleDateString()}</span>
                        <span class="score">総合スコア: ${totalScore.toFixed(1)}/30</span>
                    </div>
                `;
                item.onclick = () => showResultDetails(result);
                completedAssignmentsList.appendChild(item);
            });
        } else {
            completedAssignmentsList.innerHTML = '<div class="assignment-item">完了済みの課題はありません。</div>';
        }

    } catch (error) {
        console.error("Failed to populate assignments modal:", error);
        incompleteAssignmentsList.innerHTML = '<div class="assignment-item error">課題の読み込みに失敗しました。</div>';
    }
}

function showResultDetails(result: TestResultFromDB) {
    resultModalTitle.textContent = result.testTitle;
    resultModalDate.textContent = `受験日時: ${new Date(result.completedAt).toLocaleString('ja-JP')}`;
    resultPronunciationEl.textContent = `${(result.scores.pronunciation || 0).toFixed(1)}/10`;
    resultFluencyEl.textContent = `${(result.scores.fluency || 0).toFixed(1)}/10`;
    resultIntonationEl.textContent = `${(result.scores.intonation || 0).toFixed(1)}/10`;
    resultDetailsModal.classList.remove('hidden');
}


function showToast(message: string, type: 'success' | 'error' = 'success') {
    toastNotification.textContent = message;
    toastNotification.className = `toast show ${type}`;
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {

    FACTBOOK_DATA = Object.entries(factbookContentData).map(([key, value]) => ({
        chapter: value.title,
        sentences: value.sections.flatMap(s => s.sentences)
    }));

    MYWAY_DATA = Object.values(myWayContentData).map(book =>
        book.lessons.map(lesson => ({
            lesson: lesson.lessonTitle,
            sections: lesson.sections.map(section => ({
                section: section.sectionTitle,
                sentences: section.sentences
            }))
        }))
    ).flat();
    
    populateSentenceModal();
    setupTestModal();
    
    populateVoiceList();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    
    signOutBtn.addEventListener('click', signOut);
    userProfileEl.addEventListener('click', (e) => {
        // Prevent sign out when clicking on the profile area, but not the button itself
        if (e.target !== signOutBtn) {
            openProfileModal();
        }
    });

    recordBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    testRecordBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    sentenceInputEl.addEventListener('input', () => {
        const hasText = sentenceInputEl.value.trim().length > 0;
        recordBtn.disabled = !hasText || isLoading;
        playModelBtn.disabled = !hasText;
        clearSentenceBtn.classList.toggle('hidden', !hasText);
         // Auto-resize textarea
        sentenceInputEl.style.height = 'auto';
        sentenceInputEl.style.height = (sentenceInputEl.scrollHeight) + 'px';
    });

    clearSentenceBtn.addEventListener('click', () => {
        sentenceInputEl.value = '';
        sentenceInputEl.dispatchEvent(new Event('input'));
    });

    playModelBtn.addEventListener('click', () => {
        playModelAudio(sentenceInputEl.value);
    });
    
    testPlayModelBtn.addEventListener('click', () => {
        playModelAudio(testQuestions[currentQuestionIndex]);
    });

    selectSentenceBtn.addEventListener('click', () => {
        sentenceModal.classList.remove('hidden');
    });

    closeSentenceModalBtn.addEventListener('click', () => {
        sentenceModal.classList.add('hidden');
    });

    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            modalTabContents.forEach(content => {
                if (content.id === `${target}-content`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // Test Setup Modal Tabs
    testSetupModalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            testSetupModalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            testSetupModalTabContents.forEach(content => {
                if (content.id === `${target}-content`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });


    // Test Mode Buttons
    startTestBtn.addEventListener('click', () => {
        testSetupModal.classList.remove('hidden');
    });

    closeTestSetupBtn.addEventListener('click', () => {
        testSetupModal.classList.add('hidden');
    });
    
    startFactbookTestBtn.addEventListener('click', () => {
        const selectedChapters = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="factbook-chapters"]:checked'))
            .map(input => input.value);
        const questionCount = parseInt(factbookQuestionCountInput.value, 10);

        if (selectedChapters.length === 0) {
            alert('少なくとも1つの章を選択してください。');
            return;
        }

        let allSentences = FACTBOOK_DATA
            .filter(chapter => selectedChapters.includes(chapter.chapter))
            .flatMap(chapter => chapter.sentences.map(s => s.en));

        // Shuffle and pick
        const shuffled = allSentences.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
        const testTitle = `FACTBOOK 復習 (${selectedChapters.join(', ')})`;
        startTest(selectedQuestions, testTitle);
    });
    
    startMyWayTestBtn.addEventListener('click', () => {
        const selectedSectionInput = document.querySelector<HTMLInputElement>('input[name="myway-section"]:checked');
        if (!selectedSectionInput) {
            alert('セクションを選択してください。');
            return;
        }
        
        const [lessonTitle, sectionTitle] = selectedSectionInput.value.split('|');
        const lessonData = MYWAY_DATA.find(l => 'lesson' in l && l.lesson === lessonTitle) as MyWayLesson | undefined;
        if (!lessonData) return;

        const sectionData = lessonData.sections.find(s => s.section === sectionTitle);
        if (!sectionData) return;
        
        const questions = sectionData.sentences.map(s => s.en);
        const testTitle = `${lessonTitle} - ${sectionTitle}`;
        startTest(questions, testTitle);
    });


    nextQuestionBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < testQuestions.length) {
            loadTestQuestion();
        } else {
            alert('テスト終了です！');
            endTest();
        }
    });

    endTestBtn.addEventListener('click', () => {
        if (confirm('テストを本当に終了しますか？')) {
            endTest();
        }
    });

    closeSummaryBtn.addEventListener('click', () => {
        testSummaryModal.classList.add('hidden');
    });

    // Profile Modal Listeners
    profileForm.addEventListener('submit', handleSaveProfile);
    closeProfileModalBtn.addEventListener('click', closeProfileModal);
    roleRadios.forEach(radio => radio.addEventListener('change', toggleStudentFields));

    // Assignment Modal Listeners
    openAssignmentsBtn.addEventListener('click', openAssignmentsModal);
    closeAssignmentDetailsModalBtn.addEventListener('click', () => assignmentDetailsModal.classList.add('hidden'));
    closeResultDetailsModalBtn.addEventListener('click', () => resultDetailsModal.classList.add('hidden'));


    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === sentenceModal) {
            sentenceModal.classList.add('hidden');
        }
        if (event.target === testSetupModal) {
            testSetupModal.classList.add('hidden');
        }
        if (event.target === testSummaryModal) {
            testSummaryModal.classList.add('hidden');
        }
        if (event.target === profileModal) {
            closeProfileModal();
        }
        if (event.target === assignmentDetailsModal) {
            assignmentDetailsModal.classList.add('hidden');
        }
        if (event.target === resultDetailsModal) {
            resultDetailsModal.classList.add('hidden');
        }
    });
});
