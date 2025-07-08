// config.js - Secure configuration without hardcoded credentials

// Application configuration
export const APP_CONFIG = {
    name: 'CalGym',
    version: '2.0.0',
    defaultTeacherName: 'Pr. Djalil Youness',
    defaultReportTitle: 'Test Bilan Gymnastique au sol',
    maxStudentsPerClass: 100,
    maxClassesPerUser: 50,
    maxEvaluationsPerStudent: 200,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Validation rules
export const VALIDATION_RULES = {
    studentName: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZÀ-ÿ\s\-'\.]+$/
    },
    className: {
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s\-_À-ÿ]+$/
    },
    classLevels: ['1AC', '2AC', '3AC'],
    teacherName: {
        minLength: 2,
        maxLength: 100
    },
    reportTitle: {
        minLength: 5,
        maxLength: 200
    }
};

// Security configuration
export const SECURITY_CONFIG = {
    enableXSSProtection: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    encryptLocalStorage: false, // Can be enabled for enhanced security
    allowedFileTypes: ['csv'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
};

// Storage configuration
export const STORAGE_CONFIG = {
    keyPrefix: 'calgym_v2_',
    enableBackup: true,
    maxBackups: 10,
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
};

// Error messages
export const ERROR_MESSAGES = {
    invalidInput: 'Entrée invalide. Veuillez vérifier vos données.',
    studentNameRequired: 'Le nom de l\'élève est requis.',
    classNameRequired: 'Le nom de la classe est requis.',
    invalidClassLevel: 'Niveau de classe invalide.',
    studentExists: 'Un élève avec ce nom existe déjà dans cette classe.',
    classExists: 'Une classe avec ce nom existe déjà.',
    classNotFound: 'Classe non trouvée.',
    studentNotFound: 'Élève non trouvé.',
    evaluationNotFound: 'Évaluation non trouvée.',
    storageError: 'Erreur de stockage des données.',
    networkError: 'Erreur de réseau. Veuillez réessayer.',
    sessionExpired: 'Session expirée. Veuillez vous reconnecter.',
    unauthorized: 'Accès non autorisé.',
    tooManyAttempts: 'Trop de tentatives. Veuillez patienter.',
    fileTooLarge: 'Fichier trop volumineux.',
    invalidFileType: 'Type de fichier non supporté.',
    exportError: 'Erreur lors de l\'exportation.',
    importError: 'Erreur lors de l\'importation.',
    dataCorrupted: 'Données corrompues détectées.',
    backupError: 'Erreur lors de la sauvegarde.',
    restoreError: 'Erreur lors de la restauration.'
};

// Success messages
export const SUCCESS_MESSAGES = {
    studentAdded: 'Élève ajouté avec succès.',
    studentUpdated: 'Élève mis à jour avec succès.',
    studentDeleted: 'Élève supprimé avec succès.',
    classAdded: 'Classe ajoutée avec succès.',
    classUpdated: 'Classe mise à jour avec succès.',
    classDeleted: 'Classe supprimée avec succès.',
    evaluationSaved: 'Évaluation enregistrée avec succès.',
    evaluationDeleted: 'Évaluation supprimée avec succès.',
    dataExported: 'Données exportées avec succès.',
    dataImported: 'Données importées avec succès.',
    dataBackedUp: 'Données sauvegardées avec succès.',
    dataRestored: 'Données restaurées avec succès.',
    settingsUpdated: 'Paramètres mis à jour avec succès.'
};
