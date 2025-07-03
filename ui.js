// ui.js
// This module handles all UI-related logic, DOM manipulation, and rendering.

import { state } from './state.js';
import * as storage from './storage.js';
import * as calculator from './calculator.js';
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, DRIVE_SCOPE } from './config.js';

// --- DOM Elements ---
const screens = {
    auth: document.getElementById('auth-screen'),
    activation: document.getElementById('activation-screen'),
    classDashboard: document.getElementById('class-dashboard-screen'),
    classDetails: document.getElementById('class-details-screen'),
    evaluation: document.getElementById('evaluation-screen'),
    reportPreview: document.getElementById('report-preview-screen'),
    stats: document.getElementById('stats-screen'),
    settings: document.getElementById('settings-screen'),
    quickEntry: document.getElementById('quick-entry-screen'),
    classStats: document.getElementById('class-stats-screen')
};

const modal = document.getElementById('app-modal'),
      modalTitle = document.getElementById('modal-title'),
      modalBody = document.getElementById('modal-body');

let currentModalSaveAction = () => {};
let tokenClient; // For Google Drive

// --- Modal Controls ---
export function openModal(title, bodyHtml, onSave) {
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    currentModalSaveAction = onSave;
    modal.classList.remove('modal-hidden');
}

export function closeModal() {
    if (modal) {
        modal.classList.add('modal-hidden');
        modalBody.innerHTML = '';
        currentModalSaveAction = () => {};
    }
}

export function getModalSaveAction() {
    return currentModalSaveAction;
}

// --- Screen Management ---
export function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.style.display = 'none';
    });
    const screenToShow = screens[screenName];
    if (screenToShow) {
        screenToShow.style.display = 'block';
        if (['auth', 'activation'].includes(screenName)) {
            screenToShow.style.display = 'flex';
        }
    }
    updateInstallButtonVisibility(screenName);
}

// THIS IS THE NEW HELPER FUNCTION
export function getCurrentScreenName() {
    return Object.keys(screens).find(key => screens[key] && screens[key].style.display !== 'none' && screens[key].style.display !== '');
}

// --- Rendering Functions ---

export function renderClassDashboard() {
    const classListEl = document.getElementById('class-list');
    if (!classListEl) return;
    const { classes, students } = storage.getAppData();
    const studentCounts = {};
    Object.values(students).forEach(s => {
        studentCounts[s.class] = (studentCounts[s.class] || 0) + 1;
    });
    classListEl.innerHTML = '';
    if (Object.keys(classes).length === 0) {
        classListEl.innerHTML = `<p class="text-gray-500 text-center col-span-full py-10">Aucune classe n'a encore été ajoutée.</p>`;
    } else {
        for (const className in classes) {
            const classData = classes[className];
            const count = studentCounts[className] || 0;
            const card = document.createElement('div');
            card.className = 'class-card';
            card.setAttribute('data-class-name', className);
            card.innerHTML = `<div><span class="level-badge">${classData.level}</span><h3 class="class-card-title">${classData.name}</h3><p class="class-card-info"><i class="fas fa-users text-gray-400"></i><span>${count} élève(s)</span></p></div><div class="card-actions"><button class="action-btn" data-action="stats" title="Statistiques de la classe"><i class="fas fa-chart-line"></i></button><button class="action-btn edit-btn" data-action="edit" title="Modifier la classe"><i class="fas fa-pen"></i></button><button class="action-btn delete-btn" data-action="delete" title="Supprimer la classe"><i class="fas fa-trash"></i></button></div>`;
            classListEl.appendChild(card);
        }
    }
}
export function renderClassDetailsScreen(className) {
    state.currentClassName = className;
    document.getElementById('class-details-title').textContent = className;
    const studentListEl = document.getElementById('class-student-list');
    if (!studentListEl) return;
    const { students } = storage.getAppData();
    const studentsInClass = Object.values(students).filter(s => s.class === className);
    studentListEl.innerHTML = '';
    if (studentsInClass.length === 0) {
        studentListEl.innerHTML = `<p class="text-gray-500 text-center py-10">Aucun élève dans cette classe.</p>`;
    } else {
        studentsInClass.forEach(student => {
            const lastEval = student.evaluations.length > 0 ? student.evaluations[student.evaluations.length - 1] : null;
            const scoreDisplay = lastEval ? `${lastEval.totalScore.toFixed(2)} / 20` : 'Aucune note';
            const item = document.createElement('div');
            item.className = 'student-item';
            item.setAttribute('data-student-id', student.id);
            item.innerHTML = `<span class="student-name">${student.name}</span><div class="item-actions"><span class="student-score ${lastEval ? 'has-score' : ''}">${scoreDisplay}</span><button class="action-btn edit-btn" data-action="edit" title="Modifier l'élève"><i class="fas fa-pen"></i></button><button class="action-btn delete-btn" data-action="delete" title="Supprimer l'élève"><i class="fas fa-trash"></i></button></div>`;
            studentListEl.appendChild(item);
        });
    }
}

