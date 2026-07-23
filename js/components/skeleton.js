/**
 * Distribui Rico — components/skeleton.js
 * -----------------------------------------------------------------------
 * Skeleton loading: mostra blocos cinza com efeito "shimmer" no lugar do
 * conteúdo real enquanto ele é recalculado. É visualmente diferente do
 * spinner de loading.js (usado para chamadas de rede, como a busca de
 * cotação) — aqui o objetivo é comunicar "o layout já está pronto, só o
 * dado está sendo montado", o padrão usado por produtos como Kinvo/Notion.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  /**
   * Substitui o conteúdo de `container` por N blocos de skeleton, guardando
   * o HTML original em um atributo de dados para restaurar depois.
   */
  function mostrar(container, linhas) {
    if (!container || container.dataset.skeletonAtivo === "true") return;

    container.dataset.skeletonAtivo = "true";
    container.setAttribute("aria-busy", "true");

    const wrapper = document.createElement("div");
    wrapper.className = "skeleton-group";
    const total = linhas || 3;
    for (let i = 0; i < total; i++) {
      const linha = document.createElement("div");
      linha.className = "skeleton-block";
      wrapper.appendChild(linha);
    }

    // Guarda os filhos atuais fora do DOM (não como string) para restaurar
    // com segurança depois, sem passar por innerHTML.
    container.__conteudoOriginal = Array.from(container.childNodes);
    container.__conteudoOriginal.forEach((no) => no.remove());
    container.appendChild(wrapper);
  }

  /** Restaura o conteúdo original de `container`, removendo o skeleton. */
  function esconder(container) {
    if (!container || container.dataset.skeletonAtivo !== "true") return;

    delete container.dataset.skeletonAtivo;
    container.removeAttribute("aria-busy");

    const grupo = container.querySelector(".skeleton-group");
    if (grupo) grupo.remove();

    (container.__conteudoOriginal || []).forEach((no) => container.appendChild(no));
    container.__conteudoOriginal = null;
  }

  /** Mostra o skeleton por, no mínimo, `minMs`, então executa `tarefa` e restaura. */
  async function comSkeleton(container, linhas, tarefa, minMs) {
    mostrar(container, linhas);
    const inicio = Date.now();
    try {
      return await tarefa();
    } finally {
      const decorrido = Date.now() - inicio;
      const restante = Math.max(0, (minMs || 350) - decorrido);
      setTimeout(() => esconder(container), restante);
    }
  }

  DR.skeleton = { mostrar, esconder, comSkeleton };
})((window.DR = window.DR || {}));
