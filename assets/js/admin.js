/* ============================================================
   PAINEL DOS NOIVOS — confirmações, presentes e recados.
   ============================================================ */
(function () {
  'use strict';

  var C = window.CONTEUDO;
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

  /* ---------- estado ---------- */
  var estado = { confirmacoes: {}, presentes: {}, recados: {} };
  var abaAtiva = 'confirmacoes';
  var busca = '';

  /* ============================================================
     LOGIN
     ============================================================ */
  DADOS.pronto().then(function () {
    if (DADOS.modoDemo) return abrirPainel({ email: 'modo demonstração' });
    DADOS.ouvirUsuario(function (usuario) {
      if (usuario) abrirPainel(usuario);
      else {
        $('#tela-painel').classList.add('oculto');
        $('#tela-login').classList.remove('oculto');
      }
    });
  });

  $('#form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = this.querySelector('button');
    b.disabled = true; b.textContent = 'Entrando...';
    $('#erro-login').classList.add('oculto');

    DADOS.entrar($('#email').value.trim(), $('#senha').value)
      .catch(function () {
        var el = $('#erro-login');
        el.textContent = 'E-mail ou senha incorretos.';
        el.classList.remove('oculto');
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
    $('#painel-sub').textContent = usuario && usuario.email ? usuario.email : '';

    DADOS.ouvirConfirmacoes(function (d) { estado.confirmacoes = d || {}; pintar(); });
    DADOS.ouvirPresentes(function (d)    { estado.presentes    = d || {}; pintar(); });
    DADOS.ouvirRecados(function (d)      { estado.recados      = d || {}; pintar(); });
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

  /* ---------- resumo numérico ---------- */
  function pintarNumeros() {
    var conf = Object.keys(estado.confirmacoes).map(function (k) { return estado.confirmacoes[k]; });
    var vem  = conf.filter(function (c) { return c.presenca === 'sim'; });
    var pessoas = vem.reduce(function (s, c) { return s + 1 + (Number(c.quantidade) || 0); }, 0);

    var pres = Object.keys(estado.presentes).map(function (k) { return estado.presentes[k]; });
    var total = pres.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);
    var pagos = pres.filter(function (p) { return p.pago; })
                    .reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);

    var pendentes = Object.keys(estado.recados)
      .filter(function (k) { return !estado.recados[k].aprovado; }).length;

    $('#numeros').innerHTML = [
      ['Pessoas confirmadas', pessoas, true],
      ['Convites respondidos', conf.length, false],
      ['Não poderão vir', conf.length - vem.length, false],
      ['Presentes escolhidos', pres.length, false],
      ['Valor confirmado', moeda.format(pagos), false],
      ['Valor total da lista', moeda.format(total), false],
      ['Recados a aprovar', pendentes, pendentes > 0]
    ].map(function (n) {
      return '<div class="numero' + (n[2] ? ' numero--destaque' : '') + '">' +
             '<strong>' + n[1] + '</strong><span>' + n[0] + '</span></div>';
    }).join('');
  }

  /* ---------- tabelas ---------- */
  function pintar() {
    pintarNumeros();
    if (abaAtiva === 'confirmacoes') pintarConfirmacoes();
    else if (abaAtiva === 'presentes') pintarPresentes();
    else pintarRecados();
  }

  function filtrar(lista, campos) {
    if (!busca) return lista;
    return lista.filter(function (x) {
      return campos.some(function (c) {
        return String(x[c] || '').toLowerCase().indexOf(busca) !== -1;
      });
    });
  }

  function comId(obj) {
    return Object.keys(obj).map(function (k) {
      var v = Object.assign({}, obj[k]); v._id = k; return v;
    }).sort(function (a, b) { return (b.criadoEm || b.reservadoEm || 0) - (a.criadoEm || a.reservadoEm || 0); });
  }

  function pintarConfirmacoes() {
    var lista = filtrar(comId(estado.confirmacoes), ['nome', 'telefone', 'email']);
    if (!lista.length) return vazio('Nenhuma confirmação ainda.');

    $('#tabela').innerHTML =
      '<table><thead><tr>' +
        '<th>Nome</th><th>Vem?</th><th>Pessoas</th><th>Acompanhantes</th>' +
        '<th>Contato</th><th>Restrição</th><th>Recado</th><th>Quando</th><th></th>' +
      '</tr></thead><tbody>' +
      lista.map(function (c) {
        var vem = c.presenca === 'sim';
        return '<tr>' +
          '<td><strong>' + escapar(c.nome) + '</strong></td>' +
          '<td><span class="etiqueta etiqueta--' + (vem ? 'sim">Sim' : 'nao">Não') + '</span></td>' +
          '<td>' + (vem ? 1 + (Number(c.quantidade) || 0) : 0) + '</td>' +
          '<td>' + escapar((c.acompanhantes || []).join(', ') || '—') + '</td>' +
          '<td>' + escapar(c.telefone || '') + (c.email ? '<br><span style="color:var(--cor-texto-suave);font-size:.82rem">' + escapar(c.email) + '</span>' : '') + '</td>' +
          '<td>' + escapar(c.restricao || '—') + '</td>' +
          '<td>' + escapar(c.mensagem || '—') + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(c.criadoEm) + '</td>' +
          '<td><button class="mini mini--perigo" data-excluir-conf="' + escapar(c._id) + '">Excluir</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function pintarPresentes() {
    var lista = filtrar(comId(estado.presentes), ['nome', 'presente']);
    if (!lista.length) return vazio('Nenhum presente escolhido ainda.');

    $('#tabela').innerHTML =
      '<table><thead><tr>' +
        '<th>Presente</th><th>Valor</th><th>Quem</th><th>Mensagem</th><th>Quando</th><th>Pagamento</th><th></th>' +
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
              : '<button class="mini" data-pago="' + escapar(p._id) + '">Marcar recebido</button>') + '</td>' +
          '<td><button class="mini mini--perigo" data-liberar="' + escapar(p._id) + '">Devolver à lista</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function pintarRecados() {
    var lista = filtrar(comId(estado.recados), ['nome', 'mensagem']);
    if (!lista.length) return vazio('Nenhum recado ainda.');

    $('#tabela').innerHTML =
      '<table><thead><tr><th>Quem</th><th>Recado</th><th>Quando</th><th>Situação</th><th></th></tr></thead><tbody>' +
      lista.map(function (r) {
        return '<tr>' +
          '<td><strong>' + escapar(r.nome) + '</strong></td>' +
          '<td>' + escapar(r.mensagem) + '</td>' +
          '<td style="white-space:nowrap">' + dataHora(r.criadoEm) + '</td>' +
          '<td>' + (r.aprovado
              ? '<span class="etiqueta etiqueta--sim">No mural</span>'
              : '<span class="etiqueta etiqueta--nao">Aguardando</span>') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="mini" data-aprovar="' + escapar(r._id) + '" data-valor="' + (r.aprovado ? '0' : '1') + '">' +
              (r.aprovado ? 'Tirar do mural' : 'Aprovar') + '</button> ' +
            '<button class="mini mini--perigo" data-excluir-recado="' + escapar(r._id) + '">Excluir</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function vazio(texto) {
    $('#tabela').innerHTML = '<p class="vazio">' + escapar(texto) + '</p>';
  }

  /* ---------- ações das tabelas ---------- */
  $('#tabela').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;

    if (d.pago) {
      DADOS.atualizarPresente(d.pago, { pago: true }).then(function () { aviso('Pagamento confirmado.'); });
    } else if (d.liberar) {
      if (!confirm('Devolver este presente à lista? Ele volta a ficar disponível no site.')) return;
      DADOS.atualizarPresente(d.liberar, null).then(function () { aviso('Presente devolvido à lista.'); });
    } else if (d.aprovar) {
      DADOS.atualizarRecado(d.aprovar, { aprovado: d.valor === '1' })
        .then(function () { aviso(d.valor === '1' ? 'Recado publicado no mural.' : 'Recado retirado do mural.'); });
    } else if (d.excluirRecado) {
      if (!confirm('Excluir este recado definitivamente?')) return;
      DADOS.atualizarRecado(d.excluirRecado, null).then(function () { aviso('Recado excluído.'); });
    } else if (d.excluirConf) {
      if (!confirm('Excluir esta confirmação definitivamente?')) return;
      DADOS.excluirConfirmacao(d.excluirConf).then(function () { aviso('Confirmação excluída.'); });
    }
  });

  /* ---------- exportar CSV ---------- */
  $('#exportar').addEventListener('click', function () {
    var linhas, nome;

    if (abaAtiva === 'confirmacoes') {
      nome = 'confirmacoes';
      linhas = [['Nome', 'Vem', 'Pessoas', 'Acompanhantes', 'Telefone', 'E-mail', 'Restricao', 'Recado', 'Data']];
      comId(estado.confirmacoes).forEach(function (c) {
        linhas.push([
          c.nome, c.presenca === 'sim' ? 'Sim' : 'Nao',
          c.presenca === 'sim' ? 1 + (Number(c.quantidade) || 0) : 0,
          (c.acompanhantes || []).join(' | '),
          c.telefone, c.email, c.restricao, c.mensagem, dataHora(c.criadoEm)
        ]);
      });
    } else if (abaAtiva === 'presentes') {
      nome = 'presentes';
      linhas = [['Presente', 'Valor', 'Quem', 'Mensagem', 'Data', 'Recebido']];
      comId(estado.presentes).forEach(function (p) {
        linhas.push([p.presente, Number(p.valor) || 0, p.nome, p.mensagem, dataHora(p.reservadoEm), p.pago ? 'Sim' : 'Nao']);
      });
    } else {
      nome = 'recados';
      linhas = [['Quem', 'Recado', 'Data', 'No mural']];
      comId(estado.recados).forEach(function (r) {
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
