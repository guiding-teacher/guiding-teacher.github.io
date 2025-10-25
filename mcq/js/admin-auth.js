// --- START OF FILE admin-auth.js ---
import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


/**
 * Helper function to show a redirect message and disable the form.
 * @param {string} messageId - The ID of the message element.
 * @param {HTMLButtonElement} button - The button element to disable.
 * @param {HTMLFormElement} form - The form element to disable.
 */
function showRedirectMessage(messageId, button, form) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
        messageEl.style.display = 'block';
    }
    if (button) {
        button.disabled = true;
        button.textContent = 'جاري التوجيه...';
    }
    if (form) {
        Array.from(form.elements).forEach(el => el.disabled = true);
    }
}


// --- معالجة تسجيل الدخول ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const loginButton = document.getElementById('login-button'); // Assume login button has this ID

        errorMessage.textContent = ''; // Clear previous errors

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // [NEW] Show redirect message on successful login
            showRedirectMessage('redirect-message', loginButton, loginForm);
            // onAuthStateChanged will handle the actual redirect
        } catch (error) {
            console.error('Login Error:', error);
            errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        }
    });
}

// --- معالجة إنشاء الحساب ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorMessage = document.getElementById('error-message');
        const signupButton = document.getElementById('signup-button');
        
        errorMessage.textContent = '';

        // [IMPROVED] JavaScript validation for password and email
        const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'الرجاء إدخال بريد إلكتروني صالح.';
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            errorMessage.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف وأرقام.';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'كلمات المرور غير متطابقة.';
            return;
        }

        try {
            // Disable button to prevent multiple submissions
            signupButton.disabled = true;
            signupButton.textContent = 'جاري الإنشاء...';

            await createUserWithEmailAndPassword(auth, email, password);
            // [NEW] Show redirect message on successful signup
            showRedirectMessage('redirect-message', signupButton, signupForm);
            // onAuthStateChanged will handle the redirect
            
        } catch (error) {
            console.error('Signup Error:', error);
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'هذا البريد الإلكتروني مستخدم بالفعل.';
            } else {
                errorMessage.textContent = `فشل إنشاء الحساب. الخطأ: ${error.message}`;
            }
            // Re-enable button on error
            signupButton.disabled = false;
            signupButton.textContent = 'إنشاء حساب';
        }
    });
}

// --- التحقق من حالة المستخدم وتوجيهه (منظم الآن) ---
onAuthStateChanged(auth, async (user) => {
    const currentPage = window.location.pathname.split('/').pop();

    if (user) {
        // User is logged in, check if their profile is complete
        const adminRef = doc(db, "admins", user.uid);
        const adminDoc = await getDoc(adminRef);

        if (!adminDoc.exists() || !adminDoc.data().name) {
            // Profile is INCOMPLETE, force redirect to complete-profile.html
            if (currentPage !== 'complete-profile.html') {
                window.location.replace('complete-profile.html');
            }
        } else {
            // Profile is COMPLETE, redirect to admin panel
            if (currentPage !== 'admin.html') {
                window.location.replace('admin.html');
            }
        }
    } else {
        // User is not logged in
        const protectedPages = ['admin.html', 'complete-profile.html'];
        if (protectedPages.includes(currentPage)) {
            window.location.replace('admin-login.html');
        }
    }
});