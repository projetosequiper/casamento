# Site de casamento — guia completo

Site estático (GitHub Pages) com banco de dados em tempo real (Firebase).
Custo: **R$ 0,00** — só o domínio, se quiser um.

---

## O que já vem pronto

| Recurso | Onde |
|---|---|
| Capa com contagem regressiva | `index.html` |
| Nossa história (linha do tempo) | `#historia` |
| Cerimônia e recepção, com link do mapa | `#quando` |
| Informações úteis (traje, hospedagem, transporte, crianças) | `#info` |
| Confirmação de presença por lista fechada, com famílias | `#confirmar` |
| Lista de presentes com PIX, com divisão em cotas | `#presentes` |
| Mural de recados com moderação | `#recados` |
| Galeria de fotos | `#galeria` |
| Perguntas frequentes | `#faq` |
| Área dos noivos, com senha | `admin.html` (menu ⋮ do site) |

---

## Os 4 arquivos que você vai mexer

| Arquivo | Serve para |
|---|---|
| `assets/js/convidados.js` | **Lista de convidados**, organizada por família |
| `assets/js/conteudo.js` | **Textos**: nomes, datas, locais, lista de presentes, chave PIX |
| `assets/css/tema.css` | **Visual**: cores, fontes, arredondamentos, textura |
| `assets/js/firebase-config.js` | **Conexão** com o banco de dados |

Todo o resto é a "máquina" do site — não precisa abrir.

---

## Passo 1 — Testar no seu computador

Abra o `index.html` no navegador. Ele já funciona em **modo demonstração**:
tudo é clicável, mas nada é salvo de verdade (fica só no seu navegador).
Uma tarja no topo avisa que está nesse modo.

---

## Passo 2 — Criar o banco de dados (Firebase)

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
   Pode desativar o Google Analytics — não é necessário.
2. No menu lateral: **Criar** › **Realtime Database** › **Criar banco de dados**.
   - Local: `us-central1` (ou o mais próximo).
   - Comece em **modo bloqueado** (vamos colocar as regras certas no passo 4).
3. No menu lateral: **Criar** › **Authentication** › **Primeiros passos** ›
   ative o método **E-mail/senha**.
4. Ainda em Authentication, aba **Users** › **Adicionar usuário**:
   - **E-mail**: um e-mail só para isso, por exemplo `noivos@yanneejulio.com`.
     Não precisa existir de verdade — é só um identificador.
   - **Senha**: a senha que vocês vão digitar na Área dos noivos.
     Mínimo de 6 caracteres.

   Depois copie esse e-mail para `painel.email` em `assets/js/conteudo.js`.
5. Clique na engrenagem ⚙️ › **Configurações do projeto** › role até
   **Seus apps** › ícone `</>` (Web) › registre o app.
   Vai aparecer um bloco `const firebaseConfig = { ... }`.

Copie os valores desse bloco para o arquivo **`assets/js/firebase-config.js`**.

> ⚠️ Essas chaves são públicas por natureza — qualquer site Firebase as expõe.
> Quem protege os dados são as **regras** do passo 4, não as chaves.

---

## A lista de convidados

O convite não é aberto: só quem está na lista consegue confirmar. O convidado
digita o nome, se encontra na lista e confirma por toda a família de uma vez.

A lista mora em dois lugares, nessa ordem de prioridade:

1. **No banco**, editável pela aba **Convidados** da Área dos noivos —
   é o que você vai usar no dia a dia.
2. **No arquivo** `assets/js/convidados.js`, que serve de ponto de partida
   enquanto o banco estiver vazio.

Na primeira vez, entre na aba Convidados e clique em **Publicar a lista
atual**. Isso copia o arquivo para o banco. Dali em diante, tudo é feito pelo
painel: adicionar família, adicionar pessoa, marcar quem é criança, corrigir
nome, excluir. **As mudanças entram no ar na hora**, sem subir nada no GitHub.

### Crianças

Cada pessoa tem uma marcação de **criança**. O painel conta adultos e crianças
separadamente — na hora de fechar o buffet, que costuma cobrar meia ou nada
por criança, esse número é o que você vai precisar. A contagem aparece tanto
dos convidados quanto dos que já confirmaram, e a planilha exportada traz uma
coluna dizendo se é adulto ou criança.

### Detalhes que importam

