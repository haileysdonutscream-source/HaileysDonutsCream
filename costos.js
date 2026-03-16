(function () {
  const S = window.AppState;
  const $ = (id) => document.getElementById(id);
  const normalizeName = (v) => String(v || '').trim().toLowerCase();
  const costPerBase = (item) => { const qty = Number(item.purchaseQty || 0); const cost = Number(item.purchaseCost || 0); return qty > 0 ? cost / qty : 0; };
  window.toggleCamposProducto = function () {
    const type = $('pType')?.value || '';
    const topsWrap = $('pTopsInclWrap'); const iconInput = $('pIcon');
    if (topsWrap) topsWrap.style.display = type === 'combo' ? 'block' : 'none';
    if (iconInput && type !== 'glaseado') iconInput.value = '';
  };
  window.detectarIconoGlaseado = function (nombre) {
    const n = String(nombre || '').toLowerCase().trim();
    if (n.includes('fresa')) return '🍓'; if (n.includes('piña') || n.includes('pina')) return '🍍'; if (n.includes('chocolate blanco')) return '🤍'; if (n.includes('chocolate')) return '🍫'; if (n.includes('nutella')) return '🌰'; if (n.includes('avellana')) return '🥜'; if (n.includes('dulce de leche')) return '🍯'; if (n.includes('crema pastelera')) return '🎂'; if (n.includes('dubai')) return '✨'; return '';
  };
  window.autocompletarIconoProducto = function () { const type = $('pType')?.value; const nombre = $('pName')?.value || ''; if (type !== 'glaseado') return $('pIcon').value = ''; $('pIcon').value = detectarIconoGlaseado(nombre); };
  window.cargarStoreSettings = async function () {
    try {
      setStMsg('Cargando...');
      const snap = await db.collection('store_settings').doc('main').get();
      const d = snap.exists ? snap.data() : {};
      $('stCombosTitle').value = d.combosTitle || '🍩 Combos';
      $('stToppingsTitle').value = d.toppingsTitle || '✨ Toppings';
      $('stGlaseadosTitle').value = d.glaseadosTitle || '🍫 Glaseados';
      $('stThanks').value = d.thanksMessage || '✅ ¡Gracias por tu pedido! En breve te contactaremos.';
      $('stTransfer').value = d.transferInfo || '';
      setStMsg('✅ Listo.');
    } catch (e) { setStMsg('Error: ' + e.message); }
  };
  window.guardarStoreSettings = async function () {
    try {
      setStMsg('Guardando...');
      await db.collection('store_settings').doc('main').set({
        combosTitle: ($('stCombosTitle').value || '').trim(), toppingsTitle: ($('stToppingsTitle').value || '').trim(), glaseadosTitle: ($('stGlaseadosTitle').value || '').trim(),
        thanksMessage: ($('stThanks').value || '').trim(), transferInfo: ($('stTransfer').value || '').trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser?.email || 'admin'
      }, { merge: true });
      setStMsg('✅ Guardado.');
    } catch (e) { setStMsg('Error: ' + e.message); }
  };
  window.crearProducto = async function () {
    const type = $('pType').value; const name = ($('pName').value || '').trim(); const price = Number($('pPrice').value || 0); const topsIncl = Number($('pTopsIncl').value || 0); const sortOrder = Number($('pSort').value || 0);
    const badge = ($('pBadge').value || '').trim(); const icon = ($('pIcon').value || '').trim(); const active = $('pActive').value === 'true';
    if (!name) return setProdMsg('Pon un nombre.'); if (price < 0) return setProdMsg('Precio inválido.');
    try {
      setProdMsg('Agregando...');
      await db.collection('store_products').add({ type, name, price, icon, toppingsIncluded: type === 'combo' ? topsIncl : 0, sortOrder, badge, active, salesCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser?.email || 'admin' });
      ['pName', 'pPrice', 'pBadge', 'pIcon'].forEach((id) => $(id).value = ''); $('pTopsIncl').value = '0'; $('pSort').value = '0'; $('pActive').value = 'true';
      setProdMsg('✅ Agregado.');
    } catch (e) { setProdMsg('Error: ' + e.message); }
  };
  window.listenProductos = function () {
    if (S.unsubProductos) S.unsubProductos();
    S.unsubProductos = db.collection('store_products').orderBy('sortOrder').onSnapshot((snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => ((a.type || '').localeCompare(b.type || '')) || (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
      renderProductos(rows); syncCatalogosParaEditarPedidos(rows); setProdMsg('✅ Listo.');
    }, (err) => setProdMsg('Error leyendo productos: ' + err.message));
  };
  window.renderProductos = function (list) {
    const tbody = $('tablaProductos'); tbody.innerHTML = '';
    if (!list.length) return tbody.innerHTML = '<tr><td colspan="9" class="muted" style="padding:14px;">No hay productos todavía.</td></tr>';
    list.forEach((p) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td class="colTipo">${escapeHtml(p.type || '')}</td><td class="colNombre"><input value="${escapeHtml(p.name || '')}" onblur="updProd('${p.id}', {name:this.value})"></td><td class="colPrecio"><input type="number" min="0" value="${Number(p.price || 0)}" onblur="updProd('${p.id}', {price:Number(this.value||0)})"></td><td class="colIncl"><input type="number" min="0" value="${Number(p.toppingsIncluded || 0)}" ${p.type === 'combo' ? '' : 'disabled'} onblur="updProd('${p.id}', {toppingsIncluded:Number(this.value||0)})"></td><td class="colOrden"><input type="number" min="0" value="${Number(p.sortOrder || 0)}" onblur="updProd('${p.id}', {sortOrder:Number(this.value||0)})"></td><td class="colActivo"><select onchange="updProd('${p.id}', {active:(this.value==='true')})"><option value="true" ${p.active ? 'selected' : ''}>Sí</option><option value="false" ${!p.active ? 'selected' : ''}>No</option></select></td><td class="colIcon"><input value="${escapeHtml(p.icon || '')}" onblur="updProd('${p.id}', {icon:this.value})"></td><td class="colBadge"><input value="${escapeHtml(p.badge || '')}" onblur="updProd('${p.id}', {badge:this.value})"></td><td class="colAcciones actionBtnCell"><button class="secondary mini" type="button" onclick="borrarProd('${p.id}')">Borrar</button></td>`;
      tbody.appendChild(row);
    });
  };
  window.updProd = async function (id, patch) { try { patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp(); patch.updatedBy = auth.currentUser?.email || 'admin'; await db.collection('store_products').doc(id).set(patch, { merge: true }); setProdMsg('✅ Guardado.'); } catch (e) { setProdMsg('Error: ' + e.message); } };
  window.borrarProd = async function (id) { if (!confirm('¿Borrar este producto?')) return; try { await db.collection('store_products').doc(id).delete(); setProdMsg('✅ Borrado.'); } catch (e) { setProdMsg('Error: ' + e.message); } };
  window.syncCatalogosParaEditarPedidos = function (rows) {
    S.COMBOS_CATALOGO.length = 0; rows.filter((x) => x.type === 'combo').forEach((x) => S.COMBOS_CATALOGO.push({ name: x.name, price: Number(x.price || 0), toppings: Number(x.toppingsIncluded || 0) }));
    S.TOPPINGS_CATALOGO.length = 0; rows.filter((x) => x.type === 'topping').forEach((x) => S.TOPPINGS_CATALOGO.push({ name: x.name, price: Number(x.price || 0) }));
    S.GLASEADOS_CATALOGO.length = 0; rows.filter((x) => x.type === 'glaseado').forEach((x) => S.GLASEADOS_CATALOGO.push({ name: x.name, price: Number(x.price || 0) }));
  };
  window.listenInventario = function () { if (S.unsubInventario) S.unsubInventario(); S.unsubInventario = db.collection('inventory_items').orderBy('name').onSnapshot((snap) => { S.inventarioCache = snap.docs.map((d) => ({ id: d.id, ...d.data() })); renderInventario(); }, (err) => setInvMsg('Error leyendo inventario: ' + err.message)); };
  window.renderInventario = function () { setText('invCount', S.inventarioCache.length); const tbody = $('inventarioRows'); if (!tbody) return; tbody.innerHTML = ''; if (!S.inventarioCache.length) return tbody.innerHTML = '<tr><td colspan="5" class="muted">No hay ingredientes guardados todavía.</td></tr>'; S.inventarioCache.forEach((item) => { const cpu = costPerBase(item); const stock = Number(item.stockQty || 0); let status = 'statusOk'; let txt = 'OK'; if (stock <= 0) { status = 'statusBad'; txt = 'Agotado'; } else if (stock <= Number(item.purchaseQty || 0) * 0.15) { status = 'statusWarn'; txt = 'Bajo'; } const tr = document.createElement('tr'); tr.innerHTML = `<td><b>${escapeHtml(item.name || '')}</b><div class="small muted">${escapeHtml(item.note || '')}</div></td><td>${escapeHtml(item.category || '')}</td><td>${money(cpu)} / ${escapeHtml(item.purchaseUnit || '')}</td><td><span class="${status}">${Number(stock)} ${escapeHtml(item.purchaseUnit || '')} • ${txt}</span></td><td><button class="secondary mini" onclick="borrarIngrediente('${item.id}')">Borrar</button></td>`; tbody.appendChild(tr); }); };
  window.crearIngrediente = async function () { const name = ($('invName').value || '').trim(); const category = $('invCategory').value; const purchaseUnit = $('invUnit').value; const purchaseQty = Number($('invQty').value || 0); const purchaseCost = Number($('invCost').value || 0); const stockQty = Number($('invStock').value || 0); const note = ($('invNote').value || '').trim(); if (!name) return setInvMsg('Pon un ingrediente.'); if (purchaseQty <= 0 || purchaseCost < 0) return setInvMsg('Revisa cantidad y costo.'); try { setInvMsg('Guardando...'); await db.collection('inventory_items').add({ name, category, purchaseUnit, purchaseQty, purchaseCost, stockQty, note, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser?.email || 'admin' }); ['invName', 'invQty', 'invCost', 'invStock', 'invNote'].forEach((id) => $(id).value = ''); $('invUnit').value = 'g'; $('invCategory').value = 'masa'; setInvMsg('✅ Ingrediente guardado.'); renderRecetaBuilder(); } catch (e) { setInvMsg('Error: ' + e.message); } };
  window.borrarIngrediente = async function (id) { if (!confirm('¿Borrar este ingrediente?')) return; try { await db.collection('inventory_items').doc(id).delete(); } catch (e) { setInvMsg('Error: ' + e.message); } };
  function findIngredienteByName(name) { const k = normalizeName(name); return S.inventarioCache.find((i) => normalizeName(i.name) === k) || null; }
  function recetaActualDesdeDOM() { const rows = []; document.querySelectorAll('.recipeLine').forEach((line) => { const name = line.querySelector('.recipeIng')?.value || ''; const qty = Number(line.querySelector('.recipeQty')?.value || 0); const unit = line.querySelector('.recipeUnit')?.value || 'g'; if (name && qty > 0) rows.push({ name, qty, unit }); }); return rows; }
  function recetaCosto(item) { const base = findIngredienteByName(item.name); if (!base) return 0; return Number(item.qty || 0) * costPerBase(base); }
  function buildRecipeLine(item = { name: '', qty: 0, unit: 'g' }) { const options = S.inventarioCache.map((i) => `<option value="${escapeHtml(i.name)}" ${normalizeName(i.name) === normalizeName(item.name) ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join(''); return `<div class="recipeLine row" style="align-items:end;margin-bottom:8px;"><div style="flex:2;min-width:180px;"><label>Ingrediente</label><select class="recipeIng" onchange="calcularReceta()"><option value="">Selecciona</option>${options}</select></div><div style="flex:1;min-width:120px;"><label>Cantidad</label><input class="recipeQty" type="number" min="0" step="0.01" value="${Number(item.qty || 0)}" oninput="calcularReceta()"></div><div style="width:120px;"><label>Unidad</label><select class="recipeUnit" onchange="calcularReceta()"><option value="g" ${item.unit === 'g' ? 'selected' : ''}>g</option><option value="ml" ${item.unit === 'ml' ? 'selected' : ''}>ml</option><option value="unidad" ${item.unit === 'unidad' ? 'selected' : ''}>unidad</option></select></div><div style="width:100px;"><button type="button" class="secondary mini" onclick="this.closest('.recipeLine').remove(); calcularReceta()">Quitar</button></div></div>`; }
  window.cargarRecetaBase = function () { const tipo = $('calcTipo')?.value || 'donitas'; const sugerida = S.RECETAS_BASE[tipo] || []; if (tipo === 'donitas') { if ($('calcNombre') && !$('calcNombre').value) $('calcNombre').value = 'Donitas base'; $('calcGramaje').value = 25; } else if (tipo === 'topping') { if (!$('calcNombre').value) $('calcNombre').value = 'Topping base'; $('calcGramaje').value = 10; } else { if (!$('calcNombre').value) $('calcNombre').value = 'Glaseado base'; $('calcGramaje').value = 18; } renderRecetaBuilder(false, sugerida); };
  window.renderRecetaBuilder = function (forceReset = false, sugerida = null) { const cont = $('recetaBuilder'); if (!cont) return; let rows = forceReset ? [] : recetaActualDesdeDOM(); if (!rows.length) rows = (sugerida || S.RECETAS_BASE[$('calcTipo')?.value || 'donitas'] || []).slice(0, 3); cont.innerHTML = rows.map((r) => buildRecipeLine(r)).join(''); calcularReceta(); };
  window.addLineaReceta = function () { $('recetaBuilder').insertAdjacentHTML('beforeend', buildRecipeLine()); calcularReceta(); };
  window.calcularReceta = function () { const receta = recetaActualDesdeDOM(); const porciones = Math.max(1, Number($('calcPorciones')?.value || 1)); const margen = Math.max(0, Number($('calcMargen')?.value || 0)); const costoTotal = receta.reduce((acc, r) => acc + recetaCosto(r), 0); const costoPorcion = costoTotal / porciones; const sugerido = costoPorcion * (1 + margen / 100); setText('recetaCostoTotal', money(costoTotal)); setText('recetaCostoPorcion', money(costoPorcion)); setText('recetaPrecioSugerido', money(Math.ceil(sugerido))); setText('recetaPrecioMin', money(Math.ceil(costoPorcion * 1.4))); };
  window.guardarRecetaCalculada = async function () { const tipo = $('calcTipo').value; const nombre = ($('calcNombre').value || '').trim(); const porciones = Math.max(1, Number($('calcPorciones').value || 1)); const gramaje = Math.max(1, Number($('calcGramaje').value || 1)); const margen = Math.max(0, Number($('calcMargen').value || 0)); const receta = recetaActualDesdeDOM(); if (!nombre) return setCalcMsg('Pon un nombre al cálculo.'); if (!receta.length) return setCalcMsg('Agrega al menos un ingrediente.'); const costoTotal = receta.reduce((acc, r) => acc + recetaCosto(r), 0); const costoPorcion = costoTotal / porciones; const precioSugerido = Math.ceil(costoPorcion * (1 + margen / 100)); try { setCalcMsg('Guardando...'); await db.collection('recipe_costings').add({ tipo, nombre, porciones, gramaje, margen, receta, costoTotal, costoPorcion, precioSugerido, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser?.email || 'admin' }); setCalcMsg('✅ Cálculo guardado.'); } catch (e) { setCalcMsg('Error: ' + e.message); } };
  window.listenRecetas = function () { if (S.unsubRecetas) S.unsubRecetas(); S.unsubRecetas = db.collection('recipe_costings').orderBy('updatedAt', 'desc').onSnapshot((snap) => { S.recetasCache = snap.docs.map((d) => ({ id: d.id, ...d.data() })); renderRecetas(); }, (err) => setCalcMsg('Error leyendo cálculos: ' + err.message)); };
  window.renderRecetas = function () { setText('recetasCount', S.recetasCache.length); const tbody = $('recetasRows'); if (!tbody) return; tbody.innerHTML = ''; if (!S.recetasCache.length) return tbody.innerHTML = '<tr><td colspan="7" class="muted">No hay cálculos guardados todavía.</td></tr>'; S.recetasCache.forEach((r) => { const tr = document.createElement('tr'); tr.innerHTML = `<td><b>${escapeHtml(r.nombre || '')}</b></td><td>${escapeHtml(r.tipo || '')}</td><td>${Number(r.porciones || 0)}</td><td>${money(r.costoPorcion || 0)}</td><td>${money(r.precioSugerido || 0)}</td><td>${escapeHtml(fmtFecha(r.updatedAt))}</td><td><button class="secondary mini" type="button" onclick="borrarReceta('${r.id}')">Borrar</button></td>`; tbody.appendChild(tr); }); };
  window.borrarReceta = async function (id) { if (!S.isAdminUser) return setCalcMsg('No tienes permisos para borrar recetas.'); const receta = S.recetasCache.find((r) => r.id === id); if (!confirm(`¿Seguro que quieres borrar "${receta?.nombre || 'esta receta'}"? Esta acción no se puede deshacer.`)) return; try { setCalcMsg('Borrando receta...'); await db.collection('recipe_costings').doc(id).delete(); setCalcMsg('✅ Receta borrada.'); } catch (e) { setCalcMsg('Error borrando receta: ' + (e.message || e)); } };
})();
