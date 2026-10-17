# design.md — Identidade visual Bongarbit

Guia da linguagem visual do **Bongarbit** para interfaces digitais. Cole este arquivo na raiz do projeto e siga estas regras.

---

## A linguagem

**Impresso.** Papel envelhecido, tinta preta, cantos retos, filete, sombra sólida. A referência mental é o **caderno de campo e a ficha de arquivo** — não o cartaz, não o app de startup.

Três princípios:

1. **Papel sobre papel.** Superfícies são folhas empilhadas. A profundidade vem de sombra sólida deslocada, nunca de blur.
2. **Tinta, não pixel.** Contornos são filetes de tinta (1px fino, 3px grosso). Cor é pigmento: terrosa, chapada, sem gradiente.
3. **Texto operacional.** Frases curtas, diretas, sem retórica de marca.

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
  --surface-panel:var(--papel-claro);
  --surface-card:var(--papel-claro);
  --surface-sunken:var(--papel-sombra); /* campos, trilhos, linhas alternadas */
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

  /* Estados — só cores da paleta */
  --state-neutral:var(--grafite-45);
  --state-info:var(--azul-caixa-dagua);
  --state-ok:var(--verde-baoba);
  --state-warn:var(--amarelo-ocre);
  --state-alert:var(--ocre-cabaca);
  --state-error:var(--terracota-queimada);

  /* Ação */
  --action-primary:var(--terracota-queimada);
  --action-primary-hover:#993d20;
  --action-primary-active:#7f321a;
  --focus-ring:var(--azul-caixa-dagua);

  /* Tipografia */
  --font-core:"The Mix Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --fw-light:300; --fw-regular:400; --fw-semibold:600; --fw-bold:700; --fw-black:900;
  --fs-display:44px;      /* peça de impacto */
  --fs-page-title:30px;   /* título de tela */
  --fs-h2:22px;
  --fs-h3:17px;
  --fs-body:15px;
  --fs-small:13px;
  --fs-caption:12px;
  --fs-micro:11px;        /* rótulos, estados, metadados */
  --lh-heading:1.2;
  --lh-body:1.5;
  --lh-dense:1.35;
  --ls-body:0.01em;
  --ls-eyebrow:0.18em;    /* rótulos em caixa alta */

  /* Espaço — base 8 com meio-passo */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px;
  --space-6:32px; --space-7:48px; --space-8:64px;
  --content-max:720px;
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

### Cores — papéis

| Papel | Token |
|---|---|
| Fundo da página | `--papel` |
| Painéis, cartões | `--papel-claro` |
| Campos, trilhos, áreas rebaixadas | `--papel-sombra` |
| Tinta, contornos, texto forte | `--preto-grafite` |
| Ação principal, destaque | `--terracota-queimada` |
| Foco | `--azul-caixa-dagua` |
| Selecionado / invertido | fundo `--preto-grafite`, texto `--papel` |

Sobre Amarelo Ocre e Areia o texto vai em `--preto-grafite`; nos demais fundos coloridos, em `--papel`.

---

## Tipografia

**The Mix Mono** em tudo. A monoespaçada alinha números, durações e percentuais em colunas sem `tabular-nums`, e dá o ar de máquina de escrever / ficha datilografada.

Os OTF (Light 300, SemiLight 350, Regular 400 + itálico, SemiBold 600, Bold 700, Black 900) ficam em `assets/fonts/`. Declare `@font-face` só para os pesos usados:

```css
@font-face{font-family:"The Mix Mono";font-weight:400;font-style:normal;font-display:swap;src:url("../assets/fonts/TheMixMono-5-Regular.otf") format("opentype")}
@font-face{font-family:"The Mix Mono";font-weight:600;font-style:normal;font-display:swap;src:url("../assets/fonts/TheMixMono-6-SemiBold.otf") format("opentype")}
@font-face{font-family:"The Mix Mono";font-weight:700;font-style:normal;font-display:swap;src:url("../assets/fonts/TheMixMono-7-Bold.otf") format("opentype")}
```

Sem os arquivos, cai na stack monoespaçada do sistema — **nunca** substitua por Inter, Roboto ou outra sans genérica.

- **Rótulos** (olho, estado, botão): caixa alta, `--fs-micro`, semibold, `--ls-eyebrow`.
- **Títulos**: bold, `--lh-heading`, sem caixa alta.
- **Corpo**: regular, `--fs-body`; texto auxiliar em `--text-body` ou `--text-muted`.

---

## Regras que não se quebram

1. **Raio 0 em tudo.** Única exceção: o radio button.
2. **Sombra sólida deslocada, nunca blur.** É papel sobre papel.
3. **O fundo é Papel `#ead6bf`, nunca branco puro.**
4. **Sem emoji.** O estado é cor + palavra.
5. **Não invente cores.** Tudo sai da paleta acima.
6. **Sem gradiente, sem blur, sem glassmorphism, sem `backdrop-filter`.**
7. **Ilustração é rara.** Xilogravura pequena em estado vazio, no máximo uma por tela.
8. **Uso da marca em ferramentas:** sem assinatura institucional, sem régua de patrocinadores, sem retórica de marca. Herda-se a linguagem visual, não a assinatura.

---

## Componentes

