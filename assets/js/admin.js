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
  var estado = { confirmacoes: {}, presentes: {}, recados: {}, catalogo: {}, familias: {} };
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

    var pres = Object.keys(estado.presentes).map(function (k) { return estado.presentes[k]; });
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
      var r = estado.presentes[i.id];
      if (r) { porCat[cat].dados++; porCat[cat].valorDado += Number(r.valor) || 0; }
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
    var ultimos = Object.keys(estado.presentes)
      .map(function (k) { return Object.assign({ _id: k }, estado.presentes[k]); })
      .sort(function (a, b) { return (b.reservadoEm || 0) - (a.reservadoEm || 0); })
      .slice(0, 5);

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
    var lista = Object.keys(estado.presentes)
      .map(function (k) { return Object.assign({ _id: k }, estado.presentes[k]); })
      .sort(function (a, b) { return (b.reservadoEm || 0) - (a.reservadoEm || 0); });

    if (busca) {
      lista = lista.filter(function (p) {
        return (String(p.nome) + ' ' + String(p.presente)).toLowerCase().indexOf(busca) !== -1;
      });
    }
    if (!lista.length) return ($('#conteudo-aba').innerHTML = vazio('Nenhum presente escolhido ainda.'));

    var soma = lista.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);

    $('#conteudo-aba').innerHTML = caixaTabela(
      '<table><thead><tr>' +
        '<th>Presente</th><th>Valor</th><th>Quem deu</th><th>Mensagem</th>' +
        '<th>Escolhido em</th><th>Pagamento</th><th></th>' +
      '</tr></thead><tbody>' +
      lista.map(function (p) {
        return '<tr>' +
          '<td><strong>' + escapar(p.presente) + '</strong></td>' +
          '<td style="white-space:nowrap">' + moeda.format(Number(p.valor) || 0) + '</td>' +
          '<td>' + escapar(p.nome) + '</td>' +
          '<td>' + escapar(p.mensagem || '—') + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(p.reservadoEm) + '</td>' +
          '<td>' + (p.pago
              ? '<span class="etiqueta etiqueta--pago">Recebido</span>'
              : '<button class="mini mini--forte" data-pago="' + escapar(p._id) + '">Confirmar recebimento</button>') + '</td>' +
          '<td><button class="mini mini--perigo" data-liberar="' + escapar(p._id) + '">Devolver à lista</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody><tfoot><tr><td>Total</td><td>' + moeda.format(soma) +
      '</td><td colspan="5"></td></tr></tfoot></table>');
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
        '<th>Presente</th><th>Categoria</th><th>Valor</th><th>Situação</th><th>No site</th><th></th>' +
      '</tr></thead><tbody>' +
      itens.map(function (i) {
        var dado = estado.presentes[i.id];
        return '<tr>' +
          '<td><strong>' + escapar(i.nome) + '</strong>' +
            (i.descricao ? '<br><span style="color:var(--cor-texto-suave);font-size:.82rem">' +
                           escapar(i.descricao) + '</span>' : '') + '</td>' +
          '<td>' + escapar(i.categoria || '—') + '</td>' +
          '<td style="white-space:nowrap">' +
            (Number(i.valor) > 0 ? moeda.format(i.valor) : 'Valor livre') + '</td>' +
          '<td>' + (dado
              ? '<span class="etiqueta etiqueta--sim">' + escapar(dado.nome) + '</span>'
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
  $('#conteudo-aba').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;

    if (d.pago) {
      DADOS.atualizarPresente(d.pago, { pago: true })
        .then(function () { aviso('Recebimento confirmado.'); });

    } else if (d.liberar) {
      if (!confirm('Devolver este presente à lista? Ele volta a ficar disponível no site.')) return;
      DADOS.atualizarPresente(d.liberar, null)
        .then(function () { aviso('Presente devolvido à lista.'); });

    } else if (d.aprovar) {
      DADOS.atualizarRecado(d.aprovar, { aprovado: d.valor === '1' })
        .then(function () { aviso(d.valor === '1' ? 'Recado publicado no mural.' : 'Recado retirado do mural.'); });

    } else if (d.excluirRecado) {
      if (!confirm('Excluir este recado definitivamente?')) return;
      DADOS.atualizarRecado(d.excluirRecado, null).then(function () { aviso('Recado excluído.'); });

    } else if (d.excluirConf) {
      if (!confirm('Limpar a resposta desta família? Ela volta para "aguardando" e pode confirmar de novo.')) return;
      DADOS.excluirConfirmacao(d.excluirConf).then(function () { aviso('Resposta limpa.'); });

    } else if (d.editar) {
      abrirItem(d.editar);

    } else if (d.editarFamilia) {
      abrirFamilia(d.editarFamilia);

    } else if (d.alternar) {
      var atual = estado.catalogo[d.alternar] || {};
      DADOS.salvarItem(d.alternar, { ativo: atual.ativo === false })
        .then(function () { aviso(atual.ativo === false ? 'Item visível no site.' : 'Item escondido do site.'); });

    } else if (d.apagar) {
      var dado = estado.presentes[d.apagar];
      var texto = dado
        ? 'ATENÇÃO: ' + dado.nome + ' já escolheu este presente. Excluir mesmo assim?'
        : 'Excluir este item da lista?';
      if (!confirm(texto)) return;
      DADOS.salvarItem(d.apagar, null).then(function () { aviso('Item excluído.'); });
    }
  });

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
      ativo: true
    };

    var id = itemEditando;
    if (!id) {
      id = 'p' + Date.now().toString(36);
      campos.ordem = Date.now();
    }

    DADOS.salvarItem(id, campos).then(function () {
      aviso(itemEditando ? 'Presente atualizado.' : 'Presente adicionado à lista.');
      fecharItem();
    }).catch(function () { aviso('Não conseguimos salvar.', true); });
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
    }).catch(function () { aviso('Não conseguimos salvar.', true); });
  });

  $('#excluir-familia').addEventListener('click', function () {
    if (!familiaEditando) return;
    var temResposta = !!estado.confirmacoes[familiaEditando];
    var texto = temResposta
      ? 'ATENÇÃO: esta família já confirmou presença. Excluir apaga a família da lista (a resposta continua no banco). Continuar?'
      : 'Excluir esta família da lista de convidados?';
    if (!confirm(texto)) return;
    DADOS.salvarFamilia(familiaEditando, null).then(function () {
      aviso('Família excluída.');
      fecharFamilia();
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
      linhas = [['Presente', 'Valor', 'Quem deu', 'Mensagem', 'Escolhido em', 'Recebido']];
      Object.keys(estado.presentes).forEach(function (k) {
        var p = estado.presentes[k];
        linhas.push([p.presente, Number(p.valor) || 0, p.nome, p.mensagem,
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