- O **id** identifica a família no banco. Depois que o convite for enviado,
  não mude um id existente — a confirmação já feita se perde. Famílias
  criadas pelo painel ganham id sozinhas, então isso só é assunto se você
  mexer no arquivo na mão.
- **Nome da família** é opcional. Vazio, usamos o primeiro nome da lista.
- A busca **ignora acentos e maiúsculas**: quem digita `erika` acha `Érika`.
- Ela casa com o **começo de qualquer palavra** do nome: `dias` encontra
  `Érika Dias` e `Gislaine Dias`.
- Para quem é conhecido por outro nome, o arquivo aceita `apelidos`:
  `{ nome: 'Beatriz Souza', apelidos: ['Bia'] }`.

**Se a família confirmar duas vezes**, a segunda resposta substitui a
primeira — de propósito, para quem mudar de ideia corrigir sozinho sem
incomodar vocês. No painel você vê a data da última resposta.

**Um aviso honesto:** a lista de nomes fica visível para quem for procurar no
código do site. Não dá para esconder num site estático — e vale para qualquer
plataforma de casamento que faça busca por nome. O que está protegido de
verdade é **quem confirmou, os telefones e os valores**, que só aparecem para
você logado na Área dos noivos.

---

## Cotas: dividir um presente entre vários convidados

Um item de R$ 1.200 afasta quase todo mundo. Dividido em 6 cotas de R$ 200,
vira um presente que várias pessoas dão juntas.

Na aba **Editar lista**, a coluna **Cotas** tem um campo em cada linha: digite
o número, saia do campo e pronto — não precisa abrir o presente. O mesmo campo
existe dentro do formulário, ao criar ou editar um item.

- **1** — presente inteiro, uma pessoa só compra.
- **mais de 1** — o site mostra o valor **por cota**, uma barrinha de progresso
  e quantas ainda faltam. O convidado escolhe quantas quer dar no `+` e `−`,
  e o PIX já sai com o valor certo.

O painel não deixa reduzir o número de cotas abaixo do que já foi preenchido —
senão alguém ficaria com uma cota que não existe mais.

O presente só sai da lista quando **todas** as cotas são preenchidas.

No painel, em **Presentes recebidos**, cada cota aparece como uma linha
própria, com o nome de quem deu e quantas cotas pegou. Você confirma o
recebimento de cada uma separadamente, conforme os PIX caem na conta.

---

## Fotos dos presentes

Ainda em **Editar lista**, ao abrir um presente tem um quadro de foto que
aceita três coisas:

- **Clicar e escolher** um arquivo do computador
- **Arrastar e soltar** a imagem em cima do quadro
- **Colar um print** com Ctrl+V — útil para recortar da tela de uma loja

Depois de carregar, **arraste a imagem dentro do quadro** para escolher o
enquadramento e use o **Zoom** para aproximar. O site recorta em 4:3 e comprime
automaticamente — cada foto fica em torno de 30 KB, então a lista continua
rápida de abrir no celular.

As fotos ficam guardadas separadas do resto, para os nomes e valores
aparecerem primeiro e as imagens entrarem em seguida.

---

## Passo 3 — Ligar o PIX

Em `assets/js/conteudo.js`, procure `presentes.pix`:

```js
pix: {
  chave: 'exemplo@email.com.br',   // sua chave PIX
  nomeRecebedor: 'YANNE E JULIO',  // até 25 caracteres, SEM acento
  cidade: 'BELO HORIZONTE'         // até 15 caracteres, SEM acento
}
```

A chave pode ser CPF, e-mail, telefone (`+5531999999999`) ou chave aleatória.

**Teste antes de divulgar**: abra a lista de presentes, gere um PIX de um item
barato e leia o QR Code no app do banco. Tem que aparecer o seu nome e o valor
certinho. Se aparecer, está tudo funcionando.

---

## Passo 4 — Aplicar as regras de segurança

No Firebase: **Realtime Database** › aba **Regras** › apague tudo e cole o
conteúdo do arquivo `database.rules.json` › **Publicar**.

O que essas regras fazem:

- **Confirmações**: o convidado só consegue gravar a resposta da própria
  família, e no formato certo. Ninguém além de você (logado) consegue ler
  quem confirmou.
- **Presentes**: qualquer um lê a lista (para saber o que já foi escolhido),
  mas ninguém consegue alterar ou apagar um presente já reservado — só você.
