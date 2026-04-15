// Bilingual translations (Kurdish & English)
const translations = {
  ku: {
    // Headers & Navigation
    dashboard: "پەڕەی شەرەکی",
    patients: "نەخۆشەکان",
    appointments: "ژوانەکان",
    financial: "دارایی",
    doctors: "پزیشکەکان",
    settings: "ڕێکخستنەکان",
    about: "دەربارە",
    language: "زمان",
    selectLanguage: "هەڵبژاردنی زمان",
    languageInfo: "گۆڕینی زمانی ڕووکار بۆ زمانی هەڵبژێردراو.",
    shopping: "کڕین",
    shoppingList: "لیستی کڕین",
    users: "بەکارهێنەران",
    whiteboard: "تەختەی تێبینی",
    
    // Authentication
    login: "چوونەژوورەوە",
    logout: "دەرچوون",
    email: "ئیمەیڵ",
    password: "وشەی نهێنی",
    createAccount: "دروستکردنی هەژمار",
    register: "تۆمارکردن",
    backToLogin: "گەڕانەوە بۆ چوونەژوورەوە",
    clinicName: "ناوی عیادە",
    staffName: "ناوی کارمەند",
    
    // Dashboard
    totalPatients: "کۆی نەخۆشەکان",
    todayAppointments: "ژوانەکانی ئەمڕۆ",
    pendingPayments: "بڕە پارە ماوەکان (قەرز)",
    recentPatients: "نەخۆشە نوێکان",
    
    // Patient Management
    addPatient: "زیادکردنی نەخۆش",
    editPatient: "دەستکاری نەخۆش",
    patientName: "ناوی نەخۆش",
    patientPhone: "مۆبایلی نەخۆش",
    patientEmail: "ئیمەیڵی نەخۆش",
    patientAge: "تەمەن",
    patientGender: "ڕەگەز",
    patientAddress: "ناونیشان",
    medicalHistory: "مێژووی تەندروستی",
    patientProfile: "پڕۆفایلی نەخۆش",
    visitHistory: "مێژووی سەردانەکان",
    
    // Doctors
    addDoctor: "زیادکردنی پزیشک",
    doctorName: "ناوی پزیشک",
    docSpecialty: "پسپۆڕی",
    docPhone: "مۆبایل",
    docEmail: "ئیمەیڵ",
    
    // Treatments
    treatments: "چارەسەرەکان",
    addTreatment: "زیادکردنی چارەسەر",
    
    // Appointments
    scheduleAppointment: "دیاریکردنی ژوان",
    appointmentDate: "بەرواری ژوان",
    appointmentTime: "کاتی ژوان",
    appointmentType: "جۆری چارەسەر",
    doctor: "پزیشک",
    phone: "مۆبایل",
    date: "بەروار",
    time: "کات",
    patientInformation: "زانیاری نەخۆش",
    markAppointmentAsDone: "نیشانکردنی ژوان وەک تەواوکراو",
    treatmentProvided: "چارەسەری ئەنجامدراو",
    amountPaid: "بڕی پارەی دراو",
    remainingTreatmentSessions: "دانیشتنی ماوە بۆ چارەسەر",
    specialty: "پسپۆڕی",
    addAppointmentNotes: "تێبینی ژوان",
    jobTitle: "ناونیشانی کار",
    developedBy: "گەشەپێدراوە لەلایەن",
    moreApps: "بەرنامەی زیاتر",
    searchPatient: "گەڕان بۆ نەخۆش",
    appointmentHistory: "مێژووی ژوانەکان",
    noAppointments: "هیچ ژوانێک نییە",
    treatmentDescription: "وەسفی چارەسەر",
    
    // Shopping
    addItem: "زیادکردنی کاڵا",
    itemsToBuy: "لیستی کڕین",
    addShoppingItem: "زیادکردنی کاڵای نوێ",
    editShoppingItem: "دەستکاری کاڵا",
    manageShoppingList: "بەڕێوەبردنی لیستی کڕین",
    quantity: "بڕ / ژمارە",
    note: "تێبینی",
    pleaseEnterItemName: "تکایە ناوی کاڵاکە بنوسە",
    youMustBeLoggedIn: "دەبێت چوونەژوورەوەت کردبێت",
    
    // Whiteboard
    toDoWhiteboard: "تەختەی تێبینییەکان",
    addToDo: "زیادکردنی تێبینی",
    addTodoItem: "تێبینی نوێ زیاد بکە...",
    noTodoItemsYet: "هیچ تێبینییەک نییە. یەکێک لێرە زیاد بکە!",
    
    // Financial
    addPayment: "زیادکردنی پارە",
    totalRevenue: "کۆی گشتی داهات",
    remainingAmounts: "بڕە ماوەکان ( قەرزەکان )",
    transactions: "مامەڵە داراییەکان",
    revenue: "داهات",
    amount: "بڕ",
    status: "بارودۆخ",
    
    // Common
    save: "پاشکەوتکردن",
    cancel: "هەڵوەشاندنەوه",
    delete: "سڕینەوە",
    edit: "دەستکاری",
    search: "گەڕان",
    loading: "بارکردن...",
    noData: "هیچ داتایەک نییە",
    noVisitHistory: "هیچ مێژوویەکی سەردانکردن نییە",
    noTreatmentsRecorded: "هیچ چارەسەرێک تۆمار نەکراوە",
    success: "سەرکەوتوو بوو!",
    error: "هەڵە ڕوویدا",
    completed: "تەواوکراو",
    pending: "چاوەڕوانکراو",
    scheduled: "دیاریکراو",
    hideCompleted: "شاردنەوەی تەواوکراوەکان",
    selectPatient: "هەڵبژاردنی نەخۆش",
    selectDoctor: "هەڵبژاردنی پزیشک",
    by: "لەلایەن",
    
    // Sidebar Menu
    profile: "پڕۆفایل",
    languageSelection: "هەڵبژاردنی زمان",
    allStaff: "هەموو کارمەندەکان",
    
    // Search
    searchByNamePhone: "گەڕان بە ناو یان مۆبایل...",
    searchByNameDoctor: "گەڕان بە ناوی پزیشک...",
    searchByPatientAppointment: "گەڕان بە ناوی نەخۆش...",
    searchByPatientTransaction: "گەڕان بە ناوی نەخۆش...",
    
    // Additional
    createdBy: "دروستکراوە لەلایەن",
    createdOn: "کات و بەرواری دروستکردن",
    notes: "تێبینییەکان",
    illness: "نەخۆشی/مێژووی پزیشکی",
    email: "ئیمەیڵ",
    exportPDF: "داگرتنی زانیاریەکان بە PDF",
    edit: "دەستکاری",
    editPatient: "دەستکاری نەخۆش",
    deletePatient: "سڕینەوەی نەخۆش",
    cost: "نرخی تێچوو",
    remainingAmount: "بڕی پارەی ماوە",
    remainingSessions: "دانیشتنە ماوەکان",
    licenseNumber: "ژمارەی مۆڵەت",
    fromDate: "لە بەرواری",
    toDate: "بۆ بەرواری",
    clinicManagement: "سیستمی بەڕێوەبردنی  نۆرینگە",
    patientInformationReport: "ڕاپۆرتی زانیاریی  نەخۆش",
    generatedOn: "دروستکراو لە",
    patientDetails: "زانیاریەکانی  نەخۆش",
    createdAt: "کات و بەرواری  دروستکردن",
    treatmentRecords: "تۆمارە چارەسەریەکان",
    treatmentType: "جۆری چارەسەر",
    pdfConfidential: "ئەم دۆکومێنتە نهێنیە و زانیاریی پزیشکی و کەسی تێدایە.",
    patientInformationReportPDF: "داگرتنی زانیاریی نەخۆش (PDF)",
    sortNewest: "ڕیزکردن لە نوێترینەوە",
    sortOldest: "ڕیزکردن لە کۆنترینەوە",
    
    // Day Names
    sunday: "یەکشەممە",
    monday: "دووشەممە",
    tuesday: "سێشەممە",
    wednesday: "چوارشەممە",
    thursday: "پێنجشەممە",
    friday: "هەینی",
    saturday: "شەممە",
    
    // Month Names
    january: "کانوونی یەکەم",
    february: "شوبات",
    march: "ئازار",
    april: "نیسان",
    may: "ئایار",
    june: "حزیران",
    july: "تەموز",
    august: "ئاب",
    september: "ئەیلول",
    october: "تشرینی یەکەم",
    november: "تشرینی دووەم",
    december: "کانوونی دووەم",
    
    // Search
    searchByNamePhone: "گەڕان بە ناو یان مۆبایل...",
    searchByNameDoctor: "گەڕان بە ناو پزیشک...",
    searchByPatientAppointment: "گەڕان بە ناوی نەخۆش...",
    searchByPatientTransaction: "گەڕان بە ناوی نەخۆش...",
    
    // Appointment section
    onlyToday: "تەنها ئەمڕۆ",
    statusLegend: "ڕوونکردنەوەی بارودۆخەکان",
    outdated: "بەسەرچوو",
    
    // Financial section
    patientsRemainingAmounts: "بڕە پارەی ماوە لای نەخۆشەکان ( قەرزەکان )",
    noPatientsWithRemainingAmounts: "هیچ نەخۆشێک قەرزی لەسەر نییە",
    
    // Patient Profile
    patientDetails: "زانیاریەکانی نەخۆش",
    viewProfile: "بینینی پڕۆفایل",
    editPatient: "دەستکاری نەخۆش",
    deletePatient: "سڕینەوەی نەخۆش",
    viewDetails: "بینینی زانیاریەکان",
    recentAppointments: "ژوانە نوێیەکان",
    
    // Appointment Modal
    appointmentDetails: "وردەکاری ژوان",
    completeAppointment: "تەواوکردنی ژوان",
    
    // Settings
    themeSelection: "هەڵبژاردنی ڕوکار",
    lightTheme: "ڕوکاری ڕووناک",
    darkTheme: "ڕوکاری تاریک",
    themeInfo: "ڕوکاری هەڵبژێردراو بە شێوەیەکی خۆکار پاشکەوت دەکرێت.",
    dataManagement: "بەڕێوەبردنی زانیاریەکان",
    clearData: "سڕینەوەی زانیاریەکان",
    deleteDataWarning: "سڕینەوەی داتا بەپێی فلتەری بەروار.",
    selectSectionToClear: "بەشێک هەڵبژێرە بۆ پاککردنەوە:",
    clearSelectedData: "پاککردنەوەی داتای دیاریکراو",
    clearDataDescription: "بەشێک هەڵبژێرە بۆ سڕینەوەی هەمیشەیی زانیاریەکان.",
    chooseSection: "-- بەشێک هەڵبژێرە --",
    allPatients: "هەموو نەخۆشەکان",
    allDoctors: "هەموو پزیشکەکان",
    allAppointments: "هەموو ژوانەکان",
    allTreatments: "هەموو چارەسەرەکان",
    allTransactions: "هەموو مامەڵەکان",
    everythingAllData: "هەموو (گشت زانیاریەکان)",
    
    // About
    about: "دەربارە",
    aboutText: "32 Dent - سیستەمی پێشکەوتووی بەڕێوەبردنی نۆرینگەی",
    version: "وەشان",
    aboutDescription: "بەرنامەیەک تایبەت بە بەڕێوەبردنی نەخۆش، ژوان، پزیشک و تۆمارە داراییەکان بە شێوەیەکی کارا و پێشکەوتوو.",
    
    // Common in tables/lists
    name: "ناو",
    phone: "مۆبایل",
    age: "تەمەن",
    address: "ناونیشان",
    specialty: "پسپۆڕی",
    department: "بەش",
    date: "بەروار",
    time: "کات",
    view: "بینین",
    createdBy: "دروستکراوە لەلایەن",
    updatedBy: "نوێکراوەتەوە لەلایەن",
  },
  en: {
    // English section remains identical as requested
    dashboard: "Dashboard",
    patients: "Patients",
    appointments: "Appointments",
    financial: "Financial",
    doctors: "Doctors",
    settings: "Settings",
    about: "About",
    language: "Language",
    selectLanguage: "Select Language",
    languageInfo: "The interface will change to the selected language immediately.",
    shopping: "Shopping",
    shoppingList: "Shopping List",
    users: "Users",
    whiteboard: "Whiteboard",
    
    // Authentication
    login: "Login",
    logout: "Logout",
    email: "Email",
    password: "Password",
    createAccount: "Create Account",
    register: "Register",
    backToLogin: "Back to Login",
    clinicName: "Clinic Name",
    staffName: "Staff Name",
    
    // Dashboard
    totalPatients: "Total Patients",
    todayAppointments: "Today's Appointments",
    pendingPayments: "Pending Payments",
    recentPatients: "Recent Patients",
    
    // Patient Management
    addPatient: "Add Patient",
    editPatient: "Edit Patient",
    patientName: "Patient Name",
    patientPhone: "Patient Phone",
    patientEmail: "Patient Email",
    patientAge: "Age",
    patientGender: "Gender",
    patientAddress: "Address",
    medicalHistory: "Medical History",
    patientProfile: "Patient Profile",
    visitHistory: "Visit History",
    
    // Doctors
    doctors: "Doctors",
    addDoctor: "Add Doctor",
    doctorName: "Doctor Name",
    docSpecialty: "Specialty",
    docPhone: "Phone",
    docEmail: "Email",
    
    // Treatments
    treatments: "Treatments",
    addTreatment: "Add Treatment",
    
    // Appointments
    scheduleAppointment: "Schedule Appointment",
    appointmentDate: "Appointment Date",
    appointmentTime: "Appointment Time",
    appointmentType: "Appointment Type",
    doctor: "Doctor",
    phone: "Phone",
    date: "Date",
    time: "Time",
    patientInformation: "Patient Information",
    markAppointmentAsDone: "Mark Appointment as Done",
    treatmentProvided: "Treatment Provided",
    amountPaid: "Amount Paid",
    remainingTreatmentSessions: "Remaining Treatment Sessions",
    specialty: "Specialty",
    addAppointmentNotes: "Add Appointment Notes",
    jobTitle: "Job Title",
    developedBy: "Developed by",
    moreApps: "More Apps",
    searchPatient: "Search Patient",
    appointmentHistory: "Appointment History",
    noAppointments: "No appointments",
    treatmentDescription: "Treatment",
    
    // Shopping
    addItem: "Add Item",
    itemsToBuy: "Items to Buy",
    addShoppingItem: "Add Shopping Item",
    editShoppingItem: "Edit Shopping Item",
    manageShoppingList: "Manage Shopping List",
    quantity: "Quantity",
    note: "Note",
    pleaseEnterItemName: "Please enter an item name",
    youMustBeLoggedIn: "You must be logged in",
    
    // Whiteboard
    toDoWhiteboard: "To-Do Whiteboard",
    addToDo: "Add To-Do",
    addTodoItem: "Add a to-do item...",
    noTodoItemsYet: "No to-do items yet. Add one above!",
    
    // Financial
    addPayment: "Add Payment",
    totalRevenue: "Total Revenue",
    remainingAmounts: "Remaining Amounts",
    transactions: "Transactions",
    revenue: "Revenue",
    amount: "Amount",
    status: "Status",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    search: "Search",
    loading: "Loading...",
    noData: "No Data",
    noVisitHistory: "No visit history",
    noTreatmentsRecorded: "No treatments recorded",
    success: "Success!",
    error: "Error",
    completed: "Completed",
    pending: "Pending",
    scheduled: "Scheduled",
    hideCompleted: "Hide Completed",
    selectPatient: "Select Patient",
    selectDoctor: "Select Doctor",
    by: "By",
    
    // Sidebar Menu
    profile: "Profile",
    languageSelection: "Language Selection",
    allStaff: "All Staff",
    
    // Search
    searchByNamePhone: "Search by name or phone...",
    searchByNameDoctor: "Search doctor name...",
    searchByPatientAppointment: "Search by patient name...",
    searchByPatientTransaction: "Search by patient name...",
    
    // Appointment section
    onlyToday: "Only Today",
    statusLegend: "Appointment Status Legend",
    outdated: "Outdated",
    
    // Financial section
    patientsRemainingAmounts: "Patients Remaining Amounts",
    noPatientsWithRemainingAmounts: "No patients with remaining amounts",
    
    // Patient Profile
    patientDetails: "Patient Details",
    viewProfile: "View Profile",
    editPatient: "Edit Patient",
    deletePatient: "Delete Patient",
    viewDetails: "View Details",
    recentAppointments: "Recent Appointments",
    
    // Appointment Modal
    appointmentDetails: "Appointment Details",
    completeAppointment: "Complete Appointment",
    
    // Settings
    themeSelection: "Theme Selection",
    lightTheme: "Light Theme",
    darkTheme: "Dark Theme",
    themeInfo: "Your theme preference is saved automatically.",
    dataManagement: "Data Management",
    clearData: "Clear Data",
    deleteDataWarning: "Delete data with optional date range filtering.",
    selectSectionToClear: "Select Section to Clear:",
    clearSelectedData: "Clear Selected Data",
    clearDataDescription: "Select data to permanently delete with optional date range filtering.",
    chooseSection: "-- Choose Section --",
    allPatients: "All Patients",
    allDoctors: "All Doctors",
    allAppointments: "All Appointments",
    allTreatments: "All Treatments",
    allTransactions: "All Transactions",
    everythingAllData: "Everything (All Data)",
    
    // About
    about: "About",
    aboutText: "32 Dent - Professional Clinic Management System",
    version: "Version",
    aboutDescription: "Manage your clinic's patients, appointments, doctors, and financial records efficiently.",
    
    // Common in tables/lists
    name: "Name",
    phone: "Phone",
    age: "Age",
    address: "Address",
    specialty: "Specialty",
    department: "Department",
    date: "Date",
    time: "Time",
    view: "View",
    createdBy: "Created By",
    createdOn: "Created On",
    notes: "Notes",
    illness: "Illness/Medical History",
    email: "Email",
    exportPDF: "Download PDF",
    cost: "Cost",
    remainingAmount: "Remaining Amount",
    remainingSessions: "Remaining Sessions",
    licenseNumber: "License Number",
    fromDate: "From Date",
    toDate: "To Date",
    clinicManagement: "Clinic Management System",
    patientInformationReport: "Patient Information Report",
    generatedOn: "Generated on",
    patientDetails: "Patient Details",
    createdAt: "Created On",
    treatmentRecords: "Treatment Records",
    treatmentType: "Treatment Type",
    pdfConfidential: "This document is confidential and contains sensitive medical information.",
    patientInformationReportPDF: "Download Patient Information (PDF)",
    sortNewest: "Newest First",
    sortOldest: "Oldest First",
    
    // Day Names
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    
    // Month Names
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",
  }
};

// Function to get translated text
function t(key, lang = localStorage.getItem('language') || 'en') {
  return translations[lang]?.[key] || translations['en'][key] || key;
}

// Set language
function setLanguage(lang) {
  localStorage.setItem('language', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ku' ? 'rtl' : 'ltr';
  updatePageLanguage();
}

// Update all text on page
function updatePageLanguage() {
  const lang = localStorage.getItem('language') || 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'), lang);
  });
  
  // Update placeholders
  document.querySelectorAll('[data-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-placeholder'), lang));
  });
}

// Initialize language on load
window.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('language') || 'en';
  document.documentElement.lang = savedLang;
  document.documentElement.dir = savedLang === 'ku' ? 'rtl' : 'ltr';
  updatePageLanguage();
});
