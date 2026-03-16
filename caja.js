(function () {
  const S = window.AppState;
  const $ = (id) => document.getElementById(id);
  window.initCajaBox = function () { const dateEl = $('cashDate'); if (dateEl && !dateEl.value) dateEl.value = todayISO(); };
  window.listenCierres = function () { if (S.unsubCierres) S.unsubCierres(); S.unsubCierres = db.collection('daily_closures').orderBy('date', 'desc').onSnapshot((snap) => { S.cierresCache = snap.docs.map((d) => ({ id: d.id, ...d.data() })); renderCajaResumen(); }, (err) => setCashMsg('Error leyendo cierres: ' + err.message)); };
  function cierreByDate(iso) { return S.cierresCache.find((c) => c.date === iso) || null; }
  window.renderCajaResumen = function () {
    const iso = $('cashDate')?.value || todayISO();
    const pedidos = window.pedidosDelDia ? pedidosDelDia(iso) : [];
    const ventas = pedidos.reduce((a, p) => a + Number(p.total || 0), 0);
    const cobrado = pedidos.filter((p) => (p.pagoEstado || '') === 'pagado').reduce((a, p) => a + Number(p.total || 0), 0);
    const porCobrar = pedidos.filter((p) => (p.pagoEstado || '') !== 'pagado').reduce((a, p) => a + Number(p.total || 0), 0);
    const cierre = cierreByDate(iso);
    const inversion = Number($('cashInversion')?.value || cierre?.inversion || 0);
    const gastos = Number($('cashGastos')?.value || cierre?.gastos || 0);
    const inicial = Number($('cashInicial')?.value || cierre?.inicial || 0);
    if (cierre) {
      if ($('cashInicial') && document.activeElement?.id !== 'cashInicial') $('cashInicial').value = cierre.inicial || 0;
      if ($('cashGastos') && document.activeElement?.id !== 'cashGastos') $('cashGastos').value = cierre.gastos || 0;
      if ($('cashInversion') && document.activeElement?.id !== 'cashInversion') $('cashInversion').value = cierre.inversion || 0;
      if ($('cashNotas') && document.activeElement?.id !== 'cashNotas') $('cashNotas').value = cierre.notas || '';
    }
    const ganancia = ventas - gastos - inversion;
    setText('cashVentas', money(ventas)); setText('cashCobrado', money(cobrado + inicial)); setText('cashPorCobrar', money(porCobrar)); setText('cashPedidos', pedidos.length); setText('cashInversionView', money(inversion)); setText('cashGanancia', money(ganancia)); setText('cashVentasFormula', money(ventas)); setText('cashGastosFormula', money(gastos)); setText('cashInvFormula', money(inversion)); setText('cashResultadoFinal', money(ganancia));
    setHtml('cashSavedState', cierre ? `<div class="statusOk">Cierre guardado</div><div class="small muted">Guardado por ${escapeHtml(cierre.updatedBy || 'admin')} • ${escapeHtml(fmtFecha(cierre.updatedAt))}</div><div style="margin-top:8px;">Inicial: <b>${money(cierre.inicial || 0)}</b><br>Gastos: <b>${money(cierre.gastos || 0)}</b><br>Inversión: <b>${money(cierre.inversion || 0)}</b></div>` : 'Aún no hay cierre guardado para esta fecha.');
    const tbody = $('cashPedidosRows');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!pedidos.length) return tbody.innerHTML = '<tr><td colspan="5" class="muted">No hay pedidos para esta fecha.</td></tr>';
    pedidos.forEach((p) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(p.nombre || 'Cliente')}</td><td>${escapeHtml(p.estado || 'pendiente')}</td><td>${escapeHtml(p.pagoEstado || 'pendiente')}</td><td>${money(p.total || 0)}</td><td>${escapeHtml(p.hora || fmtFecha(p.creado))}</td>`; tbody.appendChild(tr); });
  };
  window.guardarCierreCaja = async function () { const date = $('cashDate').value || todayISO(); const inicial = Number($('cashInicial').value || 0); const gastos = Number($('cashGastos').value || 0); const inversion = Number($('cashInversion').value || 0); const notas = ($('cashNotas').value || '').trim(); const pedidos = window.pedidosDelDia ? pedidosDelDia(date) : []; const ventas = pedidos.reduce((a, p) => a + Number(p.total || 0), 0); const cobrado = pedidos.filter((p) => (p.pagoEstado || '') === 'pagado').reduce((a, p) => a + Number(p.total || 0), 0); const porCobrar = pedidos.filter((p) => (p.pagoEstado || '') !== 'pagado').reduce((a, p) => a + Number(p.total || 0), 0); const utilidad = ventas - gastos - inversion; try { setCashMsg('Guardando cierre...'); await db.collection('daily_closures').doc(date).set({ date, inicial, gastos, inversion, notas, ventas, cobrado, porCobrar, pedidos: pedidos.length, utilidad, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser?.email || 'admin' }, { merge: true }); setCashMsg('✅ Cierre guardado.'); } catch (e) { setCashMsg('Error: ' + e.message); } };
})();
