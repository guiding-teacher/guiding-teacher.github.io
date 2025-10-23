import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, query, where, deleteField, orderBy, Timestamp, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM Element Variables ---
let examsTableBody, studentsTableGlobalBody, examLogTableBody, successLogTableBody, failureLogTableBody, // Added failureLogTableBody
    addEditExamForm, addEditStudentFormGlobal, addEditQuestionForm,
    questionManagementSection, participantManagementSection, statisticsSection,
    selectedExamTitleSpan, currentEditingExamIdInput, questionFormTitle,
    questionIdInput, questionTextInput, questionPointsInput, questionIsMandatoryCheckbox,
    questionOptionsContainer, selectedExamTitleParticipantsSpan, currentManagingParticipantsExamIdInput,
    assignStudentSelect, assignStudentFeedback, participantsTableBody, selectedExamTitleStatsSpan,
    currentStatsExamIdInput, statsTotalParticipants, statsAvgPercentage, statsPassedCount,
    statsPassingCriteria, questionStatsTableBody, examIdInput, examTitleInput,
    examDurationInput, examFinishCodeInput, examPassingPercentageInput, examShowResultsCheckbox,
    examRandomizeQuestionsCheckbox, studentIdGlobalInput, studentNameGlobalInput, studentMotherNameGlobalInput,
    studentSequenceGlobalInput, studentCodeGlobalInput, studentFormTitleGlobal, studentFileInput,
    resultsDistributionChartCtx, questionsTableBody;

// --- Global App State ---
let questionOptionCount = 0;
let resultsChart = null;
let allExamsCache = {};
let allStudentsCache = [];

// =================================================================
// --- INITIALIZATION ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMReferences();
    addEventListeners();
    showMainContent('exams-section');
    loadExams();
    loadAllStudents();
    loadExamLog();
});

function initializeDOMReferences() {
    // ...
    successLogTableBody = document.querySelector('#success-log-table tbody');
    failureLogTableBody = document.querySelector('#failure-log-table tbody'); // New table body
    // ... (rest of the function is the same)
    questionManagementSection = document.getElementById('question-management-section');
    participantManagementSection = document.getElementById('participant-management-section');
    statisticsSection = document.getElementById('statistics-section');
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
}

function addEventListeners() {
    // ... (rest of the listeners are the same)
    document.getElementById('export-log-btn').addEventListener('click', exportFullLogToExcel);
    document.getElementById('delete-log-btn').addEventListener('click', deleteAllLogs);
    document.getElementById('export-success-log-btn').addEventListener('click', exportSuccessLogToExcel);
    document.getElementById('export-failure-log-btn').addEventListener('click', exportFailureLogToExcel); // New listener
    // ...
    document.querySelectorAll('.nav-link').forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); }); });
    document.getElementById('show-add-exam-form').addEventListener('click', () => { document.getElementById('exam-form-title').textContent = 'إضافة اختبار جديد'; examIdInput.value = ''; examTitleInput.value = ''; examDurationInput.value = '60'; examFinishCodeInput.value = ''; addEditExamForm.classList.remove('hidden'); });
    document.getElementById('save-exam-btn').addEventListener('click', saveExam);
    document.getElementById('show-add-student-form-global').addEventListener('click', () => { studentFormTitleGlobal.textContent = 'إضافة طالب جديد'; studentIdGlobalInput.value = ''; studentNameGlobalInput.value = ''; studentMotherNameGlobalInput.value = ''; studentSequenceGlobalInput.value = ''; studentCodeGlobalInput.value = ''; addEditStudentFormGlobal.classList.remove('hidden'); });
    document.getElementById('save-student-btn-global').addEventListener('click', saveStudentGlobal);
    studentFileInput.addEventListener('change', handleStudentFileUpload);
    document.getElementById('show-add-question-form').addEventListener('click', () => { questionFormTitle.textContent = 'إضافة سؤال جديد'; questionIdInput.value = ''; questionTextInput.value = ''; questionPointsInput.value = '1'; questionIsMandatoryCheckbox.checked = false; questionOptionsContainer.innerHTML = ''; questionOptionCount = 0; addOptionInput(); addOptionInput(); addEditQuestionForm.classList.remove('hidden'); });
    document.getElementById('save-question-btn').addEventListener('click', saveQuestion);
    document.getElementById('add-option-btn').addEventListener('click', () => addOptionInput());
    document.getElementById('assign-student-btn').addEventListener('click', assignStudentToExam);
    document.getElementById('assign-all-students-btn').addEventListener('click', assignAllUnassignedStudents);
}

