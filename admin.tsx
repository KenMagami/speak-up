



import { db, auth } from "./firebase";
import { factbookContentData, myWayContentData } from "./data";

// --- Type Declarations ---
interface UserProfile {
    name: string;
    email: string;
    picture: string;
    role?: 'student' | 'teacher';
    grade?: number;
    class?: number;
    studentNumber?: number;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    questions: string[];
    assignedClasses?: string[];
    retakePolicy?: 'once' | 'multiple';
}

interface TestResult {
    studentEmail: string;
    studentGrade?: number;
    studentClass?: number;
    studentNumber?: number;
    studentName: string;
    testTitle: string;
    completedAt: string;
    scores: {
        pronunciation: number;
        fluency: number;
        intonation: number;
    };
    total?: number; // Added for sorting
}


declare global {
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
  }
  interface Window {
    google: any;
    onGoogleLibraryLoad: () => void;
  }
}

// --- App State ---
let currentUser: UserProfile | null = null;
let editingAssignmentId: string | null = null;
let allResultsData: TestResult[] = [];
let sortState: { key: keyof TestResult | 'total' | 'pronunciation' | 'fluency' | 'intonation', direction: 'asc' | 'desc' } = { key: 'completedAt', direction: 'desc' };

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const adminApp = document.getElementById('admin-app') as HTMLDivElement;
const googleSignInButton = document.getElementById('google-signin-button') as HTMLDivElement;

// Sidebar & User Profile
const userProfileEl = document.getElementById('user-profile') as HTMLDivElement;
const userNameEl = document.getElementById('user-name') as HTMLSpanElement;
const userEmailEl = document.getElementById('user-email') as HTMLSpanElement;
const userAvatarEl = document.getElementById('user-avatar') as HTMLImageElement;
const signOutBtn = document.getElementById('signout-btn') as HTMLButtonElement;

// Navigation
const navLinks = document.querySelectorAll('.nav-link');
const contentViews = document.querySelectorAll('.content-view');

// Dashboard View
const totalStudentsStat = document.getElementById('total-students-stat') as HTMLParagraphElement;
const totalAssignmentsStat = document.getElementById('total-assignments-stat') as HTMLParagraphElement;
const todaySubmissionsStat = document.getElementById('today-submissions-stat') as HTMLParagraphElement;
const recentSubmissionsTableBody = document.querySelector('#recent-submissions-table tbody') as HTMLTableSectionElement;
const dashboardLoader = document.getElementById('dashboard-loader') as HTMLDivElement;


// Assignments View
const assignmentsTableBody = document.querySelector('#assignments-table tbody') as HTMLTableSectionElement;
const assignmentsLoader = document.getElementById('assignments-loader') as HTMLDivElement;
const createAssignmentBtn = document.getElementById('create-assignment-btn') as HTMLButtonElement;

// Results View
const resultsTableBody = document.querySelector('#results-table tbody') as HTMLTableSectionElement;
const resultsTableHeader = document.querySelector('#results-table thead') as HTMLTableSectionElement;
const resultsLoader = document.getElementById('results-loader') as HTMLDivElement;
const assignmentFilter = document.getElementById('assignment-filter') as HTMLSelectElement;
const classFilter = document.getElementById('class-filter') as HTMLSelectElement;

// Users View
const usersTableBody = document.querySelector('#users-table tbody') as HTMLTableSectionElement;
const usersLoader = document.getElementById('users-loader') as HTMLDivElement;

// Assignment Modal
const assignmentModal = document.getElementById('assignment-modal') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const closeModalBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
const assignmentForm = document.getElementById('assignment-form') as HTMLFormElement;
const assignmentTitleInput = document.getElementById('assignment-title') as HTMLInputElement;
const assignmentDescriptionInput = document.getElementById('assignment-description') as HTMLTextAreaElement;
const assignmentClassSelection = document.getElementById('assignment-class-selection') as HTMLDivElement;
const sentenceSelectionContainer = document.getElementById('sentence-selection-container') as HTMLDivElement;
const saveAssignmentBtn = document.getElementById('save-assignment-btn') as HTMLButtonElement;

