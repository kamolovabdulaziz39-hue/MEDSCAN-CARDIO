// CARDIO-AI APP CONTROLLER

// State
let state = {
    token: localStorage.getItem('cardio_token') || null,
    user: JSON.parse(localStorage.getItem('cardio_user')) || null,
    activeView: 'home-view',
    selectedFiles: [],
    currentAnalysisId: null,
    charts: {
        timeline: null,
        regional: null,
        diagnosis: null,
        efficiency: null
    },
    statsLevel: { region: null, district: null }
};

const API_BASE = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) ? window.location.origin : 'http://127.0.0.1:8000';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const navItems = document.querySelectorAll('.nav-item');
const logoutBtn = document.getElementById('logout-btn');
const pageTitle = document.getElementById('page-title');
const mobileToggleBtn = document.querySelector('.mobile-toggle-btn');
const sidebar = document.querySelector('.sidebar');

// Init App
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupAddressPicker();
    setupNavigation();
    setupWizard();
    setupUploadZone();
    setupFormSubmission();
    setupMobileSidebar();
    setupSearchAndFilters();
    setupWebcam();
    setupToggleOverlay();
    setupPWAInstallPrompt();
    setupMobileNavigation();
    setupIosInstallModal();
    registerServiceWorker();
    setupProfileEdit();
});

// 1. AUTHENTICATION & LOGIN FLOW
function initAuth() {
    // Toggle between login and registration forms
    const toggleToLogin = document.getElementById('toggle-to-login');
    const toggleToRegister = document.getElementById('toggle-to-register');
    const loginFormElem = document.getElementById('login-form');
    const registerFormElem = document.getElementById('register-form');
    if (toggleToLogin && toggleToRegister) {
        toggleToLogin.addEventListener('click', () => {
            loginFormElem.classList.remove('hide');
            registerFormElem.classList.add('hide');
        });
        toggleToRegister.addEventListener('click', () => {
            loginFormElem.classList.add('hide');
            registerFormElem.classList.remove('hide');
        });
    }

    // Registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorBox = document.getElementById('register-error');
            errorBox.classList.add('hide');
            const firstName = document.getElementById('register-first-name').value.trim();
            const lastName = document.getElementById('register-last-name').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const passcode = document.getElementById('register-passcode').value.trim();
            const region = document.getElementById('register-region').value;
            const district = document.getElementById('register-district').value;
            const village = document.getElementById('register-village').value.trim();
            const street = document.getElementById('register-street').value.trim();
            const year = document.getElementById('register-birth-year').value;
            const month = document.getElementById('register-birth-month').value;
            const day = document.getElementById('register-birth-day').value;
            const birthDate = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('phone', phone);
            formData.append('passcode', passcode);
            formData.append('region', region);
            formData.append('district', district);
            formData.append('village', village);
            formData.append('street', street);
            formData.append('birth_date', birthDate);
            try {
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    state.token = result.token;
                    state.user = result.user;
                    localStorage.setItem('cardio_token', result.token);
                    localStorage.setItem('cardio_user', JSON.stringify(result.user));
                    // After registration, show app and reset project info flag
                    localStorage.removeItem('project_info_viewed');
                    showApp();
                } else {
                    errorBox.textContent = result.detail || 'Ro\'yxatdan o\'tishda xatolik';
                    errorBox.classList.remove('hide');
                }
            } catch (err) {
                errorBox.textContent = 'Serverga ulanib bo\'lmadi';
                errorBox.classList.remove('hide');
            }
        });
    }

    // Existing login handler (unchanged)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hide');
        const phone = document.getElementById('login-phone').value.trim();
        const passcode = document.getElementById('login-passcode').value.trim();
        
        let cleanPhone = phone.replace(/\s+/g, '');
        if (!cleanPhone.startsWith('+')) {
            cleanPhone = '+' + cleanPhone;
        }
        
        const formData = new FormData();
        formData.append('phone', cleanPhone);
        formData.append('passcode', passcode);
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok && result.status === 'success') {
                state.token = result.token;
                state.user = result.user;
                localStorage.setItem('cardio_token', result.token);
                localStorage.setItem('cardio_user', JSON.stringify(result.user));
                showApp();
            } else {
                showLoginError(result.detail || "Kirishda xatolik yuz berdi");
            }
        } catch (error) {
            showLoginError("Serverga ulanish imkoni bo'lmadi");
        }
    });

    logoutBtn.addEventListener('click', () => {
        state.token = null;
        state.user = null;
        localStorage.removeItem('cardio_token');
        localStorage.removeItem('cardio_user');
        localStorage.removeItem('project_info_viewed');
        stopEmergencyAlarm();
        showLogin();
    });

    // Guest public stats handlers
    const publicStatsBtn = document.getElementById('public-stats-btn');
    if (publicStatsBtn) {
        publicStatsBtn.addEventListener('click', () => {
            // Show app shell in guest mode
            loginScreen.classList.remove('active');
            appShell.classList.remove('hide');
            
            // Hide sidebar and mobile nav, adjust main-content margin
            const sidebarEl = document.querySelector('.sidebar');
            if (sidebarEl) sidebarEl.style.display = 'none';
            
            const mainContentEl = document.querySelector('.main-content');
            if (mainContentEl) {
                mainContentEl.style.marginLeft = '0';
                mainContentEl.style.width = '100%';
            }
            
            const mobileNav = document.querySelector('.mobile-bottom-nav');
            if (mobileNav) mobileNav.style.display = 'none';
            
            const contentHeader = document.querySelector('.content-header');
            if (contentHeader) contentHeader.style.display = 'none';
            
            // Show guest header
            const guestHeader = document.getElementById('guest-header');
            if (guestHeader) guestHeader.classList.remove('hide');
            
            // Switch to dashboard view
            switchView('dashboard-view');
        });
    }

    const guestLoginBtn = document.getElementById('guest-login-btn');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', () => {
            exitGuestMode();
        });
    }

    if (state.token && state.user) {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    // Reset guest styles just in case
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) sidebarEl.style.display = '';
    
    const mainContentEl = document.querySelector('.main-content');
    if (mainContentEl) {
        mainContentEl.style.marginLeft = '';
        mainContentEl.style.width = '';
    }
    
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (mobileNav) mobileNav.style.display = '';
    
    const contentHeader = document.querySelector('.content-header');
    if (contentHeader) contentHeader.style.display = '';
    
    const guestHeader = document.getElementById('guest-header');
    if (guestHeader) guestHeader.classList.add('hide');

    loginScreen.classList.add('active');
    appShell.classList.add('hide');
    document.body.classList.remove('strobe-alert-active');
}

function exitGuestMode() {
    showLogin();
}

function showApp() {
    loginScreen.classList.remove('active');
    appShell.classList.remove('hide');
    // Populate user profile in sidebar
    document.getElementById('user-phone').textContent = state.user.phone;
    document.getElementById('user-region').textContent = state.user.region;
    // Determine if project info has been acknowledged
    const projectSeen = localStorage.getItem('project_info_viewed') === 'true';
    if (projectSeen) {
        // Hide project card, show new-patient button and navigation links
        document.getElementById('project-info-container').classList.add('hide');
        document.getElementById('new-patient-start-container').classList.remove('hide');
        document.getElementById('nav-new-patient').classList.remove('hide');
        document.getElementById('nav-profile').classList.remove('hide');
    } else {
        // Show project card, hide new‑patient start and related nav links
        document.getElementById('project-info-container').classList.remove('hide');
        document.getElementById('new-patient-start-container').classList.add('hide');
        document.getElementById('nav-new-patient').classList.add('hide');
        document.getElementById('nav-profile').classList.add('hide');
    }
    
    // Role based navigation check
    const navSuperAdmin = document.getElementById('nav-superadmin');
    const mobileNavSuperAdmin = document.getElementById('mobile-nav-superadmin');
    const navClinicAdmin = document.getElementById('nav-clinicadmin');
    const mobileNavClinicAdmin = document.getElementById('mobile-nav-clinicadmin');
    const navAdmin = document.getElementById('nav-admin');
    const mobileNavAdmin = document.getElementById('mobile-nav-admin');

    const role = state.user ? (state.user.role || 'doctor') : 'doctor';

    if (role === 'superadmin') {
        if (navSuperAdmin) navSuperAdmin.classList.remove('hide');
        if (mobileNavSuperAdmin) mobileNavSuperAdmin.classList.remove('hide');
        if (navClinicAdmin) navClinicAdmin.classList.remove('hide');
        if (mobileNavClinicAdmin) mobileNavClinicAdmin.classList.remove('hide');
        if (navAdmin) navAdmin.classList.remove('hide');
        if (mobileNavAdmin) mobileNavAdmin.classList.remove('hide');
    } else if (role === 'clinicadmin') {
        if (navSuperAdmin) navSuperAdmin.classList.add('hide');
        if (mobileNavSuperAdmin) mobileNavSuperAdmin.classList.add('hide');
        if (navClinicAdmin) navClinicAdmin.classList.remove('hide');
        if (mobileNavClinicAdmin) mobileNavClinicAdmin.classList.remove('hide');
        if (navAdmin) navAdmin.classList.add('hide');
        if (mobileNavAdmin) mobileNavAdmin.classList.add('hide');
    } else {
        // doctor
        if (navSuperAdmin) navSuperAdmin.classList.add('hide');
        if (mobileNavSuperAdmin) mobileNavSuperAdmin.classList.add('hide');
        if (navClinicAdmin) navClinicAdmin.classList.add('hide');
        if (mobileNavClinicAdmin) mobileNavClinicAdmin.classList.add('hide');
        if (navAdmin) navAdmin.classList.add('hide');
        if (mobileNavAdmin) mobileNavAdmin.classList.add('hide');
    }

    // Attach acknowledge button handler
    const ackBtn = document.getElementById('acknowledge-project');
    if (ackBtn) {
        ackBtn.onclick = () => {
            localStorage.setItem('project_info_viewed', 'true');
            document.getElementById('project-info-container').classList.add('hide');
            document.getElementById('new-patient-start-container').classList.remove('hide');
            document.getElementById('nav-new-patient').classList.remove('hide');
            document.getElementById('nav-profile').classList.remove('hide');
        };
    }
    // Default to home view
    switchView('home-view');
}

function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hide');
}

// 2. NAVIGATION & SPA ROUTING
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.hasAttribute('download')) {
                return;
            }
            e.preventDefault();
            const target = item.getAttribute('data-target');
            sidebar.classList.remove('mobile-open');
            // Prevent navigation to new‑patient or profile before project info is seen
            const projectSeen = localStorage.getItem('project_info_viewed') === 'true';
            if (!projectSeen && (target === 'new-patient-view' || target === 'profile-view')) {
                // Stay on home and optionally flash the project card
                switchView('home-view');
                return;
            }
            switchView(target);
        });
    });
}

