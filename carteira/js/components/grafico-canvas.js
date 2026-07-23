/**
 * Distribui Rico — components/grafico-canvas.js
 * -----------------------------------------------------------------------
 * Desenha o gráfico de distribuição em <canvas> usando a API 2D nativa —
 * sem nenhuma biblioteca de gráficos. Também mantém a legenda em HTML
 * sincronizada com as mesmas cores e valores.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { criarEl, limpar } = DR.dom;
  const { formatarMoeda, formatarPercentual } = DR.format;

  // Dourado para a maior fatia, tons de cinza decrescentes para as demais
  // — os mesmos valores hexadecimais de --chart-1..7 em tokens.css. Canvas
  // não lê variáveis CSS diretamente, por isso a paleta é replicada aqui.
  const PALETA = ["#c9a227", "#8a8a93", "#6f6f78", "#55555e", "#3d3d44", "#2c2c32", "#1f1f25"];

  function corDaFatia(indice) {
    return PALETA[indice] || PALETA[PALETA.length - 1];
  }

  /**
   * Redesenha o gráfico dentro do <canvas> informado.
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{id:string, percentual:number}>} alocacoes - já ordenadas
   *   da maior para a menor fatia por quem chama.
   */
  function desenhar(canvas, alocacoes) {
    if (!canvas || typeof canvas.getContext !== "function") return; // navegador sem suporte a canvas

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Escala para telas de alta densidade (Retina) sem perder nitidez.
    const dpr = window.devicePixelRatio || 1;
    const tamanhoCss = canvas.clientWidth || canvas.width;
    canvas.width = tamanhoCss * dpr;
    canvas.height = tamanhoCss * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, tamanhoCss, tamanhoCss);

    if (!alocacoes || alocacoes.length === 0) return; // nada a desenhar; o estado vazio cuida da mensagem

    const centro = tamanhoCss / 2;
    const raioExterno = centro;
    const raioInterno = centro * 0.62; // cria o "buraco" do doughnut
    let anguloInicial = -Math.PI / 2; // começa no topo (12h), sentido horário

    alocacoes.forEach((alocacao, indice) => {
      const fatia = (alocacao.percentual / 100) * Math.PI * 2;
      const anguloFinal = anguloInicial + fatia;

      ctx.beginPath();
      ctx.arc(centro, centro, raioExterno, anguloInicial, anguloFinal);
      ctx.arc(centro, centro, raioInterno, anguloFinal, anguloInicial, true);
      ctx.closePath();
      ctx.fillStyle = corDaFatia(indice);
      ctx.fill();

      anguloInicial = anguloFinal;
    });
  }

  /** Reconstrói a legenda (um item por categoria alocada), na mesma ordem do gráfico. */
  function renderizarLegenda(container, alocacoes, patrimonioTotal) {
    if (!container) return;
    limpar(container);

    alocacoes.forEach((alocacao, indice) => {
      const categoria = DR.obterCategoriaPorId(alocacao.id);
      const nome = categoria ? categoria.nome : alocacao.id;
      const valor = (patrimonioTotal || 0) * (alocacao.percentual / 100);

      const ponto = criarEl("span", { class: "dot" });
      ponto.style.setProperty("--dot-color", corDaFatia(indice));

      const item = criarEl("li", {}, [
        criarEl("span", { class: "legend-name" }, [ponto, nome]),
        criarEl("span", { class: "legend-value" }, [`${formatarPercentual(alocacao.percentual)} · ${formatarMoeda(valor)}`]),
      ]);
      container.appendChild(item);
    });
  }

  DR.graficoCanvas = { desenhar, renderizarLegenda, corDaFatia };
})((window.DR = window.DR || {}));
