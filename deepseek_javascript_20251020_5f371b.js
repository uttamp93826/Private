// ==================== CONFIGURATION ====================
const CONFIG = {
    // Authorized email addresses
    AUTHORIZED_EMAILS: [
        'admin@yourcompany.com',
        'user@yourcompany.com',
        'team@yourcompany.com',
        'manager@yourcompany.com',
        'ceo@yourcompany.com'
        // Add all authorized email addresses here
    ],
    
    // Allowed email domains (optional - for domain-wide access)
    ALLOWED_DOMAINS: [
        'yourcompany.com',
        'partner-company.com'
    ],
    
    // Settings
    AUTO_DETECT_TIMEOUT: 2000,  // 2 seconds timeout for auto-detection
    PERSIST_SESSION: true,      // Remember email across browser sessions
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

// ==================== EMAIL AUTH CLASS ====================
class EmailOnlyAuth {
    constructor() {
        this.detectedEmail = null;
        this.authMethod = null;
        this.isAuthorized = false;
        this.init();
    }

    async init() {
        try {
            console.log('📧 Starting email verification...');
            this.updateLoadingStep('step-url', 'active');
            
            // Try email detection methods in sequence
            await this.detectEmail();
            
            // Check authorization
            await this.checkAuthorization();
            
            // Show appropriate content
            this.showContent();
            
        } catch (error) {
            console.log('Email detection failed:', error);
            this.showManualEntry();
        }
    }

    async detectEmail() {
        // Method 1: Check URL parameters for email (magic links)
        if (await this.checkURLEmail()) {
            this.updateLoadingStep('step-url', 'completed');
            return;
        }

        this.updateLoadingStep('step-url', 'completed');
        this.updateLoadingStep('step-storage', 'active');

        // Method 2: Check stored email from previous sessions
        if (await this.checkStoredEmail()) {
            this.updateLoadingStep('step-storage', 'completed');
            return;
        }

        this.updateLoadingStep('step-storage', 'completed');
        this.updateLoadingStep('step-auto', 'active');

        // Method 3: Attempt automatic email detection
        if (await this.attemptAutoDetection()) {
            this.updateLoadingStep('step-auto', 'completed');
            return;
        }

        this.updateLoadingStep('step-auto', 'failed');
        throw new Error('No email detected automatically');
    }

    async checkURLEmail() {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        
        if (emailParam && this.isValidEmail(emailParam)) {
            console.log('📧 Email found in URL:', emailParam);
            
            if (this.isEmailAuthorized(emailParam)) {
                this.detectedEmail = emailParam;
                this.authMethod = 'Magic Link';
                
                // Store for future visits
                if (CONFIG.PERSIST_SESSION) {
                    this.storeEmailSession(emailParam);
                }
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            }
        }
        return false;
    }

    async checkStoredEmail() {
        const storedSession = this.getStoredEmailSession();
        
        if (storedSession && this.isValidEmail(storedSession.email)) {
            // Check if session is still valid
            if (this.isSessionValid(storedSession)) {
                console.log('📧 Email found in storage:', storedSession.email);
                
                if (this.isEmailAuthorized(storedSession.email)) {
                    this.detectedEmail = storedSession.email;
                    this.authMethod = 'Stored Session';
                    return true;
                }
            } else {
                // Session expired, clear it
                this.clearStoredEmail();
            }
        }
        return false;
    }

    async attemptAutoDetection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                // In a real implementation, this would include:
                // - Microsoft Office 365 integration
                // - Google Workspace detection  
                // - Enterprise SSO detection
                // - Browser profile email detection
                
                // For demo purposes, we'll simulate detection
                this.simulateEnterpriseDetection(resolve);
            }, 1000);
        });
    }

    simulateEnterpriseDetection(resolve) {
        // Simulate various enterprise detection methods
        const detectionMethods = [
            () => this.detectFromBrowserStorage(),
            () => this.detectFromCookies(),
            () => this.detectFromEnvironment()
        ];

        for (let method of detectionMethods) {
            const email = method();
            if (email && this.isValidEmail(email) && this.isEmailAuthorized(email)) {
                this.detectedEmail = email;
                this.authMethod = 'Auto-Detection';
                
                // Store for future sessions
                if (CONFIG.PERSIST_SESSION) {
                    this.storeEmailSession(email);
                }
                
                resolve(true);
                return;
            }
        }
        
        resolve(false);
    }

    detectFromBrowserStorage() {
        // Check for common email patterns in localStorage/sessionStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            if (value && this.isValidEmail(value) && this.isEmailAuthorized(value)) {
                return value;
            }
        }
        return null;
    }

    detectFromCookies() {
        // Check cookies for email patterns
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (value && this.isValidEmail(value) && this.isEmailAuthorized(value)) {
                return value;
            }
        }
        return null;
    }

    detectFromEnvironment() {
        // Simulate enterprise environment detection
        // In real implementation, this would detect Microsoft/Google environments
        const isCorporateNetwork = window.location.hostname.includes('corp') || 
                                 window.location.hostname.includes('internal');
        
        if (isCorporateNetwork) {
            // Return a demo authorized email (in real setup, this would be actual detection)
            const demoEmail = CONFIG.AUTHORIZED_EMAILS[0];
            console.log('🏢 Corporate environment detected, using demo email:', demoEmail);
            return demoEmail;
        }
        
        return null;
    }

    // ==================== AUTHORIZATION CHECK ====================

    async checkAuthorization() {
        if (!this.detectedEmail) {
            this.isAuthorized = false;
            return;
        }

        if (this.isEmailAuthorized(this.detectedEmail)) {
            this.isAuthorized = true;
            return;
        }

        this.isAuthorized = false;
    }

    isEmailAuthorized(email) {
        const emailLower = email.toLowerCase();
        
        // Check exact email match
        if (CONFIG.AUTHORIZED_EMAILS.includes(emailLower)) {
            return true;
        }
        
        // Check domain match
        const domain = emailLower.split('@')[1];
        if (CONFIG.ALLOWED_DOMAINS.includes(domain)) {
            return true;
        }
        
        return false;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ==================== SESSION MANAGEMENT ====================

    storeEmailSession(email) {
        const sessionData = {
            email: email,
            timestamp: Date.now(),
            expires: Date.now() + CONFIG.SESSION_DURATION
        };
        
        localStorage.setItem('emailAuthSession', JSON.stringify(sessionData));
    }

    getStoredEmailSession() {
        try {
            const stored = localStorage.getItem('emailAuthSession');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    isSessionValid(session) {
        return session && session.expires > Date.now();
    }

    clearStoredEmail() {
        localStorage.removeItem('emailAuthSession');
    }

    // ==================== UI METHODS ====================

    updateLoadingStep(stepId, status) {
        const stepElement = document.getElementById(stepId);
        if (stepElement) {
            stepElement.textContent = stepElement.textContent.replace(/•/, status === 'active' ? '🔄' : status === 'completed' ? '✅' : '❌');
            
            if (status === 'active') {
                stepElement.style.fontWeight = 'bold';
                stepElement.style.color = '#4285f4';
            } else if (status === 'completed') {
                stepElement.style.color = '#4CAF50';
            }
        }
    }

    showContent() {
        document.getElementById('loading').classList.add('hidden');
        
        if (this.isAuthorized) {
            document.getElementById('access-granted').classList.remove('hidden');
            
            // Populate user info
            document.getElementById('user-email').textContent = this.detectedEmail;
            document.getElementById('auth-method').textContent = this.authMethod;
            document.getElementById('access-time').textContent = new Date().toLocaleString();
            
            const sessionStatus = CONFIG.PERSIST_SESSION ? 
                'Persistent (you will stay logged in)' : 
                'Temporary (login required next visit)';
            document.getElementById('session-status').textContent = sessionStatus;
            
            console.log('✅ Access granted to:', this.detectedEmail, 'via:', this.authMethod);
        } else {
            this.showManualEntry();
        }
    }

    showManualEntry() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('access-denied').classList.remove('hidden');
        
        const detectionStatus = this.detectedEmail ? 
            `Detected: ${this.detectedEmail} (not authorized)` : 
            'No email detected automatically';
        document.getElementById('detection-status').textContent = detectionStatus;
        
        // Focus on email input
        setTimeout(() => {
            document.getElementById('manual-email').focus();
        }, 100);
    }
}

// ==================== MANUAL EMAIL VERIFICATION ====================

async function verifyManualEmail() {
    const manualEmail = document.getElementById('manual-email').value.trim();
    const errorElement = document.getElementById('manual-error');
    
    // Clear previous errors
    errorElement.textContent = '';
    
    if (!manualEmail) {
        errorElement.textContent = 'Please enter an email address';
        return;
    }
    
    if (!isValidEmail(manualEmail)) {
        errorElement.textContent = 'Please enter a valid email address';
        return;
    }
    
    // Check authorization
    const auth = new EmailOnlyAuth();
    if (auth.isEmailAuthorized(manualEmail)) {
        // Store for future automatic access
        if (CONFIG.PERSIST_SESSION) {
            auth.storeEmailSession(manualEmail);
        }
        
        errorElement.textContent = '';
        showMessage('✅ Email verified! Granting access...', 'success');
        
        // Reload to trigger automatic auth with the new email
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } else {
        errorElement.textContent = 'This email is not authorized to access this site. Please contact administrator.';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showMessage(message, type) {
    // Simple message display - you can replace with a better UI
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : '#F44336'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}

function logout() {
    // Clear stored email session
    localStorage.removeItem('emailAuthSession');
    
    showMessage('🔒 Signed out. Redirecting...', 'info');
    
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// ==================== ADMIN UTILITIES ====================

function generateMagicLinks() {
    const baseUrl = window.location.origin;
    console.log('🔗 EMAIL MAGIC LINKS FOR AUTHORIZED USERS');
    console.log('=========================================');
    
    CONFIG.AUTHORIZED_EMAILS.forEach(email => {
        const magicLink = `${baseUrl}?email=${encodeURIComponent(email)}`;
        console.log(`📧 ${email}`);
        console.log(`   ${magicLink}\n`);
    });
    
    console.log('💡 Share these links with authorized users for one-click access.');
}

// ==================== INITIALIZATION ====================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmailOnlyAuth();
});

// Generate magic links (for admin use - run in console)
window.generateMagicLinks = generateMagicLinks;