export function renderReportPreview(className) {
    if (!className) return;
    const { students, classes, settings } = storage.getAppData();
    const classData = classes[className];
    if (!classData) return;
    document.getElementById('report-header-prof').textContent = settings.teacherName;
    document.getElementById('report-main-title').textContent = settings.reportTitle;
    document.getElementById('report-header-class').textContent = `Classe: ${classData.name}`;
    const maxCoCm = calculator.coCmMaxScores_calc[classData.level] || 4;
    document.getElementById('report-header-cocm').textContent = `CO CM ${maxCoCm}pts`;
    const tableBodyEl = document.getElementById('report-table-body');
    if (!tableBodyEl) { return; }
    const studentsInClass = Object.values(students).filter(s => s.class === className);
    tableBodyEl.innerHTML = '';
    if (studentsInClass.length === 0) {
        tableBodyEl.innerHTML = `<tr><td colspan="9" class="text-center p-4">Aucun élève dans cette classe.</td></tr>`;
        return;
    }
    studentsInClass.forEach((student) => {
        const lastEval = student.evaluations.length > 0 ? student.evaluations[student.evaluations.length - 1] : null;
        const row = document.createElement('tr');
        row.className = 'bg-white border-b border-black';
        row.innerHTML = `<td class="border border-black p-2 font-medium">${student.name}</td><td class="border border-black p-2 h-12"></td><td class="border border-black p-2">${lastEval ? lastEval.difficultyScore.toFixed(2) : ''}</td><td class="border border-black p-2">${lastEval ? lastEval.executionScore.toFixed(2) : ''}</td><td class="border border-black p-2">${lastEval ? lastEval.specificReqScore.toFixed(2) : ''}</td><td class="border border-black p-2">${lastEval ? lastEval.linkingScore.toFixed(2) : ''}</td><td class="border border-black p-2">${lastEval ? lastEval.coCnScore.toFixed(2) : ''}</td><td class="border border-black p-2">${lastEval ? lastEval.coCmScore.toFixed(2) : ''}</td><td class="border border-black p-2 font-bold">${lastEval ? lastEval.totalScore.toFixed(2) : ''}</td>`;
        tableBodyEl.appendChild(row);
    });
}

export function setupEvaluationScreen(studentId) {
    const { students, classes } = storage.getAppData();
    const student = students[studentId];
    if (!student) {
        showScreen('classDashboard');
        return;
    }
    state.currentStudentId = studentId;
    const studentClassInfo = classes[student.class];
    if (studentClassInfo) {
        document.getElementById('year').value = studentClassInfo.level;
        document.getElementById('year').dispatchEvent(new Event('change'));
    }
    document.getElementById('evaluation-student-name').textContent = student.name;
    const historyEl = document.getElementById('evaluation-history');
    historyEl.innerHTML = (student.evaluations || []).map((ev, index) =>
        `<div class="history-item"><div class="flex items-center gap-4"><span class="font-bold text-gray-700">Éval. ${index + 1}:</span><span class="font-bold text-lg text-blue-700">${ev.totalScore.toFixed(2)} / 20</span><span class="text-xs text-gray-500">(${new Date(ev.date).toLocaleDateString()})</span></div><button class="action-btn delete-btn" data-action="delete-eval" data-eval-index="${index}" title="Supprimer l'évaluation"><i class="fas fa-trash"></i></button></div>`
    ).join('') || '<p class="text-sm text-gray-500 text-center">Aucune évaluation précédente.</p>';
    initializeCalculatorUI();
}

export function renderSettingsPage() {
    const { settings } = storage.getAppData();
    document.getElementById('settings-teacher-name').value = settings.teacherName || '';
    document.getElementById('settings-report-title').value = settings.reportTitle || '';
}

