// Service Worker registration (optional, can be disabled for simplicity)
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

// Import modules
import { state } from './state.js';
import * as auth from './auth.js';
import * as storage from './storage.js';
import * as ui from './ui.js';
import * as calculator from './calculator.js';
import { 
    handleError, 
    showSuccess, 
    showMessage,
    showConfirmDialog,
    initGlobalErrorHandler,
    withErrorHandling,
    validateForm
} from './error-handler.js';
import { 
    validateEmail, 
    validateTextInput,
    validateStudentName,
    validateClassName
} from './security.js';

/**
 * Handle authentication state changes
 * @param {object|null} user - User object or null if not authenticated
 */
async function onAuthChange(user) {
    try {
        if (user) {
            state.currentUID = user.uid;
            // For simplified auth, we skip activation check
            ui.showScreen('classDashboard');
            ui.renderClassDashboard();
        } else {
            state.currentUID = null;
            ui.showScreen('auth');
        }
    } catch (error) {
        handleError(error, 'Authentication');
        ui.showScreen('auth');
    }
}
/**
 * Sets up all the event listeners for the entire application.
 * This is crucial for making the UI interactive.
 */
function setupEventListeners() {
    // --- Authentication Views ---
    document.getElementById('login-form')?.addEventListener('submit', withErrorHandling(async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#login-email').value.trim();
        const password = form.querySelector('#login-password').value;
        
        // Validate form inputs
        const isValid = validateForm(form, {
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                requiredMessage: 'Email est requis.',
                patternMessage: 'Format d\'email invalide.'
            },
            password: {
                required: true,
                minLength: 4,
                requiredMessage: 'Mot de passe est requis.',
                lengthMessage: 'Mot de passe trop court (minimum 4 caractères).'
            }
        });
        
        if (!isValid) return;
        
        try {
            document.getElementById('login-msg').textContent = 'Connexion en cours...';
            await auth.handleLogin(email, password);
            showSuccess('Connexion réussie!');
        } catch (error) {
            document.getElementById('login-msg').textContent = error.message;
            handleError(error, 'Login');
        }
    }, 'Login'));

    // Simplified registration (removed complex activation flow)
    document.getElementById('register-form')?.addEventListener('submit', withErrorHandling(async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#register-email').value.trim();
        const password = form.querySelector('#register-password').value;
        
        // Validate form inputs
        const isValid = validateForm(form, {
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                requiredMessage: 'Email est requis.',
                patternMessage: 'Format d\'email invalide.'
            },
            password: {
                required: true,
                minLength: 4,
                requiredMessage: 'Mot de passe est requis.',
                lengthMessage: 'Mot de passe trop court (minimum 4 caractères).'
            }
        });
        
        if (!isValid) return;
        
        try {
            document.getElementById('register-msg').textContent = 'Création du compte...';
            await auth.handleLogin(email, password); // Simplified: just login
            showSuccess('Compte créé avec succès!');
        } catch (error) {
            document.getElementById('register-msg').textContent = error.message;
            handleError(error, 'Registration');
        }
    }, 'Registration'));

    document.getElementById('reset-password-form')?.addEventListener('submit', withErrorHandling(async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#reset-email').value.trim();
        
        if (!validateEmail(email)) {
            showMessage('Format d\'email invalide.', 'warning');
            return;
        }
        
        try {
            document.getElementById('reset-msg').textContent = 'Envoi en cours...';
            const message = await auth.handlePasswordReset(email);
            document.getElementById('reset-msg').textContent = message;
            showSuccess('Instructions envoyées!');
        } catch (error) {
            document.getElementById('reset-msg').textContent = error.message;
            handleError(error, 'Password Reset');
        }
    }, 'Password Reset'));

    document.getElementById('logout-btn')?.addEventListener('click', withErrorHandling(async () => {
        try {
            await auth.handleLogout();
            showSuccess('Déconnexion réussie!');
        } catch (error) {
            handleError(error, 'Logout');
        }
    }, 'Logout'));

    // --- Auth View Toggles ---
    document.getElementById('show-register-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('register-view').style.display = 'block';
        document.getElementById('reset-password-view').style.display = 'none';
    });
    
    document.getElementById('show-login-link-from-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').style.display = 'block';
        document.getElementById('register-view').style.display = 'none';
        document.getElementById('reset-password-view').style.display = 'none';
    });
    
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('register-view').style.display = 'none';
        document.getElementById('reset-password-view').style.display = 'block';
    });
    
    document.getElementById('back-to-login-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').style.display = 'block';
        document.getElementById('register-view').style.display = 'none';
        document.getElementById('reset-password-view').style.display = 'none';
    });

    // --- Class Management ---
    document.getElementById('add-class-btn')?.addEventListener('click', () => {
        ui.handleAddClass();
    });

    // --- Student Management ---
    document.getElementById('add-student-btn')?.addEventListener('click', () => {
        ui.handleAddStudent();
    });

    // --- Navigation ---
    document.getElementById('back-to-class-dashboard-btn')?.addEventListener('click', () => {
        state.currentClassName = null;
        ui.renderClassDashboard();
        ui.showScreen('classDashboard');
    });

    // --- Calculator ---
    document.getElementById('calculate-btn')?.addEventListener('click', withErrorHandling(() => {
        const year = document.getElementById('year').value;
        const pA = parseInt(document.getElementById('pA').value) || 0;
        const pB = parseInt(document.getElementById('pB').value) || 0;
        const pC = parseInt(document.getElementById('pC').value) || 0;
        const specificReqScore = parseFloat(document.getElementById('specific_req').value) || 0;
        const linkingQualityValue = document.getElementById('linking_quality').value;
        const executionScore = parseFloat(document.getElementById('execution').value) || 0;
        const coCnScore = parseFloat(document.getElementById('co_cn').value) || 0;
        const coCmScore = parseFloat(document.getElementById('co_cm').value) || 0;

        // Validate inputs
        if (!year || !['1AC', '2AC', '3AC'].includes(year)) {
            showMessage('Niveau de classe invalide.', 'warning');
            return;
        }

        // Calculate scores
        const difficultyResult = calculator.calculateDifficulty(year, pA, pB, pC);
        const linkingScore = calculator.getLinkingQualityScore(year, linkingQualityValue);
        const maxLinkingScore = calculator.getLinkingQualityScore(year, 'excellent');
        const totalScore = difficultyResult.score + specificReqScore + linkingScore + executionScore + coCnScore + coCmScore;

        // Update UI
        document.getElementById('final-score').textContent = totalScore.toFixed(2);
        document.getElementById('difficulty-explanation').innerHTML = difficultyResult.explanation.join('<br>');
        document.getElementById('result-display').innerHTML = 
            calculator.createResultRow("1. Difficulté", difficultyResult.score, 6, difficultyResult.explanation.join('<br>')) +
            calculator.createResultRow("2. Exigences Spécifiques", specificReqScore, 1.5) +
            calculator.createResultRow("3. Qualité d'enchaînement", linkingScore, maxLinkingScore) +
            calculator.createResultRow('4. Exécution', executionScore, 2) +
            calculator.createResultRow('5. Connaissances (CO CN)', coCnScore, 3) +
            calculator.createResultRow('6. Savoir-être (CO CM)', coCmScore, calculator.coCmMaxScores_calc[year]);

        document.getElementById('result-container').classList.remove('hidden');
    }, 'Calculator'));

    // --- Evaluation Save ---
    document.getElementById('save-evaluation-btn')?.addEventListener('click', withErrorHandling(async () => {
        if (!state.currentStudentId) {
            showMessage('Aucun élève sélectionné.', 'warning');
            return;
        }
        
        const totalScore = parseFloat(document.getElementById('final-score').textContent);
        if (isNaN(totalScore) || totalScore === 0.00) {
            showMessage('Veuillez d\'abord calculer le score.', 'warning');
            return;
        }

        // Collect evaluation data
        const evaluationData = {
            date: new Date().toISOString(),
            year: document.getElementById('year').value,
            pA: parseInt(document.getElementById('pA').value) || 0,
            pB: parseInt(document.getElementById('pB').value) || 0,
            pC: parseInt(document.getElementById('pC').value) || 0,
            specificReqScore: parseFloat(document.getElementById('specific_req').value) || 0,
            linkingQualityValue: document.getElementById('linking_quality').value,
            executionScore: parseFloat(document.getElementById('execution').value) || 0,
            coCnScore: parseFloat(document.getElementById('co_cn').value) || 0,
            coCmScore: parseFloat(document.getElementById('co_cm').value) || 0,
            difficultyScore: calculator.calculateDifficulty(
                document.getElementById('year').value,
                parseInt(document.getElementById('pA').value) || 0,
                parseInt(document.getElementById('pB').value) || 0,
                parseInt(document.getElementById('pC').value) || 0
            ).score,
            linkingScore: calculator.getLinkingQualityScore(
                document.getElementById('year').value,
                document.getElementById('linking_quality').value
            ),
            totalScore: totalScore
        };

        const result = storage.saveEvaluation(state.currentStudentId, evaluationData);
        if (result.success) {
            showSuccess(result.message);
            ui.setupEvaluationScreen(state.currentStudentId);
        } else {
            showMessage(result.message, 'error');
        }
    }, 'Save Evaluation'));

    // --- CSV Import ---
    document.getElementById('import-students-btn')?.addEventListener('click', () => {
        document.getElementById('csv-import-input').click();
    });

    document.getElementById('csv-import-input')?.addEventListener('change', withErrorHandling(async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showMessage('Seuls les fichiers CSV sont acceptés.', 'warning');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Fichier trop volumineux (maximum 5MB).', 'warning');
            return;
        }

        try {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    let importedCount = 0;
                    let errorCount = 0;
                    const errors = [];

                    results.data.forEach((row, index) => {
                        const name = validateTextInput(row.name || row.Name || row.nom || row.Nom, 100);
                        const className = validateTextInput(row.class || row.Class || row.classe || row.Classe, 50);

                        if (!name || !className) {
                            errors.push(`Ligne ${index + 1}: Nom ou classe manquant`);
                            errorCount++;
                            return;
                        }

                        if (!validateStudentName(name)) {
                            errors.push(`Ligne ${index + 1}: Nom invalide "${name}"`);
                            errorCount++;
                            return;
                        }

                        if (!validateClassName(className)) {
                            errors.push(`Ligne ${index + 1}: Classe invalide "${className}"`);
                            errorCount++;
                            return;
                        }

                        const result = storage.addStudent(name, className);
                        if (result.success) {
                            importedCount++;
                        } else {
                            errors.push(`Ligne ${index + 1}: ${result.message}`);
                            errorCount++;
                        }
                    });

                    if (importedCount > 0) {
                        showSuccess(`${importedCount} élève(s) importé(s) avec succès!`);
                        ui.renderClassDashboard();
                    }

                    if (errorCount > 0) {
                        const errorMessage = `${errorCount} erreur(s) détectée(s):\n${errors.slice(0, 5).join('\n')}`;
                        showMessage(errorMessage, 'warning');
                    }
                },
                error: (error) => {
                    handleError(error, 'CSV Import');
                }
            });
        } catch (error) {
            handleError(error, 'CSV Import');
        }

        event.target.value = ''; // Reset input
    }, 'CSV Import'));

    // --- Export Functions ---
    document.getElementById('export-csv-btn')?.addEventListener('click', withErrorHandling(() => {
        if (state.currentClassName) {
            ui.exportToCSV(state.currentClassName);
        } else {
            showMessage('Aucune classe sélectionnée.', 'warning');
        }
    }, 'CSV Export'));

    document.getElementById('export-pdf-btn')?.addEventListener('click', withErrorHandling(() => {
        if (state.currentClassName) {
            ui.exportToPDF(state.currentClassName);
        } else {
            showMessage('Aucune classe sélectionnée.', 'warning');
        }
    }, 'PDF Export'));

    // --- Quick Entry ---
    document.getElementById('quick-entry-table-body')?.addEventListener('input', (e) => {
        if (e.target.classList.contains('quick-input')) {
            ui.updateRowScore(e.target.closest('tr'));
        }
    });

    document.getElementById('save-quick-entry-btn')?.addEventListener('click', withErrorHandling(async () => {
        const rows = document.querySelectorAll('#quick-entry-table-body tr');
        let savedCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            const studentId = row.dataset.studentId;
            const classLevel = row.dataset.classLevel;
            
            if (!studentId || !classLevel) continue;

            // Collect data from row
            const pA = parseInt(row.querySelector('[data-field="pA"]').value) || 0;
            const pB = parseInt(row.querySelector('[data-field="pB"]').value) || 0;
            const pC = parseInt(row.querySelector('[data-field="pC"]').value) || 0;
            const specificReqScore = parseFloat(row.querySelector('[data-field="specificReqScore"]').value) || 0;
            const linkingQualityValue = row.querySelector('[data-field="linkingQualityValue"]').value;
            const executionScore = parseFloat(row.querySelector('[data-field="executionScore"]').value) || 0;
            const coCnScore = parseFloat(row.querySelector('[data-field="coCnScore"]').value) || 0;
            const coCmScore = parseFloat(row.querySelector('[data-field="coCmScore"]').value) || 0;

            // Calculate scores
            const difficultyResult = calculator.calculateDifficulty(classLevel, pA, pB, pC);
            const linkingScore = calculator.getLinkingQualityScore(classLevel, linkingQualityValue);
            const totalScore = difficultyResult.score + specificReqScore + linkingScore + executionScore + coCnScore + coCmScore;

            // Save evaluation
            const evaluationData = {
                date: new Date().toISOString(),
                year: classLevel,
                pA, pB, pC,
                specificReqScore,
                linkingQualityValue,
                executionScore,
                coCnScore,
                coCmScore,
                difficultyScore: difficultyResult.score,
                linkingScore,
                totalScore
            };

            const result = storage.saveEvaluation(studentId, evaluationData);
            if (result.success) {
                savedCount++;
            } else {
                errorCount++;
            }
        }

        if (savedCount > 0) {
            showSuccess(`${savedCount} évaluation(s) sauvegardée(s) avec succès!`);
            ui.renderClassDetailsScreen(state.currentClassName);
            ui.showScreen('classDetails');
        }

        if (errorCount > 0) {
            showMessage(`${errorCount} erreur(s) lors de la sauvegarde.`, 'warning');
        }
    }, 'Quick Entry Save'));
/**
 * Initialize the application
 */
function init() {
    // Initialize global error handling
    initGlobalErrorHandler();
    
    // Initialize authentication
    auth.initAuth(onAuthChange);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize calculator UI
    ui.initializeCalculatorUI();
    
    // Optional: Remove Google APIs loading for simplicity
    // ui.loadGoogleAPIs();
    
    console.log("CalGym Application Initialized - Secure Version");
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
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
        // THIS IS THE CORRECTED LINE
        const currentScreen = ui.getCurrentScreenName();
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
 * Initialize the application
 */
function init() {
    // Initialize global error handling
    initGlobalErrorHandler();
    
    // Initialize authentication
    auth.initAuth(onAuthChange);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize calculator UI
    ui.initializeCalculatorUI();
    
    // Optional: Remove Google APIs loading for simplicity
    // ui.loadGoogleAPIs();
    
    console.log("CalGym Application Initialized - Secure Version");
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
