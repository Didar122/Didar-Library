// Initialize Firebase using compat SDK loaded in HTML
const firebaseConfig = {
  apiKey: "AIzaSyCfc0Vca074e6U__OPrEvblVXWKtXUs9sI",
  authDomain: "kurdish-games-eeccd.firebaseapp.com",
  projectId: "kurdish-games-eeccd",
  storageBucket: "kurdish-games-eeccd.firebasestorage.app",
  messagingSenderId: "362322072586",
  appId: "1:362322072586:web:d758d0493a2f82e46bfbf3",
  measurementId: "G-1FCY4EEW6C"
};

const app = firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

window.firebaseApp = app;
window.firestore = firestore;
window.firebaseAvailable = true;