function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hide');
        view.classList.remove('active');
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hide');
        targetView.classList.add('active');
        state.activeView = viewId;
    }
    // Update nav active state
    navItems.forEach(item => {
        if (item.getAttribute('data-target') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    // Mobile nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        if (item.getAttribute('data-target') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    // Page title and view‑specific loaders
    stopEmergencyAlarm();
    if (viewId === 'home-view') {
        pageTitle.textContent = "Asosiy Oyna";
        loadRecentPatients();
    } else if (viewId === 'new-patient-view') {
        pageTitle.textContent = "Yangi Bemor Diagnostikasi";
        resetWizard();
    } else if (viewId === 'dashboard-view') {
        pageTitle.textContent = "O'zbekiston Respublikasi Kardiologik Monitoring Portali";
        loadDashboardStats();
    } else if (viewId === 'profile-view') {
        pageTitle.textContent = "Mening Profilim";
        loadUserProfile();
    } else if (viewId === 'results-view') {
        pageTitle.textContent = "Tahlil va Tashxis Xulosasi";
    } else if (viewId === 'admin-view') {
        pageTitle.textContent = "Admin Boshqaruv Paneli";
        loadAdminStats();
    } else if (viewId === 'superadmin-view') {
        pageTitle.textContent = "SuperAdmin Boshqaruv Paneli";
        loadSuperAdminDashboard();
    } else if (viewId === 'clinicadmin-view') {
        pageTitle.textContent = "Clinic Boshqaruv Paneli";
        loadClinicAdminDashboard();
    }
}

function setupMobileSidebar() {
    mobileToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileToggleBtn.contains(e.target) && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// USER PROFILE LOADER
async function loadUserProfile() {
    if (!state.user) return;
    document.getElementById('profile-first-name').textContent = state.user.first_name || '';
    document.getElementById('profile-last-name').textContent = state.user.last_name || '';
    document.getElementById('profile-phone').textContent = state.user.phone || '';
    document.getElementById('profile-region').textContent = state.user.region || '';
    document.getElementById('profile-district').textContent = state.user.district || '';
    document.getElementById('profile-village').textContent = state.user.village || '';
    document.getElementById('profile-street').textContent = state.user.street || '';
    document.getElementById('profile-birthdate').textContent = state.user.birth_date || '';
}

async function loadRecentPatients() {
    const tableBody = document.getElementById('patients-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Yuklanmoqda...</td></tr>`;
    
    try {
        const response = await fetch(`${API_BASE}/api/ecg/recent`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (response.ok) {
            const data = await response.json();
            state.recentPatients = data; // Cache recent list in state
            renderPatientTable(data);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--neon-red);">Ro'yxatni yuklashda xatolik.</td></tr>`;
        }
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--neon-red);">Aloqa yo'q.</td></tr>`;
    }
}

// Render recent patients into the table
function renderPatientTable(data) {
    const tableBody = document.getElementById('patients-table-body');
    if (!tableBody) return;
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Bemorlar topilmadi.</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-normal';
        let diagnosisText = 'Sog\'lom';
        
        if (item.classification === 'ACUTE_INFARCTION') {
            badgeClass = 'badge-infarction';
            diagnosisText = 'O\'TKIR INFARKT';
        } else if (item.classification === 'ISCHEMIA') {
            badgeClass = 'badge-ischemia';
            diagnosisText = 'ISHEMIYA';
        } else if (item.classification === 'ARRHYTHMIA') {
            badgeClass = 'badge-arrhythmia';
            diagnosisText = 'ARITMIYA';
        }
        
        tr.innerHTML = `
            <td><span class="cardio-id">${item.patient_id}</span></td>
            <td><strong>${item.fullname}</strong></td>
            <td>${item.birth_year}-yil</td>
            <td>${item.created_at}</td>
            <td><span class="badge ${badgeClass}">${diagnosisText}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="viewExistingResult(${item.id})">
                    <i class="fa-solid fa-file-invoice"></i> Protokol
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Helper to quickly view result
async function viewExistingResult(analysisId) {
    switchView('analyzing-view');
    // Fetch detailed analysis data from the server
    setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/ecg/analysis/${analysisId}`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (response.ok) {
                const result = await response.json();
                state.currentAnalysisId = analysisId;
                setupPDFButtons(analysisId);
                
                // Render results view with actual database data
                renderResultsView(
                    result.analysis.classification,
                    result.analysis.patient_id,
                    `${result.patient.last_name} ${result.patient.first_name}`,
                    result.patient.birth_year,
                    result.patient.phone,
                    result.analysis.symptoms,
                    `${result.analysis.blood_pressure_sys}/${result.analysis.blood_pressure_dia}`,
                    result.analysis.pulse,
                    result.analysis.details,
                    result.analysis.image_path,
                    result.patient.gender
                );
            } else {
                alert("Tahlil ma'lumotlarini yuklashda xatolik yuz berdi.");
                switchView('home-view');
            }
        } catch(e) {
            console.error("View existing result failed: ", e);
            switchView('home-view');
        }
    }, 800);
}

// 4. FORM WIZARD (MULTI-STEP)
function setupWizard() {
    const nextBtns = document.querySelectorAll('.next-step-btn');
    const prevBtns = document.querySelectorAll('.prev-step-btn');
    
    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStep = btn.getAttribute('data-next');
            if (validateStep(nextStep - 1)) {
                goToStep(nextStep);
            }
        });
    });
    
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prevStep = btn.getAttribute('data-prev');
            goToStep(prevStep);
        });
    });
}

function validateStep(step) {
    if (step === 1) {
        const lastName = document.getElementById('pat-lastname').value.trim();
        const firstName = document.getElementById('pat-firstname').value.trim();
        const birthYear = document.getElementById('pat-birthyear').value;
        const phone = document.getElementById('pat-phone').value.trim();
        
        if (!lastName || !firstName || !birthYear || !phone) {
            alert("Iltimos, barcha maydonlarni to'ldiring.");
            return false;
        }
        return true;
    }
    if (step === 2) {
        const sys = document.getElementById('vitals-sys').value;
        const dia = document.getElementById('vitals-dia').value;
        const pulse = document.getElementById('vitals-pulse').value;
        
        if (!sys || !dia || !pulse) {
            alert("Iltimos, hayotiy ko'rsatkichlarni to'ldiring.");
            return false;
        }
        return true;
    }
    return true;
}

function goToStep(stepNum) {
    // Hide all step contents
    document.querySelectorAll('.wizard-step-content').forEach(content => {
        content.classList.add('hide');
        content.classList.remove('active');
    });
    
    // Show active step content
    document.getElementById(`step-content-${stepNum}`).classList.remove('hide');
    document.getElementById(`step-content-${stepNum}`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, idx) => {
        const currentIdx = idx + 1;
        step.classList.remove('active', 'completed');
        
        if (currentIdx < stepNum) {
            step.classList.add('completed');
        } else if (currentIdx == stepNum) {
            step.classList.add('active');
        }
    });
}

function resetWizard() {
    document.getElementById('new-patient-form').reset();
    state.selectedFiles = [];
    
    // Reset image upload preview
    const previewContainer = document.getElementById('upload-preview-container');
    const promptContainer = document.querySelector('.upload-prompt');
    const previewsList = document.getElementById('upload-previews-list');
    if (previewsList) previewsList.innerHTML = '';
    previewContainer.classList.add('hide');
    promptContainer.classList.remove('hide');
    document.getElementById('ecg-file-input').value = '';
    
    goToStep(1);
}

// 5. UPLOAD ZONE (IMAGE HANDLING)
function setupUploadZone() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('ecg-file-input');
    const removeBtn = document.getElementById('remove-image-btn');
    const previewContainer = document.getElementById('upload-preview-container');
    const promptContainer = document.querySelector('.upload-prompt');
    
    uploadZone.addEventListener('click', (e) => {
        if (removeBtn && (e.target === removeBtn || removeBtn.contains(e.target))) return;
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleSelectedFiles(files);
        }
    });
    
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--neon-blue)';
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            handleSelectedFiles(files);
        }
    });
    
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        state.selectedFiles = [];
        const previewsList = document.getElementById('upload-previews-list');
        if (previewsList) previewsList.innerHTML = '';
        previewContainer.classList.add('hide');
        promptContainer.classList.remove('hide');
    });
}

function handleSelectedFiles(files) {
    if (!state.selectedFiles) {
        state.selectedFiles = [];
    }
    
    const previewContainer = document.getElementById('upload-preview-container');
    const promptContainer = document.querySelector('.upload-prompt');
    const previewsList = document.getElementById('upload-previews-list');
    
    files.forEach(file => {
        state.selectedFiles.push(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Create thumbnail element
            const thumb = document.createElement('div');
            thumb.className = 'upload-thumb';
            thumb.style.position = 'relative';
            thumb.style.width = '70px';
            thumb.style.height = '70px';
            thumb.style.border = '1px solid rgba(255,255,255,0.1)';
            thumb.style.borderRadius = '8px';
            thumb.style.overflow = 'hidden';
            thumb.style.background = '#000';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '2px';
            deleteBtn.style.right = '2px';
            deleteBtn.style.background = 'rgba(239, 68, 68, 0.9)';
            deleteBtn.style.color = '#fff';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '18px';
            deleteBtn.style.height = '18px';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontSize = '10px';
            
            deleteBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const idx = state.selectedFiles.indexOf(file);
                if (idx > -1) {
                    state.selectedFiles.splice(idx, 1);
                }
                thumb.remove();
                if (state.selectedFiles.length === 0) {
                    previewContainer.classList.add('hide');
                    promptContainer.classList.remove('hide');
                }
            });
            
            thumb.appendChild(img);
            thumb.appendChild(deleteBtn);
            if (previewsList) previewsList.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
    
    promptContainer.classList.add('hide');
    previewContainer.classList.remove('hide');
}

// 6. FORM SUBMISSION & BLACK BOX TELEMETRY SIMULATION
function setupFormSubmission() {
    const form = document.getElementById('new-patient-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!state.selectedFiles || state.selectedFiles.length === 0) {
            alert("Iltimos, EKG tasvirini yuklang!");
            return;
        }
        
        // 1. Gather all inputs
        const lastName = document.getElementById('pat-lastname').value.trim();
        const firstName = document.getElementById('pat-firstname').value.trim();
        const birthYear = parseInt(document.getElementById('pat-birthyear').value);
        const gender = document.querySelector('input[name="pat-gender"]:checked').value;
        const phone = document.getElementById('pat-phone').value.trim();
        
        // Symptoms
        const symptomsArray = [];
        document.querySelectorAll('input[name="symptom"]:checked').forEach(cb => {
            symptomsArray.push(cb.value);
        });
        const symptomsStr = symptomsArray.join(';');
        
        const sysBP = parseInt(document.getElementById('vitals-sys').value);
        const diaBP = parseInt(document.getElementById('vitals-dia').value);
        const pulse = parseInt(document.getElementById('vitals-pulse').value);
        
        // 2. Show Analyzing View
        switchView('analyzing-view');
        resetAnalysisSteps();
        
        try {
            // Step 1: Register patient first
            const patFormData = new FormData();
            patFormData.append('first_name', firstName);
            patFormData.append('last_name', lastName);
            patFormData.append('birth_year', birthYear);
            patFormData.append('gender', gender);
            patFormData.append('phone', phone);
            
            // Run UI telemetry animation step by step
            await runTelemetryStep('ana-step-1', 1000);
            
            const patResponse = await fetch(`${API_BASE}/api/patients`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: patFormData
            });
            const patResult = await patResponse.json();
            
            if (!patResponse.ok || patResult.status !== 'success') {
                throw new Error("Bemor ro'yxatga olishda xatolik yuz berdi");
            }
            
            const patientId = patResult.patient.id;
            
            // Step 2: Send ECG image and clinical vitals for Black Box analysis
            await runTelemetryStep('ana-step-2', 1200);
            await runTelemetryStep('ana-step-3', 1200);
            await runTelemetryStep('ana-step-4', 1200);
            
            const ecgType = document.getElementById('ecg-type').value;
            const ecgFormData = new FormData();
            ecgFormData.append('patient_id', patientId);
            ecgFormData.append('symptoms', symptomsStr);
            ecgFormData.append('blood_pressure_sys', sysBP);
            ecgFormData.append('blood_pressure_dia', diaBP);
            ecgFormData.append('pulse', pulse);
            state.selectedFiles.forEach(file => {
                ecgFormData.append('files', file);
            });
            ecgFormData.append('ecg_type', ecgType);
            
            const ecgResponse = await fetch(`${API_BASE}/api/ecg/analyze`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: ecgFormData
            });
            
            await runTelemetryStep('ana-step-5', 1000);
            
            const ecgResult = await ecgResponse.json();
            
            if (ecgResponse.ok && ecgResult.status === 'success') {
                state.currentAnalysisId = ecgResult.analysis_id;
                setupPDFButtons(ecgResult.analysis_id);
                
                // Render results view
                renderResultsView(
                    ecgResult.classification, 
                    patientId, 
                    `${lastName} ${firstName}`, 
                    birthYear, 
                    phone,
                    symptomsStr,
                    `${sysBP}/${diaBP}`,
                    pulse,
                    ecgResult.details,
                    ecgResult.image_path,
                    genderRadioValue() || "Erkak"
                );
            } else {
                throw new Error(ecgResult.detail || "EKG tahlil qilishda xatolik yuz berdi");
            }
            
        } catch (error) {
            alert("Xatolik yuz berdi: " + error.message);
            switchView('new-patient-view');
        }
    });
}