// CSV Modal
const csvModal = document.getElementById('csv-modal') as HTMLDivElement;
const closeCsvModalBtn = document.getElementById('close-csv-modal-btn') as HTMLButtonElement;
const csvForm = document.getElementById('csv-form') as HTMLFormElement;
const csvDownloadBtn = document.getElementById('csv-download-btn') as HTMLButtonElement;
const csvClassSelection = document.getElementById('csv-class-selection') as HTMLDivElement;
const csvAssignmentSelection = document.getElementById('csv-assignment-selection') as HTMLDivElement;


// Toast
const toastNotification = document.getElementById('toast-notification') as HTMLDivElement;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const cachedUser = localStorage.getItem('adminUserProfile');
    if (cachedUser) {
        currentUser = JSON.parse(cachedUser);
        checkIfTeacher(currentUser as UserProfile);
    } else {
        showLogin();
    }
}

// --- Authentication & Authorization ---
window.onGoogleLibraryLoad = () => {
    window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(googleSignInButton, { theme: 'outline', size: 'large' });
};

function handleCredentialResponse(response: any) {
    const idToken = response.credential;
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
    
    localStorage.setItem('adminUserProfile', JSON.stringify(user));
    currentUser = user;
    checkIfTeacher(user);
}

async function checkIfTeacher(user: UserProfile) {
    try {
        const teacherRef = db.collection("teachers").doc(user.email);
        const teacherSnap = await teacherRef.get();
        if (teacherSnap.exists) {
            showAdminPanel(user);
        } else {
            alert('アクセス権限がありません。管理者として登録されたアカウントでログインしてください。');
            signOut();
        }
    } catch (error) {
        console.error("Error verifying teacher status:", error);
        alert('管理者情報の確認中にエラーが発生しました。');
        signOut();
    }
}

function signOut() {
    currentUser = null;
    localStorage.removeItem('adminUserProfile');
    window.google.accounts.id.disableAutoSelect();
    showLogin();
}

// --- UI Management ---
function showLogin() {
    loginScreen.classList.remove('hidden');
    adminApp.classList.add('hidden');
}

function showAdminPanel(user: UserProfile) {
    loginScreen.classList.add('hidden');
    adminApp.classList.remove('hidden');
    userNameEl.textContent = user.name;
    userEmailEl.textContent = user.email;
    userAvatarEl.src = user.picture;
    navigateTo('dashboard');
}

async function navigateTo(viewId: string) {
    contentViews.forEach(view => view.classList.toggle('active', view.id === `${viewId}-view`));
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('data-view') === viewId));

    if (viewId === 'dashboard') await loadDashboardData();
    if (viewId === 'assignments') await loadAssignments();
    if (viewId === 'results') await loadAndDisplayResults();
    if (viewId === 'users') await loadUsers();
}

function showToast(message: string, type: 'success' | 'error' = 'success', duration = 3000) {
    toastNotification.textContent = message;
    toastNotification.className = `toast show ${type}`;
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, duration);
}


