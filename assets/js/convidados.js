/* ============================================================
   LISTA DE CONVIDADOS
   ------------------------------------------------------------
   O convidado digita o nome no site, se encontra nesta lista e
   confirma a presença de toda a família de uma vez.

   COMO ADICIONAR UMA FAMÍLIA
   --------------------------
   Copie um bloco, mude o `id` (não pode repetir) e escreva os
   nomes. O `id` é o que identifica a família no banco de dados —
   depois que o convite for enviado, NÃO mude ids já existentes,
   senão a confirmação que a família já fez se perde.

   `crianca: true` marca quem é criança — a contagem de adultos e
   crianças aparece separada no painel, para fechar com o buffet.

   `apelidos` é opcional: nomes alternativos que também encontram
   aquela pessoa na busca. Útil para quem é conhecido por outro
   nome ("Bia" para Beatriz, "Tia Zica" para Maria José).

   Acentos não importam na busca: quem digitar "erika" acha
   "Érika". Maiúsculas e minúsculas também não.
   ============================================================ */

window.CONVIDADOS = [

  {
    id: 'f01',
    pessoas: [
      { nome: 'Jane Maria' },
      { nome: 'César Romero' },
      { nome: 'Érika Dias' }
    ]
  },

  {
    id: 'f02',
    pessoas: [
      { nome: 'Gislaine Dias' },
      { nome: 'Wellington Leandro' },
      { nome: 'Maria Luiza', crianca: true },
      { nome: 'Lucca', crianca: true }
    ]
  }

  /* Modelo para copiar:

  ,{
    id: 'f03',
    pessoas: [
      { nome: 'Nome Sobrenome', apelidos: ['Apelido'] },
      { nome: 'Filho Pequeno', crianca: true }
    ]
  }

  */

];