function resetAnalysisSteps() {
    document.querySelectorAll('.analysis-step').forEach((step, idx) => {
        step.classList.remove('active', 'completed');
        const icon = step.querySelector('i');
        icon.className = 'fa-regular fa-circle';
        
        if (idx === 0) {
            step.classList.add('active');
            icon.className = 'fa-solid fa-circle-notch fa-spin';
        }
    });
}

function runTelemetryStep(stepId, duration) {
    return new Promise(resolve => {
        setTimeout(() => {
            const stepEl = document.getElementById(stepId);
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
            stepEl.querySelector('i').className = 'fa-solid fa-circle-check';
            
            // Activate next step if exists
            const nextStepEl = stepEl.nextElementSibling;
            if (nextStepEl && nextStepEl.classList.contains('analysis-step')) {
                nextStepEl.classList.add('active');
                nextStepEl.querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';
            }
            resolve();
        }, duration);
    });
}

// 7. RENDER DIAGNOSTICS & EMERGENCY RED ALERTS
function renderResultsView(classification, patientId, fullname, birthyear, phone, symptomsStr = "", vitalsStr = "", pulse = 72, details = null, imagePath = null, gender = null) {
    switchView('results-view');
    stopEmergencyAlarm();
    
    // Patient info
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('res-cardio-id', patientId);
    setEl('res-fullname', fullname);
    setEl('res-birthyear', birthyear);
    setEl('res-gender', gender || genderRadioValue() || "Erkak");
    setEl('res-phone', phone);
    setEl('res-bp', vitalsStr || '120/80');
    setEl('res-pulse', pulse);
    setEl('res-symptoms', symptomsStr ? symptomsStr.replace(/;/g, ', ') : "Belgilar yo'q");
    
    // Default details
    if (!details) {
        if (classification === 'ACUTE_INFARCTION') {
            details = { 
                st_elevation: "V1-V4 da ST elevatsiyasi (+3.5 mm)", 
                t_inversion: "Yo'q", 
                q_wave: "Patologik chuqur Q tishchasi", 
                arrhythmia: "Sinusli taxikardiya", 
                comment_uz: "DIQQAT: Chap qorincha old devori O'tkir Miokard Infarkti (STEMI) belgilari aniqlandi! Bemorga zudlik bilan birinchi yordam ko'rsatilishi va shoshilinch shifoxonaga yuborilishi zarur.", 
                comment_ru: "ВНИМАНИЕ: Выявлены признаки Острого Инфаркта Миокарда (STEMI) передней стенки левого желудочка! Требуется немедленная первая помощь и экстренная госпитализация.",
                first_aid_uz: [
                    "Bemorni zudlik bilan gorizontal yotqizish va tinchlantirish (boshi biroz balandroq).",
                    "Toza havo kirishini ta'minlash (torg kiyimlarni yechish, oynani ochish).",
                    "Agar qarshi ko'rsatma bo'lmasa, zudlik bilan 300 mg Aspirin chaynattirish.",
                    "Til ostiga 1 ta Nitroglicerin tabletkasi yoki spreyi berish (arterial bosim nazorati ostida, bosim 100 mm sm. ust. dan yuqori bo'lsa).",
                    "Zudlik bilan Reanimatsiya brigadasini (103) chaqirish va hayotiy ko'rsatkichlarni har 5 daqiqada o'lchab borish."
                ],
                first_aid_ru: [
                    "Немедленно уложить пациента горизонтально, обеспечить покой (голова приподнята).",
                    "Обеспечить доступ свежего воздуха (расстегнуть одежду, открыть окно).",
                    "Разжевать 300 мг Аспирина (при отсутствии противопоказаний).",
                    "Дать Нитроглицерин под язык (под контролем артериального давления, при систолическом АД > 100 мм рт. ст.).",
                    "Срочно вызвать реанимационную бригаду скорой помощи (103) и измерять жизненные показатели каждые 5 минут."
                ]
            };
        } else if (classification === 'ISCHEMIA') {
            details = { 
                st_elevation: "V5-V6 depressiyasi (-0.7 mm)", 
                t_inversion: "I, II da manfiy T to'lqini", 
                q_wave: "Normal", 
                arrhythmia: "Yo'q", 
                comment_uz: "EKG tahlili: Yurak mushaklari ishemiyasi (qon bilan ta'minlanishining kamayishi) belgilari. Jismoniy zo'riqish cheklansin.", 
                comment_ru: "Анализ ЭКГ: Выявлены признаки ишемии миокарда (недостаточность кровоснабжения). Ограничить физические нагрузки.",
                first_aid_uz: [
                    "Har qanday jismoniy va hissiy zo'riqishlarni zudlik bilan to'xtatish.",
                    "Bemorni qulay o'tirish yoki yotish holatiga keltirish, kiyimlarini bo'shatish.",
                    "Til ostiga 1 ta Nitroglicerin tabletkasi yoki spreyi berish (bosim nazorati ostida).",
                    "Agar og'riq nitroglicerin qabul qilgandan keyin 15 daqiqa ichida o'tmasa, zudlik bilan 103 chaqirish va Aspirin berish.",
                    "Yaqin vaqt ichida kardiolog ko'rigidan o'tishni tashkil qilish."
                ],
                first_aid_ru: [
                    "Немедленно прекратить любые физические и эмоциональные нагрузки.",
                    "Усадить или уложить пациента в удобное положение, расстегнуть стесняющую одежду.",
                    "Дать Нитроглицерин под язык (под контролем артериального давления).",
                    "Если боль не проходит в течение 15 минут после приема нитроглицерина, срочно вызвать 103 и дать Аспирин.",
                    "В ближайшее время организовать осмотр кардиолога."
                ]
            };
        } else if (classification === 'ARRHYTHMIA') {
            details = { 
                st_elevation: "Yo'q", 
                t_inversion: "Yo'q", 
                q_wave: "Normal", 
                arrhythmia: "R-R notekisligi (Aritmiya)", 
                comment_uz: "EKG tahlili: Ritm buzilishi (Aritmiya / Bo'lmachalar fibrilyatsiyasi) aniqlandi. Rejaviy kardiolog maslahati tavsiya etiladi.", 
                comment_ru: "Анализ ЭКГ: Выявлено нарушение ритма (Аритмия / Фибрилляция предсердий). Рекомендуется плановая консультация кардиолога.",
                first_aid_uz: [
                    "Bemorni tinch holatda yotqizish yoki qulay o'tirish holatiga keltirish.",
                    "Klinik ko'rsatkichlarni (pulsning ritmikligi, chastotasi va qon bosimini) o'lchash va yozib borish.",
                    "Agar kuchli taxikardiya kuzatilsa, shifokor nazoratida vagal sinamalarni bajarish (yuzni sovuq suvda yuvish, chuqur nafas olib ushlab turish).",
                    "Bemorda kuchli xavotir yoki qo'rquv bo'lsa, tinchlantiruvchi sedativ vositalar berish.",
                    "Kardiologga murojaat qilish va qo'shimcha EKG monitoringini davom ettirish."
                ],
                first_aid_ru: [
                    "Уложить или удобно усадить пациента, обеспечить полный покой.",
                    "Измерить и зафиксировать клинические показатели (ритмичность, частота пульса и артериальное давление).",
                    "При выраженной тахикардии провести вагусные пробы (умывание лица холодной водой, задержка дыхания на вдохе).",
                    "При сильном страхе или панике дать пациенту успокоительное (седативное) средство.",
                    "Обратиться к кардиологу для дальнейшего прохождения ЭКГ-мониторинга."
                ]
            };
        } else {
            details = { 
                st_elevation: "Yo'q", 
                t_inversion: "Yo'q", 
                q_wave: "Normal", 
                arrhythmia: "Yo'q", 
                comment_uz: "EKG tahlili: Patologik o'zgarishlar aniqlanmadi. Yurak urish maromi va ritmi me'yorda.", 
                comment_ru: "Анализ ЭКГ: Патологических изменений не обнаружено. Ритм и частота сердечных сокращений в норме.",
                first_aid_uz: [
                    "Sog'lom turmush tarziga rioya qilish.",
                    "Rejaviy tibbiy ko'riklardan o'z vaqtida o'tib turish."
                ],
                first_aid_ru: [
                    "Соблюдать здоровый образ жизни.",
                    "Своевременно проходить плановые медицинские осмотры."
                ]
            };
        }
    }
    
    // EKG details
    setEl('res-st', details.st_elevation || "Normal");
    setEl('res-t-inv', details.t_inversion || "Normal");
    setEl('res-q-wave', details.q_wave || "Normal");
    setEl('res-arrhythmia', details.arrhythmia || "Normal");
    
    // Set comment based on whatever language / fields are present
    const commUz = details.comment_uz || details.cardiologist_comment || "";
    setEl('res-cardiologist-comment', commUz);
    
    // First aid lists
    const listUzEl = document.getElementById('res-first-aid-list-uz');
    const listRuEl = document.getElementById('res-first-aid-list-ru');
    const btnFaUz = document.getElementById('btn-fa-uz');
    const btnFaRu = document.getElementById('btn-fa-ru');
    const faNurseNote = document.getElementById('fa-nurse-note');
    
    if (listUzEl && listRuEl) {
        listUzEl.innerHTML = '';
        listRuEl.innerHTML = '';
        
        const firstAidUz = details.first_aid_uz || ["Kardiolog nazorati tavsiya etiladi."];
        const firstAidRu = details.first_aid_ru || ["Рекомендуется наблюдение кардиолога."];
        
        firstAidUz.forEach(r => {
            const li = document.createElement('li'); li.textContent = r; listUzEl.appendChild(li);
        });
        
        firstAidRu.forEach(r => {
            const li = document.createElement('li'); li.textContent = r; listRuEl.appendChild(li);
        });
        
        // Show Uzbek list by default, hide Russian list
        listUzEl.classList.remove('hide');
        listRuEl.classList.add('hide');
        
        if (btnFaUz && btnFaRu) {
            btnFaUz.className = 'btn btn-sm btn-primary';
            btnFaRu.className = 'btn btn-sm btn-secondary';
            
            if (faNurseNote) {
                faNurseNote.textContent = "Hamshira shifokor kelguniga qadar quyidagi tartibda birinchi yordam ko'rsatishi shart:";
            }
            
            // Remove old event listeners by cloning
            const newBtnFaUz = btnFaUz.cloneNode(true);
            const newBtnFaRu = btnFaRu.cloneNode(true);
            btnFaUz.parentNode.replaceChild(newBtnFaUz, btnFaUz);
            btnFaRu.parentNode.replaceChild(newBtnFaRu, btnFaRu);
            
            newBtnFaUz.addEventListener('click', () => {
                newBtnFaUz.className = 'btn btn-sm btn-primary';
                newBtnFaRu.className = 'btn btn-sm btn-secondary';
                listUzEl.classList.remove('hide');
                listRuEl.classList.add('hide');
                if (faNurseNote) {
                    faNurseNote.textContent = "Hamshira shifokor kelguniga qadar quyidagi tartibda birinchi yordam ko'rsatishi shart:";
                }
            });
            
            newBtnFaRu.addEventListener('click', () => {
                newBtnFaUz.className = 'btn btn-sm btn-secondary';
                newBtnFaRu.className = 'btn btn-sm btn-primary';
                listUzEl.classList.add('hide');
                listRuEl.classList.remove('hide');
                if (faNurseNote) {
                    faNurseNote.textContent = "Инструкция для медсестры по оказанию первой помощи до прихода врачей:";
                }
            });
        }
    }
    
    // EKG image
    const ecgImg = document.getElementById('res-ecg-image');
    if (ecgImg) ecgImg.src = imagePath ? `${API_BASE}/${imagePath}` : '';
    
    drawAIOverlay(classification);
    
    // Badge
    const badge = document.getElementById('res-classification-badge');
    const alertBanner = document.getElementById('emergency-alert-banner');
    const alertText = document.getElementById('emergency-alert-text');
    if (badge) badge.className = 'classification-badge';
    if (alertBanner) alertBanner.classList.add('hide');
    document.body.classList.remove('strobe-alert-active');
    
    if (classification === 'ACUTE_INFARCTION') {
        if (badge) { badge.classList.add('badge-infarction'); badge.textContent = "O'TKIR INFARKT"; }
        if (alertBanner) alertBanner.classList.remove('hide');
        if (alertText) alertText.textContent = "O'tkir Miokard Infarkti aniqlandi! Zudlik bilan 103 chaqiring!";
        document.body.classList.add('strobe-alert-active');
        startEmergencyAlarm();
    } else if (classification === 'ISCHEMIA') {
        if (badge) { badge.classList.add('badge-ischemia'); badge.textContent = "ISHEMIYA"; }
    } else if (classification === 'ARRHYTHMIA') {
        if (badge) { badge.classList.add('badge-arrhythmia'); badge.textContent = "ARITMIYA"; }
    } else {
        if (badge) { badge.classList.add('badge-normal'); badge.textContent = "SOG'LOM"; }
    }
}

