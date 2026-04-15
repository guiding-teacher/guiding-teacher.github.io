import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, query, where, deleteField, orderBy, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM Element Variables ---
let examsTableBody, studentsTableGlobalBody, examLogTableBody, successLogTableBody, failureLogTableBody,
    addEditExamForm, addEditStudentFormGlobal, addEditQuestionForm,
    questionManagementSection, participantManagementSection, statisticsSection, settingsSection,
    selectedExamTitleSpan, currentEditingExamIdInput, questionFormTitle,
    questionIdInput, questionTextInput, questionPointsInput, questionIsMandatoryCheckbox,
    questionOptionsContainer, selectedExamTitleParticipantsSpan, currentManagingParticipantsExamIdInput,
    assignStudentSelect, assignStudentFeedback, participantsTableBody, selectedExamTitleStatsSpan,
    currentStatsExamIdInput, statsTotalParticipants, statsAvgPercentage, statsPassedCount,
    statsPassingCriteria, questionStatsTableBody, examIdInput, examTitleInput,
    examDurationInput, examFinishCodeInput, examPassingPercentageInput, examShowResultsCheckbox,
    examRandomizeQuestionsCheckbox, studentIdGlobalInput, studentNameGlobalInput, studentMotherNameGlobalInput,
    studentSequenceGlobalInput, studentCodeGlobalInput, studentFormTitleGlobal, studentFileInput,
    resultsDistributionChartCtx, questionsTableBody, adminNameDisplay,
    sidebarAdminName, sidebarAdminEmail, sidebarAdminPhone, sidebarAdminInstitution, sidebarAdminGovernorate,
    settingsAdminName, settingsAdminEmail, settingsAdminPhone,
    settingsAdminInstitution, settingsAdminGovernorate, settingsAdminDob, settingsAdminGender, settingsAdminCreated,
    editProfileBtn, editProfileForm, profileDisplay, adminNameInput, adminPhoneInput,
    adminInstitutionInput, adminGovernorateInput, adminDobInput, adminGenderInput, updateProfileBtn,
    currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordBtn, passwordChangeFeedback;

// --- Global App State ---
let questionOptionCount = 0;
let resultsChart = null;
let allExamsCache = {};
let allStudentsCache = [];
let currentAdminId = null;
let currentAdminData = null;
let activityTimer;

// =================================================================
// --- INITIALIZATION & AUTHENTICATION ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentAdminId = user.uid;
            document.body.style.display = 'block';
            try {
                await loadAdminData(user); // Load data first
                initializeDOMReferences();
                
                addEventListeners();
                updateAdminInfoDisplay(); // Then update UI
                setupActivityMonitoring();
                showMainContent('exams-section');
                loadExams();
                loadAllStudents();
                loadExamLog();
            } catch (error) {
                console.error("Error during app initialization:", error);
                alert("حدث خطأ حرج أثناء تهيئة التطبيق. قد تكون هناك مشكلة في الصلاحيات.");
                handleLogout(); // Log out if initialization fails
            }
        } else {
            window.location.replace('admin-login.html');
        }
    });
});

// [FIX] This function is now robust and handles the new user race condition.
  async function loadAdminData(user) {
    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminDoc = await getDoc(adminRef);
        
        if (adminDoc.exists()) {
            currentAdminData = adminDoc.data();
            console.log('تم تحميل بيانات المشرف:', currentAdminData);
            
            await updateDoc(adminRef, { 
                lastLogin: Timestamp.now(),
                lastLoginTime: new Date().toISOString()
            });
        } else {
            console.error("مستند المشرف غير موجود!:", user.uid);
            
            // محاولة إنشاء المستند تلقائياً
            const fallbackData = {
                name: user.email.split('@')[0] || 'مشرف',
                email: user.email,
                phone: 'لم يحدد',
                institution: 'لم يحدد',
                governorate: 'لم يحدد',
                dob: '',
                gender: 'male',
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now(),
                status: 'active'
            };
            
            try {
                await setDoc(adminRef, fallbackData);
                currentAdminData = fallbackData;
                console.log("تم إنشاء مستند المشرف تلقائياً");
            } catch (createError) {
                console.error("فشل في إنشاء مستند المشرف:", createError);
                throw new Error("لا يمكن الوصول إلى بيانات المشرف");
            }
        }
    } catch (error) {
        console.error("Error loading admin data:", error);
        throw error;
    }
}

function updateAdminInfoDisplay() {
    if (!currentAdminData) return;
    
    const adminName = currentAdminData.name || "مشرف";
    const adminEmail = currentAdminData.email || auth.currentUser?.email || "...";

    // Populate all sidebar and header elements
    if (adminNameDisplay) adminNameDisplay.textContent = adminName;
    if (sidebarAdminName) sidebarAdminName.textContent = adminName;
    if (sidebarAdminEmail) sidebarAdminEmail.textContent = adminEmail;
    if (sidebarAdminPhone) sidebarAdminPhone.textContent = currentAdminData.phone || "لم يحدد";
    if (sidebarAdminInstitution) sidebarAdminInstitution.textContent = currentAdminData.institution || "لم يحدد";
    if (sidebarAdminGovernorate) sidebarAdminGovernorate.textContent = currentAdminData.governorate || "لم يحدد";
    
    // تحديث بيانات صفحة الإعدادات (وضع العرض)
    if (settingsAdminName) settingsAdminName.textContent = adminName;
    if (settingsAdminEmail) settingsAdminEmail.textContent = adminEmail;
    if (settingsAdminPhone) settingsAdminPhone.textContent = currentAdminData.phone || "لم يحدد";
    if (settingsAdminInstitution) settingsAdminInstitution.textContent = currentAdminData.institution || "لم يحدد";
    if (settingsAdminGovernorate) settingsAdminGovernorate.textContent = currentAdminData.governorate || "لم يحدد";
    if (settingsAdminDob) settingsAdminDob.textContent = currentAdminData.dob || "لم يحدد";
    if (settingsAdminGender) {
        if (currentAdminData.gender === 'male') settingsAdminGender.textContent = 'ذكر';
        else if (currentAdminData.gender === 'female') settingsAdminGender.textContent = 'أنثى';
        else settingsAdminGender.textContent = 'لم يحدد';
    }
    if (settingsAdminCreated) {
        const createdDate = currentAdminData.createdAt?.toDate?.();
        settingsAdminCreated.textContent = createdDate ? createdDate.toLocaleDateString('ar-EG') : "غير معروف";
    }
}

function initializeDOMReferences() {
    // DOM references remain the same as previous version
    successLogTableBody = document.querySelector('#success-log-table tbody');
    failureLogTableBody = document.querySelector('#failure-log-table tbody');
    questionManagementSection = document.getElementById('question-management-section');
    participantManagementSection = document.getElementById('participant-management-section');
    statisticsSection = document.getElementById('statistics-section');
    settingsSection = document.getElementById('settings-section');
    examsTableBody = document.querySelector('#exams-table tbody');
    studentsTableGlobalBody = document.querySelector('#students-table-global tbody');
    examLogTableBody = document.querySelector('#exam-log-table tbody');
    questionsTableBody = document.querySelector('#questions-table tbody');
    participantsTableBody = document.querySelector('#participants-table tbody');
    questionStatsTableBody = document.querySelector('#question-stats-table tbody');
    addEditExamForm = document.getElementById('add-edit-exam-form');
    addEditStudentFormGlobal = document.getElementById('add-edit-student-form-global');
    addEditQuestionForm = document.getElementById('add-edit-question-form');
    examIdInput = document.getElementById('exam-id');
    examTitleInput = document.getElementById('exam-title');
    examDurationInput = document.getElementById('exam-duration');
    examFinishCodeInput = document.getElementById('exam-finish-code');
    examPassingPercentageInput = document.getElementById('exam-passing-percentage');
    examShowResultsCheckbox = document.getElementById('exam-show-results');
    examRandomizeQuestionsCheckbox = document.getElementById('exam-randomize-questions');
    studentIdGlobalInput = document.getElementById('student-id-global');
    studentNameGlobalInput = document.getElementById('student-name-global');
    studentMotherNameGlobalInput = document.getElementById('student-mother-name-global');
    studentSequenceGlobalInput = document.getElementById('student-sequence-global');
    studentCodeGlobalInput = document.getElementById('student-code-global');
    studentFormTitleGlobal = document.getElementById('student-form-title-global');
    studentFileInput = document.getElementById('student-file-input');
    selectedExamTitleSpan = document.getElementById('selected-exam-title');
    currentEditingExamIdInput = document.getElementById('current-editing-exam-id');
    questionFormTitle = document.getElementById('question-form-title');
    questionIdInput = document.getElementById('question-id');
    questionTextInput = document.getElementById('question-text-input');
    questionPointsInput = document.getElementById('question-points');
    questionIsMandatoryCheckbox = document.getElementById('question-is-mandatory');
    questionOptionsContainer = document.getElementById('question-options-container');
    selectedExamTitleParticipantsSpan = document.getElementById('selected-exam-title-participants');
    currentManagingParticipantsExamIdInput = document.getElementById('current-managing-participants-exam-id');
    assignStudentSelect = document.getElementById('assign-student-select');
    assignStudentFeedback = document.getElementById('assign-student-feedback');
    selectedExamTitleStatsSpan = document.getElementById('selected-exam-title-stats');
    currentStatsExamIdInput = document.getElementById('current-stats-exam-id');
    statsTotalParticipants = document.getElementById('stats-total-participants');
    statsAvgPercentage = document.getElementById('stats-avg-percentage');
    statsPassedCount = document.getElementById('stats-passed-count');
    statsPassingCriteria = document.getElementById('stats-passing-criteria');
    resultsDistributionChartCtx = document.getElementById('results-distribution-chart').getContext('2d');
    adminNameDisplay = document.getElementById('admin-name-display');

    // Add new sidebar elements
    sidebarAdminName = document.getElementById('sidebar-admin-name');
    sidebarAdminEmail = document.getElementById('sidebar-admin-email');
    sidebarAdminPhone = document.getElementById('sidebar-admin-phone');
    sidebarAdminInstitution = document.getElementById('sidebar-admin-institution');
    sidebarAdminGovernorate = document.getElementById('sidebar-admin-governorate');
    
    // Settings & Profile
    settingsAdminName = document.getElementById('settings-admin-name');
    settingsAdminEmail = document.getElementById('settings-admin-email');
    settingsAdminPhone = document.getElementById('settings-admin-phone');
    settingsAdminInstitution = document.getElementById('settings-admin-institution');
    settingsAdminGovernorate = document.getElementById('settings-admin-governorate');
    settingsAdminDob = document.getElementById('settings-admin-dob');
    settingsAdminGender = document.getElementById('settings-admin-gender');
    settingsAdminCreated = document.getElementById('settings-admin-created');
    editProfileBtn = document.getElementById('edit-profile-btn');
    editProfileForm = document.getElementById('edit-profile-form');
    profileDisplay = document.getElementById('profile-display');
    adminNameInput = document.getElementById('admin-name-input');
    adminPhoneInput = document.getElementById('admin-phone-input');
    adminInstitutionInput = document.getElementById('admin-institution-input');
    adminGovernorateInput = document.getElementById('admin-governorate-input');
    adminDobInput = document.getElementById('admin-dob-input');
    adminGenderInput = document.getElementById('admin-gender-input');
    updateProfileBtn = document.getElementById('update-profile-btn');

    // Password Change
    currentPasswordInput = document.getElementById('current-password-input');
    newPasswordInput = document.getElementById('new-password-input');
    confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
    changePasswordBtn = document.getElementById('change-password-btn');
    passwordChangeFeedback = document.getElementById('password-change-feedback');
    setupResultEventListeners();
}