// ... (UI Navigation, Exam, Question, and Student Management functions are unchanged)
function showMainContent(sectionIdToShow) { document.querySelectorAll('.main-content > .admin-section').forEach(section => { section.classList.add('hidden'); }); const targetSection = document.getElementById(sectionIdToShow); if(targetSection) { targetSection.classList.remove('hidden'); } const isMainSection = ['exams-section', 'students-section', 'log-section'].includes(sectionIdToShow); if (isMainSection) { document.querySelectorAll('.sidebar .nav-link').forEach(link => { link.classList.remove('active'); }); const activeLink = document.querySelector(`.sidebar .nav-link[onclick*="'${sectionIdToShow}'"]`); if(activeLink) activeLink.classList.add('active'); } }
async function loadExams() { examsTableBody.innerHTML = '<tr><td colspan="7">جاري التحميل...</td></tr>'; try { const snapshot = await getDocs(query(collection(db, "exams"), orderBy("title"))); examsTableBody.innerHTML = ''; allExamsCache = {}; if (snapshot.empty) { examsTableBody.innerHTML = '<tr><td colspan="7">لا توجد اختبارات. قم بإضافة اختبار جديد.</td></tr>'; return; } snapshot.forEach(doc => { const exam = doc.data(); const examId = doc.id; allExamsCache[examId] = exam; const examLink = `${window.location.origin}/index.html?exam=${examId}`; const row = examsTableBody.insertRow(); row.innerHTML = `<td>${exam.title || ''}</td><td><button class="btn-copy" onclick="copyToClipboard('${examLink}')">نسخ الرابط</button></td><td>${exam.duration ? exam.duration / 60 : 'N/A'} دقيقة</td><td><button class="btn-edit" onclick="showQuestionManagement('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الأسئلة</button></td><td><button class="btn-assign" onclick="showParticipantManagement('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الطلاب</button></td><td><button class="btn-view" onclick="showStatistics('${examId}', '${exam.title.replace(/'/g, "\\'")}')">الإحصائيات</button></td><td><button class="btn-edit" onclick="editExam('${examId}')">تعديل</button><button class="btn-delete" onclick="deleteExam('${examId}')">حذف</button></td>`; }); } catch (error) { console.error("Error loading exams: ", error); examsTableBody.innerHTML = '<tr><td colspan="7">خطأ في تحميل الاختبارات.</td></tr>'; } }
async function saveExam() { const data = { title: examTitleInput.value.trim(), duration: parseInt(examDurationInput.value) * 60, finishCode: examFinishCodeInput.value.trim(), passingPercentage: parseInt(examPassingPercentageInput.value), showResults: examShowResultsCheckbox.checked, randomizeQuestions: examRandomizeQuestionsCheckbox.checked }; if (!data.title || !data.duration || !data.finishCode) return alert("يرجى ملء جميع الحقول الأساسية."); try { if (examIdInput.value) { await updateDoc(doc(db, "exams", examIdInput.value), data); } else { data.questions = {}; await addDoc(collection(db, "exams"), data); } alert("تم حفظ الاختبار بنجاح."); addEditExamForm.classList.add('hidden'); loadExams(); } catch (e) { console.error(e); alert("خطأ في حفظ الاختبار."); } }
async function editExam(examId) { const exam = allExamsCache[examId]; if(exam){ addEditExamForm.classList.remove('hidden'); document.getElementById('exam-form-title').textContent = 'تعديل الاختبار'; examIdInput.value = examId; examTitleInput.value = exam.title || ''; examDurationInput.value = exam.duration ? exam.duration / 60 : ''; examFinishCodeInput.value = exam.finishCode || ''; examPassingPercentageInput.value = exam.passingPercentage || '50'; examShowResultsCheckbox.checked = exam.showResults !== false; examRandomizeQuestionsCheckbox.checked = exam.randomizeQuestions === true; window.scrollTo(0, 0); } }
async function deleteExam(examId) { if (!confirm('هل أنت متأكد من حذف هذا الاختبار وكل بياناته؟')) return; try { await deleteDoc(doc(db, "exams", examId)); alert('تم حذف الاختبار.'); loadExams(); } catch (error) { console.error("Error deleting exam:", error); } }
async function showQuestionManagement(examId, examTitle) { showMainContent('question-management-section'); selectedExamTitleSpan.textContent = examTitle; currentEditingExamIdInput.value = examId; addEditQuestionForm.classList.add('hidden'); await loadQuestions(examId); }
async function loadQuestions(examId) { questionsTableBody.innerHTML = '<tr><td colspan="5">جاري تحميل الأسئلة...</td></tr>'; try { const exam = allExamsCache[examId]; const questions = exam ? exam.questions : null; if (!questions || Object.keys(questions).length === 0) { questionsTableBody.innerHTML = '<tr><td colspan="5">لا توجد أسئلة لهذا الاختبار.</td></tr>'; return; } questionsTableBody.innerHTML = ''; const sortedQuestionIds = Object.keys(questions).sort(); for (const qId of sortedQuestionIds) { const question = questions[qId]; const correctOptionText = question.options[question.correctOptionIndex] || 'غير محدد'; const row = questionsTableBody.insertRow(); row.innerHTML = `<td>${question.text}</td><td>${question.points || 1}</td><td>${correctOptionText}</td><td>${question.isMandatory ? 'نعم' : 'لا'}</td><td><button class="btn-edit" onclick="editQuestion('${examId}', '${qId}')">تعديل</button><button class="btn-delete" onclick="deleteQuestion('${examId}', '${qId}')">حذف</button></td>`; } } catch (error) { console.error("Error loading questions:", error); questionsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الأسئلة.</td></tr>'; } }
async function saveQuestion() { const examId = currentEditingExamIdInput.value; const qId = questionIdInput.value; const questionText = questionTextInput.value.trim(); const points = parseInt(questionPointsInput.value); const isMandatory = questionIsMandatoryCheckbox.checked; const options = Array.from(questionOptionsContainer.querySelectorAll('.option-group input[type="text"]')).map(input => input.value.trim()); const correctOptionRadio = questionOptionsContainer.querySelector('input[name="correct_option"]:checked'); if (!examId || !questionText || options.length < 2 || options.some(opt => !opt) || !correctOptionRadio || isNaN(points) || points <= 0) { alert('يرجى إدخال نص السؤال، درجة صحيحة، خيارين على الأقل، وتحديد الإجابة الصحيحة.'); return; } const correctOptionIndex = parseInt(correctOptionRadio.value); const questionData = { text: questionText, points, options, correctOptionIndex, isMandatory }; try { const newQuestionId = qId || 'q' + Date.now(); await updateDoc(doc(db, "exams", examId), { [`questions.${newQuestionId}`]: questionData }); alert(`تم ${qId ? 'تحديث' : 'حفظ'} السؤال بنجاح!`); allExamsCache[examId].questions[newQuestionId] = questionData; addEditQuestionForm.classList.add('hidden'); loadQuestions(examId); } catch (error) { console.error("Error saving question: ", error); alert('حدث خطأ أثناء حفظ السؤال.'); } }
async function editQuestion(examId, qId) { const question = allExamsCache[examId]?.questions?.[qId]; if(question){ addEditQuestionForm.classList.remove('hidden'); questionFormTitle.textContent = 'تعديل السؤال'; questionIdInput.value = qId; questionTextInput.value = question.text; questionPointsInput.value = question.points || 1; questionIsMandatoryCheckbox.checked = question.isMandatory === true; questionOptionsContainer.innerHTML = ''; questionOptionCount = 0; question.options.forEach((opt, index) => addOptionInput(opt, index === question.correctOptionIndex)); } }
async function deleteQuestion(examId, qId) { if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) { try { await updateDoc(doc(db, "exams", examId), { [`questions.${qId}`]: deleteField() }); delete allExamsCache[examId].questions[qId]; alert('تم حذف السؤال بنجاح.'); loadQuestions(examId); } catch (error) { console.error("Error deleting question:", error); alert('حدث خطأ أثناء حذف السؤال.'); } } }
function addOptionInput(optionText = '', isCorrect = false) { const optionDiv = document.createElement('div'); optionDiv.classList.add('option-group'); optionDiv.style.display = 'flex'; optionDiv.style.alignItems = 'center'; optionDiv.style.marginBottom = '8px'; optionDiv.innerHTML = `<input type="radio" name="correct_option" value="${questionOptionCount}" ${isCorrect ? 'checked' : ''} required><input type="text" placeholder="نص الخيار ${questionOptionCount + 1}" value="${optionText}" required style="flex-grow:1; margin: 0 10px;"><button type="button" onclick="this.parentElement.remove()" style="background-color:#f44336; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer;">X</button>`; questionOptionsContainer.appendChild(optionDiv); questionOptionCount++; }
async function showParticipantManagement(examId, examTitle) { showMainContent('participant-management-section'); selectedExamTitleParticipantsSpan.textContent = examTitle; currentManagingParticipantsExamIdInput.value = examId; assignStudentFeedback.textContent = ''; assignStudentSelect.innerHTML = '<option value="">-- جاري التحميل --</option>'; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); const assignedStudentIds = new Set(participantsSnapshot.docs.map(doc => doc.id)); const availableStudents = allStudentsCache.filter(student => !assignedStudentIds.has(student.id)); assignStudentSelect.innerHTML = availableStudents.length === 0 ? '<option value="">-- كل الطلاب معينون لهذا الاختبار --</option>' : '<option value="">-- اختر طالباً --</option>' + availableStudents.map(student => `<option value="${student.id}">${student.data.name}</option>`).join(''); } catch(e) { console.error("Error populating dropdown:", e); assignStudentSelect.innerHTML = '<option value="">-- خطأ في تحميل الطلاب --</option>'; } await loadParticipants(examId); }
async function loadAllStudents() { studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>'; try { const q = query(collection(db, "students"), orderBy("name")); const querySnapshot = await getDocs(q); allStudentsCache = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })); studentsTableGlobalBody.innerHTML = ''; if (querySnapshot.empty) { studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">لا يوجد طلاب في النظام.</td></tr>'; return; } allStudentsCache.forEach(student => { const row = studentsTableGlobalBody.insertRow(); row.innerHTML = `<td>${student.data.name}</td><td>${student.data.motherName || '---'}</td><td>${student.data.sequence || '---'}</td><td>${student.data.accessCode}</td><td><button class="btn-edit" onclick="editStudentGlobal('${student.id}')">تعديل</button><button class="btn-delete" onclick="deleteStudentGlobal('${student.id}')">حذف</button></td>`; }); } catch (error) { console.error("Error loading all students:", error); studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الطلاب.</td></tr>'; } }
async function saveStudentGlobal() { const studentId = studentIdGlobalInput.value; const studentName = studentNameGlobalInput.value.trim(); const motherName = studentMotherNameGlobalInput.value.trim(); const sequence = studentSequenceGlobalInput.value.trim(); let studentCode = studentCodeGlobalInput.value.trim(); if (!studentName) { alert("الرجاء إدخال اسم الطالب."); return; } if (!studentCode) { studentCode = `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 4)}`; } const studentData = { name: studentName, motherName, sequence, accessCode: studentCode }; try { if (studentId) { await updateDoc(doc(db, "students", studentId), studentData); } else { await addDoc(collection(db, "students"), studentData); } alert(`تم حفظ الطالب ${studentName} بنجاح.`); addEditStudentFormGlobal.classList.add('hidden'); loadAllStudents(); } catch(e) { console.error("Error saving student:", e); alert("حدث خطأ أثناء حفظ بيانات الطالب."); } }
async function handleStudentFileUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { try { const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, { type: 'array' }); const sheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[sheetName]; const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); if (json.length < 2) return alert("الملف فارغ أو لا يحتوي على بيانات."); const headers = json[0].map(h => h.toString().trim()); const nameIndex = headers.indexOf('الاسم'); const motherIndex = headers.indexOf('اسم الام'); const seqIndex = headers.indexOf('التسلسل'); if (nameIndex === -1) { return alert("لم يتم العثور على عمود 'الاسم' في ملف Excel. هذا العمود إجباري."); } const studentData = json.slice(1); const promises = studentData.map(row => { const name = row[nameIndex]?.toString().trim(); if (!name) return null; const student = { name: name, motherName: motherIndex > -1 ? (row[motherIndex]?.toString().trim() || '') : '', sequence: seqIndex > -1 ? (row[seqIndex]?.toString().trim() || '') : '', accessCode: `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 4)}` }; return addDoc(collection(db, "students"), student); }).filter(p => p !== null); await Promise.all(promises); alert(`تم استيراد ${promises.length} طالب بنجاح!`); loadAllStudents(); } catch (error) { console.error("Error processing Excel file:", error); alert("حدث خطأ أثناء قراءة الملف. تأكد من أن الأعمدة بالأسماء الصحيحة (الاسم, اسم الام, التسلسل)."); } finally { event.target.value = ''; } }; reader.readAsArrayBuffer(file); }
async function editStudentGlobal(studentId) { const student = allStudentsCache.find(s => s.id === studentId); if(student) { addEditStudentFormGlobal.classList.remove('hidden'); studentFormTitleGlobal.textContent = 'تعديل بيانات الطالب'; studentIdGlobalInput.value = studentId; studentNameGlobalInput.value = student.data.name || ''; studentMotherNameGlobalInput.value = student.data.motherName || ''; studentSequenceGlobalInput.value = student.data.sequence || ''; studentCodeGlobalInput.value = student.data.accessCode || ''; } }
async function deleteStudentGlobal(studentId) { if (confirm("هل أنت متأكد من حذف هذا الطالب نهائياً من النظام؟ سيتم حذفه من كل الاختبارات المعين لها.")) { try { await deleteDoc(doc(db, "students", studentId)); alert("تم حذف الطالب بنجاح."); loadAllStudents(); } catch(e) { console.error(e); alert("خطأ في حذف الطالب."); } } }
async function assignStudentToExam() { const studentId = assignStudentSelect.value; const examId = currentManagingParticipantsExamIdInput.value; const selectedStudent = allStudentsCache.find(s => s.id === studentId); if (!studentId || !examId || !selectedStudent) { assignStudentFeedback.textContent = 'الرجاء اختيار طالب صالح.'; return; } try { const participantRef = doc(db, "exams", examId, "participants", studentId); await setDoc(participantRef, { name: selectedStudent.data.name, status: 'not_started' }); assignStudentFeedback.textContent = `تم تعيين الطالب بنجاح!`; setTimeout(() => assignStudentFeedback.textContent = '', 3000); showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch (error) { console.error("Error assigning student:", error); assignStudentFeedback.textContent = 'حدث خطأ أثناء تعيين الطالب.'; } }
async function assignAllUnassignedStudents() { const examId = currentManagingParticipantsExamIdInput.value; if (!examId) return; if (!confirm("هل أنت متأكد من تعيين كل الطلاب غير المعينين حاليًا لهذا الاختبار؟")) return; assignStudentFeedback.textContent = "جاري تعيين كل الطلاب..."; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); const assignedStudentIds = new Set(participantsSnapshot.docs.map(doc => doc.id)); const availableStudents = allStudentsCache.filter(student => !assignedStudentIds.has(student.id)); if (availableStudents.length === 0) { assignStudentFeedback.textContent = "لا يوجد طلاب غير معينين لتعيينهم."; return; } const promises = availableStudents.map(student => { const participantRef = doc(db, "exams", examId, "participants", student.id); return setDoc(participantRef, { name: student.data.name, status: 'not_started' }); }); await Promise.all(promises); assignStudentFeedback.textContent = `تم تعيين ${availableStudents.length} طالب بنجاح!`; showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch(error) { console.error("Error assigning all students:", error); assignStudentFeedback.textContent = "حدث خطأ أثناء التعيين الجماعي."; } }
async function loadParticipants(examId) { participantsTableBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>'; try { const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants")); if (participantsSnapshot.empty) { participantsTableBody.innerHTML = '<tr><td colspan="5">لم يتم تعيين أي طلاب لهذا الاختبار بعد.</td></tr>'; return; } participantsTableBody.innerHTML = ''; participantsSnapshot.forEach(pDoc => { const studentId = pDoc.id; const studentData = allStudentsCache.find(s => s.id === studentId)?.data; if (!studentData) return; const participantData = pDoc.data(); const scoreText = (participantData.score !== undefined) ? `${participantData.score} / ${participantData.totalPossiblePoints}` : '---'; const row = participantsTableBody.insertRow(); row.innerHTML = `<td>${studentData.name}</td><td>${studentData.accessCode}</td><td>${translateStatus(participantData.status)}</td><td>${scoreText}</td><td><button class="btn-delete" onclick="unassignStudent('${studentId}', '${examId}')">إلغاء التعيين</button></td>`; }); } catch(error) { console.error("Error loading participants: ", error); participantsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل المشاركين.</td></tr>'; } }
async function unassignStudent(studentId, examId) { if (confirm('هل أنت متأكد من إلغاء تعيين هذا الطالب من الاختبار؟ سيتم حذف بيانات تقدمه في الاختبار أيضاً.')) { try { const participantRef = doc(db, "exams", examId, "participants", studentId); await deleteDoc(participantRef); alert('تم إلغاء تعيين الطالب بنجاح.'); showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent); } catch (error) { console.error("Error un-assigning student:", error); alert('حدث خطأ أثناء إلغاء التعيين.'); } } }

