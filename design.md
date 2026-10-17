# design.md — Plataforma de tese

Guia para construir a **plataforma de acompanhamento da escrita da tese de doutorado**, usando a linguagem visual do Bongarbit. Cole este arquivo na raiz do projeto e o agente segue estas regras.

---

## O que é isto

Uma ferramenta pessoal de trabalho, usada todo dia por **uma pessoa**: status do sumário, reuniões de orientação, ideias soltas, acompanhamento dos arquivos no Drive. Não é site institucional, não é peça de divulgação, não tem visitante.

Isso muda três coisas em relação ao uso da marca em peças públicas:

1. **Sem assinatura institucional.** Nada de chamada do Ministério da Cultura, régua de patrocinadores ou PRONAC — nada disso pertence aqui.
2. **Sem retórica de marca.** O texto é operacional e em primeira pessoa. Não se escreve "Bongarbit nasce da convicção de que…" numa tela de acompanhamento.
3. **Densidade acima de impacto.** Uma peça impressa respira; uma ferramenta de trabalho mostra muita informação de uma vez. A escala tipográfica aqui é menor e o espaçamento mais apertado.

O que permanece: **a linguagem visual de impresso.** Papel envelhecido, tinta preta, cantos retos, filete, sombra sólida. A referência mental é o **caderno de campo e a ficha de arquivo** — não o cartaz.

---

## Tokens

```css
:root{
  /* Terra — estruturais */
  --preto-grafite:#161512;
  --verde-musgo:#1e2c1a;
  --marrom-terra:#6b3c23;
  --terracota-queimada:#b14826;

  /* Acentos */
  --ocre-cabaca:#d4752d;
  --amarelo-ocre:#d0962d;
  --verde-baoba:#31671f;
  --azul-caixa-dagua:#376182;

  /* Superfície */
  --areia:#d3ad84;
  --papel:#ead6bf;
  --papel-claro:#f4e8da;
  --papel-sombra:#dfc7ab;

  /* Tinta diluída */
  --grafite-70:rgba(22,21,18,.7);
  --grafite-45:rgba(22,21,18,.45);
  --grafite-18:rgba(22,21,18,.18);
  --grafite-08:rgba(22,21,18,.08);

  /* Semântica — superfícies */
  --surface-page:var(--papel);
  --surface-panel:var(--papel-claro);   /* sidebar, painéis */
  --surface-card:var(--papel-claro);
  --surface-sunken:var(--papel-sombra); /* campos, linhas alternadas */
  --surface-inverse:var(--preto-grafite);

  /* Semântica — texto */
  --text-strong:var(--preto-grafite);
  --text-body:var(--grafite-70);
  --text-muted:var(--grafite-45);
  --text-on-inverse:var(--papel);
  --text-accent:var(--terracota-queimada);
  --text-link:var(--terracota-queimada);
  --text-link-hover:var(--ocre-cabaca);

  /* Linhas */
  --border-rule:var(--preto-grafite);
  --border-hairline:var(--grafite-18);
  --border-inverse:rgba(234,214,191,.28);
  --rule-hair:1px;
  --rule-thick:3px;

  /* Estado do trabalho — a semântica central desta plataforma */
  --status-nao-comecado:var(--grafite-45);
  --status-em-andamento:var(--amarelo-ocre);
  --status-rascunho:var(--ocre-cabaca);
  --status-em-revisao:var(--azul-caixa-dagua);
  --status-com-orientador:var(--marrom-terra);
  --status-fechado:var(--verde-baoba);
  --status-travado:var(--terracota-queimada);

  /* Ação */
  --action-primary:var(--terracota-queimada);
  --action-primary-hover:#993d20;
  --action-primary-active:#7f321a;
  --focus-ring:var(--azul-caixa-dagua);

  /* Tipografia — escala de aplicação, mais densa que a de peça */
  --font-core:"The Mix Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --font-leitura:"Source Serif 4", Charter, "Iowan Old Style", Georgia, serif;
  --fw-light:300; --fw-regular:400; --fw-semibold:600; --fw-bold:700; --fw-black:900;
  --fs-page-title:30px;   /* título da tela */
  --fs-h2:22px;           /* título de seção */
  --fs-h3:17px;           /* título de capítulo/card */
  --fs-body:15px;
  --fs-small:13px;
  --fs-caption:12px;
  --fs-micro:11px;        /* rótulos, status, metadados */
  --lh-heading:1.2;
  --lh-body:1.5;
  --lh-dense:1.35;        /* tabelas e listas */
  --ls-body:0.01em;
  --ls-eyebrow:0.18em;    /* rótulos e status */

  /* Espaço — base 8 com meio-passo */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px;
  --space-6:32px; --space-7:48px; --space-8:64px;
  --sidebar-w:252px;
  --content-max:1080px;
  --reading-max:680px;    /* notas e texto longo */
  --gutter:clamp(16px,3vw,40px);

  /* Forma */
  --radius-none:0;
  --shadow-print:3px 3px 0 var(--grafite-18);
  --shadow-print-strong:5px 5px 0 var(--preto-grafite);
  --frame-double:inset 0 0 0 1px var(--preto-grafite), inset 0 0 0 5px var(--papel), inset 0 0 0 6px var(--preto-grafite);

  /* Movimento */
  --ease-standard:cubic-bezier(.2,.6,.2,1);
  --dur-fast:120ms; --dur-base:200ms;
}

body{
  margin:0;
  background:var(--surface-page);
  color:var(--text-strong);
  font-family:var(--font-core);
  font-size:var(--fs-body);
  line-height:var(--lh-body);
  letter-spacing:var(--ls-body);
}
a{color:var(--text-link);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;transition:color var(--dur-fast) var(--ease-standard)}
a:hover{color:var(--text-link-hover)}
::selection{background:var(--amarelo-ocre);color:var(--preto-grafite)}
:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
```

