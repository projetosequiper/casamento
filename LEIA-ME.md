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
| Confirmação de presença com acompanhantes e restrição alimentar | `#confirmar` |
| Lista de presentes com PIX (QR Code + copia e cola) | `#presentes` |
| Mural de recados com moderação | `#recados` |
| Galeria de fotos | `#galeria` |
| Perguntas frequentes | `#faq` |
| Painel dos noivos com exportação para Excel | `admin.html` |

---

## Os 3 arquivos que você vai mexer

| Arquivo | Serve para |
|---|---|
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
   crie o e-mail e a senha que **você** vai usar para entrar no painel.
5. Clique na engrenagem ⚙️ › **Configurações do projeto** › role até
   **Seus apps** › ícone `</>` (Web) › registre o app.
   Vai aparecer um bloco `const firebaseConfig = { ... }`.

Copie os valores desse bloco para o arquivo **`assets/js/firebase-config.js`**.

> ⚠️ Essas chaves são públicas por natureza — qualquer site Firebase as expõe.
> Quem protege os dados são as **regras** do passo 4, não as chaves.

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

- **Confirmações**: o convidado só consegue *criar* a dele. Ninguém além de
  você (logado) consegue ler a lista de convidados.
- **Presentes**: qualquer um lê a lista (para saber o que já foi escolhido),
  mas ninguém consegue alterar ou apagar um presente já reservado — só você.
- **Recados**: o convidado envia sempre como "não aprovado". Só você aprova.

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

## Passo 6 — O painel dos noivos

Endereço: `https://SEU-USUARIO.github.io/casamento/admin.html`

Entre com o e-mail e senha que você criou no passo 2.4. No painel você vê:

- **Resumo**: quantas pessoas confirmadas, quantos recusaram, valor dos presentes
- **Confirmações**: lista completa, busca por nome, exportar para Excel (CSV)
- **Presentes**: quem escolheu o quê, marcar como recebido, devolver à lista
- **Recados**: aprovar ou tirar do mural

O link do painel não aparece no menu do site — só quem tem o endereço acessa,
e mesmo assim precisa da senha.

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
- [ ] Endereços e links de mapa testados no celular
- [ ] Chave PIX testada de verdade (leia o QR no app do banco)
- [ ] Regras do Firebase publicadas (senão o site não salva nada)
- [ ] Login do painel funcionando
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