- **Recados**: o convidado envia sempre como "não aprovado". Só você aprova.
- **Catálogo e fotos**: qualquer um lê a lista de presentes; só você (logado)
  edita. Cada cota é gravada separada, e ninguém consegue alterar ou apagar
  a cota de outra pessoa.
- **Convidados**: qualquer um lê a lista de nomes (o site precisa dela para a
  busca funcionar); só você (logado) edita.

> Se você colocar `moderar: false` no `conteudo.js`, precisa ajustar a regra
> dos recados: troque `newData.child('aprovado').val() === false` por
> `newData.child('aprovado').isBoolean()`.

---

## Passo 5 — Subir no GitHub

1. No GitHub: **New repository** › nome, por exemplo, `casamento` › **Public**.
2. Na página do repositório: **Add file** › **Upload files** ›
   arraste **todos** os arquivos e pastas desta pasta › **Commit changes**.
3. Aba **Settings** › **Pages** ›
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)** › **Save**

Em 1–2 minutos o site estará em:

```
https://SEU-USUARIO.github.io/casamento/
```

> Isso não interfere em nenhum outro site seu no GitHub Pages. Cada
> repositório vira um site independente, com endereço próprio.

### Domínio próprio (opcional)

1. Registre o domínio (Registro.br, uns R$ 40/ano).
2. No DNS do domínio, crie 4 registros **A** apontando para:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. No GitHub: **Settings** › **Pages** › **Custom domain** › digite o domínio.
4. Marque **Enforce HTTPS** (aparece alguns minutos depois).

---

## Passo 6 — A Área dos noivos

No site, o menu de **três pontinhos** no canto superior direito leva até lá.
O endereço direto é `.../casamento/admin.html`.

A entrada é por **senha** — a mesma que você cadastrou no usuário do Firebase
(passo 2.4). Para trocar depois: Firebase › Authentication › Users ›
os três pontinhos ao lado do usuário › **Redefinir senha**.

### Como a senha funciona (e por que não fica no código)

A senha **não está escrita em lugar nenhum** dos arquivos do site. O que
acontece quando vocês digitam é que o site tenta fazer login no Firebase com
ela. Quem diz "sim" ou "não" é o Firebase, do lado de fora.

Isso importa porque qualquer pessoa consegue ler o código de um site — basta
apertar F12. Se a senha estivesse escrita ali, seria decoração. Do jeito que
está, mesmo alguém lendo todo o código não consegue entrar, e as regras do
banco continuam exigindo login para devolver qualquer dado privado.

> **Escolha uma senha com mais de 6 dígitos se puder.** Uma data de 6 números
> tem só um milhão de combinações. O Firebase bloqueia tentativas repetidas,
> mas uma senha maior é bem mais segura — e vocês vão digitar isso umas vinte
> vezes na vida.

### O que tem lá dentro

**Resumo** — quanto já entrou de presente por categoria, os cinco últimos
presentes recebidos, e a lista de quem ainda não confirmou presença.

**Confirmações** — todas as famílias, com quem não respondeu no topo. Cada
família que respondeu tem um botão de **WhatsApp** para falar direto.
Exporta para Excel com uma linha por pessoa, pronto para montar mesas.

**Presentes recebidos** — quem deu o quê, quanto foi, a mensagem que deixou.
Quando o PIX cair na conta, clique em **Confirmar recebimento**: o valor sai
de "aguardando conferência" e entra no total recebido. Se alguém marcar que
pagou e o dinheiro não aparecer, **Devolver à lista** libera o presente.

**Convidados** — a lista inteira, agrupada por família, com a contagem de
adultos e crianças. Dá para adicionar família, adicionar ou remover pessoas,
marcar quem é criança e corrigir nomes. Na primeira vez, clique em
**Publicar a lista atual** para levar o arquivo `convidados.js` para o banco.

**Editar lista** — adicionar, editar, esconder e excluir presentes, sem mexer
em arquivo nenhum. É aqui que ficam as **cotas** e as **fotos**. Na primeira vez, clique em **Publicar a lista de exemplo**:
isso copia os itens do `conteudo.js` para o banco. A partir daí, é esta tela
que manda no que aparece no site — as mudanças entram no ar na hora, sem
precisar subir nada no GitHub.

**Recados** — aprovar ou tirar do mural.

## Quando você atualizar os arquivos

O navegador guarda CSS e JavaScript por alguns minutos. Se você subir uma
versão nova e a página continuar igual, é cache — não erro.

