(function () {
  const S = window.AppState;
  const $ = (id) => document.getElementById(id);

  function getFechaPedidoDate(p) {
    try {
      if (p.creado && typeof p.creado.toDate === 'function') return p.creado.toDate();
      if (p.creado instanceof Date) return p.creado;
      if (typeof p.creado === 'string' || typeof p.creado === 'number') return new Date(p.creado);
      return null;
    } catch (_) { return null; }
  }

  function esMismaFecha(fecha, iso) {
    if (!fecha || !iso) return false;
    const [y, m, d] = iso.split('-').map(Number);
    return fecha.getFullYear() === y && fecha.getMonth() + 1 === m && fecha.getDate() === d;
  }

  window.pedidosDelDia = function pedidosDelDia(iso) {
    return S.pedidosCache.filter((p) => esMismaFecha(getFechaPedidoDate(p), iso));
  };

  window.actualizarKPIs = function actualizarKPIs() {
    const total = S.pedidosCache.length;
    const pendientes = S.pedidosCache.filter((p) => (p.estado || 'pendiente') === 'pendiente').length;
    const noPagados = S.pedidosCache.filter((p) => (p.pagoEstado || 'pendiente') === 'no_pagado').length;
    setText('kTotal', total); setText('kPend', pendientes); setText('kNoPag', noPagados);
    const hoy = todayISO();
    const pedidosHoy = pedidosDelDia(hoy);
    const ventasHoy = pedidosHoy.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const cobradosHoy = pedidosHoy.filter((p) => (p.pagoEstado || '') === 'pagado').reduce((acc, p) => acc + Number(p.total || 0), 0);
    const porCobrarHoy = pedidosHoy.filter((p) => (p.pagoEstado || '') !== 'pagado').reduce((acc, p) => acc + Number(p.total || 0), 0);
    const ticketHoy = pedidosHoy.length ? Math.round(ventasHoy / pedidosHoy.length) : 0;
    setText('kVentasHoy', money(ventasHoy)); setText('kCobradoHoy', money(cobradosHoy)); setText('kPorCobrarHoy', money(porCobrarHoy));
    setText('kPedidosHoy', pedidosHoy.length); setText('kTicketHoy', money(ticketHoy)); setText('kPagadosHoy', pedidosHoy.filter((p) => (p.pagoEstado || '') === 'pagado').length);
  };

  window.listenPedidos = function listenPedidos() {
    if (S.unsubPedidos) S.unsubPedidos();
    S.unsubPedidos = db.collection('pedidos').orderBy('creado', 'desc').onSnapshot((snap) => {
      if (!S.firstPedidosLoad) {
        const added = snap.docChanges().filter((c) => c.type === 'added');
        if (added.length) {
          const newest = added[0].doc.data() || {};
          playNewOrderSound();
          showToastNew(newest);
        }
      }
      S.pedidosCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      actualizarKPIs();
      renderFiltrado();
      if (window.renderCajaResumen) renderCajaResumen();
      S.firstPedidosLoad = false;
    }, (err) => alert('Error leyendo pedidos: ' + err.message));
  };

  window.renderFiltrado = function renderFiltrado() {
    const fEstado = $('fEstado').value;
    const fPago = $('fPago').value;
    const fBuscar = $('fBuscar').value.trim().toLowerCase();
    let list = [...S.pedidosCache];
    list.sort((a, b) => ((a.estado === 'realizado') ? 1 : 0) - ((b.estado === 'realizado') ? 1 : 0));
    if (fEstado !== 'todos') list = list.filter((p) => (p.estado || 'pendiente') === fEstado);
    if (fPago !== 'todos') list = list.filter((p) => (p.pagoEstado || 'pendiente') === fPago);
    if (fBuscar) list = list.filter((p) => (p.nombre || '').toLowerCase().includes(fBuscar) || (p.direccion || '').toLowerCase().includes(fBuscar));
    setText('leftCount', list.length);
    if (S.selectedPedidoId && !list.find((x) => x.id === S.selectedPedidoId)) S.selectedPedidoId = null;
    if (!S.selectedPedidoId && list.length) S.selectedPedidoId = list[0].id;
    renderListaIzquierda(list);
    renderDetalleDerecha(list.find((x) => x.id === S.selectedPedidoId) || null);
  };

  window.renderListaIzquierda = function renderListaIzquierda(list) {
    const cont = $('listaPedidos');
    if (!cont) return;
    cont.innerHTML = '';
    if (!list.length) return cont.innerHTML = '<div class="muted" style="padding:10px;">No hay pedidos con esos filtros.</div>';
    list.forEach((p) => {
      const item = document.createElement('div');
      const estado = p.estado || 'pendiente';
      const pago = p.pagoEstado || 'pendiente';
      item.className = `pedItem estado-${estado} ${p.id === S.selectedPedidoId ? 'active' : ''}`;
      item.innerHTML = `<div class="pedTop"><div><div class="pedName">${escapeHtml(p.nombre || 'Cliente')}</div><div class="pedMeta">${escapeHtml(recortar(p.direccion || '', 34))}</div><div class="pedMeta">Creado: ${escapeHtml(fmtFecha(p.creado))}</div><div class="pedPagoBadge ${escapeHtml(pago)}">${pago === 'pagado' ? 'Pagado' : pago === 'no_pagado' ? 'No pagado' : 'Pago pendiente'}</div></div><div style="text-align:right;">${estado === 'pendiente' ? '<span class="pedTag">Nuevo</span>' : ''}${estado === 'realizado' ? '<span class="pedAtendido">Atendido</span>' : ''}<div class="pedMoney" style="margin-top:8px;">${money(p.total || 0)}</div></div></div>`;
      item.onclick = () => { S.selectedPedidoId = p.id; renderListaIzquierda(list); renderDetalleDerecha(p); };
      cont.appendChild(item);
    });
  };

  window.bindDetallePanelsState = function bindDetallePanelsState() {
    [['detalleCliente', 'cliente'], ['detalleResumen', 'resumen'], ['detalleGestion', 'gestion']].forEach(([id, key]) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('toggle', () => { S.detallePanelsState[key] = el.open; });
    });
  };

  window.renderDetalleDerecha = function renderDetalleDerecha(p) {
    const box = $('detalleContenido');
    const badge = $('detalleNuevo');
    const bEdit = $('dBtnEdit'); const bRec = $('dBtnRec'); const bLis = $('dBtnLis'); const bDel = $('dBtnDel');
    const disableAll = () => [bEdit, bRec, bLis, bDel].forEach((b) => b && (b.disabled = true));
    if (!box) return;
    if (!p) { badge?.classList.add('hidden'); box.innerHTML = 'Selecciona un pedido a la izquierda.'; return disableAll(); }
    const estado = p.estado || 'pendiente'; const pagoEstado = p.pagoEstado || 'pendiente';
    const combos = Array.isArray(p.combos) ? p.combos.map((c) => `• ${c.cantidad} x ${escapeHtml(c.combo)} (${money(c.precio)})`).join('<br>') : '';
    const topsIncluidos = Array.isArray(p.toppingsIncluidos) ? p.toppingsIncluidos.map((t) => `• ${escapeHtml(t)}`).join('<br>') : '';
    const topsExtras = Array.isArray(p.toppingsExtras) ? p.toppingsExtras.map((t) => `• ${escapeHtml(t)}`).join('<br>') : '';
    const topsLegacy = Array.isArray(p.tops) ? p.tops.map((t) => `• ${escapeHtml(t)}`).join('<br>') : '';
    const glaseados = Array.isArray(p.glaseados) ? p.glaseados.map((g) => `• ${escapeHtml(g)}`).join('<br>') : '';
    badge?.classList.toggle('hidden', estado !== 'pendiente');
    box.innerHTML = `<details id="detalleCliente" class="card" style="padding:14px; margin-bottom:10px;" ${S.detallePanelsState.cliente ? 'open' : ''}><summary style="cursor:pointer; font-weight:800; color:#c2185b; font-size:18px;">👤 Información del cliente</summary><div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;"><div><div class="small muted">Cliente</div><div><strong>${escapeHtml(p.nombre || '')}</strong></div></div><div><div class="small muted">Teléfono</div><div>${p.telefono ? `📞 <b>${escapeHtml(p.telefono)}</b>` : '<span class="muted">(sin teléfono)</span>'}</div></div><div><div class="small muted">Dirección</div><div>${escapeHtml(p.direccion || '—')}</div></div><div><div class="small muted">Entrega</div><div>${p.tipo === 'delivery' ? '🚚 Delivery' : '📍 Pickup'}</div></div><div><div class="small muted">Método de pago</div><div><b>${escapeHtml(p.pago || '—')}</b></div></div><div><div class="small muted">Fecha de entrega</div><div>${escapeHtml(p.fecha || '')} ${escapeHtml(p.hora || '')}</div></div><div style="grid-column:1 / -1;"><div class="small muted">Creado</div><div>${escapeHtml(fmtFecha(p.creado))}</div></div></div></details><details id="detalleResumen" class="card" style="padding:14px; margin-bottom:10px;" ${S.detallePanelsState.resumen ? 'open' : ''}><summary style="cursor:pointer; font-weight:800; color:#c2185b; font-size:18px;">🧾 Resumen del pedido</summary><div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:14px;"><div><div><b>Combos</b></div><div class="small" style="margin-top:6px;">${combos || '<span class="muted">-</span>'}</div></div><div><div><b>Toppings incluidos</b></div><div class="small" style="margin-top:6px;">${topsIncluidos || topsLegacy || '<span class="muted">-</span>'}</div></div><div><div><b>Toppings extra</b></div><div class="small" style="margin-top:6px;">${topsExtras || '<span class="muted">-</span>'}</div></div><div><div><b>Glaseados</b></div><div class="small" style="margin-top:6px;">${glaseados || '<span class="muted">-</span>'}</div></div><div style="grid-column:1 / -1;"><span class="pill">TOTAL ${money(p.total || 0)}</span></div></div></details><details id="detalleGestion" class="card" style="padding:14px;" ${S.detallePanelsState.gestion ? 'open' : ''}><summary style="cursor:pointer; font-weight:800; color:#c2185b; font-size:18px;">⚙️ Gestión del pedido</summary><div style="margin-top:14px;"><label class="small muted">Estado del pedido</label><select onchange="updatePedido('${p.id}', {estado:this.value})"><option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option><option value="realizado" ${estado === 'realizado' ? 'selected' : ''}>Realizado</option><option value="cancelado" ${estado === 'cancelado' ? 'selected' : ''}>Cancelado</option></select><label class="small muted">Estado del pago</label><select onchange="updatePedido('${p.id}', {pagoEstado:this.value})"><option value="pendiente" ${pagoEstado === 'pendiente' ? 'selected' : ''}>Pendiente</option><option value="pagado" ${pagoEstado === 'pagado' ? 'selected' : ''}>Pagado</option><option value="no_pagado" ${pagoEstado === 'no_pagado' ? 'selected' : ''}>No pagado</option></select><label class="small muted">Motivo (si no pagó)</label><input value="${escapeHtml(p.motivoNoPago || '')}" placeholder="Ej: no respondió" onblur="updatePedido('${p.id}', {motivoNoPago:this.value})"/><label class="small muted">Notas internas</label><textarea placeholder="Notas..." onblur="updatePedido('${p.id}', {notas:this.value})">${escapeHtml(p.notas || '')}</textarea></div></details>`;
    bindDetallePanelsState();
    [bEdit, bRec, bLis, bDel].forEach((b) => b && (b.disabled = false));
    if (bEdit) bEdit.onclick = () => alert('Módulo de edición completa pendiente de migrar.');
    if (bRec) bRec.onclick = () => enviarPlantilla(p.id, 'recibido');
    if (bLis) bLis.onclick = () => marcarPedidoListo(p.id);
    if (bDel) bDel.onclick = () => borrarPedido(p.id);
  };

  window.updatePedido = async function updatePedido(id, patch) {
    try { await db.collection('pedidos').doc(id).set(patch, { merge: true }); if (window.renderCajaResumen) renderCajaResumen(); } catch (e) { alert('Error actualizando: ' + e.message); }
  };

  function normalizarTel(tel) { tel = String(tel || '').replace(/\D/g, ''); if (tel.length === 10) tel = '1' + tel; return tel; }
  function getPedidoById(id) { return S.pedidosCache.find((p) => p.id === id); }
  function armarResumenPedido(p) {
    const combos = Array.isArray(p.combos) ? p.combos.map((c) => `- ${c.cantidad} x ${c.combo} (${money(c.precio)})`).join('\n') : '- (sin combos)';
    const topsIncluidos = Array.isArray(p.toppingsIncluidos) && p.toppingsIncluidos.length ? p.toppingsIncluidos.map((t) => `- ${t}`).join('\n') : '';
    const topsExtras = Array.isArray(p.toppingsExtras) && p.toppingsExtras.length ? p.toppingsExtras.map((t) => `- ${t}`).join('\n') : '';
    const topsLegacy = Array.isArray(p.tops) && p.tops.length ? p.tops.map((t) => `- ${t}`).join('\n') : '';
    const glaseados = Array.isArray(p.glaseados) && p.glaseados.length ? p.glaseados.map((g) => `- ${g}`).join('\n') : '';
    const entrega = p.tipo === 'delivery' ? 'Delivery' : 'Recoger en tienda (Licey al Medio)';
    return `PEDIDO:\n${combos}\n\nTOPPINGS INCLUIDOS:\n${topsIncluidos || topsLegacy || '- (sin toppings incluidos)'}\n\nTOPPINGS EXTRA:\n${topsExtras || '- (sin toppings extra)'}\n\nGLASEADOS:\n${glaseados || '- (sin glaseados)'}\n\nEntrega: ${entrega}\nDirección: ${p.direccion || ''}\nFecha/Hora: ${p.fecha || ''} ${p.hora || ''}\nTOTAL: ${money(p.total || 0)}`;
  }
  window.enviarPlantilla = function enviarPlantilla(id, tipo) {
    const p = getPedidoById(id); if (!p) return alert('No encontré ese pedido.');
    const tel = normalizarTel(p.telefono); if (!tel) return alert('Este pedido no tiene teléfono guardado.');
    const resumen = armarResumenPedido(p);
    const msg = tipo === 'recibido' ? `Hola ${p.nombre || ''} 👋\nHemos recibido tu pedido ✅\n\n${resumen}\n\nEn un momento te confirmamos el tiempo estimado.` : `Hola ${p.nombre || ''} 👋\nTu pedido está listo! 📦✨\n\nPor favor revisa y confirma estos datos (o corrige si algo está mal):\n\n${resumen}\n\nResponde con:\n✅ "Confirmo"\no\n✏️ "Corregir:" y tu dirección correcta.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  window.marcarPedidoListo = async function marcarPedidoListo(id) { enviarPlantilla(id, 'listo'); try { await db.collection('pedidos').doc(id).set({ estado: 'realizado' }, { merge: true }); } catch (e) { alert('Error actualizando estado: ' + e.message); } };
})();
