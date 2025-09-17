

import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, addDoc, orderBy, deleteDoc } from "firebase/firestore";
import { factbookContentData, myWayContentData } from "./data";

// --- Type Declarations ---
interface UserProfile {
    email: string;
    name: string;
    picture: string;
    role?: 'student' | 'teacher';
    grade?: number;
    class?: number;
    studentNumber?: number;
    isAdmin?: boolean;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    questions: string[];
    assignedClasses?: string[];
    creatorName?: string;
    creatorEmail?: string;
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


// --- App State ---
let currentUser: UserProfile | null = null;
let editingAssignmentId: string | null = null;
let editingUserEmail: string | null = null;
let allResultsData: TestResult[] = [];
let allAssignmentsData: Assignment[] = [];
let allUsersData: UserProfile[] = [];

let resultsSortState: { key: keyof TestResult | 'total' | 'pronunciation' | 'fluency' | 'intonation', direction: 'asc' | 'desc' } = { key: 'completedAt', direction: 'desc' };
let userSortState: { key: keyof UserProfile, direction: 'asc' | 'desc' } = { key: 'name', direction: 'asc' };


// --- DOM Elements ---
const adminApp = document.getElementById('admin-app') as HTMLDivElement;

// Sidebar & User Profile
const userProfileEl = document.getElementById('user-profile') as HTMLDivElement;
const userNameEl = document.getElementById('user-name') as HTMLSpanElement;
const userEmailEl = document.getElementById('user-email') as HTMLSpanElement;
const userAvatarEl = document.getElementById('user-avatar') as HTMLImageElement;
const signOutBtn = document.getElementById('signout-btn') as HTMLButtonElement;

// Navigation
const navLinks = document.querySelectorAll('.nav-link');
const contentViews = document.querySelectorAll('.content-view');

// Assignments View
const assignmentsTableBody = document.querySelector('#assignments-table tbody') as HTMLTableSectionElement;
const assignmentsLoader = document.getElementById('assignments-loader') as HTMLDivElement;
const createAssignmentBtn = document.getElementById('create-assignment-btn') as HTMLButtonElement;
const assignmentSearchInput = document.getElementById('assignment-search-input') as HTMLInputElement;


// Results View
const resultsTableBody = document.querySelector('#results-table tbody') as HTMLTableSectionElement;
const resultsTableHeader = document.querySelector('#results-table thead') as HTMLTableSectionElement;
const resultsLoader = document.getElementById('results-loader') as HTMLDivElement;
const assignmentFilter = document.getElementById('assignment-filter') as HTMLSelectElement;
const classFilter = document.getElementById('class-filter') as HTMLSelectElement;
const creatorFilter = document.getElementById('creator-filter') as HTMLSelectElement;


// Users View
const usersTableBody = document.querySelector('#users-table tbody') as HTMLTableSectionElement;
const usersTableHeader = document.querySelector('#users-table thead') as HTMLTableSectionElement;
const usersLoader = document.getElementById('users-loader') as HTMLDivElement;
const userSearchInput = document.getElementById('user-search-input') as HTMLInputElement;
const userRoleFilter = document.getElementById('user-role-filter') as HTMLSelectElement;
const userGradeFilter = document.getElementById('user-grade-filter') as HTMLInputElement;
const userClassFilter = document.getElementById('user-class-filter') as HTMLInputElement;


// Dashboard View
const metricSubmissionsEl = document.getElementById('metric-submissions') as HTMLParagraphElement;
const metricActiveStudentsEl = document.getElementById('metric-active-students') as HTMLParagraphElement;
const metricAverageScoreEl = document.getElementById('metric-average-score') as HTMLParagraphElement;
const activityFeedList = document.getElementById('activity-feed-list') as HTMLUListElement;
const classPerformanceChart = document.getElementById('class-performance-chart') as HTMLDivElement;
const strugglingStudentsList = document.getElementById('struggling-students-list') as HTMLUListElement;

// Assignment Modal
const assignmentModal = document.getElementById('assignment-modal') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const closeModalBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
const assignmentForm = document.getElementById('assignment-form') as HTMLFormElement;
const assignmentTitleInput = document.getElementById('assignment-title') as HTMLInputElement;
const assignmentDescriptionInput = document.getElementById('assignment-description') as HTMLTextAreaElement;
const assignmentClassSelection = document.getElementById('assignment-class-selection') as HTMLDivElement;
const customSentencesInput = document.getElementById('custom-sentences-input') as HTMLTextAreaElement;
const sentenceSelectionContainer = document.getElementById('sentence-selection-container') as HTMLDivElement;
const saveAssignmentBtn = document.getElementById('save-assignment-btn') as HTMLButtonElement;

// User Edit Modal
const userEditModal = document.getElementById('user-edit-modal') as HTMLDivElement;
const userEditModalTitle = document.getElementById('user-edit-modal-title') as HTMLHeadingElement;
const closeUserEditModalBtn = document.getElementById('close-user-edit-modal-btn') as HTMLButtonElement;
const userEditForm = document.getElementById('user-edit-form') as HTMLFormElement;
const userEditEmailEl = document.getElementById('user-edit-email') as HTMLParagraphElement;
const userEditRoleSelect = document.getElementById('user-edit-role') as HTMLSelectElement;
const studentInfoFieldsEdit = document.getElementById('student-info-fields-edit') as HTMLDivElement;
const userEditGradeInput = document.getElementById('user-edit-grade') as HTMLInputElement;
const userEditClassInput = document.getElementById('user-edit-class') as HTMLInputElement;
const userEditStudentNumberInput = document.getElementById('user-edit-student-number') as HTMLInputElement;
const saveUserBtn = document.getElementById('save-user-btn') as HTMLButtonElement;
const adminSettingsEdit = document.getElementById('admin-settings-edit') as HTMLDivElement;
const adminCheckbox = document.getElementById('user-edit-is-admin') as HTMLInputElement;


// CSV Modal
const csvModal = document.getElementById('csv-modal') as HTMLDivElement;
const closeCsvModalBtn = document.getElementById('close-csv-modal-btn') as HTMLButtonElement;
const csvForm = document.getElementById('csv-form') as HTMLFormElement;
const csvDownloadBtn = document.getElementById('csv-download-btn') as HTMLButtonElement;
const csvClassSelection = document.getElementById('csv-class-selection') as HTMLDivElement;
const csvAssignmentSelection = document.getElementById('csv-assignment-selection') as HTMLDivElement;


// Toast
const toastNotification = document.getElementById('toast-notification') as HTMLDivElement;

// Mobile Navigation
const menuToggleBtn = document.getElementById('menu-toggle-btn') as HTMLButtonElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
const closeSidebarBtn = document.getElementById('close-sidebar-btn') as HTMLButtonElement;
const sidebarOverlay = document.getElementById('sidebar-overlay') as HTMLDivElement;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    const cachedUser = localStorage.getItem('userProfile');
    if (cachedUser) {
        const user = JSON.parse(cachedUser);
        await authorizeAdminUser(user);
    } else {
        window.location.href = '/index.html';
    }
}

