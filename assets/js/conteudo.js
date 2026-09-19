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

  /* ---------- ÁREA DOS NOIVOS ----------
     A senha NÃO fica aqui: quem valida é o Firebase.
     Este e-mail é o do usuário que você criou no Firebase
     (Authentication › Users). A senha desse usuário é a senha
     que vocês digitam na tela de entrada do painel.            */
  painel: {
    email: 'noivos@yanneejulio.com'          // TROCAR pelo e-mail criado no Firebase
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
  cidade: 'Itaipava, Petrópolis — RJ',

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

  /* ---------- CERIMÔNIA E FESTA ----------
     Cerimônia e recepção acontecem no mesmo endereço.
     CONFERIR os horários abaixo — ainda são estimativas.        */
  eventos: [
    {
      tipo: 'Cerimônia',
      horario: '16h00',                                  // CONFERIR
      local: 'Casa do Lago | Enfesta',
      endereco: 'BR-040, Km 69 — Itaipava, Petrópolis/RJ · CEP 25665-060',
      observacao: 'Depois da antiga fábrica de café solúvel. ' +
                  'Pedimos a gentileza de chegar 30 minutos antes.',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Casa+do+Lago+Enfesta+BR-040+Km+69+Itaipava+Petr%C3%B3polis+RJ'
    },
    {
      tipo: 'Recepção',
      horario: '18h00',                                  // CONFERIR
      local: 'Casa do Lago | Enfesta',
      endereco: 'No mesmo endereço, logo após a cerimônia — sem deslocamento.',
      observacao: 'Estacionamento no local.',            // CONFERIR
      mapa: ''
    }
  ],

  /* ---------- INFORMAÇÕES PRÁTICAS ---------- */
  informacoes: [
    { icone: 'traje',      titulo: 'Traje',       texto: 'Esporte fino. Evitem branco e off-white — cores reservadas à noiva.' },
    { icone: 'hospedagem', titulo: 'Onde ficar',  texto: 'Itaipava e o centro de Petrópolis têm boas pousadas a poucos minutos do local. Em breve deixamos aqui algumas sugestões com desconto.' },   // CONFERIR
    { icone: 'transporte', titulo: 'Como chegar', texto: 'Cerca de 1h20 saindo do Rio pela BR-040, na altura do Km 69. A serra costuma ter neblina no fim da tarde — vá com calma e saia com folga.' },
    { icone: 'criancas',   titulo: 'Crianças',    texto: 'Teremos espaço kids com recreação durante toda a festa.' }
  ],

  /* ---------- CONFIRMAÇÃO DE PRESENÇA ---------- */
  rsvp: {
    titulo: 'Confirme sua presença',
    texto: 'Procure seu nome na lista de convidados e confirme por você e por quem vem com você. ' +
           'Se algo mudar, é só voltar aqui e confirmar de novo.',
    prazo: '1º de outubro de 2027'
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
    { p: 'Tem estacionamento?', r: 'Sim, no próprio local.' },
    { p: 'Preciso me deslocar entre a cerimônia e a festa?', r: 'Não. Tudo acontece na Casa do Lago, em Itaipava — a festa começa logo depois da cerimônia.' },
    { p: 'Faz frio em Petrópolis?', r: 'Em novembro as noites na serra ficam frescas. Vale levar um casaco leve, principalmente se a cerimônia for ao ar livre.' },
    { p: 'Posso tirar fotos durante a cerimônia?', r: 'Pedimos que a cerimônia seja sem celulares — temos fotógrafo. Na festa, fotografem à vontade!' }
  ],

  /* ---------- CONTATO ---------- */
  contato: {
    texto: 'Ficou com alguma dúvida? Fale com a gente.',
    whatsapp: '5531999999999',       // TROCAR — só números, com 55 e DDD. '' esconde o botão
    email: 'contato@exemplo.com.br'  // TROCAR — '' esconde o botão
  }
};