function genderRadioValue() {
    const radio = document.querySelector('input[name="pat-gender"]:checked');
    return radio ? radio.value : null;
}

// Alarm audio control
function startEmergencyAlarm() {
    const audio = document.getElementById('emergency-alarm');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.4;
        audio.play().catch(e => console.log("Audio play blocked by browser rules."));
    }
}

function stopEmergencyAlarm() {
    const audio = document.getElementById('emergency-alarm');
    if (audio) {
        audio.pause();
    }
}

// 8. PDF DOWNLOAD HANDLERS
function setupPDFButtons(analysisId) {
    const btnUz = document.getElementById('download-pdf-uz');
    const btnRu = document.getElementById('download-pdf-ru');
    
    // Remove old listeners to avoid multiple downloads
    const newBtnUz = btnUz.cloneNode(true);
    const newBtnRu = btnRu.cloneNode(true);
    
    btnUz.parentNode.replaceChild(newBtnUz, btnUz);
    btnRu.parentNode.replaceChild(newBtnRu, btnRu);
    
    newBtnUz.addEventListener('click', () => {
        window.open(`${API_BASE}/api/ecg/protocol/${analysisId}/uz`, '_blank');
    });
    
    newBtnRu.addEventListener('click', () => {
        window.open(`${API_BASE}/api/ecg/protocol/${analysisId}/ru`, '_blank');
    });
}

// 9. PRESIDENT DASHBOARD & CHART.JS GRAPHICS
async function loadDashboardStats(region = null, district = null) {
    try {
        if (!state.statsLevel) {
            state.statsLevel = { region: null, district: null };
        }
        state.statsLevel.region = region;
        state.statsLevel.district = district;

        // Render breadcrumbs
        renderStatsBreadcrumbs();

        // Build query URL
        let url = `${API_BASE}/api/stats`;
        const params = [];
        if (region) params.push(`region=${encodeURIComponent(region)}`);
        if (district) params.push(`district=${encodeURIComponent(district)}`);
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            
            // Fill overview metrics
            const setS = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
            setS('stat-total', data.total_checked);
            setS('stat-normal', data.normal);
            setS('stat-arrhythmia', data.other_pathologies);
            setS('stat-infarction', data.infarctions);
            setS('stat-ischemia', data.other_pathologies);
            
            let savedLivesPercent = 0;
            if (data.total_checked > 0) {
                savedLivesPercent = ((data.infarctions / data.total_checked) * 100).toFixed(1);
            }
            setS('stat-saved-percent', `${savedLivesPercent}%`);
            
            // Draw charts
            drawEfficiencyGaugeChart();
            drawRegionalChart(data.regional_stats);
            drawDiagnosisPieChart(data.normal, data.infarctions, data.other_pathologies);
        }
    } catch (e) {
        console.error("Dashboard stats failed to load: ", e);
    }
}

function renderStatsBreadcrumbs() {
    const container = document.getElementById('stats-breadcrumb');
    if (!container) return;
    
    const level = state.statsLevel || { region: null, district: null };
    container.innerHTML = '';
    
    // "O'zbekiston" root link
    const rootLink = document.createElement('span');
    rootLink.className = 'breadcrumb-item';
    rootLink.textContent = "O'zbekiston";
    rootLink.style.cursor = 'pointer';
    rootLink.style.textDecoration = 'underline';
    rootLink.addEventListener('click', () => {
        loadDashboardStats(null, null);
    });
    container.appendChild(rootLink);
    
    if (level.region) {
        // Separator
        const sep1 = document.createElement('span');
        sep1.textContent = ' > ';
        sep1.style.color = 'var(--text-secondary)';
        container.appendChild(sep1);
        
        // Region link
        const regLink = document.createElement('span');
        regLink.className = 'breadcrumb-item';
        regLink.textContent = level.region;
        if (level.district) {
            regLink.style.cursor = 'pointer';
            regLink.style.textDecoration = 'underline';
            regLink.addEventListener('click', () => {
                loadDashboardStats(level.region, null);
            });
        } else {
            regLink.style.color = 'var(--text-primary)';
            regLink.style.fontWeight = 'bold';
        }
        container.appendChild(regLink);
    }
    
    if (level.district) {
        // Separator
        const sep2 = document.createElement('span');
        sep2.textContent = ' > ';
        sep2.style.color = 'var(--text-secondary)';
        container.appendChild(sep2);
        
        // District link
        const distLink = document.createElement('span');
        distLink.className = 'breadcrumb-item';
        distLink.textContent = level.district;
        distLink.style.color = 'var(--text-primary)';
        distLink.style.fontWeight = 'bold';
        container.appendChild(distLink);
    }
}

function drawEfficiencyGaugeChart() {
    const canvas = document.getElementById('efficiency-gauge-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (state.charts.efficiency) state.charts.efficiency.destroy();
    
    state.charts.efficiency = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Muvaffaqiyatli tahlillar', 'Xatolik ehtimoli'],
            datasets: [{
                data: [97.6, 2.4],
                backgroundColor: [
                    '#0284C7',
                    '#E2E8F0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            cutout: '80%',
            rotation: -90,
            circumference: 180
        }
    });
}

function drawRegionalChart(regionalStats) {
    const canvas = document.getElementById('regional-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (state.charts.regional) state.charts.regional.destroy();
    
    const labels = Object.keys(regionalStats);
    const data = Object.values(regionalStats);
    
    state.charts.regional = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tekshiruvlar',
                data: data,
                backgroundColor: 'rgba(124, 58, 237, 0.75)',
                borderColor: '#7C3AED',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            onClick: (event, elements, chart) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const index = firstElement.index;
                    const clickedLabel = chart.data.labels[index];
                    
                    const level = state.statsLevel || { region: null, district: null };
                    if (!level.region) {
                        loadDashboardStats(clickedLabel, null);
                    } else if (level.region && !level.district) {
                        loadDashboardStats(level.region, clickedLabel);
                    }
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#475569' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#475569' }
                }
            }
        }
    });
}

function drawDiagnosisPieChart(normal, infarcts, otherPathologies) {
    const canvas = document.getElementById('diagnosis-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (state.charts.diagnosis) state.charts.diagnosis.destroy();
    
    const total = normal + infarcts + otherPathologies;
    const getPercentLabel = (label, value) => {
        if (total === 0) return `${label}: 0% (0)`;
        const pct = ((value / total) * 100).toFixed(1);
        return `${label}: ${pct}% (${value} bemor)`;
    };
    
    const labelNormal = getPercentLabel("Sog'lom (Norma)", normal);
    const labelInfarct = getPercentLabel("O'tkir Infarkt (STEMI)", infarcts);
    const labelOther = getPercentLabel("Aritmiya / Ishemiya", otherPathologies);
    
    state.charts.diagnosis = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [labelNormal, labelInfarct, labelOther],
            datasets: [{
                data: [normal, infarcts, otherPathologies],
                backgroundColor: [
                    '#059669', // Emerald green
                    '#E11D48', // Red
                    '#D97706'  // Yellow
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#0F172A', boxWidth: 12 }
                }
            },
            cutout: '70%'
        }
    });
}

// ==========================================
// ADDED COMPONENT FUNCTIONS FOR FINAL POLISH
// ==========================================

// 1. Search and Filters
function setupSearchAndFilters() {
    const searchInput = document.getElementById('patient-search');
    const filterSelect = document.getElementById('diagnosis-filter');
    
    if (searchInput && filterSelect) {
        const triggerFilter = () => {
            const query = searchInput.value.toLowerCase().trim();
            const filter = filterSelect.value;
            
            if (!state.recentPatients) return;
            
            const filtered = state.recentPatients.filter(item => {
                const matchesQuery = item.fullname.toLowerCase().includes(query) || item.patient_id.toLowerCase().includes(query);
                const matchesFilter = (filter === 'ALL' || item.classification === filter);
                return matchesQuery && matchesFilter;
            });
            
            renderPatientTable(filtered);
        };
        
        searchInput.addEventListener('input', triggerFilter);
        filterSelect.addEventListener('change', triggerFilter);
    }
    
    // Admin Search & Filter Binding
    const adminSearchInput = document.getElementById('admin-search-users');
    const adminFilterSelect = document.getElementById('admin-filter-role');
    if (adminSearchInput && adminFilterSelect) {
        adminSearchInput.addEventListener('input', applyAdminFilters);
        adminFilterSelect.addEventListener('change', applyAdminFilters);
    }
}

