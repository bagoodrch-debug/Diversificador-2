/**
 * Distribui Rico — components/loading.js
 * -----------------------------------------------------------------------
 * Overlay de carregamento reutilizável. O container recebido precisa ter
 * `position: relative` (já garantido em components.css para #resultados
 * e .chart-card).
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { criarEl } = DR.dom;

  /** Mostra um overlay de carregamento sobre `container`, se ainda não houver um. */
  function mostrar(container, mensagem) {
    if (!container || container.querySelector(".loading-overlay")) return;

    const overlay = criarEl(
      "div",
      { class: "loading-overlay", role: "status", "aria-live": "polite" },
      [criarEl("span", { class: "spinner", "aria-hidden": "true" }), criarEl("span", { class: "loading-texto" }, [mensagem || "Calculando..."])]
    );

    container.appendChild(overlay);
  }

  /** Remove o overlay de carregamento de `container`, se existir. */
  function esconder(container) {
    const overlay = container && container.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
  }

  /**
   * Executa `tarefa` mostrando o overlay por, no mínimo, `minMs` — evita o
   * "flash" de um loading que aparece e some instantaneamente, o que
   * pareceria um bug em vez de uma confirmação visual do cálculo.
   */
  async function comLoading(container, mensagem, tarefa, minMs) {
    mostrar(container, mensagem);
    const inicio = Date.now();
    try {
      return await tarefa();
    } finally {
      const decorrido = Date.now() - inicio;
      const restante = Math.max(0, (minMs || 400) - decorrido);
      setTimeout(() => esconder(container), restante);
    }
  }

  DR.loading = { mostrar, esconder, comLoading };
})((window.DR = window.DR || {}));