// --- Authentication & Authorization ---
async function authorizeAdminUser(user: UserProfile) {
    try {
        const teacherRef = doc(db, "teachers", user.email);
        const teacherSnap = await getDoc(teacherRef);
        
        if (!teacherSnap.exists()) {
            alert('アクセス権限がありません。教員として登録されたアカウントでログインしてください。');
            window.location.href = '/index.html';
            return;
        }

        const userRef = doc(db, "users", user.email);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            currentUser = { ...user, ...userSnap.data() };
        } else {
            currentUser = { ...user, role: 'teacher' };
        }
        
        // Hardcode admin for bootstrapping purposes
        if (currentUser.email === 'k-magami@seibudai-chiba.jp') {
            currentUser.isAdmin = true;
        }

        showAdminPanel(currentUser);

    } catch (error) {
        console.error("Error verifying admin status:", error);
        alert('管理者情報の確認中にエラーが発生しました。');
        window.location.href = '/index.html';
    }
}


function signOut() {
    currentUser = null;
    localStorage.removeItem('userProfile');
    window.location.href = '/index.html';
}

// --- UI Management ---
function showAdminPanel(user: UserProfile) {
    adminApp.classList.remove('hidden');
    userNameEl.textContent = user.name;
    userEmailEl.textContent = user.email;
    userAvatarEl.src = user.picture;
    navigateTo('dashboard');
}

async function navigateTo(viewId: string, context: any = {}) {
    contentViews.forEach(view => view.classList.toggle('active', view.id === `${viewId}-view`));
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('data-view') === viewId));

    // Reset search/filters when navigating away from certain views
    if (viewId !== 'assignments') {
        assignmentSearchInput.value = '';
    }

    if (viewId === 'dashboard') await loadDashboardData();
    if (viewId === 'assignments') await loadAssignments();
    if (viewId === 'results') await loadAndDisplayResults(context);
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

async function loadAllAssignmentsData() {
    if (allAssignmentsData.length > 0) return; // Cache check
    try {
        const assignmentsCol = collection(db, 'assignments');
        const q = query(assignmentsCol, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        allAssignmentsData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Assignment));
    } catch (error) {
        console.error("Error loading all assignments data:", error);
        showToast('課題データの読み込みに失敗しました。', 'error');
    }
}


async function loadAssignments() {
    assignmentsLoader.classList.remove('hidden');
    assignmentsTableBody.innerHTML = '';
    try {
        await loadAllAssignmentsData();
        renderAssignmentsTable(allAssignmentsData);
    } catch (error) {
        console.error("Error loading assignments:", error);
        assignmentsTableBody.innerHTML = '<tr><td colspan="6">課題の読み込みに失敗しました。</td></tr>';
    } finally {
        assignmentsLoader.classList.add('hidden');
    }
}