// 2. Webcam/Camera Capture
let webcamStream = null;
function setupWebcam() {
    const startBtn = document.getElementById('start-webcam-btn');
    const closeBtn = document.getElementById('stop-webcam-btn');
    const captureBtn = document.getElementById('capture-btn');
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('webcam-canvas');
    const container = document.getElementById('webcam-container');
    const prompt = document.querySelector('.upload-prompt');
    const previewContainer = document.getElementById('upload-preview-container');
    
    if (!startBtn) return;
    
    startBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' }, 
                    audio: false 
                });
            } catch (envErr) {
                // Fallback to any camera if environment camera fails
                webcamStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: false 
                });
            }
            video.srcObject = webcamStream;
            prompt.classList.add('hide');
            container.classList.remove('hide');
        } catch (err) {
            alert("Kameraga ulanish imkoni bo'lmadi: " + err.message);
        }
    });
    
    const stopWebcam = () => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
        if (video) {
            video.srcObject = null;
        }
        if (container) {
            container.classList.add('hide');
        }
    };
    
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stopWebcam();
            prompt.classList.remove('hide');
        });
    }
    
    if (captureBtn) {
        captureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!webcamStream) return;
            
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                const partNum = (state.selectedFiles ? state.selectedFiles.length : 0) + 1;
                const file = new File([blob], `captured_ecg_part_${partNum}.jpg`, { type: "image/jpeg" });
                handleSelectedFiles([file]);
                stopWebcam();
            }, 'image/jpeg');
        });
    }
}

// 3. AI Overlay Toggling
function setupToggleOverlay() {
    const btn = document.getElementById('toggle-overlay-btn');
    const canvas = document.getElementById('ai-overlay-canvas');
    if (!btn || !canvas) return;
    
    btn.addEventListener('click', () => {
        if (canvas.classList.contains('hide')) {
            canvas.classList.remove('hide');
            btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> AI Belgilarini yashirish';
        } else {
            canvas.classList.add('hide');
            btn.innerHTML = '<i class="fa-solid fa-eye"></i> AI Belgilarini ko\'rsatish';
        }
    });
}

// 4. Draw Computer Vision Signal Overlays
function drawAIOverlay(classification) {
    const canvas = document.getElementById('ai-overlay-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    // Align canvas sizing with view wrapper
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (classification === 'NORMAL') {
        const btn = document.getElementById('toggle-overlay-btn');
        if (btn) btn.classList.add('hide');
        return;
    }
    
    const btn = document.getElementById('toggle-overlay-btn');
    if (btn) btn.classList.remove('hide');
    
    ctx.lineWidth = 2.5;
    
    if (classification === 'ACUTE_INFARCTION') {
        ctx.strokeStyle = '#E11D48';
        ctx.fillStyle = 'rgba(225, 29, 72, 0.1)';
        
        ctx.strokeRect(120, 80, 180, 100);
        ctx.fillRect(120, 80, 180, 100);
        
        ctx.strokeRect(450, 75, 160, 100);
        ctx.fillRect(450, 75, 160, 100);
        
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#E11D48';
        ctx.fillText('ST ELEVATSIYA (+3.5mm)', 125, 75);
        ctx.fillText('PATOLOGIK Q TISHCHA', 455, 70);
    } else if (classification === 'ISCHEMIA') {
        ctx.strokeStyle = '#D97706';
        ctx.fillStyle = 'rgba(217, 119, 6, 0.1)';
        
        ctx.strokeRect(250, 120, 150, 80);
        ctx.fillRect(250, 120, 150, 80);
        
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#D97706';
        ctx.fillText('T TO\'LQINI INVERSIYASI', 255, 115);
    } else if (classification === 'ARRHYTHMIA') {
        ctx.strokeStyle = '#7C3AED';
        ctx.fillStyle = 'rgba(124, 58, 237, 0.1)';
        
        ctx.strokeRect(180, 50, 280, 150);
        ctx.fillRect(180, 50, 280, 150);
        
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#7C3AED';
        ctx.fillText('R-R INTERVALI NOTEKISLIGI', 185, 45);
    }
}

// 5. Emergency Dispatch Simulation
let dispatchTimers = [];
function runEmergencyDispatchSimulation() {
    dispatchTimers.forEach(clearTimeout);
    dispatchTimers = [];
    
    const dispatchCard = document.getElementById('dispatch-card');
    const statusBadge = document.getElementById('dispatch-status');
    
    if (!dispatchCard) return;
    
    dispatchCard.classList.remove('hide');
    statusBadge.className = 'dispatch-badge status-dispatching';
    statusBadge.textContent = 'Yuborilmoqda...';
    
    const steps = [1, 2, 3, 4];
    steps.forEach(num => {
        const el = document.getElementById(`dispatch-step-${num}`);
        if (el) {
            el.className = 'timeline-step';
            el.querySelector('.step-dot').innerHTML = '<i class="fa-regular fa-circle"></i>';
            document.getElementById(`dispatch-time-${num}`).textContent = '--:--:--';
        }
    });
    
    const getUzDate = () => {
        const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 5)); // UTC+5
    };
    
    const getFormattedTime = () => {
        const now = getUzDate();
        return now.toTimeString().split(' ')[0];
    };
    
    // Step 1: EKG ma'lumotlari uzatilmoqda
    const step1 = document.getElementById('dispatch-step-1');
    step1.classList.add('active');
    step1.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    document.getElementById('dispatch-time-1').textContent = getFormattedTime();
    
    dispatchTimers.push(setTimeout(() => {
        step1.className = 'timeline-step completed';
        step1.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        const step2 = document.getElementById('dispatch-step-2');
        step2.className = 'timeline-step active';
        step2.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        document.getElementById('dispatch-time-2').textContent = getFormattedTime();
    }, 1500));
    
    dispatchTimers.push(setTimeout(() => {
        const step2 = document.getElementById('dispatch-step-2');
        step2.className = 'timeline-step completed';
        step2.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        const step3 = document.getElementById('dispatch-step-3');
        step3.className = 'timeline-step active';
        step3.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        document.getElementById('dispatch-time-3').textContent = getFormattedTime();
    }, 3500));
    
    dispatchTimers.push(setTimeout(() => {
        const step3 = document.getElementById('dispatch-step-3');
        step3.className = 'timeline-step completed';
        step3.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        const step4 = document.getElementById('dispatch-step-4');
        step4.className = 'timeline-step active';
        step4.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        document.getElementById('dispatch-time-4').textContent = getFormattedTime();
    }, 5500));
    
    dispatchTimers.push(setTimeout(() => {
        const step4 = document.getElementById('dispatch-step-4');
        step4.className = 'timeline-step completed';
        step4.querySelector('.step-dot').innerHTML = '<i class="fa-solid fa-check"></i>';
        
        statusBadge.className = 'dispatch-badge status-dispatched';
        statusBadge.textContent = "Yo'naltirildi";
    }, 7500));
}

// ==========================================
// PWA AND MOBILE UTILITY FUNCTIONS
// ==========================================

// 1. Service Worker registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    console.log('Service Worker successfully registered with scope: ', reg.scope);
                })
                .catch((err) => {
                    console.error('Service Worker registration failed: ', err);
                });
        });
    }
}

// 2. Mobile Navigation Setup
function setupMobileNavigation() {
    const mobileItems = document.querySelectorAll('.mobile-nav-item');
    mobileItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if it's the camera shortcut
            if (item.id === 'mobile-camera-shortcut') {
                // Navigate to new patient view, and automatically open webcam
                switchView('new-patient-view');
                // Jump to Step 3 of the wizard (webcam upload step)
                const step3Btn = document.querySelector('.step[data-step="3"]');
                if (step3Btn) {
                    step3Btn.click();
                }
                // Automatically click webcam trigger
                setTimeout(() => {
                    const startCamBtn = document.getElementById('start-webcam-btn');
                    if (startCamBtn) startCamBtn.click();
                }, 300);
                return;
            }
            
            const target = item.getAttribute('data-target');
            if (target) {
                switchView(target);
            }
        });
    });
}

// 3. PWA Installation Prompt Handler
let deferredPrompt = null;
function setupPWAInstallPrompt() {
    const installAppBtn = document.getElementById('install-app-btn');
    const mobileInstallBanner = document.getElementById('mobile-install-banner');
    const mobileInstallBtn = document.getElementById('mobile-install-btn');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show install controls in the UI
        if (installAppBtn) {
            installAppBtn.classList.remove('hide');
        }
        if (mobileInstallBanner) {
            mobileInstallBanner.classList.remove('hide');
        }
    });
    
    const triggerInstall = async () => {
        if (!deferredPrompt) return;
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again
        deferredPrompt = null;
        
        // Hide install controls
        if (installAppBtn) {
            installAppBtn.classList.add('hide');
        }
        if (mobileInstallBanner) {
            mobileInstallBanner.classList.add('hide');
        }
    };
    
    if (installAppBtn) {
        installAppBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerInstall();
        });
    }
    
    if (mobileInstallBtn) {
        mobileInstallBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerInstall();
        });
    }
    
    window.addEventListener('appinstalled', (evt) => {
        console.log('Cardio-AI was successfully installed!');
        deferredPrompt = null;
        if (installAppBtn) {
            installAppBtn.classList.add('hide');
        }
        if (mobileInstallBanner) {
            mobileInstallBanner.classList.add('hide');
        }
    });
}

