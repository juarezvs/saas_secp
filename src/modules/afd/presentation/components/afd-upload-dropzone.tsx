"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";

type ArquivoSelecionado = {
  file: File;
  id: string;
};

export function AfdUploadDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [arquivos, setArquivos] = useState<ArquivoSelecionado[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [equipamentoCodigo, setEquipamentoCodigo] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function adicionarArquivos(fileList: FileList | null) {
    if (!fileList) return;

    const novos = Array.from(fileList).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${file.lastModified}`,
    }));

    setArquivos((atuais) => {
      const ids = new Set(atuais.map((item) => item.id));
      return [...atuais, ...novos.filter((item) => !ids.has(item.id))];
    });

    setMensagem(null);
    setErro(null);
  }

  function removerArquivo(id: string) {
    setArquivos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function limpar() {
    setArquivos([]);
    setProgresso(0);
    setMensagem(null);
    setErro(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function enviar() {
    if (arquivos.length === 0) {
      setErro("Selecione pelo menos um arquivo AFD.");
      return;
    }

    setEnviando(true);
    setErro(null);
    setMensagem(null);
    setProgresso(0);

    const formData = new FormData();

    if (equipamentoCodigo.trim()) {
      formData.append("equipamentoCodigo", equipamentoCodigo.trim());
    }

    for (const item of arquivos) {
      formData.append("files", item.file);
    }

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentual = Math.round((event.loaded / event.total) * 100);
        setProgresso(percentual);
      }
    };

    xhr.onload = () => {
      setEnviando(false);

      try {
        const resposta = JSON.parse(xhr.responseText) as {
          sucesso: boolean;
          mensagem?: string;
          importacaoId?: string;
          arquivosRecebidos?: number;
          arquivosEnfileirados?: number;
        };

        if (xhr.status >= 200 && xhr.status < 300 && resposta.sucesso) {
          setProgresso(100);
          setMensagem(
            `${resposta.mensagem ?? "Upload concluído."} Arquivos recebidos: ${
              resposta.arquivosRecebidos ?? arquivos.length
            }. Enfileirados: ${resposta.arquivosEnfileirados ?? 0}.`,
          );
          setArquivos([]);
          router.refresh();
          return;
        }

        setErro(resposta.mensagem ?? "Erro ao enviar arquivos.");
      } catch {
        setErro("Erro inesperado ao processar resposta do servidor.");
      }
    };

    xhr.onerror = () => {
      setEnviando(false);
      setErro("Falha de rede ao enviar arquivos.");
    };

    xhr.open("POST", "/api/afd/upload");
    xhr.send(formData);
  }

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Enviar arquivos AFD</h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Arraste múltiplos arquivos para a área abaixo ou selecione manualmente.
      </p>

      <div className="mt-5">
        <label className="text-sm font-semibold">Código do equipamento</label>

        <input
          value={equipamentoCodigo}
          onChange={(event) => setEquipamentoCodigo(event.target.value)}
          placeholder="Opcional. Ex.: BIO-NUTEC-01"
          className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
        />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(event) => {
          event.preventDefault();
          setArrastando(false);
          adicionarArquivos(event.dataTransfer.files);
        }}
        className={`mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
          arrastando
            ? "border-blue-700 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
            : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--card)]"
        }`}
      >
        <UploadCloud className="size-10" aria-hidden="true" />

        <p className="mt-3 font-semibold">Arraste os arquivos AFD para cá</p>

        <p className="mt-1 text-sm">
          ou clique para selecionar arquivos .afd, .txt ou .csv
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".afd,.txt,.csv"
          className="hidden"
          onChange={(event) => adicionarArquivos(event.target.files)}
        />
      </div>

      {arquivos.length > 0 && (
        <div className="mt-5 rounded-xl border">
          <div className="flex items-center justify-between border-b p-4">
            <p className="font-semibold">
              Arquivos selecionados ({arquivos.length})
            </p>

            <button
              type="button"
              onClick={limpar}
              disabled={enviando}
              className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Limpar
            </button>
          </div>

          <div className="divide-y">
            {arquivos.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileUp className="size-4 shrink-0 text-blue-900 dark:text-blue-300" />

                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.file.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removerArquivo(item.id)}
                  disabled={enviando}
                  className="rounded-md border p-2 transition hover:bg-[var(--muted)] disabled:opacity-50"
                  aria-label={`Remover ${item.file.name}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(enviando || progresso > 0) && (
        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>{enviando ? "Enviando..." : "Upload concluído"}</span>
            <span>{progresso}%</span>
          </div>

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-blue-900 transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {mensagem && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {erro}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || arquivos.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          Enviar para processamento
        </button>
      </div>
    </section>
  );
}
