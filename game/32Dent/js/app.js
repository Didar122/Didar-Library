// ==========================================
// 32 DENT - Firestore + Firebase Auth Integration
// ==========================================

// Global state
let appState = {
  currentPage: 'dashboard',
  currentUser: null,
  currentPatientId: null,
  patients: [],
  appointments: [],
  transactions: [],
  doctors: [],
  treatments: [],
  activityLogs: [],
  whiteboardItems: [],
  shoppingItems: [],
  language: localStorage.getItem('language') || 'en',
  unsubscribers: [], // Track Firestore listeners
  pagination: {
    patients: { currentPage: 1, itemsPerPage: 20 },
    doctors: { currentPage: 1, itemsPerPage: 20 },
    appointments: { currentPage: 1, itemsPerPage: 20 },
    transactions: { currentPage: 1, itemsPerPage: 20 },
    activityLogs: { currentPage: 1, itemsPerPage: 30 }
  },
  searchFilters: {
    patients: '',
    appointments: '',
    doctors: '',
    transactions: ''
  }
};

// Firebase
let db = null;

// Form submission state to prevent duplicate submissions
let isSubmitting = false;

// ==========================================
// SEARCH FUNCTIONS
// ==========================================

function searchPatients() {
  const searchTerm = document.getElementById('patientsSearchInput').value.toLowerCase();
  appState.searchFilters.patients = searchTerm;
  appState.pagination.patients.currentPage = 1;
  loadPatientsTable();
}

function searchAppointments() {
  const searchTerm = document.getElementById('appointmentsSearchInput').value.toLowerCase();
  appState.searchFilters.appointments = searchTerm;
  appState.pagination.appointments.currentPage = 1;
  loadAppointmentsTable();
}

function searchDoctors() {
  const searchTerm = document.getElementById('doctorsSearchInput').value.toLowerCase();
  appState.searchFilters.doctors = searchTerm;
  appState.pagination.doctors.currentPage = 1;
  loadDoctorsTable();
}

function searchTransactions() {
  const searchTerm = document.getElementById('transactionsSearchInput').value.toLowerCase();
  appState.searchFilters.transactions = searchTerm;
  appState.pagination.transactions.currentPage = 1;
  loadTransactionsTable();
}

function matchesSearchFilter(name, phone, searchTerm) {
  if (!searchTerm) return true;
  const nameMatch = name.toLowerCase().includes(searchTerm);
  const phoneMatch = phone.toLowerCase().includes(searchTerm);
  return nameMatch || phoneMatch;
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeApp();
});

// Service Worker registration for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed', err));
  }
}

// Theme initialization
function initializeTheme() {
  const savedTheme = localStorage.getItem('32dentTheme') || 'light';
  setTheme(savedTheme, false); // false = don't save (already saved)
}

// Set theme function
function setTheme(theme, save = true) {
  // Apply theme to document
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    // Update sidebar logo to icon2.png for dark theme
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if (sidebarLogo) {
      sidebarLogo.src = 'assets/icon2.png';
    }
    // Update header logo to icon2.png for dark theme
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
      const img = headerLogo.querySelector('img');
      if (img) {
        img.src = 'assets/icon2.png?v=1';
      }
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    // Update sidebar logo to icon.png for light theme
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if (sidebarLogo) {
      sidebarLogo.src = 'assets/icon.png';
    }
    // Update header logo to icon.png for light theme
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
      const img = headerLogo.querySelector('img');
      if (img) {
        img.src = 'assets/icon.png?v=1';
      }
    }
  }
  
  // Save preference to localStorage
  if (save) {
    localStorage.setItem('32dentTheme', theme);
  }
  
  // Update theme card highlights
  updateThemeCardHighlight(theme);
}

// Update theme card visual highlight
function updateThemeCardHighlight(theme) {
  const lightCard = document.getElementById('themeCardLight');
  const darkCard = document.getElementById('themeCardDark');
  
  if (lightCard && darkCard) {
    if (theme === 'dark') {
      lightCard.style.borderColor = '#ddd';
      lightCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      darkCard.style.borderColor = '#c9a961';
      darkCard.style.boxShadow = '0 0 0 3px rgba(201, 169, 97, 0.2)';
    } else {
      lightCard.style.borderColor = '#1a6e6d';
      lightCard.style.boxShadow = '0 0 0 3px rgba(26, 110, 109, 0.15)';
      darkCard.style.borderColor = '#555';
      darkCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    }
  }
}

// Initialize app
function initializeApp() {
  registerServiceWorker();
  
  // Wait for Firebase to initialize
  let attempts = 0;
  const maxAttempts = 50; // Try for up to 5 seconds
  
  const checkFirebase = () => {
    if (window.firebaseDB && window.firebaseReady) {
      console.log('Firebase ready, starting app');
      db = window.firebaseDB;
      startApp();
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(checkFirebase, 100);
    } else {
      console.error('Firebase initialization timeout');
      alert('Failed to initialize Firebase. Please refresh the page.');
    }
  };
  
  checkFirebase();
}

