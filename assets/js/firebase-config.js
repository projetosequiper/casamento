/* ============================================================
   CONEXÃO COM O FIREBASE
   ------------------------------------------------------------
   Projeto: casamento-yanne-julio
   Console: https://console.firebase.google.com/project/casamento-yanne-julio
   ------------------------------------------------------------
   Estas chaves são públicas por natureza — todo site que usa
   Firebase as expõe no código. Quem protege os dados são as
   REGRAS do Realtime Database, não estas chaves.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey:            'AIzaSyB9xrB04iQlcvmb5_mNll2IlnX7yCDRqzI',
  authDomain:        'casamento-yanne-julio.firebaseapp.com',
  databaseURL:       'https://casamento-yanne-julio-default-rtdb.firebaseio.com',
  projectId:         'casamento-yanne-julio',
  storageBucket:     'casamento-yanne-julio.firebasestorage.app',
  messagingSenderId: '880123420116',
  appId:             '1:880123420116:web:7bb75eb3fa3a7afdc44a41'
};

/* Pasta dentro do banco onde tudo é gravado.
   Precisa bater com a raiz usada nas regras de segurança. */
window.FIREBASE_RAIZ = 'casamento';