// --- Data Fetching and Display ---
async function loadDashboardData() {
    dashboardLoader.classList.remove('hidden');
    recentSubmissionsTableBody.innerHTML = '';
    totalStudentsStat.textContent = '-';
    totalAssignmentsStat.textContent = '-';
    todaySubmissionsStat.textContent = '-';

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today in local timezone

        const usersQuery = db.collection('users').where('role', '==', 'student').get();
        const assignmentsQuery = db.collection('assignments').get();
        const todaySubmissionsQuery = db.collection('testResults').where('completedAt', '>=', today.toISOString()).get();
        const recentSubmissionsQuery = db.collection('testResults').orderBy('completedAt', 'desc').limit(5).get();

        const [
            usersSnapshot,
            assignmentsSnapshot,
            todaySubmissionsSnapshot,
            recentSubmissionsSnapshot
        ] = await Promise.all([usersQuery, assignmentsQuery, todaySubmissionsQuery, recentSubmissionsQuery]);
        
        // Update stats
        totalStudentsStat.textContent = usersSnapshot.size.toString();
        totalAssignmentsStat.textContent = assignmentsSnapshot.size.toString();
        todaySubmissionsStat.textContent = todaySubmissionsSnapshot.size.toString();

        // Populate recent submissions table
        if (recentSubmissionsSnapshot.empty) {
            recentSubmissionsTableBody.innerHTML = '<tr><td colspan="4">最近提出されたテストはありません。</td></tr>';
        } else {
            recentSubmissionsSnapshot.docs.forEach(doc => {
                const result = doc.data() as TestResult;
                const totalScore = (result.scores.pronunciation || 0) + (result.scores.fluency || 0) + (result.scores.intonation || 0);
                const row = recentSubmissionsTableBody.insertRow();
                row.innerHTML = `
                    <td>${result.studentName}</td>
                    <td>${result.testTitle}</td>
                    <td>${totalScore.toFixed(1)} / 30</td>
                    <td>${new Date(result.completedAt).toLocaleString('ja-JP')}</td>
                `;
            });
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showToast('ダッシュボードデータの読み込みに失敗しました。', 'error');
        recentSubmissionsTableBody.innerHTML = '<tr><td colspan="4">データの読み込みに失敗しました。</td></tr>';
    } finally {
        dashboardLoader.classList.add('hidden');
    }
}

async function deleteAssignment(id: string, title: string) {
    if (!confirm(`課題「${title}」を本当に削除しますか？この操作は元に戻せません。`)) {
        return;
    }
    try {
        await db.collection('assignments').doc(id).delete();
        showToast('課題を削除しました。');
        await loadAssignments(); // Refresh the list
    } catch (error) {
        console.error("Error deleting assignment: ", error);
        showToast('課題の削除に失敗しました。', 'error');
    }
}

async function loadAssignments() {
    assignmentsTableBody.innerHTML = '';
    assignmentsLoader.classList.remove('hidden');
    try {
        const assignmentsCol = db.collection('assignments');
        const snapshot = await assignmentsCol.orderBy('updatedAt', 'desc').get();
        if (snapshot.empty) {
            assignmentsTableBody.innerHTML = '<tr><td colspan="5">まだ課題はありません。</td></tr>';
        } else {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const assignedClasses: string[] = data.assignedClasses || [];
                const classDisplay = assignedClasses.length > 0
                    ? assignedClasses.map(c => {
                        const [grade, cls] = c.split('-');
                        return `${grade}年${cls}組`;
                    }).join(', ')
                    : '未割り当て';

                const row = assignmentsTableBody.insertRow();
                row.innerHTML = `
                    <td>${data.title}</td>
                    <td>${data.description}</td>
                    <td>${classDisplay}</td>
                    <td>${data.questions.length}</td>
                `;
                const actionsCell = row.insertCell();
                actionsCell.className = 'actions-cell';

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'button-secondary';
                editButton.onclick = () => openAssignmentModal(doc.id, data as Omit<Assignment, 'id'>);
                actionsCell.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'button-secondary button-danger';
                deleteButton.onclick = () => deleteAssignment(doc.id, data.title);
                actionsCell.appendChild(deleteButton);
            });
        }
    } catch (error) {
        console.error("Error loading assignments:", error);
        assignmentsTableBody.innerHTML = '<tr><td colspan="5">課題の読み込みに失敗しました。</td></tr>';
    } finally {
        assignmentsLoader.classList.add('hidden');
    }
}


async function getStudentClasses(): Promise<string[]> {
    const snapshot = await db.collection('users').where('role', '==', 'student').get();
    const classes = new Set<string>();
    snapshot.docs.forEach(doc => {
        const user = doc.data();
        if (user.grade && user.class) {
            classes.add(`${user.grade}-${user.class}`);
        }
    });
    return Array.from(classes).sort();
}

