// main.js
// This is the main entry point of the application.
// It imports all modules, initializes the app, and sets up all event listeners.


// main.js

// Add this code at the top of the file to register the Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
  });
}

// ... rest of your main.js code
import { state } from './state.js';
import * as auth from './auth.js';
import * as storage from './storage.js';
import * as ui from './ui.js';
import * as calculator from './calculator.js';

/**
 * Main authentication state change handler.
 * This function is called whenever the user logs in or out.
 * @param {object} user - The Firebase user object, or null if logged out.
 */
async function onAuthChange(user) {
    if (user) {
        state.currentUID = user.uid;
        try {
            const isActive = await auth.checkUserActivation(user.uid);
            if (isActive) {
                ui.showScreen('classDashboard');
                ui.renderClassDashboard();
            } else {
                ui.showScreen('activation');
            }
        } catch (e) {
            console.error("Error checking user status:", e);
            ui.showScreen('auth'); // Fallback to auth screen on error
        }
    } else {
        state.currentUID = null;
        ui.showScreen('auth');
    }
}

/**
 * Sets up all the event listeners for the entire application.
 * This is crucial for making the UI interactive.
 */
function setupEventListeners() {
    // --- Authentication Views ---
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        auth.handleLogin(email, password).catch(err => {
            document.getElementById('login-msg').textContent = "Échec de la connexion: email ou mot de passe incorrect.";
        });
    });

    document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const registerMsg = document.getElementById('register-msg');

    registerMsg.textContent = "جاري المعالجة...";
    registerMsg.style.color = "blue";

    // الخطوة 1: تسجيل الإيميل كـ Lead
    auth.sendToWorker({ email: email })
        .then(() => {
            // الخطوة 2: تخزين بيانات التسجيل مؤقتاً
            state.tempRegData = { email, password };
            // الخطوة 3: الانتقال مباشرة إلى صفحة التفعيل
            ui.showScreen('activation');
        })
        .catch(err => {
            registerMsg.textContent = "حدث خطأ. حاول مرة أخرى.";
            registerMsg.style.color = "red";
        });
});


    document.getElementById('reset-password-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;
        auth.handlePasswordReset(email)
            .then(() => { document.getElementById('reset-msg').textContent = "E-mail de réinitialisation envoyé !"; })
            .catch(() => { document.getElementById('reset-msg').textContent = "Erreur. E-mail non trouvé."; });
    });

    document.getElementById('logout-btn')?.addEventListener('click', auth.handleLogout);

    // --- Auth View Toggles ---
    document.getElementById('show-register-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-view').style.display = 'none'; document.getElementById('register-view').style.display = 'block'; document.getElementById('reset-password-view').style.display = 'none'; });
    document.getElementById('show-login-link-from-register')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-view').style.display = 'block'; document.getElementById('register-view').style.display = 'none'; document.getElementById('reset-password-view').style.display = 'none'; });
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-view').style.display = 'none'; document.getElementById('register-view').style.display = 'none'; document.getElementById('reset-password-view').style.display = 'block'; });
    document.getElementById('back-to-login-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-view').style.display = 'block'; document.getElementById('register-view').style.display = 'none'; document.getElementById('reset-password-view').style.display = 'none'; });

    // --- Activation Form ---
    document.getElementById('activation-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const licInput = document.getElementById('lic-input');
    const licMsg = document.getElementById('lic-msg');
    const key = licInput.value.trim();

    if (!key) {
        licMsg.textContent = "Veuillez entrer la clé.";
        return;
    }
    // التأكد من وجود بيانات التسجيل المؤقتة
    if (!state.tempRegData) {
        licMsg.textContent = "خطأ: بيانات التسجيل غير موجودة. يرجى البدء من جديد.";
        return;
    }

    licMsg.textContent = "جاري التفعيل...";
    licMsg.style.color = "blue";

    // إرسال كل شيء إلى الـ Worker للتفعيل النهائي
    auth.sendToWorker({
        email: state.tempRegData.email,
        password: state.tempRegData.password,
        activationKey: key
    })
    .then(() => {
        // نجاح التفعيل، الآن نسجل دخول المستخدم
        return auth.handleLogin(state.tempRegData.email, state.tempRegData.password);
    })

    .then(() => {
         // نجح تسجيل الدخول، onAuthChange سيتكفل بالباقي
         state.tempRegData = null; // تنظيف البيانات المؤقتة
         licMsg.textContent = "تم التفعيل بنجاح! جاري الدخول...";
         licMsg.style.color = "green";
    })
    .catch(err => {
        licMsg.textContent = err.message;
        licMsg.style.color = "red";
    });
});
    // --- Modal Buttons ---
    document.getElementById('modal-overlay')?.addEventListener('click', ui.closeModal);
    document.getElementById('modal-close-btn')?.addEventListener('click', ui.closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', ui.closeModal);
    document.getElementById('modal-save-btn')?.addEventListener('click', () => {
        const action = ui.getModalSaveAction();
        if (action && action()) {
            ui.closeModal();
        }
    });

    // --- Class Dashboard ---
    document.getElementById('class-list')?.addEventListener('click', (e) => {
        const classCard = e.target.closest('.class-card');
        if (!classCard) return;
        const className = classCard.dataset.className;
        const action = e.target.closest('.action-btn')?.dataset.action;
        
        if (action === 'delete') {
            if (storage.deleteClass(className)) {
                ui.renderClassDashboard();
            }
        } else if (action === 'edit') {
            ui.handleEditClass(className);
        } else if (action === 'stats') {
            ui.renderClassStatsPage(className);
            ui.showScreen('classStats');
        } else {
            ui.renderClassDetailsScreen(className);
            ui.showScreen('classDetails');
        }
    });

    document.getElementById('add-class-btn')?.addEventListener('click', ui.handleAddClass);
    document.getElementById('add-student-main-btn')?.addEventListener('click', () => ui.handleAddStudent());
    document.getElementById('class-search-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const { students } = storage.getAppData();
        const allStudents = Object.values(students);
        document.querySelectorAll('#class-list .class-card').forEach(card => {
            const className = card.dataset.className.toLowerCase();
            let isMatch = className.includes(searchTerm);
            if (!isMatch) {
                const studentsInThisClass = allStudents.filter(student => student.class.toLowerCase() === className);
                if (studentsInThisClass.some(student => student.name.toLowerCase().includes(searchTerm))) {
                    isMatch = true;
                }
            }
            card.style.display = isMatch ? 'flex' : 'none';
        });
    });

    // --- Class Details Screen ---
    document.getElementById('class-student-list')?.addEventListener('click', (e) => {
        const studentItem = e.target.closest('.student-item');
        if (!studentItem) return;
        const studentId = studentItem.dataset.studentId;
        const actionBtn = e.target.closest('.action-btn');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'delete') {
                if (storage.deleteStudent(studentId)) {
                    ui.renderClassDetailsScreen(state.currentClassName);
                }
            } else if (action === 'edit') {
                ui.handleEditStudent(studentId);
            }
        } else {
            ui.setupEvaluationScreen(studentId);
            ui.showScreen('evaluation');
        }
    });
    
    document.getElementById('add-student-to-class-btn')?.addEventListener('click', () => ui.handleAddStudent(state.currentClassName));
    document.getElementById('student-search-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#class-student-list .student-item').forEach(item => {
            const studentName = item.querySelector('.student-name').textContent.toLowerCase();
            item.style.display = studentName.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    // --- Evaluation Screen ---
    document.getElementById('evaluation-screen')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="delete-eval"]');
        if (deleteBtn && state.currentStudentId) {
            const evalIndex = parseInt(deleteBtn.dataset.evalIndex);
            if (storage.deleteEvaluation(state.currentStudentId, evalIndex)) {
                ui.setupEvaluationScreen(state.currentStudentId); // Re-render the evaluation screen
            }
        }
    });

    document.querySelectorAll('.counter-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const targetInput = document.getElementById(targetId);
            const targetDisplay = document.getElementById(`${targetId}_display`);
            let currentValue = parseInt(targetInput.value);
            if (button.classList.contains('increment-btn')) {
                currentValue++;
            } else if (button.classList.contains('decrement-btn')) {
                currentValue = Math.max(0, currentValue - 1);
            }
            targetInput.value = currentValue;
            if (targetDisplay) targetDisplay.textContent = currentValue;
        });
    });

    document.getElementById('calculate-btn')?.addEventListener('click', () => {
        const year = document.getElementById('year').value;
        const pA = parseInt(document.getElementById('performed_a').value) || 0;
        const pB = parseInt(document.getElementById('performed_b').value) || 0;
        const pC = parseInt(document.getElementById('performed_c').value) || 0;
        const specificReqScore = parseFloat(document.getElementById('specific_req').value);
        const linkingQualityValue = document.getElementById('linking_quality').value;
        const executionScore = parseFloat(document.getElementById('execution').value);
        const coCnScore = parseFloat(document.getElementById('co_cn').value) || 0;
        let coCmScore = parseFloat(document.getElementById('co_cm').value) || 0;
        coCmScore = Math.min(coCmScore, calculator.coCmMaxScores_calc[year]);

        const difficultyResult = calculator.calculateDifficulty(year, pA, pB, pC);
        const linkingScore = calculator.getLinkingQualityScore(year, linkingQualityValue);
        const totalScore = difficultyResult.score + specificReqScore + linkingScore + executionScore + coCnScore + coCmScore;

        document.getElementById('final-score').textContent = totalScore.toFixed(2);
        const maxLinkingScore = calculator.getLinkingQualityScore(year, 'excellent');
        document.getElementById('explanation').innerHTML = 
            calculator.createResultRow('1. Difficulté', difficultyResult.score, 6, difficultyResult.explanation) +
            calculator.createResultRow("2. Exigences Spécifiques", specificReqScore, 1.5) +
            calculator.createResultRow("3. Qualité d'enchaînement", linkingScore, maxLinkingScore) +
            calculator.createResultRow('4. Exécution', executionScore, 2) +
            calculator.createResultRow('5. Connaissances (CO CN)', coCnScore, 3) +
            calculator.createResultRow('6. Savoir-être (CO CM)', coCmScore, calculator.coCmMaxScores_calc[year]);

        document.getElementById('result-container').classList.remove('hidden');
    });

    document.getElementById('save-evaluation-btn')?.addEventListener('click', () => {
        if (!state.currentStudentId) return;
        const totalScore = parseFloat(document.getElementById('final-score').textContent);
        if (isNaN(totalScore) || totalScore === 0.00) {
            alert("Veuillez d'abord calculer la note avant de l'enregistrer.");
            return;
        }
        const year = document.getElementById('year').value;
        const pA = parseInt(document.getElementById('performed_a').value) || 0;
        const pB = parseInt(document.getElementById('performed_b').value) || 0;
        const pC = parseInt(document.getElementById('performed_c').value) || 0;
        const linkingQualityValue = document.getElementById('linking_quality').value;

        const evaluationData = {
            date: new Date().toISOString(),
            year: year,
            pA: pA,
            pB: pB,
            pC: pC,
            specificReqScore: parseFloat(document.getElementById('specific_req').value),
            linkingQualityValue: linkingQualityValue,
            executionScore: parseFloat(document.getElementById('execution').value),
            coCnScore: parseFloat(document.getElementById('co_cn').value),
            coCmScore: parseFloat(document.getElementById('co_cm').value),
            difficultyScore: calculator.calculateDifficulty(year, pA, pB, pC).score,
            linkingScore: calculator.getLinkingQualityScore(year, linkingQualityValue),
            totalScore: totalScore
        };

        storage.saveEvaluation(state.currentStudentId, evaluationData);
        alert('Évaluation enregistrée avec succès !');
        ui.setupEvaluationScreen(state.currentStudentId);
    });

    // --- Navigation Buttons ---
    document.getElementById('back-to-class-dashboard-btn')?.addEventListener('click', () => { state.currentClassName = null; ui.renderClassDashboard(); ui.showScreen('classDashboard'); });
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.renderClassDetailsScreen(state.currentClassName); ui.showScreen('classDetails'); } else { ui.renderClassDashboard(); ui.showScreen('classDashboard'); } });
    document.getElementById('back-to-dashboard-from-stats-btn')?.addEventListener('click', () => { ui.showScreen('classDashboard'); });
    document.getElementById('back-to-dashboard-from-class-stats-btn')?.addEventListener('click', () => { ui.renderClassDashboard(); ui.showScreen('classDashboard'); });
    document.getElementById('back-to-details-from-report-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.renderClassDetailsScreen(state.currentClassName); ui.showScreen('classDetails'); } else { ui.showScreen('classDashboard'); } });
    document.getElementById('back-to-details-from-quick-entry-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.renderClassDetailsScreen(state.currentClassName); ui.showScreen('classDetails'); } else { ui.showScreen('classDashboard'); } });
    document.getElementById('back-to-dashboard-from-settings-btn')?.addEventListener('click', () => { ui.showScreen('classDashboard'); });
    
    // --- Page-specific Buttons ---
    document.getElementById('stats-btn')?.addEventListener('click', () => { ui.renderStatisticsPage(); ui.showScreen('stats'); });
    document.getElementById('settings-btn')?.addEventListener('click', () => { ui.renderSettingsPage(); ui.showScreen('settings'); });
    document.getElementById('export-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.renderReportPreview(state.currentClassName); ui.showScreen('reportPreview'); } });
    document.getElementById('quick-entry-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.renderQuickEntryScreen(state.currentClassName); ui.showScreen('quickEntry'); } });
    
    // --- Settings Screen ---
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        const appData = storage.getAppData();
        appData.settings.teacherName = document.getElementById('settings-teacher-name').value;
        appData.settings.reportTitle = document.getElementById('settings-report-title').value;
        storage.saveAppData(appData);
        alert('Paramètres enregistrés avec succès !');
        ui.showScreen('classDashboard');
    });

    // --- Report Screen ---
    document.getElementById('report-export-csv-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.exportToCSV(state.currentClassName); } });
    document.getElementById('report-export-pdf-btn')?.addEventListener('click', () => { if (state.currentClassName) { ui.exportToPDF(state.currentClassName); } });
    
    // --- Quick Entry ---
    document.getElementById('quick-entry-table-body')?.addEventListener('input', (e) => {
        if (e.target.classList.contains('quick-input')) {
            ui.updateRowScore(e.target.closest('tr'));
        }
    });
    document.getElementById('save-quick-entry-btn')?.addEventListener('click', () => {
        const rows = document.querySelectorAll('#quick-entry-table-body tr');
        let hasSaved = false;
        rows.forEach(row => {
            const studentId = row.dataset.studentId;
            const classLevel = row.dataset.classLevel;
            const pA = parseInt(row.querySelector('[data-field="pA"]').value) || 0;
            const pB = parseInt(row.querySelector('[data-field="pB"]').value) || 0;
            const pC = parseInt(row.querySelector('[data-field="pC"]').value) || 0;
            const specificReqScore = parseFloat(row.querySelector('[data-field="specificReqScore"]').value);
            const linkingQualityValue = row.querySelector('[data-field="linkingQualityValue"]').value;
            const executionScore = parseFloat(row.querySelector('[data-field="executionScore"]').value);
            const coCnScore = parseFloat(row.querySelector('[data-field="coCnScore"]').value);
            const coCmScore = parseFloat(row.querySelector('[data-field="coCmScore"]').value);
            const difficultyResult = calculator.calculateDifficulty(classLevel, pA, pB, pC);
            const linkingScore = calculator.getLinkingQualityScore(classLevel, linkingQualityValue);
            const totalScore = parseFloat(row.querySelector('.final-score-cell span').textContent);
            if (isNaN(totalScore)) return;

            const evaluationData = { date: new Date().toISOString(), year: classLevel, pA, pB, pC, specificReqScore, linkingQualityValue, executionScore, coCnScore, coCmScore, difficultyScore: difficultyResult.score, linkingScore, totalScore };
            storage.saveEvaluation(studentId, evaluationData);
            hasSaved = true;
        });
        if(hasSaved){
            alert('Toutes les modifications ont été enregistrées avec succès !');
            ui.renderClassDetailsScreen(state.currentClassName);
            ui.showScreen('classDetails');
        }
    });

    // --- CSV Import ---
    document.getElementById('import-students-btn')?.addEventListener('click', () => document.getElementById('csv-import-input').click());
    document.getElementById('csv-import-input')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        Papa.parse(file, {
            complete: (results) => {
                const appData = storage.getAppData();
                let importedCount = 0;
                let newClassesCount = 0;
                const newClasses = new Set();
                results.data.forEach(row => {
                    if (row.length >= 2 && row[0] && row[1]) {
                        const studentName = row[0].trim();
                        const className = row[1].trim();
                        if (studentName === "" || className === "") return;
                        if (!appData.classes[className]) {
                            storage.addClass(className, '2AC');
                            if (!newClasses.has(className)) {
                                newClasses.add(className);
                                newClassesCount++;
                            }
                        }
                        const studentId = `student_${Date.now()}_${importedCount}`;
                        appData.students[studentId] = { id: studentId, name: studentName, class: className, evaluations: [] };
                        storage.saveAppData(appData); // Save after each student or batch save
                        importedCount++;
                    }
                });
                if (importedCount > 0) {
                    alert(`Importation terminée avec succès !\n\n- Élèves importés : ${importedCount}\n- Nouvelles classes créées : ${newClassesCount}`);
                    ui.renderClassDashboard();
                } else {
                    alert("Aucune donnée valide à importer n'a été trouvée dans le fichier.");
                }
            },
            error: (error) => alert("Erreur de lecture du fichier CSV.")
        });
        event.target.value = ''; // Reset input
    });
    
    // --- Google Drive ---
    document.getElementById('authorize-drive-btn')?.addEventListener('click', ui.handleAuthClick);
    document.getElementById('logout-drive-btn')?.addEventListener('click', ui.signOutDrive);
    document.getElementById('backup-to-drive-btn')?.addEventListener('click', ui.backupToDrive);
    document.getElementById('restore-from-drive-btn')?.addEventListener('click', ui.restoreFromDrive);
    
    // --- PWA Installation ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        const currentScreen = Object.keys(screens).find(key => screens[key].style.display !== 'none' && screens[key].style.display !== '');
        ui.updateInstallButtonVisibility(currentScreen);
    });
    document.getElementById('install-app-btn')?.addEventListener('click', async () => {
        if (state.deferredPrompt) {
            state.deferredPrompt.prompt();
            await state.deferredPrompt.userChoice;
            state.deferredPrompt = null;
            ui.updateInstallButtonVisibility(null);
        }
    });
    window.addEventListener('appinstalled', () => {
        state.deferredPrompt = null;
        ui.updateInstallButtonVisibility(null);
    });
}

/**
 * Initializes the entire application.
 */
function init() {
    // Set up the authentication state listener
    auth.initAuth(onAuthChange);

    // Set up all UI event listeners
    setupEventListeners();
    
    // استدعاء دالة تحميل سكربتات جوجل الجديدة
    ui.loadGoogleAPIs(); // <<< قم بتغيير هذا السطر
    
    console.log("Application Initialized");
}

// --- Start the application ---
// We wrap the init() call in a DOMContentLoaded listener to ensure the DOM is ready.
document.addEventListener('DOMContentLoaded', init);