export function renderStatisticsPage() {
    // Destroy old charts to prevent conflicts
    if (state.charts.overallScoreDistChart) state.charts.overallScoreDistChart.destroy();
    if (state.charts.studentsByClassChart) state.charts.studentsByClassChart.destroy();
    if (state.charts.overallComponentMasteryChart) state.charts.overallComponentMasteryChart.destroy();

    const { classes, students } = storage.getAppData();
    const allStudents = Object.values(students);
    const evaluatedStudents = allStudents.filter(s => s.evaluations && s.evaluations.length > 0);
    const allEvaluations = evaluatedStudents.flatMap(s => s.evaluations.map(e => ({...e, studentClass: s.class})));

    // --- KPIs ---
    document.getElementById('stats-total-classes').textContent = Object.keys(classes).length;
    document.getElementById('stats-total-students').textContent = allStudents.length;
    document.getElementById('stats-total-evaluations').textContent = allEvaluations.length;
    const overallAverage = evaluatedStudents.length > 0 ? (evaluatedStudents.reduce((sum, s) => sum + s.evaluations[s.evaluations.length - 1].totalScore, 0) / evaluatedStudents.length).toFixed(2) : "0.00";
    document.getElementById('stats-overall-average').textContent = overallAverage;
    
    // --- Chart 1: Overall Score Distribution ---
    const scoreDistCtx = document.getElementById('overall-score-distribution-chart').getContext('2d');
    const scoreRanges = { '<10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-20': 0 };
    evaluatedStudents.forEach(s => {
        const score = s.evaluations[s.evaluations.length - 1].totalScore;
        if (score < 10) scoreRanges['<10']++;
        else if (score < 12) scoreRanges['10-12']++;
        else if (score < 14) scoreRanges['12-14']++;
        else if (score < 16) scoreRanges['14-16']++;
        else if (score < 18) scoreRanges['16-18']++;
        else scoreRanges['18-20']++;
    });
    state.charts.overallScoreDistChart = new Chart(scoreDistCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(scoreRanges),
            datasets: [{
                label: 'Nombre d\'élèves',
                data: Object.values(scoreRanges),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
    
    // --- Chart 2: Students by Class (Doughnut) ---
    const studentsByClassCtx = document.getElementById('students-by-class-chart').getContext('2d');
    const classCounts = {};
    allStudents.forEach(s => {
        classCounts[s.class] = (classCounts[s.class] || 0) + 1;
    });
    const classLabels = Object.keys(classCounts);
    const classData = Object.values(classCounts);
    state.charts.studentsByClassChart = new Chart(studentsByClassCtx, {
        type: 'doughnut',
        data: {
            labels: classLabels,
            datasets: [{
                label: 'Élèves',
                data: classData,
                backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#6366f1'],
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    // --- Chart 3: Overall Component Mastery ---
    const componentMasteryCtx = document.getElementById('overall-component-mastery-chart').getContext('2d');
    const componentInfo = {
        difficultyScore:  { label: 'Difficulté',      max: 6 },
        specificReqScore: { label: 'Exig. Spéc.',   max: 1.5 },
        linkingScore:     { label: 'Qualité',         max: null },
        executionScore:   { label: 'Exécution',       max: 2 },
        coCnScore:        { label: 'CO CN',           max: 3 },
        coCmScore:        { label: 'CO CM',           max: null }
    };
    const componentKeys = Object.keys(componentInfo);
    const componentMasteryData = {};
    componentKeys.forEach(key => componentMasteryData[key] = []);

    allEvaluations.forEach(e => {
        const studentClass = classes[e.studentClass];
        if (!studentClass) return;
        const classLevel = studentClass.level;

        componentKeys.forEach(key => {
            let maxPossible = componentInfo[key].max;
            if (key === 'linkingScore') maxPossible = calculator.getLinkingQualityScore(classLevel, 'excellent');
            else if (key === 'coCmScore') maxPossible = calculator.coCmMaxScores_calc[classLevel];
            
            const actualScore = e[key] || 0;
            const percentage = (maxPossible > 0) ? (actualScore / maxPossible * 100) : 0;
            componentMasteryData[key].push(percentage);
        });
    });

    const avgMastery = componentKeys.map(key => {
        const percentages = componentMasteryData[key];
        return percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    });
    
    state.charts.overallComponentMasteryChart = new Chart(componentMasteryCtx, {
        type: 'bar',
        data: {
            labels: componentKeys.map(key => componentInfo[key].label),
            datasets: [{
                label: 'Taux de Maîtrise Moyen',
                data: avgMastery,
                backgroundColor: 'rgba(22, 163, 74, 0.7)',
                borderColor: 'rgba(21, 128, 61, 1)',
                borderWidth: 1
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal Bar
            scales: {
                x: { 
                    beginAtZero: true, 
                    max: 100,
                    title: { display: true, text: '% de Maîtrise' } 
                },
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: '#1f2937',
                    font: { weight: 'bold' },
                    formatter: value => value.toFixed(0) + '%'
                }
            }
        }
    });

    // --- Table: All Classes Ranking ---
    const allRankingBody = document.getElementById('all-classes-ranking-table-body');
    allRankingBody.innerHTML = '';
    const classAverages = {};
    evaluatedStudents.forEach(student => {
        const lastEval = student.evaluations[student.evaluations.length - 1];
        if (lastEval) {
            if (!classAverages[student.class]) {
                classAverages[student.class] = { sum: 0, count: 0 };
            }
            classAverages[student.class].sum += lastEval.totalScore;
            classAverages[student.class].count++;
        }
    });
    
    const sortedClasses = Object.keys(classAverages)
        .map(name => ({
            name: name,
            average: classAverages[name].sum / classAverages[name].count
        }))
        .sort((a, b) => b.average - a.average);
        
    sortedClasses.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-2 font-medium">${c.name}</td><td class="p-2 text-right font-bold text-blue-600">${c.average.toFixed(2)}</td>`;
        allRankingBody.appendChild(row);
    });
}

export function renderClassStatsPage(className) {
    state.currentClassName = className;
    document.getElementById('class-stats-title').textContent = className;

    const { students, classes } = storage.getAppData();
    const studentsInClass = Object.values(students).filter(s => s.class === className);
    const evaluatedStudents = studentsInClass.filter(s => s.evaluations && s.evaluations.length > 0);

    if (state.charts.classScoreDistChart) state.charts.classScoreDistChart.destroy();
    if (state.charts.componentAnalysisChart) state.charts.componentAnalysisChart.destroy();

    const rankingBody = document.getElementById('student-ranking-table-body');
    if (rankingBody) rankingBody.innerHTML = '';
    
    const displayNoDataMessage = () => {
        document.getElementById('class-stats-average').textContent = "N/A";
        document.getElementById('class-stats-median').textContent = "N/A";
        document.getElementById('class-stats-stddev').textContent = "N/A";
        document.getElementById('class-stats-highest').textContent = "N/A";
        document.getElementById('class-stats-lowest').textContent = "N/A";
        
        ['score-distribution-chart', 'component-analysis-chart'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.font = "16px " + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = "center";
                ctx.fillStyle = "#6b7280";
                ctx.fillText("Aucune donnée d'évaluation pour cette classe.", ctx.canvas.width / 2, 50);
            }
        });
        if(rankingBody) rankingBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-gray-500">Aucun élève évalué.</td></tr>';
    };

    if (evaluatedStudents.length === 0) {
        displayNoDataMessage();
        return;
    }

    const latestEvals = evaluatedStudents.map(s => ({...s.evaluations[s.evaluations.length - 1], studentName: s.name }));
    const latestScores = latestEvals.map(ev => ev.totalScore).sort((a, b) => a - b);
    
    const sum = latestScores.reduce((a, b) => a + b, 0);
    const average = sum / latestScores.length;
    const min = latestScores[0];
    const max = latestScores[latestScores.length - 1];
    const mid = Math.floor(latestScores.length / 2);
    const median = latestScores.length % 2 !== 0 ? latestScores[mid] : (latestScores[mid - 1] + latestScores[mid]) / 2;
    const stdDev = Math.sqrt(latestScores.map(x => Math.pow(x - average, 2)).reduce((a, b) => a + b, 0) / latestScores.length);
    
    document.getElementById('class-stats-average').textContent = average.toFixed(2);
    document.getElementById('class-stats-median').textContent = median.toFixed(2);
    document.getElementById('class-stats-stddev').textContent = stdDev.toFixed(2);
    document.getElementById('class-stats-highest').textContent = max.toFixed(2);
    document.getElementById('class-stats-lowest').textContent = min.toFixed(2);

    latestEvals.sort((a, b) => b.totalScore - a.totalScore).forEach((ev, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-2 font-bold">${index + 1}</td><td class="p-2">${ev.studentName}</td><td class="p-2 text-right font-semibold">${ev.totalScore.toFixed(2)}</td>`;
        if (rankingBody) rankingBody.appendChild(row);
    });

    const scoreBins = { '<10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-20': 0 };
    latestScores.forEach(score => {
        if (score < 10) scoreBins['<10']++;
        else if (score < 12) scoreBins['10-12']++;
        else if (score < 14) scoreBins['12-14']++;
        else if (score < 16) scoreBins['14-16']++;
        else if (score < 18) scoreBins['16-18']++;
        else scoreBins['18-20']++;
    });
    const ctxDist = document.getElementById('score-distribution-chart').getContext('2d');
    state.charts.classScoreDistChart = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: Object.keys(scoreBins),
            datasets: [{
                label: 'Nombre d\'élèves',
                data: Object.values(scoreBins),
                backgroundColor: 'rgba(74, 222, 128, 0.7)',
                borderColor: 'rgba(22, 163, 74, 1)',
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });

    const classLevel = classes[className]?.level || '2AC';
    const componentInfo = {
        difficultyScore:  { label: 'Difficulté',      max: 6 },
        specificReqScore: { label: 'Exig. Spéc.',   max: 1.5 },
        linkingScore:     { label: 'Qualité',         max: calculator.getLinkingQualityScore(classLevel, 'excellent') },
        executionScore:   { label: 'Exécution',       max: 2 },
        coCnScore:        { label: 'CO CN',           max: 3 },
        coCmScore:        { label: 'CO CM',           max: calculator.coCmMaxScores_calc[classLevel] }
    };

    const componentKeys = Object.keys(componentInfo);
    const componentLabels = componentKeys.map(key => componentInfo[key].label);
    const componentStats = {};

    componentKeys.forEach(key => {
        const scores = latestEvals.map(ev => ev[key] || 0);
        const maxScore = Math.max(...scores);
        componentStats[key] = {
            scores: scores,
            avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
            max: maxScore,
            maxCount: scores.filter(s => s === maxScore).length,
            maxPossible: componentInfo[key].max
        };
    });
    
    const maxPossibleData = componentKeys.map(key => componentStats[key].maxPossible);
    const maxAchievedData = componentKeys.map(key => componentStats[key].max);
    const avgScoresData = componentKeys.map(key => componentStats[key].avg);
    
    const ctxAnalysis = document.getElementById('component-analysis-chart').getContext('2d');
    state.charts.componentAnalysisChart = new Chart(ctxAnalysis, {
        type: 'bar',
        data: {
            labels: componentLabels,
            datasets: [
                {
                    label: 'Note Maximale Possible',
                    data: maxPossibleData,
                    backgroundColor: 'rgba(229, 231, 235, 1)',
                    borderColor: 'rgba(156, 163, 175, 1)',
                    borderWidth: 1,
                    order: 3,
                    datalabels: { display: false }
                },
                {
                    label: 'Note Max. Atteinte',
                    data: maxAchievedData,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgba(22, 163, 74, 1)',
                    borderWidth: 1,
                    order: 2,
                    datalabels: {
                        labels: {
                            percentage: {
                                anchor: 'end',
                                align: 'top',
                                color: '#1f2937',
                                font: { weight: 'bold' },
                                formatter: (value, context) => (value / maxPossibleData[context.dataIndex] * 100).toFixed(0) + '%'
                            },
                            count: {
                                anchor: 'center',
                                align: 'center',
                                color: 'white',
                                font: { weight: 'bold' },
                                formatter: (value, context) => `(${componentStats[componentKeys[context.dataIndex]].maxCount})`
                            }
                        }
                    }
                },
                {
                    label: 'Moyenne de la Classe',
                    data: avgScoresData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    order: 1,
                    datalabels: {
                        labels: {
                            percentage: {
                                anchor: 'end',
                                align: 'top',
                                color: '#1f2937',
                                font: { weight: 'bold' },
                                formatter: (value, context) => (value / maxPossibleData[context.dataIndex] * 100).toFixed(0) + '%'
                            },
                            count: {
                                anchor: 'center',
                                align: 'center',
                                color: 'white',
                                font: { weight: 'bold' },
                                formatter: (value, context) => `(${evaluatedStudents.length})`
                            }
                        }
                    }
                }
            ]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 25 } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Points' } },
                x: { stacked: false, categoryPercentage: 0.75, barPercentage: 0.8 }
            },
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) return `${label}: ${value.toFixed(2)}`;
                            const maxPossible = maxPossibleData[context.dataIndex];
                            const percentage = (value / maxPossible * 100).toFixed(0);
                            let countText;
                            if (context.datasetIndex === 1) {
                                const count = componentStats[componentKeys[context.dataIndex]].maxCount;
                                countText = `(${count} élève(s))`;
                            } else {
                                countText = `(${evaluatedStudents.length} élève(s))`;
                            }
                            return `${label}: ${value.toFixed(2)} (${percentage}%) ${countText}`;
                        }
                    }
                }
            }
        }
    });
}

