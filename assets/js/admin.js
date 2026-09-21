/* ============================================================
   ÁREA DOS NOIVOS
   Resumo, confirmações, presentes recebidos, edição da lista
   de presentes e moderação dos recados.
   ============================================================ */
(function () {
  'use strict';

  var C = window.CONTEUDO;
  var SEMENTE = window.CONVIDADOS || [];
  var LISTA = SEMENTE;          /* lista em uso: banco, ou a semente */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function escapar(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function dataHora(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  function aviso(texto, erro) {
    var el = $('#aviso');
    el.textContent = texto;
    el.classList.toggle('aviso-flutuante--erro', !!erro);
    el.classList.add('aviso-flutuante--visivel');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('aviso-flutuante--visivel'); }, 4000);
  }

  function soDigitos(t) { return String(t || '').replace(/\D/g, ''); }

  /* Confirmação própria: o confirm() do navegador é bloqueado quando o
     painel roda dentro de um iframe (prévia), e some sem avisar. */
  function perguntar(texto, rotulo) {
    return new Promise(function (resolve) {
      var j = $('#janela-confirma');
      $('#confirma-texto').textContent = texto;
      $('#confirma-sim').textContent = rotulo || 'Confirmar';
      j.hidden = false;
      requestAnimationFrame(function () { j.classList.add('janela--aberta'); });
      document.body.style.overflow = 'hidden';

      function fechar(resposta) {
        j.classList.remove('janela--aberta');
        setTimeout(function () { j.hidden = true; }, 250);
        document.body.style.overflow = '';
        $('#confirma-sim').onclick = null;
        $('#confirma-nao').onclick = null;
        document.removeEventListener('keydown', porTecla);
        resolve(resposta);
      }
      function porTecla(e) { if (e.key === 'Escape') fechar(false); }

      $('#confirma-sim').onclick = function () { fechar(true); };
      $('#confirma-nao').onclick = function () { fechar(false); };
      document.addEventListener('keydown', porTecla);
      $('#confirma-sim').focus();
    });
  }

  /* Mensagem de erro que diz o motivo de verdade */
  function explicarErro(e) {
    var m = (e && (e.message || e.code) || '').toLowerCase();
    if (m.indexOf('permission') !== -1 || m.indexOf('denied') !== -1) {
      return 'O Firebase recusou a gravação. Quase sempre é porque as regras do banco ' +
             'estão desatualizadas — cole o database.rules.json novo em Realtime Database › Regras.';
    }
    if (m.indexOf('network') !== -1 || m.indexOf('offline') !== -1) {
      return 'Sem conexão com o banco agora. Tente de novo em instantes.';
    }
    return 'Não conseguimos salvar. ' + (e && e.message ? e.message : '');
  }

  /* ---------- helpers da lista de convidados ---------- */
  function pessoasDaFamilia(fam) {
    return (fam.pessoas || []).map(function (p) { return typeof p === 'string' ? { nome: p } : p; });
  }
  function rotuloFamilia(fam) {
    if (fam.rotulo) return fam.rotulo;
    var p = pessoasDaFamilia(fam)[0];
    return p ? p.nome.split(' ')[0] : fam.id;
  }
  function contarPessoas() {
    var adultos = 0, criancas = 0;
    LISTA.forEach(function (f) {
      pessoasDaFamilia(f).forEach(function (p) { p.crianca ? criancas++ : adultos++; });
    });
    return { adultos: adultos, criancas: criancas, total: adultos + criancas };
  }
  function familiasPublicadas() { return Object.keys(estado.familias).length > 0; }

  /* ---------- estado ---------- */
  var estado = { confirmacoes: {}, presentes: {}, recados: {}, catalogo: {},
                 familias: {}, imagens: {}, config: {}, textos: {} };
  var abaAtiva = 'resumo';
  var busca = '';

  /* ============================================================
     ENTRADA POR SENHA
     ------------------------------------------------------------
     A senha digitada aqui é a senha do usuário do Firebase.
     Ela NÃO fica guardada no código: quem valida é o Firebase,
     e as regras do banco continuam exigindo login para ler.
     ============================================================ */
  var EMAIL = (C.painel && C.painel.email) || '';

  $('#entrada-monograma').innerHTML =
    C.noivos.nome1.charAt(0) + '<em>&amp;</em>' + C.noivos.nome2.charAt(0);

  DADOS.pronto().then(function () {
    if (DADOS.modoDemo) return abrirPainel({ email: 'modo demonstração' });
    DADOS.ouvirUsuario(function (usuario) {
      if (usuario) abrirPainel(usuario);
      else {
        $('#tela-painel').classList.add('oculto');
        $('#tela-login').classList.remove('oculto');
        $('#senha').focus();
      }
    });
  });

  $('#form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = this.querySelector('button[type=submit]');
    var el = $('#erro-login');
    el.classList.add('oculto');

    if (!EMAIL) {
      el.textContent = 'Falta configurar painel.email no arquivo conteudo.js.';
      return el.classList.remove('oculto');
    }

    b.disabled = true; b.textContent = 'Entrando...';
    DADOS.entrar(EMAIL, $('#senha').value)
      .catch(function () {
        el.textContent = 'Senha incorreta.';
        el.classList.remove('oculto');
        $('#senha').value = '';
        $('#senha').focus();
      })
      .finally(function () { b.disabled = false; b.textContent = 'Entrar'; });
  });

  $('#sair').addEventListener('click', function () {
    DADOS.sair().then(function () { location.reload(); });
  });

  /* ============================================================
     PAINEL
     ============================================================ */
  function abrirPainel(usuario) {
    $('#tela-login').classList.add('oculto');
    $('#tela-painel').classList.remove('oculto');
    $('#painel-titulo').textContent = C.noivos.nome1 + ' ' + C.noivos.conector + ' ' + C.noivos.nome2;
    $('#painel-sub').textContent = C.dataPorExtenso + ' · ' + diasQueFaltam() + ' dias';

    DADOS.ouvirConfirmacoes(function (d) { estado.confirmacoes = d || {}; pintar(); });
    DADOS.ouvirPresentes(function (d)    { estado.presentes    = d || {}; pintar(); });
    DADOS.ouvirRecados(function (d)      { estado.recados      = d || {}; pintar(); });
    DADOS.ouvirCatalogo(function (d)     { estado.catalogo     = d || {}; pintar(); });
    DADOS.ouvirImagens(function (d)      { estado.imagens      = d || {}; pintar(); });
    DADOS.ouvirConfig(function (d)       { estado.config       = d || {}; pintar(); });
    DADOS.ouvirTextos(function (d)       { estado.textos       = d || {}; pintar(); });
    DADOS.ouvirFamilias(function (d) {
      estado.familias = d || {};
      var chaves = Object.keys(estado.familias);
      LISTA = chaves.length
        ? chaves.map(function (k) { return Object.assign({ id: k }, estado.familias[k]); })
                .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
        : SEMENTE;
      pintar();
    });
  }

  function diasQueFaltam() {
    return Math.max(0, Math.ceil((new Date(C.dataHora) - new Date()) / 86400000));
  }

  $$('.aba').forEach(function (b) {
    b.addEventListener('click', function () {
      abaAtiva = b.dataset.aba;
      $$('.aba').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      $('#busca').value = ''; busca = '';
      pintar();
    });
  });

  $('#busca').addEventListener('input', function () {
    busca = this.value.toLowerCase().trim();
    pintar();
  });

  /* ---------- catálogo: itens do banco, ou a lista do conteudo.js ---------- */
  function itensCatalogo() {
    var chaves = Object.keys(estado.catalogo);
    if (!chaves.length) return [];
    return chaves.map(function (k) { return Object.assign({ id: k }, estado.catalogo[k]); })
                 .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }
  function catalogoPublicado() { return Object.keys(estado.catalogo).length > 0; }

  /* ---------- contribuições nos presentes ----------
     presentes/{item}/{contribuicao}. Aceita também o formato
     antigo, de quando cada item tinha uma contribuição só.      */
  function contribuicoesDe(idItem) {
    var no = estado.presentes[idItem];
    if (!no) return [];
    if (typeof no.nome === 'string') return [Object.assign({ _id: 'antigo', cotas: 1 }, no)];
    return Object.keys(no).map(function (k) {
      return Object.assign({ _id: k, cotas: 1 }, no[k]);
    });
  }
  function todasContribuicoes() {
    var saida = [];
    Object.keys(estado.presentes).forEach(function (idItem) {
      contribuicoesDe(idItem).forEach(function (c) {
        c._item = idItem;
        saida.push(c);
      });
    });
    return saida.sort(function (a, b) { return (b.reservadoEm || 0) - (a.reservadoEm || 0); });
  }
  function cotasTomadas(idItem) {
    return contribuicoesDe(idItem).reduce(function (s, c) { return s + (Number(c.cotas) || 1); }, 0);
  }

  /* ---------- contas ---------- */
  function contas() {
    var conf = estado.confirmacoes;
    var familiasResp = Object.keys(conf).length;
    var vao = 0, naoVao = 0, vaoCriancas = 0;
    Object.keys(conf).forEach(function (k) {
      (conf[k].pessoas || []).forEach(function (p) {
        if (p.vai) { vao++; if (p.crianca) vaoCriancas++; }
        else naoVao++;
      });
    });

    var pres = todasContribuicoes();
    var totalEscolhido = pres.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);
    var recebido = pres.filter(function (p) { return p.pago; })
                       .reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);

    var itens = itensCatalogo();
    var valorLista = (itens.length ? itens : (C.presentes.itens || []))
      .reduce(function (s, i) { return s + (Number(i.valor) || 0); }, 0);

    return {
      familiasResp: familiasResp,
      faltamResponder: LISTA.length - familiasResp,
      vao: vao, naoVao: naoVao,
      vaoCriancas: vaoCriancas, vaoAdultos: vao - vaoCriancas,
      presentes: pres,
      totalEscolhido: totalEscolhido,
      recebido: recebido,
      aConfirmar: totalEscolhido - recebido,
      valorLista: valorLista,
      recadosPendentes: Object.keys(estado.recados).filter(function (k) {
        return !estado.recados[k].aprovado;
      }).length
    };
  }

  function pintarNumeros() {
    var c = contas();
    var t = contarPessoas();
    var pct = t.total ? Math.round(c.vao / t.total * 100) : 0;

    $('#numeros').innerHTML =
      '<div class="numero numero--destaque">' +
        '<strong>' + c.vao + '</strong><span>Pessoas confirmadas</span>' +
        '<small>de ' + t.total + ' convidados · ' + pct + '%</small>' +
        '<div class="barra-prog"><i style="width:' + pct + '%"></i></div>' +
      '</div>' +
      '<div class="numero"><strong>' + c.vaoAdultos + ' + ' + c.vaoCriancas + '</strong>' +
        '<span>Adultos + crianças</span>' +
        '<small>convidados: ' + t.adultos + ' adultos, ' + t.criancas + ' crianças</small></div>' +
      '<div class="numero"><strong>' + c.naoVao + '</strong><span>Não poderão vir</span></div>' +
      '<div class="numero' + (c.faltamResponder ? ' numero--alerta' : '') + '">' +
        '<strong>' + c.faltamResponder + '</strong><span>Famílias sem resposta</span>' +
        '<small>de ' + LISTA.length + ' famílias</small></div>' +
      '<div class="numero numero--destaque">' +
        '<strong>' + moeda.format(c.recebido) + '</strong><span>Presentes recebidos</span>' +
        '<small>' + moeda.format(c.aConfirmar) + ' aguardando conferência</small></div>' +
      '<div class="numero"><strong>' + c.presentes.length + '</strong><span>Presentes escolhidos</span></div>' +
      '<div class="numero' + (c.recadosPendentes ? ' numero--alerta' : '') + '">' +
        '<strong>' + c.recadosPendentes + '</strong><span>Recados a aprovar</span></div>';
  }

  /* ============================================================
     ABAS
     ============================================================ */
  function pintar() {
    pintarNumeros();

    /* se o usuário está digitando numa célula, não redesenha por baixo dele */
    var foco = document.activeElement;
    if (foco && $('#conteudo-aba').contains(foco) &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName)) return;
    $('#novo-item').classList.toggle('oculto', abaAtiva !== 'catalogo');
    $('#nova-familia').classList.toggle('oculto', abaAtiva !== 'convidados');
    var semBarra = abaAtiva === 'resumo' || abaAtiva === 'pix' || abaAtiva === 'textos';
    $('#exportar').classList.toggle('oculto',
      semBarra || abaAtiva === 'catalogo' || abaAtiva === 'convidados');
    $('#busca').classList.toggle('oculto', semBarra);
    $('#barra-acoes').classList.toggle('oculto', semBarra);

    if (abaAtiva === 'resumo')            pintarResumo();
    else if (abaAtiva === 'confirmacoes') pintarConfirmacoes();
    else if (abaAtiva === 'presentes')    pintarPresentes();
    else if (abaAtiva === 'catalogo')     pintarCatalogo();
    else if (abaAtiva === 'convidados')   pintarConvidados();
    else if (abaAtiva === 'textos')       pintarTextos();
    else if (abaAtiva === 'pix')          pintarPix();
    else                                  pintarRecados();
  }

  function caixaTabela(html) {
    return '<div class="tabela-caixa">' + html + '</div>';
  }
  function vazio(texto) {
    return '<div class="tabela-caixa"><p class="vazio">' + escapar(texto) + '</p></div>';
  }

  /* ---------- RESUMO ---------- */
  function pintarResumo() {
    var c = contas();

    /* presentes por categoria */
    var itens = itensCatalogo();
    if (!itens.length) itens = (C.presentes.itens || []);
    var porCat = {};
    itens.forEach(function (i) {
      var cat = i.categoria || 'Sem categoria';
      porCat[cat] = porCat[cat] || { total: 0, valor: 0, dados: 0, valorDado: 0 };
      porCat[cat].total++;
      porCat[cat].valor += Number(i.valor) || 0;
      contribuicoesDe(i.id).forEach(function (c) {
        porCat[cat].valorDado += Number(c.valor) || 0;
      });
      if (cotasTomadas(i.id) >= Math.max(1, Number(i.cotas) || 1)) porCat[cat].dados++;
    });

    var linhasCat = Object.keys(porCat).sort().map(function (cat) {
      var x = porCat[cat];
      var pct = x.total ? Math.round(x.dados / x.total * 100) : 0;
      return '<tr>' +
        '<td><strong>' + escapar(cat) + '</strong></td>' +
        '<td>' + x.dados + ' / ' + x.total +
          '<div class="barra-prog" style="max-width:140px"><i style="width:' + pct + '%"></i></div></td>' +
        '<td style="white-space:nowrap">' + moeda.format(x.valorDado) + '</td>' +
        '<td style="white-space:nowrap;color:var(--cor-texto-suave)">' + moeda.format(x.valor) + '</td>' +
      '</tr>';
    }).join('');

    /* famílias que faltam responder */
    var faltam = LISTA.filter(function (f) { return !estado.confirmacoes[f.id]; });

    /* últimos presentes */
    var ultimos = todasContribuicoes().slice(0, 5);

    $('#conteudo-aba').innerHTML =
      '<div class="bloco">' +
        '<h2>Resumo de valores</h2>' +
        '<p class="bloco__sub">Quanto já entrou, por categoria da lista.</p>' +
        (linhasCat
          ? '<div style="overflow-x:auto"><table>' +
              '<thead><tr><th>Categoria</th><th>Escolhidos</th><th>Valor recebido</th><th>Valor da categoria</th></tr></thead>' +
              '<tbody>' + linhasCat + '</tbody>' +
              '<tfoot><tr><td>Total</td><td>' + c.presentes.length + '</td>' +
                '<td>' + moeda.format(c.totalEscolhido) + '</td>' +
                '<td>' + moeda.format(c.valorLista) + '</td></tr></tfoot>' +
            '</table></div>'
          : '<p class="vazio">Nenhum presente na lista ainda.</p>') +
        (c.aConfirmar > 0
          ? '<div class="aviso" style="margin-top:1.2rem">' + moeda.format(c.aConfirmar) +
            ' foram marcados como pagos pelos convidados mas você ainda não confirmou o recebimento. ' +
            'Confira o extrato e marque em <strong>Presentes recebidos</strong>.</div>'
          : '') +
      '</div>' +

      '<div class="bloco">' +
        '<h2>Últimos presentes</h2>' +
        '<p class="bloco__sub">Os cinco mais recentes.</p>' +
        (ultimos.length
          ? '<div style="overflow-x:auto"><table><tbody>' + ultimos.map(function (p) {
              return '<tr><td><strong>' + escapar(p.nome) + '</strong></td>' +
                     '<td>' + escapar(p.presente) + '</td>' +
                     '<td style="white-space:nowrap">' + moeda.format(Number(p.valor) || 0) + '</td>' +
                     '<td style="white-space:nowrap">' + dataHora(p.reservadoEm) + '</td>' +
                     '<td>' + (p.pago ? '<span class="etiqueta etiqueta--pago">Recebido</span>'
                                      : '<span class="etiqueta etiqueta--espera">A conferir</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="vazio">Ninguém escolheu presentes ainda.</p>') +
      '</div>' +

      '<div class="bloco">' +
        '<h2>Ainda não responderam</h2>' +
        '<p class="bloco__sub">' + faltam.length +
          (faltam.length === 1 ? ' família' : ' famílias') + ' de ' + LISTA.length + '.</p>' +
        (faltam.length
          ? '<div style="display:flex;flex-wrap:wrap;gap:.5rem">' + faltam.map(function (f) {
              return '<span class="etiqueta etiqueta--espera" style="padding:.4rem .8rem">' +
                     escapar(pessoasDaFamilia(f).map(function (p) { return p.nome; }).join(', ')) + '</span>';
            }).join('') + '</div>'
          : '<p class="vazio">Todo mundo já respondeu. 🎉</p>') +
      '</div>';
  }

  /* ---------- CONFIRMAÇÕES ---------- */
  function pintarConfirmacoes() {
    var linhas = LISTA.map(function (fam) {
      var pessoas = pessoasDaFamilia(fam);
      return {
        id: fam.id,
        familia: rotuloFamilia(fam),
        busca: pessoas.map(function (p) { return p.nome; }).join(' ').toLowerCase(),
        pessoas: pessoas,
        resposta: estado.confirmacoes[fam.id] || null
      };
    });

    if (busca) linhas = linhas.filter(function (l) { return l.busca.indexOf(busca) !== -1; });
    if (!linhas.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhuma família encontrada.'));

    linhas.sort(function (a, b) {
      if (!a.resposta && b.resposta) return -1;
      if (a.resposta && !b.resposta) return 1;
      return (b.resposta ? b.resposta.atualizadoEm || 0 : 0) - (a.resposta ? a.resposta.atualizadoEm || 0 : 0);
    });

    $('#conteudo-aba').innerHTML = caixaTabela(
      '<table><thead><tr>' +
        '<th>Família</th><th>Situação</th><th>Quem vai</th>' +
        '<th>Contato</th><th>Restrição</th><th>Recado</th><th>Respondeu em</th><th></th>' +
      '</tr></thead><tbody>' +
      linhas.map(function (l) {
        var r = l.resposta;
        var nomesTodos = l.pessoas.map(function (p) { return p.nome; }).join(', ');

        if (!r) {
          return '<tr>' +
            '<td><strong>' + escapar(l.familia) + '</strong><br>' +
              '<span style="color:var(--cor-texto-suave);font-size:.82rem">' + escapar(nomesTodos) + '</span></td>' +
            '<td><span class="etiqueta etiqueta--espera">Aguardando</span></td>' +
            '<td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td></td></tr>';
        }

        var vao   = (r.pessoas || []).filter(function (p) { return p.vai; });
        var ficam = (r.pessoas || []).filter(function (p) { return !p.vai; });
        var tel   = soDigitos(r.telefone);
        var zap   = tel.length >= 10
          ? '<a class="mini" target="_blank" rel="noopener" href="https://wa.me/55' + tel + '">WhatsApp</a> '
          : '';

        return '<tr>' +
          '<td><strong>' + escapar(l.familia) + '</strong><br>' +
            '<span style="color:var(--cor-texto-suave);font-size:.82rem">' +
            l.pessoas.length + (l.pessoas.length === 1 ? ' convidado' : ' convidados') + '</span></td>' +
          '<td>' + (vao.length
            ? '<span class="etiqueta etiqueta--sim">' + vao.length + (vao.length > 1 ? ' vão' : ' vai') + '</span>'
            : '<span class="etiqueta etiqueta--nao">Ninguém vai</span>') + '</td>' +
          '<td>' + (vao.length ? escapar(vao.map(function (p) { return p.nome; }).join(', ')) : '&mdash;') +
            (ficam.length ? '<br><span style="color:var(--cor-erro);font-size:.82rem">não vão: ' +
                            escapar(ficam.map(function (p) { return p.nome; }).join(', ')) + '</span>' : '') + '</td>' +
          '<td>' + escapar(r.telefone || '—') + '</td>' +
          '<td>' + escapar(r.restricao || '—') + '</td>' +
          '<td>' + escapar(r.mensagem || '—') + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(r.atualizadoEm) + '</td>' +
          '<td style="white-space:nowrap">' + zap +
            '<button class="mini mini--perigo" data-excluir-conf="' + escapar(l.id) + '">Limpar</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>');
  }

  /* ---------- PRESENTES RECEBIDOS ---------- */
  function pintarPresentes() {
    var lista = todasContribuicoes();

    if (busca) {
      lista = lista.filter(function (p) {
        return (String(p.nome) + ' ' + String(p.presente)).toLowerCase().indexOf(busca) !== -1;
      });
    }
    if (!lista.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhum presente escolhido ainda.'));

    var soma = lista.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);
    var recebido = lista.filter(function (p) { return p.pago; })
                        .reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);

    $('#conteudo-aba').innerHTML = caixaTabela(
      '<table><thead><tr>' +
        '<th>Presente</th><th>Cotas</th><th>Valor</th><th>Quem deu</th><th>Mensagem</th>' +
        '<th>Escolhido em</th><th>Pagamento</th><th></th>' +
      '</tr></thead><tbody>' +
      lista.map(function (p) {
        var item = estado.catalogo[p._item] || {};
        var totalItem = Math.max(1, Number(item.cotas) || 1);
        var qtd = Number(p.cotas) || 1;
        return '<tr>' +
          '<td><strong>' + escapar(p.presente) + '</strong></td>' +
          '<td style="white-space:nowrap">' +
            (totalItem > 1 ? qtd + ' de ' + totalItem : '&mdash;') + '</td>' +
          '<td style="white-space:nowrap">' + moeda.format(Number(p.valor) || 0) + '</td>' +
          '<td>' + escapar(p.nome) + '</td>' +
          '<td>' + escapar(p.mensagem || '—') + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(p.reservadoEm) + '</td>' +
          '<td>' + (p.pago
              ? '<span class="etiqueta etiqueta--pago">Recebido</span>'
              : '<button class="mini mini--forte" data-pago="' + escapar(p._item) +
                '" data-contrib="' + escapar(p._id) + '">Confirmar recebimento</button>') + '</td>' +
          '<td><button class="mini mini--perigo" data-liberar="' + escapar(p._item) +
            '" data-contrib="' + escapar(p._id) + '">Devolver à lista</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="2">Total</td><td>' + moeda.format(soma) +
      '</td><td colspan="5">' + moeda.format(recebido) + ' já confirmado no extrato</td></tr></tfoot></table>');
  }

  /* ---------- EDITAR A LISTA DE PRESENTES ---------- */
  function pintarCatalogo() {
    var itens = itensCatalogo();

    if (!catalogoPublicado()) {
      $('#conteudo-aba').innerHTML =
        '<div class="bloco" style="text-align:center">' +
          '<h2>A lista ainda não foi publicada</h2>' +
          '<p class="bloco__sub">Hoje o site mostra a lista de exemplo que veio nos arquivos (' +
            (C.presentes.itens || []).length + ' itens). ' +
            'Publique essa lista no banco para poder editar tudo por aqui.</p>' +
          '<button class="botao" id="importar">Publicar a lista de exemplo</button>' +
          '<p class="campo__ajuda" style="margin-top:1rem">Depois disso, esta tela passa a mandar no que aparece no site.</p>' +
        '</div>';
      $('#importar').addEventListener('click', importarLista);
      return;
    }

    if (busca) {
      itens = itens.filter(function (i) {
        return (String(i.nome) + ' ' + String(i.categoria)).toLowerCase().indexOf(busca) !== -1;
      });
    }
    if (!itens.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhum item encontrado.'));

    $('#conteudo-aba').innerHTML = caixaTabela(
      '<table><thead><tr>' +
        '<th></th><th>Presente</th><th>Categoria</th><th>Valor</th><th>Cotas</th><th>Situação</th><th>No site</th><th></th>' +
      '</tr></thead><tbody>' +
      itens.map(function (i) {
        var foto = estado.imagens[i.id] || i.imagem || '';
        var total = Math.max(1, Number(i.cotas) || 1);
        var tomadas = cotasTomadas(i.id);
        var quem = contribuicoesDe(i.id).map(function (c) { return c.nome; });
        return '<tr>' +
          '<td>' + (foto
            ? '<img src="' + escapar(foto) + '" alt="" style="width:52px;height:39px;object-fit:cover;border-radius:2px">'
            : '<span style="color:var(--cor-borda)">—</span>') + '</td>' +
          '<td><strong>' + escapar(i.nome) + '</strong>' +
            (i.descricao ? '<br><span style="color:var(--cor-texto-suave);font-size:.82rem">' +
                           escapar(i.descricao) + '</span>' : '') + '</td>' +
          '<td>' + escapar(i.categoria || '—') + '</td>' +
          '<td style="white-space:nowrap">' +
            (Number(i.valor) > 0 ? moeda.format(i.valor) : 'Valor livre') +
            (total > 1 ? '<br><span style="color:var(--cor-texto-suave);font-size:.8rem">' +
                         moeda.format(Number(i.valor) / total) + ' por cota</span>' : '') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<input type="number" class="cota-inline" data-cotas-de="' + escapar(i.id) + '" ' +
              'min="1" max="50" step="1" value="' + total + '" aria-label="Cotas de ' + escapar(i.nome) + '">' +
            (total > 1
              ? '<br><span style="color:var(--cor-texto-suave);font-size:.78rem">' +
                tomadas + ' de ' + total + ' preenchidas</span>'
              : '<br><span style="color:var(--cor-texto-suave);font-size:.78rem">inteiro</span>') +
          '</td>' +
          '<td>' + (quem.length
              ? '<span class="etiqueta etiqueta--sim">' + escapar(quem.join(', ')) + '</span>'
              : '<span style="color:var(--cor-texto-suave)">disponível</span>') + '</td>' +
          '<td>' + (i.ativo === false
              ? '<span class="etiqueta etiqueta--nao">Escondido</span>'
              : '<span class="etiqueta etiqueta--pago">Visível</span>') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="mini" data-editar="' + escapar(i.id) + '">Editar</button> ' +
            '<button class="mini" data-alternar="' + escapar(i.id) + '">' +
              (i.ativo === false ? 'Mostrar' : 'Esconder') + '</button> ' +
            '<button class="mini mini--perigo" data-apagar="' + escapar(i.id) + '">Excluir</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table>');
  }

  function importarLista() {
    var mapa = {};
    (C.presentes.itens || []).forEach(function (i, n) {
      mapa[i.id] = {
        nome: i.nome,
        valor: Number(i.valor) || 0,
        categoria: i.categoria || '',
        descricao: i.descricao || '',
        imagem: i.imagem || '',
        cotas: Math.max(1, Number(i.cotas) || 1),
        ordem: n,
        ativo: true
      };
    });
    DADOS.salvarCatalogo(mapa).then(function () {
      aviso('Lista publicada. Agora dá para editar por aqui.');
    }).catch(function () { aviso('Não conseguimos publicar a lista.', true); });
  }

  /* ---------- CONVIDADOS ---------- */
  function pintarConvidados() {
    if (!familiasPublicadas()) {
      $('#conteudo-aba').innerHTML =
        '<div class="bloco" style="text-align:center">' +
          '<h2>A lista de convidados ainda não foi publicada</h2>' +
          '<p class="bloco__sub">Hoje o site usa a lista que veio nos arquivos (' +
            SEMENTE.length + (SEMENTE.length === 1 ? ' família' : ' famílias') + '). ' +
            'Publique no banco para poder adicionar e editar por aqui.</p>' +
          '<button class="botao" id="importar-familias">Publicar a lista atual</button>' +
          '<p class="campo__ajuda" style="margin-top:1rem">Depois disso, esta tela passa a mandar em quem consegue confirmar presença.</p>' +
        '</div>';
      $('#importar-familias').addEventListener('click', importarFamilias);
      return;
    }

    var lista = LISTA.slice();
    if (busca) {
      lista = lista.filter(function (f) {
        var txt = (rotuloFamilia(f) + ' ' +
                   pessoasDaFamilia(f).map(function (p) { return p.nome; }).join(' ')).toLowerCase();
        return txt.indexOf(busca) !== -1;
      });
    }
    if (!lista.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhuma família encontrada.'));

    var t = contarPessoas();

    $('#conteudo-aba').innerHTML =
      '<div class="bloco" style="padding:1rem 1.3rem;margin-bottom:1rem">' +
        '<strong style="font-family:var(--fonte-titulo);font-size:1.3rem">' + t.total + '</strong> ' +
        'convidados em ' + LISTA.length + (LISTA.length === 1 ? ' família' : ' famílias') +
        ' &middot; <strong>' + t.adultos + '</strong> adultos e <strong>' + t.criancas + '</strong> crianças' +
      '</div>' +
      caixaTabela(
      '<table><thead><tr>' +
        '<th>Família</th><th>Pessoas</th><th>Adultos</th><th>Crianças</th><th>Situação</th><th></th>' +
      '</tr></thead><tbody>' +
      lista.map(function (f) {
        var pessoas = pessoasDaFamilia(f);
        var ad = pessoas.filter(function (p) { return !p.crianca; }).length;
        var cr = pessoas.length - ad;
        var r = estado.confirmacoes[f.id];
        return '<tr>' +
          '<td><strong>' + escapar(rotuloFamilia(f)) + '</strong></td>' +
          '<td>' + pessoas.map(function (p) {
              return escapar(p.nome) + (p.crianca ? '<span class="pilula">criança</span>' : '');
            }).join('<br>') + '</td>' +
          '<td>' + ad + '</td>' +
          '<td>' + cr + '</td>' +
          '<td>' + (r ? '<span class="etiqueta etiqueta--sim">Respondeu</span>'
                      : '<span class="etiqueta etiqueta--espera">Aguardando</span>') + '</td>' +
          '<td><button class="mini" data-editar-familia="' + escapar(f.id) + '">Editar</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>');
  }

  function importarFamilias() {
    var mapa = {};
    SEMENTE.forEach(function (f, n) {
      mapa[f.id] = {
        rotulo: f.rotulo || '',
        ordem: n,
        pessoas: pessoasDaFamilia(f).map(function (p) {
          return { nome: p.nome, crianca: !!p.crianca };
        })
      };
    });
    DADOS.salvarFamilias(mapa).then(function () {
      aviso('Lista publicada. Agora dá para editar por aqui.');
    }).catch(function () { aviso('Não conseguimos publicar a lista.', true); });
  }

  /* ============================================================
     TEXTOS DO SITE
     ------------------------------------------------------------
     Nossa história, linha do tempo, informações úteis e o FAQ.
     Mesma lógica do catálogo: enquanto nada foi publicado, o site
     usa o que veio no conteudo.js; depois, manda o que está aqui.
     ============================================================ */

  /* os mesmos desenhos que o site usa nos cartões */
  var ICONES = {
    traje:      '<path d="M8 3l4 4 4-4 5 3v14H3V6l5-3z"/><path d="M12 7v14"/>',
    hospedagem: '<path d="M3 20V9l9-5 9 5v11"/><path d="M9 20v-6h6v6"/>',
    transporte: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M3 11h18M7 17v2M17 17v2"/>',
    criancas:   '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"/>',
    presente:   '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/>' +
                '<path d="M12 8S10 3 7.5 3.8 8.5 8 12 8zM12 8s2-5 4.5-4.2S15.5 8 12 8z"/>',
    coracao:    '<path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6C19 15.4 12 20 12 20z"/>',
    local:      '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'
  };
  var NOMES_ICONE = {
    traje: 'Traje', hospedagem: 'Hospedagem', transporte: 'Transporte',
    criancas: 'Crianças', presente: 'Presente', coracao: 'Coração', local: 'Local'
  };
  function svgIcone(nome) {
    return '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           (ICONES[nome] || ICONES.coracao) + '</svg>';
  }

  /* Cada seção editável, descrita num lugar só. */
  var SECOES = {
    momentos: {
      nome: 'Linha do tempo',
      sub: 'Os momentos de vocês, na ordem em que aparecem embaixo de "Nossa história".',
      botao: '+ Novo momento',
      vazio: 'Nenhum momento na linha do tempo.',
      singular: 'momento',
      temIcone: false,
      a: { chave: 'data',   rotulo: 'Quando', ajuda: 'Ex.: 2019 · Verão de 2021 · Dezembro de 2024. Pode deixar vazio.' },
      b: { chave: 'titulo', rotulo: 'Título' },
      c: { chave: 'texto',  rotulo: 'Texto' },
      semente: function () { return (C.historia && C.historia.momentos) || []; }
    },
    informacoes: {
      nome: 'Informações úteis',
      sub: 'Os cartões com traje, hospedagem, como chegar e o que mais vocês quiserem avisar.',
      botao: '+ Nova informação',
      vazio: 'Nenhuma informação cadastrada.',
      singular: 'cartão',
      temIcone: true,
      b: { chave: 'titulo', rotulo: 'Título' },
      c: { chave: 'texto',  rotulo: 'Texto' },
      semente: function () { return C.informacoes || []; }
    },
    faq: {
      nome: 'Perguntas frequentes',
      sub: 'Aparecem no fim do site, cada uma abrindo ao clicar.',
      botao: '+ Nova pergunta',
      vazio: 'Nenhuma pergunta cadastrada.',
      singular: 'pergunta',
      temIcone: false,
      b: { chave: 'p', rotulo: 'Pergunta' },
      c: { chave: 'r', rotulo: 'Resposta' },
      semente: function () { return C.faq || []; }
    }
  };

  function textosPublicados() { return Object.keys(estado.textos || {}).length > 0; }

  function itensSecao(secao) {
    var mapa = (estado.textos || {})[secao] || {};
    return Object.keys(mapa)
      .map(function (k) { return Object.assign({ _id: k }, mapa[k]); })
      .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }

  function historiaEmUso() {
    var h = (estado.textos || {}).historia;
    if (h && h.titulo != null) return h;
    return C.historia || { titulo: '', texto: '' };
  }

  function fichaHtml(secao, x, i, total) {
    var s = SECOES[secao];
    var olho = s.a ? x[s.a.chave] : '';
    return '<div class="ficha">' +
      (s.temIcone ? '<span class="ficha__icone">' + svgIcone(x.icone) + '</span>' : '') +
      '<div class="ficha__corpo">' +
        (olho ? '<span class="ficha__olho">' + escapar(olho) + '</span>' : '') +
        '<strong>' + escapar(x[s.b.chave] || '(sem título)') + '</strong>' +
        '<p>' + escapar(x[s.c.chave] || '') + '</p>' +
      '</div>' +
      '<div class="ficha__acoes">' +
        '<button class="ficha__mover" data-mover="' + escapar(secao) + '" data-id="' + escapar(x._id) +
          '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
        '<button class="ficha__mover" data-mover="' + escapar(secao) + '" data-id="' + escapar(x._id) +
          '" data-dir="1" aria-label="Descer"' + (i === total - 1 ? ' disabled' : '') + '>&darr;</button>' +
        '<button class="mini" data-editar-texto="' + escapar(secao) + '" data-id="' + escapar(x._id) + '">Editar</button>' +
      '</div>' +
    '</div>';
  }

  function blocoSecao(secao) {
    var s = SECOES[secao];
    var lista = itensSecao(secao);
    return '<div class="bloco">' +
      '<div class="bloco__acao">' +
        '<div>' +
          '<h2>' + escapar(s.nome) + '</h2>' +
          '<p class="bloco__sub">' + escapar(s.sub) + '</p>' +
        '</div>' +
        '<button class="mini mini--forte" data-novo-texto="' + escapar(secao) + '">' + escapar(s.botao) + '</button>' +
      '</div>' +
      (lista.length
        ? '<div class="fichas">' + lista.map(function (x, i) {
            return fichaHtml(secao, x, i, lista.length);
          }).join('') + '</div>'
        : '<p class="vazio">' + escapar(s.vazio) + '</p>') +
    '</div>';
  }

  function pintarTextos() {
    if (!textosPublicados()) {
      $('#conteudo-aba').innerHTML =
        '<div class="bloco" style="text-align:center">' +
          '<h2>Os textos ainda não foram publicados</h2>' +
          '<p class="bloco__sub">Hoje o site mostra o que veio nos arquivos: a nossa história, ' +
            ((C.historia && C.historia.momentos) || []).length + ' momentos na linha do tempo, ' +
            (C.informacoes || []).length + ' informações úteis e ' +
            (C.faq || []).length + ' perguntas frequentes.<br>' +
            'Publique no banco para poder escrever tudo por aqui.</p>' +
          '<button class="botao" id="importar-textos">Publicar os textos atuais</button>' +
          '<p class="campo__ajuda" style="margin-top:1rem">Depois disso, esta tela passa a mandar no que aparece no site.</p>' +
        '</div>';
      $('#importar-textos').addEventListener('click', importarTextos);
      return;
    }

    var h = historiaEmUso();
    $('#conteudo-aba').innerHTML =
      '<form class="bloco" id="form-historia">' +
        '<h2>Nossa história</h2>' +
        '<p class="bloco__sub">O título da seção e o parágrafo de abertura. ' +
          'É o trecho que os convidados mais leem.</p>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="hist-titulo">Título da seção</label>' +
          '<input type="text" id="hist-titulo" value="' + escapar(h.titulo || '') + '" ' +
            'placeholder="Nossa história">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="hist-texto">Texto de abertura</label>' +
          '<textarea id="hist-texto" rows="5">' + escapar(h.texto || '') + '</textarea>' +
          '<p class="campo__ajuda">Deixe título e texto vazios para esconder a seção inteira do site.</p>' +
        '</div>' +
        '<button type="submit" class="botao">Salvar nossa história</button>' +
      '</form>' +
      blocoSecao('momentos') +
      blocoSecao('informacoes') +
      blocoSecao('faq');

    $('#form-historia').addEventListener('submit', function (e) {
      e.preventDefault();
      var b = this.querySelector('button[type=submit]');
      b.disabled = true; b.textContent = 'Salvando...';
      DADOS.salvarBlocoTexto('historia', {
        titulo: $('#hist-titulo').value.trim(),
        texto:  $('#hist-texto').value.trim()
      })
        .then(function () { aviso('Nossa história atualizada. Já vale no site.'); })
        .catch(function (err) { aviso(explicarErro(err), true); })
        .finally(function () { b.disabled = false; b.textContent = 'Salvar nossa história'; });
    });
  }

  function importarTextos() {
    var mapa = {
      historia: {
        titulo: (C.historia && C.historia.titulo) || 'Nossa história',
        texto:  (C.historia && C.historia.texto) || ''
      },
      momentos: {}, informacoes: {}, faq: {}
    };
    ((C.historia && C.historia.momentos) || []).forEach(function (m, n) {
      mapa.momentos['m' + n] = {
        data: m.data || '', titulo: m.titulo || '', texto: m.texto || '', ordem: n
      };
    });
    (C.informacoes || []).forEach(function (i, n) {
      mapa.informacoes['i' + n] = {
        icone: i.icone || 'coracao', titulo: i.titulo || '', texto: i.texto || '', ordem: n
      };
    });
    (C.faq || []).forEach(function (f, n) {
      mapa.faq['q' + n] = { p: f.p || '', r: f.r || '', ordem: n };
    });

    DADOS.salvarTextos(mapa)
      .then(function () { aviso('Textos publicados. Agora dá para escrever tudo por aqui.'); })
      .catch(function (err) { aviso(explicarErro(err), true); });
  }

  /* ---------- janela de edição de texto ---------- */
  var janelaTexto = $('#janela-texto');
  var textoEditando = null;      /* { secao, id } ou { secao, id: null } */

  function fecharTexto() {
    janelaTexto.classList.remove('janela--aberta');
    setTimeout(function () { janelaTexto.hidden = true; }, 300);
    document.body.style.overflow = '';
  }
  $('#texto-fechar').addEventListener('click', fecharTexto);
  janelaTexto.addEventListener('click', function (e) { if (e.target === janelaTexto) fecharTexto(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !janelaTexto.hidden) fecharTexto();
  });

  function abrirTexto(secao, id) {
    var s = SECOES[secao];
    if (!s) return;
    textoEditando = { secao: secao, id: id || null };
    var x = id ? (((estado.textos || {})[secao] || {})[id] || {}) : {};

    $('#texto-janela-titulo').textContent = (id ? 'Editar ' : 'Novo(a) ') + s.singular;
    $('#texto-janela-sub').textContent = s.sub;

    /* ícone */
    $('#campo-icone').classList.toggle('oculto', !s.temIcone);
    if (s.temIcone) {
      var atual = x.icone || 'coracao';
      $('#grade-icones').innerHTML = Object.keys(ICONES).map(function (k) {
        return '<label class="escolha-icone">' +
          '<input type="radio" name="icone" value="' + k + '"' + (k === atual ? ' checked' : '') + '>' +
          svgIcone(k) + '<span>' + escapar(NOMES_ICONE[k]) + '</span></label>';
      }).join('');
    }

    /* campo A (opcional) */
    $('#campo-a').classList.toggle('oculto', !s.a);
    if (s.a) {
      $('#rotulo-a').textContent = s.a.rotulo;
      $('#texto-a').value = x[s.a.chave] || '';
      $('#ajuda-a').textContent = s.a.ajuda || '';
      $('#ajuda-a').classList.toggle('oculto', !s.a.ajuda);
    }

    $('#rotulo-b').textContent = s.b.rotulo;
    $('#texto-b').value = x[s.b.chave] || '';
    $('#rotulo-c').textContent = s.c.rotulo;
    $('#texto-c').value = x[s.c.chave] || '';

    $('#excluir-texto').classList.toggle('oculto', !id);
    $('#excluir-texto').textContent = 'Excluir este(a) ' + s.singular;

    janelaTexto.hidden = false;
    requestAnimationFrame(function () { janelaTexto.classList.add('janela--aberta'); });
    document.body.style.overflow = 'hidden';
    (s.a ? $('#texto-a') : $('#texto-b')).focus();
  }

  $('#form-texto').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!textoEditando) return;
    var secao = textoEditando.secao, s = SECOES[secao];

    var titulo = $('#texto-b').value.trim();
    if (titulo.length < 2) return aviso('Escreva o ' + s.b.rotulo.toLowerCase() + '.', true);

    var campos = {};
    if (s.a) campos[s.a.chave] = $('#texto-a').value.trim();
    campos[s.b.chave] = titulo;
    campos[s.c.chave] = $('#texto-c').value.trim();
    if (s.temIcone) {
      var marcado = $('input[name=icone]:checked', $('#grade-icones'));
      campos.icone = marcado ? marcado.value : 'coracao';
    }

    var id = textoEditando.id;
    if (!id) {
      id = secao.charAt(0) + Date.now().toString(36);
      var ultimos = itensSecao(secao);
      campos.ordem = ultimos.length ? (Number(ultimos[ultimos.length - 1].ordem) || 0) + 1 : 0;
    }

    var b = this.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Salvando...';

    DADOS.salvarItemTexto(secao, id, campos)
      .then(function () {
        aviso(textoEditando.id ? 'Atualizado. Já vale no site.' : 'Adicionado ao site.');
        fecharTexto();
      })
      .catch(function (err) { aviso(explicarErro(err), true); })
      .finally(function () { b.disabled = false; b.textContent = 'Salvar'; });
  });

  $('#excluir-texto').addEventListener('click', function () {
    if (!textoEditando || !textoEditando.id) return;
    var s = SECOES[textoEditando.secao];
    perguntar('Excluir este(a) ' + s.singular + ' do site? Isso não pode ser desfeito.', 'Excluir')
      .then(function (sim) {
        if (!sim) return;
        DADOS.salvarItemTexto(textoEditando.secao, textoEditando.id, null)
          .then(function () { aviso('Excluído do site.'); fecharTexto(); })
          .catch(function (err) { aviso(explicarErro(err), true); });
      });
  });

  /* troca a posição de dois itens da mesma seção */
  function moverTexto(secao, id, dir) {
    var lista = itensSecao(secao);
    var i = -1;
    lista.forEach(function (x, n) { if (x._id === id) i = n; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;

    /* renumera do zero: evita empates de 'ordem' vindos da importação */
    var nova = lista.slice();
    nova.splice(j, 0, nova.splice(i, 1)[0]);

    Promise.all(nova.map(function (x, n) {
      if ((Number(x.ordem) || 0) === n) return true;
      return DADOS.salvarItemTexto(secao, x._id, { ordem: n });
    })).catch(function (err) { aviso(explicarErro(err), true); });
  }

  /* ---------- PIX ---------- */
  function pixEmUso() {
    var doBanco = (estado.config && estado.config.pix) || {};
    var doArquivo = (C.presentes && C.presentes.pix) || {};
    return {
      chave: doBanco.chave || doArquivo.chave || '',
      nomeRecebedor: doBanco.nomeRecebedor || doArquivo.nomeRecebedor || '',
      cidade: doBanco.cidade || doArquivo.cidade || '',
      qrProprio: doBanco.qrProprio || '',
      doBanco: !!doBanco.chave
    };
  }

  function pintarPix() {
    if ($('#form-pix')) return;          /* já montado: não redesenha por cima */
    var p = pixEmUso();

    $('#conteudo-aba').innerHTML =
      '<form class="bloco" id="form-pix">' +
        '<h2>Sua chave PIX</h2>' +
        '<p class="bloco__sub">É para esta chave que os presentes vão. ' +
          'O site gera um código diferente para cada presente, já com o valor certo.</p>' +

        '<div class="qr-solta" id="qr-solta" tabindex="0" role="button">' +
          '<strong>Tem um print do seu QR Code?</strong>' +
          '<span>Clique, arraste o arquivo aqui, ou cole com Ctrl+V — eu leio o código e preencho tudo sozinho.</span>' +
        '</div>' +
        '<input type="file" id="qr-input" accept="image/*" hidden>' +

        '<div class="campo-pix" style="margin-top:1.4rem">' +
          '<label><span class="campo__rotulo">Chave PIX</span>' +
            '<input type="text" id="pix-chave" value="' + escapar(p.chave) + '" ' +
              'placeholder="CPF, e-mail, telefone ou chave aleatória"></label>' +
          '<label><span class="campo__rotulo">Nome do recebedor</span>' +
            '<input type="text" id="pix-nome-rec" maxlength="25" value="' + escapar(p.nomeRecebedor) + '" ' +
              'placeholder="YANNE E JULIO"></label>' +
          '<label><span class="campo__rotulo">Cidade</span>' +
            '<input type="text" id="pix-cidade" maxlength="15" value="' + escapar(p.cidade) + '" ' +
              'placeholder="PETROPOLIS"></label>' +
        '</div>' +
        '<p class="campo__ajuda">Nome até 25 e cidade até 15 caracteres, sem acento — é regra do padrão do Banco Central. ' +
          'Eu ajusto sozinho se passar.</p>' +

        '<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.2rem">' +
          '<button type="submit" class="botao">Salvar chave PIX</button>' +
          '<button type="button" class="mini" id="pix-testar">Testar com R$ 1,00</button>' +
        '</div>' +
        '<p class="campo__ajuda" id="pix-origem">' +
          (p.doBanco ? 'Em uso: a chave salva aqui no painel.'
                     : 'Em uso: a chave que está no arquivo conteudo.js. Salve aqui para o painel passar a mandar.') +
        '</p>' +
      '</form>' +

      '<div class="bloco oculto" id="bloco-teste">' +
        '<h2>Teste</h2>' +
        '<p class="bloco__sub">Leia este QR Code no app do seu banco. Tem que aparecer o seu nome e R$ 1,00. ' +
          'Não finalize o pagamento — é só para conferir.</p>' +
        '<div class="teste-pix">' +
          '<div class="teste-pix__qr" id="teste-qr"></div>' +
          '<div class="teste-pix__lado">' +
            '<textarea class="teste-pix__codigo" id="teste-codigo" readonly></textarea>' +
            '<p class="campo__ajuda" id="teste-conferido"></p>' +
          '</div>' +
        '</div>' +
      '</div>';

    montarPix();
  }

  function montarPix() {
    /* --- ler QR Code de um print --- */
    var solta = $('#qr-solta'), entrada = $('#qr-input');

    function carregarJsQR() {
      if (window.jsQR) return Promise.resolve();
      return new Promise(function (ok, erro) {
        var s = document.createElement('script');
        s.src = 'assets/js/lib/jsqr.js';          /* vai junto com o site */
        s.onload = function () { window.jsQR ? ok() : erro(); };
        s.onerror = erro;
        document.head.appendChild(s);
      });
    }

    function lerImagem(file) {
      if (!file || file.type.indexOf('image/') !== 0) return;
      aviso('Lendo o QR Code...');
      carregarJsQR().then(function () {
        var leitor = new FileReader();
        leitor.onload = function (e) {
          var img = new Image();
          img.onload = function () {
            /* reduz imagens muito grandes, mas mantém nitidez do código */
            var max = 1400;
            var escala = Math.min(1, max / Math.max(img.width, img.height));
            var cv = document.createElement('canvas');
            cv.width = Math.round(img.width * escala);
            cv.height = Math.round(img.height * escala);
            var cx = cv.getContext('2d');
            cx.drawImage(img, 0, 0, cv.width, cv.height);
            var dados = cx.getImageData(0, 0, cv.width, cv.height);
            var achado = window.jsQR(dados.data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' });

            if (!achado) {
              return aviso('Não consegui ler o QR Code nessa imagem. Tente um print mais nítido, ' +
                           'ou preencha a chave na mão abaixo.', true);
            }

            var lido = PIX.ler(achado.data);
            if (!lido || !lido.chave) {
              return aviso('Esse QR Code não parece ser um PIX. Confira se é o código de recebimento.', true);
            }

            $('#pix-chave').value = lido.chave;
            if (lido.nomeRecebedor) $('#pix-nome-rec').value = lido.nomeRecebedor;
            if (lido.cidade) $('#pix-cidade').value = lido.cidade;
            aviso('Chave lida do QR Code: ' + lido.chave + '. Confira e salve.');
          };
          img.onerror = function () { aviso('Não consegui abrir essa imagem.', true); };
          img.src = e.target.result;
        };
        leitor.readAsDataURL(file);
      }).catch(function () {
        aviso('Não consegui carregar o leitor de QR Code. Preencha a chave na mão.', true);
      });
    }

    solta.addEventListener('click', function () { entrada.click(); });
    solta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrada.click(); }
    });
    entrada.addEventListener('change', function () { lerImagem(this.files[0]); this.value = ''; });

    ['dragenter', 'dragover'].forEach(function (ev) {
      solta.addEventListener(ev, function (e) { e.preventDefault(); this.classList.add('qr-solta--sobre'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      solta.addEventListener(ev, function (e) { e.preventDefault(); this.classList.remove('qr-solta--sobre'); });
    });
    solta.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) lerImagem(e.dataTransfer.files[0]);
    });

    document.addEventListener('paste', function (e) {
      if (abaAtiva !== 'pix' || !$('#form-pix')) return;
      var itens = (e.clipboardData || {}).items || [];
      for (var i = 0; i < itens.length; i++) {
        if (itens[i].type.indexOf('image/') === 0) { lerImagem(itens[i].getAsFile()); e.preventDefault(); return; }
      }
      /* colou o código copia e cola em vez da imagem */
      var texto = (e.clipboardData || {}).getData && e.clipboardData.getData('text');
      if (texto && texto.indexOf('BR.GOV.BCB.PIX') !== -1) {
        var lido = PIX.ler(texto);
        if (lido && lido.chave) {
          $('#pix-chave').value = lido.chave;
          if (lido.nomeRecebedor) $('#pix-nome-rec').value = lido.nomeRecebedor;
          if (lido.cidade) $('#pix-cidade').value = lido.cidade;
          aviso('Chave lida do código colado: ' + lido.chave);
          e.preventDefault();
        }
      }
    });

    /* --- salvar --- */
    $('#form-pix').addEventListener('submit', function (e) {
      e.preventDefault();
      var chave = $('#pix-chave').value.trim();
      if (chave.length < 4) return aviso('Escreva a chave PIX.', true);

      var campos = {
        chave: chave,
        nomeRecebedor: $('#pix-nome-rec').value.trim(),
        cidade: $('#pix-cidade').value.trim()
      };

      var b = this.querySelector('button[type=submit]');
      b.disabled = true; b.textContent = 'Salvando...';

      DADOS.salvarConfig({ pix: campos })
        .then(function () {
          aviso('Chave PIX salva. Já vale no site.');
          $('#pix-origem').textContent = 'Em uso: a chave salva aqui no painel.';
        })
        .catch(function (err) { aviso(explicarErro(err), true); })
        .finally(function () { b.disabled = false; b.textContent = 'Salvar chave PIX'; });
    });

    /* --- testar --- */
    $('#pix-testar').addEventListener('click', function () {
      var codigo = PIX.gerar({
        chave: $('#pix-chave').value.trim(),
        nomeRecebedor: $('#pix-nome-rec').value.trim(),
        cidade: $('#pix-cidade').value.trim(),
        valor: 1,
        identificador: 'TESTE'
      });
      if (!codigo) return aviso('Preencha a chave PIX antes de testar.', true);

      $('#bloco-teste').classList.remove('oculto');
      $('#teste-codigo').value = codigo;
      var lido = PIX.ler(codigo);
      $('#teste-conferido').textContent = lido && lido.valido
        ? 'Código íntegro. Recebedor: ' + (lido.nomeRecebedor || '—') +
          ' · ' + (lido.cidade || '—') + ' · R$ 1,00'
        : 'Algo saiu errado ao montar o código.';

      $('#teste-qr').innerHTML = '';
      garantirQR().then(function () {
        new QRCode($('#teste-qr'), {
          text: codigo, width: 170, height: 170,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }).catch(function () {
        $('#teste-qr').innerHTML = '<p style="font-size:.78rem;color:var(--cor-texto-suave);padding:.8rem">' +
                                   'Use o código ao lado.</p>';
      });
      $('#bloco-teste').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* biblioteca de QR Code, sob demanda */
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

  /* ---------- RECADOS ---------- */
  function pintarRecados() {
    var lista = Object.keys(estado.recados)
      .map(function (k) { return Object.assign({ _id: k }, estado.recados[k]); })
      .sort(function (a, b) { return (b.criadoEm || 0) - (a.criadoEm || 0); });

    if (busca) {
      lista = lista.filter(function (r) {
        return (String(r.nome) + ' ' + String(r.mensagem)).toLowerCase().indexOf(busca) !== -1;
      });
    }
    if (!lista.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhum recado ainda.'));

    $('#conteudo-aba').innerHTML = caixaTabela(
      '<table><thead><tr><th>Quem</th><th>Recado</th><th>Quando</th><th>Situação</th><th></th></tr></thead><tbody>' +
      lista.map(function (r) {
        return '<tr>' +
          '<td><strong>' + escapar(r.nome) + '</strong></td>' +
          '<td>' + escapar(r.mensagem) + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(r.criadoEm) + '</td>' +
          '<td>' + (r.aprovado
              ? '<span class="etiqueta etiqueta--sim">No mural</span>'
              : '<span class="etiqueta etiqueta--espera">Aguardando</span>') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="mini' + (r.aprovado ? '' : ' mini--forte') + '" data-aprovar="' + escapar(r._id) +
              '" data-valor="' + (r.aprovado ? '0' : '1') + '">' +
              (r.aprovado ? 'Tirar do mural' : 'Aprovar') + '</button> ' +
            '<button class="mini mini--perigo" data-excluir-recado="' + escapar(r._id) + '">Excluir</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table>');
  }

  /* ============================================================
     AÇÕES DAS TABELAS
     ============================================================ */
  /* cotas editadas direto na tabela */
  $('#conteudo-aba').addEventListener('change', function (e) {
    var campo = e.target.closest('.cota-inline');
    if (!campo) return;
    var id = campo.dataset.cotasDe;
    var n = Math.min(50, Math.max(1, Math.round(Number(campo.value) || 1)));
    campo.value = n;

    var tomadas = cotasTomadas(id);
    if (n < tomadas) {
      aviso('Já foram preenchidas ' + tomadas + ' cotas. Não dá para deixar menos que isso.', true);
      campo.value = Math.max(1, Number((estado.catalogo[id] || {}).cotas) || 1);
      return;
    }

    DADOS.salvarItem(id, { cotas: n })
      .then(function () {
        var item = estado.catalogo[id] || {};
        aviso(n === 1
          ? 'Presente inteiro, sem divisão.'
          : n + ' cotas de ' + moeda.format((Number(item.valor) || 0) / n) + ' cada.');
      })
      .catch(function (err) { aviso(explicarErro(err), true); });
  });

  $('#conteudo-aba').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;

    if (d.pago) {
      DADOS.atualizarPresente(d.pago, d.contrib, { pago: true })
        .then(function () { aviso('Recebimento confirmado.'); });

    } else if (d.liberar) {
      perguntar('Devolver esta cota à lista? Ela volta a ficar disponível no site.', 'Devolver')
        .then(function (sim) {
          if (!sim) return;
          DADOS.atualizarPresente(d.liberar, d.contrib, null)
            .then(function () { aviso('Cota devolvida à lista.'); })
            .catch(function (e) { aviso(explicarErro(e), true); });
        });

    } else if (d.aprovar) {
      DADOS.atualizarRecado(d.aprovar, { aprovado: d.valor === '1' })
        .then(function () { aviso(d.valor === '1' ? 'Recado publicado no mural.' : 'Recado retirado do mural.'); });

    } else if (d.excluirRecado) {
      perguntar('Excluir este recado definitivamente?', 'Excluir').then(function (sim) {
        if (!sim) return;
        DADOS.atualizarRecado(d.excluirRecado, null)
          .then(function () { aviso('Recado excluído.'); })
          .catch(function (e) { aviso(explicarErro(e), true); });
      });

    } else if (d.excluirConf) {
      perguntar('Limpar a resposta desta família? Ela volta para "aguardando" e pode confirmar de novo.', 'Limpar')
        .then(function (sim) {
          if (!sim) return;
          DADOS.excluirConfirmacao(d.excluirConf)
            .then(function () { aviso('Resposta limpa.'); })
            .catch(function (e) { aviso(explicarErro(e), true); });
        });

    } else if (d.novoTexto) {
      abrirTexto(d.novoTexto, null);

    } else if (d.editarTexto) {
      abrirTexto(d.editarTexto, d.id);

    } else if (d.mover) {
      moverTexto(d.mover, d.id, Number(d.dir));

    } else if (d.editar) {
      abrirItem(d.editar);

    } else if (d.editarFamilia) {
      abrirFamilia(d.editarFamilia);

    } else if (d.alternar) {
      var atual = estado.catalogo[d.alternar] || {};
      DADOS.salvarItem(d.alternar, { ativo: atual.ativo === false })
        .then(function () { aviso(atual.ativo === false ? 'Item visível no site.' : 'Item escondido do site.'); });

    } else if (d.apagar) {
      var quem = contribuicoesDe(d.apagar).map(function (c) { return c.nome; });
      var texto = quem.length
        ? 'ATENÇÃO: ' + quem.join(', ') + ' já escolheu este presente. Excluir mesmo assim?'
        : 'Excluir este presente da lista? Isso não pode ser desfeito.';
      perguntar(texto, 'Excluir').then(function (sim) {
        if (!sim) return;
        DADOS.salvarItem(d.apagar, null)
          .then(function () { return DADOS.salvarImagem(d.apagar, null); })
          .then(function () { aviso('Presente excluído da lista.'); })
          .catch(function (e) { aviso(explicarErro(e), true); });
      });
    }
  });

  /* ============================================================
     EDITOR DE FOTO DO PRESENTE
     ------------------------------------------------------------
     Aceita arquivo, arrastar-e-soltar e colar print (Ctrl+V).
     A imagem é recortada em 4:3, reduzida e comprimida antes de
     ir para o banco — fica em torno de 30 KB por foto.
     ============================================================ */
  var FOTO = (function () {
    var LARG = 640, ALT = 480, QUALIDADE = 0.72;
    var canvas = $('#foto-canvas'), ctx = canvas.getContext('2d');
    var img = null, zoom = 1, offX = 0.5, offY = 0.5;
    var removida = false, arrastando = false, ultimo = null, mexeu = false;

    function estado(temFoto) {
      $('#foto-vazio').classList.toggle('oculto', temFoto);
      $('#foto-ctrl').classList.toggle('oculto', !temFoto);
      $('#foto-area').classList.toggle('foto-area--com-foto', temFoto);
      $('#foto-ajuda').textContent = temFoto
        ? 'Arraste a imagem dentro do quadro para escolher o enquadramento.'
        : 'Aceita arquivo do computador, arrastar-e-soltar ou colar um print.';
    }

    function desenhar() {
      ctx.clearRect(0, 0, LARG, ALT);
      if (!img) return;
      var escala = Math.max(LARG / img.width, ALT / img.height) * zoom;
      var w = img.width * escala, h = img.height * escala;
      var x = (LARG - w) * offX, y = (ALT - h) * offY;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, LARG, ALT);
      ctx.drawImage(img, x, y, w, h);
    }

    function carregar(src) {
      var novo = new Image();
      novo.onload = function () {
        img = novo; zoom = 1; offX = 0.5; offY = 0.5; removida = false; mexeu = true;
        $('#foto-zoom').value = 100;
        estado(true); desenhar();
      };
      novo.onerror = function () { aviso('Não consegui ler essa imagem.', true); };
      novo.src = src;
    }

    function doArquivo(file) {
      if (!file || file.type.indexOf('image/') !== 0) return;
      if (file.size > 12 * 1024 * 1024) return aviso('Imagem muito grande (máximo 12 MB).', true);
      var leitor = new FileReader();
      leitor.onload = function (e) { carregar(e.target.result); };
      leitor.readAsDataURL(file);
    }

    /* ---------- eventos ---------- */
    $('#foto-area').addEventListener('click', function (e) {
      if (!img || e.target.closest('.foto-ctrl')) $('#foto-input').click();
    });
    $('#foto-area').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#foto-input').click(); }
    });
    $('#foto-input').addEventListener('change', function () { doArquivo(this.files[0]); this.value = ''; });
    $('#foto-trocar').addEventListener('click', function (e) { e.stopPropagation(); $('#foto-input').click(); });

    $('#foto-remover').addEventListener('click', function (e) {
      e.stopPropagation();
      img = null; removida = true; mexeu = true;
      ctx.clearRect(0, 0, LARG, ALT);
      estado(false);
    });

    $('#foto-zoom').addEventListener('input', function () {
      zoom = Number(this.value) / 100; mexeu = true; desenhar();
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      $('#foto-area').addEventListener(ev, function (e) {
        e.preventDefault(); this.classList.add('foto-area--sobre');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      $('#foto-area').addEventListener(ev, function (e) {
        e.preventDefault(); this.classList.remove('foto-area--sobre');
      });
    });
    $('#foto-area').addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) doArquivo(e.dataTransfer.files[0]);
    });

    /* colar print com Ctrl+V, só com a janela do presente aberta */
    document.addEventListener('paste', function (e) {
      if ($('#janela-item').hidden) return;
      var itens = (e.clipboardData || {}).items || [];
      for (var i = 0; i < itens.length; i++) {
        if (itens[i].type.indexOf('image/') === 0) {
          doArquivo(itens[i].getAsFile());
          aviso('Print colado. Ajuste o enquadramento se quiser.');
          e.preventDefault();
          return;
        }
      }
    });

    /* arrastar para reposicionar */
    function pos(e) {
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }
    function comecar(e) {
      if (!img) return;
      arrastando = true; ultimo = pos(e);
      if (e.cancelable) e.preventDefault();
    }
    function mover(e) {
      if (!arrastando || !img) return;
      var p = pos(e), r = canvas.getBoundingClientRect();
      var escala = Math.max(LARG / img.width, ALT / img.height) * zoom;
      var folgaX = img.width * escala - LARG;
      var folgaY = img.height * escala - ALT;
      if (folgaX > 0) offX = Math.min(1, Math.max(0, offX + (p.x - ultimo.x) * (LARG / r.width) / folgaX));
      if (folgaY > 0) offY = Math.min(1, Math.max(0, offY + (p.y - ultimo.y) * (ALT / r.height) / folgaY));
      ultimo = p; mexeu = true;
      desenhar();
      if (e.cancelable) e.preventDefault();
    }
    function parar() { arrastando = false; }

    canvas.addEventListener('mousedown', comecar);
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', parar);
    canvas.addEventListener('touchstart', comecar, { passive: false });
    canvas.addEventListener('touchmove', mover, { passive: false });
    canvas.addEventListener('touchend', parar);

    return {
      /* prepara o editor ao abrir a janela */
      abrir: function (dataUrl) {
        img = null; removida = false; mexeu = false; zoom = 1; offX = 0.5; offY = 0.5;
        $('#foto-zoom').value = 100;
        ctx.clearRect(0, 0, LARG, ALT);
        if (dataUrl) {
          var atual = new Image();
          atual.onload = function () {
            img = atual; estado(true); desenhar();
            /* a foto salva já vem recortada: zoom e posição partem do padrão */
          };
          atual.src = dataUrl;
          estado(true);
        } else {
          estado(false);
        }
      },
      /* devolve: string (foto nova), null (remover) ou undefined (não mexeu) */
      resultado: function () {
        if (removida) return null;
        if (!img || !mexeu) return undefined;   /* não mexeu: mantém a foto que já estava */
        desenhar();
        return canvas.toDataURL('image/jpeg', QUALIDADE);
      }
    };
  })();

  /* ============================================================
     JANELA DE EDIÇÃO DE PRESENTE
     ============================================================ */
  var janela = $('#janela-item');
  var itemEditando = null;

  function fecharItem() {
    janela.classList.remove('janela--aberta');
    setTimeout(function () { janela.hidden = true; }, 300);
    document.body.style.overflow = '';
  }
  $('#item-fechar').addEventListener('click', fecharItem);
  janela.addEventListener('click', function (e) { if (e.target === janela) fecharItem(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !janela.hidden) fecharItem();
  });

  function abrirItem(id) {
    itemEditando = id || null;
    var i = id ? (estado.catalogo[id] || {}) : {};

    $('#item-titulo').textContent = id ? 'Editar presente' : 'Novo presente';
    $('#item-nome').value      = i.nome || '';
    $('#item-valor').value     = i.valor != null ? i.valor : '';
    $('#item-categoria').value = i.categoria || '';
    $('#item-descricao').value = i.descricao || '';
    $('#item-imagem').value    = i.imagem || '';
    $('#item-cotas').value     = Math.max(1, Number(i.cotas) || 1);
    atualizarInfoCotas();
    FOTO.abrir(id ? (estado.imagens[id] || '') : '');

    /* sugestões de categoria já usadas */
    var cats = itensCatalogo().map(function (x) { return x.categoria; })
               .filter(function (v, n, a) { return v && a.indexOf(v) === n; });
    $('#categorias').innerHTML = cats.map(function (c) {
      return '<option value="' + escapar(c) + '">';
    }).join('');

    janela.hidden = false;
    requestAnimationFrame(function () { janela.classList.add('janela--aberta'); });
    document.body.style.overflow = 'hidden';
    $('#item-nome').focus();
  }

  function atualizarInfoCotas() {
    var n = Math.max(1, Number($('#item-cotas').value) || 1);
    var v = Number($('#item-valor').value) || 0;
    $('#cotas-info').textContent = n === 1
      ? 'presente inteiro, sem divisão'
      : v > 0
        ? n + ' cotas de ' + moeda.format(v / n) + ' cada'
        : n + ' cotas';
  }
  $('#item-cotas').addEventListener('input', atualizarInfoCotas);
  $('#item-valor').addEventListener('input', atualizarInfoCotas);

  $('#novo-item').addEventListener('click', function () {
    if (!catalogoPublicado()) return aviso('Publique a lista de exemplo primeiro.', true);
    abrirItem(null);
  });

  $('#form-item').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('#item-nome').value.trim();
    if (nome.length < 2) return aviso('Escreva o nome do presente.', true);

    var campos = {
      nome: nome,
      valor: Number($('#item-valor').value) || 0,
      categoria: $('#item-categoria').value.trim(),
      descricao: $('#item-descricao').value.trim(),
      imagem: $('#item-imagem').value.trim(),
      cotas: Math.min(50, Math.max(1, Number($('#item-cotas').value) || 1)),
      ativo: true
    };

    var id = itemEditando;
    if (!id) {
      id = 'p' + Date.now().toString(36);
      campos.ordem = Date.now();
    }

    var foto = FOTO.resultado();

    var b = this.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Salvando...';

    DADOS.salvarItem(id, campos)
      .then(function () {
        if (foto === undefined) return true;          /* não mexeu na foto */
        return DADOS.salvarImagem(id, foto);          /* string ou null */
      })
      .then(function () {
        aviso(itemEditando ? 'Presente atualizado.' : 'Presente adicionado à lista.');
        fecharItem();
      })
      .catch(function (e) {
        console.error(e);
        aviso(explicarErro(e), true);
      })
      .finally(function () { b.disabled = false; b.textContent = 'Salvar presente'; });
  });

  /* ============================================================
     JANELA DE EDIÇÃO DE FAMÍLIA
     ============================================================ */
  var janelaFam = $('#janela-familia');
  var familiaEditando = null;

  function fecharFamilia() {
    janelaFam.classList.remove('janela--aberta');
    setTimeout(function () { janelaFam.hidden = true; }, 300);
    document.body.style.overflow = '';
  }
  $('#familia-fechar').addEventListener('click', fecharFamilia);
  janelaFam.addEventListener('click', function (e) { if (e.target === janelaFam) fecharFamilia(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !janelaFam.hidden) fecharFamilia();
  });

  function linhaPessoa(nome, crianca) {
    var div = document.createElement('div');
    div.className = 'linha-pessoa';
    div.innerHTML =
      '<input type="text" class="p-nome" placeholder="Nome da pessoa" value="' + escapar(nome || '') + '">' +
      '<label class="chip-crianca"><input type="checkbox" class="p-crianca"' +
        (crianca ? ' checked' : '') + '> criança</label>' +
      '<button type="button" class="tirar-pessoa" aria-label="Remover pessoa">&times;</button>';
    div.querySelector('.tirar-pessoa').addEventListener('click', function () {
      if ($$('.linha-pessoa').length > 1) div.remove();
      else aviso('A família precisa de pelo menos uma pessoa.', true);
    });
    return div;
  }

  function abrirFamilia(id) {
    familiaEditando = id || null;
    var fam = id ? (Object.assign({ id: id }, estado.familias[id] || {})) : { pessoas: [] };

    $('#familia-janela-titulo').textContent = id ? 'Editar família' : 'Nova família';
    $('#familia-rotulo').value = fam.rotulo || '';
    $('#excluir-familia').classList.toggle('oculto', !id);

    var editor = $('#editor-pessoas');
    editor.innerHTML = '';
    var pessoas = pessoasDaFamilia(fam);
    if (!pessoas.length) pessoas = [{ nome: '' }];
    pessoas.forEach(function (p) { editor.appendChild(linhaPessoa(p.nome, p.crianca)); });

    janelaFam.hidden = false;
    requestAnimationFrame(function () { janelaFam.classList.add('janela--aberta'); });
    document.body.style.overflow = 'hidden';
    $('.p-nome', editor).focus();
  }

  $('#add-pessoa').addEventListener('click', function () {
    var editor = $('#editor-pessoas');
    var nova = linhaPessoa('', false);
    editor.appendChild(nova);
    nova.querySelector('.p-nome').focus();
  });

  $('#nova-familia').addEventListener('click', function () {
    if (!familiasPublicadas()) return aviso('Publique a lista atual primeiro.', true);
    abrirFamilia(null);
  });

  $('#form-familia').addEventListener('submit', function (e) {
    e.preventDefault();

    var pessoas = $$('.linha-pessoa').map(function (l) {
      return {
        nome: l.querySelector('.p-nome').value.trim(),
        crianca: l.querySelector('.p-crianca').checked
      };
    }).filter(function (p) { return p.nome.length >= 2; });

    if (!pessoas.length) return aviso('Escreva o nome de pelo menos uma pessoa.', true);

    var id = familiaEditando;
    var antiga = id ? (estado.familias[id] || {}) : {};
    if (!id) {
      id = 'f' + Date.now().toString(36);
    }

    var dados = {
      rotulo: $('#familia-rotulo').value.trim(),
      ordem: antiga.ordem != null ? antiga.ordem : Date.now(),
      pessoas: pessoas
    };

    DADOS.salvarFamilia(id, dados).then(function () {
      aviso(familiaEditando ? 'Família atualizada.' : 'Família adicionada à lista.');
      fecharFamilia();
    }).catch(function (e) { aviso(explicarErro(e), true); });
  });

  $('#excluir-familia').addEventListener('click', function () {
    if (!familiaEditando) return;
    var temResposta = !!estado.confirmacoes[familiaEditando];
    var texto = temResposta
      ? 'ATENÇÃO: esta família já confirmou presença. Excluir apaga a família da lista (a resposta continua no banco). Continuar?'
      : 'Excluir esta família da lista de convidados?';
    perguntar(texto, 'Excluir').then(function (sim) {
      if (!sim) return;
      DADOS.salvarFamilia(familiaEditando, null)
        .then(function () { aviso('Família excluída.'); fecharFamilia(); })
        .catch(function (e) { aviso(explicarErro(e), true); });
    });
  });

  /* ============================================================
     EXPORTAR CSV
     ============================================================ */
  $('#exportar').addEventListener('click', function () {
    var linhas, nome;

    if (abaAtiva === 'confirmacoes') {
      nome = 'confirmacoes';
      linhas = [['Familia', 'Nome', 'Tipo', 'Situacao', 'Telefone', 'Restricao', 'Recado', 'Respondeu em']];
      LISTA.forEach(function (fam) {
        var r = estado.confirmacoes[fam.id];
        var rotulo = rotuloFamilia(fam);
        pessoasDaFamilia(fam).forEach(function (p) {
          var resp = r && (r.pessoas || []).filter(function (x) { return x.nome === p.nome; })[0];
          linhas.push([
            rotulo, p.nome,
            !r ? 'Aguardando' : (resp && resp.vai ? 'Vai' : 'Nao vai'),
            r ? r.telefone : '', r ? r.restricao : '', r ? r.mensagem : '',
            r ? dataHora(r.atualizadoEm) : ''
          ]);
        });
      });

    } else if (abaAtiva === 'presentes') {
      nome = 'presentes';
      linhas = [['Presente', 'Cotas', 'Valor', 'Quem deu', 'Mensagem', 'Escolhido em', 'Recebido']];
      todasContribuicoes().forEach(function (p) {
        linhas.push([p.presente, Number(p.cotas) || 1, Number(p.valor) || 0, p.nome, p.mensagem,
                     dataHora(p.reservadoEm), p.pago ? 'Sim' : 'Nao']);
      });

    } else {
      nome = 'recados';
      linhas = [['Quem', 'Recado', 'Quando', 'No mural']];
      Object.keys(estado.recados).forEach(function (k) {
        var r = estado.recados[k];
        linhas.push([r.nome, r.mensagem, dataHora(r.criadoEm), r.aprovado ? 'Sim' : 'Nao']);
      });
    }

    var csv = '﻿' + linhas.map(function (l) {
      return l.map(function (celula) {
        return '"' + String(celula == null ? '' : celula).replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\r\n');

    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = nome + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

})();