### Tipografia

**The Mix Mono** em tudo. Numa plataforma de escrita acadêmica a monoespaçada trabalha a favor: alinha numeração de capítulo, contagem de palavras, datas e percentuais em colunas sem tabular-nums.

Os OTF estão em `assets/fonts/` (Light 300, SemiLight 350, Regular 400 + itálico, SemiBold 600, Bold 700, Black 900). Declare `@font-face` para os pesos usados. Sem os arquivos, cai na stack monoespaçada do sistema — nunca substitua por Inter, Roboto ou sans genérica.

**Leitura de texto longo.** Trechos da própria tese, quando exibidos para leitura, vão numa **serifada de leitura** — monoespaçada é ótima para interface e cansativa para três parágrafos de argumentação. Toda a moldura da interface (navegação, rótulos, tabelas, estados, metadados) permanece em The Mix Mono; a serifada entra **só no corpo do texto da tese**, em `--reading-max`.

```css
.texto-tese{
  font-family:var(--font-leitura);
  font-size:18px;
  line-height:1.66;
  letter-spacing:0;
  max-width:var(--reading-max);
  color:var(--text-strong);
  text-wrap:pretty;
}
.texto-tese p+p{margin-top:.9em}
```

Source Serif 4 tem cor de tinta próxima à da The Mix Mono e boa performance em tela — as duas convivem sem uma parecer intrusa. Uma só serifada no projeto inteiro.

---

## Regras que não se quebram

