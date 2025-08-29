
// FIX: Add export {} to make this file a module, which is required for global declarations.
export {};

declare global {
  interface Window {
    google: any;
    onGoogleLibraryLoad: () => void;
  }
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
  }
}

interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

const loginContainer = document.getElementById('login-container') as HTMLDivElement;
const hubContent = document.getElementById('hub-content') as HTMLElement;
const googleSignInButton = document.getElementById('google-signin-button-hub') as HTMLDivElement;
const userProfileHub = document.getElementById('user-profile-hub') as HTMLDivElement;
const userNameHub = document.getElementById('user-name-hub') as HTMLSpanElement;
const userAvatarHub = document.getElementById('user-avatar-hub') as HTMLImageElement;
const signOutBtnHub = document.getElementById('signout-btn-hub') as HTMLButtonElement;
const hubSubtitle = document.getElementById('hub-subtitle') as HTMLParagraphElement;


function showApp(user: UserProfile) {
    loginContainer.classList.add('hidden');
    hubContent.classList.remove('hidden');
    userProfileHub.classList.remove('hidden');
    userNameHub.textContent = user.name;
    userAvatarHub.src = user.picture;
    hubSubtitle.textContent = "学びたいアプリを選んでください。";
}

function showLogin() {
    loginContainer.classList.remove('hidden');
    hubContent.classList.add('hidden');
    userProfileHub.classList.add('hidden');
    hubSubtitle.textContent = "Googleアカウントでログインしてください。";

}

function signOut() {
    localStorage.removeItem('userProfile');
    // It's better to check if google and its properties exist before calling them.
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
    }
    showLogin();
}

async function handleCredentialResponse(response: any) {
    const idToken = response.credential;
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
    showApp(user);
}

window.onGoogleLibraryLoad = () => {
    window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(
        googleSignInButton,
        { theme: 'outline', size: 'large', type: 'standard' }
    );
     // Prompt for login immediately if not signed in
    const cachedUser = localStorage.getItem('userProfile');
    if (!cachedUser) {
        window.google.accounts.id.prompt();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const cachedUser = localStorage.getItem('userProfile');
    if (cachedUser) {
        showApp(JSON.parse(cachedUser));
    } else {
        showLogin();
    }
    signOutBtnHub.addEventListener('click', signOut);
});