async function loadAndDisplayResults() {
    resultsLoader.classList.remove('hidden');
    resultsTableBody.innerHTML = '';
    try {
        await Promise.all([
            populateResultsFilter(),
            populateClassFilter(),
            loadAllResultsData()
        ]);
        renderFilteredResults();
    } catch (error) {
        console.error("Error loading results page:", error);
        resultsTableBody.innerHTML = '<tr><td colspan="10">成績の読み込みに失敗しました。</td></tr>';
    } finally {
        resultsLoader.classList.add('hidden');
    }
}

async function loadAllResultsData() {
    const resultsQuery = db.collection('testResults').orderBy('completedAt', 'desc');
    const snapshot = await resultsQuery.get();
    allResultsData = snapshot.docs.map(doc => doc.data() as TestResult);
}

function renderFilteredResults() {
    const assignment = assignmentFilter.value;
    const studentClass = classFilter.value;

    let filteredData = allResultsData;

    if (assignment !== 'all') {
        filteredData = filteredData.filter(d => d.testTitle === assignment);
    }
    if (studentClass !== 'all') {
        const [grade, cls] = studentClass.split('-').map(Number);
        filteredData = filteredData.filter(d => d.studentGrade === grade && d.studentClass === cls);
    }
    
    renderResultsTable(filteredData);
}