1. **Raio 0 em tudo.** Única exceção: o radio button.
2. **Sombra sólida deslocada, nunca blur.** É papel sobre papel.
3. **O fundo é Papel `#ead6bf`, nunca branco puro.**
4. **Sem emoji.** Inclusive em status — o estado é cor + palavra, não bolinha colorida com carinha.
5. **Não invente cores.** Os sete estados de trabalho já cobrem o vocabulário.
6. **Sem gradiente, sem blur, sem glassmorphism, sem `backdrop-filter`.**
7. **Nada de assinatura institucional.** Sem MinC, sem régua de patrocinadores, sem PRONAC.
8. **Sem logo.** Esta é uma plataforma pessoal de tese, não peça do projeto Bongarbit — nenhuma marca aparece em tela alguma. O que se herda daqui é a linguagem visual, não a assinatura.
9. **Ilustração é raríssima aqui.** No máximo uma xilogravura pequena num estado vazio. Uma ferramenta diária não carrega baobá em cada tela.

---

## Estados do trabalho

O vocabulário central da plataforma. Sete estados, cada um com cor fixa da paleta:

| Estado | Cor | Quando |
|---|---|---|
| Não começado | `--grafite-45` | existe no sumário, não tem uma linha |
| Em andamento | `--amarelo-ocre` | escrevendo agora |
| Rascunho | `--ocre-cabaca` | tem texto inteiro, ruim mas inteiro |
| Em revisão | `--azul-caixa-dagua` | reescrevendo |
| Com orientador | `--marrom-terra` | esperando devolutiva |
| Fechado | `--verde-baoba` | não mexo mais sem motivo forte |
| Travado | `--terracota-queimada` | parado por bloqueio, não por prioridade |

**Travado é diferente de não começado.** A distinção é o valor da ferramenta: mostra onde está o problema real.

### Etiqueta de estado

Retângulo reto, caixa alta, 11px, tracking 0.18em, filete de 1px em tinta, fundo na cor do estado.

```jsx
<span style={{
  display:"inline-block", padding:"3px 9px",
  fontSize:"var(--fs-micro)", fontWeight:"var(--fw-semibold)",
  letterSpacing:"var(--ls-eyebrow)", textTransform:"uppercase",
  border:"1px solid var(--border-rule)", borderRadius:0,
  background:"var(--status-rascunho)", color:"var(--papel)"
}}>Rascunho</span>
```

Sobre Amarelo Ocre e Areia o texto vai em `--preto-grafite`; nos demais, em `--papel`.

---

## Componentes

### Sidebar
Coluna fixa de 252px em Papel Claro, separada por filete de 1px em tinta. Itens em caixa alta 11px com tracking; o ativo recebe **filete grosso de 3px em Terracota na borda esquerda** e texto em tinta cheia — o mesmo gesto do underline das abas, virado na vertical.

```jsx
<nav style={{width:"var(--sidebar-w)",background:"var(--surface-panel)",borderRight:"1px solid var(--border-rule)",height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",gap:"var(--space-1)",padding:"var(--space-5) 0"}}>
  <a href="#" style={{padding:"9px var(--space-5)",borderLeft:"var(--rule-thick) solid var(--terracota-queimada)",fontSize:"var(--fs-micro)",fontWeight:"var(--fw-semibold)",letterSpacing:"var(--ls-eyebrow)",textTransform:"uppercase",color:"var(--text-strong)",textDecoration:"none"}}>Sumário</a>
  <a href="#" style={{padding:"9px var(--space-5)",borderLeft:"var(--rule-thick) solid transparent",fontSize:"var(--fs-micro)",fontWeight:"var(--fw-semibold)",letterSpacing:"var(--ls-eyebrow)",textTransform:"uppercase",color:"var(--text-muted)",textDecoration:"none"}}>Orientação</a>
</nav>
```

### Linha do sumário
O componente mais importante. Cada capítulo/seção é uma **linha de ficha**, não um card: numeração monoespaçada, título, etiqueta de estado, contagem de palavras, data do último toque. Separadas por filete hairline; nível de indentação por `padding-left`.