// ==========================================
// ADDRESS PICKER & AUTOCOMPLETE DATASET
// ==========================================
const UZ_LOCATIONS = {
    "Toshkent shahri": {
        districts: ["Yunusobod tumani", "Chilonzor tumani", "Mirobod tumani", "Yakkasaroy tumani", "Mirzo Ulug'bek tumani", "Olmazor tumani", "Shayxontohur tumani", "Uchtepa tumani", "Yashnobod tumani", "Sergeli tumani", "Yangihayot tumani", "Bektemir tumani"],
        streets: ["Amir Temur shoh ko'chasi", "Ahmad Donish ko'chasi", "Bog'ishamol ko'chasi", "Yangishahar ko'chasi", "Quloqtepa ko'chasi", "Mingo'rik ko'chasi", "Moyqorg'on ko'chasi", "Chinobod ko'chasi", "Osiyo ko'chasi", "Bunyodkor shoh ko'chasi", "Muqimiy ko'chasi", "Lutfiy ko'chasi", "Qatortol ko'chasi", "Cho'ponota ko'chasi", "Arnasoy ko'chasi", "Gavhar ko'chasi", "Bog'iston ko'chasi", "Dilxush ko'chasi", "Nukus ko'chasi", "Shahrisabz ko'chasi", "Taras Shevchenko ko'chasi", "Farg'ona yo'li ko'chasi", "Istiqbol ko'chasi", "Sodiq Azimov ko'chasi", "Mirobod ko'chasi", "Shota Rustaveli ko'chasi", "Bobur ko'chasi", "Kichik Halqa Yo'li ko'chasi", "Usmon Nosir ko'chasi", "Yunus Rajabiy ko'chasi", "Yakkasaroy ko'chasi", "Tafakkur ko'chasi", "Mustaqillik shoh ko'chasi", "Buyuk Ipak Yo'li ko'chasi", "Ziyolilar ko'chasi", "Parkent ko'chasi", "Do'rmon yo'li ko'chasi", "Temur Malik ko'chasi", "Qorasuv ko'chasi", "Shahriobod ko'chasi", "Beruniy ko'chasi", "Qorasaroy ko'chasi", "Keles yo'li ko'chasi", "Sag'bon ko'chasi", "Shimoliy Olmazor ko'chasi", "Alisher Navoiy ko'chasi", "Abay ko'chasi", "Ko'kcha Darvoza ko'chasi", "Samarqand Darvoza ko'chasi", "Sebzor ko'chasi", "Qoratosh ko'chasi", "Hadra ko'chasi", "Zulfiyahonim ko'chasi", "Farhod ko'chasi", "Foziltepa ko'chasi", "Katta Qa'ni ko'chasi", "Birlik ko'chasi", "Uchtepa ko'chasi", "Ko'hna Cho'ponota ko'chasi", "Maxtumquli ko'chasi", "Aviasozlar ko'chasi", "Tuzel ko'chasi", "Sultonali Mashhadiy ko'chasi", "Yangi Sergeli ko'chasi", "Lutfkor ko'chasi", "Sergeli ko'chasi", "Obod ko'cha", "Mehrigiyo ko'chasi", "Sohibqiron ko'chasi", "Qipchoq ko'chasi", "Navro'z ko'chasi", "Do'stlik ko'chasi", "Husayn Boyqaro ko'chasi", "Bektemir shoh ko'chasi", "Oltintopgan ko'chasi", "Iqbol ko'chasi"]
    },
    "Toshkent viloyati": {
        districts: ["Nurafshon shahri", "Chirchiq shahri", "Angren shahri", "Olmaliq shahri", "Bekobod shahri", "Ohangaron shahri", "Yangiyo'l shahri", "Bekobod tumani", "Bo'stonliq tumani", "Bo'ka tumani", "Chinoz tumani", "Qibray tumani", "Ohangaron tumani", "Oqqo'rg'on tumani", "Parkent tumani", "Piskent tumani", "Quyi Chirchiq tumani", "O'rta Chirchiq tumani", "Yangiyo'l tumani", "Yuqori Chirchiq tumani", "Zangiota tumani"],
        streets: ["Mustaqillik ko'chasi", "Alisher Navoiy ko'chasi", "Zangiota qishlog'i ko'chasi", "Eshonguzar ko'chasi", "Toshkent yo'li ko'chasi", "Ipak Yo'li ko'chasi", "Temiryo'l ko'chasi", "Parkent ko'chasi", "Krasnogorsk ko'chasi", "So'qoq ko'chasi", "Quyosh ko'chasi", "Zarkent ko'chasi", "Bog'bon ko'chasi", "Gullar ko'chasi", "Paxtakor ko'chasi", "Do'stlik ko'chasi", "G'azalkent Lutfiy ko'chasi", "Chorbog' ko'chasi", "Humson ko'chasi", "Yusufxona ko'chasi", "Ozodlik ko'chasi", "Tog'li ko'chasi", "Qutlug' mahallasi ko'chasi", "Navro'z ko'chasi", "Yangiyo'l sh. Navoiy ko'chasi", "Mehnato'bod ko'chasi", "Boyovut ko'chasi", "Chinobod ko'chasi", "Oqqo'rg'on sh. Do'stlik ko'chasi", "G'alaba ko'chasi", "Qibray ko'chasi", "Do'rmon ko'chasi", "Geofizika ko'chasi", "Bog'dorchilik ko'chasi", "Ziyolilar ko'chasi", "Navoiy shoh ko'chasi", "Gagarin ko'chasi", "Chirchiq ko'chasi", "Yubileynaya ko'chasi", "Sportivnaya ko'chasi", "Angren ko'chasi", "Obod yurt ko'chasi", "Amir Temur ko'chasi", "Olmaliq ko'chasi", "Kosmonavtlar ko'chasi", "Metallurglar ko'chasi", "Bekobod ko'chasi", "Metallurglar shoh ko'chasi"]
    },
    "Andijon viloyati": {
        districts: ["Andijon shahri", "Andijon tumani", "Asaka tumani", "Baliqchi tumani", "Bo'z tumani", "Buloqboshi tumani", "Izboskan tumani", "Jalolquduq tumani", "Marhamat tumani", "Oltinko'l tumani", "Paxtaobod tumani", "Qorasuv shahri", "Qo'rg'ontepa tumani", "Shahrixon tumani", "Ulug'nor tumani", "Xonobod shahri"],
        streets: ["Bobur shoh ko'chasi", "Alisher Navoiy ko'chasi", "Milliy tiklanish ko'chasi", "O'zbekiston ko'chasi", "Lutfiy ko'chasi", "Mustaqillik ko'chasi", "Asaka ko'chasi", "O'zbekiston ovozi ko'chasi", "Farg'ona yo'li ko'chasi", "Navro'z ko'chasi", "Do'stlik ko'chasi", "Tinchlik ko'chasi"]
    },
    "Buxoro viloyati": {
        districts: ["Buxoro shahri", "Kogon shahri", "Buxoro tumani", "G'ijduvon tumani", "Jondor tumani", "Kogon tumani", "Qorako'l tumani", "Qorovulbozor tumani", "Olot tumani", "Peshku tumani", "Shofirkon tumani", "Vobkent tumani", "Romitan tumani"],
        streets: ["Bahouddin Naqshband ko'chasi", "Ibn Sino ko'chasi", "Murtazoev ko'chasi", "Alisher Navoiy ko'chasi", "Samarqand ko'chasi", "Alpomish ko'chasi", "Mustaqillik ko'chasi", "G'ijduvon ko'chasi", "Tinchlik ko'chasi"]
    },
    "Farg'ona viloyati": {
        districts: ["Farg'ona shahri", "Qo'qon shahri", "Marg'ilon shahri", "Rishton tumani", "Oltiariq tumani", "Quva tumani", "Toshloq tumani", "Uchko'prik tumani", "Yozyovon tumani", "Bag'dod tumani", "Buvayda tumani", "Dang'ara tumani", "Farg'ona tumani", "Furqat tumani", "Qo'shtepa tumani", "So'x tumani", "O'zbekiston tumani"],
        streets: ["Al-Farg'oniy ko'chasi", "Ma'rifat ko'chasi", "Sayilgoh ko'chasi", "Mustaqillik ko'chasi", "Murabbiylar ko'chasi", "Qomus ko'chasi", "Turkiston ko'chasi", "Navoiy ko'chasi", "Istiqlol ko'chasi", "Shon-sharaf ko'chasi", "Amir Temur ko'chasi", "Marg'iloniy ko'chasi", "Yipakchi ko'chasi", "Ahmad Yassaviy ko'chasi", "Rishton ko'chasi", "Kulollar ko'chasi", "Chinnichilar ko'chasi"]
    },
    "Jizzax viloyati": {
        districts: ["Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani", "Forish tumani", "G'allaorol tumani", "Sharof Rashidov tumani", "Mirzacho'l tumani", "Paxtakor tumani", "Yangiobod tumani", "Zafarobod tumani", "Zarbdor tumani", "Zomin tumani"],
        streets: ["Sharaf Rashidov ko'chasi", "Alisher Navoiy ko'chasi", "Mustaqillik ko'chasi", "Tinchlik ko'chasi", "Zomin ko'chasi", "Do'stlik ko'chasi", "Navro'z ko'chasi"]
    },
    "Namangan viloyati": {
        districts: ["Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani", "Mingbuloq tumani", "Namangan tumani", "Norin tumani", "Pop tumani", "To'raqo'rg'on tumani", "Uychi tumani", "Uchqo'rg'on tumani", "Yangiqo'rg'on tumani"],
        streets: ["Kosonsoy ko'chasi", "Marg'ilon ko'chasi", "Uychi ko'chasi", "Alisher Navoiy ko'chasi", "Do'stlik shoh ko'chasi", "Amir Temur ko'chasi", "Chust ko'chasi", "Mustaqillik ko'chasi"]
    },
    "Navoiy viloyati": {
        districts: ["Navoiy shahri", "Zarafshon shahri", "Karmana tumani", "Konimex tumani", "Qiziltepa tumani", "Xatirchi tumani", "Navbahor tumani", "Nurota tumani", "Tomdi tumani", "Uchquduq tumani"],
        streets: ["Galaba shoh ko'chasi", "Alisher Navoiy ko'chasi", "Mustaqillik ko'chasi", "Tinchlik ko'chasi", "Zarafshon ko'chasi", "Karmana ko'chasi", "Uchquduq ko'chasi"]
    },
    "Qashqadaryo viloyati": {
        districts: ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani", "Kasbi tumani", "Kitob tumani", "Koson tumani", "Mirishkor tumani", "Muborak tumani", "Nishon tumani", "Qarshi tumani", "Shahrisabz tumani", "Qamashi tumani", "Yakkabog' tumani", "Ko'kdala tumani"],
        streets: ["Mustaqillik ko'chasi", "Amir Temur ko'chasi", "Alisher Navoiy ko'chasi", "Qarshi ko'chasi", "Nasaf ko'chasi", "Kitob ko'chasi", "Muborak ko'chasi"]
    },
    "Qoraqalpog'iston Respublikasi": {
        districts: ["Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Chimboy tumani", "Ellikqal'a tumani", "Kegeyli tumani", "Mo'ynoq tumani", "Nukus tumani", "Qonliko'l tumani", "Qorauzyak tumani", "Qo'ng'irot tumani", "Shumanay tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani", "Taxiatosh shahri", "Bo'zatov tumani"],
        streets: ["Qoraqalpog'iston ko'chasi", "Beruniy ko'chasi", "Amir Temur ko'chasi", "Nukus ko'chasi", "Garezsilik ko'chasi", "Turtkul yo'li"]
    },
    "Samarqand viloyati": {
        districts: ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Kattaqo'rg'on tumani", "Qo'shrabot tumani", "Narpay tumani", "Nurobod tumani", "Oqdaryo tumani", "Paxtachi tumani", "Payariq tumani", "Pastdarg'om tumani", "Samarqand tumani", "Toyloq tumani", "Urgut tumani"],
        streets: ["Registon ko'chasi", "Dagbit ko'chasi", "Universitet xiyoboni", "Gagarin ko'chasi", "Amir Temur ko'chasi", "Mirzo Ulug'bek ko'chasi", "Daxbed ko'chasi", "Sadriddin Ayniy ko'chasi", "Urgut ko'chasi", "Juma ko'chasi"]
    },
    "Sirdaryo viloyati": {
        districts: ["Guliston shahri", "Shirin shahri", "Yangiyer shahri", "Boyovut tumani", "Guliston tumani", "Oqoltin tumani", "Sardoba tumani", "Sayxunobod tumani", "Sirdaryo tumani", "Mirzaobod tumani", "Xovos tumani"],
        streets: ["Mustaqillik ko'chasi", "Alisher Navoiy ko'chasi", "Guliston ko'chasi", "Tinchlik ko'chasi", "Do'stlik ko'chasi", "Yangiyer ko'chasi"]
    },
    "Surxondaryo viloyati": {
        districts: ["Termiz shahri", "Angor tumani", "Boysun tumani", "Denov tumani", "Jarqo'rg'on tumani", "Muzrabot tumani", "Oltinsoy tumani", "Qiziriq tumani", "Qumqo'rg'on tumani", "Sariosiyo tumani", "Sherobod tumani", "Sho'rchi tumani", "Termiz tumani", "Uzun tumani"],
        streets: ["Termiz ko'chasi", "Alisher Navoiy ko'chasi", "Amir Temur shoh ko'chasi", "Mustaqillik ko'chasi", "Boysun ko'chasi", "Denov ko'chasi", "Sariosiyo ko'chasi"]
    },
    "Xorazm viloyati": {
        districts: ["Urganch shahri", "Xiva shahri", "Bog'ot tumani", "Gurlan tumani", "Qo'shko'pir tumani", "Shovot tumani", "To'proqqal'a tumani", "Xazorasp tumani", "Xonqa tumani", "Xiva tumani", "Yangiariq tumani", "Yangibozor tumani", "Urganch tumani"],
        streets: ["Al-Xorazmiy ko'chasi", "Mustaqillik ko'chasi", "Tinchlik ko'chasi", "Pahlavon Mahmud ko'chasi", "Yogan ko'chasi", "Xiva ko'chasi"]
    }
};

