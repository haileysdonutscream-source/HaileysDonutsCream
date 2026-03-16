(function () {
  const S = window.AppState;

  function $(id) { return document.getElementById(id); }
  function safe(v) { return v === undefined || v === null ? '' : String(v); }
  function escapeHtml(str) { return String(str || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
  function fmtFecha(ts) { try { if (!ts) return ''; if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString(); if (ts instanceof Date) return ts.toLocaleString(); return String(ts); } catch (_) { return ''; } }
  function recortar(txt, n = 32) { txt = String(txt || ''); return txt.length <= n ? txt : txt.slice(0, n - 1) + '…'; }
  function money(n) { return `RD$${Number(n || 0).toFixed(2)}`.replace('.00', ''); }
  function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function normalizeUsername(v) { return String(v || '').trim().toLowerCase(); }
  function resolveLoginEmail(username) { return S.USER_LOGIN_MAP[normalizeUsername(username)] || null; }
  function resolveUsernameFromEmail(email) {
    email = String(email || '').trim().toLowerCase();
    for (const [username, mappedEmail] of Object.entries(S.USER_LOGIN_MAP)) {
      if (String(mappedEmail).toLowerCase() === email) return username;
    }
    return email.replace('@panel.local', '');
  }
  function setText(id, msg) { const el = $(id); if (el) el.innerText = msg || ''; }
  function setHtml(id, msg) { const el = $(id); if (el) el.innerHTML = msg || ''; }
  function setBtnState(btn, active) { if (!btn) return; btn.classList.toggle('secondary', !active); }

  window.safe = safe;
  window.escapeHtml = escapeHtml;
  window.fmtFecha = fmtFecha;
  window.recortar = recortar;
  window.money = money;
  window.todayISO = todayISO;
  window.setText = setText;
  window.setHtml = setHtml;
  window.setLoginMsg = (m) => setText('loginMsg', m);
  window.setStMsg = (m) => setText('stMsg', m);
  window.setProdMsg = (m) => setText('prodMsg', m);
  window.setInvMsg = (m) => setText('invMsg', m);
  window.setCalcMsg = (m) => setText('calcMsg', m);
  window.setCashMsg = (m) => setText('cashMsg', m);
  window.setEditMsg = (m) => setText('editMsg', m);
  window.resolveUsernameFromEmail = resolveUsernameFromEmail;

  window.login = async function login() {
    const username = normalizeUsername($('email')?.value || '');
    const password = $('password')?.value || '';
    const loginBtn = document.querySelector('#loginBox button[type="button"]');
    if (!username || !password) return setLoginMsg('Pon usuario y contraseña.');
    const email = resolveLoginEmail(username);
    if (!email) return setLoginMsg('Ese usuario no está autorizado.');
    try {
      if (loginBtn) loginBtn.disabled = true;
      setLoginMsg('Entrando...');
      await auth.signInWithEmailAndPassword(email, password);
      setLoginMsg('');
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/user-not-found') setLoginMsg('Ese usuario no existe.');
      else if (code === 'auth/wrong-password') setLoginMsg('Contraseña incorrecta.');
      else if (code === 'auth/invalid-email') setLoginMsg('Usuario inválido.');
      else if (code === 'auth/too-many-requests') setLoginMsg('Demasiados intentos. Espera un momento.');
      else setLoginMsg('Usuario o contraseña incorrectos.');
    } finally {
      if (loginBtn) loginBtn.disabled = false;
    }
  };

  window.logout = async function logout() { await auth.signOut(); };

  window.aplicarPermisosUI = function aplicarPermisosUI() {
    const btnEditarTienda = $('btnEditarTienda');
    const btnCostos = $('btnCostos');
    const btnCaja = $('btnCaja');
    const roleBadge = $('roleBadge');
    [btnEditarTienda, btnCostos, btnCaja].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !S.isAdminUser;
      btn.style.opacity = S.isAdminUser ? '1' : '.45';
      btn.style.pointerEvents = S.isAdminUser ? 'auto' : 'none';
    });
    if (roleBadge) roleBadge.textContent = S.isAdminUser ? '🔑 Admin' : '👷 Empleado';
  };

  window.mostrarSeccion = function mostrarSeccion(which) {
    const boxes = { pedidos: $('pedidosBox'), tienda: $('tiendaBox'), costos: $('costosBox'), caja: $('cajaBox') };
    Object.values(boxes).forEach((x) => x && x.classList.add('hidden'));
    if ((which === 'tienda' || which === 'costos' || which === 'caja') && !S.isAdminUser) return;
    (boxes[which] || boxes.pedidos).classList.remove('hidden');
    setBtnState($('btnPedidos'), which === 'pedidos');
    setBtnState($('btnEditarTienda'), which === 'tienda');
    setBtnState($('btnCostos'), which === 'costos');
    setBtnState($('btnCaja'), which === 'caja');
    if (which === 'tienda') { if (window.cargarStoreSettings) cargarStoreSettings(); if (window.listenProductos) listenProductos(); if (window.toggleCamposProducto) toggleCamposProducto(); }
    if (which === 'costos') { if (window.listenInventario) listenInventario(); if (window.listenRecetas) listenRecetas(); if (window.cargarRecetaBase) cargarRecetaBase(); }
    if (which === 'caja') { if (window.listenCierres) listenCierres(); if (window.initCajaBox) initCajaBox(); if (window.renderCajaResumen) renderCajaResumen(); }
  };

  function ensurePanelAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!S.panelAudioCtx) S.panelAudioCtx = new AudioCtx();
      return S.panelAudioCtx;
    } catch (e) {
      console.warn('No se pudo crear el contexto de audio:', e);
      return null;
    }
  }

  async function unlockPanelAudio() {
    try {
      const ctx = ensurePanelAudio();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn('No se pudo desbloquear el audio:', e);
    }
  }

  window.playNewOrderSound = async function playNewOrderSound() {
    try {
      const ctx = ensurePanelAudio();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.connect(ctx.destination);
      const tones = [
        { f: 880, t: now, d: 0.18, type: 'sine', v: 0.08 },
        { f: 1174, t: now + 0.08, d: 0.22, type: 'triangle', v: 0.06 },
        { f: 1567, t: now + 0.17, d: 0.26, type: 'sine', v: 0.05 }
      ];
      tones.forEach(({ f, t, d, type, v }) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t);
        osc.connect(gain);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(v, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.start(t);
        osc.stop(t + d);
      });
    } catch (e) {
      console.error('Error reproduciendo sonido:', e);
    }
  };

  window.showToastNew = function showToastNew(p) {
    const toast = $('toastNew');
    const text = $('toastText');
    if (!toast || !text) return;
    text.textContent = `${(p.nombre || 'Cliente').toString()} • ${money(p.total || 0)}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  };

  document.addEventListener('keydown', (e) => {
    const loginBox = $('loginBox');
    const appBox = $('appBox');
    if (!loginBox || loginBox.classList.contains('hidden')) return;
    if (appBox && !appBox.classList.contains('hidden')) return;
    if (e.key === 'Enter') { e.preventDefault(); login(); }
  });

  ['click', 'touchstart', 'keydown'].forEach((evt) => document.addEventListener(evt, unlockPanelAudio, { once: true }));

  auth.onAuthStateChanged(async (user) => {
    if (window.toggleCamposProducto) toggleCamposProducto();
    const loginBox = $('loginBox');
    const appBox = $('appBox');
    if (!user) {
      [S.unsubPedidos, S.unsubProductos, S.unsubInventario, S.unsubRecetas, S.unsubCierres].forEach((fn) => { try { if (fn) fn(); } catch (_) {} });
      S.pedidosCache = []; S.inventarioCache = []; S.recetasCache = []; S.cierresCache = [];
      S.currentRole = 'empleado'; S.isAdminUser = false; S.selectedPedidoId = null; S.firstPedidosLoad = true;
      loginBox.classList.remove('hidden'); appBox.classList.add('hidden'); setText('userEmail', '-');
      return;
    }
    try {
      const roleDoc = await db.collection('roles').doc(user.uid).get();
      S.isAdminUser = roleDoc.exists && roleDoc.data().admin === true;
      S.currentRole = S.isAdminUser ? 'admin' : 'empleado';
      setText('userEmail', resolveUsernameFromEmail(user.email || '') || '(sin usuario)');
      loginBox.classList.add('hidden');
      appBox.classList.remove('hidden');
      aplicarPermisosUI();
      mostrarSeccion('pedidos');
      if (window.listenPedidos) listenPedidos();
      if (window.listenProductos) listenProductos();
      if (S.isAdminUser) {
        if (window.listenInventario) listenInventario();
        if (window.listenRecetas) listenRecetas();
        if (window.listenCierres) listenCierres();
        if (window.initCajaBox) initCajaBox();
        if (window.cargarRecetaBase) cargarRecetaBase();
      }
    } catch (e) {
      alert(e.message);
    }
  });
})();