export function renderQuickEntryScreen(className) {
    document.getElementById('quick-entry-class-name').textContent = className;
    const { students, classes } = storage.getAppData();
    const classData = classes[className];
    if (!classData) return;
    const classLevel = classData.level;
    const studentsInClass = Object.values(students).filter(s => s.class === className);
    const tableBody = document.getElementById('quick-entry-table-body');
    tableBody.innerHTML = '';
    const maxCoCm = calculator.coCmMaxScores_calc[classLevel] || 4;
    studentsInClass.forEach(student => {
        const lastEval = student.evaluations.length > 0 ? student.evaluations[student.evaluations.length - 1] : null;
        const row = document.createElement('tr');
        row.setAttribute('data-student-id', student.id);
        row.setAttribute('data-class-level', classLevel);
        row.innerHTML = `
            <td class="student-name-cell border">${student.name}</td>
            <td class="border"><input type="number" class="quick-input" data-field="pA" min="0" value="${lastEval?.pA ?? 0}"></td>
            <td class="border"><input type="number" class="quick-input" data-field="pB" min="0" value="${lastEval?.pB ?? 0}"></td>
            <td class="border"><input type="number" class="quick-input" data-field="pC" min="0" value="${lastEval?.pC ?? 0}"></td>
            <td class="border"><select class="quick-input" data-field="specificReqScore">
                <option value="1.5" ${lastEval?.specificReqScore === 1.5 ? 'selected' : ''}>1.5</option>
                <option value="1.0" ${lastEval?.specificReqScore === 1.0 ? 'selected' : ''}>1.0</option>
                <option value="0.5" ${lastEval?.specificReqScore === 0.5 ? 'selected' : ''}>0.5</option>
                <option value="0" ${lastEval?.specificReqScore === 0 || lastEval === null ? 'selected' : ''}>0</option>
            </select></td>
            <td class="border"><select class="quick-input" data-field="linkingQualityValue">
                <option value="excellent" ${lastEval?.linkingQualityValue === 'excellent' ? 'selected' : ''}>Exc</option>
                <option value="good" ${lastEval?.linkingQualityValue === 'good' || lastEval === null ? 'selected' : ''}>Bon</option>
                <option value="average" ${lastEval?.linkingQualityValue === 'average' ? 'selected' : ''}>Moy</option>
                <option value="weak" ${lastEval?.linkingQualityValue === 'weak' ? 'selected' : ''}>Fai</option>
            </select></td>
            <td class="border"><select class="quick-input" data-field="executionScore">
                <option value="2.0" ${lastEval?.executionScore === 2.0 ? 'selected' : ''}>2.0</option>
                <option value="1.5" ${lastEval?.executionScore === 1.5 || lastEval === null ? 'selected' : ''}>1.5</option>
                <option value="1.0" ${lastEval?.executionScore === 1.0 ? 'selected' : ''}>1.0</option>
                <option value="0.5" ${lastEval?.executionScore === 0.5 ? 'selected' : ''}>0.5</option>
                <option value="0" ${lastEval?.executionScore === 0 ? 'selected' : ''}>0</option>
            </select></td>
            <td class="border"><input type="number" class="quick-input" data-field="coCnScore" min="0" max="3" step="0.25" value="${lastEval?.coCnScore ?? 0}"></td>
            <td class="border"><input type="number" class="quick-input" data-field="coCmScore" min="0" max="${maxCoCm}" step="0.25" value="${lastEval?.coCmScore ?? 0}"></td>
            <td class="final-score-cell border"><span id="score-for-${student.id}">${lastEval?.totalScore.toFixed(2) ?? '0.00'}</span></td>
        `;
        tableBody.appendChild(row);
        updateRowScore(row);
    });
}