function renderResultsTable(data: TestResult[]) {
    // Sort data
    data.sort((a, b) => {
        const key = sortState.key;
        let valA, valB;

        if (key === 'total') {
            valA = (a.scores.pronunciation || 0) + (a.scores.fluency || 0) + (a.scores.intonation || 0);
            valB = (b.scores.pronunciation || 0) + (b.scores.fluency || 0) + (b.scores.intonation || 0);
        } else if (key === 'pronunciation' || key === 'fluency' || key === 'intonation') {
             valA = a.scores[key] ?? 0;
             valB = b.scores[key] ?? 0;
        } else {
            valA = a[key as keyof TestResult] ?? '';
            valB = b[key as keyof TestResult] ?? '';
        }

        if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Render table
    resultsTableBody.innerHTML = '';
    if (data.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="10">該当する成績はありません。</td></tr>';
        return;
    }
    data.forEach(d => {
        const p = d.scores.pronunciation || 0;
        const f = d.scores.fluency || 0;
        const i = d.scores.intonation || 0;
        const total = (p + f + i).toFixed(1);
        const row = resultsTableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(d.completedAt).toLocaleString('ja-JP')}</td>
            <td>${d.studentGrade || '-'}</td>
            <td>${d.studentClass || '-'}</td>
            <td>${d.studentNumber || '-'}</td>
            <td>${d.studentName}</td>
            <td>${d.testTitle}</td>
            <td>${p.toFixed(1)}</td>
            <td>${f.toFixed(1)}</td>
            <td>${i.toFixed(1)}</td>
            <td><strong>${total}</strong></td>
        `;
    });
    updateSortIndicators();
}


function updateSortIndicators() {
    resultsTableHeader.querySelectorAll('th[data-sort-key]').forEach(th => {
        const key = th.getAttribute('data-sort-key');
        const span = th.querySelector('span') as HTMLSpanElement;
        if (key === sortState.key) {
            span.textContent = sortState.direction === 'asc' ? '▲' : '▼';
        } else {
            span.textContent = '';
        }
    });
}

async function populateResultsFilter() {
    const snapshot = await db.collection('assignments').get();
    assignmentFilter.innerHTML = `<option value="all">すべての課題</option>`;
    snapshot.docs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().title;
        option.textContent = doc.data().title;
        assignmentFilter.appendChild(option);
    });
}

async function populateClassFilter() {
    const classes = await getStudentClasses();
    classFilter.innerHTML = `<option value="all">すべてのクラス</option>`;
    classes.forEach(c => {
        const [grade, cls] = c.split('-');
        const option = document.createElement('option');
        option.value = c;
        option.textContent = `${grade}年${cls}組`;
        classFilter.appendChild(option);
    });
}

async function loadUsers() {
    usersTableBody.innerHTML = '';
    usersLoader.classList.remove('hidden');
    try {
        const snapshot = await db.collection('users').orderBy('name').get();
        if (snapshot.empty) {
            usersTableBody.innerHTML = '<tr><td colspan="6">ユーザーがいません。</td></tr>';
        } else {
            const users = snapshot.docs.map(doc => ({ ...doc.data(), email: doc.id })) as (UserProfile & {email: string})[];
            users.sort((a, b) => {
                if (a.role === 'teacher' && b.role !== 'teacher') return -1;
                if (a.role !== 'teacher' && b.role === 'teacher') return 1;
                if ((a.grade ?? 99) < (b.grade ?? 99)) return -1;
                if ((a.grade ?? 99) > (b.grade ?? 99)) return 1;
                if ((a.class ?? 99) < (b.class ?? 99)) return -1;
                if ((a.class ?? 99) > (b.class ?? 99)) return 1;
                if ((a.studentNumber ?? 99) < (b.studentNumber ?? 99)) return -1;
                if ((a.studentNumber ?? 99) > (b.studentNumber ?? 99)) return 1;
                return a.name.localeCompare(b.name);
            });

            users.forEach(user => {
                 const row = usersTableBody.insertRow();
                 row.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.role === 'teacher' ? '教員' : '生徒'}</td>
                    <td>${user.grade || '-'}</td>
                    <td>${user.class || '-'}</td>
                    <td>${user.studentNumber || '-'}</td>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="6">ユーザーの読み込みに失敗しました。</td></tr>';
    } finally {
        usersLoader.classList.add('hidden');
    }
}


// --- Assignment Modal ---
async function openAssignmentModal(assignmentId: string | null = null, data?: Omit<Assignment, 'id'>) {
    populateSentenceSelector();
    await populateAssignmentClassSelection();
    assignmentForm.reset();
    
    // Clear dynamic content states
    sentenceSelectionContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.indeterminate = false;
    });
     assignmentClassSelection.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => cb.checked = false);


    if (assignmentId && data) {
        editingAssignmentId = assignmentId;
        modalTitle.textContent = '課題の編集';
        saveAssignmentBtn.textContent = '更新する';
        assignmentTitleInput.value = data.title;
        assignmentDescriptionInput.value = data.description;
        
        const policy = data.retakePolicy || 'once';
        (assignmentForm.querySelector(`input[name="retake-policy"][value="${policy}"]`) as HTMLInputElement).checked = true;

        // Check assigned classes
        const assignedClasses = new Set(data.assignedClasses || []);
        assignmentClassSelection.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
            if (assignedClasses.has(cb.value)) {
                cb.checked = true;
            }
        });
        
        // Check selected questions
        const questionSet = new Set(data.questions);
        sentenceSelectionContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
            if (questionSet.has(cb.value)) {
                 cb.checked = true;
                 cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    } else {
        editingAssignmentId = null;
        modalTitle.textContent = '新規課題の作成';
        saveAssignmentBtn.textContent = '作成する';
        (assignmentForm.querySelector(`input[name="retake-policy"][value="once"]`) as HTMLInputElement).checked = true;
    }
    assignmentModal.classList.remove('hidden');
}

function closeAssignmentModal() {
    assignmentModal.classList.add('hidden');
}

async function populateAssignmentClassSelection() {
    const classes = await getStudentClasses();
    assignmentClassSelection.innerHTML = '';
    if (classes.length === 0) {
        assignmentClassSelection.innerHTML = '<p>登録されている生徒のクラス情報がありません。</p>';
        return;
    }
    classes.forEach(c => {
        const [grade, cls] = c.split('-');
        const id = `assign-class-${grade}-${cls}`;
        const label = document.createElement('label');
        label.className = 'checkbox-item-label';
        label.htmlFor = id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = c;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `${grade}年${cls}組`;

        label.appendChild(checkbox);
        label.appendChild(textSpan);
        assignmentClassSelection.appendChild(label);
    });
}


let isModalPopulated = false;
function populateSentenceSelector() {
    if (isModalPopulated) return;
    sentenceSelectionContainer.innerHTML = `
        <div class="modal-tabs">
            <button type="button" class="modal-tab-btn active" data-tab="factbook">FACTBOOK</button>
            <button type="button" class="modal-tab-btn" data-tab="myway">MY WAY</button>
        </div>
        <div id="factbook-content" class="modal-tab-content active">
            <div id="factbook-list"></div>
        </div>
        <div id="myway-content" class="modal-tab-content">
            <div id="myway-list"></div>
        </div>
    `;

    const factbookListEl = document.getElementById('factbook-list') as HTMLDivElement;
    const mywayListEl = document.getElementById('myway-list') as HTMLDivElement;

    const createCheckbox = (id: string, value: string) => {
        const label = document.createElement('label');
        label.className = 'sentence-item-label';
        label.htmlFor = id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = value;

        const textSpan = document.createElement('span');
        textSpan.textContent = value;
        
        label.appendChild(checkbox);
        label.appendChild(textSpan);
        return label;
    };
    
    const createGroupHeader = (id: string, title: string, className: string) => {
        const header = document.createElement('div');
        header.className = className;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;

        const label = document.createElement('label');
        label.htmlFor = id;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = title;
        label.appendChild(textSpan);

        header.appendChild(checkbox);
        header.appendChild(label);
        return header;
    };

    // FACTBOOK
    Object.entries(factbookContentData).forEach(([key, chapterData], index) => {
        const chapterId = `fb-chapter-${index}`;
        const chapterHeader = createGroupHeader(chapterId, chapterData.title, 'chapter-header');
        factbookListEl.appendChild(chapterHeader);
        
        const sentenceList = document.createElement('div');
        sentenceList.className = 'nested-list hidden';
        chapterData.sections.flatMap(s => s.sentences).forEach((sentence, sIndex) => {
            sentenceList.appendChild(createCheckbox(`${chapterId}-s${sIndex}`, sentence.en));
        });
        factbookListEl.appendChild(sentenceList);
    });

    // MY WAY
    myWayContentData.myway1.lessons.forEach((lesson, lIndex) => {
        const lessonId = `mw-lesson-${lIndex}`;
        const lessonHeader = createGroupHeader(lessonId, lesson.lessonTitle, 'lesson-header');
        mywayListEl.appendChild(lessonHeader);

        const lessonContent = document.createElement('div');
        lessonContent.className = 'nested-list hidden';
        
        lesson.sections.forEach((section, sIndex) => {
            const sectionId = `${lessonId}-section-${sIndex}`;
            const sectionHeader = createGroupHeader(sectionId, section.sectionTitle, 'section-header');
            lessonContent.appendChild(sectionHeader);

            const sentenceList = document.createElement('div');
            sentenceList.className = 'nested-list hidden';
            section.sentences.forEach((sentence, sentIndex) => {
                sentenceList.appendChild(createCheckbox(`${sectionId}-s${sentIndex}`, sentence.en));
            });
            lessonContent.appendChild(sentenceList);
        });
        mywayListEl.appendChild(lessonContent);
    });
    
    isModalPopulated = true;
}


async function handleSaveAssignment(event: SubmitEvent) {
    event.preventDefault();
    const title = assignmentTitleInput.value.trim();
    const description = assignmentDescriptionInput.value.trim();
    const assignedClasses = Array.from(assignmentClassSelection.querySelectorAll<HTMLInputElement>('input:checked')).map(cb => cb.value);
    const retakePolicy = (assignmentForm.querySelector('input[name="retake-policy"]:checked') as HTMLInputElement).value as 'once' | 'multiple';
    const questions = Array.from(sentenceSelectionContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
        .filter(cb => cb.checked && !cb.closest('.chapter-header, .lesson-header, .section-header'))
        .map(i => i.value);

    if (!title) {
        showToast('タイトルを入力してください。', 'error');
        return;
    }
     if (assignedClasses.length === 0) {
        showToast('対象クラスを1つ以上選択してください。', 'error');
        return;
    }
    if (questions.length === 0) {
        showToast('問題を1つ以上選択してください。', 'error');
        return;
    }

    const data = { title, description, questions, assignedClasses, retakePolicy, updatedAt: new Date().toISOString() };

    try {
        if (editingAssignmentId) {
            await db.collection("assignments").doc(editingAssignmentId).update(data);
            showToast('課題を更新しました。');
        } else {
            await db.collection("assignments").add({ ...data, createdAt: new Date().toISOString() });
            showToast('新しい課題を作成しました。');
        }
        closeAssignmentModal();
        await loadAssignments();
    } catch (error) {
        console.error("Error saving assignment:", error);
        showToast('課題の保存に失敗しました。', 'error');
    }
}

// --- CSV Download ---
async function openCsvModal() {
    csvForm.reset();
    await populateCsvClassSelection();
    await populateCsvAssignmentSelection();
    csvModal.classList.remove('hidden');
}

function closeCsvModal() {
    csvModal.classList.add('hidden');
}

async function populateCsvClassSelection() {
    const classes = await getStudentClasses();
    csvClassSelection.innerHTML = '';
    classes.forEach(c => {
        const [grade, cls] = c.split('-');
        const id = `csv-class-${grade}-${cls}`;
        const label = document.createElement('label');
        label.className = 'checkbox-item-label';
        label.htmlFor = id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = c;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `${grade}年${cls}組`;

        label.appendChild(checkbox);
        label.appendChild(textSpan);
        csvClassSelection.appendChild(label);
    });
}

async function populateCsvAssignmentSelection() {
    const snapshot = await db.collection('assignments').get();
    csvAssignmentSelection.innerHTML = '';
    snapshot.docs.forEach(doc => {
        const title = doc.data().title;
        const id = `csv-assignment-${doc.id}`;
        const label = document.createElement('label');
        label.className = 'checkbox-item-label';
        label.htmlFor = id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = title;

        const textSpan = document.createElement('span');
        textSpan.textContent = title;

        label.appendChild(checkbox);
        label.appendChild(textSpan);
        csvAssignmentSelection.appendChild(label);
    });
}

async function handleCsvDownload(event: SubmitEvent) {
    event.preventDefault();

    const selectedClasses = Array.from(csvClassSelection.querySelectorAll<HTMLInputElement>('input:checked')).map(cb => cb.value);
    const selectedAssignments = Array.from(csvAssignmentSelection.querySelectorAll<HTMLInputElement>('input:checked')).map(cb => cb.value);
    
    if (selectedClasses.length === 0 || selectedAssignments.length === 0) {
        showToast('少なくとも1つのクラスと1つの課題を選択してください。', 'error');
        return;
    }

    try {
        const [usersSnapshot, resultsSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('testResults').get()
        ]);
        
        const allUsers = usersSnapshot.docs.map(doc => ({ email: doc.id, ...doc.data() })) as (UserProfile & {email: string})[];
        const allResults = resultsSnapshot.docs.map(doc => doc.data()) as TestResult[];

        const targetStudents = allUsers
            .filter(user => {
                if (user.role !== 'student' || !user.grade || !user.class) return false;
                const userClass = `${user.grade}-${user.class}`;
                return selectedClasses.includes(userClass);
            })
            .sort((a, b) => (a.studentNumber || 99) - (b.studentNumber || 99));

        if (targetStudents.length === 0) {
            showToast('選択されたクラスに生徒が見つかりません。', 'error');
            return;
        }

        const resultsMap = new Map<string, number>(); // key: 'email|testTitle', value: totalScore
        allResults.forEach(r => {
            const totalScore = (r.scores.pronunciation || 0) + (r.scores.fluency || 0) + (r.scores.intonation || 0);
            resultsMap.set(`${r.studentEmail}|${r.testTitle}`, parseFloat(totalScore.toFixed(1)));
        });

        const headers = ['生徒名', '学年', 'クラス', '番号', ...selectedAssignments.map(title => `"${title}"`)];
        const rows = targetStudents.map(student => {
            const rowData = [
                `"${student.name}"`,
                student.grade,
                student.class,
                student.studentNumber
            ];
            selectedAssignments.forEach(assignmentTitle => {
                const score = resultsMap.get(`${student.email}|${assignmentTitle}`);
                rowData.push(score !== undefined ? score.toString() : '');
            });
            return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '');
        link.setAttribute("download", `speakup_grades_pivot_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeCsvModal();
        showToast('CSVをダウンロードしました。');

    } catch (error) {
        console.error("Error generating CSV:", error);
        showToast('CSVの生成に失敗しました。', 'error');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    signOutBtn.addEventListener('click', signOut);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = (e.currentTarget as HTMLElement).getAttribute('data-view');
            if (viewId) navigateTo(viewId);
        });
    });

    createAssignmentBtn.addEventListener('click', () => openAssignmentModal());
    closeModalBtn.addEventListener('click', closeAssignmentModal);
    assignmentForm.addEventListener('submit', handleSaveAssignment);

    sentenceSelectionContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // Handle Tab switching
        if (target.matches('.modal-tab-btn')) {
            const tab = target.dataset.tab;
            if (!tab) return;
            
            sentenceSelectionContainer.querySelectorAll('.modal-tab-btn').forEach(t => t.classList.remove('active'));
            target.classList.add('active');

            sentenceSelectionContainer.querySelectorAll('.modal-tab-content').forEach(c => {
                c.classList.toggle('active', c.id === `${tab}-content`);
            });
        }

        // Handle Accordion toggling
        const header = target.closest('.chapter-header, .lesson-header, .section-header');
        if (!header) return;

        if (target.tagName !== 'INPUT' && target.tagName !== 'LABEL' && target.tagName !== 'SPAN') {
             const content = header.nextElementSibling;
             if (content && content.classList.contains('nested-list')) {
                content.classList.toggle('hidden');
                header.classList.toggle('expanded');
            }
        }
    });

    sentenceSelectionContainer.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.type !== 'checkbox') return;

        const header = target.closest('.chapter-header, .lesson-header, .section-header');
        if (header && header.contains(target)) {
            const list = header.nextElementSibling as HTMLElement;
            if (list) {
                list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
                    cb.checked = target.checked
                });
            }
        }

        const updateParentState = (element: HTMLElement) => {
            const list = element.closest('.nested-list');
            if (!list) return;

            const header = list.previousElementSibling;
            if (!header || !header.matches('.chapter-header, .lesson-header, .section-header')) return;

            const parentCheckbox = header.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const allCheckboxesInList = Array.from(list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
            
            const childItemCheckboxes = allCheckboxesInList.filter(cb => !cb.closest('.chapter-header, .lesson-header, .section-header'));
            
            if (childItemCheckboxes.length === 0) return;

            const allChecked = childItemCheckboxes.every(cb => cb.checked);
            const someChecked = childItemCheckboxes.some(cb => cb.checked);

            parentCheckbox.checked = allChecked;
            parentCheckbox.indeterminate = !allChecked && someChecked;
            
            updateParentState(header.parentElement!);
        };
        
        updateParentState(target.parentElement!);
    });

    assignmentFilter.addEventListener('change', renderFilteredResults);
    classFilter.addEventListener('change', renderFilteredResults);
    
    resultsTableHeader.querySelectorAll('th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort-key') as keyof TestResult;
            if (sortState.key === key) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = key;
                sortState.direction = 'desc';
            }
            renderFilteredResults();
        });
    });

    csvDownloadBtn.addEventListener('click', openCsvModal);
    closeCsvModalBtn.addEventListener('click', closeCsvModal);
    csvForm.addEventListener('submit', handleCsvDownload);

    window.addEventListener('click', (event) => {
        if (event.target === assignmentModal) closeAssignmentModal();
        if (event.target === csvModal) closeCsvModal();
    });
}