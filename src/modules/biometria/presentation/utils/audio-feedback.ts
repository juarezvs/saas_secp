"use client";

export function falar(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.95;
  fala.pitch = 1;
  fala.volume = 1;

  window.speechSynthesis.speak(fala);
}

export function emitirTomSucesso() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const contexto = new AudioContextClass();
  const oscilador = contexto.createOscillator();
  const ganho = contexto.createGain();

  oscilador.type = "sine";
  oscilador.frequency.value = 880;
  ganho.gain.setValueAtTime(0.001, contexto.currentTime);
  ganho.gain.exponentialRampToValueAtTime(0.16, contexto.currentTime + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.16);
  oscilador.connect(ganho);
  ganho.connect(contexto.destination);
  oscilador.start();
  oscilador.stop(contexto.currentTime + 0.18);
  oscilador.addEventListener("ended", () => {
    void contexto.close();
  });
}