// --- Handler Functions for UI actions (Modals, etc.) ---

export function handleAddClass() {
    const bodyHtml = `<div class="input-group"><label for="modal-class-name">Nom de la classe</label><input type="text" id="modal-class-name" placeholder="Ex: 2AC G3"></div><div class="input-group"><label for="modal-class-level">Niveau scolaire</label><select id="modal-class-level"><option value="1AC">1ère Année Collège</option><option value="2AC" selected>2ème Année Collège</option><option value="3AC">3ème Année Collège</option></select></div>`;
    openModal('Ajouter une nouvelle classe', bodyHtml, () => {
        const name = document.getElementById('modal-class-name').value.trim();
        const level = document.getElementById('modal-class-level').value;
        if (!name) { alert('Le nom de la classe ne peut pas être vide.'); return false; }
        if (storage.addClass(name, level)) {
            renderClassDashboard();
            return true;
        }
        return false;
    });
}

export function handleEditClass(className) {
    const { classes } = storage.getAppData();
    const classData = classes[className];
    const bodyHtml = `<div class="input-group"><label for="modal-class-name">Nom de la classe</label><input type="text" id="modal-class-name" value="${classData.name}"></div><div class="input-group"><label for="modal-class-level">Niveau scolaire</label><select id="modal-class-level"><option value="1AC" ${classData.level === '1AC' ? 'selected' : ''}>1ère Année Collège</option><option value="2AC" ${classData.level === '2AC' ? 'selected' : ''}>2ème Année Collège</option><option value="3AC" ${classData.level === '3AC' ? 'selected' : ''}>3ème Année Collège</option></select></div>`;
    openModal('Modifier la classe', bodyHtml, () => {
        const newName = document.getElementById('modal-class-name').value.trim();
        const newLevel = document.getElementById('modal-class-level').value;
        if (!newName) { alert('Le nom de la classe ne peut pas être vide.'); return false; }
        if(storage.editClass(className, newName, newLevel)) {
            renderClassDashboard();
            if (state.currentClassName === className) { // If editing the currently viewed class
                renderClassDetailsScreen(newName);
            }
            return true;
        }
        return false;
    });
}

