import net from "node:net";

export type DockerContainerHealth = {
  containerName: string;
  disponivel: boolean;
  running: boolean;
  status: string | null;
  health: string | null;
  restartCount: number | null;
  startedAt: Date | null;
  erro?: string;
};

const DOCKER_SOCKET_PATH =
  process.env.DOCKER_SOCKET_PATH ?? "/var/run/docker.sock";

function dockerHttpGet(path: string) {
  return new Promise<string>((resolve, reject) => {
    const socket = net.createConnection(DOCKER_SOCKET_PATH);
    let response = "";

    socket.setTimeout(2000);

    socket.on("connect", () => {
      socket.write(
        [
          `GET ${path} HTTP/1.1`,
          "Host: docker",
          "Connection: close",
          "",
          "",
        ].join("\r\n"),
      );
    });

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
    });

    socket.on("end", () => {
      const [header = "", body = ""] = response.split(/\r\n\r\n/);
      const isChunked = /transfer-encoding:\s*chunked/i.test(header);
      resolve(isChunked ? decodificarChunked(body) : body);
    });

    socket.on("timeout", () => {
      socket.destroy(new Error("Tempo limite ao consultar o Docker."));
    });

    socket.on("error", reject);
  });
}

function decodificarChunked(body: string) {
  let restante = body;
  let decodificado = "";

  while (restante.length > 0) {
    const fimTamanho = restante.indexOf("\r\n");
    if (fimTamanho < 0) break;

    const tamanhoHex = restante.slice(0, fimTamanho).trim();
    const tamanho = Number.parseInt(tamanhoHex, 16);

    if (!Number.isFinite(tamanho) || tamanho <= 0) {
      break;
    }

    const inicioChunk = fimTamanho + 2;
    decodificado += restante.slice(inicioChunk, inicioChunk + tamanho);
    restante = restante.slice(inicioChunk + tamanho + 2);
  }

  return decodificado;
}

export async function obterSaudeContainerDocker(
  containerName: string,
): Promise<DockerContainerHealth> {
  try {
    const body = await dockerHttpGet(
      `/containers/${encodeURIComponent(containerName)}/json`,
    );
    const payload = JSON.parse(body) as {
      State?: {
        Status?: string;
        Running?: boolean;
        StartedAt?: string;
        Health?: {
          Status?: string;
        };
      };
      RestartCount?: number;
    };
    const startedAt = payload.State?.StartedAt
      ? new Date(payload.State.StartedAt)
      : null;

    return {
      containerName,
      disponivel: true,
      running: Boolean(payload.State?.Running),
      status: payload.State?.Status ?? null,
      health: payload.State?.Health?.Status ?? null,
      restartCount:
        typeof payload.RestartCount === "number" ? payload.RestartCount : null,
      startedAt:
        startedAt && Number.isFinite(startedAt.getTime()) ? startedAt : null,
    };
  } catch (error) {
    return {
      containerName,
      disponivel: false,
      running: false,
      status: null,
      health: null,
      restartCount: null,
      startedAt: null,
      erro: error instanceof Error ? error.message : String(error),
    };
  }
}
