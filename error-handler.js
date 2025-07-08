// error-handler.js - Centralized error handling and user feedback

import { ERROR_MESSAGES } from './config.js';

/**
 * Display error message to user
 * @param {string} message - Error message to display
 * @param {string} type - Type of message (error, warning, success, info)
 */
export function showMessage(message, type = 'error') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message-toast');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast message-${type}`;
    messageEl.textContent = message;
    
    // Style the message
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'error':
            messageEl.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            messageEl.style.backgroundColor = '#f59e0b';
            break;
        case 'success':
            messageEl.style.backgroundColor = '#10b981';
            break;
        case 'info':
            messageEl.style.backgroundColor = '#3b82f6';
            break;
        default:
            messageEl.style.backgroundColor = '#6b7280';
    }
    
    // Add animation styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Add to DOM
    document.body.appendChild(messageEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 5000);
}

/**
 * Handle and display errors consistently
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context where error occurred
 */
export function handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    let message = ERROR_MESSAGES.storageError;
    
    if (typeof error === 'string') {
        message = error;
    } else if (error instanceof Error) {
        message = error.message || ERROR_MESSAGES.storageError;
    }
    
    showMessage(message, 'error');
}

/**
 * Handle and display success messages
 * @param {string} message - Success message
 */
export function showSuccess(message) {
    showMessage(message, 'success');
}

/**
 * Handle and display warning messages
 * @param {string} message - Warning message
 */
export function showWarning(message) {
    showMessage(message, 'warning');
}

/**
 * Handle and display info messages
 * @param {string} message - Info message
 */
export function showInfo(message) {
    showMessage(message, 'info');
}

/**
 * Show confirmation dialog with custom styling
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} - User's choice
 */
export function showConfirmDialog(message, confirmText = 'Confirmer', cancelText = 'Annuler') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 8px;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            animation: fadeIn 0.2s ease-out;
        `;
        
        // Create content
        dialog.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 16px; color: #374151;">
                ${message}
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="cancel-btn" style="
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    background: white;
                    color: #374151;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">${cancelText}</button>
                <button class="confirm-btn" style="
                    padding: 8px 16px;
                    border: none;
                    background: #ef4444;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">${confirmText}</button>
            </div>
        `;
        
        // Add animation
        const animationStyle = document.createElement('style');
        animationStyle.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(animationStyle);
        
        // Add event listeners
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(false);
            }
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Add to DOM
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus confirm button
        confirmBtn.focus();
    });
}

/**
 * Global error handler for unhandled errors
 */
export function initGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        handleError(event.error, 'Global');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason, 'Promise');
    });
}

/**
 * Wrapper for async functions to handle errors gracefully
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description
 * @returns {Function} - Wrapped function
 */
export function withErrorHandling(fn, context) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, context);
            return null;
        }
    };
}

/**
 * Validate form input and show appropriate messages
 * @param {HTMLFormElement} form - Form element to validate
 * @param {object} rules - Validation rules
 * @returns {boolean} - True if valid
 */
export function validateForm(form, rules) {
    let isValid = true;
    
    for (const [fieldName, rule] of Object.entries(rules)) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) continue;
        
        const value = field.value.trim();
        
        // Check required
        if (rule.required && !value) {
            showMessage(rule.requiredMessage || `${fieldName} est requis.`, 'warning');
            field.focus();
            isValid = false;
            break;
        }
        
        // Check pattern
        if (value && rule.pattern && !rule.pattern.test(value)) {
            showMessage(rule.patternMessage || `Format de ${fieldName} invalide.`, 'warning');
            field.focus();
            isValid = false;
            break;
        }
        
        // Check length
        if (value && rule.maxLength && value.length > rule.maxLength) {
            showMessage(rule.lengthMessage || `${fieldName} trop long (max ${rule.maxLength} caractères).`, 'warning');
            field.focus();
            isValid = false;
            break;
        }
    }
    
    return isValid;
}