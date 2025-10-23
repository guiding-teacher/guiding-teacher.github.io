import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('login-form');
const studentNameInput = document.getElementById('student-name');
const accessCodeInput = document.getElementById('access-code');
const errorMessage = document.getElementById('error-message');

const urlParams = new URLSearchParams(window.location.search);
const examIdFromUrl = urlParams.get('exam');

if (!examIdFromUrl) {
    document.querySelector('.login-container').innerHTML = "<h2>خطأ</h2><p>الرجاء استخدام رابط الاختبار الصحيح الذي تم تزويدك به.</p>";
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!examIdFromUrl) return;

    const name = studentNameInput.value.trim();
    const code = accessCodeInput.value.trim();
    errorMessage.textContent = '';
  
    if (!name || !code) {
        errorMessage.textContent = 'الرجاء إدخال الاسم ورمز الدخول.';
        return;
    }
  
    try {
        // Step 1: Authenticate the student by name and access code
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("name", "==", name), where("accessCode", "==", code));
        const querySnapshot = await getDocs(q);
    
        if (querySnapshot.empty) {
            errorMessage.textContent = 'الاسم أو رمز الدخول غير صحيح.';
            return;
        }

        const studentDoc = querySnapshot.docs[0];
        const studentId = studentDoc.id;
      
        // Step 2: Authorize the student for this specific exam
        // CRITICAL CHANGE: Instead of checking a field on the student, we check for their existence in the exam's participants subcollection.
        const participantRef = doc(db, "exams", examIdFromUrl, "participants", studentId);
        const participantSnap = await getDoc(participantRef);

        if (!participantSnap.exists()) {
            errorMessage.textContent = 'أنت غير معين لهذا الاختبار. يرجى مراجعة المشرف.';
            return;
        }

        // Optional: Check if the exam was already completed and the code has expired (e.g., 1 hour after completion)
        if (participantSnap.data().endTime) {
            const endTime = participantSnap.data().endTime.toMillis();
            if (Date.now() - endTime > 3600 * 1000) { // 1 hour
                errorMessage.textContent = 'لقد انتهت صلاحية رمز الدخول هذا بعد إكمال الاختبار.';
                return;
            }
        }
          
        // All checks passed, proceed to the exam start page
        sessionStorage.setItem('studentName', name);
        sessionStorage.setItem('studentId', studentId);
        sessionStorage.setItem('examId', examIdFromUrl);
        window.location.href = 'start.html';

    } catch (error) {
        console.error("Login Error:", error);
        errorMessage.textContent = 'حدث خطأ. حاول مرة أخرى.';
    }
});