// Start the app (after loading screen)
function startApp() {
  // Set initial language
  const savedLang = localStorage.getItem('language') || 'en';
  appState.language = savedLang;
  setLanguage(savedLang);
  
  // Check if user is logged in (from localStorage)
  const loggedInUser = localStorage.getItem('32dentCurrentUser');
  
  // Show dashboard immediately and hide loading
  document.getElementById('loadingScreen').classList.add('hidden');
  
  if (loggedInUser) {
    // User is logged in, restore session
    appState.currentUser = JSON.parse(loggedInUser);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    // Load data from Firestore in real-time
    const startLoading = async () => {
      try {
        await loadFromFirestore();
        // Wait a bit for data to populate
        await new Promise(resolve => setTimeout(resolve, 300));
        updateProfileButtonWithUser();
        navigateTo('dashboard');
      } catch (error) {
        console.error('Error loading from Firestore:', error);
        updateProfileButtonWithUser();
        navigateTo('dashboard');
      }
    };
    
    startLoading();
  } else {
    // Show login screen
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

// Update profile button with logged-in user name
function updateProfileButtonWithUser() {
  const profileBtn = document.querySelector('.sidebar-item.sidebar-profile-btn');
  const profilePicContainer = document.querySelector('.profile-pic-container');
  
  if (profileBtn && appState.currentUser) {
    const userName = appState.currentUser.staffName || appState.currentUser.email?.split('@')[0] || 'Profile';
    const fullUserData = CLINIC_USERS.find(u => u.id === appState.currentUser.id) || appState.currentUser;
    const userPicture = fullUserData.picture || 'user1.png';
    
    if (profilePicContainer) {
      profilePicContainer.style.backgroundImage = `url('assets/${userPicture}')`;
    }
    
    // Update the span with user name
    const nameSpan = profileBtn.querySelector('span');
    if (nameSpan) {
      nameSpan.textContent = escapeHtml(userName);
    }
    
    profileBtn.className = 'sidebar-item sidebar-profile-btn';
  }
}

// ==========================================
// AUTHENTICATION (Simple localStorage)
// ==========================================

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  // Validate user credentials from users.js
  const user = validateUser(email, password);
  
  if (user) {
    // Create session user object
    const currentUser = {
      id: user.id,
      email: user.email,
      clinicName: user.clinicName,
      staffName: user.staffName
    };
    
    // Save to localStorage for session persistence
    localStorage.setItem('32dentCurrentUser', JSON.stringify(currentUser));
    appState.currentUser = currentUser;
    
    // Hide login, show app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    // Load data from Firestore
    try {
      await loadFromFirestore();
    } catch (error) {
      console.error('Error loading from Firestore:', error);
    }
    
    loadDashboard();
    updateProfileButtonWithUser();
    navigateTo('dashboard');
    
    // Clear password field
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  } else {
    alert('Invalid email or password!');
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    // Remove session
    localStorage.removeItem('32dentCurrentUser');
    appState.currentUser = null;
    
    // Unsubscribe from all Firestore listeners
    appState.unsubscribers.forEach(unsubscribe => unsubscribe());
    appState.unsubscribers = [];
    
    // Clear all cached data to prevent data from showing for wrong user
    appState.patients = [];
    appState.doctors = [];
    appState.appointments = [];
    appState.treatments = [];
    appState.transactions = [];
    appState.activityLogs = [];
    appState.whiteboardItems = [];
    appState.shoppingItems = [];
    
    // Hide app, show login
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    // Clear forms
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  }
}

// ==========================================
// DATA MANAGEMENT (Firestore)
// ==========================================

async function loadFromFirestore() {
  if (!appState.currentUser) return;
  
  try {
    const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Unsubscribe from previous listeners
    appState.unsubscribers.forEach(unsubscribe => unsubscribe());
    appState.unsubscribers = [];
    
    // Real-time listener for patients (ALL patients visible to all users)
    const patientsRef = collection(db, 'patients');
    const unsubPatients = onSnapshot(patientsRef, (snapshot) => {
      appState.patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadPatientsTable();
      updatePatientsDropdowns();
      updatePageLanguage();
    });
    appState.unsubscribers.push(unsubPatients);
    
    // Real-time listener for doctors (ALL doctors visible to all users)
    const doctorsRef = collection(db, 'doctors');
    const unsubDoctors = onSnapshot(doctorsRef, (snapshot) => {
      appState.doctors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadDoctorsTable();
      updatePatientsDropdowns();
      updatePageLanguage();
    });
    appState.unsubscribers.push(unsubDoctors);
    
    // Real-time listener for appointments (ALL appointments visible to all users)
    const appointmentsRef = collection(db, 'appointments');
    const unsubAppointments = onSnapshot(appointmentsRef, (snapshot) => {
      appState.appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadDashboard();
    });
    appState.unsubscribers.push(unsubAppointments);
    
    // Real-time listener for treatments
    const treatmentsRef = collection(db, 'treatments');
    const unsubTreatments = onSnapshot(treatmentsRef, (snapshot) => {
      appState.treatments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });
    appState.unsubscribers.push(unsubTreatments);
    
    // Real-time listener for transactions
    const transactionsRef = collection(db, 'transactions');
    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      appState.transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadDashboard();
    });
    appState.unsubscribers.push(unsubTransactions);
    
    // Real-time listener for whiteboard items
    const whiteboardRef = collection(db, 'whiteboard');
    const unsubWhiteboard = onSnapshot(whiteboardRef, (snapshot) => {
      appState.whiteboardItems = [];
      snapshot.forEach((doc) => {
        appState.whiteboardItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      if (appState.currentPage === 'dashboard') {
        loadDashboard();
      }
    });
    appState.unsubscribers.push(unsubWhiteboard);
    
    // Real-time listener for shopping items
    const shoppingRef = collection(db, 'shopping');
    const unsubShopping = onSnapshot(shoppingRef, (snapshot) => {
      appState.shoppingItems = [];
      snapshot.forEach((doc) => {
        appState.shoppingItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      if (appState.currentPage === 'dashboard' || appState.currentPage === 'shopping') {
        loadDashboard();
      }
    });
    appState.unsubscribers.push(unsubShopping);
    
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    alert('Error loading data: ' + error.message);
  }
}

async function saveToFirestore(collection, docId, data) {
  if (!appState.currentUser) {
    throw new Error('No user logged in');
  }
  
  if (!db) {
    throw new Error('Firestore database not initialized');
  }
  
  try {
    const { doc, setDoc, addDoc, collection: firestoreCollection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Add userId to all documents for security and data isolation
    const dataWithUser = {
      ...data,
      userId: appState.currentUser.id,  // Use localStorage user id
      updatedAt: new Date().toISOString()
    };
    
    console.log(`Saving to Firestore: collection=${collection}, data=`, dataWithUser);
    
    if (docId) {
      // Update existing document
      await setDoc(doc(db, collection, docId), dataWithUser, { merge: true });
      console.log(`Updated document in ${collection}: ${docId}`);
      return docId;
    } else {
      // Let Firestore generate document ID
      const result = await addDoc(firestoreCollection(db, collection), dataWithUser);
      console.log(`Added document to ${collection}: ${result.id}`);
      return result.id;
    }
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    alert('Error saving data: ' + error.message);
    throw error;
  }
}

async function deleteFromFirestore(collection, docId) {
  if (!appState.currentUser) {
    throw new Error('No user logged in');
  }
  
  try {
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    return await deleteDoc(doc(db, collection, docId));
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
    throw error;
  }
}

// ==========================================
// DATA EXPORT
// ==========================================

function exportAppData() {
  const exportData = {
    clinic: appState.currentUser.clinicName,
    staff: appState.currentUser.staffName,
    exportDate: new Date().toISOString(),
    patients: appState.patients,
    appointments: appState.appointments,
    doctors: appState.doctors,
    treatments: appState.treatments,
    transactions: appState.transactions
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `32dent_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully!');
}

// ==========================================
// NAVIGATION
// ==========================================

function navigateTo(page) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show current section
  const sectionId = page + 'Section';
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
  }
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');
  
  // Update header
  const headerTitle = document.querySelector('.header-title span');
  if (headerTitle) {
    headerTitle.textContent = t(page);
  }
  
  // Update app state
  appState.currentPage = page;
  
  // Load page-specific content
  switch(page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'patients':
      loadPatientsPage();
      break;
    case 'appointments':
      loadAppointmentsPage();
      break;
    case 'doctors':
      loadDoctorsPage();
      break;
    case 'allStaff':
      loadAllStaffPage();
      break;
    case 'financial':
      loadFinancialPage();
      break;
    case 'settings':
      loadSettingsPage();
      break;
    case 'shopping':
      displayShoppingItems();
      break;
  }
}

// ==========================================
// PAGINATION UTILITIES
// ==========================================

function createPaginationControls(tableType, totalItems) {
  const paginationDiv = document.getElementById(`${tableType}Pagination`);
  if (!paginationDiv) return;
  
  const itemsPerPage = appState.pagination[tableType].itemsPerPage;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPage = appState.pagination[tableType].currentPage;
  
  if (totalPages <= 1) {
    paginationDiv.innerHTML = '';
    return;
  }
  
  let html = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 1.5rem;">
      <button onclick="setPageForTable('${tableType}', 1)" class="pagination-btn" style="padding: 0.5rem 0.75rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 0.25rem;">First</button>
      <button onclick="setPageForTable('${tableType}', ${Math.max(1, currentPage - 1)})" class="pagination-btn" style="padding: 0.5rem 0.75rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 0.25rem;">Previous</button>
  `;
  
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    html += `
      <button onclick="setPageForTable('${tableType}', ${i})" style="padding: 0.5rem 0.75rem; border: 1px solid ${isActive ? 'var(--primary-teal)' : '#ddd'}; background: ${isActive ? 'var(--primary-teal)' : 'white'}; color: ${isActive ? 'white' : 'var(--dark-gray)'}; cursor: pointer; border-radius: 0.25rem; min-width: 32px;">${i}</button>
    `;
  }
  
  html += `
      <button onclick="setPageForTable('${tableType}', ${Math.min(totalPages, currentPage + 1)})" class="pagination-btn" style="padding: 0.5rem 0.75rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 0.25rem;">Next</button>
      <button onclick="setPageForTable('${tableType}', ${totalPages})" class="pagination-btn" style="padding: 0.5rem 0.75rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 0.25rem;">Last</button>
      <span style="margin-left: 1rem; color: var(--text-muted);">Page <span style="font-weight: 600;">${currentPage}</span> of <span style="font-weight: 600;">${totalPages}</span></span>
      <input type="number" min="1" max="${totalPages}" id="${tableType}GoToPageInput" placeholder="Go to page" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem; width: 100px; margin-left: 0.5rem;" onkeydown="if(event.key==='Enter') setPageForTable('${tableType}', parseInt(document.getElementById('${tableType}GoToPageInput').value) || 1)">
    </div>
  `;
  
  paginationDiv.innerHTML = html;
}

function setPageForTable(tableType, page) {
  const itemsPerPage = appState.pagination[tableType].itemsPerPage;
  const totalItems = appState[tableType].length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (page >= 1 && page <= totalPages) {
    appState.pagination[tableType].currentPage = page;
    
    // Reload the appropriate table
    switch (tableType) {
      case 'patients':
        loadPatientsTable();
        break;
      case 'doctors':
        loadDoctorsTable();
        break;
      case 'appointments':
        loadAppointmentsTable();
        break;
      case 'transactions':
        loadTransactionsTable();
        break;
    }
  }
}

function getPaginatedItems(tableType, items) {
  const itemsPerPage = appState.pagination[tableType].itemsPerPage;
  const currentPage = appState.pagination[tableType].currentPage;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  return items.slice(startIdx, endIdx);
}

// ==========================================
// DASHBOARD (UPDATED)
// ==========================================

// Update dashboard stats without switching sections
function updateDashboardStats() {
  const totalPatientsEl = document.getElementById('totalPatientsCount');
  const todayAppointmentsEl = document.getElementById('todayAppointmentsCount');
  const recentListEl = document.getElementById('recentPatientsList');
  
  if (totalPatientsEl) {
    totalPatientsEl.textContent = appState.patients.length;
  }
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
  
  if (todayAppointmentsEl) {
    const todayAppointments = appState.appointments.filter(a => 
      a.date === todayString && 
      (a.status?.toLowerCase() === 'scheduled' || a.status?.toLowerCase() === 'outdated')
    );
    todayAppointmentsEl.textContent = todayAppointments.length;
  }
  
  // Load recent patients
  if (recentListEl) {
    const recent = appState.patients.slice(-5).reverse();
    
    if (recent.length === 0) {
      recentListEl.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;" data-i18n="noData">No Data</p>`;
    } else {
      recentListEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${recent.map(p => `
            <div style="padding: 1rem; border-bottom: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: var(--primary-teal);">${p.name}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">${p.phone}</div>
              </div>
              <button class="btn btn-secondary" onclick="viewPatientProfile('${p.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                <i class="fas fa-eye"></i> ${t('view')}
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
}

function loadDashboard() {
  // Update dashboard stats (navigateTo() handles section visibility)
  updateDashboardStats();
  updatePageLanguage();
  
  // Display whiteboard and shopping items on dashboard
  displayWhiteboardItems();
  displayDashboardShoppingList();
}

// ==========================================
// PATIENTS MANAGEMENT (UPDATED)
// ==========================================

function loadPatientsPage() {
  loadPatientsTable();
  updatePatientsDropdowns();
}

function loadPatientsTable() {
  const list = document.getElementById('patientsList');
  
  // Prevent error if element doesn't exist yet
  if (!list) return;
  
  // Filter patients based on search
  const filteredPatients = appState.patients.filter(p => 
    matchesSearchFilter(p.name, p.phone, appState.searchFilters.patients)
  );
  
  if (filteredPatients.length === 0) {
    list.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 2rem; color: var(--text-muted);" data-i18n="noData">No Data</td></tr>`;
    createPaginationControls('patients', 0);
  } else {
    // Get paginated items from filtered list
    const paginatedPatients = getPaginatedItems('patients', filteredPatients);
    
    list.innerHTML = paginatedPatients.map(p => `
      <tr onclick="openPatientDetailsModal('${p.id}')" style="cursor: pointer; transition: background-color 0.2s;">
        <td>${p.name}</td>
        <td>${p.phone}</td>
      </tr>
    `).join('');
    
    createPaginationControls('patients', filteredPatients.length);
  }
  
  updatePageLanguage();
}

function openPatientDetailsModal(patientId) {
  const patient = appState.patients.find(p => p.id === patientId);
  if (!patient) return;
  
  // Use viewPatientProfile to show the full profile view with proper modal styling
  viewPatientProfile(patientId);
}

function openAddPatientModal() {
  document.getElementById('addPatientForm').reset();
  openModal('addPatientModal');
}

async function savePatient(event) {
  event.preventDefault();
  
  if (isSubmitting) return; // Prevent duplicate submissions
  isSubmitting = true;
  
  const patient = {
    name: document.getElementById('patientNameInput').value,
    phone: document.getElementById('patientPhoneInput').value,
    age: document.getElementById('patientAgeInput').value || 0,
    address: document.getElementById('patientAddressInput').value,
    illness: document.getElementById('patientIllnessInput').value,
    notes: document.getElementById('patientNotesInput').value,
    createdBy: appState.currentUser.staffName,
    createdAt: new Date().toISOString()
  };
  
  try {
    const docRef = await saveToFirestore('patients', null, patient);
    
    closeModal('addPatientModal');
    showNotification(t('success'));
    
    // Clear form
    document.getElementById('addPatientForm').reset();
  } catch (error) {
    console.error('Error saving patient:', error);
    showNotification('Error saving patient: ' + error.message);
  } finally {
    isSubmitting = false;
  }
}

function deletePatient(id) {
  const patient = appState.patients.find(p => p.id === id);
  
  if (confirm('Are you sure you want to delete this patient?')) {
    deleteFromFirestore('patients', id)
      .then(async () => {
        // Delete related appointments, treatments, and transactions
        appState.appointments.forEach(a => {
          if (a.patientId === id) deleteFromFirestore('appointments', a.id);
        });
        appState.treatments.forEach(t => {
          if (t.patientId === id) deleteFromFirestore('treatments', t.id);
        });
        appState.transactions.forEach(t => {
          if (t.patientId === id) deleteFromFirestore('transactions', t.id);
        });
      })
      .catch(error => alert('Error deleting patient: ' + error.message));
  }
}

function openEditPatientModal(patientId) {
  const patient = appState.patients.find(p => p.id === patientId);
  if (!patient) return;
  
  document.getElementById('editPatientId').value = patientId;
  document.getElementById('editPatientNameInput').value = patient.name;
  document.getElementById('editPatientPhoneInput').value = patient.phone;
  document.getElementById('editPatientAgeInput').value = patient.age || '';
  document.getElementById('editPatientAddressInput').value = patient.address || '';
  document.getElementById('editPatientIllnessInput').value = patient.illness || '';
  document.getElementById('editPatientNotesInput').value = patient.notes || '';
  
  openModal('editPatientModal');
}

async function saveEditPatient(event) {
  event.preventDefault();
  
  const patientId = document.getElementById('editPatientId').value;
  const patient = {
    name: document.getElementById('editPatientNameInput').value,
    phone: document.getElementById('editPatientPhoneInput').value,
    age: document.getElementById('editPatientAgeInput').value,
    address: document.getElementById('editPatientAddressInput').value,
    illness: document.getElementById('editPatientIllnessInput').value,
    notes: document.getElementById('editPatientNotesInput').value,
    updatedBy: appState.currentUser.staffName,
    updatedAt: new Date().toISOString()
  };
  
  try {
    await saveToFirestore('patients', patientId, patient);
    
    closeModal('editPatientModal');
    showNotification(t('success'));
  } catch (error) {
    console.error('Error updating patient:', error);
    showNotification('Error: ' + error.message);
  }
}

// ==========================================
// DONE APPOINTMENT FUNCTIONALITY
// ==========================================

function openDoneAppointmentModal(appointmentId) {
  document.getElementById('doneAppointmentId').value = appointmentId;
  document.getElementById('doneAppointmentForm').reset();
  openModal('doneAppointmentModal');
}

async function saveDoneAppointment(event) {
  event.preventDefault();
  
  const appointmentId = document.getElementById('doneAppointmentId').value;
  const appointment = appState.appointments.find(a => a.id === appointmentId);
  
  const doneData = {
    appointmentId: appointmentId,
    patientId: appointment.patientId,
    treatment: document.getElementById('doneAppointmentTreatment').value,
    amountPaid: parseFloat(document.getElementById('doneAppointmentAmountPaid').value),
    remainingAmount: parseFloat(document.getElementById('doneAppointmentRemaining').value),
    remainingSessions: parseInt(document.getElementById('doneAppointmentRemainingSessions').value) || 0,
    notes: document.getElementById('doneAppointmentNotes').value,
    completedAt: new Date().toISOString()
  };
  
  try {
    // Save as treatment with remaining details
    await saveToFirestore('treatments', null, {
      patientId: appointment.patientId,
      type: doneData.treatment,
      doctorId: appointment.doctor,
      date: appointment.date,
      notes: doneData.notes,
      cost: doneData.amountPaid,
      remainingAmount: doneData.remainingAmount,
      remainingSessions: doneData.remainingSessions,
      appointmentId: appointmentId,
      createdAt: new Date().toISOString()
    });
    
    // Update appointment status to completed
    await saveToFirestore('appointments', appointmentId, {
      status: 'completed',
      completedData: doneData
    });
    
    // Record payment
    await saveToFirestore('transactions', null, {
      patientId: appointment.patientId,
      amount: doneData.amountPaid,
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    
    closeModal('doneAppointmentModal');
    showNotification(t('success'));
    loadAppointmentsTable();
  } catch (error) {
    console.error('Error saving done appointment:', error);
    showNotification('Error: ' + error.message);
  }
}

function updatePatientsDropdowns() {
  const patientSelect = document.getElementById('appointmentPatientSelect');
  const paymentSelect = document.getElementById('paymentPatientSelect');
  
  const options = `<option value="">Select a Patient</option>` + 
    appState.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  patientSelect.innerHTML = options;
  paymentSelect.innerHTML = options;
}

// ==========================================
// PATIENT PROFILE & HISTORY (NEW)
// ==========================================

function viewPatientProfile(patientId) {
  appState.currentPatientId = patientId;
  const patient = appState.patients.find(p => p.id === patientId);
  
  if (!patient) return;
  
  // Load patient details
  const detailsHtml = `
    <div style="background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1rem;">
      <h3 style="color: var(--primary-teal); margin-bottom: 1rem;">${patient.name}</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">${t('phone')}</div>
          <div style="font-weight: 600;">${patient.phone}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">${t('email')}</div>
          <div style="font-weight: 600;">${patient.email || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">${t('patientAge')}</div>
          <div style="font-weight: 600;">${patient.age || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">${t('patientAddress')}</div>
          <div style="font-weight: 600;">${patient.address || 'N/A'}</div>
        </div>
      </div>
      ${patient.illness ? `
        <div style="border-top: 1px solid #ddd; padding-top: 1rem; margin-bottom: 1rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem; font-weight: 600;">${t('illness')}</div>
          <div style="font-weight: 600; color: var(--dark-gray);">${patient.illness}</div>
        </div>
      ` : ''}
      ${patient.notes ? `
        <div style="border-top: 1px solid #ddd; padding-top: 1rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem; font-weight: 600;">${t('notes')}</div>
          <div style="font-weight: 600; color: var(--dark-gray);">${patient.notes}</div>
        </div>
      ` : ''}
      <div style="border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
        <div>${t('createdBy')}: <strong>${patient.createdBy || 'Unknown'}</strong></div>
        <div>${t('createdOn')}: <strong>${patient.createdAt ? new Date(patient.createdAt).toLocaleString() : 'Unknown'}</strong></div>
      </div>
    </div>
  `;
  document.getElementById('patientProfileDetails').innerHTML = detailsHtml;
  
  // Add edit and delete buttons
  const buttonsHtml = `
    <button class="btn btn-secondary" onclick="openEditPatientModal('${patient.id}')" style="flex: 1;">
      <i class="fas fa-edit"></i> ${t('edit')}
    </button>
    <button class="btn btn-secondary" onclick="deletePatient('${patient.id}'); closeModal('patientProfileModal');" style="flex: 1; color: red;">
      <i class="fas fa-trash"></i> ${t('delete')}
    </button>
  `;
  document.getElementById('patientEditDeleteButtons').innerHTML = buttonsHtml;
  
  // Load visit history (appointments)
  const appointments = appState.appointments.filter(a => a.patientId === patientId).reverse();
  const historyHtml = appointments.length === 0 
    ? `<p style="color: var(--text-muted);">${t('noVisitHistory')}</p>`
    : `<div style="display: flex; flex-direction: column; gap: 1rem;">
        ${appointments.map(a => {
          const doctor = appState.doctors.find(d => d.id === a.doctor);
          return `
            <div style="padding: 1rem; background: var(--light-gray); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <div style="font-weight: 600;">${a.date} at ${a.time}</div>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">${t('doctor')}: ${doctor?.name || 'Unknown'}</div>
                </div>
                <span style="background: ${a.status === 'completed' ? '#d4edda' : '#fff3cd'}; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.8rem;">
                  ${t(a.status || 'pending')}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>`;
  document.getElementById('patientVisitHistory').innerHTML = historyHtml;
  
  // Load treatments
  const treatments = appState.treatments.filter(t => t.patientId === patientId).reverse();
  const treatmentsHtml = treatments.length === 0 
    ? `<p style="color: var(--text-muted);">${t('noTreatmentsRecorded')}</p>`
    : `<div style="display: flex; flex-direction: column; gap: 1rem;">
        ${treatments.map(t => {
          const doctor = appState.doctors.find(d => d.id === t.doctorId);
          return `
            <div style="padding: 1rem; border: 1px solid #e5e5e5; border-radius: var(--radius-md);">
              <div style="font-weight: 600; color: var(--primary-teal);">${t.type} <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 400;">• ${t.date}</span></div>
              <div style="font-size: 0.9rem; margin-top: 0.5rem;">${t('doctor')}: ${doctor?.name || 'Unknown'}</div>
              ${t.notes ? `<div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">${t('notes')}: ${t.notes}</div>` : ''}
              ${t.cost ? `<div style="font-size: 0.9rem; font-weight: 600; color: var(--primary-teal); margin-top: 0.5rem;">${t('cost')}: ${parseFloat(t.cost).toFixed(0)} IQD</div>` : ''}
              ${t.remainingAmount >= 0 ? `<div style="font-size: 0.9rem; color: var(--primary-teal); margin-top: 0.5rem;">${t('remainingAmount')}: ${parseFloat(t.remainingAmount).toFixed(0)} IQD</div>` : ''}
              ${t.remainingSessions !== undefined && t.remainingSessions !== null ? `<div style="font-size: 0.9rem; color: var(--primary-teal); margin-top: 0.5rem;">${t('remainingSessions')}: ${t.remainingSessions}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>`;
  document.getElementById('patientTreatments').innerHTML = treatmentsHtml;
  
  // Populate treatment doctor dropdown
  const doctorSelect = document.getElementById('treatmentDoctorSelect');
  doctorSelect.innerHTML = `<option value="">${t('selectDoctor')}</option>` +
    appState.doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  
  openModal('patientProfileModal');
}

function toggleVisitHistory() {
  const historyDiv = document.getElementById('patientVisitHistory');
  const icon = document.getElementById('visitHistoryIcon');
  if (historyDiv.style.display === 'none') {
    historyDiv.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    historyDiv.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
}

function toggleTreatments() {
  const treatmentsDiv = document.getElementById('patientTreatments');
  const addBtn = document.getElementById('addTreatmentBtn');
  const icon = document.getElementById('treatmentsIcon');
  if (treatmentsDiv.style.display === 'none') {
    treatmentsDiv.style.display = 'block';
    addBtn.style.display = 'inline-block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    treatmentsDiv.style.display = 'none';
    addBtn.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
}

function openAddTreatmentModal() {
  document.getElementById('addTreatmentForm').reset();
  const doctorSelect = document.getElementById('treatmentDoctorSelect');
  doctorSelect.innerHTML = `<option value="">${t('selectDoctor')}</option>` +
    appState.doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  openModal('addTreatmentModal');
}

function saveTreatment(event) {
  event.preventDefault();
  
  const treatment = {
    patientId: appState.currentPatientId,
    type: document.getElementById('treatmentTypeInput').value,
    doctorId: document.getElementById('treatmentDoctorSelect').value,
    date: document.getElementById('treatmentDateInput').value,
    notes: document.getElementById('treatmentNotesInput').value,
    cost: document.getElementById('treatmentCostInput').value || 0,
    createdAt: new Date().toISOString()
  };
  
  saveToFirestore('treatments', null, treatment);
  
  closeModal('addTreatmentModal');
  viewPatientProfile(appState.currentPatientId);
  showNotification(t('success'));
}

// ==========================================
// DOCTORS MANAGEMENT (NEW)
// ==========================================

function loadDoctorsPage() {
  loadDoctorsTable();
  updatePageLanguage();
}

function loadAllStaffPage() {
  const staffList = document.getElementById('allStaffList');
  if (!staffList) return;
  
  const users = CLINIC_USERS.filter(u => !u.isAdmin);
  
  if (users.length === 0) {
    staffList.innerHTML = `<div style="grid-column: 1; text-align: center; color: var(--text-muted); padding: 2rem;">${t('noData')}</div>`;
    return;
  }
  
  staffList.innerHTML = users.map(user => `
    <div onclick="openStaffProfileModal('${user.id}')" style="cursor: pointer; text-align: center; padding: 1rem; border-radius: var(--radius-md); background: var(--light-gray); transition: transform 0.2s; hover: transform scale(1.05);">
      <div style="width: 120px; height: 120px; margin: 0 auto 0.5rem; border-radius: 50%; overflow: hidden; background: var(--primary-teal); display: flex; align-items: center; justify-content: center;">
        <img src="assets/${user.picture || 'user1.png'}" alt="${user.fullName}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div style="font-weight: 600; color: var(--primary-teal);">${user.fullName || user.staffName}</div>
      <div style="font-size: 0.85rem; color: var(--primary-green);">${user.jobTitle || 'Staff'}</div>
    </div>
  `).join('');
  
  updatePageLanguage();
}

function openStaffProfileModal(userId) {
  const user = CLINIC_USERS.find(u => u.id === userId);
  if (!user) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'staffProfileModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('staffProfileModal').remove(); document.body.style.overflow = 'auto';" style="padding: 0.4rem 0.8rem; margin-left: auto;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div style="text-align: center; margin-bottom: 2rem;">
        <div onclick="openFullScreenImage('assets/${user.picture || 'user1.png'}')" style="width: 150px; height: 150px; margin: 0 auto 1rem; border-radius: 50%; overflow: hidden; background: var(--primary-teal); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-md);">
          <img src="assets/${user.picture || 'user1.png'}" alt="${user.fullName}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <h3 style="margin: 0; font-size: 1.3rem;">${user.fullName || user.staffName}</h3>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">Job Title</div>
          <div style="font-weight: 600;">${user.jobTitle || 'N/A'}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">Email</div>
          <div style="font-weight: 600;">${user.email}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">Phone</div>
          <div style="font-weight: 600;">${user.phone || 'N/A'}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">Working Hours</div>
          <div style="font-weight: 600;">${user.workStart} - ${user.workEnd}</div>
        </div>
      </div>
    </div>
  `;
  
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
}

function openFullScreenImage(imageSrc) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'fullScreenImageModal';
  modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('fullScreenImageModal').remove(); document.body.style.overflow = 'auto';" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; z-index: 10001; background: white; color: black;">
        <i class="fas fa-times"></i>
      </button>
      <img src="${imageSrc}" alt="Full Screen" style="max-width: 90%; max-height: 90%; object-fit: contain;">
    </div>
  `;
  
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
}

function loadDoctorsTable() {
  const list = document.getElementById('doctorsList');
  
  // Prevent error if element doesn't exist yet
  if (!list) return;
  
  // Filter doctors based on search
  const filteredDoctors = appState.doctors.filter(d => 
    matchesSearchFilter(d.name, d.phone, appState.searchFilters.doctors)
  );
  
  if (filteredDoctors.length === 0) {
    list.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 2rem; color: var(--text-muted);" data-i18n="noData">No Data</td></tr>`;
    createPaginationControls('doctors', 0);
  } else {
    // Get paginated items from filtered list
    const paginatedDoctors = getPaginatedItems('doctors', filteredDoctors);
    
    list.innerHTML = paginatedDoctors.map(d => `
      <tr onclick="openDoctorDetailsModal('${d.id}')" style="cursor: pointer; transition: background-color 0.2s;">
        <td>${d.name}</td>
        <td>${d.phone}</td>
      </tr>
    `).join('');
    
    createPaginationControls('doctors', filteredDoctors.length);
  }
}

function openDoctorDetailsModal(doctorId) {
  const doctor = appState.doctors.find(d => d.id === doctorId);
  if (!doctor) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'doctorDetailsModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span style="margin: 0; font-size: 1.25rem; font-weight: 700;">${doctor.name}</span>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('doctorDetailsModal').remove(); document.body.style.overflow = 'auto';" style="padding: 0.4rem 0.8rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div style="background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('specialty')}</div>
            <div style="font-weight: 600;">${doctor.specialty}</div>
          </div>
          
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('phone')}</div>
            <div style="font-weight: 600; word-break: break-all;">${doctor.phone}</div>
          </div>
          
          <div style="grid-column: 1 / -1; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('email')}</div>
            <div style="font-weight: 600; word-break: break-all;">${doctor.email}</div>
          </div>
        </div>
      </div>
      
      <div id="doctorAppointmentsContainer" style="margin-bottom: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <h4 style="margin-bottom: 1rem; color: var(--primary-teal);">${t('appointmentHistory')}</h4>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <input type="text" id="doctorAppointmentFilter" placeholder="Search patient..." data-placeholder="searchByNamePhone" style="flex: 1; min-width: 150px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <button class="btn btn-secondary" id="doctorAppointmentSortBtn" style="padding: 0.5rem 0.75rem; font-size: 0.9rem;">
            <i class="fas fa-sort"></i> <span data-i18n="sortNewest">Newest First</span>
          </button>
        </div>
        <div id="doctorAppointmentsList" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0;"></div>
        <div id="doctorAppointmentsPagination" style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;"></div>
      </div>
      
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" onclick="editDoctor('${doctor.id}'); document.getElementById('doctorDetailsModal').remove();" style="flex: 1;">
          <i class="fas fa-edit"></i> ${t('edit')}
        </button>
        <button class="btn btn-secondary" onclick="deleteDoctor('${doctor.id}'); document.getElementById('doctorDetailsModal').remove();" style="flex: 1; color: red;">
          <i class="fas fa-trash"></i> ${t('delete')}
        </button>
      </div>
    </div>
  `;
  
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  // Load doctor's appointments
  loadDoctorAppointments(doctor.id);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
}

function openAddDoctorModal() {
  document.getElementById('addDoctorForm').reset();
  openModal('addDoctorModal');
}

function loadDoctorAppointments(doctorId) {
  let doctorAppointments = appState.appointments.filter(a => a.doctor === doctorId);
  let sortNewest = true; // Default: newest first
  const itemsPerPage = 20;
  let currentPage = 1;
  
  // Sort by date (newest first)
  doctorAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  function filterAndDisplay() {
    const searchTerm = document.getElementById('doctorAppointmentFilter')?.value.toLowerCase() || '';
    let filteredAppointments = doctorAppointments;
    
    if (searchTerm) {
      filteredAppointments = doctorAppointments.filter(apt => {
        const patient = appState.patients.find(p => p.id === apt.patientId);
        const name = patient ? patient.name.toLowerCase() : '';
        const phone = patient ? (patient.phone || '').toLowerCase() : '';
        return name.includes(searchTerm) || phone.includes(searchTerm);
      });
    }
    
    // Sort based on toggle
    if (!sortNewest) {
      filteredAppointments = [...filteredAppointments].reverse();
    }
    
    currentPage = 1;
    displayPage(1, filteredAppointments);
  }
  
  function displayPage(page, appointList = doctorAppointments) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageAppointments = appointList.slice(start, end);
    
    const appointmentsList = document.getElementById('doctorAppointmentsList');
    if (!appointmentsList) return;
    
    if (pageAppointments.length === 0) {
      appointmentsList.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted);">${t('noAppointments')}</div>`;
    } else {
      appointmentsList.innerHTML = pageAppointments.map(apt => {
        const patient = appState.patients.find(p => p.id === apt.patientId);
        const patientName = patient ? patient.name : 'Unknown';
        const appointmentDate = formatDateWithTranslation(apt.date);
        
        return `
          <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer; background: transparent; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--light-gray)'" onmouseout="this.style.backgroundColor='transparent'" onclick="showDoctorAppointmentDetails('${apt.id}', '${doctorId}')">
            <div style="font-weight: 600;">${patientName}</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${appointmentDate} at ${apt.time || 'N/A'}</div>
          </div>
        `;
      }).join('');
    }
    
    // Display pagination buttons
    const maxPages = Math.ceil(appointList.length / itemsPerPage);
    const paginationDiv = document.getElementById('doctorAppointmentsPagination');
    if (!paginationDiv) return;
    
    paginationDiv.innerHTML = '';
    for (let i = 1; i <= maxPages; i++) {
      const btn = document.createElement('button');
      btn.className = `btn ${i === page ? 'btn-primary' : 'btn-secondary'}`;
      btn.textContent = i;
      btn.style.padding = '0.4rem 0.8rem';
      btn.onclick = () => displayPage(i, appointList);
      paginationDiv.appendChild(btn);
    }
  }
  
  // Set up event listeners
  const filterInput = document.getElementById('doctorAppointmentFilter');
  if (filterInput) {
    filterInput.removeEventListener('input', filterAndDisplay);
    filterInput.addEventListener('input', filterAndDisplay);
  }
  
  const sortBtn = document.getElementById('doctorAppointmentSortBtn');
  if (sortBtn) {
    sortBtn.removeEventListener('click', toggleSort);
    sortBtn.addEventListener('click', toggleSort);
  }
  
  function toggleSort() {
    sortNewest = !sortNewest;
    const sortBtn = document.getElementById('doctorAppointmentSortBtn');
    if (sortBtn) {
      sortBtn.innerHTML = `<i class="fas fa-sort"></i> <span>${sortNewest ? t('sortNewest') : t('sortOldest')}</span>`;
    }
    filterAndDisplay();
  }
  
  displayPage(1);
}

function showDoctorAppointmentDetails(appointmentId, doctorId) {
  const appointment = appState.appointments.find(a => a.id === appointmentId);
  if (!appointment) return;
  
  const patient = appState.patients.find(p => p.id === appointment.patientId);
  const doctor = appState.doctors.find(d => d.id === doctorId);
  
  const details = `
    <div style="background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-lg);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem;">${t('patientName')}</div>
          <div style="font-weight: 600;">${patient ? patient.name : 'Unknown'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem;">${t('phone')}</div>
          <div style="font-weight: 600;">${patient ? (patient.phone || 'N/A') : 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem;">${t('date')}</div>
          <div style="font-weight: 600;">${formatDateWithTranslation(appointment.date)}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem;">${t('time')}</div>
          <div style="font-weight: 600;">${appointment.time || 'N/A'}</div>
        </div>
        <div style="grid-column: 1 / -1; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem;">${t('treatmentDescription')}</div>
          <div style="font-weight: 600;">${appointment.treatment || 'N/A'}</div>
        </div>
      </div>
    </div>
    <button class="btn btn-secondary" onclick="viewPatientProfile('${patient.id}')" style="margin-top: 1rem; width: 100%;">
      <i class="fas fa-user"></i> ${t('viewProfile')}
    </button>
  `;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'appointmentDetailsModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span style="margin: 0;">${patient ? patient.name : 'Appointment'}</span>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('appointmentDetailsModal').remove(); document.body.style.overflow = 'auto';" style="padding: 0.4rem 0.8rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${details}
    </div>
  `;
  
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
}


// Diagnostic function to test Firestore connectivity
async function testFirestoreConnection() {
  console.log('Testing Firestore connection...');
  
  if (!db) {
    console.error('Firestore database not initialized');
    return false;
  }
  
  if (!appState.currentUser) {
    console.error('No user logged in');
    return false;
  }
  
  try {
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Try to write a test document
    const testData = {
      test: true,
      userId: appState.currentUser.id,
      timestamp: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'test'), testData);
    console.log('✅ Firestore write successful! Doc ID:', docRef.id);
    
    // Clean up the test document
    const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'test', docRef.id));
    console.log('✅ Test document cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Firestore write failed:', error);
    alert('Firestore Error: ' + error.message);
    return false;
  }
}

// Test connection on startup
window.testFS = testFirestoreConnection;

async function saveDoctor(event) {
  event.preventDefault();
  
  const editingDoctorId = document.getElementById('editingDoctorId').value;
  const isNewDoctor = !editingDoctorId;
  
  const doctor = {
    name: document.getElementById('doctorNameInput').value,
    specialty: document.getElementById('doctorSpecialtyInput').value,
    phone: document.getElementById('doctorPhoneInput').value,
    email: document.getElementById('doctorEmailInput').value,
    license: document.getElementById('doctorLicenseInput').value
  };
  
  if (isNewDoctor) {
    doctor.createdBy = appState.currentUser.staffName;
    doctor.createdAt = new Date().toISOString();
  } else {
    doctor.updatedBy = appState.currentUser.staffName;
    doctor.updatedAt = new Date().toISOString();
  }
  
  console.log('Attempting to save doctor:', doctor);
  
  try {
    if (!appState.currentUser) {
      throw new Error('No user logged in');
    }
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    const result = await saveToFirestore('doctors', editingDoctorId || null, doctor);
    
    // Clear activity log if present
    if (isNewDoctor) {
      // New doctor
    } else {
      // Edited doctor
    }
    
    console.log('Doctor saved successfully:', result);
    
    closeModal('addDoctorModal');
    showNotification(t('success'));
    
    // Clear form and editing state
    document.getElementById('editingDoctorId').value = '';
    document.getElementById('doctorNameInput').value = '';
    document.getElementById('doctorSpecialtyInput').value = '';
    document.getElementById('doctorPhoneInput').value = '';
    document.getElementById('doctorEmailInput').value = '';
    document.getElementById('doctorLicenseInput').value = '';
  } catch (error) {
    console.error('Error saving doctor:', error);
    showNotification('Error: ' + error.message);
  }
}

function editDoctor(id) {
  const doctor = appState.doctors.find(d => d.id === id);
  if (doctor) {
    document.getElementById('editingDoctorId').value = id;
    document.getElementById('doctorNameInput').value = doctor.name;
    document.getElementById('doctorSpecialtyInput').value = doctor.specialty;
    document.getElementById('doctorPhoneInput').value = doctor.phone;
    document.getElementById('doctorEmailInput').value = doctor.email;
    document.getElementById('doctorLicenseInput').value = doctor.license || '';
    
    openModal('addDoctorModal');
  }
}

function deleteDoctor(id) {
  const doctor = appState.doctors.find(d => d.id === id);
  
  if (confirm('Delete this doctor?')) {
    deleteFromFirestore('doctors', id)
      .then(async () => {
        // Deleted
      })
      .catch(error => alert('Error deleting doctor: ' + error.message));
  }
}

// ==========================================
// APPOINTMENTS (UPDATED)
// ==========================================

function loadAppointmentsPage() {
  loadAppointmentsTable();
  updatePageLanguage();
}

function loadAppointmentsTable() {
  const list = document.getElementById('appointmentsList');
  
  if (appState.appointments.length === 0) {
    list.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-muted);" data-i18n="noData">No Data</td></tr>`;
    createPaginationControls('appointments', 0);
    return;
  }
  
  // Check if we should hide completed appointments
  const hideCompleted = document.getElementById('toggleCompletedAppointments')?.checked === true;
  // Check if we should show only today's appointments
  const onlyToday = document.getElementById('toggleOnlyToday')?.checked === true;
  
  // Get current time
  const now = new Date();
  const currentDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  // Get today's date for filtering
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
  
  // Filter and sort appointments
  let appointments = appState.appointments.filter(a => {
    if (hideCompleted && a.status === 'completed') return false;
    if (onlyToday && a.date !== todayString) return false;
    
    // Apply search filter
    const patient = appState.patients.find(p => p.id === a.patientId);
    const patientName = patient?.name || '';
    const patientPhone = patient?.phone || '';
    if (!matchesSearchFilter(patientName, patientPhone, appState.searchFilters.appointments)) return false;
    
    return true;
  });
  
  // Sort by date
  appointments = [...appointments].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });
  
  // Get paginated items
  const paginatedAppointments = getPaginatedItems('appointments', appointments);
  
  // Group by date and build HTML
  let html = '';
  let lastDate = null;
  
  paginatedAppointments.forEach(a => {
    const appointmentDate = new Date(a.date);
    const dateString = a.date;
    
    // Add date separator if date changed
    if (lastDate !== dateString) {
      if (lastDate !== null) {
        html += `<tr><td colspan="3" style="padding: 0;"><div style="height: 2px; background: var(--primary-teal); margin: 1rem 0;"></div></td></tr>`;
      }
      
      // Format date for display with translations - "Friday, 4/11/2026"
      const dateObj = new Date(appointmentDate.getTime() + appointmentDate.getTimezoneOffset() * 60000);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const weekdayKey = dayNames[dateObj.getDay()];
      const weekday = t(weekdayKey);
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      const dateDisplay = `${weekday}, ${month}/${day}/${year}`;
      
      html += `<tr style="background: var(--light-gray);"><td colspan="3" style="padding: 1rem; font-weight: 700; color: var(--primary-teal);">${dateDisplay}</td></tr>`;
      lastDate = dateString;
    }
    
    const patient = appState.patients.find(p => p.id === a.patientId);
    
    // Determine appointment status - check both date AND time
    let status = a.status;
    let statusIconHtml = '<i class="fas fa-clock" style="color: #ffc107; font-size: 1.2rem;"></i>'; // scheduled (yellow)
    
    if (a.status === 'completed') {
      status = 'completed';
      statusIconHtml = '<i class="fas fa-check" style="color: #28a745; font-size: 1.2rem;"></i>'; // completed (green)
    } else if (dateString < currentDate || (dateString === currentDate && a.time < currentTime)) {
      status = 'outdated';
      statusIconHtml = '<i class="fas fa-exclamation-circle" style="color: #dc3545; font-size: 1.2rem;"></i>'; // outdated (red)
    }
    
    html += `
      <tr onclick="openAppointmentDetailsModal('${a.id}')" style="cursor: pointer; transition: background-color 0.2s;">
        <td>${patient?.name || 'Unknown'}</td>
        <td>${formatTime12Hour(a.time)}</td>
        <td><span style="display: none;" class="status-text">${status}</span><span style="font-size: 1.2rem; display: block;" class="status-icon" data-status="${status}">${statusIconHtml}</span></td>
      </tr>
    `;
  });
  
  list.innerHTML = html;
  createPaginationControls('appointments', appointments.length);
}

function openAppointmentDetailsModal(appointmentId) {
  const appointment = appState.appointments.find(a => a.id === appointmentId);
  if (!appointment) return;
  
  const patient = appState.patients.find(p => p.id === appointment.patientId);
  const doctor = appState.doctors.find(d => d.id === appointment.doctor);
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'appointmentDetailsModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span style="margin: 0; font-size: 1.25rem; font-weight: 700;">${patient?.name || 'Unknown'}</span>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('appointmentDetailsModal').remove(); document.body.style.overflow = 'auto';" style="padding: 0.4rem 0.8rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div style="background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem;">
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('phone')}</div>
            <div style="font-weight: 600;">${patient?.phone || 'N/A'}</div>
          </div>
          
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('date')}</div>
            <div style="font-weight: 600;">${appointment.date}</div>
          </div>
          
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('time')}</div>
            <div style="font-weight: 600;">${formatTime12Hour(appointment.time)}</div>
          </div>
          
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('doctor')}</div>
            <div style="font-weight: 600;">${doctor?.name || 'Unknown'} ${doctor?.specialty ? `(${doctor.specialty})` : ''}</div>
          </div>
          
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('status')}</div>
            <div style="font-weight: 600;">${appointment.status}</div>
          </div>
        </div>
        ${appointment.note ? `
          <div style="border-top: 1px solid #ddd; padding-top: 1rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">${t('notes')}</div>
            <div style="font-weight: 600; color: var(--dark-gray);">${appointment.note}</div>
          </div>
        ` : ''}
        <div style="border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
          <div>${t('createdBy')}: <strong>${appointment.createdBy || 'Unknown'}</strong></div>
          <div>${t('createdOn')}: <strong>${appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : 'Unknown'}</strong></div>
        </div>
      </div>
      
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" onclick="editAppointment('${appointment.id}'); document.getElementById('appointmentDetailsModal').remove();" style="flex: 1; min-width: 80px;">
          <i class="fas fa-edit"></i> ${t('edit')}
        </button>
        ${appointment.status !== 'completed' ? `
          <button class="btn btn-secondary" onclick="openDoneAppointmentModal('${appointment.id}'); document.getElementById('appointmentDetailsModal').remove();" style="flex: 1; min-width: 80px; background: #28a745; color: white; border: none;">
            <i class="fas fa-check"></i> ${t('done')}
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="deleteAppointment('${appointment.id}'); document.getElementById('appointmentDetailsModal').remove();" style="flex: 1; min-width: 80px; color: red;">
          <i class="fas fa-trash"></i> ${t('delete')}
        </button>
      </div>
    </div>
  `;
  
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.style.overflow = 'auto';
    }
  });
}

function openAddAppointmentModal() {
  const form = document.getElementById('addAppointmentForm');
  form.reset();
  form.dataset.appointmentId = '';
  form.dataset.isEditing = 'false';
  updatePatientsDropdowns();
  
  // Reset search
  document.getElementById('appointmentPatientSearch').value = '';
  document.getElementById('appointmentPatientInfoBox').style.display = 'none';
  
  const doctorSelect = document.getElementById('appointmentDoctorSelect');
  doctorSelect.innerHTML = `<option value="">${t('selectDoctor')}</option>` +
    appState.doctors.map(d => `<option value="${d.id}">${d.name} - ${d.specialty}</option>`).join('');
  openModal('addAppointmentModal');
}

function filterPatientDropdown() {
  const searchTerm = document.getElementById('appointmentPatientSearch').value.toLowerCase();
  const select = document.getElementById('appointmentPatientSelect');
  
  if (!searchTerm) {
    // If search is empty, show all patients
    updatePatientsDropdowns();
    return;
  }
  
  // Filter patients based on search term
  const filteredPatients = appState.patients.filter(p => {
    const name = p.name.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return name.includes(searchTerm) || phone.includes(searchTerm);
  });
  
  // Rebuild the select with filtered options
  const options = `<option value="">Select a Patient</option>` + 
    filteredPatients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  select.innerHTML = options;
}

function showAppointmentPatientInfo() {
  const patientId = document.getElementById('appointmentPatientSelect').value;
  const infoBox = document.getElementById('appointmentPatientInfoBox');
  
  if (!patientId) {
    infoBox.style.display = 'none';
    return;
  }
  
  const patient = appState.patients.find(p => p.id === patientId);
  if (patient) {
    document.getElementById('appointmentPatientName').textContent = patient.name || '-';
    document.getElementById('appointmentPatientPhone').textContent = patient.phone || '-';
    document.getElementById('appointmentPatientAge').textContent = patient.age || '-';
    document.getElementById('appointmentPatientAddress').textContent = patient.address || '-';
    infoBox.style.display = 'block';
  }
}

async function saveAppointment(event) {
  event.preventDefault();
  
  if (isSubmitting) return;
  isSubmitting = true;
  
  const form = document.getElementById('addAppointmentForm');
  const appointmentId = form.dataset.appointmentId || null;
  const isEditing = form.dataset.isEditing === 'true';
  
  const appointment = {
    patientId: document.getElementById('appointmentPatientSelect').value,
    date: document.getElementById('appointmentDateInput').value,
    time: document.getElementById('appointmentTimeInput').value,
    doctor: document.getElementById('appointmentDoctorSelect').value,
    note: document.getElementById('appointmentNoteInput').value || '',
    status: 'scheduled'
  };
  
  try {
    if (isEditing && appointmentId) {
      // Update existing appointment
      appointment.updatedBy = appState.currentUser.staffName;
      appointment.updatedAt = new Date().toISOString();
      await saveToFirestore('appointments', appointmentId, appointment);
    } else {
      // Create new appointment
      appointment.createdBy = appState.currentUser.staffName;
      appointment.createdAt = new Date().toISOString();
      const docRef = await saveToFirestore('appointments', null, appointment);
    }
    
    closeModal('addAppointmentModal');
    form.dataset.appointmentId = '';
    form.dataset.isEditing = 'false';
    loadAppointmentsTable();
    showNotification(t('success'));
  } catch (error) {
    console.error('Error saving appointment:', error);
    showNotification('Error: ' + error.message);
  } finally {
    isSubmitting = false;
  }
}

function editAppointment(id) {
  const appointment = appState.appointments.find(a => a.id === id);
  if (!appointment) return;
  
  // Repopulate the doctor dropdown with all doctors (not just profiles)
  const doctorSelect = document.getElementById('appointmentDoctorSelect');
  doctorSelect.innerHTML = `<option value="">${t('selectDoctor')}</option>` +
    appState.doctors.map(d => `<option value="${d.id}">${d.name} - ${d.specialty}</option>`).join('');
  
  // Reset search
  document.getElementById('appointmentPatientSearch').value = '';
  
  // Populate the edit form with current appointment data
  document.getElementById('appointmentPatientSelect').value = appointment.patientId;
  document.getElementById('appointmentDateInput').value = appointment.date;
  document.getElementById('appointmentTimeInput').value = appointment.time;
  document.getElementById('appointmentDoctorSelect').value = appointment.doctor;
  document.getElementById('appointmentNoteInput').value = appointment.note || '';
  
  // Show patient info
  showAppointmentPatientInfo();
  
  // Store the appointment ID for update
  document.getElementById('addAppointmentForm').dataset.appointmentId = id;
  document.getElementById('addAppointmentForm').dataset.isEditing = 'true';
  
  openModal('addAppointmentModal');
}

function deleteAppointment(id) {
  const appointment = appState.appointments.find(a => a.id === id);
  
  if (confirm('Delete this appointment?')) {
    deleteFromFirestore('appointments', id)
      .then(async () => {
        // Deleted
      })
      .catch(error => alert('Error deleting appointment: ' + error.message));
  }
}

// ==========================================
// FINANCIAL (UPDATED)
// ==========================================

function loadFinancialPage() {
  // Update financial stats
  const totalRevenue = appState.transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  document.getElementById('financialTotalRevenue').textContent = totalRevenue.toFixed(0) + ' IQD';
  
  const remainingAmounts = appState.treatments
    .reduce((sum, t) => sum + parseFloat(t.remainingAmount || 0), 0);
  document.getElementById('financialRemainingAmounts').textContent = remainingAmounts.toFixed(0) + ' IQD';
  
  loadPatientRemainingAmounts();
  loadTransactionsTable();
  updatePageLanguage();
}

function loadPatientRemainingAmounts() {
  // Get patients with remaining amounts
  const patientsWithRemaining = appState.patients
    .map(p => {
      const totalRemaining = appState.treatments
        .filter(t => t.patientId === p.id)
        .reduce((sum, t) => sum + parseFloat(t.remainingAmount || 0), 0);
      return { ...p, totalRemaining };
    })
    .filter(p => p.totalRemaining > 0)
    .sort((a, b) => b.totalRemaining - a.totalRemaining);
  
  const itemsPerPage = 10;
  const totalPages = Math.ceil(patientsWithRemaining.length / itemsPerPage);
  
  // Set initial page
  if (!window.remainingAmountsCurrentPage) {
    window.remainingAmountsCurrentPage = 1;
  }
  
  const startIdx = (window.remainingAmountsCurrentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageItems = patientsWithRemaining.slice(startIdx, endIdx);
  
  const listContainer = document.getElementById('patientRemainingAmountsList');
  
  if (pageItems.length === 0) {
    listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem;">${t('noPatientsWithRemainingAmounts')}</p>`;
    document.getElementById('remainingAmountsPagination').innerHTML = '';
    return;
  }
  
  listContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      ${pageItems.map(p => `
        <div style="padding: 1rem; border: 1px solid #e5e5e5; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; background: var(--light-gray);">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--primary-teal);">${p.name}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${p.phone}</div>
          </div>
          <div style="text-align: right; min-width: 150px;">
            <div style="font-weight: 600; color: var(--primary-teal); font-size: 1.1rem;">${parseFloat(p.totalRemaining).toFixed(0)} IQD</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Remaining</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // Render pagination
  const paginationContainer = document.getElementById('remainingAmountsPagination');
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let paginationHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === window.remainingAmountsCurrentPage;
    paginationHtml += `
      <button onclick="goToRemainingAmountsPage(${i})" style="
        padding: 0.5rem 0.75rem;
        border: 1px solid ${isActive ? 'var(--primary-teal)' : '#ddd'};
        background: ${isActive ? 'var(--primary-teal)' : 'white'};
        color: ${isActive ? 'white' : 'var(--dark-gray)'};
        border-radius: 0.25rem;
        cursor: pointer;
      ">${i}</button>
    `;
  }
  paginationContainer.innerHTML = paginationHtml;
}

function goToRemainingAmountsPage(pageNum) {
  window.remainingAmountsCurrentPage = pageNum;
  loadPatientRemainingAmounts();
}

// Helper function to format time from 24-hour to 12-hour format
function formatTime12Hour(time24) {
  if (!time24) return 'N/A';
  const [hours, minutes] = time24.split(':');
  let hours12 = parseInt(hours);
  const ampm = hours12 >= 12 ? 'PM' : 'AM';
  hours12 = hours12 % 12;
  hours12 = hours12 ? hours12 : 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;
}

function formatDateWithTranslation(dateString) {
  if (!dateString) return 'N/A';
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  
  const date = new Date(dateString);
  const dayOfWeek = dayNames[date.getDay()];
  const month = monthNames[date.getMonth()];
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();
  
  const translatedDay = t(dayOfWeek);
  const translatedMonth = t(month);
  
  return `${translatedDay}, ${translatedMonth} ${dayOfMonth}, ${year}`;
}

function loadTransactionsTable() {
  const list = document.getElementById('transactionsList');
  
  if (appState.transactions.length === 0) {
    list.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);" data-i18n="noData">No Data</td></tr>`;
    createPaginationControls('transactions', 0);
  } else {
    // Sort transactions by date (newest to oldest)
    const sortedTransactions = [...appState.transactions].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Filter by search term
    const filteredTransactions = sortedTransactions.filter(t => {
      const patient = appState.patients.find(p => p.id === t.patientId);
      const patientName = patient?.name || '';
      const patientPhone = patient?.phone || '';
      return matchesSearchFilter(patientName, patientPhone, appState.searchFilters.transactions);
    });
    
    // Get paginated items
    const paginatedTransactions = getPaginatedItems('transactions', filteredTransactions);
    
    list.innerHTML = paginatedTransactions.map(t => {
      const patient = appState.patients.find(p => p.id === t.patientId);
      const statusColor = t.status === 'completed' ? '#c8e6c9' : '#fff9c4';
      const statusTextColor = t.status === 'completed' ? '#2e7d32' : '#F57F17';
      return `
        <tr>
          <td>${patient?.name || 'Unknown'}</td>
          <td>${parseFloat(t.amount).toFixed(0)} IQD</td>
          <td>${t.date}</td>
          <td><span style="background: ${statusColor}; padding: 0.4rem 0.8rem; border-radius: 0.25rem; color: ${statusTextColor}; font-weight: 600;">${t(t.status || 'pending')}</span></td>
        </tr>
      `;
    }).join('');
    
    createPaginationControls('transactions', filteredTransactions.length);
  }
}

function openAddPaymentModal() {
  document.getElementById('addPaymentForm').reset();
  updatePatientsDropdowns();
  
  // Add search functionality for payment patient filter
  const filterInput = document.getElementById('paymentPatientFilter');
  if (filterInput) {
    filterInput.value = '';
    filterInput.addEventListener('input', filterPaymentPatients);
  }
  
  openModal('addPaymentModal');
}

function filterPaymentPatients() {
  const filterValue = document.getElementById('paymentPatientFilter').value.toLowerCase();
  const selectElement = document.getElementById('paymentPatientSelect');
  
  if (!filterValue) {
    // If search is empty, show all patients
    updatePatientsDropdowns();
    return;
  }
  
  // Filter patients based on search term
  const filteredPatients = appState.patients.filter(p => {
    const name = p.name.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return name.includes(filterValue) || phone.includes(filterValue);
  });
  
  // Rebuild the select with filtered options
  const options = `<option value="">Select a Patient</option>` + 
    filteredPatients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  selectElement.innerHTML = options;
}

async function savePayment(event) {
  event.preventDefault();
  
  if (isSubmitting) return;
  isSubmitting = true;
  
  const patientId = document.getElementById('paymentPatientSelect').value;
  const amount = parseFloat(document.getElementById('paymentAmountInput').value);
  const transaction = {
    patientId: patientId,
    amount: amount,
    date: document.getElementById('paymentDateInput').value || new Date().toISOString().split('T')[0],
    method: document.getElementById('paymentMethodSelect').value,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  
  try {
    // Save the transaction
    await saveToFirestore('transactions', null, transaction);
    
    // Automatically reduce remaining amounts for this patient's treatments
    const patientTreatments = appState.treatments.filter(t => t.patientId === patientId && t.remainingAmount > 0);
    let amountToReduce = amount;
    
    for (const treatment of patientTreatments) {
      if (amountToReduce <= 0) break;
      
      const currentRemaining = parseFloat(treatment.remainingAmount || 0);
      const newRemaining = Math.max(0, currentRemaining - amountToReduce);
      const reduction = currentRemaining - newRemaining;
      
      // Update the treatment's remaining amount
      await saveToFirestore('treatments', treatment.id, {
        remainingAmount: newRemaining
      });
      
      amountToReduce -= reduction;
    }
    
    closeModal('addPaymentModal');
    loadFinancialPage();
    updateDashboardStats();
    showNotification(t('success'));
    
    // Clear form
    document.getElementById('addPaymentForm').reset();
  } catch (error) {
    console.error('Error saving payment:', error);
    showNotification('Error saving payment: ' + error.message);
  } finally {
    isSubmitting = false;
  }
}

// ==========================================
// SETTINGS
// ==========================================

function loadSettingsPage() {
  const languageSelect = document.getElementById('languageSelect');
  languageSelect.value = localStorage.getItem('language') || 'en';
  updatePageLanguage();
}

function handleLanguageChange(lang) {
  setLanguage(lang);
  // Update the select value to reflect the change
  document.getElementById('languageSelect').value = lang;
}

// ==========================================
// MODALS
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// ==========================================
// UTILITIES
// ==========================================

function showNotification(message) {
  console.log(message);
  // TODO: Implement toast notification
}

// ==========================================
// SIDEBAR FUNCTIONS
// ==========================================

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  hamburgerBtn.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
  hamburgerBtn.classList.remove('active');
}

function openProfileModal() {
  closeSidebar();
  const profileContent = document.getElementById('profileContent');
  const user = appState.currentUser;
  
  // Find full user data from CLINIC_USERS
  const fullUserData = CLINIC_USERS.find(u => u.id === user.id) || user;
  
  profileContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 2rem;">
      <div onclick="openFullScreenImage('assets/${fullUserData.picture || 'user1.png'}')" style="width: 120px; height: 120px; margin: 0 auto 1.5rem; border-radius: 50%; overflow: hidden; box-shadow: var(--shadow-md); background: var(--light-gray); border: 3px solid var(--primary-teal); cursor: pointer;">
        <img src="assets/${fullUserData.picture || 'user1.png'}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <h3 style="color: var(--primary-teal); margin-bottom: 0.5rem; font-size: 1.3rem;">${fullUserData.fullName || fullUserData.staffName}</h3>
      <p style="color: var(--primary-green); font-weight: 600; margin-bottom: 1.5rem;"><strong>${t('jobTitle')}:</strong> ${fullUserData.jobTitle || 'Staff'}</p>
    </div>
    
    <div style="background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 600;">${t('email')}</div>
        <div style="font-weight: 600; word-break: break-all;">${fullUserData.email}</div>
      </div>
      
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 600;">${t('phone')}</div>
        <div style="font-weight: 600; word-break: break-all;">${fullUserData.phone || 'N/A'}</div>
      </div>
      
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 600;">${t('clinic')}</div>
        <div style="font-weight: 600;">${fullUserData.clinicName}</div>
      </div>
      
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 600;">${t('workingHours')}</div>
        <div style="font-weight: 600;">${fullUserData.workStart} - ${fullUserData.workEnd}</div>
      </div>
    </div>
  `;
  openModal('profileModal');
}

function openSettingsModal() {
  closeSidebar();
  navigateTo('settings');
}

function openAboutModal() {
  closeSidebar();
  openModal('aboutModal');
}

// ==========================================
// LANGUAGE TOGGLE
// ==========================================

// Language toggle button (header button)
document.addEventListener('DOMContentLoaded', () => {
  const languageToggle = document.getElementById('languageToggle');
  if (languageToggle) {
    languageToggle.addEventListener('click', () => {
      const currentLang = localStorage.getItem('language') || 'en';
      const newLang = currentLang === 'en' ? 'ku' : 'en';
      setLanguage(newLang);
    });
  }
});

// Update all translated elements
function updatePageLanguage() {
  const lang = localStorage.getItem('language') || 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ku' ? 'rtl' : 'ltr';
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key, lang);
  });
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en';
    const selectEl = document.getElementById('languageSelect');
    if (selectEl) selectEl.value = savedLang;
  });
} else {
  const savedLang = localStorage.getItem('language') || 'en';
  const selectEl = document.getElementById('languageSelect');
  if (selectEl) selectEl.value = savedLang;
}

// ==========================================
// ACTIVITY LOGGING SYSTEM
// ==========================================

appState.activityLogs = [];

// ==========================================
// PDF EXPORT SYSTEM
// ==========================================

async function exportPatientPDF() {
  try {
    if (!appState.currentPatientId) return;
    
    const patient = appState.patients.find(p => p.id === appState.currentPatientId);
    if (!patient) {
      alert('Patient not found');
      return;
    }
    
    // Get patient's appointments
    const patientAppointments = appState.appointments.filter(a => a.patientId === appState.currentPatientId);
    
    // Get patient's treatments
    const patientTreatments = appState.treatments.filter(t => t.patientId === appState.currentPatientId);
    
    // Create container div with inline styles
    const pdfContent = document.createElement('div');
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.color = '#333';
    pdfContent.style.lineHeight = '1.6';
    
    // Header
    const header = document.createElement('div');
    header.style.background = 'linear-gradient(135deg, #1a6e6d, #2d9e9c)';
    header.style.color = 'white';
    header.style.padding = '20px';
    header.style.borderRadius = '8px';
    header.style.marginBottom = '30px';
    header.innerHTML = `
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">32 DENT ${t('clinicManagement')}</div>
      <h1 style="margin: 0; font-size: 28px; margin-bottom: 10px;">${t('patientInformationReport')}</h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">${t('generatedOn')} ${new Date().toLocaleString()}</p>
    `;
    pdfContent.appendChild(header);
    
    // Patient Details Section
    const detailsSection = document.createElement('div');
    detailsSection.style.marginBottom = '30px';
    detailsSection.innerHTML = `
      <h2 style="color: #1a6e6d; border-bottom: 2px solid #1a6e6d; padding-bottom: 10px; margin: 0 0 20px 0; font-size: 18px;">${t('patientDetails')}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('name')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.name || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('phone')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.phone || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('age')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.age || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('address')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.address || 'N/A'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('illness')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.illness || 'None recorded'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('notes')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.notes || 'None recorded'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('createdBy')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.createdBy || 'Unknown'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${t('createdAt')}</div>
          <div style="font-size: 14px; font-weight: 600;">${patient.createdAt ? new Date(patient.createdAt).toLocaleString() : 'Unknown'}</div>
        </div>
      </div>
    `;
    pdfContent.appendChild(detailsSection);
    
    // Appointments Section
    if (patientAppointments.length > 0) {
      const appointmentsSection = document.createElement('div');
      appointmentsSection.style.marginBottom = '30px';
      appointmentsSection.innerHTML = `
        <h2 style="color: #1a6e6d; border-bottom: 2px solid #1a6e6d; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 18px;">${t('appointmentHistory')} (${patientAppointments.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('date')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('time')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('doctor')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('status')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${patientAppointments.map(apt => {
              const doctor = appState.doctors.find(d => d.id === apt.doctor);
              return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${apt.date || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${apt.time || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${doctor ? doctor.name : 'Unknown'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${t(apt.status || 'scheduled')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${apt.note || ''}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;
      pdfContent.appendChild(appointmentsSection);
    }
    
    // Treatments Section
    if (patientTreatments.length > 0) {
      const treatmentsSection = document.createElement('div');
      treatmentsSection.style.marginBottom = '30px';
      treatmentsSection.innerHTML = `
        <h2 style="color: #1a6e6d; border-bottom: 2px solid #1a6e6d; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 18px;">${t('treatmentRecords')} (${patientTreatments.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('treatmentType')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('doctor')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('date')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('cost')}</th>
              <th style="background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${patientTreatments.map(tri => {
              const doctor = appState.doctors.find(d => d.id === tri.doctor);
              return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tri.treatmentType || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${doctor ? doctor.name : 'Unknown'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tri.date || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tri.cost || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tri.notes || ''}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;
      pdfContent.appendChild(treatmentsSection);
    }
    
    // Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '40px';
    footer.style.paddingTop = '20px';
    footer.style.borderTop = '1px solid #ddd';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '12px';
    footer.style.color = '#999';
    footer.innerHTML = `
      <p style="margin: 5px 0;">${t('pdfConfidential')}</p>
      <p style="margin: 5px 0;">32 DENT ${t('clinicManagement')}</p>
    `;
    pdfContent.appendChild(footer);
    
    // Generate PDF
    const options = {
      margin: [10, 10, 10, 10],
      filename: `Patient_${patient.name}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(options).from(pdfContent).save();
    
    // Log the activity
    // PDF exported
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Error exporting PDF: ' + error.message);
  }
}

// ==========================================
// CLEAR DATA SYSTEM
// ==========================================

async function confirmClearData() {
  const section = document.getElementById('clearDataSection').value;
  const fromDate = document.getElementById('clearFromDate').value;
  const toDate = document.getElementById('clearToDate').value;
  
  if (!section) {
    alert('Please select a section to clear');
    return;
  }
  
  const confirmMsg = `Are you sure you want to permanently delete all ${section} data${fromDate || toDate ? ' within the selected date range' : ''}? This action cannot be undone.`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    const dateRange = {};
    if (fromDate) dateRange.from = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      dateRange.to = to;
    }
    
    let itemsDeleted = 0;
    
    if (section === 'all') {
      // Delete all collections
      const collections = ['patients', 'doctors', 'appointments', 'treatments', 'transactions'];
      for (const collection of collections) {
        itemsDeleted += await clearCollectionData(collection, dateRange);
      }
    } else {
      itemsDeleted = await clearCollectionData(section, dateRange);
    }
    
    // Log the clear action - removed
    
    alert(`Successfully deleted ${itemsDeleted} ${section} record(s).`);
    closeModal('settingsModal');
    
    // Reload the page to reflect changes
    location.reload();
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Error clearing data: ' + error.message);
  }
}

async function clearCollectionData(collection, dateRange) {
  let deleted = 0;
  
  try {
    const { query, where, getDocs, writeBatch, deleteDoc, collection: firestoreCollection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    let q = query(
      firestoreCollection(db, collection), 
      where('userId', '==', appState.currentUser.id)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.forEach((doc) => {
      let shouldDelete = true;
      
      if (Object.keys(dateRange).length > 0) {
        const createdAt = doc.data().createdAt ? new Date(doc.data().createdAt) : null;
        if (createdAt) {
          if (dateRange.from && createdAt < dateRange.from) shouldDelete = false;
          if (dateRange.to && createdAt > dateRange.to) shouldDelete = false;
        }
      }
      
      if (shouldDelete) {
        batch.delete(doc.ref);
        deleted++;
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error(`Error clearing ${collection}:`, error);
  }
  
  return deleted;
}

// ==========================================
// CLEAR DATA MODAL
// ==========================================

function openClearDataModal() {
  document.getElementById('settingsModal').classList.add('active');
}

// ==========================================
// WHITEBOARD & SHOPPING LIST FUNCTIONS
// ==========================================

// WHITEBOARD FUNCTIONS
async function addWhiteboardItem() {
  const input = document.getElementById('whiteboardInput');
  if (!input) return;
  
  const text = input.value.trim();
  
  if (!text) {
    alert('Please enter a to-do item');
    return;
  }
  
  if (!appState.currentUser) {
    alert('You must be logged in');
    return;
  }
  
  try {
    const item = {
      userId: appState.currentUser.id,
      userName: appState.currentUser.staffName,
      text: text,
      createdAt: new Date().toISOString()
    };
    
    await saveToFirestore('whiteboard', null, item);
    input.value = '';
    displayWhiteboardItems();
  } catch (error) {
    console.error('Error adding whiteboard item:', error);
    alert('Error adding item: ' + error.message);
  }
}

async function removeWhiteboardItem(itemId) {
  if (!confirm('Delete this to-do item?')) return;
  
  try {
    const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'whiteboard', itemId));
    displayWhiteboardItems();
  } catch (error) {
    console.error('Error deleting whiteboard item:', error);
    alert('Error deleting item: ' + error.message);
  }
}

function displayWhiteboardItems() {
  const container = document.getElementById('whiteboardList');
  if (!container) return;
  
  const items = appState.whiteboardItems || [];
  
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #999; padding: 2rem;">${t('noTodoItemsYet')}</div>`;
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div style="background: white; padding: 1rem; margin-bottom: 0.75rem; border-radius: 0.5rem; border-left: 4px solid var(--primary-teal); box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: var(--primary-teal); font-size: 0.85rem; margin-bottom: 0.25rem;">${escapeHtml(item.userName)}</div>
        <div style="color: #333; word-wrap: break-word;">${escapeHtml(item.text)}</div>
        <div style="font-size: 0.75rem; color: #999; margin-top: 0.5rem;">${new Date(item.createdAt).toLocaleString()}</div>
      </div>
      <button onclick="removeWhiteboardItem('${item.id}')" style="background: #ff6b6b; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.85rem; white-space: nowrap;">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// SHOPPING LIST FUNCTIONS
let editingShoppingItemId = null;

function openAddShoppingItemModal() {
  editingShoppingItemId = null;
  document.getElementById('addShoppingItemForm').reset();
  document.getElementById('shoppingModalTitle').textContent = t('addShoppingItem');
  openModal('addShoppingItemModal');
}

function openEditShoppingItemModal(itemId) {
  const item = appState.shoppingItems.find(i => i.id === itemId);
  if (!item) return;
  
  editingShoppingItemId = itemId;
  document.getElementById('shoppingItemName').value = item.text;
  document.getElementById('shoppingItemQuantity').value = item.quantity || '';
  document.getElementById('shoppingItemNote').value = item.note || '';
  document.getElementById('shoppingModalTitle').textContent = t('editShoppingItem');
  openModal('addShoppingItemModal');
}

async function saveShoppingItem(event) {
  event.preventDefault();
  
  const name = document.getElementById('shoppingItemName').value.trim();
  const quantity = document.getElementById('shoppingItemQuantity').value.trim();
  const note = document.getElementById('shoppingItemNote').value.trim();
  
  if (!name) {
    alert(t('pleaseEnterItemName'));
    return;
  }
  
  if (!appState.currentUser) {
    alert(t('youMustBeLoggedIn'));
    return;
  }
  
  try {
    const itemData = {
      userId: appState.currentUser.id,
      userName: appState.currentUser.staffName,
      text: name,
      quantity: quantity,
      note: note,
      completed: false
    };
    
    if (editingShoppingItemId) {
      // Update existing item
      const existingItem = appState.shoppingItems.find(i => i.id === editingShoppingItemId);
      itemData.completed = existingItem.completed;
      itemData.createdAt = existingItem.createdAt;
      await saveToFirestore('shopping', editingShoppingItemId, itemData);
    } else {
      // Add new item
      itemData.createdAt = new Date().toISOString();
      await saveToFirestore('shopping', null, itemData);
    }
    
    closeModal('addShoppingItemModal');
    displayShoppingItems();
  } catch (error) {
    console.error('Error saving shopping item:', error);
    alert('Error saving item: ' + error.message);
  }
}

async function toggleShoppingItem(itemId) {
  try {
    const item = appState.shoppingItems.find(i => i.id === itemId);
    if (!item) return;
    
    const updatedItem = {
      ...item,
      completed: !item.completed
    };
    
    await saveToFirestore('shopping', itemId, updatedItem);
    displayShoppingItems();
  } catch (error) {
    console.error('Error toggling shopping item:', error);
  }
}

async function removeShoppingItem(itemId) {
  if (!confirm('Delete this shopping item?')) return;
  
  try {
    const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'shopping', itemId));
    displayShoppingItems();
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    alert('Error deleting item: ' + error.message);
  }
}

function displayShoppingItems() {
  const container = document.getElementById('shoppingItemsList');
  if (!container) return;
  
  const items = appState.shoppingItems || [];
  
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">${t('noData')}</div>`;
    return;
  }
  
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
  
  let html = '';
  items.forEach(item => {
    const borderColor = item.completed ? '#666' : (isDarkTheme ? '#c9a961' : '#27ae60');
    const opacity = item.completed ? '0.6' : '1';
    
    html += `
      <div class="shopping-item" style="border-left-color: ${borderColor}; opacity: ${opacity};">
        <div class="shopping-item-content">
          <div class="shopping-item-title">${escapeHtml(item.text)}</div>
          ${item.quantity ? `<div class="shopping-item-detail">${t('quantity')}: ${escapeHtml(item.quantity)}</div>` : ''}
          ${item.note ? `<div class="shopping-item-detail">${t('note')}: ${escapeHtml(item.note.substring(0, 50))}${item.note.length > 50 ? '...' : ''}</div>` : ''}
          <div class="shopping-item-user">${t('by')}: ${escapeHtml(item.userName)}</div>
        </div>
        <div class="shopping-item-buttons">
          <button onclick="openEditShoppingItemModal('${item.id}')" class="btn btn-edit">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="removeShoppingItem('${item.id}')" class="btn btn-delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function displayDashboardShoppingList() {
  const container = document.getElementById('dashboardShoppingList');
  if (!container) return;
  
  const items = (appState.shoppingItems || []).slice(0, 5); // Show only first 5 items
  
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">${t('noData')}</div>`;
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div style="padding: 0.75rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.75rem;">
      <i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}" style="color: ${item.completed ? '#27ae60' : '#ddd'};"></i>
      <div style="flex: 1;">
        <div style="text-decoration: ${item.completed ? 'line-through' : 'none'}; color: ${item.completed ? '#999' : '#333'}; font-weight: 500;">${escapeHtml(item.text)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${t('by')}: ${escapeHtml(item.userName)}</div>
        ${item.quantity ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${t('quantity')}: ${escapeHtml(item.quantity)}</div>` : ''}
        ${item.note ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${t('note')}: ${escapeHtml(item.note.substring(0, 50))}${item.note.length > 50 ? '...' : ''}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  if (items.length < (appState.shoppingItems || []).length) {
    container.innerHTML += `<div style="text-align: center; color: var(--primary-teal); padding: 0.75rem; cursor: pointer;" onclick="navigateTo('shopping')">+ More items</div>`;
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
