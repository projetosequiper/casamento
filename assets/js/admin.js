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
  var estado = { confirmacoes: {}, presentes: {}, recados: {}, catalogo: {}, familias: {}, imagens: {} };
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
    if (foco && foco.classList && foco.classList.contains('cota-inline')) return;
    $('#novo-item').classList.toggle('oculto', abaAtiva !== 'catalogo');
    $('#nova-familia').classList.toggle('oculto', abaAtiva !== 'convidados');
    $('#exportar').classList.toggle('oculto',
      abaAtiva === 'resumo' || abaAtiva === 'catalogo' || abaAtiva === 'convidados');
    $('#busca').classList.toggle('oculto', abaAtiva === 'resumo');
    $('#barra-acoes').classList.toggle('oculto', abaAtiva === 'resumo');

    if (abaAtiva === 'resumo')            pintarResumo();
    else if (abaAtiva === 'confirmacoes') pintarConfirmacoes();
    else if (abaAtiva === 'presentes')    pintarPresentes();
    else if (abaAtiva === 'catalogo')     pintarCatalogo();
    else if (abaAtiva === 'convidados')   pintarConvidados();
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