export function handleAddStudent(className = '') {
    const { classes } = storage.getAppData();
    const classOptions = Object.keys(classes).map(name => `<option value="${name}" ${name === className ? 'selected' : ''}>${name}</option>`).join('');
    const bodyHtml = `<div class="input-group"><label for="modal-student-name">Nom complet de l'élève</label><input type="text" id="modal-student-name" placeholder="Entrez le nom de l'élève"></div><div class="input-group"><label for="modal-student-class">Classe</label><select id="modal-student-class">${classOptions}</select></div>`;
    openModal("Ajouter un nouvel élève", bodyHtml, () => {
        const name = document.getElementById('modal-student-name').value.trim();
        const selectedClass = document.getElementById('modal-student-class').value;
        if (!name) { alert("Le nom de l'élève ne peut pas être vide."); return false; }
        if (!selectedClass) { alert("Veuillez sélectionner une classe."); return false; }
        if (storage.addStudent(name, selectedClass)) {
            if (state.currentClassName) {
                renderClassDetailsScreen(state.currentClassName);
            } else {
                renderClassDashboard();
            }
            return true;
        }
        return false;
    });
}

export function handleEditStudent(studentId) {
    const { students, classes } = storage.getAppData();
    const student = students[studentId];
    const classOptions = Object.keys(classes).map(name => `<option value="${name}" ${name === student.class ? 'selected' : ''}>${name}</option>`).join('');
    const bodyHtml = `<div class="input-group"><label for="modal-student-name">Nom de l'élève</label><input type="text" id="modal-student-name" value="${student.name}"></div><div class="input-group"><label for="modal-student-class">Classe</label><select id="modal-student-class">${classOptions}</select></div>`;
    openModal("Modifier l'élève", bodyHtml, () => {
        const newName = document.getElementById('modal-student-name').value.trim();
        const newClass = document.getElementById('modal-student-class').value;
        if (!newName) { alert("Le nom de l'élève ne peut pas être vide."); return false; }
        if (storage.editStudent(studentId, newName, newClass)) {
            if (state.currentClassName) renderClassDetailsScreen(state.currentClassName);
            return true;
        }
        return false;
    });
}