// =================================================================
// --- STATISTICS (MAJOR CHANGES HERE) ---
// =================================================================
async function showStatistics(examId, examTitle) {
    showMainContent('statistics-section');
    selectedExamTitleStatsSpan.textContent = examTitle;
    currentStatsExamIdInput.value = examId;
    if (resultsChart) resultsChart.destroy();
    
    successLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>';
    failureLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>';
    questionStatsTableBody.innerHTML = '<tr><td colspan="2">جاري التحميل...</td></tr>';

    await calculateAndDisplayStats(examId);
}

async function calculateAndDisplayStats(examId) {
    try {
        const examData = allExamsCache[examId];
        if (!examData) { alert('الاختبار غير موجود.'); return; }

        const examQuestions = examData.questions || {};
        const passingPercentage = examData.passingPercentage || 50;
        statsPassingCriteria.textContent = `>= ${passingPercentage}%`;

        const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants"));
        if (participantsSnapshot.empty) {
            statsTotalParticipants.textContent = '0'; statsAvgPercentage.textContent = '0%'; statsPassedCount.textContent = '0';
            questionStatsTableBody.innerHTML = '<tr><td colspan="2">لا توجد بيانات لعرضها.</td></tr>';
            successLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد ناجحون بعد.</td></tr>';
            failureLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد راسبون بعد.</td></tr>';
            return;
        }

        let totalParticipants = 0, totalPercentageSum = 0;
        const chartData = [];
        const questionStats = {};
        const successfulParticipants = [];
        const failedParticipants = []; // New array for failures

        participantsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'finished' || data.status === 'timed_out') {
                totalParticipants++;
                chartData.push(data);
                if (typeof data.percentage === 'number') {
                    totalPercentageSum += data.percentage;
                    if (data.passed) {
                        successfulParticipants.push(data);
                    } else {
                        failedParticipants.push(data); // Add to failures array
                    }
                }
                if (data.answers) { /* ... question stats logic ... */ }
            }
        });

        statsTotalParticipants.textContent = totalParticipants;
        statsAvgPercentage.textContent = (totalParticipants > 0 ? (totalPercentageSum / totalParticipants).toFixed(2) : '0') + '%';
        statsPassedCount.textContent = successfulParticipants.length;
        
        displayResultsChart(chartData, passingPercentage);
        displayQuestionDifficulty(questionStats, examQuestions);
        displaySuccessLog(successfulParticipants);
        displayFailureLog(failedParticipants); // Call the new display function

    } catch (error) {
        console.error("Error calculating statistics:", error);
        alert('حدث خطأ أثناء حساب الإحصائيات.');
    }
}