function renderAssignmentsTable(assignments: Assignment[]) {
    assignmentsTableBody.innerHTML = '';
    if (assignments.length === 0) {
        assignmentsTableBody.innerHTML = '<tr class="no-data"><td colspan="6">該当する課題はありません。</td></tr>';
        return;
    }

    assignments.forEach(data => {
        const classDisplay = (data.assignedClasses || []).map(c => {
            const [grade, cls] = c.split('-');
            return `${grade}年${cls}組`;
        }).join(', ');

        const row = assignmentsTableBody.insertRow();
        row.innerHTML = `
            <td>${data.title}</td>
            <td>${data.description || '-'}</td>
            <td>${classDisplay}</td>
            <td>${data.creatorName || 'N/A'}</td>
            <td>${data.questions.length}</td>
        `;
        row.onclick = () => showResultsForAssignment(data.title);

        const actionsCell = row.insertCell();
        actionsCell.className = 'actions-cell';
        actionsCell.onclick = (e) => e.stopPropagation(); // Prevent row click when clicking buttons

        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.className = 'button-secondary';
        editButton.onclick = () => openAssignmentModal(data.id, data);
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.className = 'button-secondary button-danger';
        deleteButton.onclick = () => deleteAssignment(data.id, data.title);
        actionsCell.appendChild(deleteButton);
    });
}


async function deleteAssignment(id: string, title: string) {
    if (!confirm(`課題「${title}」を本当に削除しますか？この操作は元に戻せません。`)) {
        return;
    }
    try {
        await deleteDoc(doc(db, 'assignments', id));
        showToast('課題を削除しました。');
        allAssignmentsData = []; // Invalidate cache
        await loadAssignments(); // Refresh the list
    } catch (error) {
        console.error("Error deleting assignment: ", error);
        showToast('課題の削除に失敗しました。', 'error');
    }
}


async function getStudentClasses(): Promise<string[]> {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    const classes = new Set<string>();
    snapshot.docs.forEach(docSnap => {
        const user = docSnap.data();
        if (user.grade && user.class) {
            classes.add(`${user.grade}-${user.class}`);
        }
    });
    return Array.from(classes).sort();
}

async function loadAndDisplayResults(context: any = {}) {
    resultsLoader.classList.remove('hidden');
    resultsTableBody.innerHTML = '';
    try {
        await Promise.all([
            populateResultsFilter(),
            populateClassFilter(),
            populateCreatorFilter(),
            loadAllResultsData()
        ]);

        if (context.assignmentTitle) {
            assignmentFilter.value = context.assignmentTitle;
        }

        renderFilteredResults();
    } catch (error) {
        console.error("Error loading results page:", error);
        resultsTableBody.innerHTML = '<tr><td colspan="10">成績の読み込みに失敗しました。</td></tr>';
    } finally {
        resultsLoader.classList.add('hidden');
    }
}

async function loadAllResultsData() {
    const resultsQuery = query(collection(db, 'testResults'), orderBy('completedAt', 'desc'));
    const snapshot = await getDocs(resultsQuery);
    allResultsData = snapshot.docs.map(docSnap => docSnap.data() as TestResult);
}

function renderFilteredResults() {
    const selectedAssignment = assignmentFilter.value;
    const selectedClass = classFilter.value;
    const selectedCreator = creatorFilter.value;

    let filteredData = allResultsData;

    if (selectedCreator !== 'all') {
        const creatorAssignments = allAssignmentsData.filter(a => a.creatorName === selectedCreator);
        const creatorAssignmentTitles = new Set(creatorAssignments.map(a => a.title));
        filteredData = filteredData.filter(d => creatorAssignmentTitles.has(d.testTitle));
    }

    if (selectedAssignment !== 'all') {
        filteredData = filteredData.filter(d => d.testTitle === selectedAssignment);
    }
    if (selectedClass !== 'all') {
        const [grade, cls] = selectedClass.split('-').map(Number);
        filteredData = filteredData.filter(d => d.studentGrade === grade && d.studentClass === cls);
    }
    
    renderResultsTable(filteredData);
}

