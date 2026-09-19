/* ============================================================
   GERADOR DE PIX "COPIA E COLA" (BR Code / padrão EMV do Bacen)
   ------------------------------------------------------------
   Monta o código PIX de cada presente, já com o valor preenchido.
   Não precisa mexer neste arquivo.
   ============================================================ */

window.PIX = (function () {

  /* Monta um campo no formato ID + TAMANHO + VALOR */
  function campo(id, valor) {
    var v = String(valor);
    return id + String(v.length).padStart(2, '0') + v;
  }

  /* Tira acentos, símbolos e corta no tamanho máximo permitido */
  function limpar(texto, max) {
    var t = String(texto || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
      .replace(/[^A-Za-z0-9 .\-]/g, '')                  // só caracteres seguros
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    return t.substring(0, max);
  }

  /* CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF) */
  function crc16(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= (str.charCodeAt(i) & 0xFF) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /* Identificador da transação: até 25 caracteres, sem espaço.
     '***' significa "sem identificador".                        */
  function txid(id) {
    var t = String(id || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 25);
    return t || '***';
  }

  /**
   * Gera o código PIX copia e cola.
   * @param {Object} d
   *   d.chave         chave PIX do recebedor
   *   d.nomeRecebedor nome (até 25 caracteres)
   *   d.cidade        cidade (até 15 caracteres)
   *   d.valor         valor em reais (número). 0 ou vazio = valor livre
   *   d.identificador referência do pagamento (ex.: id do presente)
   */
  function gerar(d) {
    var chave = String(d.chave || '').trim();
    if (!chave) return '';

    var conta =
      campo('00', 'BR.GOV.BCB.PIX') +
      campo('01', chave);

    var payload =
      campo('00', '01') +
      campo('26', conta) +
      campo('52', '0000') +
      campo('53', '986');

    var valor = Number(d.valor);
    if (valor > 0) payload += campo('54', valor.toFixed(2));

    payload +=
      campo('58', 'BR') +
      campo('59', limpar(d.nomeRecebedor, 25) || 'RECEBEDOR') +
      campo('60', limpar(d.cidade, 15) || 'BRASIL') +
      campo('62', campo('05', txid(d.identificador)));

    var parcial = payload + '6304';
    return parcial + crc16(parcial);
  }

  /* Confere se um código PIX está íntegro (usado nos testes) */
  function validar(codigo) {
    if (!codigo || codigo.length < 8) return false;
    var corpo = codigo.slice(0, -4);
    var informado = codigo.slice(-4).toUpperCase();
    return corpo.slice(-4) === '6304' && crc16(corpo) === informado;
  }

  return { gerar: gerar, validar: validar, crc16: crc16 };
})();
