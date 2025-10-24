import { auth, db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
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
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('تم تسجيل الدخول بنجاح:', userCredential.user);
            
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const newAdminDataForFirestore = {
                name: name,
                email: email,
                phone: phone,
                institution: institution,
                governorate: governorate,
                dob: dob,
                gender: gender,
                createdAt: new Date(),
                lastLogin: new Date()
            };

            await setDoc(doc(db, "admins", user.uid), newAdminDataForFirestore);

            // تخزين البيانات الأساسية فقط في الجلسة لاستخدامها كحل احتياطي في الصفحة التالية
            const newAdminDataForSession = {
                name: name,
                phone: phone,
                institution: institution,
                governorate: governorate,
                dob: dob,
                gender: gender
            };
            sessionStorage.setItem('newAdminData', JSON.stringify(newAdminDataForSession));
            
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
                errorMessage.textContent = 'حدث خطأ أثناء إنشاء الحساب.';
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