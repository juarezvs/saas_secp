import { mkdir, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString=process.env.HORAS_EXTRAS_TEST_DATABASE_URL;
if(!connectionString)throw new Error("Defina a URL do PostgreSQL descartável de testes.");
const target=new URL(connectionString);
if(!["localhost","127.0.0.1"].includes(target.hostname)||!/^\/secp_he_test_[a-z0-9_]+$/.test(target.pathname))throw new Error("Permitido somente banco local descartável secp_he_test_*. Nenhum reset é executado.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString})});
try {
 const org=await db.orgao.upsert({where:{sigla:"HE_UI_TEST"},update:{},create:{sigla:"HE_UI_TEST",nome:"Órgão fictício para teste de interface"}});
 const unit=await db.unidadeOrganizacional.upsert({where:{orgaoId_codigo:{orgaoId:org.id,codigo:"HE_UI_TEST_UNIT"}},update:{},create:{orgaoId:org.id,codigo:"HE_UI_TEST_UNIT",sigla:"HE_UI",nome:"Vara fictícia E2E",tipo:"VARA"}});
 const admin=await db.usuario.upsert({where:{matricula:"he_ui_admin"},update:{},create:{matricula:"he_ui_admin",nome:"Administrador fictício E2E",tipo:"SISTEMA",senhaHash:await hash("e2e-he-local-only",10)}});
 const profile=await db.perfil.upsert({where:{codigo:"MASTER"},update:{},create:{codigo:"MASTER",nome:"Administrador de teste",sistema:true,administrativo:true,global:true}});
 if(!await db.usuarioPerfil.count({where:{usuarioId:admin.id,perfilId:profile.id}}))await db.usuarioPerfil.create({data:{usuarioId:admin.id,perfilId:profile.id}});
 for(const [action,scope] of [["visualizar","proprio"],["solicitar","proprio"],["analisar","seccional"],["analisar","chefia"],["responder-orcamento","seccional"],["deliberar","seccional"],["configurar-politica","seccional"],["visualizar-execucao","seccional"],["reprocessar","global"],["visualizar-folha","global"],["gerar-lote","global"],["validar-remuneracao","seccional"],["validar-rubrica","seccional"],["fechar-lote","global"],["cadastrar-autorizacao","seccional"]]) {
  const code=`horas-extras:${action}:${scope}`;
  const permission=await db.permissao.upsert({where:{codigo:code},update:{},create:{codigo:code,recurso:"horas-extras",acao:action,escopo:scope}});
  await db.perfilPermissao.upsert({where:{perfilId_permissaoId:{perfilId:profile.id,permissaoId:permission.id}},update:{},create:{perfilId:profile.id,permissaoId:permission.id}});
 }
 const readerHash=await hash("e2e-he-read-only",10);
 const user=await db.usuario.upsert({where:{matricula:"HE_UI_0001"},update:{senhaHash:readerHash},create:{matricula:"HE_UI_0001",nome:"Servidor Fictício E2E",senhaHash:readerHash}});
 const reader=await db.perfil.upsert({where:{codigo:"HE_UI_READER"},update:{},create:{codigo:"HE_UI_READER",nome:"Consulta própria de teste",orgaoId:org.id}});
 const readPermission=await db.permissao.findUniqueOrThrow({where:{codigo:"horas-extras:visualizar:proprio"}});
 await db.perfilPermissao.upsert({where:{perfilId_permissaoId:{perfilId:reader.id,permissaoId:readPermission.id}},update:{},create:{perfilId:reader.id,permissaoId:readPermission.id}});
 if(!await db.usuarioPerfil.count({where:{usuarioId:user.id,perfilId:reader.id}}))await db.usuarioPerfil.create({data:{usuarioId:user.id,perfilId:reader.id,orgaoId:org.id}});
 const employee=await db.servidor.upsert({where:{matricula:"HE_UI_0001"},update:{},create:{usuarioId:user.id,orgaoId:org.id,matricula:"HE_UI_0001"}});
 if(!await db.lotacao.count({where:{servidorId:employee.id,unidadeId:unit.id}}))await db.lotacao.create({data:{servidorId:employee.id,unidadeId:unit.id,dataInicio:new Date("2026-01-01Z")}});
 if(!await db.gestorUnidade.count({where:{servidorId:employee.id,unidadeId:unit.id}}))await db.gestorUnidade.create({data:{servidorId:employee.id,unidadeId:unit.id,papel:"GESTOR_TITULAR",dataInicio:new Date("2026-01-01Z")}});
 const jornada=await db.jornada.upsert({where:{codigo:"HE_UI_8H"},update:{},create:{orgaoId:org.id,codigo:"HE_UI_8H",nome:"Jornada fictícia 8h",tipo:"OITO_HORAS",cargaDiariaMinutos:480,horarioEntradaPadrao:"08:00",horarioSaidaPadrao:"16:00",permiteHoraExtra:true}});
 if(!await db.jornadaServidor.count({where:{servidorId:employee.id,jornadaId:jornada.id}}))await db.jornadaServidor.create({data:{servidorId:employee.id,jornadaId:jornada.id,dataInicio:new Date("2026-01-01Z")}});
 if(!await db.movimentoBancoHoras.count({where:{servidorId:employee.id}}))await db.movimentoBancoHoras.create({data:{servidorId:employee.id,tipo:"CREDITO",status:"VALIDADO",minutos:0,saldoAposMovimento:0,dataReferencia:new Date("2026-09-30Z"),anoReferencia:2026,mesReferencia:9,observacao:"Saldo inteiramente fictício para E2E"}});
 if(process.argv.includes("--marcacoes"))for(const [time,tipo] of [["08:00","ENTRADA"],["18:00","SAIDA"]] as const)if(!await db.marcacao.count({where:{servidorId:employee.id,tipo,observacao:"E2E_FICTICIO_HE"}}))await db.marcacao.create({data:{servidorId:employee.id,tipo,fonte:"WEB",dataReferencia:new Date("2026-10-22Z"),dataHora:new Date(`2026-10-22T${time}:00-04:00`),observacao:"E2E_FICTICIO_HE"}});
 await mkdir(".tmp",{recursive:true});await writeFile(".tmp/campanha-ui-fixture.json",JSON.stringify({orgaoId:org.id,unitId:unit.id,employeeId:employee.id,adminUserId:admin.id},null,2));
 process.stdout.write("Fixture de interface preparada exclusivamente no banco descartável de testes.\n");
}finally{await db.$disconnect();}