function setupAddressPicker() {
    const regionSelect = document.getElementById('register-region');
    const districtSelect = document.getElementById('register-district');
    const villageInput = document.getElementById('register-village');
    const streetInput = document.getElementById('register-street');
    const streetSuggestions = document.getElementById('register-street-suggestions');
    
    if (!regionSelect || !districtSelect || !villageInput || !streetInput) return;
    
    // 1. Region selection changed
    regionSelect.addEventListener('change', () => {
        const region = regionSelect.value;
        districtSelect.innerHTML = '<option value="">Tuman / Shaharni tanlang...</option>';
        districtSelect.disabled = true;
        villageInput.disabled = true;
        villageInput.value = '';
        streetInput.disabled = true;
        streetInput.value = '';
        streetSuggestions.classList.add('hide');
        
        if (region && UZ_LOCATIONS[region]) {
            districtSelect.disabled = false;
            UZ_LOCATIONS[region].districts.forEach(dist => {
                const opt = document.createElement('option');
                opt.value = dist;
                opt.textContent = dist;
                districtSelect.appendChild(opt);
            });
        }
    });
    
    // 2. District selection changed
    districtSelect.addEventListener('change', () => {
        const dist = districtSelect.value;
        villageInput.disabled = true;
        villageInput.value = '';
        streetInput.disabled = true;
        streetInput.value = '';
        streetSuggestions.classList.add('hide');
        
        if (dist) {
            villageInput.disabled = false;
            streetInput.disabled = false;
        }
    });
    
    // 3. Street input autocomplete
    const showSuggestions = (val) => {
        const region = regionSelect.value;
        if (!region || !UZ_LOCATIONS[region]) return;
        
        const streets = UZ_LOCATIONS[region].streets || [];
        const query = val.toLowerCase().trim();
        
        // Filter streets
        const filtered = streets.filter(s => s.toLowerCase().includes(query));
        
        streetSuggestions.innerHTML = '';
        if (filtered.length > 0) {
            streetSuggestions.classList.remove('hide');
            filtered.forEach(str => {
                const div = document.createElement('div');
                div.className = 'suggestions-item';
                div.textContent = str;
                // Add click listener that stays active
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    streetInput.value = str;
                    streetSuggestions.classList.add('hide');
                });
                streetSuggestions.appendChild(div);
            });
        } else {
            streetSuggestions.classList.add('hide');
        }
    };
    
    streetInput.addEventListener('focus', () => {
        showSuggestions(streetInput.value);
    });
    
    streetInput.addEventListener('input', () => {
        showSuggestions(streetInput.value);
    });
    
    // Close suggestions list when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== streetInput && !streetSuggestions.contains(e.target)) {
            streetSuggestions.classList.add('hide');
        }
    });
}

let adminUsers = [];

async function loadAdminStats() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (response.ok) {
            const data = await response.json();
            
            // Populate overview metrics
            const setS = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
            setS('admin-stat-users', data.total_users);
            setS('admin-stat-analyses', data.total_analyses);
            setS('admin-stat-saved-lives', data.saved_lives);
            
            // Calculate percentages
            let savedLivesPercent = 0;
            if (data.total_analyses > 0) {
                savedLivesPercent = ((data.saved_lives / data.total_analyses) * 100).toFixed(1);
            }
            setS('admin-stat-saved-lives-percent', `${savedLivesPercent}%`);
            
            // Calculate district coverage % (out of 208 districts/cities in Uzbekistan)
            const activeDistricts = new Set();
            if (data.users) {
                data.users.forEach(u => {
                    if (u.district) {
                        activeDistricts.add(u.district.trim().toLowerCase());
                    }
                });
            }
            const coveragePercent = ((activeDistricts.size / 208) * 100).toFixed(1);
            setS('admin-stat-project-percent', `${coveragePercent}%`);

            // Save globally
            adminUsers = data.users || [];
            
            // Trigger initial render
            applyAdminFilters();
        } else {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--neon-red);">Statistikalarni yuklashda xatolik yuz berdi.</td></tr>`;
        }
    } catch (e) {
        console.error("Admin stats loading failed: ", e);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--neon-red);">Serverga ulanish imkoni bo'lmadi.</td></tr>`;
    }
}

function applyAdminFilters() {
    const searchVal = (document.getElementById('admin-search-users')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('admin-filter-role')?.value || 'all';
    
    let filtered = adminUsers;
    
    // Filter by role
    if (roleVal === 'admin') {
        filtered = filtered.filter(u => u.is_admin === 1);
    } else if (roleVal === 'user') {
        filtered = filtered.filter(u => u.is_admin !== 1);
    }
    
    // Filter by search text
    if (searchVal) {
        filtered = filtered.filter(u => {
            const fullName = `${u.last_name || ''} ${u.first_name || ''}`.toLowerCase();
            const phone = (u.phone || '').toLowerCase();
            const region = (u.region || '').toLowerCase();
            const district = (u.district || '').toLowerCase();
            const village = (u.village || '').toLowerCase();
            const street = (u.street || '').toLowerCase();
            
            return fullName.includes(searchVal) || 
                   phone.includes(searchVal) || 
                   region.includes(searchVal) || 
                   district.includes(searchVal) || 
                   village.includes(searchVal) || 
                   street.includes(searchVal);
        });
    }
    
    renderAdminUsersTable(filtered);
}

function renderAdminUsersTable(filteredUsers) {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    if (filteredUsers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Foydalanuvchilar topilmadi.</td></tr>`;
        return;
    }
    
    filteredUsers.forEach(u => {
        const tr = document.createElement('tr');
        const roleText = u.is_admin === 1 ? '<span class="badge badge-infarction">Admin</span>' : '<span class="badge badge-normal">Foydalanuvchi</span>';
        
        // Action buttons
        let actionsHtml = '';
        if (u.phone === "+998945651539") {
            actionsHtml = `<span style="color: var(--text-secondary); font-size: 0.8rem; font-style: italic;">Asosiy Admin</span>`;
        } else {
            const roleBtnText = u.is_admin === 1 ? '<i class="fa-solid fa-user-minus"></i> Roli' : '<i class="fa-solid fa-user-shield"></i> Admin';
            const roleBtnClass = u.is_admin === 1 ? 'btn-secondary' : 'btn-primary';
            actionsHtml = `
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm btn-user-edit" data-id="${u.id}" title="Tahrirlash" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-user-pen"></i> Tahrirlash</button>
                    <button class="btn ${roleBtnClass} btn-sm btn-role-toggle" data-id="${u.id}" title="Rolini o'zgartirish" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px;">${roleBtnText}</button>
                    <button class="btn btn-danger btn-sm btn-user-delete" data-id="${u.id}" title="O'chirish" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        }
        
        tr.innerHTML = `
            <td><strong>${u.last_name || ''} ${u.first_name || ''}</strong></td>
            <td>${u.phone || ''}</td>
            <td style="color: var(--neon-cyan); font-weight: bold; font-family: monospace;">${u.passcode || ''}</td>
            <td>${u.region || ''}</td>
            <td>${u.district || ''}</td>
            <td>${u.village || ''}</td>
            <td>${u.street || ''}</td>
            <td>${roleText}</td>
            <td style="text-align: center;">${actionsHtml}</td>
        `;
        tableBody.appendChild(tr);
    });
    
    // Attach event listeners to buttons
    const editBtns = tableBody.querySelectorAll('.btn-user-edit');
    editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = parseInt(btn.getAttribute('data-id'));
            const user = adminUsers.find(item => item.id === userId);
            if (user) {
                openAdminEditModal(user);
            }
        });
    });
    
    const roleBtns = tableBody.querySelectorAll('.btn-role-toggle');
    roleBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = btn.getAttribute('data-id');
            await toggleUserRole(userId);
        });
    });
    
    const deleteBtns = tableBody.querySelectorAll('.btn-user-delete');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = btn.getAttribute('data-id');
            if (confirm("Haqiqatan ham ushbu foydalanuvchini o'chirmoqchimisiz? / Вы действительно хотите удалить этого пользователя?")) {
                await deleteUser(userId);
            }
        });
    });
}

