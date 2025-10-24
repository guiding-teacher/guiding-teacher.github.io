import { auth, db } from './firebase-config.js';
import { doc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// معالجة تسجيل الدخول
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('lastActivity', Date.now().toString());
            window.location.href = 'admin.html';
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        }
    });
}

// معالجة إنشاء الحساب
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const institution = document.getElementById('institution').value.trim();
        const governorate = document.getElementById('governorate').value.trim();
        const dob = document.getElementById('dob').value.trim();
        const gender = document.getElementById('gender').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorMessage = document.getElementById('error-message');

        if (!name || !email || !phone || !institution || !governorate || !dob || !password || !gender) {
            errorMessage.textContent = 'جميع الحقول إجبارية. يرجى ملء جميع البيانات.';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'كلمات المرور غير متطابقة.';
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
            return;
        }

        try {
            // Step 1: Create user in Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const newAdminData = {
                name: name,
                email: email,
                phone: phone,
                institution: institution,
                governorate: governorate,
                dob: dob,
                gender: gender,
                createdAt: Timestamp.now(), // Use Firestore Timestamp
                lastLogin: Timestamp.now()
            };

            // Step 2: Create user document in Firestore and WAIT for it to finish
            await setDoc(doc(db, "admins", user.uid), newAdminData);

            // [FIX] Store data in sessionStorage as a temporary bridge for the first page load
            // This solves the race condition where the redirect is faster than Firestore's data propagation.
            sessionStorage.setItem('newAdminData', JSON.stringify({
                ...newAdminData,
                createdAt: newAdminData.createdAt.toDate().toISOString() // Convert Timestamp to string for storage
            }));
            
            localStorage.setItem('lastActivity', Date.now().toString());
            
            alert('تم إنشاء الحساب بنجاح!');
            window.location.href = 'admin.html';

        } catch (error) {
            console.error('خطأ في إنشاء الحساب:', error);
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'هذا البريد الإلكتروني مستخدم بالفعل.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
            } else {
                errorMessage.textContent = 'حدث خطأ أثناء إنشاء الحساب. تأكد من صلاحيات قاعدة البيانات.';
            }
        }
    });
}

// التحقق من حالة المستخدم
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    
    if (user) {
        if (path.includes('admin-login.html') || path.includes('admin-signup.html')) {
            window.location.replace('admin.html');
        }
    } else {
        if (path.includes('admin.html')) {
            window.location.replace('admin-login.html');
        }
    }
});


// حل طارئ لتحميل البيانات من الجلسة إذا فشل تحميلها من Firestore
function getAdminDataFromSession() {
    try {
        const sessionData = sessionStorage.getItem('newAdminData');
        if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            console.log('Loaded admin data from session storage as fallback');
            return parsedData;
        }
    } catch (error) {
        console.error('Error loading from session storage:', error);
    }
    return null;
}

// تأكد من أن البيانات الأساسية متاحة دائمًا
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    
    if (user) {
        // تخزين بيانات احتياطية في الجلسة
        if (path.includes('admin-signup.html')) {
            const name = document.getElementById('name')?.value;
            if (name) {
                const backupData = {
                    name: name,
                    email: user.email,
                    phone: document.getElementById('phone')?.value || '',
                    institution: document.getElementById('institution')?.value || '',
                    governorate: document.getElementById('governorate')?.value || '',
                    dob: document.getElementById('dob')?.value || '',
                    gender: document.getElementById('gender')?.value || 'male'
                };
                sessionStorage.setItem('newAdminData', JSON.stringify(backupData));
            }
        }
        
        if (path.includes('admin-login.html') || path.includes('admin-signup.html')) {
            window.location.replace('admin.html');
        }
    } else {
        if (path.includes('admin.html')) {
            window.location.replace('admin-login.html');
        }
    }
});