function addEventListeners() {
    // Event listeners remain the same as previous version
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('sidebar-visible'));
    document.getElementById('export-log-btn').addEventListener('click', exportFullLogToExcel);
    document.getElementById('delete-log-btn').addEventListener('click', deleteAllLogs);
    document.getElementById('export-success-log-btn').addEventListener('click', exportSuccessLogToExcel);
    document.getElementById('export-failure-log-btn').addEventListener('click', exportFailureLogToExcel);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('onclick').match(/'([^']+)'/)[1];
            showMainContent(sectionId);
        });
    });
    document.getElementById('show-add-exam-form').addEventListener('click', showAddExamForm);
    document.getElementById('save-exam-btn').addEventListener('click', saveExam);
    document.getElementById('show-add-student-form-global').addEventListener('click', showAddStudentForm);
    document.getElementById('save-student-btn-global').addEventListener('click', saveStudentGlobal);
    if (studentFileInput) studentFileInput.addEventListener('change', handleStudentFileUpload);
    document.getElementById('show-add-question-form').addEventListener('click', showAddQuestionForm);
    document.getElementById('save-question-btn').addEventListener('click', saveQuestion);
    document.getElementById('add-option-btn').addEventListener('click', () => addOptionInput());
    document.getElementById('assign-student-btn').addEventListener('click', assignStudentToExam);
    document.getElementById('assign-all-students-btn').addEventListener('click', assignAllUnassignedStudents);

    // New/Modified listeners for settings page
    if (editProfileBtn) editProfileBtn.addEventListener('click', showEditProfileForm);
    if (updateProfileBtn) updateProfileBtn.addEventListener('click', updateAdminProfile);
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', handleChangePassword);
}

// ... (The rest of the file remains the same)

async function handleLogout() {
    try {
        await signOut(auth);
        localStorage.removeItem('lastActivity');
        if (activityTimer) clearTimeout(activityTimer);
        window.location.href = 'ejaz.html'; 
    } catch (error) {
        console.error('Logout Error', error);
        window.location.href = 'ejaz.html'; 
    }
}

function setupActivityMonitoring() {
    localStorage.setItem('lastActivity', Date.now().toString());
    const activityEvents = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => document.addEventListener(event, resetActivityTimer));
    resetActivityTimer();
}

function resetActivityTimer() {
    localStorage.setItem('lastActivity', Date.now().toString());
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = setTimeout(checkInactivity, 60 * 60 * 1000); // 60 minutes
}

function checkInactivity() {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return;
    const inactiveTime = Date.now() - parseInt(lastActivity);
    if (inactiveTime > 60 * 60 * 1000) {
        handleLogout();
    } else {
        resetActivityTimer();
    }
}


// =================================================================
// --- CRUD Operations (NO CHANGES NEEDED FOR exam, student, question)
// =================================================================

async function loadExams() {
    if (!currentAdminId) return;
    examsTableBody.innerHTML = '<tr><td colspan="7">جاري التحميل...</td></tr>';
    try {
        const q = query(collection(db, "exams"), where("adminId", "==", currentAdminId), orderBy("title"));
        const snapshot = await getDocs(q);

        examsTableBody.innerHTML = '';
        allExamsCache = {};
        if (snapshot.empty) {
            examsTableBody.innerHTML = '<tr><td colspan="7">لا توجد اختبارات. قم بإضافة اختبار جديد.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const exam = doc.data();
            const examId = doc.id;
            allExamsCache[examId] = exam;
            
            const examLink = generateExamLink(examId);
            
            const row = examsTableBody.insertRow();
            row.innerHTML = `<td>${exam.title || ''}</td><td><button class="btn-copy" onclick="copyToClipboard('${examLink}')">نسخ الرابط</button></td><td>${exam.duration ? exam.duration / 60 : 'N/A'} دقيقة</td><td><button class="btn-edit" onclick="showQuestionManagement('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الأسئلة</button></td><td><button class="btn-assign" onclick="showParticipantManagement('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الطلاب</button></td><td><button class="btn-view" onclick="showStatistics('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الإحصائيات</button></td><td><button class="btn-edit" onclick="editExam('${examId}')">تعديل</button><button class="btn-delete" onclick="deleteExam('${examId}')">حذف</button></td>`;
        });
    } catch (error) {
        console.error("Error loading exams: ", error);
        examsTableBody.innerHTML = '<tr><td colspan="7">خطأ في تحميل الاختبارات.</td></tr>';
    }
}

function showAddExamForm() {
    document.getElementById('exam-form-title').textContent = 'إضافة اختبار جديد';
    examIdInput.value = '';
    examTitleInput.value = '';
    examDurationInput.value = '60';
    examFinishCodeInput.value = '';
    examPassingPercentageInput.value = '50';
    examShowResultsCheckbox.checked = true;
    examRandomizeQuestionsCheckbox.checked = false;
    addEditExamForm.classList.remove('hidden');
}

