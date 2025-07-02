// storage.js
import { state } from './state.js';

const getStorageKey = () => `calgym_app_data_${state.currentUID}`;

export function getAppData() {
    if (!state.currentUID) {
        return { classes: {}, students: {}, settings: { teacherName: 'Pr. Djalil Youness', reportTitle: 'Test Bilan Gymnastique au sol' } };
    }
    const data = localStorage.getItem(getStorageKey());
    let appData = data ? JSON.parse(data) : { classes: {}, students: {}, settings: {} };
    if (!appData.settings) {
        appData.settings = { teacherName: 'Pr. Djalil Youness', reportTitle: 'Test Bilan Gymnastique au sol' };
    }
    if (!appData.classes) appData.classes = {};
    if (!appData.students) appData.students = {};
    return appData;
}

export function saveAppData(data) {
    if (!state.currentUID) {
        console.error("Cannot save data without a logged-in user.");
        return;
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

// --- CRUD Functions ---

export function addClass(className, classLevel) {
    const appData = getAppData();
    if (appData.classes[className]) {
        alert('Cette classe existe déjà !');
        return false;
    }
    appData.classes[className] = { name: className, level: classLevel };
    saveAppData(appData);
    return true;
}

export function editClass(oldClassName, newClassName, newClassLevel) {
    const appData = getAppData();
    if (oldClassName !== newClassName && appData.classes[newClassName]) {
        alert('Une autre classe avec ce nom existe déjà.');
        return false;
    }
    if (oldClassName !== newClassName) {
        delete appData.classes[oldClassName];
    }
    appData.classes[newClassName] = { name: newClassName, level: newClassLevel };
    Object.values(appData.students).forEach(student => {
        if (student.class === oldClassName) {
            student.class = newClassName;
        }
    });
    saveAppData(appData);
    return true;
}

export function deleteClass(className) {
    const appData = getAppData();
    const studentsInClass = Object.values(appData.students).filter(s => s.class === className);
    if (studentsInClass.length > 0) {
        alert("Impossible de supprimer cette classe car elle contient des élèves.");
        return false;
    }
    if (confirm(`Êtes-vous sûr de vouloir supprimer la classe "${className}" ?`)) {
        delete appData.classes[className];
        saveAppData(appData);
        return true;
    }
    return false;
}

export function addStudent(name, className) {
    const appData = getAppData();
    if (!appData.classes[className]) {
        if (confirm(`La classe "${className}" n'existe pas. Voulez-vous la créer avec le niveau par défaut 2AC ?`)) {
            addClass(className, '2AC');
        } else {
            return false;
        }
    }
    const studentId = `student_${Date.now()}`;
    appData.students[studentId] = { id: studentId, name: name, class: className, evaluations: [] };
    saveAppData(appData);
    return true;
}

export function editStudent(studentId, newName, newClass) {
    const appData = getAppData();
    const student = appData.students[studentId];
    if (!student) return false;
    if (!appData.classes[newClass]) {
        alert(`La classe "${newClass}" n'existe pas.`);
        return false;
    }
    student.name = newName;
    student.class = newClass;
    saveAppData(appData);
    return true;
}

export function deleteStudent(studentId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet élève ?")) {
        const appData = getAppData();
        delete appData.students[studentId];
        saveAppData(appData);
        return true;
    }
    return false;
}

export function saveEvaluation(studentId, evaluationData) {
    const appData = getAppData();
    if (appData.students[studentId]) {
        if (!appData.students[studentId].evaluations) {
            appData.students[studentId].evaluations = [];
        }
        appData.students[studentId].evaluations.push(evaluationData);
        saveAppData(appData);
    }
}

export function deleteEvaluation(studentId, evalIndex) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette évaluation ?")) {
        const appData = getAppData();
        const student = appData.students[studentId];
        if (student && student.evaluations[evalIndex]) {
            student.evaluations.splice(evalIndex, 1);
            saveAppData(appData);
            return true;
        }
    }
    return false;
}