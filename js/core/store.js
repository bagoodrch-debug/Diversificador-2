/**
 * Distribui Rico — core/store.js
 * -----------------------------------------------------------------------
 * Estado central da aplicação usando o padrão pub/sub: qualquer módulo
 * pode reagir a mudanças de estado sem conhecer quem mais está ouvindo.
 * Isso substitui a reatividade automática que um framework daria de graça.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  /** Cria uma store isolada a partir de um estado inicial. */
  function criarStore(estadoInicial) {
    let estado = { ...estadoInicial };
    const assinantes = new Set();

    function getState() {
      return estado;
    }

    /** Mescla parcialmente o estado e notifica todos os assinantes. */
    function setState(parcial) {
      estado = { ...estado, ...parcial };
      assinantes.forEach((callback) => {
        try {
          callback(estado);
        } catch (erro) {
          // Um erro em um assinante nunca deve derrubar os demais.
          console.error("[store] Erro ao notificar um assinante:", erro);
        }
      });
    }

    /** Registra um callback chamado a cada mudança de estado. Devolve uma função de cancelamento. */
    function subscribe(callback) {
      assinantes.add(callback);
      return () => assinantes.delete(callback);
    }

    return { getState, setState, subscribe };
  }

  DR.criarStore = criarStore;
})((window.DR = window.DR || {}));
