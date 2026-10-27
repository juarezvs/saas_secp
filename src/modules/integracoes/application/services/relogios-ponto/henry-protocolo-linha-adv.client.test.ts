import crypto from "node:crypto";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { HenryProtocoloLinhaAdvClient } from "./henry-protocolo-linha-adv.client";

const fechar: Array<() => Promise<void>> = [];
afterEach(async () => { for (const fn of fechar.splice(0)) await fn(); });

function pacote(texto: string, chave: Buffer) {
  const iv = Buffer.alloc(16, 1);
  const cipher = crypto.createCipheriv("aes-128-cbc", chave, iv);
  cipher.setAutoPadding(false);
  const corpo = Buffer.from(texto, "latin1");
  const padded = Buffer.concat([corpo, Buffer.alloc((16 - corpo.length % 16) % 16)]);
  const payload = Buffer.concat([iv, cipher.update(padded), cipher.final()]);
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16LE(payload.length);
  const bytes = Buffer.concat([tamanho, payload]);
  return Buffer.concat([Buffer.from([2]), bytes, Buffer.from([bytes.reduce((a, b) => a ^ b, 0), 3])]);
}

async function equipamento(responder: (socket: net.Socket, chave: Buffer) => void) {
  const chave = Buffer.alloc(16, 7);
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("data", () => responder(socket, chave));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  fechar.push(() => new Promise<void>((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(() => resolve());
  }));
  const client = new HenryProtocoloLinhaAdvClient({
    equipamentoId: "teste", codigo: "teste", fabricante: "HENRY",
    ip: "127.0.0.1", porta: (server.address() as net.AddressInfo).port, timeoutMs: 100,
  });
  // Sessão já autenticada: exercita a coleta e o transporte AES reais.
  Object.assign(client, { autenticado: true, aesKey: chave });
  return client;
}

const linha = "00000714632026-10-26T07:49:00-05000123456789094224";

describe("coleta Henry Linha ADV", () => {
  it("aguarda o RR correspondente mesmo com evento online e resposta antiga no mesmo chunk", async () => {
    const client = await equipamento((socket, chave) => {
      const resposta = Buffer.concat([
        pacote("95+REON+00+EV[00000715932610202618480123456789094224", chave),
        pacote("99+RR+00+1]00000999962026-10-26T23:21:00-0500", chave),
        pacote(`01+RR+00+1]${linha}`, chave),
      ]);
      socket.write(resposta.subarray(0, 9));
      setTimeout(() => socket.write(resposta.subarray(9)), 5);
    });
    const resultado = await client.coletarMarcacoesDesdeNsr({ nsrInicial: 7146, quantidade: 1 });
    expect(resultado.proximoNsr).toBe("7147");
    expect(resultado.marcacoes).toHaveLength(1);
    expect(resultado.marcacoes[0].nsr).toBe("000007146");
  });

  it("nao aceita evento online com o mesmo indice da consulta como pagina de coleta", async () => {
    const client = await equipamento((socket, chave) => {
      socket.write(pacote("01+REON+00+EV[00000715932610202618480123456789094224", chave));
      setTimeout(() => socket.write(pacote(`01+RR+00+1]${linha}`, chave)), 5);
    });
    expect(await client.coletarMarcacoesDesdeNsr({ nsrInicial: 7146 })).toMatchObject({
      proximoNsr: "7147", marcacoes: [{ nsr: "000007146" }],
    });
  });

  it("aceita resposta correspondente sem registros sem avancar o cursor", async () => {
    const client = await equipamento((socket, chave) => socket.write(pacote("01+RR+00+0]", chave)));
    expect(await client.coletarMarcacoesDesdeNsr({ nsrInicial: 7146 })).toMatchObject({
      proximoNsr: null, marcacoes: [],
    });
  });
});
