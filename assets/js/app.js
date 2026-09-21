/* ============================================================
   APP — monta o site a partir do conteudo.js e cuida das ações.
   Não precisa mexer neste arquivo para trocar textos ou visual.
   ============================================================ */
(function () {
  'use strict';

  var C = window.CONTEUDO;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- utilidades ---------- */
  function escapar(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  var moedaCheia = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function aviso(texto, erro) {
    var el = $('#aviso');
    el.textContent = texto;
    el.classList.toggle('aviso-flutuante--erro', !!erro);
    el.classList.add('aviso-flutuante--visivel');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('aviso-flutuante--visivel'); }, 4200);
  }

  /* Ramo botânico desenhado em SVG — usado nos ornamentos e na capa */
  var SPRIG =
    '<svg viewBox="0 0 100 62" aria-hidden="true">' +
      '<g fill="currentColor">' +
        '<path d="M50 60 C49.4 48 49.4 30 50 10 L50.9 10 C51.5 30 51.5 48 50.9 60 Z" opacity=".85"/>' +
        '<path d="M50 47 C42.5 45.6 36.6 40.4 34.4 32.8 C42 32.6 48 38.6 50 46.4 Z" opacity=".62"/>' +
        '<path d="M51 47 C58.5 45.6 64.4 40.4 66.6 32.8 C59 32.6 53 38.6 51 46.4 Z" opacity=".62"/>' +
        '<path d="M50 35 C43.8 33.8 39.2 29.6 37.5 23.4 C43.7 23.3 48.4 28.2 50 34.6 Z" opacity=".74"/>' +
        '<path d="M51 35 C57.2 33.8 61.8 29.6 63.5 23.4 C57.3 23.3 52.6 28.2 51 34.6 Z" opacity=".74"/>' +
        '<path d="M50 24 C45.4 23.1 42 20 40.7 15.4 C45.3 15.3 48.8 18.9 50 23.7 Z" opacity=".86"/>' +
        '<path d="M51 24 C55.6 23.1 59 20 60.3 15.4 C55.7 15.3 52.2 18.9 51 23.7 Z" opacity=".86"/>' +
        '<path d="M50.5 14 C48.6 10.4 49 5.6 50.5 1.5 C52 5.6 52.4 10.4 50.5 14 Z"/>' +
      '</g>' +
    '</svg>';

  /* Garante a biblioteca do QR Code, com endereço reserva */
  var promessaQR = null;
  function garantirQR() {
    if (typeof QRCode !== 'undefined') return Promise.resolve();
    if (promessaQR) return promessaQR;
    promessaQR = new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = 'assets/js/lib/qrcode.js';          /* vai junto com o site */
      s.onload = function () { typeof QRCode !== 'undefined' ? ok() : erro(); };
      s.onerror = erro;
      document.head.appendChild(s);
    });
    return promessaQR;
  }

  var ICONES = {
    traje:      '<path d="M8 3l4 4 4-4 5 3v14H3V6l5-3z"/><path d="M12 7v14"/>',
    hospedagem: '<path d="M3 20V9l9-5 9 5v11"/><path d="M9 20v-6h6v6"/>',
    transporte: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M3 11h18M7 17v2M17 17v2"/>',
    criancas:   '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"/>',
    presente:   '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/><path d="M12 8S10 3 7.5 3.8 8.5 8 12 8zM12 8s2-5 4.5-4.2S15.5 8 12 8z"/>',
    coracao:    '<path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6C19 15.4 12 20 12 20z"/>',
    local:      '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'
  };
  function icone(nome) {
    return '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           (ICONES[nome] || ICONES.coracao) + '</svg>';
  }

  /* ============================================================
     1. TEXTOS E BLOCOS FIXOS
     ============================================================ */
  var nomes = C.noivos.nome1 + ' ' + C.noivos.conector + ' ' + C.noivos.nome2;
  var data  = new Date(C.dataHora);

  document.title = nomes + ' · Nosso Casamento';
  $('#marca').innerHTML = escapar(C.noivos.nome1) + ' <span>' +
                          escapar(C.noivos.conector) + '</span> ' + escapar(C.noivos.nome2);

  /* ramos botânicos */
  $$('.sprig').forEach(function (e) { e.innerHTML = SPRIG; });

  /* monograma: usa o definido em conteudo.js ou monta com as iniciais */
  var monograma = C.noivos.monograma ||
      (C.noivos.nome1.charAt(0) + '<em>&amp;</em>' + C.noivos.nome2.charAt(0));
  $$('.monograma').forEach(function (e) { e.innerHTML = monograma; });

  /* capa: com foto do casal ou clara, no estilo convite */
  if (C.capa && C.capa.foto) {
    $('#inicio').classList.add('hero--com-foto');
    document.body.classList.add('capa-com-foto');
    $('#hero-foto').style.backgroundImage = 'url("' + C.capa.foto + '")';
  }

  $('#hero-frase').textContent = C.frase;
  $('#hero-nomes').innerHTML = escapar(C.noivos.nome1) +
      '<span>' + escapar(C.noivos.conector) + '</span>' + escapar(C.noivos.nome2);
  $('#hero-data').textContent = C.diaSemana + ', ' + C.dataPorExtenso;

  $('#quando-data').textContent     = C.diaSemana + ', ' + C.dataPorExtenso +
                                      (C.cidade ? ' — ' + C.cidade : '');

  $('#rsvp-titulo').textContent = C.rsvp.titulo;
  $('#rsvp-texto').textContent  = C.rsvp.texto;
  $('#rsvp-prazo').textContent  = C.rsvp.prazo ? 'Confirme até ' + C.rsvp.prazo + '.' : '';

  $('#presentes-titulo').textContent = C.presentes.titulo;
  $('#presentes-texto').textContent  = C.presentes.texto;

  $('#recados-titulo').textContent = C.recados.titulo;
  $('#recados-texto').textContent  = C.recados.texto;

  $('#rodape-nomes').textContent = nomes;
  $('#rodape-data').textContent  = C.dataPorExtenso;
  $('#rodape-hashtag').textContent = C.noivos.hashtag || '';

  /* rodapé: contato */
  (function () {
    var html = '';
    if (C.contato.whatsapp) {
      html += '<a class="botao botao--vazado botao--pequeno" target="_blank" rel="noopener" href="https://wa.me/' +
              escapar(C.contato.whatsapp) + '">WhatsApp</a>';
    }
    if (C.contato.email) {
      html += '<a class="botao botao--vazado botao--pequeno" href="mailto:' + escapar(C.contato.email) + '">E-mail</a>';
    }
    $('#rodape-contato').innerHTML = html;
  })();

  /* ============================================================
     TEXTOS EDITÁVEIS PELO PAINEL
     ------------------------------------------------------------
     Nossa história, linha do tempo, informações úteis e o FAQ
     saem do banco quando os noivos publicam pela Área dos noivos.
     Enquanto o banco estiver vazio, vale o que está no conteudo.js.
     ============================================================ */
  var TEXTOS = {};          /* o que veio do banco */

  /* Publicado = os noivos já mandaram os textos para o banco pelo painel.
     A partir daí o banco manda sozinho: se uma seção está vazia lá, ela
     fica vazia no site — a lista de exemplo do conteudo.js não volta. */
  function publicado() { return Object.keys(TEXTOS).length > 0; }

  /* transforma { id: {...} } em lista ordenada */
  function emLista(mapa) {
    if (!mapa) return [];
    return Object.keys(mapa)
      .map(function (k) { return Object.assign({ _id: k }, mapa[k]); })
      .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }

  function pintarHistoria() {
    var h = publicado() ? (TEXTOS.historia || {}) : (C.historia || {});
    $('#historia-titulo').textContent = h.titulo || '';
    $('#historia-texto').textContent  = h.texto || '';
  }

  function pintarLinhaTempo() {
    var m = publicado() ? emLista(TEXTOS.momentos)
                        : ((C.historia && C.historia.momentos) || []);
    $('#linha-tempo').classList.toggle('oculto', !m.length);
    if (!m.length) return;
    $('#linha-tempo').innerHTML = m.map(function (x) {
      return '<li>' +
        (x.data ? '<span class="linha-tempo__data">' + escapar(x.data) + '</span>' : '') +
        '<h3 class="linha-tempo__titulo">' + escapar(x.titulo) + '</h3>' +
        '<p>' + escapar(x.texto) + '</p></li>';
    }).join('');
  }

  function pintarInformacoes() {
    var lista = publicado() ? emLista(TEXTOS.informacoes) : (C.informacoes || []);
    var secao = $('#informacoes').closest('section');
    if (secao) secao.classList.toggle('oculto', !lista.length);
    $('#informacoes').innerHTML = lista.map(function (i) {
      return '<article class="cartao">' +
        '<div class="cartao__icone">' + icone(i.icone) + '</div>' +
        '<h3>' + escapar(i.titulo) + '</h3>' +
        '<p>' + escapar(i.texto) + '</p></article>';
    }).join('');
  }

  function pintarFaq() {
    var lista = publicado() ? emLista(TEXTOS.faq) : (C.faq || []);
    if (!lista.length) { $('#faq-secao').classList.add('oculto'); return; }
    $('#faq-secao').classList.remove('oculto');
    $('#faq').innerHTML = lista.map(function (f) {
      return '<details><summary>' + escapar(f.p) + '</summary><p>' + escapar(f.r) + '</p></details>';
    }).join('');
  }

  function pintarTextos() {
    pintarHistoria();
    pintarLinhaTempo();
    pintarInformacoes();
    pintarFaq();
    /* sem título, sem texto e sem momentos: a seção inteira some */
    var h = $('#historia-titulo').textContent + $('#historia-texto').textContent;
    $('#historia').classList.toggle('oculto',
      !h.trim() && $('#linha-tempo').classList.contains('oculto'));
  }

  pintarTextos();                                  /* pinta já, com o conteudo.js */
  DADOS.ouvirTextos(function (t) {                 /* e de novo quando o banco responder */
    TEXTOS = t || {};
    pintarTextos();
  });

  /* ---------- eventos (cerimônia / recepção) ----------
     Os links de rota vão SEM ponto de partida. Sem origem definida,
     o Google Maps e o Waze usam a localização atual de quem clicou. */
  function ehCoordenada(t) {
    return /^\s*-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/.test(t || '');
  }

  function rotas(e) {
    if (e.semRota) return null;

    var coord = (e.coordenadas || '').replace(/\s/g, '');

    /* sem coordenadas, monta uma busca limpa: tira separadores
       decorativos que só atrapalham o mapa a achar o lugar */
    var busca = [e.local, e.endereco].filter(Boolean).join(', ')
      .replace(/[|\u00b7\u2013\u2014]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    var destino = ehCoordenada(coord) ? coord : busca;
    if (!destino) return null;

    return {
      google: 'https://www.google.com/maps/dir/?api=1' +
              '&destination=' + encodeURIComponent(destino) +
              '&travelmode=driving',
      waze: ehCoordenada(coord)
        ? 'https://waze.com/ul?ll=' + encodeURIComponent(coord) + '&navigate=yes'
        : 'https://waze.com/ul?q=' + encodeURIComponent(destino) + '&navigate=yes'
    };
  }

  $('#eventos').innerHTML = (C.eventos || []).map(function (e) {
    var r = e.mapa ? { google: e.mapa, waze: '' } : rotas(e);

    return '<article class="cartao">' +
      '<span class="cartao__tipo">' + escapar(e.tipo) + '</span>' +
      '<p class="cartao__hora">' + escapar(e.horario) + '</p>' +
      '<h3 class="cartao__local">' + escapar(e.local) + '</h3>' +
      '<p class="cartao__endereco">' + escapar(e.endereco) + '</p>' +
      (e.observacao ? '<p class="cartao__obs">' + escapar(e.observacao) + '</p>' : '') +
      (r
        ? '<div class="rotas">' +
            '<a class="botao botao--vazado botao--pequeno" target="_blank" rel="noopener" href="' +
              escapar(r.google) + '">Como chegar</a>' +
            (r.waze
              ? '<a class="botao botao--vazado botao--pequeno" target="_blank" rel="noopener" href="' +
                escapar(r.waze) + '">Waze</a>'
              : '') +
          '</div>' +
          '<p class="rotas__nota">A rota começa de onde você estiver.</p>'
        : '') +
      '</article>';
  }).join('');

  /* informações úteis e FAQ: desenhados por pintarInformacoes()
     e pintarFaq(), logo acima — saem do painel ou do conteudo.js. */

  /* ---------- galeria ---------- */
  (function () {
    var fotos = (C.galeria && C.galeria.fotos) || [];
    if (!fotos.length) return;
    $('#galeria-secao').classList.remove('oculto');
    $('#galeria-titulo').textContent = C.galeria.titulo;
    $('#galeria').innerHTML = fotos.map(function (f, i) {
      return '<img src="' + escapar(f) + '" alt="Foto ' + (i + 1) + ' do casal" loading="lazy">';
    }).join('');
  })();

  /* ============================================================
     2. CONTAGEM REGRESSIVA
     ============================================================ */
  (function () {
    var alvo = $('#contagem');
    function pintar() {
      var falta = data - new Date();
      if (falta <= 0) {
        alvo.innerHTML = '<p class="contagem__final">Hoje é o grande dia!</p>';
        return clearInterval(t);
      }
      var s = Math.floor(falta / 1000);
      var partes = [
        [Math.floor(s / 86400),      'dias'],
        [Math.floor(s % 86400 / 3600), 'horas'],
        [Math.floor(s % 3600 / 60),    'min'],
        [s % 60,                       'seg']
      ];
      alvo.innerHTML = partes.map(function (p) {
        return '<div class="contagem__item"><span class="contagem__num">' +
               String(p[0]).padStart(2, '0') +
               '</span><span class="contagem__rot">' + p[1] + '</span></div>';
      }).join('');
    }
    pintar();
    var t = setInterval(pintar, 1000);
  })();

  /* ============================================================
     3. NAVEGAÇÃO
     ============================================================ */
  (function () {
    var topo = $('#topo'), botao = $('#hamburguer'), menu = $('#menu');

    function aoRolar() { topo.classList.toggle('topo--fixo', window.scrollY > window.innerHeight * .75); }
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();

    botao.addEventListener('click', function () {
      var aberto = topo.classList.toggle('topo--aberto');
      botao.setAttribute('aria-expanded', aberto);
      botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = aberto ? 'hidden' : '';
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      topo.classList.remove('topo--aberto');
      botao.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });

    /* menu dos três pontos */
    var mais = $('#mais'), caixa = $('#mais-caixa');
    function fecharMais() { caixa.hidden = true; mais.setAttribute('aria-expanded', 'false'); }
    mais.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = caixa.hidden;
      caixa.hidden = !abrir;
      mais.setAttribute('aria-expanded', abrir);
    });
    document.addEventListener('click', function (e) {
      if (!caixa.hidden && !caixa.contains(e.target)) fecharMais();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fecharMais();
    });
  })();

  /* ---------- animação de entrada ---------- */
  (function () {
    if (!('IntersectionObserver' in window)) {
      return $$('.aparece').forEach(function (e) { e.classList.add('visivel'); });
    }
    var obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (i) {
        if (i.isIntersecting) { i.target.classList.add('visivel'); obs.unobserve(i.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
    $$('.aparece').forEach(function (e) { obs.observe(e); });
  })();

  /* ============================================================
     4. CONFIRMAÇÃO DE PRESENÇA (lista fechada, por família)
     ============================================================ */
  (function () {
    var SEMENTE = window.CONVIDADOS || [];
    var LISTA = SEMENTE;
    var familiaAtual = null;

    /* tira acentos e deixa minúsculo, para a busca não depender disso */
    function simplificar(t) {
      return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
             .toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function normalizarPessoas(fam) {
      return (fam.pessoas || []).map(function (p) {
        return typeof p === 'string' ? { nome: p } : p;
      });
    }

    /* índice de busca: cada pessoa com os termos que a encontram */
    var INDICE = [];
    function montarIndice() {
      INDICE = [];
      LISTA.forEach(function (fam) {
        normalizarPessoas(fam).forEach(function (pessoa, i) {
          INDICE.push({
            familia: fam,
            indice: i,
            nome: pessoa.nome,
            termos: [simplificar(pessoa.nome)].concat((pessoa.apelidos || []).map(simplificar))
          });
        });
      });
    }
    montarIndice();

    /* a lista publicada no painel manda; sem ela, usa o convidados.js */
    DADOS.ouvirFamilias(function (mapa) {
      var chaves = Object.keys(mapa || {});
      LISTA = chaves.length
        ? chaves.map(function (k) { return Object.assign({ id: k }, mapa[k]); })
                .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
        : SEMENTE;
      montarIndice();
    });

    function nomeFamilia(fam) {
      if (fam.rotulo) return fam.rotulo;
      var p = normalizarPessoas(fam)[0];
      return p ? p.nome.split(' ')[0] : '';
    }

    /* ---------- busca ---------- */
    var campo = $('#busca-nome');
    var caixa = $('#resultados');

    function buscar(texto) {
      var q = simplificar(texto);
      if (q.length < 2) return [];
      return INDICE.filter(function (x) {
        return x.termos.some(function (termo) {
          // casa com o começo de qualquer palavra do nome
          return termo === q || termo.indexOf(q) === 0 ||
                 termo.split(' ').some(function (parte) { return parte.indexOf(q) === 0; });
        });
      }).slice(0, 8);
    }

    function pintarResultados(texto) {
      var achados = buscar(texto);
      campo.setAttribute('aria-expanded', achados.length > 0);

      if (simplificar(texto).length < 2) { caixa.innerHTML = ''; return; }

      if (!achados.length) {
        caixa.innerHTML =
          '<p class="resultados__vazio">Não encontramos esse nome na lista.<br>' +
          'Tente só o primeiro nome, ou ' +
          (C.contato.whatsapp
            ? '<a href="https://wa.me/' + escapar(C.contato.whatsapp) + '" target="_blank" rel="noopener">fale com a gente</a>.'
            : 'fale com os noivos.') +
          '</p>';
        return;
      }

      caixa.innerHTML = achados.map(function (x) {
        var outros = normalizarPessoas(x.familia).length - 1;
        return '<button type="button" class="resultado" role="option" ' +
               'data-familia="' + escapar(x.familia.id) + '" ' +
               'data-pessoa="' + escapar(x.nome) + '">' +
               '<span class="resultado__nome">' + escapar(x.nome) + '</span>' +
               (outros > 0
                 ? '<span class="resultado__extra">com mais ' + outros +
                   (outros === 1 ? ' pessoa' : ' pessoas') + '</span>'
                 : '<span class="resultado__extra">convite individual</span>') +
               '</button>';
      }).join('');
    }

    var atraso;
    campo.addEventListener('input', function () {
      clearTimeout(atraso);
      var v = this.value;
      atraso = setTimeout(function () { pintarResultados(v); }, 140);
    });

    /* Enter com um único resultado já abre a família */
    campo.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var botoes = $$('.resultado');
      if (botoes.length === 1) botoes[0].click();
    });

    caixa.addEventListener('click', function (e) {
      var b = e.target.closest('[data-familia]');
      if (b) abrirFamilia(b.dataset.familia, b.dataset.pessoa);
    });

    /* ---------- painel da família ---------- */
    var quemBuscou = '';

    function abrirFamilia(id, pessoa) {
      familiaAtual = LISTA.filter(function (f) { return f.id === id; })[0];
      if (!familiaAtual) return;
      quemBuscou = pessoa || '';

      var pessoas = normalizarPessoas(familiaAtual);

      $('#familia-titulo').textContent = pessoas.length > 1
        ? 'Família ' + nomeFamilia(familiaAtual)
        : pessoas[0].nome;

      $('#familia-ajuda').textContent = pessoas.length > 1
        ? 'Marque quem vai poder ir. Já deixamos todos marcados — é só desmarcar quem não puder.'
        : 'Confirme se você vai poder ir.';

      $('#pessoas').innerHTML = pessoas.map(function (p, i) {
        return '<label class="pessoa">' +
                 '<input type="checkbox" class="pessoa__check" data-nome="' + escapar(p.nome) + '" ' +
                 'data-crianca="' + (p.crianca ? '1' : '') + '" checked>' +
                 '<span class="pessoa__marca" aria-hidden="true"></span>' +
                 '<span class="pessoa__nome">' + escapar(p.nome) +
                   (p.crianca ? '<span class="pessoa__tag">criança</span>' : '') + '</span>' +
                 '<span class="pessoa__estado"></span>' +
               '</label>';
      }).join('');

      atualizarEstados();

      $('#rsvp-busca').classList.add('oculto');
      $('#form-rsvp').classList.remove('oculto');
      $('#form-rsvp').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function atualizarEstados() {
      $$('.pessoa').forEach(function (l) {
        var vai = l.querySelector('.pessoa__check').checked;
        l.classList.toggle('pessoa--fora', !vai);
        l.querySelector('.pessoa__estado').textContent = vai ? 'Vai' : 'Não vai';
      });
    }
    $('#pessoas').addEventListener('change', atualizarEstados);

    $('#rsvp-voltar').addEventListener('click', function () {
      $('#form-rsvp').classList.add('oculto');
      $('#rsvp-busca').classList.remove('oculto');
      campo.value = ''; caixa.innerHTML = '';
      campo.focus();
    });

    /* máscara de telefone */
    $('#rsvp-telefone').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 6)      v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
      else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
      else if (v.length)     v = '(' + v;
      this.value = v;
    });

    function erro(campoNome, msg) {
      var el = $('#form-rsvp').querySelector('[data-erro="' + campoNome + '"]');
      if (!el) return;
      el.textContent = msg || '';
      el.classList.toggle('oculto', !msg);
    }

    /* ---------- envio ---------- */
    $('#form-rsvp').addEventListener('submit', function (e) {
      e.preventDefault();
      erro('telefone', '');

      var tel = $('#rsvp-telefone').value.replace(/\D/g, '');
      if (tel.length < 10) {
        erro('telefone', 'Informe um número com DDD.');
        return $('#rsvp-telefone').focus();
      }

      var pessoas = $$('.pessoa__check').map(function (c) {
        return { nome: c.dataset.nome, vai: c.checked, crianca: c.dataset.crianca === '1' };
      });
      var vao = pessoas.filter(function (p) { return p.vai; });

      var dados = {
        familia: familiaAtual.id,
        respondidoPor: quemBuscou || pessoas[0].nome,
        telefone: $('#rsvp-telefone').value,
        pessoas: pessoas,
        restricao: $('#rsvp-restricao').value.trim(),
        mensagem: $('#rsvp-mensagem').value.trim(),
        atualizadoEm: Date.now()
      };

      var botao = $('#rsvp-enviar');
      botao.disabled = true;
      botao.textContent = 'Enviando...';

      DADOS.salvarConfirmacao(familiaAtual.id, dados).then(function () {
        $('#form-rsvp').classList.add('oculto');
        $('#rsvp-sucesso').classList.remove('oculto');

        if (vao.length) {
          $('#sucesso-titulo').textContent = 'Que alegria!';
          $('#sucesso-texto').textContent =
            (vao.length === 1
              ? vao[0].nome + ' está confirmado(a)'
              : vao.length + ' pessoas confirmadas: ' + vao.map(function (p) { return p.nome; }).join(', ')) +
            '. Já estamos ansiosos para ver vocês lá. Se algo mudar, é só voltar aqui e confirmar de novo.';
          $('#sucesso-convite').classList.remove('oculto');
        } else {
          $('#sucesso-titulo').textContent = 'Obrigado por avisar';
          $('#sucesso-texto').textContent =
            'Vamos sentir sua falta, mas agradecemos por nos avisar com carinho.';
          $('#sucesso-convite').classList.add('oculto');
        }
        $('#rsvp-sucesso').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function (err) {
        console.error(err);
        aviso('Não conseguimos enviar. Tente de novo em instantes.', true);
      }).finally(function () {
        botao.disabled = false;
        botao.textContent = 'Enviar confirmação';
      });
    });

    $('#rsvp-novo').addEventListener('click', function () {
      $('#form-rsvp').reset();
      $('#rsvp-sucesso').classList.add('oculto');
      $('#rsvp-busca').classList.remove('oculto');
      campo.value = ''; caixa.innerHTML = '';
      campo.focus();
    });
  })();

  /* ============================================================
     5. LISTA DE PRESENTES (com cotas)
     ============================================================ */
  (function () {
    var padrao = (C.presentes.itens || []).map(function (i, n) {
      return Object.assign({ ordem: n, cotas: 1 }, i);
    });
    var itens = padrao;
    var dadosPresentes = {};   /* presentes/{item}/{contribuicao} */
    var imagens = {};
    var configPix = null;      /* chave PIX salva no painel */
    var filtro = 'todos';

    /* aceita o formato antigo (uma contribuição solta por item) */
    function contribuicoesDe(idItem) {
      var no = dadosPresentes[idItem];
      if (!no) return [];
      if (no.nome && no.valor !== undefined && !no.presente === false) { /* formato antigo */ }
      if (typeof no.nome === 'string') return [Object.assign({ _id: 'antigo', cotas: 1 }, no)];
      return Object.keys(no).map(function (k) {
        return Object.assign({ _id: k, cotas: 1 }, no[k]);
      });
    }

    function cotasTomadas(idItem) {
      return contribuicoesDe(idItem).reduce(function (s, c) { return s + (Number(c.cotas) || 1); }, 0);
    }

    function totalCotas(item) { return Math.max(1, Number(item.cotas) || 1); }
    function valorCota(item)  { return Number(item.valor) / totalCotas(item); }
    function cotasLivres(item) { return Math.max(0, totalCotas(item) - cotasTomadas(item.id)); }

    DADOS.ouvirCatalogo(function (cat) {
      var chaves = Object.keys(cat || {});
      itens = chaves.length
        ? chaves.map(function (k) { return Object.assign({ cotas: 1 }, cat[k], { id: k }); })
                .filter(function (i) { return i.ativo !== false; })
                .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
        : padrao;
      montarFiltros();
      pintar();
    });

    DADOS.ouvirPresentes(function (dados) { dadosPresentes = dados || {}; pintar(); });
    DADOS.ouvirImagens(function (dados) { imagens = dados || {}; pintar(); });
    DADOS.ouvirConfig(function (cfg) {
      configPix = (cfg && cfg.pix && cfg.pix.chave) ? cfg.pix : null;
    });

    /* ---------- filtros ---------- */
    function montarFiltros() {
      var cats = ['todos'].concat(itens.map(function (i) { return i.categoria; })
                 .filter(function (v, i, a) { return v && a.indexOf(v) === i; }));
      if (cats.indexOf(filtro) === -1) filtro = 'todos';
      $('#filtros').innerHTML = cats.map(function (c) {
        return '<button class="filtro" data-cat="' + escapar(c) + '" aria-pressed="' +
               (c === filtro) + '">' + escapar(c === 'todos' ? 'Todos' : c) + '</button>';
      }).join('');
    }
    montarFiltros();

    $('#filtros').addEventListener('click', function (e) {
      var b = e.target.closest('.filtro');
      if (!b) return;
      filtro = b.dataset.cat;
      $$('.filtro').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      pintar();
    });

    /* ---------- cartões ---------- */
    function pintar() {
      var lista = itens.filter(function (i) { return filtro === 'todos' || i.categoria === filtro; });

      $('#lista-presentes').innerHTML = lista.map(function (i) {
        var livre    = Number(i.valor) <= 0;          /* contribuição de valor livre */
        var total    = totalCotas(i);
        var dividido = !livre && total > 1;
        var tomadas  = cotasTomadas(i.id);
        var restam   = Math.max(0, total - tomadas);
        var esgotado = !livre && restam <= 0;
        var foto     = imagens[i.id] || i.imagem || '';
        var pct      = total ? Math.min(100, Math.round(tomadas / total * 100)) : 0;

        return '<article class="presente' + (esgotado ? ' presente--dado' : '') + '">' +
          '<div class="presente__foto">' +
            (foto ? '<img src="' + escapar(foto) + '" alt="' + escapar(i.nome) + '" loading="lazy">'
                  : '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' + ICONES.presente + '</svg>') +
            (esgotado ? '<span class="presente__selo">Já presenteado</span>' : '') +
          '</div>' +
          '<div class="presente__corpo">' +
            '<span class="presente__cat">' + escapar(i.categoria || '') + '</span>' +
            '<h3 class="presente__nome">' + escapar(i.nome) + '</h3>' +
            (i.descricao ? '<p class="presente__desc">' + escapar(i.descricao) + '</p>' : '') +

            (dividido
              ? '<div class="cotas">' +
                  '<div class="cotas__barra"><i style="width:' + pct + '%"></i></div>' +
                  '<p class="cotas__texto">' +
                    (esgotado ? 'Todas as cotas preenchidas'
                              : restam + (restam === 1 ? ' cota disponível' : ' cotas disponíveis') +
                                ' de ' + total) +
                  '</p>' +
                '</div>'
              : '') +

            '<p class="presente__valor">' +
              (livre ? 'Valor livre'
                     : dividido
                       ? moeda.format(valorCota(i)) + '<span class="presente__unidade">por cota</span>'
                       : moeda.format(i.valor)) +
            '</p>' +

            (esgotado
              ? '<button class="botao botao--vazado botao--pequeno" disabled>Presenteado</button>'
              : '<button class="botao botao--pequeno" data-presente="' + escapar(i.id) + '">' +
                (dividido ? 'Escolher cotas' : 'Presentear') + '</button>') +
          '</div></article>';
      }).join('');
    }
    pintar();

    $('#lista-presentes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-presente]');
      if (b) abrirPresente(b.dataset.presente);
    });

    /* ---------- janela do presente ---------- */
    var janela = $('#janela-presente');
    var ultimoFoco = null;

    function fechar() {
      janela.classList.remove('janela--aberta');
      setTimeout(function () { janela.hidden = true; $('#janela-conteudo').innerHTML = ''; }, 300);
      document.body.style.overflow = '';
      if (ultimoFoco) ultimoFoco.focus();
    }
    $('#janela-fechar').addEventListener('click', fechar);
    janela.addEventListener('click', function (e) { if (e.target === janela) fechar(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !janela.hidden) fechar();
    });

    function abrirPresente(id) {
      var item = itens.filter(function (i) { return i.id === id; })[0];
      if (!item) return;
      ultimoFoco = document.activeElement;

      var livre    = Number(item.valor) <= 0;
      var total    = totalCotas(item);
      var dividido = !livre && total > 1;
      var restam   = cotasLivres(item);
      var unidade  = valorCota(item);

      var html =
        '<h2 class="janela__titulo" id="janela-titulo">' + escapar(item.nome) + '</h2>';

      if (livre) {
        html += '<p class="janela__valor" id="valor-exibido">Você escolhe o valor</p>' +
          '<div class="campo"><label class="campo__rotulo" for="valor-livre">Quanto você quer contribuir?</label>' +
          '<input type="number" id="valor-livre" min="1" step="1" placeholder="Ex.: 200" inputmode="numeric"></div>' +
          '<button class="botao botao--largo" id="gerar-qr">Gerar PIX</button><div id="area-pix"></div>';

      } else if (dividido) {
        html +=
          '<p class="janela__aviso">Este presente está dividido em ' + total + ' cotas de ' +
            moedaCheia.format(unidade) + '. Você escolhe quantas quer dar — e outras pessoas completam o resto.</p>' +
          '<div class="seletor-cotas">' +
            '<button type="button" class="seletor-cotas__btn" id="menos" aria-label="Menos cotas">&minus;</button>' +
            '<div class="seletor-cotas__valor">' +
              '<strong id="qtd-cotas">1</strong>' +
              '<span id="rotulo-cotas">cota</span>' +
            '</div>' +
            '<button type="button" class="seletor-cotas__btn" id="mais-cotas" aria-label="Mais cotas">+</button>' +
          '</div>' +
          '<p class="campo__ajuda" style="text-align:center">Restam ' + restam +
            (restam === 1 ? ' cota' : ' cotas') + '</p>' +
          '<p class="janela__valor" id="valor-exibido">' + moedaCheia.format(unidade) + '</p>' +
          '<button class="botao botao--largo" id="gerar-qr">Gerar PIX</button><div id="area-pix"></div>';

      } else {
        html += '<p class="janela__valor" id="valor-exibido">' + moedaCheia.format(item.valor) + '</p>' +
                '<div id="area-pix"></div>';
      }

      $('#janela-conteudo').innerHTML = html;
      janela.hidden = false;
      requestAnimationFrame(function () { janela.classList.add('janela--aberta'); });
      document.body.style.overflow = 'hidden';

      if (livre) {
        $('#gerar-qr').addEventListener('click', function () {
          var v = Number($('#valor-livre').value);
          if (!(v > 0)) return aviso('Digite um valor maior que zero.', true);
          $('#valor-exibido').textContent = moedaCheia.format(v);
          montarPix(item, v, 1);
        });

      } else if (dividido) {
        var qtd = 1;
        function atualizar() {
          $('#qtd-cotas').textContent = qtd;
          $('#rotulo-cotas').textContent = qtd === 1 ? 'cota' : 'cotas';
          $('#valor-exibido').textContent = moedaCheia.format(unidade * qtd);
          $('#menos').disabled = qtd <= 1;
          $('#mais-cotas').disabled = qtd >= restam;
          $('#area-pix').innerHTML = '';
        }
        $('#menos').addEventListener('click', function () { if (qtd > 1) { qtd--; atualizar(); } });
        $('#mais-cotas').addEventListener('click', function () { if (qtd < restam) { qtd++; atualizar(); } });
        atualizar();
        $('#gerar-qr').addEventListener('click', function () { montarPix(item, unidade * qtd, qtd); });

      } else {
        montarPix(item, Number(item.valor), 1);
      }

      $('.janela__fechar').focus();
    }

    function montarPix(item, valor, cotas) {
      /* a chave salva no painel manda; sem ela, usa a do conteudo.js */
      var p = configPix || C.presentes.pix || {};
      var codigo = PIX.gerar({
        chave: p.chave,
        nomeRecebedor: p.nomeRecebedor,
        cidade: p.cidade,
        valor: valor,
        identificador: item.id
      });

      if (!codigo) {
        $('#area-pix').innerHTML = '<div class="aviso">A chave PIX ainda não foi configurada no site.</div>';
        return;
      }

      $('#area-pix').innerHTML =
        '<div class="pix">' +
          '<div class="pix__qr" id="qr"></div>' +
          '<textarea class="pix__codigo" id="codigo-pix" readonly aria-label="Código PIX copia e cola">' +
             escapar(codigo) + '</textarea>' +
          '<button class="botao botao--largo botao--pequeno" id="copiar" style="margin-top:.8rem">Copiar código PIX</button>' +
          '<ol class="pix__passos">' +
            '<li>Abra o app do seu banco e escolha <strong>PIX &rsaquo; Copia e cola</strong> (ou leia o QR Code).</li>' +
            '<li>Confira o valor e finalize o pagamento.</li>' +
            '<li>Volte aqui e avise a gente no botão abaixo.</li>' +
          '</ol>' +
          '<hr style="border:0;border-top:1px solid var(--cor-borda);margin:1.5rem 0">' +
          '<div class="campo"><label class="campo__rotulo" for="pix-nome">Seu nome <span class="obrigatorio">*</span></label>' +
            '<input type="text" id="pix-nome" placeholder="Para sabermos de quem veio" autocomplete="name"></div>' +
          '<div class="campo"><label class="campo__rotulo" for="pix-msg">Mensagem para os noivos</label>' +
            '<input type="text" id="pix-msg" placeholder="Opcional" maxlength="200"></div>' +
          '<button class="botao botao--largo" id="confirmar-pix">Já fiz o PIX</button>' +
        '</div>';

      garantirQR().then(function () {
        var alvo = $('#qr');
        if (!alvo) return;
        alvo.innerHTML = '';
        new QRCode(alvo, {
          text: codigo, width: 190, height: 190,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }).catch(function () {
        var alvo = $('#qr');
        if (alvo) alvo.innerHTML =
          '<p style="font-size:.82rem;color:var(--cor-texto-suave);padding:1rem;line-height:1.5">' +
          'QR Code indisponível agora.<br>Use o código copia e cola abaixo — funciona igual.</p>';
      });

      $('#copiar').addEventListener('click', function () {
        var txt = $('#codigo-pix');
        txt.select(); txt.setSelectionRange(0, 99999);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codigo).then(function () { aviso('Código PIX copiado!'); });
        } else {
          try { document.execCommand('copy'); aviso('Código PIX copiado!'); }
          catch (e) { aviso('Selecione o código e copie manualmente.', true); }
        }
      });

      $('#confirmar-pix').addEventListener('click', function () {
        var nome = $('#pix-nome').value.trim();
        if (nome.length < 3) return aviso('Escreva seu nome para registrarmos o presente.', true);

        /* confere de novo, caso alguém tenha pego as cotas nesse meio tempo */
        if (cotas > 1 || totalCotas(item) > 1) {
          if (cotas > cotasLivres(item)) {
            aviso('Alguém acabou de pegar essas cotas. Confira o que sobrou.', true);
            return fechar();
          }
        }

        var b = this;
        b.disabled = true; b.textContent = 'Registrando...';

        DADOS.reservarPresente(item.id, {
          presente: item.nome,
          valor: valor,
          cotas: cotas,
          nome: nome,
          mensagem: $('#pix-msg').value.trim(),
          pago: false
        }).then(function () {
          aviso('Obrigado, ' + nome.split(' ')[0] + '! Presente registrado com carinho.');
          fechar();
        }).catch(function (e) {
          console.error(e);
          aviso('Não conseguimos registrar agora. Tente novamente.', true);
          b.disabled = false; b.textContent = 'Já fiz o PIX';
        });
      });
    }
  })();

  /* ============================================================
     6. MURAL DE RECADOS
     ============================================================ */
  (function () {
    var form = $('#form-recado');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = $('#recado-nome').value.trim();
      var msg  = $('#recado-msg').value.trim();
      if (nome.length < 2 || msg.length < 2) return aviso('Preencha nome e recado.', true);

      var b = form.querySelector('button');
      b.disabled = true; b.textContent = 'Enviando...';

      DADOS.salvarRecado({
        nome: nome,
        mensagem: msg,
        aprovado: !C.recados.moderar
      }).then(function () {
        form.reset();
        aviso(C.recados.moderar
          ? 'Recado enviado! Aparece no mural assim que os noivos aprovarem.'
          : 'Recado publicado no mural. Obrigado!');
      }).catch(function () {
        aviso('Não conseguimos enviar o recado agora.', true);
      }).finally(function () {
        b.disabled = false; b.textContent = 'Deixar recado';
      });
    });

    DADOS.ouvirRecados(function (dados) {
      var lista = Object.keys(dados || {})
        .map(function (k) { return dados[k]; })
        .filter(function (r) { return r && r.aprovado; })
        .sort(function (a, b) { return (b.criadoEm || 0) - (a.criadoEm || 0); });

      $('#mural').innerHTML = lista.length
        ? lista.map(function (r) {
            return '<article class="recado"><p>&ldquo;' + escapar(r.mensagem) + '&rdquo;</p>' +
                   '<span class="recado__autor">' + escapar(r.nome) + '</span></article>';
          }).join('')
        : '<p class="recados__vazio">Seja o primeiro a deixar um recado.</p>';
    });
  })();

  /* ============================================================
     7. TARJA DE MODO DEMONSTRAÇÃO
     ============================================================ */
  DADOS.pronto().then(function () {
    if (!DADOS.modoDemo) return;
    var t = document.createElement('div');
    t.className = 'tarja-demo';
    t.textContent = 'Modo demonstração — nada é salvo de verdade';
    document.body.appendChild(t);
    document.body.classList.add('tem-tarja');

    function medir() {
      document.body.style.setProperty('--altura-tarja', t.offsetHeight + 'px');
    }
    medir();
    window.addEventListener('resize', medir);
  });

})();
