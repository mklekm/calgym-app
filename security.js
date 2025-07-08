// security.js - Security utilities for input validation and XSS protection

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeHtml(input) {
    if (typeof input !== 'string') return '';
    
    // Create a temporary element to sanitize HTML
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}

/**
 * Validate and sanitize text input
 * @param {string} input - The input to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized and validated input
 */
export function validateTextInput(input, maxLength = 100) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove HTML tags and limit length
    const sanitized = sanitizeHtml(input.trim());
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate numeric input
 * @param {any} input - Input to validate as number
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Validated number or 0 if invalid
 */
export function validateNumber(input, min = 0, max = 100) {
    const num = parseFloat(input);
    if (isNaN(num)) return 0;
    return Math.min(Math.max(num, min), max);
}

/**
 * Validate class name format
 * @param {string} className - Class name to validate
 * @returns {boolean} - True if valid class name
 */
export function validateClassName(className) {
    if (!className || typeof className !== 'string') return false;
    
    // Allow alphanumeric characters, spaces, and common punctuation
    const classNameRegex = /^[a-zA-Z0-9\s\-_À-ÿ]+$/;
    return classNameRegex.test(className.trim()) && className.trim().length > 0 && className.trim().length <= 50;
}

/**
 * Validate student name format
 * @param {string} name - Student name to validate
 * @returns {boolean} - True if valid student name
 */
export function validateStudentName(name) {
    if (!name || typeof name !== 'string') return false;
    
    // Allow letters, spaces, and common punctuation for names
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
    return nameRegex.test(name.trim()) && name.trim().length > 0 && name.trim().length <= 100;
}

/**
 * Validate class level
 * @param {string} level - Class level to validate
 * @returns {boolean} - True if valid class level
 */
export function validateClassLevel(level) {
    const validLevels = ['1AC', '2AC', '3AC'];
    return validLevels.includes(level);
}

/**
 * Generate secure random ID
 * @returns {string} - Secure random ID
 */
export function generateSecureId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Validate JSON data before parsing
 * @param {string} jsonString - JSON string to validate
 * @returns {any} - Parsed JSON or null if invalid
 */
export function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Invalid JSON data:', e);
        return null;
    }
}

/**
 * Validate evaluation data
 * @param {object} evalData - Evaluation data to validate
 * @returns {object} - Validated evaluation data
 */
export function validateEvaluationData(evalData) {
    if (!evalData || typeof evalData !== 'object') return null;
    
    const validated = {
        date: evalData.date || new Date().toISOString(),
        year: validateClassLevel(evalData.year) ? evalData.year : '2AC',
        pA: validateNumber(evalData.pA, 0, 20),
        pB: validateNumber(evalData.pB, 0, 20),
        pC: validateNumber(evalData.pC, 0, 20),
        specificReqScore: validateNumber(evalData.specificReqScore, 0, 2),
        linkingQualityValue: ['excellent', 'good', 'average', 'poor'].includes(evalData.linkingQualityValue) 
            ? evalData.linkingQualityValue : 'average',
        executionScore: validateNumber(evalData.executionScore, 0, 2),
        coCnScore: validateNumber(evalData.coCnScore, 0, 3),
        coCmScore: validateNumber(evalData.coCmScore, 0, 5),
        difficultyScore: validateNumber(evalData.difficultyScore, 0, 6),
        linkingScore: validateNumber(evalData.linkingScore, 0, 3),
        totalScore: validateNumber(evalData.totalScore, 0, 20)
    };
    
    return validated;
}