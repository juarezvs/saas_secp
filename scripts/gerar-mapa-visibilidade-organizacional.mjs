import { readFileSync, writeFileSync } from 'node:fs';

// Relações públicas do schema; não depende de estruturas internas do Prisma Client.
const schema = readFileSync('prisma/schema.prisma', 'utf8');
const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
const names = new Set(models.map(m => m[1]));
const map = {};
for (const [, name, body] of models) {
  const relations = {};
  const owned = [];
  for (const line of body.split('\n')) {
    const field = line.match(/^\s+(\w+)\s+(\w+)(\[\]|\?)?(?:\s|$)/);
    if (!field || !names.has(field[2])) continue;
    const [, key, target, modifier] = field;
    relations[key] = { model: target, list: modifier === '[]', optional: modifier === '?' };
    if (line.includes('fields:') && ['Orgao','UnidadeOrganizacional','Servidor','EquipamentoBiometrico'].includes(target)) owned.push(key);
  }
  if (name === 'Usuario') owned.push('servidor');
  map[name] = { relations, owned };
}
const content = '// Gerado por scripts/gerar-mapa-visibilidade-organizacional.mjs a partir do schema Prisma.\n' +
  'export type RelacaoOrganizacional = { model: string; list: boolean; optional: boolean };\n' +
  'export const modelosOrganizacionais: Record<string, { relations: Record<string, RelacaoOrganizacional>; owned: string[] }> = {\n' +
  Object.entries(map).map(([name, value]) => `  ${name}: ${JSON.stringify(value)},`).join('\n') + '\n};\n';
const target = 'src/shared/infrastructure/database/modelos-organizacionais.ts';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error('Mapa organizacional desatualizado. Execute node scripts/gerar-mapa-visibilidade-organizacional.mjs');
} else {
  writeFileSync(target, content);
}