```jsx
<div style={{display:"grid",gridTemplateColumns:"56px 1fr 110px 90px 92px",gap:"var(--space-4)",alignItems:"center",padding:"11px var(--space-4)",borderBottom:"1px solid var(--border-hairline)",lineHeight:"var(--lh-dense)"}}>
  <span style={{fontSize:"var(--fs-small)",color:"var(--text-muted)"}}>3.2</span>
  <span style={{fontSize:"var(--fs-body)"}}>Instrumentos digitais e fundamento cultural</span>
  <StatusTag estado="Em revisão" />
  <span style={{fontSize:"var(--fs-small)",color:"var(--text-body)",textAlign:"right"}}>4.210</span>
  <span style={{fontSize:"var(--fs-caption)",color:"var(--text-muted)",textAlign:"right"}}>12/09</span>
</div>
```

Hover: fundo `--grafite-08`. Nada de sombra, nada de elevação.

### Barra de progresso
Retângulo reto com filete em tinta, preenchido na cor do estado. Sem cantos arredondados, sem animação de brilho.

```jsx
<div style={{height:14,border:"1px solid var(--border-rule)",background:"var(--papel-sombra)"}}>
  <div style={{height:"100%",width:"62%",background:"var(--verde-baoba)"}} />
</div>
```

Para progresso composto (quanto de cada estado no total), use uma **faixa segmentada** — blocos lado a lado nas cores dos estados, separados por filete de 1px. Lê-se como régua de impressor.

### Nota de orientação
Ficha de reunião. Data em caixa alta como olho, participantes, encaminhamentos. Filete grosso no topo em Marrom Terra — a cor de "com orientador".

```jsx
<article style={{background:"var(--surface-card)",border:"1px solid var(--border-rule)",borderTop:"var(--rule-thick) solid var(--marrom-terra)",boxShadow:"var(--shadow-print)",padding:"var(--space-5)"}}>
  <div style={{fontSize:"var(--fs-micro)",fontWeight:"var(--fw-semibold)",letterSpacing:"var(--ls-eyebrow)",textTransform:"uppercase",color:"var(--text-accent)"}}>Orientação · 12/09/2026</div>
  <h3 style={{fontSize:"var(--fs-h3)",fontWeight:"var(--fw-bold)",margin:"var(--space-2) 0 0"}}>Recorte do capítulo 3</h3>
  <div style={{fontSize:"var(--fs-small)",color:"var(--text-body)",marginTop:"var(--space-3)",maxWidth:"var(--reading-max)"}}>…</div>
</article>
```

Encaminhamentos viram checklist com o **×** de tinta do checkbox — marcação de formulário preenchido à mão.

### Ideia solta
Captura rápida, sem estrutura. Bloco pequeno em Papel Claro com filete hairline e sombra impressa leve, data em micro no rodapé. Grade tipo mural (`repeat(auto-fill,minmax(240px,1fr))`) — o único lugar da plataforma onde o layout é solto de propósito.

Uma ideia pode ser **promovida** a seção do sumário: mostre isso como ação secundária no hover, nunca como botão sempre visível.

### Item do Drive
Linha com nome do arquivo, quem tocou por último, data e estado de sincronia. Arquivo desatualizado em relação à seção correspondente: etiqueta **Travado** ou um filete Terracota à esquerda. Sem ícone de nuvem — use o texto.

### Botão
Caixa alta, tracking 0.18em, cantos retos, filete de 1px, sombra impressa de 3px. Em ferramenta de uso diário o tamanho padrão é o `sm`; reserve `md` para a ação principal da tela.

```jsx
<button style={{display:"inline-flex",alignItems:"center",gap:"var(--space-2)",font:"inherit",fontSize:"var(--fs-micro)",fontWeight:"var(--fw-semibold)",letterSpacing:"var(--ls-eyebrow)",textTransform:"uppercase",padding:"8px 14px",border:"1px solid var(--border-rule)",borderRadius:0,background:"var(--action-primary)",color:"var(--papel)",boxShadow:"var(--shadow-print)",cursor:"pointer"}}>Nova entrada</button>
```

Variantes: **primary** (Terracota) · **secondary** (Papel Claro / tinta) · **ghost** (transparente).

