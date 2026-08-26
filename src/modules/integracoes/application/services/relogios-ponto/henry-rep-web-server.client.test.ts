import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { HenryRepWebServerClient } from "./henry-rep-web-server.client";

const servidores: net.Server[] = [];

function xorChecksum(buffer: Buffer) {
  let checksum = 0;

  for (const byte of buffer) {
    checksum ^= byte;
  }

  return checksum;
}

function montarPacote(payload: string, checksumValido = true) {
  const corpo = Buffer.from(payload, "latin1");
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16LE(corpo.length, 0);
  const checksum = xorChecksum(Buffer.concat([tamanho, corpo]));

  return Buffer.concat([
    Buffer.from([0x02]),
    tamanho,
    corpo,
    Buffer.from([checksumValido ? checksum : checksum ^ 0xff, 0x03]),
  ]);
}

async function criarServidorFake(
  responder: (payload: string) => string | null,
) {
  const servidor = net.createServer((socket) => {
    socket.on("data", (chunk) => {
      const tamanho = chunk.readUInt16LE(1);
      const payload = chunk.subarray(3, 3 + tamanho).toString("latin1");
      const resposta = responder(payload);

      if (resposta) {
        socket.write(montarPacote(resposta, false));
      }
    });
  });

  servidores.push(servidor);

  await new Promise<void>((resolve) => {
    servidor.listen(0, "127.0.0.1", resolve);
  });

  const endereco = servidor.address();

  if (!endereco || typeof endereco === "string") {
    throw new Error("Servidor fake sem porta TCP.");
  }

  return endereco.port;
}

function criarClient(porta: number) {
  return new HenryRepWebServerClient({
    equipamentoId: "teste",
    codigo: "HENRY_REP_TESTE",
    fabricante: "HENRY",
    modelo: "REP Web Server",
    ip: "127.0.0.1",
    porta,
    timeoutMs: 3000,
    configuracao: {
      protocolo: "HENRY_REP_WEB_SERVER",
      timeoutMs: 3000,
      quantidadeMaximaColeta: 20,
    },
  });
}

afterEach(async () => {
  await Promise.all(
    servidores.splice(0).map(
      (servidor) =>
        new Promise<void>((resolve) => servidor.close(() => resolve())),
    ),
  );
});

describe("HenryRepWebServerClient", () => {
  it("consulta status mesmo quando o firmware retorna status 000", async () => {
    const porta = await criarServidorFake((payload) => {
      if (payload.includes("+RQ+00+U")) return "01+RQ+000+U]620";
      if (payload.includes("+RQ+00+R")) return "02+RQ+000+R]259952";
      if (payload.includes("+RH+00")) {
        return "03+RH+000+21/07/26 17:26:47]00/00/00]00/00/00";
      }
      if (payload.includes("+RE+00+T]1")) {
        return "04+RE+000+1]05424667000135]            ]Justiça Federal de 1ª Instância]Prédio Sede";
      }

      return "99+ER+010";
    });

    const saude = await criarClient(porta).testarConexao();

    expect(saude.status).toBe("ONLINE");
    expect(saude.quantidadeUsuarios).toBe(620);
    expect(saude.quantidadeRegistros).toBe(259952);
    expect(saude.detalhes).toEqual(
      expect.objectContaining({
        protocolo: "HENRY_REP_WEB_SERVER",
        empregador: expect.objectContaining({
          cnpj: "05424667000135",
          razaoSocial: "Justiça Federal de 1ª Instância",
        }),
      }),
    );
  });

  it("coleta marcacoes AFD legado por NSR usando N quantidade e NSR", async () => {
    let comandoRecebido = "";
    const porta = await criarServidorFake((payload) => {
      comandoRecebido = payload;

      return [
        "01+RR+000+00003]",
        "0002599003200720261904019048899136",
        "0002599013200720262021012064778685",
        "0002599025100220161712I012449036484RICARDO LUIS DA SILVA",
      ].join("\r\n");
    });

    const coleta = await criarClient(porta).coletarMarcacoesDesdeNsr({
      nsrInicial: 259900,
      quantidade: 3,
    });

    expect(comandoRecebido).toContain("+RR+00+N]3]259900");
    expect(coleta.proximoNsr).toBe("259903");
    expect(coleta.marcacoes).toHaveLength(2);
    expect(coleta.marcacoes[0]).toEqual(
      expect.objectContaining({
        nsr: "000259900",
        pis: "19048899136",
      }),
    );
  });

  it("nao marca como online quando nenhum comando de status responde", async () => {
    const porta = await criarServidorFake(() => "99+ER+010");
    const saude = await criarClient(porta).testarConexao();

    expect(saude.status).toBe("OFFLINE");
    expect(saude.mensagem).toContain("Comando desconhecido");
  });
});