function displaySuccessLog(successfulParticipants) {
    successLogTableBody.innerHTML = '';
    if (successfulParticipants.length === 0) {
        successLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد ناجحون بعد.</td></tr>';
        return;
    }
    successfulParticipants.sort((a, b) => b.percentage - a.percentage);
    successfulParticipants.forEach(data => {
        const row = successLogTableBody.insertRow();
        populateParticipantRow(row, data);
    });
}

// NEW function to display failures
function displayFailureLog(failedParticipants) {
    failureLogTableBody.innerHTML = '';
    if (failedParticipants.length === 0) {
        failureLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد راسبون.</td></tr>';
        return;
    }
    failedParticipants.sort((a, b) => b.percentage - a.percentage);
    failedParticipants.forEach(data => {
        const row = failureLogTableBody.insertRow();
        populateParticipantRow(row, data);
    });
}

// NEW helper function to avoid repeating row creation logic
function populateParticipantRow(row, data) {
    const startTime = data.startTime?.toDate().toLocaleString('ar-EG') || '---';
    const endTime = data.endTime?.toDate().toLocaleString('ar-EG') || '---';
    let duration = '---';
    if (data.startTime && data.endTime) {
        const diffMs = data.endTime.toMillis() - data.startTime.toMillis();
        const diffMins = Math.round(diffMs / 60000);
        duration = `${diffMins} دقيقة`;
    }
    row.innerHTML = `
        <td>${data.name || '---'}</td>
        <td>${data.score} / ${data.totalPossiblePoints}</td>
        <td>${data.percentage}%</td>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td>${duration}</td>
    `;
}

