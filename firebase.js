window.AppState = {
  USER_LOGIN_MAP: {
    'enmanuel.francisco': 'enmanuel.francisco@panel.local',
    'ana.camila': 'ana.camila@panel.local',
    'empleado1': 'empleado1@panel.local'
  },
  COMBOS_CATALOGO: [
    { name: '6 Donitas', price: 160, toppings: 1 },
    { name: '12 Donitas', price: 300, toppings: 2 },
    { name: '24 Donitas', price: 600, toppings: 3 },
    { name: '4 Donitas', price: 130, toppings: 1 },
    { name: '9 Donitas', price: 200, toppings: 1 }
  ],
  TOPPINGS_CATALOGO: [
    { name: 'Kisses', price: 55 },
    { name: 'Hershey’s blanco', price: 50 },
    { name: 'Hershey’s negro', price: 50 },
    { name: 'Almendras', price: 50 },
    { name: 'M&M', price: 50 },
    { name: 'Oreo', price: 35 },
    { name: 'Chispas de colores', price: 30 },
    { name: 'Crema Dubai', price: 75 },
    { name: 'Twix', price: 65 },
    { name: 'Canela', price: 10 },
    { name: 'Azúcar glass', price: 25 },
    { name: 'Crema pastelera', price: 55 }
  ],
  GLASEADOS_CATALOGO: [],
  RECETAS_BASE: {
    donitas: [
      { name: 'Harina', qty: 500, unit: 'g' },
      { name: 'Azúcar', qty: 130, unit: 'g' },
      { name: 'Leche', qty: 250, unit: 'ml' },
      { name: 'Huevos', qty: 2, unit: 'unidad' },
      { name: 'Mantequilla', qty: 60, unit: 'g' },
      { name: 'Vainilla', qty: 10, unit: 'ml' },
      { name: 'Polvo de hornear', qty: 12, unit: 'g' },
      { name: 'Sal', qty: 4, unit: 'g' }
    ],
    topping: [
      { name: 'Oreo', qty: 80, unit: 'g' },
      { name: 'M&M', qty: 100, unit: 'g' },
      { name: 'Almendras', qty: 80, unit: 'g' }
    ],
    glaseado: [
      { name: 'Chocolate Negro', qty: 250, unit: 'g' },
      { name: 'Chocolate Blanco', qty: 250, unit: 'g' },
      { name: 'Nutella', qty: 180, unit: 'g' },
      { name: 'Dulce de leche', qty: 180, unit: 'g' }
    ]
  },
  pedidosCache: [],
  inventarioCache: [],
  recetasCache: [],
  cierresCache: [],
  unsubPedidos: null,
  unsubProductos: null,
  unsubInventario: null,
  unsubRecetas: null,
  unsubCierres: null,
  firstPedidosLoad: true,
  selectedPedidoId: null,
  currentRole: 'empleado',
  isAdminUser: false,
  detallePanelsState: { cliente: true, resumen: true, gestion: true },
  editId: null,
  editDraft: null,
  panelAudioCtx: null
};

const firebaseConfig = {
  apiKey: 'AIzaSyBIc3oJMmSTnOg4EaFsCLOkhyLoGXEWj6c',
  authDomain: 'minidonas-d5e36.firebaseapp.com',
  projectId: 'minidonas-d5e36',
  storageBucket: 'minidonas-d5e36.firebasestorage.app',
  messagingSenderId: '311892742337',
  appId: '1:311892742337:web:29c1a95fba484cf4578440'
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.auth = firebase.auth();
window.db = firebase.firestore();
