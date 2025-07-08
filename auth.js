// auth.js - Simplified authentication system without external dependencies
import { APP_CONFIG, SECURITY_CONFIG, ERROR_MESSAGES } from './config.js';
import { validateEmail, sanitizeHtml, generateSecureId } from './security.js';

// Simple in-memory session management
let currentSession = null;
let loginAttempts = new Map();

/**
 * Initialize authentication system
 * @param {Function} authChangeCallback - Callback for auth state changes
 */
export function initAuth(authChangeCallback) {
    // Check for existing session
    const savedSession = localStorage.getItem('calgym_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData.expiresAt > Date.now()) {
                currentSession = sessionData;
                authChangeCallback({ uid: sessionData.uid, email: sessionData.email });
                return;
            } else {
                // Session expired
                localStorage.removeItem('calgym_session');
            }
        } catch (e) {
            console.error('Invalid session data:', e);
            localStorage.removeItem('calgym_session');
        }
    }
    
    // No valid session found
    authChangeCallback(null);
}

/**
 * Handle user login with simple validation
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Login result
 */
export function handleLogin(email, password) {
    return new Promise((resolve, reject) => {
        // Validate inputs
        if (!email || !password) {
            reject(new Error(ERROR_MESSAGES.invalidInput));
            return;
        }
        
        if (!validateEmail(email)) {
            reject(new Error('Format d\'email invalide.'));
            return;
        }
        
        // Check login attempts
        const attemptKey = email.toLowerCase();
        const attempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
        
        if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
            const timePassed = Date.now() - attempts.lastAttempt;
            if (timePassed < SECURITY_CONFIG.lockoutDuration) {
                reject(new Error(ERROR_MESSAGES.tooManyAttempts));
                return;
            } else {
                // Reset attempts after lockout period
                attempts.count = 0;
            }
        }
        
        // Simple authentication (in real app, this would be server-side)
        // For demo purposes, we'll accept any valid email/password combination
        if (email.length > 0 && password.length >= 4) {
            // Reset login attempts on successful login
            loginAttempts.delete(attemptKey);
            
            // Create session
            const sessionData = {
                uid: generateSecureId(),
                email: sanitizeHtml(email),
                loginTime: Date.now(),
                expiresAt: Date.now() + APP_CONFIG.sessionTimeout
            };
            
            currentSession = sessionData;
            localStorage.setItem('calgym_session', JSON.stringify(sessionData));
            
            resolve({ uid: sessionData.uid, email: sessionData.email });
        } else {
            // Record failed attempt
            attempts.count++;
            attempts.lastAttempt = Date.now();
            loginAttempts.set(attemptKey, attempts);
            
            reject(new Error('Email ou mot de passe incorrect.'));
        }
    });
}

/**
 * Handle user logout
 * @returns {Promise} - Logout result
 */
export function handleLogout() {
    return new Promise((resolve) => {
        currentSession = null;
        localStorage.removeItem('calgym_session');
        resolve();
    });
}

/**
 * Handle password reset (simplified)
 * @param {string} email - User email
 * @returns {Promise} - Reset result
 */
export function handlePasswordReset(email) {
    return new Promise((resolve, reject) => {
        if (!email || !validateEmail(email)) {
            reject(new Error('Format d\'email invalide.'));
            return;
        }
        
        // In a real app, this would send an email
        // For demo purposes, we'll just simulate success
        setTimeout(() => {
            resolve('Instructions de réinitialisation envoyées par email.');
        }, 1000);
    });
}

/**
 * Get current user session
 * @returns {object|null} - Current session data
 */
export function getCurrentUser() {
    if (!currentSession) return null;
    
    // Check if session is still valid
    if (currentSession.expiresAt <= Date.now()) {
        handleLogout();
        return null;
    }
    
    return {
        uid: currentSession.uid,
        email: currentSession.email
    };
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated
 */
export function isAuthenticated() {
    return getCurrentUser() !== null;
}

/**
 * Extend session expiration
 */
export function extendSession() {
    if (currentSession) {
        currentSession.expiresAt = Date.now() + APP_CONFIG.sessionTimeout;
        localStorage.setItem('calgym_session', JSON.stringify(currentSession));
    }
}

/**
 * Clean up expired sessions and failed attempts
 */
export function cleanup() {
    // Clean up failed login attempts older than 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    for (const [key, attempts] of loginAttempts.entries()) {
        if (attempts.lastAttempt < cutoffTime) {
            loginAttempts.delete(key);
        }
    }
}

// Run cleanup periodically
setInterval(cleanup, 60 * 60 * 1000); // Every hour