### Campos
Fundo Papel Claro, filete de 1px em tinta, `padding:11px 13px`, cantos retos. Label em caixa alta 11px acima. O checkbox marca com **×** de tinta. O radio é o único elemento redondo do sistema.

### Estado vazio
O lugar da ilustração. Uma xilogravura pequena (máx. 180px) de `assets/illustrations/`, texto curto em `--text-muted` e uma ação. Um por tela, nunca mais.

---

## Layout

- **Sidebar fixa + coluna de conteúdo** com `max-width: 1080px`. Texto longo em `--reading-max: 680px`.
- Densidade de ferramenta: linhas de tabela em ~40px, seções separadas por `--space-6`, não `--space-9`.
- Sempre **flex/grid com `gap`**.
- **Cabeçalho de tela** = olho em caixa alta + título + ação à direita, sobre filete grosso. Sem hero, sem imagem de topo.
- Tabelas e listas ganham filete hairline entre linhas; alternância de fundo só se passarem de ~15 linhas, usando `--papel-sombra`.

## Estados de interação

- **Hover:** fundo `--grafite-08` em linhas; nos botões, escurece o pigmento (`#b14826` → `#993d20`).
- **Press:** `translate(2px,2px)` — o elemento entra na própria sombra. O gesto de carimbar.
- **Focus:** contorno 2px Azul Caixas d'Água, offset 2px. Numa ferramenta usada por teclado, isto importa mais que em site.
- **Disabled:** opacidade 0.4, `cursor:not-allowed`.
- **Selecionado:** inverte para tinta cheia (fundo Preto Grafite, texto Papel).

## Animação

Discreta e mecânica: `cubic-bezier(.2,.6,.2,1)`, 120–200ms. Só cor, posição curta e toggle. **Sem bounce, sem parallax, sem fade-in de scroll, sem confete ao concluir capítulo.** Marcar uma seção como fechada muda a cor da etiqueta — só isso, e é suficiente.

## Iconografia

**Lucide** via CDN, traço 1.5–2px, `currentColor`. Só onde o texto não resolve: navegação, expandir/colapsar, link externo do Drive. Emoji nunca. Unicode só no `×` do checkbox e no `×` de fechar.

---

## Voz

Esta é uma ferramenta que **você** usa. O texto é operacional, em primeira pessoa quando houver pessoa, direto sempre.

- **Rótulos:** substantivo curto em caixa alta — SUMÁRIO, ORIENTAÇÃO, IDEIAS, ARQUIVOS.
- **Estados vazios:** frase única, sem entusiasmo fabricado. "Nenhuma ideia registrada ainda." Não "Comece sua jornada de escrita!".
- **Datas:** pt-BR, `12/09`. Relativas só quando recentes ("há 3 dias"), absolutas depois disso.
- **Números:** vírgula decimal, separador de milhar com ponto (`4.210 palavras`).
- **Sem gamificação.** Nenhum streak, nenhuma medalha, nenhum "parabéns". A recompensa é a barra mudar de cor.
- **Sem retórica de marca.** O vocabulário poético do Bongarbit (raiz, terreiro, ancestralidade) pertence às peças públicas do projeto, não a esta plataforma. Aqui a linguagem é a do trabalho: seção, devolutiva, recorte, versão, prazo.

---

## Assets a copiar

Do kit, apenas o que a aplicação carrega:

```
assets/fonts/                            The Mix Mono, 7 pesos — essencial
assets/backgrounds/paper-texture.png     textura de papel, se quiser fundo texturizado
assets/illustrations/                    só para estados vazios — use 1 ou 2, não a pasta toda
```

A serifada de leitura vem do Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
```

**Não copie** para este projeto: logo alguma, réguas de apoio, logos do Fab Lab Rec, submarcas (Café com Bongarbit, Circula), templates de certificado e timbrado. Nada disso pertence a uma plataforma pessoal de tese.
