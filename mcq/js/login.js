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
        // الخطوة 1: جلب بيانات الاختبار للحصول على هوية المشرف وإعدادات عرض النتيجة
        const examRef = doc(db, "exams", examIdFromUrl);
        const examSnap = await getDoc(examRef);

        if (!examSnap.exists()) {
            errorMessage.textContent = 'رابط الاختبار غير صالح أو تم حذف الاختبار.';
            return;
        }

        const examData = examSnap.data();
        const adminId = examData.adminId;

        if (!adminId) {
            errorMessage.textContent = 'خطأ في بيانات الاختبار. يرجى إبلاغ المشرف.';
            console.error("Exam document is missing adminId field.");
            return;
        }

        // الخطوة 2: البحث عن الطالب مع التأكد من أنه يتبع للمشرف الصحيح
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, 
            where("name", "==", name), 
            where("accessCode", "==", code),
            where("adminId", "==", adminId) 
        );
        const querySnapshot = await getDocs(q);
    
        if (querySnapshot.empty) {
            errorMessage.textContent = 'الاسم أو رمز الدخول غير صحيح، أو أنك لا تتبع للمشرف الخاص بهذا الاختبار.';
            return;
        }

        const studentDoc = querySnapshot.docs[0];
        const studentId = studentDoc.id;
      
        // الخطوة 3: التحقق من أن الطالب مُعيّن لهذا الاختبار
        const participantRef = doc(db, "exams", examIdFromUrl, "participants", studentId);
        const participantSnap = await getDoc(participantRef);

        if (!participantSnap.exists()) {
            errorMessage.textContent = 'أنت غير معين لهذا الاختبار. يرجى مراجعة المشرف.';
            return;
        }
        
        // --- الإصلاح المنطقي هنا ---
        // التحقق من حالة إكمال الاختبار
        const participantData = participantSnap.data();
        const examStatus = participantData.status;

        if (examStatus === 'finished' || examStatus === 'timed_out') {
            // إذا أكمل الطالب الاختبار، تحقق مما إذا كان المشرف يمنع رؤية النتائج
            if (examData.showResults === false) {
                 errorMessage.textContent = 'لقد أكملت هذا الاختبار بالفعل ولا يمكن إعادته.';
                 return; // هنا فقط نمنع الدخول
            }
            // إذا كان مسموحًا برؤية النتائج، اسمح له بالمرور إلى start.html
        }
          
        // الخطوة 4: كل شيء صحيح، سيتم توجيه الطالب إلى صفحة البدء
        sessionStorage.setItem('studentName', name);
        sessionStorage.setItem('studentId', studentId);
        sessionStorage.setItem('examId', examIdFromUrl);
        window.location.href = 'start.html';

    } catch (error) {
        console.error("Login Error:", error);
        errorMessage.textContent = 'حدث خطأ. حاول مرة أخرى.';
    }
});