// --- Calculator UI ---
export function initializeCalculatorUI() {
    const yearSelect = document.getElementById('year');
    if (!yearSelect) return;

    yearSelect.addEventListener('change', (e) => {
        const year = e.target.value;
        const linkingSelect = document.getElementById('linking_quality');
        const coCmInput = document.getElementById('co_cm');
        const coCmLabel = document.getElementById('co_cm_label');
        const requirementsEl = document.getElementById('difficulty-requirements');
        const difficultyRequirements = {
            '1AC': "Pour ce niveau, l'élève doit présenter un total de 5 éléments répartis comme suit: 3 A, 2 B",
            '2AC': "Pour ce niveau, l'élève doit présenter un total de 6 éléments répartis comme suit: 3 A, 2 B, 1 C",
            '3AC': "Pour ce niveau, l'élève doit présenter un total de 7 éléments répartis comme suit: 2 A, 4 B, 1 C"
        };
        const maxCoCm = calculator.coCmMaxScores_calc[year];

        if(requirementsEl) requirementsEl.textContent = difficultyRequirements[year];
        if(coCmInput) coCmInput.max = maxCoCm;
        if(coCmLabel) coCmLabel.textContent = `CO CM: Savoir-être et Motricité (${maxCoCm} points)`;
        
        if (coCmInput && parseFloat(coCmInput.value) > maxCoCm) {
            coCmInput.value = maxCoCm;
        }
        
        if(linkingSelect) {
            for (let option of linkingSelect.options) {
                const score = calculator.getLinkingQualityScore(year, option.value);
                const qualityText = option.text.split('(')[0].trim();
                option.text = `${qualityText} (${score.toFixed(2)} pts)`;
            }
        }
    });
    
    // Trigger change to set initial values
    yearSelect.dispatchEvent(new Event('change'));
}

export function updateRowScore(row) {
    if (!row) return;
    const classLevel = row.dataset.classLevel;
    const pA = parseInt(row.querySelector('[data-field="pA"]').value) || 0;
    const pB = parseInt(row.querySelector('[data-field="pB"]').value) || 0;
    const pC = parseInt(row.querySelector('[data-field="pC"]').value) || 0;
    const specificReqScore = parseFloat(row.querySelector('[data-field="specificReqScore"]').value) || 0;
    const linkingQualityValue = row.querySelector('[data-field="linkingQualityValue"]').value;
    const executionScore = parseFloat(row.querySelector('[data-field="executionScore"]').value) || 0;
    const coCnScore = parseFloat(row.querySelector('[data-field="coCnScore"]').value) || 0;
    const coCmScore = parseFloat(row.querySelector('[data-field="coCmScore"]').value) || 0;

    const difficultyResult = calculator.calculateDifficulty(classLevel, pA, pB, pC);
    const linkingScore = calculator.getLinkingQualityScore(classLevel, linkingQualityValue);
    const maxCoCm = calculator.coCmMaxScores_calc[classLevel] || 4;
    const finalCoCmScore = Math.min(coCmScore, maxCoCm);
    const totalScore = difficultyResult.score + specificReqScore + linkingScore + executionScore + coCnScore + finalCoCmScore;
    
    row.querySelector('.final-score-cell span').textContent = totalScore.toFixed(2);
}

