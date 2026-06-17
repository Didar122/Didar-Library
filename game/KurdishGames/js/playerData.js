/* playerData.js - centralized player data manager
   Loads from Firestore (if available) or falls back to localStorage.
   Exposes simple API: loadForCurrentUser(), get(), update(fn), save(), subscribe(cb)
*/
(function(){
  const STORAGE_PREFIX = 'playerData_';
  const DEFAULT_DATA = { coins: 0, diamonds: 0, inventory: {}, selectedItems: {}, stats: {} };
  let data = Object.assign({}, DEFAULT_DATA);
  let subscribers = [];

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch(e){ return null }
  }

  function storageKeyFor(user) {
    if (user && user.username) return STORAGE_PREFIX + user.username;
    return 'playerData';
  }

  async function loadForCurrentUser() {
    const user = getCurrentUser();
    const key = storageKeyFor(user);

    // reset to defaults to avoid carrying previous user's in-memory state
    data = Object.assign({}, DEFAULT_DATA);

    // try Firestore first
    if (typeof firestore !== 'undefined' && user && user.username) {
      try {
        const doc = await firestore.collection('players').doc(user.username).get();
        if (doc.exists) {
          data = Object.assign({}, DEFAULT_DATA, doc.data());
          saveLocal(key);
          emit();
          return data;
        }
      } catch (e) {
        console.warn('playerDataManager: Firestore load failed', e);
      }
    }

    // fallback to localStorage
    try {
      const raw = localStorage.getItem(key);
      if (raw) data = Object.assign({}, data, JSON.parse(raw));
    } catch (e) {
      console.warn('playerDataManager: local load failed', e);
    }
    emit();
    return data;
  }

  function saveLocal(key) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){ console.warn('playerDataManager: saveLocal failed', e) }
  }

  async function save() {
    const user = getCurrentUser();
    const key = storageKeyFor(user);
    saveLocal(key);

    if (typeof firestore !== 'undefined' && user && user.username) {
      try {
        await firestore.collection('players').doc(user.username).set(data, { merge: true });
      } catch (e) {
        console.warn('playerDataManager: Firestore save failed', e);
      }
    }
    emit();
  }

  // Clear in-memory data and reset local anonymous storage (do not write to Firestore)
  function clear() {
    data = Object.assign({}, DEFAULT_DATA);
    try { localStorage.setItem('playerData', JSON.stringify(data)); } catch (e) { console.warn('playerDataManager: clear failed', e) }
    emit();
  }

  function get() { return data }

  function update(fn) {
    if (typeof fn === 'function') {
      try { fn(data); } catch (e) { console.warn('playerDataManager.update error', e) }
      save();
    }
  }

  function subscribe(cb) {
    if (typeof cb === 'function') {
      subscribers.push(cb);
      try { cb(data); } catch(e){}
      return function unsubscribe(){ subscribers = subscribers.filter(s => s !== cb) }
    }
    return function noop(){};
  }

  function emit() { subscribers.forEach(cb=>{ try{ cb(data) }catch(e){} }) }

  window.playerDataManager = { loadForCurrentUser, get, update, save, subscribe, clear };
})();