async function saveExam() {
    if (!currentAdminId) {
        alert('لم يتم التعرف على هوية المشرف. يرجى تسجيل الدخول مرة أخرى.');
        return;
    }
    
    const title = examTitleInput.value.trim();
    const duration = parseInt(examDurationInput.value);
    const finishCode = examFinishCodeInput.value.trim();
    const passingPercentage = parseInt(examPassingPercentageInput.value);
    
    if (!title || !duration || !finishCode || isNaN(passingPercentage)) {
        alert("يرجى ملء جميع الحقول الأساسية بشكل صحيح.");
        return;
    }
    
    if (duration <= 0 || passingPercentage < 0 || passingPercentage > 100) {
        alert("الرجاء إدخال قيم صالحة للمدة ونسبة النجاح.");
        return;
    }
    
    const data = {
        title: title,
        duration: duration * 60,
        finishCode: finishCode,
        passingPercentage: passingPercentage,
        showResults: examShowResultsCheckbox.checked,
        randomizeQuestions: examRandomizeQuestionsCheckbox.checked,
        adminId: currentAdminId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    
    try {
        if (examIdInput.value) {
            await updateDoc(doc(db, "exams", examIdInput.value), data);
        } else {
            data.questions = {};
            await addDoc(collection(db, "exams"), data);
        }
        alert("تم حفظ الاختبار بنجاح.");
        addEditExamForm.classList.add('hidden');
        loadExams();
    } catch (e) {
        handleFirebaseError(e, 'saving exam');
    }
}

async function editExam(examId) {
    const exam = allExamsCache[examId];
    if (exam) {
        addEditExamForm.classList.remove('hidden');
        document.getElementById('exam-form-title').textContent = 'تعديل الاختبار';
        examIdInput.value = examId;
        examTitleInput.value = exam.title || '';
        examDurationInput.value = exam.duration ? exam.duration / 60 : '';
        examFinishCodeInput.value = exam.finishCode || '';
        examPassingPercentageInput.value = exam.passingPercentage || '50';
        examShowResultsCheckbox.checked = exam.showResults !== false;
        examRandomizeQuestionsCheckbox.checked = exam.randomizeQuestions === true;
        window.scrollTo(0, 0);
    }
}

async function deleteExam(examId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار وكل بياناته؟')) return;
    try {
        await deleteDoc(doc(db, "exams", examId));
        alert('تم حذف الاختبار.');
        loadExams();
    } catch (error) {
        console.error("Error deleting exam:", error);
        alert('حدث خطأ أثناء حذف الاختبار.');
    }
}

async function loadAllStudents() {
    if (!currentAdminId) return;
    studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>';
    try {
        const q = query(collection(db, "students"), where("adminId", "==", currentAdminId), orderBy("name"));
        const querySnapshot = await getDocs(q);

        allStudentsCache = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        studentsTableGlobalBody.innerHTML = '';
        if (querySnapshot.empty) {
            studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">لا يوجد طلاب في النظام.</td></tr>';
            return;
        }
        allStudentsCache.forEach(student => {
            const row = studentsTableGlobalBody.insertRow();
            row.innerHTML = `<td>${student.data.name}</td><td>${student.data.motherName || '---'}</td><td>${student.data.sequence || '---'}</td><td>${student.data.accessCode}</td><td><button class="btn-edit" onclick="editStudentGlobal('${student.id}')">تعديل</button><button class="btn-delete" onclick="deleteStudentGlobal('${student.id}')">حذف</button></td>`;
        });
    } catch (error) {
        console.error("Error loading all students:", error);
        studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الطلاب.</td></tr>';
    }
}

function showAddStudentForm() {
    studentFormTitleGlobal.textContent = 'إضافة طالب جديد';
    studentIdGlobalInput.value = '';
    studentNameGlobalInput.value = '';
    studentMotherNameGlobalInput.value = '';
    studentSequenceGlobalInput.value = '';
    studentCodeGlobalInput.value = '';
    addEditStudentFormGlobal.classList.remove('hidden');
}

async function saveStudentGlobal() {
    if (!currentAdminId) return;
    
    const studentId = studentIdGlobalInput.value;
    const studentName = studentNameGlobalInput.value.trim();
    const motherName = studentMotherNameGlobalInput.value.trim();
    const sequence = studentSequenceGlobalInput.value.trim();
    let studentCode = studentCodeGlobalInput.value.trim();

    if (!studentName) { 
        alert("الرجاء إدخال اسم الطالب."); 
        return; 
    }
    
    if (!studentCode) { 
        studentCode = `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 4)}`; 
    }

    const studentData = {
        name: studentName,
        motherName: motherName || '',
        sequence: sequence || '',
        accessCode: studentCode,
        adminId: currentAdminId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    try {
        if (studentId) {
            await updateDoc(doc(db, "students", studentId), studentData);
        } else {
            await addDoc(collection(db, "students"), studentData);
        }
        alert(`تم حفظ الطالب ${studentName} بنجاح.`);
        addEditStudentFormGlobal.classList.add('hidden');
        loadAllStudents();
    } catch (e) {
        handleFirebaseError(e, 'saving student');
    }
}

async function editStudentGlobal(studentId) {
    const student = allStudentsCache.find(s => s.id === studentId);
    if (student) {
        addEditStudentFormGlobal.classList.remove('hidden');
        studentFormTitleGlobal.textContent = 'تعديل بيانات الطالب';
        studentIdGlobalInput.value = studentId;
        studentNameGlobalInput.value = student.data.name || '';
        studentMotherNameGlobalInput.value = student.data.motherName || '';
        studentSequenceGlobalInput.value = student.data.sequence || '';
        studentCodeGlobalInput.value = student.data.accessCode || '';
    }
}

async function deleteStudentGlobal(studentId) {
    if (confirm("هل أنت متأكد من حذف هذا الطالب نهائياً من النظام؟ سيتم حذفه من كل الاختبارات المعين لها.")) {
        try {
            await deleteDoc(doc(db, "students", studentId));
            alert("تم حذف الطالب بنجاح.");
            loadAllStudents();
        } catch (e) {
            console.error(e);
            alert("خطأ في حذف الطالب.");
        }
    }
}

async function handleStudentFileUpload(event) {
    if (!currentAdminId) return;
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (json.length < 2) return alert("الملف فارغ أو لا يحتوي على بيانات.");

            const headers = json[0].map(h => h.toString().trim());
            const nameIndex = headers.indexOf('الاسم');
            const motherIndex = headers.indexOf('اسم الام');
            const seqIndex = headers.indexOf('التسلسل');

            if (nameIndex === -1) { return alert("لم يتم العثور على عمود 'الاسم' في ملف Excel. هذا العمود إجباري."); }

            const studentData = json.slice(1);
            const promises = studentData.map(row => {
                const name = row[nameIndex]?.toString().trim();
                if (!name) return null;
                const student = {
                    name: name,
                    motherName: motherIndex > -1 ? (row[motherIndex]?.toString().trim() || '') : '',
                    sequence: seqIndex > -1 ? (row[seqIndex]?.toString().trim() || '') : '',
                    accessCode: `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 4)}`,
                    adminId: currentAdminId,
                    createdAt: Timestamp.now()
                };
                return addDoc(collection(db, "students"), student);
            }).filter(p => p !== null);

            await Promise.all(promises);
            alert(`تم استيراد ${promises.length} طالب بنجاح!`);
            loadAllStudents();
        } catch (error) {
            console.error("Error processing Excel file:", error);
            alert("حدث خطأ أثناء قراءة الملف. تأكد من أن الأعمدة بالأسماء الصحيحة (الاسم, اسم الام, التسلسل).");
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

async function loadExamLog() {
    if (!currentAdminId) return;
    examLogTableBody.innerHTML = '<tr><td colspan="6">جاري تحميل السجل...</td></tr>';
    try {
        const q = query(collection(db, "exam_log"), where("adminId", "==", currentAdminId), orderBy("endTime", "desc"));
        const snapshot = await getDocs(q);

        examLogTableBody.innerHTML = '';
        if (snapshot.empty) {
            examLogTableBody.innerHTML = '<tr><td colspan="6">لا توجد سجلات بعد.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const log = doc.data();
            const endTime = log.endTime.toDate().toLocaleString('ar-EG');
            const row = examLogTableBody.insertRow();
            row.innerHTML = `<td>${endTime}</td><td>${log.studentName || ''}</td><td>${log.examTitle || ''}</td><td>${log.score} / ${log.totalPossiblePoints}</td><td>${log.percentage}%</td><td style="font-weight: bold; color: ${log.passed ? 'green' : 'red'};">${log.statusText}</td>`;
        });
    } catch (error) {
        console.error("Error loading exam log:", error);
        examLogTableBody.innerHTML = '<tr><td colspan="6">خطأ في تحميل السجل.</td></tr>';
    }
}

// ... (Question Management, Participant Management, Statistics & Reports, Export Functions are unchanged) ...
async function showQuestionManagement(examId, examTitle) { showMainContent('question-management-section'); selectedExamTitleSpan.textContent = examTitle; currentEditingExamIdInput.value = examId; addEditQuestionForm.classList.add('hidden'); await loadQuestions(examId); }
async function loadQuestions(examId) { questionsTableBody.innerHTML = '<tr><td colspan="5">جاري تحميل الأسئلة...</td></tr>'; try { const exam = allExamsCache[examId]; const questions = exam ? exam.questions : null; if (!questions || Object.keys(questions).length === 0) { questionsTableBody.innerHTML = '<tr><td colspan="5">لا توجد أسئلة لهذا الاختبار.</td></tr>'; return; } questionsTableBody.innerHTML = ''; const sortedQuestionIds = Object.keys(questions).sort(); for (const qId of sortedQuestionIds) { const question = questions[qId]; const correctOptionText = question.options[question.correctOptionIndex] || 'غير محدد'; const row = questionsTableBody.insertRow(); row.innerHTML = `<td>${question.text}</td><td>${question.points || 1}</td><td>${correctOptionText}</td><td>${question.isMandatory ? 'نعم' : 'لا'}</td><td><button class="btn-edit" onclick="editQuestion('${examId}', '${qId}')">تعديل</button><button class="btn-delete" onclick="deleteQuestion('${examId}', '${qId}')">حذف</button></td>`; } } catch (error) { console.error("Error loading questions:", error); questionsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الأسئلة.</td></tr>'; } }
function showAddQuestionForm() { questionFormTitle.textContent = 'إضافة سؤال جديد'; questionIdInput.value = ''; questionTextInput.value = ''; questionPointsInput.value = '1'; questionIsMandatoryCheckbox.checked = false; questionOptionsContainer.innerHTML = ''; questionOptionCount = 0; addOptionInput(); addOptionInput(); addEditQuestionForm.classList.remove('hidden'); }
async function saveQuestion() { const examId = currentEditingExamIdInput.value; const qId = questionIdInput.value; const questionText = questionTextInput.value.trim(); const points = parseInt(questionPointsInput.value); const isMandatory = questionIsMandatoryCheckbox.checked; const options = Array.from(questionOptionsContainer.querySelectorAll('.option-group input[type="text"]')).map(input => input.value.trim()); const correctOptionRadio = questionOptionsContainer.querySelector('input[name="correct_option"]:checked'); if (!examId || !questionText || options.length < 2 || options.some(opt => !opt) || !correctOptionRadio || isNaN(points) || points <= 0) { alert('يرجى إدخال نص السؤال، درجة صحيحة، خيارين على الأقل، وتحديد الإجابة الصحيحة.'); return; } const correctOptionIndex = parseInt(correctOptionRadio.value); const questionData = { text: questionText, points, options, correctOptionIndex, isMandatory }; try { const newQuestionId = qId || 'q' + Date.now(); await updateDoc(doc(db, "exams", examId), { [`questions.${newQuestionId}`]: questionData }); alert(`تم ${qId ? 'تحديث' : 'حفظ'} السؤال بنجاح!`); allExamsCache[examId].questions[newQuestionId] = questionData; addEditQuestionForm.classList.add('hidden'); loadQuestions(examId); } catch (error) { console.error("Error saving question: ", error); alert('حدث خطأ أثناء حفظ السؤال.'); } }
async function editQuestion(examId, qId) { const question = allExamsCache[examId]?.questions?.[qId]; if (question) { addEditQuestionForm.classList.remove('hidden'); questionFormTitle.textContent = 'تعديل السؤال'; questionIdInput.value = qId; questionTextInput.value = question.text; questionPointsInput.value = question.points || 1; questionIsMandatoryCheckbox.checked = question.isMandatory === true; questionOptionsContainer.innerHTML = ''; questionOptionCount = 0; question.options.forEach((opt, index) => addOptionInput(opt, index === question.correctOptionIndex)); } }
async function deleteQuestion(examId, qId) { if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) { try { await updateDoc(doc(db, "exams", examId), { [`questions.${qId}`]: deleteField() }); delete allExamsCache[examId].questions[qId]; alert('تم حذف السؤال بنجاح.'); loadQuestions(examId); } catch (error) { console.error("Error deleting question:", error); alert('حدث خطأ أثناء حذف السؤال.'); } } }
function addOptionInput(optionText = '', isCorrect = false) { const optionDiv = document.createElement('div'); optionDiv.classList.add('option-group'); optionDiv.style.display = 'flex'; optionDiv.style.alignItems = 'center'; optionDiv.style.marginBottom = '8px'; optionDiv.innerHTML = `<input type="radio" name="correct_option" value="${questionOptionCount}" ${isCorrect ? 'checked' : ''} required><input type="text" placeholder="نص الخيار ${questionOptionCount + 1}" value="${optionText}" required style="flex-grow:1; margin: 0 10px;"><button type="button" onclick="this.parentElement.remove()" style="background-color:#f44336; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer;">X</button>`; questionOptionsContainer.appendChild(optionDiv); questionOptionCount++; }
async function showParticipantManagement(examId, examTitle) { showMainContent('participant-management-section'); selectedExamTitleParticipantsSpan.textContent = examTitle; currentManagingParticipantsExamIdInput.value = examId; assignStudentFeedback.textContent = ''; assignStudentSelect.innerHTML = '<option value="">-- جاري التحميل --</option>'; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); const assignedStudentIds = new Set(participantsSnapshot.docs.map(doc => doc.id)); const availableStudents = allStudentsCache.filter(student => !assignedStudentIds.has(student.id)); assignStudentSelect.innerHTML = availableStudents.length === 0 ? '<option value="">-- كل الطلاب معينون لهذا الاختبار --</option>' : '<option value="">-- اختر طالباً --</option>' + availableStudents.map(student => `<option value="${student.id}">${student.data.name}</option>`).join(''); } catch (e) { console.error("Error populating dropdown:", e); assignStudentSelect.innerHTML = '<option value="">-- خطأ في تحميل الطلاب --</option>'; } await loadParticipants(examId); }
async function assignStudentToExam() { const studentId = assignStudentSelect.value; const examId = currentManagingParticipantsExamIdInput.value; const selectedStudent = allStudentsCache.find(s => s.id === studentId); if (!studentId || !examId || !selectedStudent) { assignStudentFeedback.textContent = 'الرجاء اختيار طالب صالح.'; return; } try { const participantRef = doc(db, "exams", examId, "participants", studentId); await setDoc(participantRef, { name: selectedStudent.data.name, status: 'not_started' }); assignStudentFeedback.textContent = `تم تعيين الطالب بنجاح!`; setTimeout(() => assignStudentFeedback.textContent = '', 3000); showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch (error) { console.error("Error assigning student:", error); assignStudentFeedback.textContent = 'حدث خطأ أثناء تعيين الطالب.'; } }
async function assignAllUnassignedStudents() { const examId = currentManagingParticipantsExamIdInput.value; if (!examId) return; if (!confirm("هل أنت متأكد من تعيين كل الطلاب غير المعينين حاليًا لهذا الاختبار؟")) return; assignStudentFeedback.textContent = "جاري تعيين كل الطلاب..."; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); const assignedStudentIds = new Set(participantsSnapshot.docs.map(doc => doc.id)); const availableStudents = allStudentsCache.filter(student => !assignedStudentIds.has(student.id)); if (availableStudents.length === 0) { assignStudentFeedback.textContent = "لا يوجد طلاب غير معينين لتعيينهم."; return; } const promises = availableStudents.map(student => { const participantRef = doc(db, "exams", examId, "participants", student.id); return setDoc(participantRef, { name: student.data.name, status: 'not_started' }); }); await Promise.all(promises); assignStudentFeedback.textContent = `تم تعيين ${availableStudents.length} طالب بنجاح!`; showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch (error) { console.error("Error assigning all students:", error); assignStudentFeedback.textContent = "حدث خطأ أثناء التعيين الجماعي."; } }
async function loadParticipants(examId) { participantsTableBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>'; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); if (participantsSnapshot.empty) { participantsTableBody.innerHTML = '<tr><td colspan="5">لم يتم تعيين أي طلاب لهذا الاختبار بعد.</td></tr>'; return; } participantsTableBody.innerHTML = ''; participantsSnapshot.forEach(pDoc => { const studentId = pDoc.id; const studentData = allStudentsCache.find(s => s.id === studentId)?.data; if (!studentData) return; const participantData = pDoc.data(); const scoreText = (participantData.score !== undefined) ? `${participantData.score} / ${participantData.totalPossiblePoints}` : '---'; const row = participantsTableBody.insertRow(); row.innerHTML = `<td>${studentData.name}</td><td>${studentData.accessCode}</td><td>${translateStatus(participantData.status)}</td><td>${scoreText}</td><td><button class="btn-delete" onclick="unassignStudent('${studentId}', '${examId}')">إلغاء التعيين</button></td>`; }); } catch (error) { console.error("Error loading participants: ", error); participantsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل المشاركين.</td></tr>'; } }
async function unassignStudent(studentId, examId) { if (confirm('هل أنت متأكد من إلغاء تعيين هذا الطالب من الاختبار؟ سيتم حذف بيانات تقدمه في الاختبار أيضاً.')) { try { const participantRef = doc(db, "exams", examId, "participants", studentId); await deleteDoc(participantRef); alert('تم إلغاء تعيين الطالب بنجاح.'); showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch (error) { console.error("Error un-assigning student:", error); alert('حدث خطأ أثناء إلغاء التعيين.'); } } }
async function showStatistics(examId, examTitle) { showMainContent('statistics-section'); selectedExamTitleStatsSpan.textContent = examTitle; currentStatsExamIdInput.value = examId; if (resultsChart) resultsChart.destroy(); successLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>'; failureLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>'; questionStatsTableBody.innerHTML = '<tr><td colspan="2">جاري التحميل...</td></tr>'; await calculateAndDisplayStats(examId); }
async function calculateAndDisplayStats(examId) { try { const examData = allExamsCache[examId]; if (!examData) { alert('الاختبار غير موجود.'); return; } const examQuestions = examData.questions || {}; const passingPercentage = examData.passingPercentage || 50; statsPassingCriteria.textContent = `>= ${passingPercentage}%`; const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); if (participantsSnapshot.empty) { statsTotalParticipants.textContent = '0'; statsAvgPercentage.textContent = '0%'; statsPassedCount.textContent = '0'; questionStatsTableBody.innerHTML = '<tr><td colspan="2">لا توجد بيانات لعرضها.</td></tr>'; successLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد ناجحون بعد.</td></tr>'; failureLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد راسبون بعد.</td></tr>'; return; } let totalParticipants = 0, totalPercentageSum = 0; const chartData = []; const questionStats = {}; const successfulParticipants = []; const failedParticipants = []; participantsSnapshot.forEach(doc => { const data = doc.data(); if (data.status === 'finished' || data.status === 'timed_out') { totalParticipants++; chartData.push(data); if (typeof data.percentage === 'number') { totalPercentageSum += data.percentage; if (data.passed) { successfulParticipants.push(data); } else { failedParticipants.push(data); } } if (data.answers) { Object.keys(data.answers).forEach(qId => { if (!questionStats[qId]) { questionStats[qId] = { attempts: 0, corrects: 0 }; } questionStats[qId].attempts++; const question = examQuestions[qId]; if (question && data.answers[qId] === question.correctOptionIndex) { questionStats[qId].corrects++; } }); } } }); statsTotalParticipants.textContent = totalParticipants; statsAvgPercentage.textContent = (totalParticipants > 0 ? (totalPercentageSum / totalParticipants).toFixed(2) : '0') + '%'; statsPassedCount.textContent = successfulParticipants.length; displayResultsChart(chartData, passingPercentage); displayQuestionDifficulty(questionStats, examQuestions); displaySuccessLog(successfulParticipants); displayFailureLog(failedParticipants); } catch (error) { console.error("Error calculating statistics:", error); alert('حدث خطأ أثناء حساب الإحصائيات.'); } }
function displaySuccessLog(successfulParticipants) { successLogTableBody.innerHTML = ''; if (successfulParticipants.length === 0) { successLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد ناجحون بعد.</td></tr>'; return; } successfulParticipants.sort((a, b) => b.percentage - a.percentage); successfulParticipants.forEach(data => { const row = successLogTableBody.insertRow(); populateParticipantRow(row, data); }); }
function displayFailureLog(failedParticipants) { failureLogTableBody.innerHTML = ''; if (failedParticipants.length === 0) { failureLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد راسبون.</td></tr>'; return; } failedParticipants.sort((a, b) => b.percentage - a.percentage); failedParticipants.forEach(data => { const row = failureLogTableBody.insertRow(); populateParticipantRow(row, data); }); }
function populateParticipantRow(row, data) { const startTime = data.startTime?.toDate().toLocaleString('ar-EG') || '---'; const endTime = data.endTime?.toDate().toLocaleString('ar-EG') || '---'; let duration = '---'; if (data.startTime && data.endTime) { const diffMs = data.endTime.toMillis() - data.startTime.toMillis(); const diffMins = Math.round(diffMs / 60000); duration = `${diffMins} دقيقة`; } row.innerHTML = `<td>${data.name || '---'}</td><td>${data.score} / ${data.totalPossiblePoints}</td><td>${data.percentage}%</td><td>${startTime}</td><td>${endTime}</td><td>${duration}</td>`; }
function displayResultsChart(participantsData, passingPercentage) { const passed = participantsData.filter(p => p.percentage >= passingPercentage).length; const failed = participantsData.length - passed; if (resultsChart) resultsChart.destroy(); resultsChart = new Chart(resultsDistributionChartCtx, { type: 'pie', data: { labels: [`ناجح (>= ${passingPercentage}%)`, `راسب (< ${passingPercentage}%)`], datasets: [{ data: [passed, failed], backgroundColor: ['#4CAF50', '#F44336'] }] }, options: { responsive: true, plugins: { title: { display: true, text: 'توزيع نتائج الممتحنين' } } } }); }
function displayQuestionDifficulty(questionStats, examQuestions) { questionStatsTableBody.innerHTML = ''; if (Object.keys(examQuestions).length === 0) { questionStatsTableBody.innerHTML = '<tr><td colspan="2">لا توجد أسئلة لتحليلها.</td></tr>'; return; } const sortedQuestionIds = Object.keys(examQuestions).sort(); for (const qId of sortedQuestionIds) { const stats = questionStats[qId] || { attempts: 0, corrects: 0 }; const correctPercentage = stats.attempts > 0 ? ((stats.corrects / stats.attempts) * 100).toFixed(1) : '0.0'; const row = questionStatsTableBody.insertRow(); row.innerHTML = `<td>${examQuestions[qId].text}</td><td style="background-color: ${correctPercentage > 70 ? '#d4edda' : (correctPercentage < 40 ? '#f8d7da' : '#fff3cd')}">${correctPercentage}% (${stats.corrects}/${stats.attempts} مجيبين)</td>`; } }
async function exportFullLogToExcel() { if (!currentAdminId) return; const q = query(collection(db, "exam_log"), where("adminId", "==", currentAdminId), orderBy("endTime", "desc")); const snapshot = await getDocs(q); if (snapshot.empty) return alert('لا توجد سجلات لتصديرها.'); const excelData = snapshot.docs.map(doc => { const log = doc.data(); return { "تاريخ الإنهاء": log.endTime.toDate().toLocaleString('ar-EG'), "اسم الطالب": log.studentName, "عنوان الاختبار": log.examTitle, "الدرجة": log.score, "الدرجة الكلية": log.totalPossiblePoints, "النسبة": log.percentage, "الحالة": log.statusText, }; }); const worksheet = XLSX.utils.json_to_sheet(excelData); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "السجل الكامل"); XLSX.writeFile(workbook, "FullExamLog.xlsx"); }
async function exportSuccessLogToExcel() { await exportParticipantLogToExcel(true); }
async function exportFailureLogToExcel() { await exportParticipantLogToExcel(false); }
async function exportParticipantLogToExcel(isSuccess) { const examId = currentStatsExamIdInput.value; const examData = allExamsCache[examId]; if (!examId || !examData) return alert('لا يوجد اختبار محدد.'); const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); const excelData = []; participantsSnapshot.forEach(doc => { const data = doc.data(); if (data.passed === isSuccess) { const studentAnswers = data.answers || {}; const questions = examData.questions || {}; for (const qId in questions) { const question = questions[qId]; const studentAnswerIndex = studentAnswers[qId]; const studentAnswerText = studentAnswerIndex !== undefined ? question.options[studentAnswerIndex] : "لم يجب"; const correctAnswerText = question.options[question.correctOptionIndex]; excelData.push({ "اسم الطالب": data.name, "الدرجة": `${data.score} / ${data.totalPossiblePoints}`, "النسبة": data.percentage, "نص السؤال": question.text, "إجابة الطالب": studentAnswerText, "الإجابة الصحيحة": correctAnswerText, }); } } }); const logType = isSuccess ? "الناجحين" : "الراسبين"; if (excelData.length === 0) return alert(`لا يوجد بيانات ${logType} لتصديرها.`); const worksheet = XLSX.utils.json_to_sheet(excelData); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, `سجل ${logType}`); XLSX.writeFile(workbook, `${logType}_${examData.title}.xlsx`); }
async function deleteAllLogs() { if (!currentAdminId) return; const confirmation = prompt("للتأكيد، اكتب 'حذف' في المربع أدناه. هذه العملية لا يمكن التراجع عنها."); if (confirmation !== 'حذف') { alert("لم يتم الحذف. الكتابة غير مطابقة."); return; } if (!confirm("تأكيد نهائي: هل أنت متأكد من حذف جميع سجلات الاختبارات بشكل دائم؟")) return; try { const q = query(collection(db, "exam_log"), where("adminId", "==", currentAdminId)); const logSnapshot = await getDocs(q); if (logSnapshot.empty) { alert("لا توجد سجلات لحذفها."); return; } const batch = writeBatch(db); logSnapshot.docs.forEach(doc => { batch.delete(doc.ref); }); await batch.commit(); alert(`تم حذف ${logSnapshot.size} سجل بنجاح.`); loadExamLog(); } catch (error) { console.error("Error deleting logs:", error); alert("حدث خطأ أثناء حذف السجلات."); } }

// =================================================================
// --- Profile Management (MODIFIED & IMPROVED) ---
// =================================================================

function showEditProfileForm() {
    if (!currentAdminData) return;
    profileDisplay.classList.add('hidden');
    editProfileForm.classList.remove('hidden');
    
    // ملء حقول الإدخال بالبيانات الحالية
    adminNameInput.value = currentAdminData.name || '';
    adminPhoneInput.value = currentAdminData.phone || '';
    adminInstitutionInput.value = currentAdminData.institution || '';
    adminGovernorateInput.value = currentAdminData.governorate || '';
    adminDobInput.value = currentAdminData.dob || '';
    adminGenderInput.value = currentAdminData.gender || 'male';
}

function cancelEditProfile() {
    editProfileForm.classList.add('hidden');
    profileDisplay.classList.remove('hidden');
}

async function updateAdminProfile() {
    if (!currentAdminId) return;
    
    const name = adminNameInput.value.trim();
    const phone = adminPhoneInput.value.trim();
    const institution = adminInstitutionInput.value.trim();
    const governorate = adminGovernorateInput.value.trim();
    const dob = adminDobInput.value.trim();
    const gender = adminGenderInput.value;
    
    if (!name || !phone || !institution || !governorate || !dob || !gender) {
        alert('جميع الحقول إجبارية');
        return;
    }
    
    const dataToUpdate = {
        name, phone, institution, governorate, dob, gender,
        updatedAt: Timestamp.now()
    };
    
    try {
        await updateDoc(doc(db, "admins", currentAdminId), dataToUpdate);
        
        // تحديث البيانات المحلية فورًا
        currentAdminData = { ...currentAdminData, ...dataToUpdate };
        
        updateAdminInfoDisplay(); // إعادة عرض البيانات المحدثة
        cancelEditProfile(); // العودة لوضع العرض
        alert('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
        console.error("Error updating profile:", error);
        alert('حدث خطأ أثناء تحديث الملف الشخصي');
    }
}

async function handleChangePassword() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;
    const user = auth.currentUser;

    passwordChangeFeedback.textContent = '';
    passwordChangeFeedback.style.color = 'red';

    if (!user) {
        passwordChangeFeedback.textContent = 'المستخدم غير مسجل الدخول.';
        return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
        passwordChangeFeedback.textContent = 'يرجى ملء جميع حقول كلمة المرور.';
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordChangeFeedback.textContent = 'كلمات المرور الجديدة غير متطابقة.';
        return;
    }
    if (newPassword.length < 6) {
        passwordChangeFeedback.textContent = 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.';
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        await updatePassword(user, newPassword);
        
        passwordChangeFeedback.textContent = 'تم تغيير كلمة المرور بنجاح!';
        passwordChangeFeedback.style.color = 'green';
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        
    } catch (error) {
        console.error('Password Change Error:', error);
        if (error.code === 'auth/wrong-password') {
            passwordChangeFeedback.textContent = 'كلمة المرور الحالية غير صحيحة.';
        } else if (error.code === 'auth/weak-password') {
            passwordChangeFeedback.textContent = 'كلمة المرور الجديدة ضعيفة جداً.';
        } else {
            passwordChangeFeedback.textContent = 'حدث خطأ غير متوقع.';
        }
    }
}


// =================================================================
// --- Utility Functions ---
// =================================================================

// =================================================================
// --- Utility Functions ---
// =================================================================

function generateExamLink(examId) {
    // حل متطور يناسب جميع أنواع الاستضافات
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    
    // إذا كنا في admin.html، نزيلها من المسار
    if (currentPath.endsWith('admin.html')) {
        const baseUrl = currentUrl.replace('/admin.html', '');
        return `${baseUrl}/index.html?exam=${examId}`;
    }
    
    // إذا لم نكن في admin.html، نستخدم المسار الحالي
    const baseUrl = currentUrl.split('/').slice(0, -1).join('/');
    return `${baseUrl}/index.html?exam=${examId}`;
}

function showMainContent(sectionIdToShow) {
    document.querySelectorAll('.page-content-wrapper > .main-content > .admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    const targetSection = document.getElementById(sectionIdToShow);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // إضافة results-admin-section للقائمة لضمان تفعيل الرابط في القائمة الجانبية
    const isMainSection = ['exams-section', 'students-section', 'log-section', 'settings-section', 'results-admin-section'].includes(sectionIdToShow);
    
    if (isMainSection) {
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        // البحث عن الرابط الذي يحتوي على المعرف الصحيح وتنشيطه
        const activeLink = document.querySelector(`.sidebar .nav-link[onclick*="'${sectionIdToShow}'"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    document.querySelector('.sidebar').classList.remove('sidebar-visible');

    // تشغيل دالة تحميل الكشوفات فور فتح القسم
    if(sectionIdToShow === 'results-admin-section') {
        if (typeof loadResultsSheets === 'function') loadResultsSheets();
    }
}

function translateStatus(status) {
    const statuses = { 'started': 'بدأ الاختبار', 'finished': 'أنهى الاختبار', 'timed_out': 'انتهى الوقت', 'not_started': 'لم يبدأ' };
    return statuses[status] || 'غير معروف';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert("تم نسخ الرابط!")).catch(() => alert("فشل النسخ."));
}

function handleFirebaseError(error, context) {
    console.error(`Error in ${context}:`, error);
    let userMessage = 'حدث خطأ غير متوقع';
    if (error.code === 'permission-denied') userMessage = 'ليس لديك صلاحية للقيام بهذا الإجراء';
    else if (error.code === 'not-found') userMessage = 'العنصر المطلوب غير موجود';
    else if (error.code === 'unavailable') userMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت';
    alert(userMessage);
    return userMessage;
}

// =================================================================
// --- Results Announcement Logic (INTEGRATED) - FIXED ---
// =================================================================

let parsedStudents = [];
let gradeColumns = [];
let allSheetsCache = {};

// دالة مساعدة لتشفير HTML
 function escHtmlRes(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ✅ FIX 1: الدالة الآن تستبدل محتوى الحاوية دائماً - لا تترك الـ spinner الثابت
async function loadResultsSheets() {
    const container = document.getElementById('sheets-list-container-integrated');
    const wizardSection = document.getElementById('create-wizard-integrated');
    if (!container) return;

    // إخفاء المعالج وعرض القائمة
    container.style.display = 'block';
    if (wizardSection) wizardSection.style.display = 'none';

    // ✅ استبدال الـ spinner الثابت فوراً بمؤشر تحميل ديناميكي
    container.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:#64748b;">
            <div style="font-size:2.5em;margin-bottom:14px;animation:spin 1s linear infinite;display:inline-block;">⏳</div>
            <p style="font-size:1.05em;">جاري تحميل الكشوفات...</p>
        </div>`;

    // ✅ التحقق من هوية المشرف بعد إعادة رسم الحاوية
    if (!currentAdminId) {
        container.innerHTML = `
            <div style="text-align:center;padding:50px 20px;color:#ef4444;">
                <p style="font-size:1.1em;">❌ خطأ: لم يتم التعرف على هوية المشرف</p>
                <p style="font-size:0.85em;color:#94a3b8;margin-top:8px;">حاول تسجيل الخروج وإعادة الدخول</p>
            </div>`;
        return;
    }

    try {
        const q = query(collection(db, "result_sheets"), where("adminId", "==", currentAdminId));
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#64748b;">
                    <div style="font-size:3.5em;margin-bottom:14px;">📋</div>
                    <h4 style="margin-bottom:10px;font-size:1.2em;color:#475569;">لا توجد كشوفات بعد</h4>
                    <p>انقر على "+ إنشاء كشف جديد" للبدء في رفع نتائج طلابك</p>
                </div>`;
            return;
        }

        allSheetsCache = {};
        const sheets = [];
        snap.forEach(d => {
            const s = { id: d.id, ...d.data() };
            allSheetsCache[d.id] = s;
            sheets.push(s);
        });
        // ترتيب من الأحدث للأقدم
        sheets.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let html = '<div class="sheets-list">';
        sheets.forEach(s => {
            html += `
                <div class="sheet-item">
                    <div class="sheet-item-info">
                        <h4>${escHtmlRes(s.title || '')}</h4>
                        <p>👨‍🏫 ${escHtmlRes(s.teacher || '')} &nbsp;|&nbsp; 👥 ${s.studentCount || 0} طالب${s.date ? ` &nbsp;|&nbsp; 📅 ${escHtmlRes(s.date)}` : ''}</p>
                    </div>
                    <div class="sheet-item-actions">
                        <button class="res-btn res-btn-primary" onclick="copyResultLink('${s.id}')">🔗 رابط</button>
                        <button class="res-btn res-btn-success" style="font-size:0.83em;" onclick="downloadResultExcel('${s.id}')">📊 إكسل</button>
                        <button class="res-btn res-btn-warning" style="font-size:0.83em;" onclick="printResultBarcodes('${s.id}')">🖨️ الرموز</button>
                        <button class="res-btn res-btn-danger" onclick="deleteResultSheet('${s.id}')">🗑️</button>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error('Error loading result sheets:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:50px 20px;color:#ef4444;">
                <p style="font-size:1.1em;">❌ خطأ في تحميل الكشوفات</p>
                <p style="font-size:0.85em;color:#94a3b8;margin-top:8px;">${err.message || 'تحقق من صلاحيات قاعدة البيانات'}</p>
            </div>`;
    }
}

// دالة البدء في إنشاء كشف جديد
 // استبدال دالة showResultWizard لإنشاء الحقول المفقودة ديناميكياً
window.showResultWizard = async function() {
    // التحقق من الحد الأقصى للكشوفات (5)
    if (!currentAdminId) {
        alert("لم يتم التعرف على المشرف.");
        return;
    }
    const q = query(collection(db, "result_sheets"), where("adminId", "==", currentAdminId));
    const snap = await getDocs(q);
    if (snap.size >= 5) {
        alert(`⚠️ لقد وصلت إلى الحد الأقصى (5 كشوفات). لا يمكنك إنشاء كشف جديد احذف اولاً.`);
        return;
    }

    parsedStudents = [];
    gradeColumns = [];

    // التأكد من وجود جميع الحقول في الخطوة 1
    const step1 = document.getElementById('step-1-res');
    if (step1) {
        if (!document.getElementById('sheet-description-res')) {
            const descGroup = document.createElement('div');
            descGroup.className = 'res-form-group';
            descGroup.innerHTML = `<label>وصف الكشف (يظهر للطالب أسفل العنوان)</label><textarea id="sheet-description-res" class="res-input" rows="2" placeholder="اكتب وصفاً مختصراً للكشف..."></textarea>`;
            const yearGroup = document.getElementById('sheet-year-res')?.closest('.res-form-group');
            if (yearGroup && yearGroup.parentNode) yearGroup.parentNode.insertBefore(descGroup, yearGroup.nextSibling);
            else step1.appendChild(descGroup);
        }
        if (!document.getElementById('sheet-date-res')) {
            const dateTimeGroup = document.createElement('div');
            dateTimeGroup.className = 'res-form-grid';
            dateTimeGroup.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;';
            dateTimeGroup.innerHTML = `<div class="res-form-group"><label>تاريخ إعلان النتيجة</label><input type="date" id="sheet-date-res" class="res-input"></div><div class="res-form-group"><label>وقت الإعلان</label><input type="time" id="sheet-time-res" class="res-input"></div>`;
            step1.appendChild(dateTimeGroup);
        }
        if (!document.getElementById('sheet-notes-res')) {
            const notesGroup = document.createElement('div');
            notesGroup.className = 'res-form-group';
            notesGroup.style.marginTop = '15px';
            notesGroup.innerHTML = `<label>ملاحظات إضافية للطلاب</label><textarea id="sheet-notes-res" class="res-input" rows="2" placeholder="أي تنبيهات أخرى تظهر عند الاستعلام..."></textarea>`;
            step1.appendChild(notesGroup);
        }
    }

    // إعادة تعيين القيم
    const titleEl = document.getElementById('sheet-title-res');
    const teacherEl = document.getElementById('sheet-teacher-res');
    const yearEl = document.getElementById('sheet-year-res');
    const descEl = document.getElementById('sheet-description-res');
    const dateEl = document.getElementById('sheet-date-res');
    const timeEl = document.getElementById('sheet-time-res');
    const notesEl = document.getElementById('sheet-notes-res');
    if (titleEl) titleEl.value = '';
    if (teacherEl) teacherEl.value = '';
    if (yearEl) yearEl.value = '';
    if (descEl) descEl.value = '';
    if (notesEl) notesEl.value = '';
    const now = new Date();
    if (dateEl) dateEl.value = now.toISOString().split('T')[0];
    if (timeEl) timeEl.value = now.toTimeString().slice(0,5);

    const infoBox = document.getElementById('file-info-box-res');
    if (infoBox) infoBox.style.display = 'none';
    const next2 = document.getElementById('next-2-res');
    if (next2) next2.disabled = true;

    const sheetsContainer = document.getElementById('sheets-list-container-integrated');
    const wizardContainer = document.getElementById('create-wizard-integrated');
    if (sheetsContainer) sheetsContainer.style.display = 'none';
    if (wizardContainer) wizardContainer.style.display = 'block';
    goToResultStep(1);
};


function goToResultStep(n) {
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step-${i}-res`);
        if (step) step.style.display = (i === n) ? 'block' : 'none';
        const item = document.getElementById(`si-${i}`);
        if (item) {
            item.className = 'step-item' + (i < n ? ' done' : i === n ? ' active' : '');
            const circle = item.querySelector('.step-circle');
            if (circle) circle.textContent = i < n ? '✓' : String(i);
        }
    }
    // إضافة النموذج التعليمي عند الوصول للخطوة 2
    if (n === 2) {
        ensureEducationalModelInStep2();
    }
}

function ensureEducationalModelInStep2() {
    const step2 = document.getElementById('step-2-res');
    if (!step2) return;
    // تجنب الإضافة المكررة
    if (document.getElementById('educational-model-res')) return;
    
    const modelDiv = document.createElement('div');
    modelDiv.id = 'educational-model-res';
    modelDiv.style.cssText = 'background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 20px;';
    modelDiv.innerHTML = `
        <h4 style="color: #1e40af; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            💡 نموذج ترتيب ملف الإكسل المطلوب:
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85em; text-align: center; background: white;">
            <tr style="background: #fee2e2;">
            <th style="background: #ef4444; color: white; border: 1px solid #ddd; padding: 5px;">الاسم</th>
                <th style="border: 1px solid #ddd; padding: 5px;">الأحياء</th>
                <th style="border: 1px solid #ddd; padding: 5px;">العلوم</th>
                <th style="border: 1px solid #ddd; padding: 5px;">الانكليزي</th>
                <th style="border: 1px solid #ddd; padding: 5px;">الرياضيات</th>
                
            </tr>
            <tr>
            <td style="border: 1px solid #ddd; padding: 5px; font-weight: bold;">علي</td>
                <td style="border: 1px solid #ddd; padding: 5px;">33</td>
                <td style="border: 1px solid #ddd; padding: 5px;">77</td>
                <td style="border: 1px solid #ddd; padding: 5px;">66</td>
                <td style="border: 1px solid #ddd; padding: 5px;">44</td>
                
            </tr>
            <tr>
            <td style="border: 1px solid #ddd; padding: 5px; font-weight: bold;">احمد</td>
                <td style="border: 1px solid #ddd; padding: 5px;">32</td>
                <td style="border: 1px solid #ddd; padding: 5px;">89</td>
                <td style="border: 1px solid #ddd; padding: 5px;">77</td>
                <td style="border: 1px solid #ddd; padding: 5px;">55</td>
                
            </tr>
        </table>
        <p style="font-size: 0.8em; color: #64748b; margin-top: 8px;">* ملاحظة: يجب أن يكون اسم الطالب في أول عمود من جهة اليمين.</p>
    `;
    // إدراج النموذج قبل محتوى رفع الملف
    const uploadZone = document.getElementById('upload-zone-res');
    if (uploadZone) {
        step2.insertBefore(modelDiv, uploadZone);
    } else {
        step2.prepend(modelDiv);
    }
}


// استبدل دالة handleResultFileUpload بالكود التالي
 function handleResultFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows || rows.length < 2) { alert("الملف فارغ أو يحتوي على صف عناوين فقط."); return; }
            const headers = rows[0].map(h => String(h).trim()).filter(h => h);
            if (headers.length < 2) { alert("يجب أن يحتوي الملف على عمودين على الأقل."); return; }
            gradeColumns = headers.slice(1);
            parsedStudents = [];
            const usedCodes = new Set();

            // ✅ توليد رمز بطول 9: 6 حروف (كبيرة) + 3 أرقام
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const numbers = '0123456789';
            const genCode = () => {
                let code;
                do {
                    let part1 = '';
                    for (let i = 0; i < 6; i++) {
                        part1 += letters.charAt(Math.floor(Math.random() * letters.length));
                    }
                    let part2 = '';
                    for (let i = 0; i < 3; i++) {
                        part2 += numbers.charAt(Math.floor(Math.random() * numbers.length));
                    }
                    code = part1 + part2;  // 6 حروف + 3 أرقام = 9 خانات
                } while (usedCodes.has(code));
                usedCodes.add(code);
                return code;
            };

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const name = String(row[0] ?? '').trim();
                if (!name) continue;
                const grades = {};
                gradeColumns.forEach((col, idx) => { const val = row[idx+1]; grades[col] = (val !== '' && val !== undefined && val !== null) ? val : '---'; });
                parsedStudents.push({ name, code: genCode(), grades });
            }
            if (parsedStudents.length === 0) { alert("لم يتم العثور على أي اسم طالب."); return; }
            const infoBox = document.getElementById('file-info-box-res');
            if (infoBox) { infoBox.style.display = 'block'; infoBox.innerHTML = `✅ تم تحميل <strong>${parsedStudents.length}</strong> طالب | <strong>${gradeColumns.length}</strong> عمود | رمز: 6 حروف + 3 أرقام (9 خانات)`; }
            const next2 = document.getElementById('next-2-res');
            if (next2) next2.disabled = false;
        } catch (err) { alert(`خطأ في قراءة الملف: ${err.message}`); }
    };
    reader.readAsArrayBuffer(file);
}