function renderResultsTable(data: TestResult[]) {
    // Sort data
    data.sort((a, b) => {
        const key = resultsSortState.key;
        let valA, valB;

        if (key === 'total') {
            valA = (a.scores.pronunciation || 0) + (a.scores.fluency || 0) + (a.scores.intonation || 0);
            valB = (b.scores.pronunciation || 0) + (b.scores.fluency || 0) + (b.scores.intonation || 0);
        } else if (key === 'pronunciation' || key === 'fluency' || key === 'intonation') {
             valA = a.scores[key as keyof typeof a.scores] ?? 0;
             valB = b.scores[key as keyof typeof b.scores] ?? 0;
        } else {
            valA = a[key as keyof TestResult] ?? '';
            valB = b[key as keyof TestResult] ?? '';
        }

        if (valA < valB) return resultsSortState.direction === 'asc' ? -1 : 1;
        if (valA > valB) return resultsSortState.direction === 'asc' ? 1 : -1;
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
    updateResultsSortIndicators();
}


function updateResultsSortIndicators() {
    resultsTableHeader.querySelectorAll('th[data-sort-key]').forEach(th => {
        const key = th.getAttribute('data-sort-key');
        const span = th.querySelector('span') as HTMLSpanElement;
        if (key === resultsSortState.key) {
            span.textContent = resultsSortState.direction === 'asc' ? '▲' : '▼';
        } else {
            span.textContent = '';
        }
    });
}

async function populateResultsFilter() {
    await loadAllAssignmentsData();
    assignmentFilter.innerHTML = `<option value="all">すべての課題</option>`;
    allAssignmentsData.forEach(assignment => {
        const option = document.createElement('option');
        option.value = assignment.title;
        option.textContent = assignment.title;
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

async function populateCreatorFilter() {
    await loadAllAssignmentsData();
    creatorFilter.innerHTML = `<option value="all">すべての作成者</option>`;
    const creators = new Set(allAssignmentsData.map(a => a.creatorName).filter(Boolean));
    creators.forEach(name => {
        const option = document.createElement('option');
        option.value = name as string;
        option.textContent = name as string;
        creatorFilter.appendChild(option);
    });
}

async function loadUsers() {
    usersTableBody.innerHTML = '';
    usersLoader.classList.remove('hidden');
    try {
        if (allUsersData.length === 0) {
            const snapshot = await getDocs(query(collection(db, 'users')));
             allUsersData = snapshot.docs.map(docSnap => ({ ...docSnap.data(), email: docSnap.id })) as UserProfile[];
        }
       renderFilteredUsers();
    } catch (error) {
        console.error("Error loading users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="7">ユーザーの読み込みに失敗しました。</td></tr>';
    } finally {
        usersLoader.classList.add('hidden');
    }
}

function renderFilteredUsers() {
    const nameFilter = userSearchInput.value.toLowerCase();
    const roleFilter = userRoleFilter.value;
    const gradeFilter = userGradeFilter.value;
    const classFilter = userClassFilter.value;

    let filteredUsers = allUsersData.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(nameFilter) || user.email.toLowerCase().includes(nameFilter);
        const roleMatch = roleFilter === 'all' || user.role === roleFilter;
        const gradeMatch = !gradeFilter || user.grade?.toString() === gradeFilter;
        const classMatch = !classFilter || user.class?.toString() === classFilter;
        return nameMatch && roleMatch && gradeMatch && classMatch;
    });
    
    // Sort data
    filteredUsers.sort((a, b) => {
        const { key, direction } = userSortState;

        if (key === 'role') {
            const roleOrder = { 'teacher': 1, 'student': 2 };
            const orderA = roleOrder[a.role || 'student'] || 3;
            const orderB = roleOrder[b.role || 'student'] || 3;
            const comparison = orderA - orderB;
            return direction === 'asc' ? comparison : -comparison;
        }

        const valA = a[key as keyof UserProfile] ?? (typeof a[key as keyof UserProfile] === 'number' ? 0 : '');
        const valB = b[key as keyof UserProfile] ?? (typeof b[key as keyof UserProfile] === 'number' ? 0 : '');

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB), 'ja');
        }

        return direction === 'asc' ? comparison : -comparison;
    });

    renderUsersTable(filteredUsers);
    updateUserSortIndicators();
}


function renderUsersTable(users: UserProfile[]) {
    usersTableBody.innerHTML = '';
    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="7">該当するユーザーはいません。</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const row = usersTableBody.insertRow();
        row.innerHTML = `
            <td><div class="user-name-cell"><img src="${user.picture}" alt="${user.name}" class="user-avatar-small"><span>${user.name}</span></div></td>
            <td>${user.email}</td>
            <td>${user.role === 'teacher' ? '教員' : '生徒'}</td>
            <td>${user.grade || '-'}</td>
            <td>${user.class || '-'}</td>
            <td>${user.studentNumber || '-'}</td>
        `;
        const actionsCell = row.insertCell();
        actionsCell.className = 'actions-cell';

        if (currentUser?.isAdmin) {
            const editButton = document.createElement('button');
            editButton.textContent = '編集';
            editButton.className = 'button-secondary';
            editButton.onclick = () => openUserEditModal(user);
            actionsCell.appendChild(editButton);

            if (currentUser.email !== user.email) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'button-secondary button-danger';
                deleteButton.onclick = () => deleteUser(user.email, user.name);
                actionsCell.appendChild(deleteButton);
            }
        } else {
            actionsCell.textContent = '-';
        }
    });
}


function updateUserSortIndicators() {
    usersTableHeader.querySelectorAll('th[data-sort-key]').forEach(th => {
        const key = th.getAttribute('data-sort-key');
        const span = th.querySelector('span') as HTMLSpanElement;
        if (key === userSortState.key) {
            span.textContent = userSortState.direction === 'asc' ? '▲' : '▼';
        } else {
            span.textContent = '';
        }
    });
}

// --- Dashboard Specific Functions ---

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "年前";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "ヶ月前";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "日前";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "時間前";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "分前";
    return "たった今";
}