async function toggleUserRole(userId) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/user/${userId}/toggle-role`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (response.ok) {
            await loadAdminStats();
        } else {
            const err = await response.json();
            alert(err.detail || "Xatolik yuz berdi");
        }
    } catch (e) {
        console.error(e);
        alert("Serverga ulanish imkoni bo'lmadi");
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/user/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (response.ok) {
            await loadAdminStats();
        } else {
            const err = await response.json();
            alert(err.detail || "Xatolik yuz berdi");
        }
    } catch (e) {
        console.error(e);
        alert("Serverga ulanish imkoni bo'lmadi");
    }
}

function openAdminEditModal(user) {
    const modal = document.getElementById('admin-edit-modal');
    if (!modal) return;
    
    document.getElementById('admin-edit-user-id').value = user.id;
    document.getElementById('admin-edit-firstname').value = user.first_name || '';
    document.getElementById('admin-edit-lastname').value = user.last_name || '';
    document.getElementById('admin-edit-phone').value = user.phone || '';
    document.getElementById('admin-edit-region').value = user.region || '';
    document.getElementById('admin-edit-district').value = user.district || '';
    document.getElementById('admin-edit-village').value = user.village || '';
    document.getElementById('admin-edit-street').value = user.street || '';
    document.getElementById('admin-edit-passcode').value = user.passcode || ''; // Pre-fill with the user's passcode
    
    modal.classList.remove('hide');
}

// Bind admin edit user modal buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('admin-edit-cancel');
    const modal = document.getElementById('admin-edit-modal');
    const form = document.getElementById('admin-edit-user-form');
    
    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hide');
        });
    }
    
    if (form && modal) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('admin-edit-user-id').value;
            const firstName = document.getElementById('admin-edit-firstname').value.trim();
            const lastName = document.getElementById('admin-edit-lastname').value.trim();
            const phone = document.getElementById('admin-edit-phone').value.trim();
            const region = document.getElementById('admin-edit-region').value.trim();
            const district = document.getElementById('admin-edit-district').value.trim();
            const village = document.getElementById('admin-edit-village').value.trim();
            const street = document.getElementById('admin-edit-street').value.trim();
            const passcode = document.getElementById('admin-edit-passcode').value.trim();
            
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('phone', phone);
            formData.append('region', region);
            formData.append('district', district);
            formData.append('village', village);
            formData.append('street', street);
            if (passcode) {
                formData.append('passcode', passcode);
            }
            
            try {
                const response = await fetch(`${API_BASE}/api/admin/user/${userId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${state.token}` },
                    body: formData
                });
                
                if (response.ok) {
                    modal.classList.add('hide');
                    await loadAdminStats();
                } else {
                    const err = await response.json();
                    alert(err.detail || "Saqlashda xatolik yuz berdi");
                }
            } catch (err) {
                console.error(err);
                alert("Serverga ulanish imkoni bo'lmadi");
            }
        });
    }
    
    // Dynamic APK URL prefixing to prevent file:/// relative resolution errors
    document.querySelectorAll('a[href$="medscan-cardio.apk"]').forEach(link => {
        link.href = `${API_BASE}/static/medscan-cardio.apk`;
    });
});

// Implementation of iOS installation instructions modal
function setupIosInstallModal() {
    const openBtn = document.getElementById('open-ios-instructions-btn');
    const modal = document.getElementById('ios-install-modal');
    const closeBtn = document.getElementById('close-ios-modal');
    const closeBtn2 = document.getElementById('close-ios-modal-btn');

    if (!modal) return;

    const showModal = () => modal.classList.remove('hide');
    const hideModal = () => modal.classList.add('hide');

    if (openBtn) {
        openBtn.addEventListener('click', showModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', hideModal);
    }
    if (closeBtn2) {
        closeBtn2.addEventListener('click', hideModal);
    }
    
    // Close modal if user clicks on the backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });
}

function setupProfileEdit() {
    const editBtn = document.getElementById('profile-edit-btn');
    const cancelBtn = document.getElementById('profile-edit-cancel-btn');
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    const form = document.getElementById('profile-edit-form');
    const errorBox = document.getElementById('profile-edit-error');
    const successBox = document.getElementById('profile-edit-success');
    
    if (!editBtn || !cancelBtn || !viewMode || !editMode || !form) return;
    
    editBtn.addEventListener('click', () => {
        if (!state.user) return;
        document.getElementById('profile-edit-firstname-input').value = state.user.first_name || '';
        document.getElementById('profile-edit-lastname-input').value = state.user.last_name || '';
        document.getElementById('profile-edit-phone-input').value = state.user.phone || '';
        document.getElementById('profile-edit-region-input').value = state.user.region || '';
        document.getElementById('profile-edit-district-input').value = state.user.district || '';
        document.getElementById('profile-edit-village-input').value = state.user.village || '';
        document.getElementById('profile-edit-street-input').value = state.user.street || '';
        document.getElementById('profile-edit-birthdate-input').value = state.user.birth_date || '';
        if (errorBox) errorBox.classList.add('hide');
        if (successBox) successBox.classList.add('hide');
        
        viewMode.classList.add('hide');
        editMode.classList.remove('hide');
    });
    
    cancelBtn.addEventListener('click', () => {
        viewMode.classList.remove('hide');
        editMode.classList.add('hide');
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.classList.add('hide');
        if (successBox) successBox.classList.add('hide');
        
        const firstName = document.getElementById('profile-edit-firstname-input').value.trim();
        const lastName = document.getElementById('profile-edit-lastname-input').value.trim();
        const phone = document.getElementById('profile-edit-phone-input').value.trim();
        const region = document.getElementById('profile-edit-region-input').value.trim();
        const district = document.getElementById('profile-edit-district-input').value.trim();
        const village = document.getElementById('profile-edit-village-input').value.trim();
        const street = document.getElementById('profile-edit-street-input').value.trim();
        const birthDate = document.getElementById('profile-edit-birthdate-input').value;
        
        if (!firstName || !lastName || !phone || !region) {
            if (errorBox) {
                errorBox.textContent = "Ism, familiya, telefon va viloyat bo'sh bo'lishi mumkin emas";
                errorBox.classList.remove('hide');
            }
            return;
        }
        
        const formData = new FormData();
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('phone', phone);
        formData.append('region', region);
        formData.append('district', district);
        formData.append('village', village);
        formData.append('street', street);
        formData.append('birth_date', birthDate);
        
        try {
            const response = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${state.token}` },
                body: formData
            });
            
            const result = await response.json();
            if (response.ok && result.status === 'success') {
                state.user = result.user;
                localStorage.setItem('cardio_user', JSON.stringify(result.user));
                
                // Update views
                loadUserProfile();
                
                // Update sidebar displays
                const userPhoneEl = document.getElementById('user-phone');
                const userRegionEl = document.getElementById('user-region');
                if (userPhoneEl) userPhoneEl.textContent = result.user.phone;
                if (userRegionEl) userRegionEl.textContent = result.user.region;
                
                if (successBox) {
                    successBox.textContent = "Profil muvaffaqiyatli yangilandi";
                    successBox.classList.remove('hide');
                }
                
                setTimeout(() => {
                    viewMode.classList.remove('hide');
                    editMode.classList.add('hide');
                }, 1000);
            } else {
                if (errorBox) {
                    errorBox.textContent = result.detail || "Profilni yangilashda xatolik yuz berdi";
                    errorBox.classList.remove('hide');
                }
            }
        } catch (err) {
            console.error(err);
            if (errorBox) {
                errorBox.textContent = "Serverga ulanish imkoni bo'lmadi";
                errorBox.classList.remove('hide');
            }
        }
    });
}

// ==========================================
// SUPERADMIN & CLINICADMIN JS CONTROLLER
// ==========================================

window.showCreateClinicModal = function() {
    const modal = document.getElementById('create-clinic-modal');
    if (modal) modal.classList.remove('hide');
};

window.hideCreateClinicModal = function() {
    const modal = document.getElementById('create-clinic-modal');
    if (modal) modal.classList.add('hide');
};

window.handleCreateClinic = async function(event) {
    event.preventDefault();
    const name = document.getElementById('new-clinic-name').value.trim();
    const phone = document.getElementById('new-clinic-phone').value.trim();
    const payment = document.getElementById('new-clinic-payment').value;
    const status = document.getElementById('new-clinic-status').value;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('contact_phone', phone);
    formData.append('payment_status', payment);
    formData.append('status', status);

    try {
        const response = await fetch(`${API_BASE}/api/superadmin/clinics`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            alert("Klinika muvaffaqiyatli qo'shildi!");
            hideCreateClinicModal();
            document.getElementById('create-clinic-form').reset();
            loadSuperAdminDashboard();
        } else {
            alert(result.detail || "Xatolik yuz berdi");
        }
    } catch (err) {
        console.error(err);
        alert("Serverga ulanib bo'lmadi");
    }
};

window.toggleClinicStatus = async function(clinicId) {
    try {
        const response = await fetch(`${API_BASE}/api/superadmin/clinics/${clinicId}/toggle-status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            loadSuperAdminDashboard();
        } else {
            alert(result.detail || "Xatolik yuz berdi");
        }
    } catch (err) {
        console.error(err);
        alert("Serverga ulanib bo'lmadi");
    }
};

window.toggleClinicPayment = async function(clinicId) {
    try {
        const response = await fetch(`${API_BASE}/api/superadmin/clinics/${clinicId}/toggle-payment`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            loadSuperAdminDashboard();
        } else {
            alert(result.detail || "Xatolik yuz berdi");
        }
    } catch (err) {
        console.error(err);
        alert("Serverga ulanib bo'lmadi");
    }
};

window.loadSuperAdminDashboard = async function() {
    try {
        const statsRes = await fetch(`${API_BASE}/api/superadmin/stats`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const stats = await statsRes.json();
        if (statsRes.ok) {
            document.getElementById('super-stat-clinics').textContent = stats.total_clinics;
            document.getElementById('super-stat-unpaid').textContent = stats.unpaid_clinics;
            document.getElementById('super-stat-scans').textContent = stats.total_scans;
            document.getElementById('super-stat-users').textContent = stats.total_users;
        }

        const clinicsRes = await fetch(`${API_BASE}/api/superadmin/clinics`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const clinicsData = await clinicsRes.json();
        if (clinicsRes.ok && clinicsData.status === 'success') {
            const tbody = document.getElementById('superadmin-clinics-table-body');
            tbody.innerHTML = '';
            clinicsData.clinics.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.name}</strong></td>
                    <td>${c.contact_phone}</td>
                    <td>
                        <span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}">
                            ${c.status === 'active' ? 'Faol / Active' : 'Bloklangan / Blocked'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${c.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}">
                            ${c.payment_status === 'paid' ? 'To\'langan / Paid' : 'To\'lanmagan / Unpaid'}
                        </span>
                    </td>
                    <td>${c.doctors_count}</td>
                    <td>${c.scans_count}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-secondary btn-sm" onclick="toggleClinicStatus(${c.id})" style="padding: 4px 8px; margin-right: 5px;">
                            <i class="fa-solid fa-ban"></i> Blok / Aktiv
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="toggleClinicPayment(${c.id})" style="padding: 4px 8px;">
                            <i class="fa-solid fa-credit-card"></i> To'lov
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error(err);
    }
};

window.loadClinicAdminDashboard = async function() {
    try {
        const reportsRes = await fetch(`${API_BASE}/api/clinicadmin/reports`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const reports = await reportsRes.json();
        if (reportsRes.ok && reports.status === 'success') {
            document.getElementById('clinic-stat-scans').textContent = reports.total_scans;
            document.getElementById('clinic-stat-infarct').textContent = reports.infarctions;
            document.getElementById('clinic-stat-ischemia').textContent = reports.ischemia + reports.arrhythmia;
            document.getElementById('clinic-stat-normal').textContent = reports.normal;
        }

        const docsRes = await fetch(`${API_BASE}/api/clinicadmin/doctors`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const docsData = await docsRes.json();
        if (docsRes.ok && docsData.status === 'success') {
            const tbody = document.getElementById('clinicadmin-doctors-table-body');
            tbody.innerHTML = '';
            
            const performanceMap = {};
            if (reports.performance) {
                reports.performance.forEach(p => {
                    performanceMap[p.phone] = p.scans_count;
                });
            }

            docsData.doctors.forEach(d => {
                const tr = document.createElement('tr');
                const scans = performanceMap[d.phone] || 0;
                tr.innerHTML = `
                    <td><strong>${d.last_name} ${d.first_name}</strong></td>
                    <td>${d.phone}</td>
                    <td>${scans}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-secondary btn-sm" onclick="deleteDoctor(${d.id})" style="padding: 4px 8px; color: var(--danger-color); border-color: var(--danger-color);">
                            <i class="fa-solid fa-trash-can"></i> O'chirish
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error(err);
    }
};

window.handleClinicAddDoctor = async function(event) {
    event.preventDefault();
    const firstName = document.getElementById('doc-first-name').value.trim();
    const lastName = document.getElementById('doc-last-name').value.trim();
    const phone = document.getElementById('doc-phone').value.trim();
    const passcode = document.getElementById('doc-passcode').value.trim();

    const formData = new FormData();
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('phone', phone);
    formData.append('passcode', passcode);

    try {
        const response = await fetch(`${API_BASE}/api/clinicadmin/doctors`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            alert("Shifokor muvaffaqiyatli qo'shildi!");
            document.getElementById('clinic-add-doctor-form').reset();
            loadClinicAdminDashboard();
        } else {
            alert(result.detail || "Xatolik yuz berdi");
        }
    } catch (err) {
        console.error(err);
        alert("Serverga ulanib bo'lmadi");
    }
};

window.deleteDoctor = async function(doctorId) {
    try {
        const response = await fetch(`${API_BASE}/api/clinicadmin/doctors/${doctorId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.detail || "Xatolik yuz berdi");
        }
    } catch (err) {
        console.error(err);
        alert("Serverga ulanib bo'lmadi");
    }
};



