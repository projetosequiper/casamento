/* ============================================================
   CAMADA DE DADOS — conversa com o Firebase Realtime Database.
   ------------------------------------------------------------
   Se o firebase-config.js ainda estiver com os valores de exemplo,
   tudo funciona em MODO DEMONSTRAÇÃO (salva só no navegador).
   Não precisa mexer neste arquivo.
   ============================================================ */

window.DADOS = (function () {

  var VERSAO_SDK = '10.12.5';
  var cfg  = window.FIREBASE_CONFIG || {};
  var RAIZ = window.FIREBASE_RAIZ || 'casamento';

  var configurado = !!(cfg.databaseURL && cfg.databaseURL.indexOf('COLE_AQUI') === -1 &&
                       cfg.apiKey && cfg.apiKey.indexOf('COLE_AQUI') === -1);

  var db = null, auth = null;
  var iniciando = null;

  /* ---------- carregamento do SDK ---------- */
  function carregarScript(url) {
    return new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = url; s.async = false;
      s.onload = ok;
      s.onerror = function () { erro(new Error('Falha ao carregar ' + url)); };
      document.head.appendChild(s);
    });
  }

  function iniciar() {
    if (iniciando) return iniciando;

    if (!configurado) {
      iniciando = Promise.resolve(false);
      return iniciando;
    }

    var base = 'https://www.gstatic.com/firebasejs/' + VERSAO_SDK + '/';
    iniciando = carregarScript(base + 'firebase-app-compat.js')
      .then(function () {
        return Promise.all([
          carregarScript(base + 'firebase-database-compat.js'),
          carregarScript(base + 'firebase-auth-compat.js')
        ]);
      })
      .then(function () {
        firebase.initializeApp(cfg);
        db = firebase.database();
        auth = firebase.auth();
        return true;
      })
      .catch(function (e) {
        console.warn('[dados] Firebase indisponível, usando modo demonstração:', e.message);
        configurado = false;
        return false;
      });

    return iniciando;
  }

  function ref(caminho) { return db.ref(RAIZ + '/' + caminho); }

  /* ---------- armazenamento local (modo demonstração) ---------- */
  var LOCAL = {
    ler: function (chave, padrao) {
      try {
        var v = localStorage.getItem('demo_' + RAIZ + '_' + chave);
        return v ? JSON.parse(v) : padrao;
      } catch (e) { return padrao; }
    },
    gravar: function (chave, valor) {
      try { localStorage.setItem('demo_' + RAIZ + '_' + chave, JSON.stringify(valor)); }
      catch (e) { /* navegação privada: segue em memória */ }
      (ouvintes[chave] || []).forEach(function (fn) { fn(valor); });
    }
  };
  var ouvintes = {};

  function ouvirLocal(chave, cb) {
    ouvintes[chave] = ouvintes[chave] || [];
    ouvintes[chave].push(cb);
    cb(LOCAL.ler(chave, {}));
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  var API = {

    get modoDemo() { return !configurado; },

    pronto: function () { return iniciar(); },

    /* ---------- CONFIRMAÇÕES DE PRESENÇA ----------
       Gravadas pelo id da família: se a família confirmar de novo,
       a resposta é atualizada em vez de duplicar.                  */
    salvarConfirmacao: function (idFamilia, dados) {
      dados.atualizadoEm = Date.now();
      return iniciar().then(function (ok) {
        if (!ok) {
          var todas = LOCAL.ler('confirmacoes', {});
          todas[idFamilia] = dados;
          LOCAL.gravar('confirmacoes', todas);
          return true;
        }
        return ref('confirmacoes/' + idFamilia).set(dados).then(function () { return true; });
      });
    },

    ouvirConfirmacoes: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return ouvirLocal('confirmacoes', cb);
        ref('confirmacoes').on('value', function (snap) { cb(snap.val() || {}); });
      });
    },

    /* ---------- LISTA DE CONVIDADOS ----------
       Fica no banco para ser editada pelo painel. Enquanto
       estiver vazia, o site usa a lista do convidados.js.       */
    ouvirFamilias: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return ouvirLocal('familias', cb);
        ref('familias').on('value', function (snap) { cb(snap.val() || {}); });
      });
    },

    salvarFamilia: function (idFamilia, dados) {
      return iniciar().then(function (ok) {
        if (!ok) {
          var todas = LOCAL.ler('familias', {});
          if (dados === null) delete todas[idFamilia];
          else todas[idFamilia] = dados;
          LOCAL.gravar('familias', todas);
          return true;
        }
        return dados === null
          ? ref('familias/' + idFamilia).remove()
          : ref('familias/' + idFamilia).set(dados);
      });
    },

    salvarFamilias: function (mapa) {
      return iniciar().then(function (ok) {
        if (!ok) { LOCAL.gravar('familias', mapa); return true; }
        return ref('familias').update(mapa);
      });
    },

    /* ---------- CATÁLOGO DA LISTA DE PRESENTES ----------
       Os itens da lista ficam no banco para poderem ser editados
       pelo painel. Enquanto o catálogo estiver vazio, o site usa
       a lista de exemplo do conteudo.js.                          */
    ouvirCatalogo: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return ouvirLocal('catalogo', cb);
        ref('catalogo').on('value', function (snap) { cb(snap.val() || {}); });
      });
    },

    salvarItem: function (idItem, campos) {
      return iniciar().then(function (ok) {
        if (!ok) {
          var todos = LOCAL.ler('catalogo', {});
          if (campos === null) delete todos[idItem];
          else todos[idItem] = Object.assign(todos[idItem] || {}, campos);
          LOCAL.gravar('catalogo', todos);
          return true;
        }
        return campos === null
          ? ref('catalogo/' + idItem).remove()
          : ref('catalogo/' + idItem).update(campos);
      });
    },

    /* Grava vários itens de uma vez (usado na importação inicial) */
    salvarCatalogo: function (mapa) {
      return iniciar().then(function (ok) {
        if (!ok) { LOCAL.gravar('catalogo', mapa); return true; }
        return ref('catalogo').update(mapa);
      });
    },

    /* ---------- PRESENTES ESCOLHIDOS ---------- */
    ouvirPresentes: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return ouvirLocal('presentes', cb);
        ref('presentes').on('value', function (snap) { cb(snap.val() || {}); });
      });
    },

    /* Reserva um presente. Usa transação para impedir que duas pessoas
       escolham o mesmo item ao mesmo tempo. */
    reservarPresente: function (idPresente, dados) {
      dados.reservadoEm = Date.now();
      dados.status = 'reservado';
      return iniciar().then(function (ok) {
        if (!ok) {
          var todos = LOCAL.ler('presentes', {});
          if (todos[idPresente]) return false;
          todos[idPresente] = dados;
          LOCAL.gravar('presentes', todos);
          return true;
        }
        return ref('presentes/' + idPresente).transaction(function (atual) {
          if (atual) return;            // já reservado: cancela a transação
          return dados;
        }).then(function (res) { return res.committed; });
      });
    },

    atualizarPresente: function (idPresente, campos) {
      return iniciar().then(function (ok) {
        if (!ok) {
          var todos = LOCAL.ler('presentes', {});
          if (campos === null) delete todos[idPresente];
          else todos[idPresente] = Object.assign(todos[idPresente] || {}, campos);
          LOCAL.gravar('presentes', todos);
          return true;
        }
        return campos === null
          ? ref('presentes/' + idPresente).remove()
          : ref('presentes/' + idPresente).update(campos);
      });
    },

    /* ---------- RECADOS ---------- */
    salvarRecado: function (dados) {
      dados.criadoEm = Date.now();
      return iniciar().then(function (ok) {
        if (!ok) {
          var todos = LOCAL.ler('recados', {});
          todos[id()] = dados;
          LOCAL.gravar('recados', todos);
          return true;
        }
        return ref('recados').push(dados).then(function () { return true; });
      });
    },

    ouvirRecados: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return ouvirLocal('recados', cb);
        ref('recados').on('value', function (snap) { cb(snap.val() || {}); });
      });
    },

    atualizarRecado: function (idRecado, campos) {
      return iniciar().then(function (ok) {
        if (!ok) {
          var todos = LOCAL.ler('recados', {});
          if (campos === null) delete todos[idRecado];
          else todos[idRecado] = Object.assign(todos[idRecado] || {}, campos);
          LOCAL.gravar('recados', todos);
          return true;
        }
        return campos === null
          ? ref('recados/' + idRecado).remove()
          : ref('recados/' + idRecado).update(campos);
      });
    },

    excluirConfirmacao: function (idConf) {
      return iniciar().then(function (ok) {
        if (!ok) {
          var todas = LOCAL.ler('confirmacoes', {});
          delete todas[idConf];
          LOCAL.gravar('confirmacoes', todas);
          return true;
        }
        return ref('confirmacoes/' + idConf).remove();
      });
    },

    /* ---------- LOGIN DO PAINEL ---------- */
    entrar: function (email, senha) {
      return iniciar().then(function (ok) {
        if (!ok) return { email: 'demonstracao@local' };
        return auth.signInWithEmailAndPassword(email, senha)
                   .then(function (c) { return c.user; });
      });
    },

    sair: function () {
      return iniciar().then(function (ok) { return ok ? auth.signOut() : true; });
    },

    ouvirUsuario: function (cb) {
      iniciar().then(function (ok) {
        if (!ok) return cb(null);
        auth.onAuthStateChanged(cb);
      });
    }
  };

  return API;
})();
