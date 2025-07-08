// storage.js - Secure storage management with validation
import { state } from './state.js';
import { APP_CONFIG, STORAGE_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from './config.js';
import { 
    validateTextInput, 
    validateStudentName, 
    validateClassName, 
    validateClassLevel,
    validateEvaluationData,
    safeJsonParse,
    generateSecureId,
    sanitizeHtml
} from './security.js';

/**
 * Get storage key for current user
 * @returns {string} - Storage key
 */
const getStorageKey = () => {
    if (!state.currentUID) {
        throw new Error(ERROR_MESSAGES.unauthorized);
    }
    return `${STORAGE_CONFIG.keyPrefix}${state.currentUID}`;
};

/**
 * Get default app data structure
 * @returns {object} - Default app data
 */
function getDefaultAppData() {
    return {
        classes: {},
        students: {},
        settings: {
            teacherName: APP_CONFIG.defaultTeacherName,
            reportTitle: APP_CONFIG.defaultReportTitle
        },
        version: APP_CONFIG.version,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
}

/**
 * Validate and migrate app data structure
 * @param {object} data - Raw app data
 * @returns {object} - Validated app data
 */
function validateAppData(data) {
    if (!data || typeof data !== 'object') {
        return getDefaultAppData();
    }
    
    const validatedData = {
        classes: data.classes && typeof data.classes === 'object' ? data.classes : {},
        students: data.students && typeof data.students === 'object' ? data.students : {},
        settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
        version: data.version || APP_CONFIG.version,
        createdAt: data.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    // Ensure settings have required fields
    if (!validatedData.settings.teacherName) {
        validatedData.settings.teacherName = APP_CONFIG.defaultTeacherName;
    }
    if (!validatedData.settings.reportTitle) {
        validatedData.settings.reportTitle = APP_CONFIG.defaultReportTitle;
    }
    
    // Validate and clean up classes
    const cleanClasses = {};
    for (const [key, classData] of Object.entries(validatedData.classes)) {
        if (validateClassName(key) && classData && typeof classData === 'object') {
            cleanClasses[key] = {
                name: validateTextInput(classData.name, 50),
                level: validateClassLevel(classData.level) ? classData.level : '2AC'
            };
        }
    }
    validatedData.classes = cleanClasses;
    
    // Validate and clean up students
    const cleanStudents = {};
    for (const [key, studentData] of Object.entries(validatedData.students)) {
        if (studentData && typeof studentData === 'object') {
            const cleanStudent = {
                id: key,
                name: validateTextInput(studentData.name, 100),
                class: validateTextInput(studentData.class, 50),
                evaluations: []
            };
            
            // Validate evaluations
            if (Array.isArray(studentData.evaluations)) {
                cleanStudent.evaluations = studentData.evaluations
                    .map(eval => validateEvaluationData(eval))
                    .filter(eval => eval !== null)
                    .slice(0, APP_CONFIG.maxEvaluationsPerStudent);
            }
            
            // Only keep student if name and class are valid
            if (cleanStudent.name && cleanStudent.class) {
                cleanStudents[key] = cleanStudent;
            }
        }
    }
    validatedData.students = cleanStudents;
    
    return validatedData;
}

/**
 * Get app data with validation
 * @returns {object} - App data
 */
export function getAppData() {
    if (!state.currentUID) {
        return getDefaultAppData();
    }
    
    try {
        const data = localStorage.getItem(getStorageKey());
        const parsedData = safeJsonParse(data);
        return validateAppData(parsedData);
    } catch (error) {
        console.error('Error loading app data:', error);
        return getDefaultAppData();
    }
}

/**
 * Save app data with validation
 * @param {object} data - App data to save
 * @returns {boolean} - Success status
 */
export function saveAppData(data) {
    if (!state.currentUID) {
        console.error(ERROR_MESSAGES.unauthorized);
        return false;
    }
    
    try {
        const validatedData = validateAppData(data);
        validatedData.lastModified = new Date().toISOString();
        
        localStorage.setItem(getStorageKey(), JSON.stringify(validatedData));
        return true;
    } catch (error) {
        console.error('Error saving app data:', error);
        return false;
    }
}

/**
 * Create backup of current data
 * @returns {boolean} - Success status
 */
export function createBackup() {
    if (!STORAGE_CONFIG.enableBackup) return false;
    
    try {
        const data = getAppData();
        const backupKey = `${getStorageKey()}_backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        
        // Clean up old backups
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith(`${getStorageKey()}_backup_`))
            .sort()
            .reverse();
        
        // Keep only the latest backups
        if (backupKeys.length > STORAGE_CONFIG.maxBackups) {
            backupKeys.slice(STORAGE_CONFIG.maxBackups).forEach(key => {
                localStorage.removeItem(key);
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error creating backup:', error);
        return false;
    }
}

// --- CRUD Functions with validation ---

/**
 * Add a new class with validation
 * @param {string} className - Name of the class
 * @param {string} classLevel - Level of the class
 * @returns {object} - Result object with success status and message
 */
export function addClass(className, classLevel) {
    try {
        // Validate inputs
        if (!validateClassName(className)) {
            return { success: false, message: ERROR_MESSAGES.classNameRequired };
        }
        
        if (!validateClassLevel(classLevel)) {
            return { success: false, message: ERROR_MESSAGES.invalidClassLevel };
        }
        
        const sanitizedClassName = validateTextInput(className, 50);
        const appData = getAppData();
        
        // Check if class already exists
        if (appData.classes[sanitizedClassName]) {
            return { success: false, message: ERROR_MESSAGES.classExists };
        }
        
        // Check limits
        if (Object.keys(appData.classes).length >= APP_CONFIG.maxClassesPerUser) {
            return { success: false, message: `Limite de ${APP_CONFIG.maxClassesPerUser} classes atteinte.` };
        }
        
        // Create backup before modification
        createBackup();
        
        // Add class
        appData.classes[sanitizedClassName] = {
            name: sanitizedClassName,
            level: classLevel
        };
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.classAdded };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error adding class:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Edit existing class with validation
 * @param {string} oldClassName - Current class name
 * @param {string} newClassName - New class name
 * @param {string} newClassLevel - New class level
 * @returns {object} - Result object with success status and message
 */
export function editClass(oldClassName, newClassName, newClassLevel) {
    try {
        // Validate inputs
        if (!validateClassName(newClassName)) {
            return { success: false, message: ERROR_MESSAGES.classNameRequired };
        }
        
        if (!validateClassLevel(newClassLevel)) {
            return { success: false, message: ERROR_MESSAGES.invalidClassLevel };
        }
        
        const sanitizedOldName = validateTextInput(oldClassName, 50);
        const sanitizedNewName = validateTextInput(newClassName, 50);
        const appData = getAppData();
        
        // Check if old class exists
        if (!appData.classes[sanitizedOldName]) {
            return { success: false, message: ERROR_MESSAGES.classNotFound };
        }
        
        // Check if new name conflicts with existing class
        if (sanitizedOldName !== sanitizedNewName && appData.classes[sanitizedNewName]) {
            return { success: false, message: ERROR_MESSAGES.classExists };
        }
        
        // Create backup before modification
        createBackup();
        
        // Update class
        if (sanitizedOldName !== sanitizedNewName) {
            delete appData.classes[sanitizedOldName];
        }
        
        appData.classes[sanitizedNewName] = {
            name: sanitizedNewName,
            level: newClassLevel
        };
        
        // Update students' class references
        Object.values(appData.students).forEach(student => {
            if (student.class === sanitizedOldName) {
                student.class = sanitizedNewName;
            }
        });
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.classUpdated };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error editing class:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Delete class with validation
 * @param {string} className - Name of class to delete
 * @returns {object} - Result object with success status and message
 */
export function deleteClass(className) {
    try {
        const sanitizedClassName = validateTextInput(className, 50);
        const appData = getAppData();
        
        // Check if class exists
        if (!appData.classes[sanitizedClassName]) {
            return { success: false, message: ERROR_MESSAGES.classNotFound };
        }
        
        // Check if class has students
        const studentsInClass = Object.values(appData.students).filter(s => s.class === sanitizedClassName);
        if (studentsInClass.length > 0) {
            return { success: false, message: "Impossible de supprimer cette classe car elle contient des élèves." };
        }
        
        // Create backup before modification
        createBackup();
        
        // Delete class
        delete appData.classes[sanitizedClassName];
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.classDeleted };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Add student with validation
 * @param {string} name - Student name
 * @param {string} className - Class name
 * @returns {object} - Result object with success status and message
 */
export function addStudent(name, className) {
    try {
        // Validate inputs
        if (!validateStudentName(name)) {
            return { success: false, message: ERROR_MESSAGES.studentNameRequired };
        }
        
        if (!validateClassName(className)) {
            return { success: false, message: ERROR_MESSAGES.classNameRequired };
        }
        
        const sanitizedName = validateTextInput(name, 100);
        const sanitizedClassName = validateTextInput(className, 50);
        const appData = getAppData();
        
        // Check if class exists, create if needed
        if (!appData.classes[sanitizedClassName]) {
            const createResult = addClass(sanitizedClassName, '2AC');
            if (!createResult.success) {
                return createResult;
            }
        }
        
        // Check for duplicate student names in the same class
        const existingStudent = Object.values(appData.students).find(
            student => student.name === sanitizedName && student.class === sanitizedClassName
        );
        
        if (existingStudent) {
            return { success: false, message: ERROR_MESSAGES.studentExists };
        }
        
        // Check limits
        const studentsInClass = Object.values(appData.students).filter(s => s.class === sanitizedClassName);
        if (studentsInClass.length >= APP_CONFIG.maxStudentsPerClass) {
            return { success: false, message: `Limite de ${APP_CONFIG.maxStudentsPerClass} élèves par classe atteinte.` };
        }
        
        // Create backup before modification
        createBackup();
        
        // Add student
        const studentId = generateSecureId();
        appData.students[studentId] = {
            id: studentId,
            name: sanitizedName,
            class: sanitizedClassName,
            evaluations: []
        };
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.studentAdded };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error adding student:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Edit student with validation
 * @param {string} studentId - Student ID
 * @param {string} newName - New student name
 * @param {string} newClass - New class name
 * @returns {object} - Result object with success status and message
 */
export function editStudent(studentId, newName, newClass) {
    try {
        // Validate inputs
        if (!validateStudentName(newName)) {
            return { success: false, message: ERROR_MESSAGES.studentNameRequired };
        }
        
        if (!validateClassName(newClass)) {
            return { success: false, message: ERROR_MESSAGES.classNameRequired };
        }
        
        const sanitizedName = validateTextInput(newName, 100);
        const sanitizedClass = validateTextInput(newClass, 50);
        const appData = getAppData();
        
        // Check if student exists
        const student = appData.students[studentId];
        if (!student) {
            return { success: false, message: ERROR_MESSAGES.studentNotFound };
        }
        
        // Check if new class exists
        if (!appData.classes[sanitizedClass]) {
            return { success: false, message: ERROR_MESSAGES.classNotFound };
        }
        
        // Check for duplicate student names in the target class
        const existingStudent = Object.values(appData.students).find(
            s => s.id !== studentId && s.name === sanitizedName && s.class === sanitizedClass
        );
        
        if (existingStudent) {
            return { success: false, message: ERROR_MESSAGES.studentExists };
        }
        
        // Create backup before modification
        createBackup();
        
        // Update student
        student.name = sanitizedName;
        student.class = sanitizedClass;
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.studentUpdated };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error editing student:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Delete student with validation
 * @param {string} studentId - Student ID
 * @returns {object} - Result object with success status and message
 */
export function deleteStudent(studentId) {
    try {
        const appData = getAppData();
        
        // Check if student exists
        if (!appData.students[studentId]) {
            return { success: false, message: ERROR_MESSAGES.studentNotFound };
        }
        
        // Create backup before modification
        createBackup();
        
        // Delete student
        delete appData.students[studentId];
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.studentDeleted };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Save evaluation with validation
 * @param {string} studentId - Student ID
 * @param {object} evaluationData - Evaluation data
 * @returns {object} - Result object with success status and message
 */
export function saveEvaluation(studentId, evaluationData) {
    try {
        const appData = getAppData();
        
        // Check if student exists
        if (!appData.students[studentId]) {
            return { success: false, message: ERROR_MESSAGES.studentNotFound };
        }
        
        // Validate evaluation data
        const validatedEvaluation = validateEvaluationData(evaluationData);
        if (!validatedEvaluation) {
            return { success: false, message: ERROR_MESSAGES.invalidInput };
        }
        
        // Check evaluation limit
        const student = appData.students[studentId];
        if (!student.evaluations) {
            student.evaluations = [];
        }
        
        if (student.evaluations.length >= APP_CONFIG.maxEvaluationsPerStudent) {
            return { success: false, message: `Limite de ${APP_CONFIG.maxEvaluationsPerStudent} évaluations par élève atteinte.` };
        }
        
        // Create backup before modification
        createBackup();
        
        // Add evaluation
        student.evaluations.push(validatedEvaluation);
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.evaluationSaved };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error saving evaluation:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Delete evaluation with validation
 * @param {string} studentId - Student ID
 * @param {number} evalIndex - Evaluation index
 * @returns {object} - Result object with success status and message
 */
export function deleteEvaluation(studentId, evalIndex) {
    try {
        const appData = getAppData();
        
        // Check if student exists
        const student = appData.students[studentId];
        if (!student) {
            return { success: false, message: ERROR_MESSAGES.studentNotFound };
        }
        
        // Check if evaluation exists
        if (!student.evaluations || !student.evaluations[evalIndex]) {
            return { success: false, message: ERROR_MESSAGES.evaluationNotFound };
        }
        
        // Create backup before modification
        createBackup();
        
        // Delete evaluation
        student.evaluations.splice(evalIndex, 1);
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.evaluationDeleted };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error deleting evaluation:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}

/**
 * Update application settings
 * @param {object} newSettings - New settings
 * @returns {object} - Result object with success status and message
 */
export function updateSettings(newSettings) {
    try {
        const appData = getAppData();
        
        // Validate settings
        if (newSettings.teacherName) {
            appData.settings.teacherName = validateTextInput(newSettings.teacherName, 100);
        }
        
        if (newSettings.reportTitle) {
            appData.settings.reportTitle = validateTextInput(newSettings.reportTitle, 200);
        }
        
        if (saveAppData(appData)) {
            return { success: true, message: SUCCESS_MESSAGES.settingsUpdated };
        } else {
            return { success: false, message: ERROR_MESSAGES.storageError };
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        return { success: false, message: ERROR_MESSAGES.storageError };
    }
}