async function loadDashboardData() {
    // Reset placeholders
    metricSubmissionsEl.textContent = '--';
    metricActiveStudentsEl.textContent = '--';
    metricAverageScoreEl.textContent = '--';
    activityFeedList.innerHTML = '<li class="loading-placeholder">データを読み込んでいます...</li>';
    classPerformanceChart.innerHTML = '<div class="loading-placeholder">データを読み込んでいます...</div>';
    strugglingStudentsList.innerHTML = '<li class="loading-placeholder">データを読み込んでいます...</li>';

    try {
        const resultsQuery = query(collection(db, 'testResults'), orderBy('completedAt', 'desc'));
        const snapshot = await getDocs(resultsQuery);
        const allResults: TestResult[] = snapshot.docs.map(doc => doc.data() as TestResult);

        // 1. Major Metrics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const todaysSubmissions = allResults.filter(r => new Date(r.completedAt) >= today).length;
        
        const weeklyActiveStudents = new Set(
            allResults.filter(r => new Date(r.completedAt) >= sevenDaysAgo).map(r => r.studentEmail)
        ).size;
        
        const recent50Results = allResults.slice(0, 50);
        const averageScore = recent50Results.length > 0
            ? recent50Results.reduce((sum, r) => sum + (r.scores.pronunciation + r.scores.fluency + r.scores.intonation), 0) / recent50Results.length
            : 0;
            
        metricSubmissionsEl.textContent = todaysSubmissions.toString();
        metricActiveStudentsEl.textContent = weeklyActiveStudents.toString();
        metricAverageScoreEl.textContent = `${averageScore.toFixed(1)} / 30`;

        // 2. Recent Activity
        const recent5Activities = allResults.slice(0, 5);
        activityFeedList.innerHTML = '';
        if (recent5Activities.length > 0) {
            recent5Activities.forEach(activity => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <span class="student-name">${activity.studentName}</span> さんが
                        <span>「${activity.testTitle}」</span> を提出しました
                    </div>
                    <span class="activity-time">${formatRelativeTime(activity.completedAt)}</span>
                `;
                activityFeedList.appendChild(li);
            });
        } else {
             activityFeedList.innerHTML = '<li>最近のアクティビティはありません。</li>';
        }

        // 3. Class Performance
        const classData: { [key: string]: { pronunciation: number[], fluency: number[], intonation: number[], count: number } } = {};
        allResults.forEach(r => {
            if (r.studentGrade && r.studentClass) {
                const classKey = `${r.studentGrade}-${r.studentClass}`;
                if (!classData[classKey]) {
                    classData[classKey] = { pronunciation: [], fluency: [], intonation: [], count: 0 };
                }
                classData[classKey].pronunciation.push(r.scores.pronunciation);
                classData[classKey].fluency.push(r.scores.fluency);
                classData[classKey].intonation.push(r.scores.intonation);
                classData[classKey].count++;
            }
        });
        
        classPerformanceChart.innerHTML = '';
        if (Object.keys(classData).length > 0) {
            for (const classKey in classData) {
                const data = classData[classKey];
                const avgPron = data.pronunciation.reduce((a, b) => a + b, 0) / data.count;
                const avgFlu = data.fluency.reduce((a, b) => a + b, 0) / data.count;
                const avgInton = data.intonation.reduce((a, b) => a + b, 0) / data.count;
                const [grade, cls] = classKey.split('-');

                const classGroup = document.createElement('div');
                classGroup.className = 'chart-class-group';
                classGroup.innerHTML = `
                    <div class="chart-bars">
                        <div class="chart-bar pronunciation" style="height: ${avgPron * 10}%" title="発音">
                            <span class="tooltip">発音: ${avgPron.toFixed(1)}</span>
                        </div>
                        <div class="chart-bar fluency" style="height: ${avgFlu * 10}%" title="流暢さ">
                             <span class="tooltip">流暢さ: ${avgFlu.toFixed(1)}</span>
                        </div>
                        <div class="chart-bar intonation" style="height: ${avgInton * 10}%" title="イントネーション">
                             <span class="tooltip">ｲﾝﾄﾈｰｼｮﾝ: ${avgInton.toFixed(1)}</span>
                        </div>
                    </div>
                    <span class="chart-class-name">${grade}年${cls}組</span>
                `;
                classPerformanceChart.appendChild(classGroup);
            }
        } else {
             classPerformanceChart.innerHTML = '<div class="loading-placeholder">表示するデータがありません。</div>';
        }


        // 4. Struggling Students
        const studentScores: { [email: string]: { totalScores: number[], name: string } } = {};
        allResults.forEach(r => {
            if (!studentScores[r.studentEmail]) {
                studentScores[r.studentEmail] = { totalScores: [], name: r.studentName };
            }
            const total = r.scores.pronunciation + r.scores.fluency + r.scores.intonation;
            studentScores[r.studentEmail].totalScores.push(total);
        });
        
        const studentAverages = Object.entries(studentScores).map(([email, data]) => {
            const average = data.totalScores.reduce((a, b) => a + b, 0) / data.totalScores.length;
            return { name: data.name, average };
        });

        const strugglingStudents = studentAverages.sort((a, b) => a.average - b.average).slice(0, 5);

        strugglingStudentsList.innerHTML = '';
        if (strugglingStudents.length > 0) {
            strugglingStudents.forEach(student => {
                 const li = document.createElement('li');
                 li.innerHTML = `
                    <span>${student.name}</span>
                    <span class="score">${student.average.toFixed(1)} / 30</span>
                 `;
                 strugglingStudentsList.appendChild(li);
            });
        } else {
            strugglingStudentsList.innerHTML = '<li>該当する生徒はいません。</li>';
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Maybe show an error on each card
    }
}


async function openAssignmentModal(id?: string, data?: Assignment) {
    editingAssignmentId = id || null;
    assignmentForm.reset();
    customSentencesInput.value = '';
    sentenceSelectionContainer.innerHTML = '<div>読み込み中...</div>';
    assignmentClassSelection.innerHTML = '<div>読み込み中...</div>';
    assignmentModal.classList.remove('hidden');

    // Populate classes
    try {
        const classes = await getStudentClasses();
        assignmentClassSelection.innerHTML = ''; // Clear loader
        if (classes.length === 0) {
            assignmentClassSelection.innerHTML = '<p>登録されている生徒のクラスがありません。</p>';
        } else {
            classes.forEach(c => {
                const [grade, cls] = c.split('-');
                const item = document.createElement('div');
                item.className = 'checkbox-item-label';
                item.innerHTML = `
                    <input type="checkbox" id="class-${c}" value="${c}" name="assignedClasses">
                    <span>${grade}年${cls}組</span>
                `;
                assignmentClassSelection.appendChild(item);
            });
        }
    } catch {
        assignmentClassSelection.innerHTML = '<p>クラスの読み込みに失敗しました。</p>';
    }

    // Populate sentences
    sentenceSelectionContainer.innerHTML = ''; // Clear loader
    
    // Factbook
    const factbookGroup = document.createElement('div');
    factbookGroup.className = 'sentence-group';
    factbookGroup.innerHTML = '<h4>FACTBOOK</h4>';
    Object.values(factbookContentData).forEach(chapterData => {
        const chapterId = `chapter-${chapterData.title.replace(/\s+/g, '-')}`;
        const chapterContainer = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `<input type="checkbox" id="${chapterId}-all"><label for="${chapterId}-all"><span>${chapterData.title}</span></label>`;
        
        const sentenceList = document.createElement('div');
        sentenceList.className = 'nested-list hidden';

        chapterData.sections.flatMap(s => s.sentences).forEach(sentence => {
            const sentenceId = `sentence-${sentence.en.replace(/[^a-zA-Z0-9]/g, '')}`;
            const item = document.createElement('div');
            item.className = 'sentence-item-label';
            item.innerHTML = `
                <input type="checkbox" id="${sentenceId}" value="${sentence.en}" name="questions">
                <span>${sentence.en}</span>`;
            sentenceList.appendChild(item);
        });

        chapterContainer.appendChild(header);
        chapterContainer.appendChild(sentenceList);
        factbookGroup.appendChild(chapterContainer);

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
                header.classList.toggle('expanded');
                sentenceList.classList.toggle('hidden');
            }
        });

        const masterCheckbox = header.querySelector<HTMLInputElement>('input[type="checkbox"]');
        masterCheckbox?.addEventListener('change', () => {
            const isChecked = masterCheckbox.checked;
            sentenceList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
        });
    });
    sentenceSelectionContainer.appendChild(factbookGroup);
    
    // My Way
    const myWayGroup = document.createElement('div');
    myWayGroup.className = 'sentence-group';
    myWayGroup.innerHTML = '<h4>MY WAY</h4>';
    Object.values(myWayContentData).forEach(book => {
        book.lessons.forEach(lesson => {
            const lessonId = `lesson-${lesson.lessonTitle.replace(/\s+/g, '-')}`;
            const lessonContainer = document.createElement('div');
            const header = document.createElement('div');
            header.className = 'lesson-header';
            header.innerHTML = `<input type="checkbox" id="${lessonId}-all"><label for="${lessonId}-all"><span>${lesson.lessonTitle}</span></label>`;
            
            const sectionList = document.createElement('div');
            sectionList.className = 'nested-list hidden';

            lesson.sections.forEach(section => {
                const sectionId = `${lessonId}-section-${section.sectionTitle.replace(/\s+/g, '-')}`;
                const sectionContainer = document.createElement('div');
                const sectionHeader = document.createElement('div');
                sectionHeader.className = 'section-header';
                sectionHeader.innerHTML = `<input type="checkbox" id="${sectionId}-all"><label for="${sectionId}-all"><span>${section.sectionTitle}</span></label>`;
                
                const sentenceList = document.createElement('div');
                sentenceList.className = 'nested-list hidden';
                
                section.sentences.forEach(sentence => {
                     const sentenceId = `sentence-${sentence.en.replace(/[^a-zA-Z0-9]/g, '')}`;
                     const item = document.createElement('div');
                     item.className = 'sentence-item-label';
                     item.innerHTML = `<input type="checkbox" id="${sentenceId}" value="${sentence.en}" name="questions"><span>${sentence.en}</span>`;
                     sentenceList.appendChild(item);
                });

                sectionContainer.appendChild(sectionHeader);
                sectionContainer.appendChild(sentenceList);
                sectionList.appendChild(sectionContainer);

                sectionHeader.addEventListener('click', (e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        sectionHeader.classList.toggle('expanded');
                        sentenceList.classList.toggle('hidden');
                    }
                });
                
                const masterCheckbox = sectionHeader.querySelector<HTMLInputElement>('input[type="checkbox"]');
                masterCheckbox?.addEventListener('change', () => {
                    const isChecked = masterCheckbox.checked;
                    sentenceList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
                });
            });

            lessonContainer.appendChild(header);
            lessonContainer.appendChild(sectionList);
            myWayGroup.appendChild(lessonContainer);
            
            header.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    header.classList.toggle('expanded');
                    sectionList.classList.toggle('hidden');
                }
            });

            const masterCheckbox = header.querySelector<HTMLInputElement>('input[type="checkbox"]');
            masterCheckbox?.addEventListener('change', () => {
                const isChecked = masterCheckbox.checked;
                sectionList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
            });
        });
    });
    sentenceSelectionContainer.appendChild(myWayGroup);

    if (id && data) {
        // Editing mode
        modalTitle.textContent = '課題を編集';
        saveAssignmentBtn.textContent = '更新する';
        assignmentTitleInput.value = data.title;
        assignmentDescriptionInput.value = data.description;
        
        data.assignedClasses?.forEach(cls => {
            const checkbox = assignmentClassSelection.querySelector<HTMLInputElement>(`input[value="${cls}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Separate custom sentences from predefined ones
        const allPredefinedSentences = new Set([
            ...Object.values(factbookContentData).flatMap(c => c.sections.flatMap(s => s.sentences.map(sen => sen.en))),
            ...Object.values(myWayContentData).flatMap(book => book.lessons.flatMap(l => l.sections.flatMap(s => s.sentences.map(sen => sen.en))))
        ]);
        
        const customSentences: string[] = [];
        data.questions.forEach(q => {
            if (allPredefinedSentences.has(q)) {
                const safeValue = q.replace(/"/g, '&quot;');
                const checkbox = sentenceSelectionContainer.querySelector<HTMLInputElement>(`input[value="${safeValue}"]`);
                if (checkbox) checkbox.checked = true;
            } else {
                customSentences.push(q);
            }
        });
        customSentencesInput.value = customSentences.join('\n');


    } else {
        // Creating mode
        modalTitle.textContent = '新規課題を作成';
        saveAssignmentBtn.textContent = '作成する';
    }
}

async function handleSaveAssignment(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUser) return;

    const title = assignmentTitleInput.value.trim();
    const description = assignmentDescriptionInput.value.trim();
    
    const assignedClasses = Array.from(document.querySelectorAll<HTMLInputElement>('#assignment-class-selection input:checked')).map(input => input.value);
    
    const selectedSentences = Array.from(document.querySelectorAll<HTMLInputElement>('#sentence-selection-container input[name="questions"]:checked')).map(input => input.value);
    const customSentences = customSentencesInput.value.trim().split('\n').filter(line => line.trim() !== '');

    const questions = [...new Set([...selectedSentences, ...customSentences])];

    if (!title || questions.length === 0 || assignedClasses.length === 0) {
        showToast('タイトル、対象クラス、および1つ以上の問題（任意入力または選択）を入力してください。', 'error');
        return;
    }

    const assignmentData = {
        title,
        description,
        assignedClasses,
        questions,
        creatorName: currentUser.name,
        creatorEmail: currentUser.email,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (editingAssignmentId) {
            await updateDoc(doc(db, 'assignments', editingAssignmentId), assignmentData);
            showToast('課題を更新しました。');
        } else {
            const newAssignment = { ...assignmentData, createdAt: new Date().toISOString() };
            await addDoc(collection(db, 'assignments'), newAssignment);
            showToast('課題を作成しました。');
        }
        assignmentModal.classList.add('hidden');
        allAssignmentsData = []; // Invalidate cache
        await loadAssignments(); // Refresh list
    } catch (error) {
        console.error("Error saving assignment: ", error);
        showToast('課題の保存に失敗しました。', 'error');
    }
}

function showResultsForAssignment(title: string) {
    navigateTo('results', { assignmentTitle: title });
}


// --- User Management ---

async function deleteUser(email: string, name: string) {
    if (!confirm(`ユーザー「${name}」を本当に削除しますか？この操作は元に戻せません。`)) {
        return;
    }
    try {
        await deleteDoc(doc(db, 'users', email));
        showToast('ユーザーを削除しました。');
        allUsersData = allUsersData.filter(u => u.email !== email);
        renderFilteredUsers(); // Refresh list without re-fetching
    } catch (error) {
        console.error("Error deleting user:", error);
        showToast('ユーザーの削除に失敗しました。', 'error');
    }
}

function openUserEditModal(user: UserProfile) {
    editingUserEmail = user.email;
    userEditForm.reset();
    userEditEmailEl.textContent = user.email;
    userEditRoleSelect.value = user.role || 'student';
    userEditGradeInput.value = user.grade?.toString() || '';
    userEditClassInput.value = user.class?.toString() || '';
    userEditStudentNumberInput.value = user.studentNumber?.toString() || '';

    // Only show admin settings if current user is an admin and the user being edited is a teacher.
    if (currentUser?.isAdmin && user.role === 'teacher') {
        adminSettingsEdit.classList.remove('hidden');
        adminCheckbox.checked = !!user.isAdmin;
    } else {
        adminSettingsEdit.classList.add('hidden');
        adminCheckbox.checked = false;
    }

    toggleStudentFieldsEdit();
    userEditModal.classList.remove('hidden');
}

function closeUserEditModal() {
    userEditModal.classList.add('hidden');
    editingUserEmail = null;
}

function toggleStudentFieldsEdit() {
    const isStudent = userEditRoleSelect.value === 'student';
    studentInfoFieldsEdit.style.display = isStudent ? 'block' : 'none';
    userEditGradeInput.required = isStudent;
    userEditClassInput.required = isStudent;
    userEditStudentNumberInput.required = isStudent;
    
    // Only show admin settings for teachers, and only if current user is admin
    if (userEditRoleSelect.value === 'teacher' && currentUser?.isAdmin) {
        adminSettingsEdit.classList.remove('hidden');
    } else {
        adminSettingsEdit.classList.add('hidden');
    }
}

async function handleSaveUser(event: SubmitEvent) {
    event.preventDefault();
    if (!editingUserEmail) return;

    const role = userEditRoleSelect.value as 'student' | 'teacher';
    const profileData: Partial<UserProfile> = { role };

    if (role === 'student') {
        profileData.grade = parseInt(userEditGradeInput.value, 10) || null;
        profileData.class = parseInt(userEditClassInput.value, 10) || null;
        profileData.studentNumber = parseInt(userEditStudentNumberInput.value, 10) || null;
        profileData.isAdmin = false; // Students cannot be admins
    } else { // role is 'teacher'
        profileData.grade = null;
        profileData.class = null;
        profileData.studentNumber = null;
        if (currentUser?.isAdmin) {
            profileData.isAdmin = adminCheckbox.checked;
        }
    }

    try {
        await updateDoc(doc(db, 'users', editingUserEmail), { ...profileData, updatedAt: new Date().toISOString() });
        showToast('ユーザー情報を更新しました。');
        closeUserEditModal();
        allUsersData = []; // Invalidate cache
        await loadUsers();
    } catch (error) {
        console.error("Error updating user:", error);
        showToast('ユーザー情報の更新に失敗しました。', 'error');
    }
}


function setupEventListeners() {
    signOutBtn.addEventListener('click', signOut);

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.add('hidden');
    };

    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.remove('hidden');
    });

    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = (e.currentTarget as HTMLElement).getAttribute('data-view');
            if (viewId) {
                navigateTo(viewId);
            }
            // Close sidebar on navigation in mobile view
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    });

    createAssignmentBtn.addEventListener('click', () => openAssignmentModal());
    closeModalBtn.addEventListener('click', () => assignmentModal.classList.add('hidden'));
    assignmentForm.addEventListener('submit', handleSaveAssignment);

    // Results Filters
    assignmentFilter.addEventListener('change', renderFilteredResults);
    classFilter.addEventListener('change', renderFilteredResults);
    creatorFilter.addEventListener('change', renderFilteredResults);

    // Assignment Search
    assignmentSearchInput.addEventListener('input', () => {
        const searchTerm = assignmentSearchInput.value.toLowerCase();
        const filtered = allAssignmentsData.filter(a => 
            a.title.toLowerCase().includes(searchTerm) || 
            a.creatorName?.toLowerCase().includes(searchTerm)
        );
        renderAssignmentsTable(filtered);
    });

    // Results Sorting
    resultsTableHeader.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const th = target.closest('th[data-sort-key]');
        if (!th) return;
        
        const key = th.getAttribute('data-sort-key') as any;
        if (resultsSortState.key === key) {
            resultsSortState.direction = resultsSortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            resultsSortState.key = key;
            resultsSortState.direction = 'desc';
        }
        renderFilteredResults();
    });
    
    // User Filters
    userSearchInput.addEventListener('input', renderFilteredUsers);
    userRoleFilter.addEventListener('change', renderFilteredUsers);
    userGradeFilter.addEventListener('input', renderFilteredUsers);
    userClassFilter.addEventListener('input', renderFilteredUsers);
    
    // User Sorting
    usersTableHeader.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const th = target.closest('th[data-sort-key]');
        if (!th) return;

        const key = th.getAttribute('data-sort-key') as keyof UserProfile;
        if (userSortState.key === key) {
            userSortState.direction = userSortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            userSortState.key = key;
            userSortState.direction = 'asc';
        }
        renderFilteredUsers();
    });


    // User Edit Modal
    closeUserEditModalBtn.addEventListener('click', closeUserEditModal);
    userEditForm.addEventListener('submit', handleSaveUser);
    userEditRoleSelect.addEventListener('change', toggleStudentFieldsEdit);


    // Modal closing on outside click
    window.addEventListener('click', (event) => {
        if (event.target === assignmentModal) assignmentModal.classList.add('hidden');
        if (event.target === csvModal) csvModal.classList.add('hidden');
        if (event.target === userEditModal) closeUserEditModal();
    });

    closeCsvModalBtn.addEventListener('click', () => csvModal.classList.add('hidden'));
    
    // Quick Links
    document.querySelectorAll('.quick-link-btn').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const viewId = (e.currentTarget as HTMLElement).getAttribute('data-view');
            if(viewId) navigateTo(viewId);
        });
    });
}