async function exportSuccessLogToExcel() {
    await exportParticipantLogToExcel(true);
}

// NEW function to export failures
async function exportFailureLogToExcel() {
    await exportParticipantLogToExcel(false);
}

// NEW generic helper function for exporting to avoid code duplication
async function exportParticipantLogToExcel(isSuccess) {
    const examId = currentStatsExamIdInput.value;
    const examData = allExamsCache[examId];
    if (!examId || !examData) return alert('لا يوجد اختبار محدد.');

    const participantsSnapshot = await getDocs(collection(db, "exams", examId, "participants"));
    const excelData = [];
    
    participantsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.passed === isSuccess) { // Check if student passed or failed
            const studentAnswers = data.answers || {};
            const questions = examData.questions || {};
            for(const qId in questions) {
                const question = questions[qId];
                const studentAnswerIndex = studentAnswers[qId];
                const studentAnswerText = studentAnswerIndex !== undefined ? question.options[studentAnswerIndex] : "لم يجب";
                const correctAnswerText = question.options[question.correctOptionIndex];
                
                excelData.push({
                    "اسم الطالب": data.name,
                    "الدرجة": `${data.score} / ${data.totalPossiblePoints}`,
                    "النسبة": data.percentage,
                    "نص السؤال": question.text,
                    "إجابة الطالب": studentAnswerText,
                    "الإجابة الصحيحة": correctAnswerText,
                });
            }
        }
    });
    
    const logType = isSuccess ? "الناجحين" : "الراسبين";
    if (excelData.length === 0) return alert(`لا يوجد بيانات ${logType} لتصديرها.`);

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `سجل ${logType}`);
    XLSX.writeFile(workbook, `${logType}_${examData.title}.xlsx`);
}

