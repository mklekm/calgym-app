// state.js
// هذا الملف يحتفظ بحالة التطبيق الحالية التي تحتاجها الوحدات الأخرى
export const state = {
    currentUID: null,
    currentStudentId: null,
    currentClassName: null,
    deferredPrompt: null, // For PWA install prompt
    charts: { // To hold chart instances
        classAverageChart: null,
        overallScoreDistChart: null,
        componentRadarChart: null,
        overallComponentRadarChart: null,
        componentBarChart: null, // This is now obsolete but kept for safety
        classScoreDistChart: null,
        componentAnalysisChart: null, // The new chart instance
    }
};