- **Para ver na hora:** Ctrl + Shift + R (Cmd + Shift + R no Mac), ou abra
  numa janela anônima.
- **Para os convidados verem na hora:** no `index.html` e no `admin.html`,
  os arquivos são chamados com `?v=2` no fim. Toda vez que você mudar um CSS
  ou JS, **suba o número** (`?v=3`, `?v=4`...). Isso faz o navegador de todo
  mundo baixar a versão nova imediatamente.

Isso só vale para mudanças em arquivo. O que você edita pelo painel
(convidados, lista de presentes) aparece na hora, sem cache nenhum.

---

## Passo 7 — Quando a identidade visual chegar

Abra `assets/css/tema.css`. Tudo que é visual está lá em cima, comentado:

1. **Fontes** — troque a linha `@import url(...)` pelo link das fontes novas
   (Google Fonts › escolher a fonte › aba "@import") e ajuste
   `--fonte-titulo` (títulos), `--fonte-texto` (corpo) e `--fonte-detalhe`
   (monograma e assinaturas).
2. **Cores** — troque os códigos `--cor-*`. A `--cor-destaque` é a cor
   principal: aparece nos botões, no monograma, nos ramos e nos títulos
   pequenos. Hoje está no verde-oliva das referências.
3. **Cantos** — `--raio` em `0px` deixa tudo reto (papelaria clássica);
   em `12px` fica moderno. Hoje está em `2px`.
4. **Textura** — `--textura-papel` aponta para `assets/img/papel.png`.
   Para um fundo liso, troque por `none`.

### Identidade atual

| Elemento | Valor |
|---|---|
| Verde-oliva (destaque) | `#7c8b63` |
| Verde profundo (rodapé) | `#39432f` |
| Creme (fundo) | `#faf7f0` |
| Creme fechado (seções) | `#f1ede1` |
| Títulos | Cormorant Garamond |
| Monograma | Pinyon Script |
| Textos e botões | Jost |

O monograma **Y & J** é montado sozinho com as iniciais dos nomes. Para usar
um monograma desenhado pelo designer, preencha `noivos.monograma` no
`conteudo.js` (aceita HTML, então dá para colocar até um `<img>`).

### Foto na capa

A capa vem clara, no estilo de um convite impresso. Para usar uma foto do
casal, preencha `capa.foto` no `conteudo.js` com o caminho da imagem
(ex.: `'assets/img/capa.jpg'`). O site escurece a foto e clareia o texto
automaticamente — ajuste `--hero-escurecer` no `tema.css` se precisar.

O site inteiro se adapta. Não precisa tocar em `estilo.css`.

---

## Checklist antes de mandar o convite

- [ ] Nomes, data e horários corretos em `conteudo.js`
- [ ] Lista de convidados publicada e completa (nomes como as pessoas se reconhecem)
- [ ] Crianças marcadas, para a contagem do buffet fechar
- [ ] Endereços e links de mapa testados no celular
- [ ] Chave PIX testada de verdade (leia o QR no app do banco)
- [ ] Presentes caros divididos em cotas
- [ ] Fotos dos principais presentes
- [ ] Regras do Firebase publicadas (senão o site não salva nada)
- [ ] Senha da Área dos noivos funcionando
- [ ] Lista de presentes publicada pelo painel (aba "Editar lista")
- [ ] Confirmação de presença enviada como teste, e aparecendo no painel
- [ ] Site aberto no celular — é onde 90% dos convidados vão acessar
- [ ] Prazo de confirmação conferido
- [ ] Foto de capa, se for usar (a capa também funciona bem sem foto)

---

## Perguntas rápidas

**Quantos convidados aguenta?**
O plano gratuito do Firebase dá 100 conexões simultâneas e 10 GB de tráfego
por mês. Um casamento de 500 convidados usa uma fração disso.

**E se acabar a cota?**
Não acaba. Mas se acontecer, o site continua no ar — só o salvamento para,
e volta no mês seguinte.

**Posso mudar os textos depois de publicar?**
Sim. Edite o `conteudo.js`, suba de novo no GitHub e em 1 minuto está no ar.

**Alguém pode bagunçar a lista de presentes?**
Com as regras do passo 4, não. Um presente reservado não pode ser alterado
nem apagado por quem não está logado como noivo.

**O convidado precisa criar conta?**
Não. Nada de login para os convidados.
