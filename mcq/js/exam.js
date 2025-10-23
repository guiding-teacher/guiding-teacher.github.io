import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- State Variables ---
let currentExamData = null;
let currentQuestionIndex = -1;
let userAnswers = {};
let questionIds = [];
let timerInterval = null;
const examStartTime = new Date();
let examDuration = 3600; // Default
let warning10minShown = false;
let warning5minShown = false;
let participantDataCache = null;

// --- Retrieve Session Data ---
const studentNameFromSession = sessionStorage.getItem('studentName');
const studentId = sessionStorage.getItem('studentId');
const examId = sessionStorage.getItem('examId');

// --- DOM Elements ---
const examInfoDiv = document.getElementById('exam-info');
const timerDiv = document.getElementById('timer');
const currentDateDiv = document.getElementById('current-date');
const questionIndexList = document.getElementById('question-index-list');
const questionNumberH3 = document.getElementById('question-number');
const questionTextP = document.getElementById('question-text');
const optionsListUl = document.getElementById('options-list');
const finishExamBtn = document.getElementById('finish-exam-btn');
const finishConfirmModal = document.getElementById('finish-confirm-modal');
const finishCodeInput = document.getElementById('finish-code-input');
const confirmFinishBtn = document.getElementById('confirm-finish-btn');
const finishErrorMessage = document.getElementById('finish-error-message');
const resultsModal = document.getElementById('results-modal');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (!studentId || !examId) {
        alert('بيانات الجلسة غير موجودة. يرجى تسجيل الدخول مرة أخرى.');
        window.location.href = 'index.html';
        return;
    }
    
    currentDateDiv.textContent = `التاريخ: ${new Date().toLocaleString('ar-EG')}`;
    loadExamData();

    finishExamBtn.addEventListener('click', showFinishConfirmation);
    confirmFinishBtn.addEventListener('click', handleFinishConfirmation);
    decreaseFontBtn.addEventListener('click', () => changeFontSize(-1));
    increaseFontBtn.addEventListener('click', () => changeFontSize(1));
    
    // --- NEW: Event listeners for new results buttons ---
    document.getElementById('retake-exam-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    document.getElementById('wrong-answers-btn').addEventListener('click', () => {
        alert('هذه الميزة قيد التطوير حاليًا!');
    });
});

// --- Main Functions ---

async function loadExamData() {
    try {
        const examRef = doc(db, "exams", examId);
        const examSnap = await getDoc(examRef);

        if (!examSnap.exists()) throw new Error(`الاختبار المحدد غير موجود.`);
        
        currentExamData = examSnap.data();
        examInfoDiv.textContent = `اختبار: ${currentExamData.title} - الطالب: ${studentNameFromSession}`;
        examDuration = currentExamData.duration;

        if (currentExamData.randomizeQuestions) {
            questionIds = Object.keys(currentExamData.questions || {}).sort(() => Math.random() - 0.5);
        } else {
            questionIds = Object.keys(currentExamData.questions || {}).sort((a, b) => a.localeCompare(b));
        }

        if (questionIds.length === 0) throw new Error("لا توجد أسئلة في هذا الاختبار.");
        
        const participantRef = doc(db, "exams", examId, "participants", studentId);
        const participantSnap = await getDoc(participantRef);
        participantDataCache = participantSnap.data();

        if (participantSnap.exists() && (participantDataCache.status === 'finished' || participantDataCache.status === 'timed_out')) {
            alert('لقد أكملت هذا الاختبار بالفعل.');
            if (currentExamData.showResults !== false) {
                 // --- CHANGE: Calculate extra data for the new results view ---
                 const { correctAnswersCount } = calculateScore(participantDataCache.answers);
                 const displayData = { 
                     ...participantDataCache, 
                     correctAnswersCount: correctAnswersCount,
                     totalQuestions: questionIds.length
                 };
                 showResults(displayData);
            } else {
                 window.location.href = 'index.html';
            }
            disableExam();
            return;
        }
        
        const existingAnswers = (participantSnap.exists() && participantDataCache.answers) ? participantDataCache.answers : {};

        await updateDoc(participantRef, {
            startTime: Timestamp.fromDate(examStartTime),
            status: 'started',
            answers: existingAnswers 
        });
        
        userAnswers = existingAnswers;

        populateQuestionList();
        startTimer();
        if (questionIds.length > 0) displayQuestion(0);

    } catch (error) {
        console.error("Error loading exam:", error);
        alert(`حدث خطأ أثناء تحميل الاختبار: ${error.message}`);
        window.location.href = 'index.html';
    }
}

