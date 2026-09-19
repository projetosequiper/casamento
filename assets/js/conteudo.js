/* ============================================================
   CONTEÚDO DO SITE — textos, datas, locais e lista de presentes.
   ------------------------------------------------------------
   Este é o arquivo do "o que está escrito". O visual fica em
   assets/css/tema.css. Edite à vontade: tudo aqui é texto simples.
   Os valores marcados com  // TROCAR  são exemplos.
   ============================================================ */

window.CONTEUDO = {

  /* ---------- OS NOIVOS ---------- */
  noivos: {
    nome1: 'Yanne',
    nome2: 'Júlio',
    conector: '&',              // pode ser 'e', '&', '♥'
    hashtag: '#YanneEJulio',    // deixe '' para esconder
    monograma: ''               // vazio = monta sozinho com as iniciais (Y & J)
  },

  /* ---------- CAPA ----------
     foto: caminho ou link de uma foto horizontal do casal.
     Vazio = capa clara, no estilo de um convite impresso.        */
  capa: { foto: '' },

  /* ---------- DATA E HORA ----------
     Formato: 'AAAA-MM-DDTHH:MM:SS-03:00'  (o -03:00 é o fuso do Brasil) */
  dataHora: '2027-11-01T16:00:00-03:00',
  dataPorExtenso: '1º de novembro de 2027',
  diaSemana: 'Segunda-feira',
  cidade: 'Cidade/UF',                     // TROCAR

  /* ---------- FRASE DE ABERTURA ---------- */
  frase: 'Vamos nos casar, e queremos você por perto.',

  /* ---------- NOSSA HISTÓRIA ----------
     Quantos momentos quiser. Para esconder a seção, deixe [] */
  historia: {
    titulo: 'Nossa história',
    texto: 'Um resumo curto de como tudo começou — dois ou três parágrafos bastam. ' +
           'Escreva do jeito de vocês; é o trecho que os convidados mais leem.',
    momentos: [
      { data: 'Ano do encontro',  titulo: 'O primeiro encontro', texto: 'Como vocês se conheceram. TROCAR' },
      { data: 'Ano da viagem',    titulo: 'A primeira viagem',   texto: 'Um momento marcante do casal. TROCAR' },
      { data: 'Ano do pedido',    titulo: 'O pedido',            texto: 'Como foi o pedido de casamento. TROCAR' }
    ]
  },

  /* ---------- CERIMÔNIA E FESTA ---------- */
  eventos: [
    {
      tipo: 'Cerimônia',
      horario: '16h00',
      local: 'Igreja Nossa Senhora do Carmo',            // TROCAR
      endereco: 'Rua Exemplo, 123 — Bairro, Cidade/UF',  // TROCAR
      observacao: 'Pedimos a gentileza de chegar 30 minutos antes.',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Igreja+Nossa+Senhora+do+Carmo'
    },
    {
      tipo: 'Recepção',
      horario: '18h30',
      local: 'Espaço Jardim das Acácias',                // TROCAR
      endereco: 'Av. Exemplo, 456 — Bairro, Cidade/UF',  // TROCAR
      observacao: 'Estacionamento no local com manobrista.',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Espaco+Jardim+das+Acacias'
    }
  ],

  /* ---------- INFORMAÇÕES PRÁTICAS ---------- */
  informacoes: [
    { icone: 'traje',      titulo: 'Traje',       texto: 'Esporte fino. Evitem branco e off-white — cores reservadas à noiva.' },
    { icone: 'hospedagem', titulo: 'Hospedagem',  texto: 'Reservamos tarifas especiais no Hotel Exemplo. Citem o nome dos noivos na reserva.' },
    { icone: 'transporte', titulo: 'Transporte',  texto: 'Haverá van saindo do hotel às 15h15 e retornando ao fim da festa.' },
    { icone: 'criancas',   titulo: 'Crianças',    texto: 'Teremos espaço kids com recreação durante toda a festa.' }
  ],

  /* ---------- CONFIRMAÇÃO DE PRESENÇA ---------- */
  rsvp: {
    titulo: 'Confirme sua presença',
    texto: 'Precisamos da sua confirmação para organizar as mesas e o buffet.',
    prazo: '1º de outubro de 2027',
    maxAcompanhantes: 4
  },

  /* ---------- LISTA DE PRESENTES ----------
     Cada presente vira um cartão. O convidado escolhe, paga via PIX
     e o item some da lista (fica marcado como "já presenteado").

     imagem: cole o link de uma foto (pode ser do próprio site da loja),
             ou deixe '' para aparecer um ícone no lugar.            */
  presentes: {
    titulo: 'Lista de presentes',
    texto: 'Sua presença já é o maior presente. Mas se quiser nos ajudar a montar o cantinho novo, ' +
           'escolha um item abaixo — o pagamento é por PIX, direto e sem taxa.',
    // Dados do PIX que recebe os presentes:
    pix: {
      chave: 'exemplo@email.com.br',     // TROCAR — CPF, e-mail, telefone ou chave aleatória
      nomeRecebedor: 'YANNE E JULIO',    // TROCAR — máx. 25 caracteres, sem acento
      cidade: 'BELO HORIZONTE'           // TROCAR — máx. 15 caracteres, sem acento
    },
    itens: [
      { id: 'p01', nome: 'Jogo de panelas',        valor: 450,  categoria: 'Cozinha',    imagem: '' },
      { id: 'p02', nome: 'Liquidificador',         valor: 280,  categoria: 'Cozinha',    imagem: '' },
      { id: 'p03', nome: 'Air fryer',              valor: 520,  categoria: 'Cozinha',    imagem: '' },
      { id: 'p04', nome: 'Jogo de taças de cristal', valor: 320, categoria: 'Mesa',      imagem: '' },
      { id: 'p05', nome: 'Aparelho de jantar',     valor: 680,  categoria: 'Mesa',       imagem: '' },
      { id: 'p06', nome: 'Jogo de lençóis king',   valor: 390,  categoria: 'Quarto',     imagem: '' },
      { id: 'p07', nome: 'Edredom',                valor: 450,  categoria: 'Quarto',     imagem: '' },
      { id: 'p08', nome: 'Jogo de toalhas',        valor: 240,  categoria: 'Banho',      imagem: '' },
      { id: 'p09', nome: 'Robô aspirador',         valor: 1200, categoria: 'Casa',       imagem: '' },
      { id: 'p10', nome: 'Ferro de passar',        valor: 180,  categoria: 'Casa',       imagem: '' },
      { id: 'p11', nome: 'Uma diária da lua de mel', valor: 600, categoria: 'Lua de mel', imagem: '' },
      { id: 'p12', nome: 'Um jantar romântico na viagem', valor: 350, categoria: 'Lua de mel', imagem: '' },
      { id: 'p13', nome: 'Um passeio de barco',    valor: 800,  categoria: 'Lua de mel', imagem: '' },
      { id: 'p14', nome: 'Contribuição livre',     valor: 0,    categoria: 'Lua de mel', imagem: '',
        descricao: 'Você escolhe o valor.' }
    ]
  },

  /* ---------- MURAL DE RECADOS ---------- */
  recados: {
    titulo: 'Deixe um recado',
    texto: 'Escreva um votinho para os noivos. Vamos ler todos, prometemos.',
    moderar: true   // true = você aprova antes de aparecer no site
  },

  /* ---------- GALERIA ----------
     Cole os links das fotos. Deixe [] para esconder a seção.        */
  galeria: {
    titulo: 'Nós dois',
    fotos: []
  },

  /* ---------- PERGUNTAS FREQUENTES ---------- */
  faq: [
    { p: 'Posso levar acompanhante?', r: 'O convite indica quantos lugares foram reservados para você. Na dúvida, é só perguntar na confirmação de presença.' },
    { p: 'Até quando confirmo presença?', r: 'Até 1º de outubro de 2027. Depois dessa data não conseguimos mais incluir no buffet.' },
    { p: 'Tem estacionamento?', r: 'Sim, com manobrista no local da recepção.' },
    { p: 'Posso tirar fotos durante a cerimônia?', r: 'Pedimos que a cerimônia seja sem celulares — temos fotógrafo. Na festa, fotografem à vontade!' }
  ],

  /* ---------- CONTATO ---------- */
  contato: {
    texto: 'Ficou com alguma dúvida? Fale com a gente.',
    whatsapp: '5531999999999',       // TROCAR — só números, com 55 e DDD. '' esconde o botão
    email: 'contato@exemplo.com.br'  // TROCAR — '' esconde o botão
  }
};