// --- PWA Install ---
export function updateInstallButtonVisibility(currentScreenName) {
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
        const isInstallable = state.deferredPrompt;
        const isVisibleScreen = currentScreenName === 'auth' || currentScreenName === 'classDashboard';
        installBtn.style.display = (isInstallable && isVisibleScreen) ? 'flex' : 'none';
    }
}

// --- Google Drive UI & API Loading ---
export function loadGoogleAPIs() {
    
    const gapiLoaded = () => {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            const savedToken = localStorage.getItem('drive_access_token');
            if (savedToken) {
                gapi.client.setToken({ access_token: savedToken });
                document.getElementById('drive-auth-view').style.display = 'none';
                document.getElementById('drive-sync-view').style.display = 'block';
            }
        });
    };

    const gsiLoaded = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: '', // Will be set dynamically
        });
    };

    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = gapiLoaded;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = gsiLoaded;
    document.body.appendChild(script2);
}


export function handleAuthClick() {
    if (!tokenClient) {
        alert("L'API Google n'est pas encore prête, veuillez patienter un moment.");
        return;
    }
    
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw resp;
        const t = gapi.client.getToken();
        if (t && t.access_token) {
            localStorage.setItem('drive_access_token', t.access_token);
        }
        document.getElementById('drive-auth-view').style.display = 'none';
        document.getElementById('drive-sync-view').style.display = 'block';
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

export function signOutDrive() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            localStorage.removeItem('drive_access_token');
            document.getElementById('drive-auth-view').style.display = 'block';
            document.getElementById('drive-sync-view').style.display = 'none';
        });
    }
}

export async function backupToDrive() {
    alert('جاري النسخ الاحتياطي، يرجى الانتظار...');
    try {
        const BACKUP_FILE_NAME = 'calgym_backup.json';
        const listRes = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FILE_NAME}' and 'me' in owners and trashed=false`,
            fields: 'files(id)',
            pageSize: 1
        });

        const files = listRes.result.files;
        const fileId = files.length > 0 ? files[0].id : null;
        const dataToBackup = JSON.stringify(storage.getAppData());

        if (fileId) {
            await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                headers: { 'Content-Type': 'application/json' },
                body: dataToBackup
            });
            alert('تم تحديث النسخة الاحتياطية بنجاح!');
        } else {
            const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json' };
            const boundary = '-------3141592653589793';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;
            const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + dataToBackup + close_delim;
            await gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart' },
                headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
                body: multipartRequestBody
            });
            alert('تم إنشاء نسخة احتياطية جديدة بنجاح!');
        }
    } catch (err) {
        console.error('Backup failed', err);
        alert('فشل النسخ الاحتياطي إلى Drive.');
    }
}

export async function restoreFromDrive() {
    if (!confirm("هل أنت متأكد أنك تريد استعادة البيانات؟ سيتم الكتابة فوق جميع البيانات الحالية.")) {
        return;
    }
    try {
        const BACKUP_FILE_NAME = 'calgym_backup.json';
        const listRes = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FILE_NAME}' and 'me' in owners and trashed=false`,
            pageSize: 1,
            fields: 'files(id, name)'
        });
        
        const files = listRes.result.files;
        if (!files || files.length === 0) {
            alert('لا توجد نسخة احتياطية.');
            return;
        }
        
        const fileId = files[0].id;
        const getRes = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
        
        const data = getRes.body;
        localStorage.setItem('calgym_app_data_' + state.currentUID, data);
        alert('تم الاستعادة بنجاح! سيتم إعادة تحميل الصفحة.');
        window.location.reload();
    } catch (err) {
        console.error('Restore failed', err);
        alert('فشل الاستعادة من Drive.');
    }
}

// --- File Export ---
export function exportToCSV(className) {
    const appData = storage.getAppData();
    const rows = [["ID","Nom","Score Global","Date"]];
    Object.values(appData.students)
      .filter(s => s.class === className)
      .forEach(s => {
        const last = s.evaluations.at(-1);
        if (last)
          rows.push([s.id, s.name, last.totalScore?.toFixed(2) ?? "", new Date(last.date).toLocaleDateString()]);
      });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-${className}.csv`;
    link.click();
}

export function exportToPDF(className) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt");
    const appData = storage.getAppData();

    doc.setFontSize(18);
    doc.text(`Rapport – ${className}`, 40, 40);

    const body = [];
    Object.values(appData.students)
      .filter(s => s.class === className)
      .forEach(s => {
        const last = s.evaluations.at(-1);
        if (last)
          body.push([s.id, s.name, last.totalScore?.toFixed(2) ?? "", new Date(last.date).toLocaleDateString()]);
      });

    doc.autoTable({
      head: [["ID","Nom","Score Global","Date"]],
      body,
      startY: 70,
      styles: { fontSize: 10 }
    });

    doc.save(`rapport-${className}.pdf`);
}