// --- NEW: Helper function for score calculation to avoid repetition ---
function calculateScore(answers) {
    let totalScore = 0;
    let totalPossiblePoints = 0;
    let correctAnswersCount = 0;

    questionIds.forEach(qId => {
        const questionData = currentExamData.questions?.[qId];
        if (!questionData) return;

        const userAnswerIndex = answers[qId];
        const points = Number(questionData.points) || 1;
        totalPossiblePoints += points;
        
        if (userAnswerIndex !== undefined && userAnswerIndex === questionData.correctOptionIndex) {
            totalScore += points;
            correctAnswersCount++;
        }
    });
    
    return { totalScore, totalPossiblePoints, correctAnswersCount };
}


function startTimer() { const endTime = examStartTime.getTime() + examDuration * 1000; timerInterval = setInterval(() => { const now = new Date().getTime(); const remaining = endTime - now; if (remaining <= 0) { clearInterval(timerInterval); timerDiv.textContent = 'الوقت المتبقي: 00:00:00'; timeUp(); return; } const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((remaining % (1000 * 60)) / 1000); timerDiv.textContent = `الوقت المتبقي: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; if (remaining < 10 * 60 * 1000 && !warning10minShown) { showTimeWarning('الوقت المتبقي أقل من 10 دقائق!'); warning10minShown = true; } if (remaining < 5 * 60 * 1000 && !warning5minShown) { showTimeWarning('الوقت المتبقي أقل من 5 دقائق!'); warning5minShown = true; } }, 1000); }


async function finishExam(isTimeUp = false) {
    if (!isTimeUp) {
        const mandatoryQuestions = questionIds.filter(qId => currentExamData.questions?.[qId]?.isMandatory);
        const unansweredMandatory = mandatoryQuestions.filter(qId => userAnswers[qId] === undefined);

        if (unansweredMandatory.length > 0) {
            alert(`الرجاء الإجابة على جميع الأسئلة الإجبارية (المميزة بـ *) قبل إنهاء الاختبار. عدد الأسئلة المتبقية: ${unansweredMandatory.length}`);
            closeModal('finish-confirm-modal');
            return;
        }
    }

    clearInterval(timerInterval);
    disableExam();

    // --- CHANGE: Use the new helper function ---
    const { totalScore, totalPossiblePoints, correctAnswersCount } = calculateScore(userAnswers);

    const percentageRaw = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
    const percentage = parseFloat(percentageRaw.toFixed(2));

    const finalStatus = isTimeUp ? 'timed_out' : 'finished';
    const passingPercentage = currentExamData.passingPercentage || 50;
    const hasPassed = percentage >= passingPercentage;
    const statusText = hasPassed ? 'ناجح' : 'راسب';
    const finalStudentName = studentNameFromSession || participantDataCache?.name || 'اسم غير معروف';
    
    const resultsDataForDb = {
        endTime: Timestamp.now(), score: totalScore, totalPossiblePoints: totalPossiblePoints,
        percentage: percentage, status: finalStatus, answers: userAnswers,
        passed: hasPassed, statusText: statusText
    };
    
    let dbError = false;
    try {
        const participantRef = doc(db, "exams", examId, "participants", studentId);
        await updateDoc(participantRef, resultsDataForDb);
        
        await addDoc(collection(db, "exam_log"), {
            studentId, studentName: finalStudentName, examId, examTitle: currentExamData.title,
            score: totalScore, totalPossiblePoints, percentage, passed: hasPassed,
            statusText, endTime: resultsDataForDb.endTime
        });

    } catch (error) {
        dbError = true;
        console.error("Error saving final results:", error);
        alert('حدث خطأ أثناء حفظ نتائجك. يرجى إبلاغ المشرف.');
    }

    if (!dbError) {
        if (currentExamData.showResults !== false) {
            try {
                // --- CHANGE: Prepare complete data for the new display ---
                const displayData = { 
                    ...resultsDataForDb, 
                    name: finalStudentName,
                    correctAnswersCount: correctAnswersCount,
                    totalQuestions: questionIds.length
                };
                showResults(displayData);
            } catch (displayError) {
                console.error("Error displaying results:", displayError);
                alert("تم حفظ نتيجتك بنجاح، ولكن حدث خطأ أثناء عرضها. سيتم نقلك للصفحة الرئيسية.");
                window.location.href = 'index.html';
            }
        } else {
            alert('تم إنهاء الاختبار بنجاح. سيتم إعلامك بالنتيجة لاحقاً. شكراً لك.');
            window.location.href = 'index.html';
        }
    }
}


function populateQuestionList() { questionIndexList.innerHTML = ''; questionIds.forEach((qId, index) => { const li = document.createElement('li'); const question = currentExamData.questions?.[qId]; if (!question) return; li.textContent = `س ${index + 1}${question.isMandatory ? ' *' : ''}`; li.dataset.questionIndex = index; li.dataset.questionId = qId; if (userAnswers[qId] !== undefined) li.classList.add('answered'); li.addEventListener('click', () => displayQuestion(index)); questionIndexList.appendChild(li); }); }
function displayQuestion(index) { if (index < 0 || index >= questionIds.length) return; currentQuestionIndex = index; const qId = questionIds[index]; const question = currentExamData.questions?.[qId]; if (!question) { questionNumberH3.innerHTML = `خطأ`; questionTextP.textContent = `لا يمكن العثور على بيانات السؤال.`; optionsListUl.innerHTML = ''; return; } const isMandatoryText = question.isMandatory ? ' <span style="color:red; font-weight:bold;">* (إجباري)</span>' : ''; questionNumberH3.innerHTML = `السؤال ${index + 1} من ${questionIds.length}${isMandatoryText}`; questionTextP.textContent = question.text; optionsListUl.innerHTML = ''; (question.options || []).forEach((option, optionIndex) => { const li = document.createElement('li'); const radioId = `q${index}_option${optionIndex}`; li.innerHTML = `<input type="radio" name="question_${index}" id="${radioId}" value="${optionIndex}" data-question-id="${qId}" ${userAnswers[qId] === optionIndex ? 'checked' : ''}><label for="${radioId}">${option}</label>`; optionsListUl.appendChild(li); }); optionsListUl.querySelectorAll('input[type="radio"]').forEach(radio => { radio.addEventListener('change', handleAnswerSelection); }); document.querySelectorAll('#question-index-list li').forEach(li => { li.classList.remove('active'); if (parseInt(li.dataset.questionIndex) === index) li.classList.add('active'); }); }
async function handleAnswerSelection(event) { const selectedOptionIndex = parseInt(event.target.value); const qId = event.target.dataset.questionId; userAnswers[qId] = selectedOptionIndex; const listItem = questionIndexList.querySelector(`li[data-question-id="${qId}"]`); if (listItem) listItem.classList.add('answered'); try { const participantRef = doc(db, "exams", examId, "participants", studentId); await updateDoc(participantRef, { [`answers.${qId}`]: selectedOptionIndex }); } catch (error) { console.error("Error saving answer:", error); } }
function showFinishConfirmation() { finishCodeInput.value = ''; finishErrorMessage.textContent = ''; finishConfirmModal.style.display = 'flex'; }
function handleFinishConfirmation() { const enteredCode = finishCodeInput.value.trim(); if (enteredCode === currentExamData.finishCode) { finishExam(false); } else { finishErrorMessage.textContent = 'رمز الإنهاء غير صحيح.'; } }
function timeUp() { alert('انتهى وقت الاختبار! سيتم إنهاء الاختبار الآن.'); finishExam(true); }
function showTimeWarning(message) { document.getElementById('time-warning-message').textContent = message; document.getElementById('time-warning-modal').style.display = 'flex'; }

// --- CHANGE: Updated showResults function for the new modal ---
function showResults(data) {
    document.getElementById('result-exam-title').textContent = currentExamData.title || 'نتيجة الاختبار';
    document.getElementById('result-correct-count').textContent = data.correctAnswersCount;
    document.getElementById('result-total-questions').textContent = data.totalQuestions;
    document.getElementById('result-final-score').textContent = data.percentage; // Percentage is the score out of 100
    
    resultsModal.style.display = 'flex';
}

function disableExam() { document.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true); finishExamBtn.disabled = true; decreaseFontBtn.disabled = true; increaseFontBtn.disabled = true; questionIndexList.style.pointerEvents = 'none'; optionsListUl.style.pointerEvents = 'none'; }
function changeFontSize(delta) { const currentSize = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size')); const newSize = currentSize + delta; if (newSize >= 12 && newSize <= 28) { document.body.style.fontSize = newSize + 'px'; } }