// ✅ FIX 3: حفظ شامل مع التحقق والتعامل مع الأخطاء
 // استبدال دالة saveResultSheet لاستخدام الحقول الجديدة
 window.saveResultSheet = async function() {
    const title = document.getElementById('sheet-title-res')?.value.trim() || '';
    const teacher = document.getElementById('sheet-teacher-res')?.value.trim() || '';
    const year = document.getElementById('sheet-year-res')?.value.trim() || '';
    const description = document.getElementById('sheet-description-res')?.value.trim() || '';
    const date = document.getElementById('sheet-date-res')?.value || '';
    const time = document.getElementById('sheet-time-res')?.value || '';
    const notes = document.getElementById('sheet-notes-res')?.value.trim() || '';

    if (!title || !teacher) { alert("يرجى إدخال عنوان الكشف واسم المدرس."); return; }
    if (parsedStudents.length === 0) { alert("لم يتم رفع أي بيانات طلاب."); return; }

    const saveBtn = document.getElementById('save-btn-res');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ جاري الحفظ...'; }
    const studentsByCode = {};
    parsedStudents.forEach(s => { studentsByCode[s.code] = { name: s.name, grades: s.grades }; });
    try {
        const sheetRef = doc(collection(db, "result_sheets"));
        await setDoc(sheetRef, { title, teacher, year, description, date, time, notes, adminId: currentAdminId, studentCount: parsedStudents.length, gradeColumns, studentsByCode, createdAt: Timestamp.now() });
        const baseUrl = window.location.href.split('admin.html')[0];
        const link = `${baseUrl}results-lookup.html?sheet=${sheetRef.id}`;
        const linkInput = document.getElementById('sheet-link-display-res');
        if (linkInput) linkInput.value = link;
        window._lastSavedSheetData = { id: sheetRef.id, title, teacher, students: parsedStudents, columns: gradeColumns };
        goToResultStep(4);
    } catch (err) { alert(`خطأ في الحفظ: ${err.message}`); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ وإنشاء الرابط'; } }
};

// ✅ FIX 4: ربط الأزرار مع إصلاح الأزرار المفقودة (prev-3-res, copy-link-btn-res)


// إتاحة الدوال عالمياً
window.loadResultsSheets = loadResultsSheets;

window.copyResultLink = (id) => {
    const baseUrl = window.location.href.split('admin.html')[0];
    const link = `${baseUrl}results-lookup.html?sheet=${id}`;
    navigator.clipboard.writeText(link)
        .then(() => alert('✅ تم نسخ الرابط!'))
        .catch(() => {
            const ta = document.createElement('textarea');
            ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('✅ تم نسخ الرابط!');
        });
};

// ✅ FIX 5: إضافة تنزيل الإكسل مع الرموز (كانت مفقودة في النسخة المدمجة)
window.downloadResultExcel = (id) => {
    const sheet = allSheetsCache[id];
    if (!sheet) return alert('الكشف غير موجود في الذاكرة. أعد تحميل الصفحة.');
    const cols = sheet.gradeColumns || [];
    const students = Object.entries(sheet.studentsByCode || {}).map(([code, s]) => ({
        name: s.name, code, grades: s.grades || {}
    }));
    const headers = ['الاسم', 'الرمز السري', ...cols];
    const rows = students.map(s => [
        s.name, s.code,
        ...cols.map(c => {
            const v = s.grades[c];
            return (v === undefined || v === null || v === '---') ? '' : v;
        })
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, ...cols.map(() => ({ wch: 16 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج مع الرموز');
    XLSX.writeFile(wb, `${sheet.title || 'كشف النتائج'} - مع الرموز.xlsx`);
};

// ✅ FIX 6: إضافة طباعة قائمة الباركود (كانت مفقودة في النسخة المدمجة)
window.printResultBarcodes = (id) => {
    const sheet = allSheetsCache[id];
    if (!sheet) return alert('الكشف غير موجود في الذاكرة. أعد تحميل الصفحة.');
    const students = Object.entries(sheet.studentsByCode || {})
        .map(([code, s]) => ({ name: s.name, code }));
    const escH = str => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) { alert('الرجاء السماح بفتح النوافذ المنبثقة من إعدادات المتصفح.'); return; }
    const cards = students.map((s, i) =>
        `<div class="card">
            <div class="num">${i + 1}</div>
            <div class="name">${escH(s.name)}</div>
            <div class="code">${s.code}</div>
            <svg id="bc${i}"></svg>
        </div>`
    ).join('');
    const barcodeScript = students.map((s, i) =>
        `try{JsBarcode('#bc${i}','${s.code}',{format:'CODE128',displayValue:false,height:52,margin:2});}catch(e){}`
    ).join('\n');
    win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة الرموز - ${escH(sheet.title || '')}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"><\/script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#fff;padding:24px;}
    h2{text-align:center;color:#1e40af;margin-bottom:6px;font-size:1.4em;}
    .sub{text-align:center;color:#64748b;font-size:0.9em;margin-bottom:22px;}
    .print-btn{display:block;margin:0 auto 22px;padding:11px 36px;background:#1d4ed8;color:white;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:700;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
    .card{border:2px solid #1e40af;border-radius:10px;padding:13px;text-align:center;page-break-inside:avoid;}
    .num{font-size:0.72em;color:#94a3b8;margin-bottom:3px;}
    .name{font-size:0.9em;font-weight:700;color:#1e293b;margin-bottom:5px;min-height:38px;display:flex;align-items:center;justify-content:center;word-break:break-word;}
    .code{font-family:monospace;font-size:1.05em;letter-spacing:4px;color:#1d4ed8;font-weight:700;margin-bottom:8px;}
    svg{max-width:100%;height:52px;}
    @media print{.print-btn{display:none;}body{padding:10px;}.grid{gap:10px;}}
  </style>
</head>
<body>
  <h2>📋 قائمة الرموز السرية</h2>
  <p class="sub">${escH(sheet.title || '')} &nbsp;|&nbsp; عدد الطلاب: ${students.length}</p>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة القائمة</button>
  <div class="grid">${cards}</div>
  <script>window.onload=function(){${barcodeScript}};<\/script>
</body>
</html>`);
    win.document.close();
};

window.deleteResultSheet = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا الكشف نهائياً؟\nلا يمكن التراجع عن هذا الإجراء.")) {
        try {
            await deleteDoc(doc(db, "result_sheets", id));
            loadResultsSheets();
        } catch (err) {
            alert(`خطأ في الحذف: ${err.message}`);
        }
    }
};

  function setupResultEventListeners() {
    const createBtn = document.getElementById('create-new-btn-integrated');
    if (createBtn) createBtn.onclick = window.showResultWizard;
    const backBtn = document.getElementById('back-to-list-btn-integrated');
    if (backBtn) backBtn.onclick = () => { document.getElementById('sheets-list-container-integrated').style.display = 'block'; document.getElementById('create-wizard-integrated').style.display = 'none'; loadResultsSheets(); };
    const next1 = document.getElementById('next-1-res');
    if (next1) next1.onclick = () => { const title = document.getElementById('sheet-title-res')?.value.trim(); const teacher = document.getElementById('sheet-teacher-res')?.value.trim(); if (!title || !teacher) { alert('الرجاء ملء عنوان الكشف واسم المدرس.'); return; } goToResultStep(2); };
    const prev2 = document.getElementById('prev-2-res'); if (prev2) prev2.onclick = () => goToResultStep(1);
    const next2 = document.getElementById('next-2-res');
    if (next2) next2.onclick = () => {
        if (parsedStudents.length === 0) { alert('يرجى رفع ملف إكسل أولاً.'); return; }
        const thead = document.getElementById('preview-thead-res');
        if (thead) thead.innerHTML = `<tr><th>#</th><th>اسم الطالب</th><th>الرمز السري</th>${gradeColumns.map(c => `<th>${escHtmlRes(c)}</th>`).join('')}</tr>`;
        const tbody = document.getElementById('preview-tbody-res');
        if (tbody) {
            const previewRows = parsedStudents.slice(0,10).map((s,i) => `<tr><td>${i+1}</td><td>${escHtmlRes(s.name)}</td><td><span style="font-family:monospace;letter-spacing:3px;font-weight:700;color:#1d4ed8;">${s.code}</span></td>${gradeColumns.map(c => `<td>${escHtmlRes(String(s.grades[c] ?? '---'))}</td>`).join('')}</tr>`).join('');
            const extraRow = parsedStudents.length > 10 ? `<tr><td colspan="${gradeColumns.length+3}" style="text-align:center;color:#94a3b8;padding:10px;">... و ${parsedStudents.length-10} طالب آخر</td></tr>` : '';
            tbody.innerHTML = previewRows + extraRow;
        }
        goToResultStep(3);
    };
    const prev3 = document.getElementById('prev-3-res'); if (prev3) prev3.onclick = () => goToResultStep(2);
    const saveBtn = document.getElementById('save-btn-res'); if (saveBtn) saveBtn.onclick = window.saveResultSheet;
    const copyLinkBtn = document.getElementById('copy-link-btn-res');
    if (copyLinkBtn) copyLinkBtn.onclick = () => { const val = document.getElementById('sheet-link-display-res')?.value; if(val) navigator.clipboard.writeText(val).then(()=>alert('✅ تم نسخ الرابط!')).catch(()=>alert('✅ تم نسخ الرابط!')); };
    const finishBtn = document.getElementById('finish-wizard-btn-res'); if (finishBtn) finishBtn.onclick = () => { document.getElementById('sheets-list-container-integrated').style.display = 'block'; document.getElementById('create-wizard-integrated').style.display = 'none'; loadResultsSheets(); };
    const uploadZone = document.getElementById('upload-zone-res'); const fileInput = document.getElementById('excel-file-input-res');
    if (uploadZone && fileInput) { uploadZone.onclick = () => fileInput.click(); fileInput.onchange = (e) => handleResultFileUpload(e.target.files[0]); }
}


// =================================================================
// --- Global Window Functions ---
// =================================================================

window.showMainContent = showMainContent;
window.copyToClipboard = copyToClipboard;
window.showQuestionManagement = showQuestionManagement;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.showParticipantManagement = showParticipantManagement;
window.unassignStudent = unassignStudent;
window.showStatistics = showStatistics;
window.editStudentGlobal = editStudentGlobal;
window.deleteStudentGlobal = deleteStudentGlobal;
window.cancelEditProfile = cancelEditProfile;
// أضف الدالة الجديدة للوصول العالمي
window.generateExamLink = generateExamLink;