function displayResultsChart(participantsData, passingPercentage) { /* ... unchanged ... */ const passed = participantsData.filter(p => p.percentage >= passingPercentage).length; const failed = participantsData.length - passed; if (resultsChart) resultsChart.destroy(); resultsChart = new Chart(resultsDistributionChartCtx, { type: 'pie', data: { labels: [`ناجح (>= ${passingPercentage}%)`, `راسب (< ${passingPercentage}%)`], datasets: [{ data: [passed, failed], backgroundColor: ['#4CAF50', '#F44336'] }] }, options: { responsive: true, plugins: { title: { display: true, text: 'توزيع نتائج الممتحنين' } } } }); }
function displayQuestionDifficulty(questionStats, examQuestions) { /* ... unchanged ... */ questionStatsTableBody.innerHTML = ''; if(Object.keys(examQuestions).length === 0) { questionStatsTableBody.innerHTML = '<tr><td colspan="2">لا توجد أسئلة لتحليلها.</td></tr>'; return; } const sortedQuestionIds = Object.keys(examQuestions).sort(); for (const qId of sortedQuestionIds) { const stats = questionStats[qId] || { attempts: 0, corrects: 0 }; const correctPercentage = stats.attempts > 0 ? ((stats.corrects / stats.attempts) * 100).toFixed(1) : '0.0'; const row = questionStatsTableBody.insertRow(); row.innerHTML = `<td>${examQuestions[qId].text}</td><td style="background-color: ${correctPercentage > 70 ? '#d4edda' : (correctPercentage < 40 ? '#f8d7da' : '#fff3cd')}">${correctPercentage}% (${stats.corrects}/${stats.attempts} مجيبين)</td>`; } }

