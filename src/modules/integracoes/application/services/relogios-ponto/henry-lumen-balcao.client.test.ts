import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { HenryLumenBalcaoClient } from "./henry-lumen-balcao.client";

const fechar: Array<() => Promise<void>> = [];
afterEach(async () => { for (const fn of fechar.splice(0)) await fn(); });

function pacote(corpo: string) {
  const texto = Buffer.from(corpo, "latin1");
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16LE(texto.length);
  const bytes = Buffer.concat([tamanho, texto]);
  const checksum = bytes.reduce((acc, byte) => acc ^ byte, 0);
  return Buffer.concat([Buffer.from([2]), bytes, Buffer.from([checksum, 3])]);
}

async function equipamento(responder: (corpo: string, socket: net.Socket) => void) {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 5) {
        const tamanho = buffer.readUInt16LE(1);
        if (buffer.length < tamanho + 5) break;
        const corpo = buffer.subarray(3, tamanho + 3).toString("latin1");
        buffer = buffer.subarray(tamanho + 5);
        responder(corpo, socket);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  fechar.push(() => new Promise<void>((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(() => resolve());
  }));
  const address = server.address() as net.AddressInfo;
  return new HenryLumenBalcaoClient({
    equipamentoId: "teste", codigo: "teste", fabricante: "HENRY",
    ip: "127.0.0.1", porta: address.port, timeoutMs: 100,
  });
}

describe("coleta Henry Primme/Lumen", () => {
  it("limita o lote para evitar respostas truncadas nos Henry 8X antigos", async () => {
    const comandos: string[] = [];
    const client = await equipamento((corpo, socket) => {
      comandos.push(corpo);
      socket.write(pacote("01+RR+00+1]000000120[006[1234[16/10/2026 10:35:59[1[0[04[0"));
    });
    await client.coletarMarcacoesDesdeNsr({ nsrInicial: 120, quantidade: 500 });
    expect(comandos).toEqual(["01+RR+00+T]10]120"]);
  });
  it("envia quantidade antes do indice e avanca a partir do ultimo registro recebido", async () => {
    const comandos: string[] = [];
    const client = await equipamento((corpo, socket) => {
      comandos.push(corpo);
      socket.write(pacote("01+RR+000+2]000090521[006[1234[16/10/2026 10:35:59[1[0[04[0]000090522[006[1234[16/10/2026 10:38:51[1[0[04[0"));
    });
    const resultado = await client.coletarMarcacoesDesdeNsr({ nsrInicial: 90521, quantidade: 2 });
    expect(comandos).toEqual(["01+RR+00+T]2]90521"]);
    expect(resultado.marcacoes).toHaveLength(2);
    expect(resultado.proximoNsr).toBe("90523");
  });

  it("separa pacotes TCP e ignora eventos online e respostas de outra consulta", async () => {
    const client = await equipamento((_, socket) => {
      const resposta = Buffer.concat([
        pacote("95+REON+00+evento online"), pacote("99+RR+00+evento antigo"),
        pacote("01+RR+00+1]000000120[006[1234[16/10/2026 10:35:59[1[0[04[0"),
      ]);
      socket.write(resposta.subarray(0, 9));
      setTimeout(() => socket.write(resposta.subarray(9)), 5);
    });
    const resultado = await client.coletarMarcacoesDesdeNsr({ nsrInicial: 120, quantidade: 1 });
    expect(resultado.marcacoes).toHaveLength(1);
    expect(resultado.proximoNsr).toBe("121");
  });

  it("rejeita pagina antiga para nao regredir silenciosamente o cursor", async () => {
    const client = await equipamento((_, socket) => socket.write(pacote("01+RR+00+1]000000050[006[1234[16/10/2026 10:35:59[1[0[04[0")));
    await expect(client.coletarMarcacoesDesdeNsr({ nsrInicial: 120 })).rejects.toThrow("cursor de coleta preservado");
  });

  it("aceita resposta sem registros sem reiniciar o cursor", async () => {
    const client = await equipamento((_, socket) => socket.write(pacote("01+RR+01")));
    expect(await client.coletarMarcacoesDesdeNsr({ nsrInicial: 120 })).toMatchObject({ marcacoes: [], proximoNsr: null });
  });

  it("indica offline quando nao recebe resposta efetiva", async () => {
    const client = await equipamento(() => {});
    expect(await client.testarConexao()).toMatchObject({ status: "OFFLINE" });
  });
});