### Cabeçalho de tela
Olho em caixa alta (rótulo) + título + ação à direita, sobre **filete grosso de 3px** em tinta. Sem hero, sem imagem de topo.

### Painel / ficha
Fundo `--papel-claro`, filete de 1px em tinta, sombra `--shadow-print`, `padding: var(--space-4)`. Título em rótulo (caixa alta micro). Painéis ficam separados por `--space-5`.

### Botão
Caixa alta, tracking 0.18em, cantos retos, filete de 1px, sombra impressa de 3px. Altura mínima de 44px em toque.

```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);font:inherit;font-size:var(--fs-micro);font-weight:var(--fw-semibold);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;padding:10px 16px;min-height:44px;border:1px solid var(--border-rule);border-radius:0;background:var(--papel-claro);color:var(--text-strong);box-shadow:var(--shadow-print);cursor:pointer;touch-action:manipulation;transition:background var(--dur-fast) var(--ease-standard),transform var(--dur-fast) var(--ease-standard),box-shadow var(--dur-fast) var(--ease-standard)}
.btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--grafite-18)}
.btn.primary{background:var(--action-primary);color:var(--papel)}
.btn.primary:hover{background:var(--action-primary-hover)}
.btn.primary:active{background:var(--action-primary-active)}
.btn:disabled{opacity:.4;cursor:not-allowed}
```

Variantes: **primary** (Terracota) · **secondary** (Papel Claro / tinta) · **ghost** (transparente, sem sombra).

### Campos
Fundo `--papel-sombra`, filete de 1px em tinta, `padding:11px 13px`, cantos retos. Rótulo em caixa alta micro acima.

- **Checkbox:** quadrado de 20px com filete de tinta; marcado, mostra um **×** de tinta (marcação de formulário preenchido à mão).
- **Radio:** único elemento redondo do sistema.
- **Slider:** trilho reto de 14px em `--papel-sombra` com filete de tinta; cursor quadrado de tinta cheia (`--preto-grafite`), 22×30px.
- **Select:** mesmo tratamento dos campos de texto.

### Etiqueta de estado
Retângulo reto, caixa alta, 11px, tracking 0.18em, filete de 1px em tinta, fundo na cor do estado (`--state-*`).

```css
.tag{display:inline-block;padding:3px 9px;font-size:var(--fs-micro);font-weight:var(--fw-semibold);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;border:1px solid var(--border-rule);border-radius:0;background:var(--state-ok);color:var(--papel)}
.tag.warn{background:var(--state-warn);color:var(--preto-grafite)}
```

### Barra de progresso / medidor
Retângulo reto com filete em tinta, trilho `--papel-sombra`, preenchido na cor do estado. Sem cantos arredondados, sem animação de brilho. Valores compostos usam faixa segmentada, blocos lado a lado separados por filete de 1px.

### Linha de ficha (listas e tabelas)
Não é card: linha com filete hairline embaixo, numeração mono à esquerda, hover com fundo `--grafite-08`. Alternância de fundo só em listas longas, com `--papel-sombra`.

### Estado vazio
Frase única em `--text-muted`, uma ação. Uma xilogravura pequena (máx. 180px) é opcional.

---

## Layout

- Coluna única com `max-width: var(--content-max)` no celular; sidebar fixa de 252px em Papel Claro só quando houver navegação em telas largas.
- Sempre **flex/grid com `gap`**.
- Seções separadas por `--space-5`/`--space-6`; densidade de ferramenta, sem hero.
- Margem lateral mínima de `--gutter`; controles de arrasto longe da borda da tela (gesto de voltar do sistema).

## Estados de interação

- **Hover:** fundo `--grafite-08` em linhas; nos botões, escurece o pigmento (`#b14826` → `#993d20`).
- **Press:** `translate(2px,2px)` — o elemento entra na própria sombra. O gesto de carimbar.
- **Focus:** contorno 2px Azul Caixa d'Água, offset 2px.
- **Disabled:** opacidade 0.4, `cursor:not-allowed`.
- **Selecionado:** inverte para tinta cheia (fundo Preto Grafite, texto Papel).

## Animação

Discreta e mecânica: `cubic-bezier(.2,.6,.2,1)`, 120–200ms. Só cor, posição curta e toggle. **Sem bounce, sem parallax, sem fade-in de scroll, sem confete.**

## Iconografia

**Lucide**, traço 1.5–2px, `currentColor`, só onde o texto não resolve. Emoji nunca. Unicode só no **×** do checkbox e no **×** de fechar.

---

## Voz

- **Rótulos:** substantivo curto em caixa alta — ARQUIVO, EDIÇÃO, EXPORTAR.
- **Mensagens:** frase única, operacional, sem entusiasmo fabricado.
- **Datas:** pt-BR, `12/09`.
- **Números:** vírgula decimal, ponto como separador de milhar (`4.210`).
- **Sem gamificação.** Nenhum streak, medalha ou "parabéns".

---

## Assets

```
assets/fonts/                            The Mix Mono, 7 pesos
assets/backgrounds/paper-texture.png     textura de papel, opcional
assets/illustrations/                    só para estados vazios
```

Não copie para interfaces de ferramenta: logos, réguas de apoio, submarcas e templates de certificado ou timbrado.