// =================================================================
// --- EXAM LOG ---
// =================================================================
async function loadExamLog() { examLogTableBody.innerHTML = '<tr><td colspan="6">جاري تحميل السجل...</td></tr>'; try { const q = query(collection(db, "exam_log"), orderBy("endTime", "desc")); const snapshot = await getDocs(q); examLogTableBody.innerHTML = ''; if (snapshot.empty) { examLogTableBody.innerHTML = '<tr><td colspan="6">لا توجد سجلات بعد.</td></tr>'; return; } snapshot.forEach(doc => { const log = doc.data(); const endTime = log.endTime.toDate().toLocaleString('ar-EG'); const row = examLogTableBody.insertRow(); row.innerHTML = `<td>${endTime}</td><td>${log.studentName || ''}</td><td>${log.examTitle || ''}</td><td>${log.score} / ${log.totalPossiblePoints}</td><td>${log.percentage}%</td><td style="font-weight: bold; color: ${log.passed ? 'green' : 'red'};">${log.statusText}</td>`; }); } catch (error) { console.error("Error loading exam log:", error); } }
async function exportFullLogToExcel() { const q = query(collection(db, "exam_log"), orderBy("endTime", "desc")); const snapshot = await getDocs(q); if (snapshot.empty) return alert('لا توجد سجلات لتصديرها.'); const excelData = snapshot.docs.map(doc => { const log = doc.data(); return { "تاريخ الإنهاء": log.endTime.toDate().toLocaleString('ar-EG'), "اسم الطالب": log.studentName, "عنوان الاختبار": log.examTitle, "الدرجة": log.score, "الدرجة الكلية": log.totalPossiblePoints, "النسبة": log.percentage, "الحالة": log.statusText, }; }); const worksheet = XLSX.utils.json_to_sheet(excelData); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "السجل الكامل"); XLSX.writeFile(workbook, "FullExamLog.xlsx"); }
async function deleteAllLogs() { const confirmation = prompt("للتأكيد، اكتب 'حذف' في المربع أدناه. هذه العملية لا يمكن التراجع عنها."); if (confirmation !== 'حذف') { alert("لم يتم الحذف. الكتابة غير مطابقة."); return; } if (!confirm("تأكيد نهائي: هل أنت متأكد من حذف جميع سجلات الاختبارات بشكل دائم؟")) return; try { const logSnapshot = await getDocs(collection(db, "exam_log")); if (logSnapshot.empty) { alert("لا توجد سجلات لحذفها."); return; } const batch = writeBatch(db); logSnapshot.docs.forEach(doc => { batch.delete(doc.ref); }); await batch.commit(); alert(`تم حذف ${logSnapshot.size} سجل بنجاح.`); loadExamLog(); } catch (error) { console.error("Error deleting logs:", error); alert("حدث خطأ أثناء حذف السجلات."); } }
// --- UTILITY ---
function translateStatus(status) { const statuses = { 'started': 'بدأ الاختبار', 'finished': 'أنهى الاختبار', 'timed_out': 'انتهى الوقت', 'not_started': 'لم يبدأ' }; return statuses[status] || 'غير معروف'; }
function copyToClipboard(text) { navigator.clipboard.writeText(text).then(() => alert("تم نسخ الرابط!")).catch(() => alert("فشل النسخ.")); }
// Expose functions to global window object for inline onclicks
window.showMainContent = showMainContent; window.copyToClipboard = copyToClipboard; window.showQuestionManagement = showQuestionManagement; window.editExam = editExam; window.deleteExam = deleteExam; window.editQuestion = editQuestion; window.deleteQuestion = deleteQuestion; window.showParticipantManagement = showParticipantManagement; window.unassignStudent = unassignStudent; window.showStatistics = showStatistics; window.editStudentGlobal = editStudentGlobal; window.deleteStudentGlobal = deleteStudentGlobal;