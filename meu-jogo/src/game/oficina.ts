import { escreverDiario } from './diarioPessoal.ts';
import { diaDaSemana } from './calendario.ts';

/**
 * OFICINA — inspeção, clientes, reputação, carga de trabalho e dia livre.
 *
 * O quebra-cabeça de encaixe continua sendo a parte de habilidade. O que este
 * módulo acrescenta é o serviço em volta dele: olhar o aparelho antes de abrir,
 * dizer qual é a falha, combinar um preço, lembrar de quem é o aparelho e
 * aceitar (ou não) mais um contrato no mesmo dia.
 *
 * Nada aqui escreve saldo, e nada aqui puni o jogador com número: errar o
 * diagnóstico rende um ajuste pequeno no pagamento e uma fala; trabalhar demais
 * rende texto, nunca dano, energia ou bloqueio. Um dia livre é uma escolha que
 * o jogo reconhece, não uma recompensa a ser otimizada.
 */
export type Falha = 'capacitor' | 'cabo' | 'fusivel' | 'bateria' | 'solda' | 'placa';
export interface ContextoOficina {
  dia: number;
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export const FALHAS: Record<Falha, { nome: string; conserto: string }> = {
  capacitor: { nome: 'Capacitor estufado', conserto: 'Troquei o capacitor e limpei o que vazou em volta.' },
  cabo: { nome: 'Cabo rompido', conserto: 'O cabo estava partido dentro da capa. Refiz o trecho.' },
  fusivel: { nome: 'Fusível queimado', conserto: 'Fusível aberto. Troquei e conferi por que ele queimou.' },
  bateria: { nome: 'Bateria viciada', conserto: 'A bateria não segurava carga. Substituí e testei duas vezes.' },
  solda: { nome: 'Solda fria', conserto: 'Uma solda estava fria e abria com o calor. Refiz o ponto.' },
  placa: { nome: 'Trilha da placa', conserto: 'Uma trilha da placa estava interrompida. Fiz a ponte e isolei.' },
};
export const ORDEM_DE_FALHA: readonly Falha[] = ['capacitor', 'cabo', 'fusivel', 'bateria', 'solda', 'placa'];

export interface Sintoma { id: string; falha: Falha; relato: string; pistas: readonly string[] }
/** Dois sintomas por falha: o mesmo aparelho pode chegar com histórias diferentes. */
export const SINTOMAS: readonly Sintoma[] = [
  { id: 'estufado_liga_desliga', falha: 'capacitor', relato: 'Liga, fica dois minutos bom e desliga sozinho. Depois demora para ligar de novo.',
    pistas: ['A fonte esquenta antes de desligar.', 'Há um cheiro doce perto da placa de alimentação.', 'Um componente cilíndrico está com a tampa saltada.'] },
  { id: 'estufado_chia', falha: 'capacitor', relato: 'Começou a chiar baixinho e a imagem treme quando o som aumenta.',
    pistas: ['O chiado acompanha o volume.', 'A tensão de saída oscila no multímetro.', 'Há resíduo seco em volta de um cilindro pequeno.'] },
  { id: 'cabo_mexer', falha: 'cabo', relato: 'Funciona quando eu seguro o fio numa certa posição. Se largar, apaga.',
    pistas: ['Mexer no cabo muda o comportamento.', 'A capa está dobrada perto do conector.', 'A continuidade falha quando dobra.'] },
  { id: 'cabo_carrega', falha: 'cabo', relato: 'Só carrega se eu deixar o aparelho numa posição específica em cima da mesa.',
    pistas: ['Outro carregador funciona normalmente.', 'O conector está firme.', 'A malha interna aparece num ponto da capa.'] },
  { id: 'fusivel_mudo', falha: 'fusivel', relato: 'Depois da queda de energia, não deu mais sinal de vida. Nem luz.',
    pistas: ['Não acende nenhuma luz.', 'A tomada e o cabo estão bons.', 'Há um vidro escurecido perto da entrada de força.'] },
  { id: 'fusivel_estalo', falha: 'fusivel', relato: 'Deu um estalo e apagou. Não tem cheiro de queimado forte.',
    pistas: ['O estalo foi único.', 'Não há marca de fuligem na placa.', 'A proteção da entrada abriu.'] },
  { id: 'bateria_cai', falha: 'bateria', relato: 'A carga cai de setenta para dois em poucos minutos, e depois volta.',
    pistas: ['Na tomada funciona bem.', 'A porcentagem dá saltos.', 'A célula está levemente inchada.'] },
  { id: 'bateria_incha', falha: 'bateria', relato: 'Começou a não fechar direito. A tampa dá um estalo quando eu aperto.',
    pistas: ['A tampa deixou de encostar.', 'O aparelho balança apoiado na mesa.', 'A célula aumentou de volume.'] },
  { id: 'solda_esquenta', falha: 'solda', relato: 'Funciona frio. Depois de meia hora começa a falhar, e só volta no dia seguinte.',
    pistas: ['A falha aparece com o aquecimento.', 'Bater de leve na carcaça altera o defeito.', 'Um ponto de solda está fosco e rachado.'] },
  { id: 'solda_batida', falha: 'solda', relato: 'Caiu da bancada. Voltou a funcionar, mas o conector do lado não responde.',
    pistas: ['A queda foi do lado do conector.', 'O conector está mecanicamente firme.', 'Há um ponto de solda aberto no pé do conector.'] },
  { id: 'placa_trilha', falha: 'placa', relato: 'Entrou água. Secou, ligou, e uma parte simplesmente não funciona mais.',
    pistas: ['Há marca de oxidação numa área pequena.', 'Os componentes daquela área estão bons.', 'Uma trilha está esverdeada e interrompida.'] },
  { id: 'placa_reparo', falha: 'placa', relato: 'Já mexeram nele antes. Disseram que era o chip, e eu não acreditei.',
    pistas: ['Há resíduo de fluxo antigo.', 'O chip responde aos testes.', 'Uma trilha ao lado do reparo anterior está aberta.'] },
];

const semente = (texto: string, dia: number): number => {
  let n = Math.abs(Math.trunc(dia)) + 7;
  for (let i = 0; i < texto.length; i++) n = (n * 31 + texto.charCodeAt(i)) % 100003;
  return n;
};
/** O sintoma é determinístico: o mesmo aparelho no mesmo dia chega igual. */
export function sintomaDaVaga(idVaga: string, dia: number): Sintoma {
  return SINTOMAS[semente(idVaga, dia) % SINTOMAS.length]!;
}
/** Quatro hipóteses, sempre com a certa entre elas, em ordem estável. */
export function opcoesDeDiagnostico(sintoma: Sintoma, idVaga: string, dia: number): Falha[] {
  const n = semente(`${idVaga}:${sintoma.id}`, dia);
  const outras = ORDEM_DE_FALHA.filter(f => f !== sintoma.falha);
  const escolhidas: Falha[] = [];
  for (let i = 0; i < 3; i++) escolhidas.push(outras[(n + i * 2) % outras.length]!);
  const lista = [...new Set(escolhidas)];
  for (const f of outras) { if (lista.length >= 3) break; if (!lista.includes(f)) lista.push(f); }
  lista.splice(n % (lista.length + 1), 0, sintoma.falha);
  return lista;
}
export interface Avaliacao { certo: boolean; texto: string; fator: number }
/** Acertar melhora o pagamento; errar reduz um pouco e rende uma observação. */
export function avaliarDiagnostico(sintoma: Sintoma, escolha: Falha): Avaliacao {
  if (escolha === sintoma.falha) {
    return { certo: true, texto: `${FALHAS[sintoma.falha].conserto} O serviço sai limpo porque começou pelo lugar certo.`, fator: 1.15 };
  }
  return { certo: false, fator: 0.85,
    texto: `Era ${FALHAS[sintoma.falha].nome.toLowerCase()}, não ${FALHAS[escolha].nome.toLowerCase()}. Resolvi assim mesmo, gastando mais tempo do que precisava.` };
}

// ------------------------------------------------------------------ preço --
export type Preco = 'baixo' | 'justo' | 'alto';
export const PRECOS: Record<Preco, { nome: string; fator: number; texto: string }> = {
  baixo: { nome: 'Cobrar menos', fator: 0.75, texto: 'Cobrei abaixo do que vale. O cliente reparou e não discutiu.' },
  justo: { nome: 'Cobrar o justo', fator: 1, texto: 'Cobrei o combinado. Ninguém saiu com a sensação de dever nada.' },
  alto: { nome: 'Cobrar mais', fator: 1.3, texto: 'Cobrei acima da tabela. O serviço pagou bem; o cliente ficou quieto.' },
};

// ----------------------------------------------------- clientes recorrentes --
export interface ClienteRecorrente {
  id: string;
  nome: string;
  /** O aparelho muda conforme as visitas: o cliente vai trocando de equipamento. */
  aparelhos: readonly string[];
  /** Uma fala por visita; a última se repete quando as visitas passam da lista. */
  historia: readonly string[];
}
export const CLIENTES: readonly ClienteRecorrente[] = [
  { id: 'dona_ilza', nome: 'Dona Ilza', aparelhos: ['celular', 'celular', 'notebook'], historia: [
    'Meu filho mandou esse aparelho de longe. Eu só uso para ver as fotos dele.',
    'Você mexeu nele da outra vez e durou. Trouxe de novo, sem pressa.',
    'Agora eles me deram esse maior. Não sei ligar, mas não vou dizer isso a eles.',
    'Já sei onde fica sua porta. Isso é bom para mim e ruim para você.',
  ] },
  { id: 'seu_tarcisio', nome: 'Seu Tarcísio', aparelhos: ['notebook', 'notebook', 'console'], historia: [
    'Trabalho com isso aqui há nove anos. Não quero outro; quero esse funcionando.',
    'De novo o mesmo ruído. Eu sei que ele é velho, você não precisa dizer.',
    'Comprei esse de brinquedo para o neto. Falhou na primeira semana.',
    'Vou continuar trazendo. Um dia você me ensina a trocar a peça sozinho.',
  ] },
  { id: 'bel', nome: 'Bel, da quadra', aparelhos: ['console', 'console', 'celular'], historia: [
    'Caiu. Não foi comigo. Mas caiu.',
    'De novo, e de novo não fui eu. Consegue olhar rapidinho?',
    'Esse é da minha irmã. Se ela souber que trouxe aqui, eu morro.',
    'Você já sabe: caiu, não fui eu, e é urgente.',
  ] },
  { id: 'clinica', nome: 'Clínica da rua de cima', aparelhos: ['notebook', 'celular', 'notebook'], historia: [
    'É o computador da recepção. Enquanto ele não volta, a gente anota em papel.',
    'A recepcionista pediu para dizer que dessa vez não foi ela que derrubou café.',
    'Agora é o aparelho de agendamento. Mesma pressa de sempre.',
    'A gente já conta com você no orçamento do mês. Espero que isso seja um elogio.',
  ] },
  { id: 'oficina_bruno', nome: 'Bruno, da madeireira', aparelhos: ['celular', 'notebook', 'notebook'], historia: [
    'Isso cai no serrim todo dia. Não precisa ficar bonito, precisa ligar.',
    'Durou. Eu não elogio à toa, então considera elogiado.',
    'Esse é do escritório. Se sumir dado, o pessoal não recebe.',
    'Você já sabe o que esse pó faz. Faz o que dá.',
  ] },
  { id: 'escola', nome: 'Escola do bairro', aparelhos: ['notebook', 'notebook', 'console'], historia: [
    'É da sala de informática. Temos quatro; três funcionam.',
    'Agora são dois funcionando. A diretora pediu para insistir.',
    'A gente achou esse guardado no depósito. Vale a pena tentar?',
    'As crianças perguntam pelo moço que conserta. Você virou assunto de recreio.',
  ] },
];
export function clienteDaVaga(idVaga: string, dia: number): ClienteRecorrente {
  return CLIENTES[semente(idVaga, dia) % CLIENTES.length]!;
}
export function visitasDoCliente(c: ContextoOficina, id: string): number {
  return Number(c.worldEvents.obter(`oficina:cliente:${id}`) ?? 0);
}
export function registrarVisita(c: ContextoOficina, id: string): number {
  const total = visitasDoCliente(c, id) + 1;
  c.worldEvents.definir(`oficina:cliente:${id}`, total);
  return total;
}
/** O aparelho do cliente evolui com as visitas, sem nunca deixar de existir. */
export function aparelhoDoCliente(cliente: ClienteRecorrente, visitas: number): string {
  return cliente.aparelhos[Math.min(Math.max(0, visitas), cliente.aparelhos.length - 1)]!;
}
export function falaDoCliente(cliente: ClienteRecorrente, visitas: number): string {
  return cliente.historia[Math.min(Math.max(0, visitas), cliente.historia.length - 1)]!;
}

// --------------------------------------------------------------- reputação --
export interface Reputacao { confiabilidade: number; velocidade: number; qualidade: number; preco: number; servicos: number }
export interface ServicoPrestado { completo: boolean; fracaoTempo: number; diagnostico: boolean; preco: Preco }
const somar = (c: ContextoOficina, chave: string, valor: number): void => {
  c.worldEvents.definir(chave, Number(c.worldEvents.obter(chave) ?? 0) + valor);
};
export function registrarServico(c: ContextoOficina, s: ServicoPrestado): void {
  somar(c, 'oficina:servicos', 1);
  if (s.completo) somar(c, 'oficina:completos', 1);
  somar(c, 'oficina:tempo', Math.round(Math.max(0, Math.min(1, s.fracaoTempo)) * 100));
  if (s.diagnostico) somar(c, 'oficina:diagnosticos', 1);
  if (s.preco === 'baixo') somar(c, 'oficina:precoBaixo', 1);
  if (s.preco === 'alto') somar(c, 'oficina:precoAlto', 1);
}
const porcento = (parte: number, total: number, inicial = 50): number =>
  total <= 0 ? inicial : Math.round((parte / total) * 100);
/**
 * Quatro eixos de 0 a 100. Sem serviço nenhum, todos ficam em 50: a cidade
 * ainda não tem opinião formada, e isso não é nem bom nem ruim.
 */
export function reputacao(c: ContextoOficina): Reputacao {
  const servicos = Number(c.worldEvents.obter('oficina:servicos') ?? 0);
  const alto = Number(c.worldEvents.obter('oficina:precoAlto') ?? 0);
  const baixo = Number(c.worldEvents.obter('oficina:precoBaixo') ?? 0);
  return {
    servicos,
    confiabilidade: porcento(Number(c.worldEvents.obter('oficina:completos') ?? 0), servicos),
    velocidade: porcento(Number(c.worldEvents.obter('oficina:tempo') ?? 0), servicos * 100),
    qualidade: porcento(Number(c.worldEvents.obter('oficina:diagnosticos') ?? 0), servicos),
    // Cobrar barato demais e caro demais afastam dos 100 pelo mesmo motivo:
    // preço é o quanto a cidade acha que o combinado se sustenta.
    preco: servicos <= 0 ? 50 : Math.max(0, 100 - Math.round(((alto * 1.4 + baixo) / servicos) * 60)),
  };
}
export function rotuloDeReputacao(r: Reputacao): string {
  if (r.servicos === 0) return 'Ainda sem histórico na cidade.';
  const media = (r.confiabilidade + r.velocidade + r.qualidade + r.preco) / 4;
  if (media >= 80) return 'Falam de você como quem resolve.';
  if (media >= 60) return 'Voltam a procurar, e às vezes indicam.';
  if (media >= 40) return 'Conhecem o seu trabalho. Nem elogio, nem queixa.';
  return 'O serviço aparece, mas ninguém garante nada por você.';
}
/** Reputação alta traz mais serviço no quadro; nunca tira o que já existia. */
export function vagasExtras(c: ContextoOficina): number {
  const r = reputacao(c);
  if (r.servicos < 4) return 0;
  const media = (r.confiabilidade + r.velocidade + r.qualidade + r.preco) / 4;
  return media >= 78 ? 2 : media >= 58 ? 1 : 0;
}

// -------------------------------------------------- carga, excesso e folga --
export const CARGA_PADRAO = 3;
export function cargaEscolhida(c: ContextoOficina): number {
  const n = Number(c.worldEvents.obter('oficina:carga') ?? CARGA_PADRAO);
  return Number.isSafeInteger(n) && n >= 1 && n <= 5 ? n : CARGA_PADRAO;
}
export function definirCarga(c: ContextoOficina, n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 1 || n > 5) return false;
  c.worldEvents.definir('oficina:carga', n);
  return true;
}
export function servicosHoje(c: ContextoOficina): number {
  return c.worldEvents.obter('oficina:diaDosServicos') === c.dia
    ? Number(c.worldEvents.obter('oficina:hoje') ?? 0) : 0;
}
export function registrarServicoDoDia(c: ContextoOficina): number {
  const total = servicosHoje(c) + 1;
  c.worldEvents.definir('oficina:diaDosServicos', c.dia);
  c.worldEvents.definir('oficina:hoje', total);
  const ultimo = Number(c.worldEvents.obter('oficina:ultimoDia') ?? -2);
  c.worldEvents.definir('oficina:seguidos', ultimo === c.dia - 1 ? Number(c.worldEvents.obter('oficina:seguidos') ?? 0) + 1 : 1);
  c.worldEvents.definir('oficina:ultimoDia', c.dia);
  return total;
}
export function diasSeguidosTrabalhando(c: ContextoOficina): number {
  return Number(c.worldEvents.obter('oficina:ultimoDia') ?? -2) >= c.dia - 1
    ? Number(c.worldEvents.obter('oficina:seguidos') ?? 0) : 0;
}
export function acimaDaCarga(c: ContextoOficina): boolean {
  return servicosHoje(c) >= cargaEscolhida(c);
}
/**
 * EXCESSO DE TRABALHO. É texto e registro no caderno, nunca bloqueio: quem quer
 * pegar o quarto serviço do dia pega, e o jogo diz o que isso está custando.
 */
export function comentarioDeExcesso(c: ContextoOficina): string | null {
  const hoje = servicosHoje(c), carga = cargaEscolhida(c), seguidos = diasSeguidosTrabalhando(c);
  if (hoje > carga) {
    if (c.worldEvents.obter('oficina:avisoCarga') !== c.dia) {
      c.worldEvents.definir('oficina:avisoCarga', c.dia);
      escreverDiario(c, `oficina:carga:${c.dia}`, `Aceitei ${hoje} serviços num dia em que eu tinha decidido parar em ${carga}. Sei exatamente a hora em que decidi continuar.`);
    }
    return `${hoje} serviços hoje; você tinha combinado ${carga} consigo mesmo. As mãos ainda respondem, a atenção não.`;
  }
  if (seguidos >= 7 && c.worldEvents.obter('oficina:avisoSeguidos') !== c.dia) {
    c.worldEvents.definir('oficina:avisoSeguidos', c.dia);
    escreverDiario(c, `oficina:seguidos:${c.dia}`, `Sete dias seguidos de bancada. Não é urgência de ninguém; é a minha.`);
    return `${seguidos} dias seguidos de bancada. Nenhum cliente pediu isso.`;
  }
  return null;
}

/** Domingo já chega livre; declarar um dia livre é o jogador fechando a porta. */
export function ehDomingo(c: ContextoOficina): boolean { return diaDaSemana(c.dia) === 6; }
export function ehDiaLivre(c: ContextoOficina): boolean {
  return c.worldEvents.obter('oficina:folga') === c.dia;
}
export function declararDiaLivre(c: ContextoOficina): boolean {
  if (ehDiaLivre(c) || servicosHoje(c) > 0) return false;
  c.worldEvents.definir('oficina:folga', c.dia);
  escreverDiario(c, `oficina:folga:${c.dia}`, 'Fechei a bancada antes de abrir. Hoje não tem prazo, nem tarefa, nem desconto por isso.');
  return true;
}
export function desfazerDiaLivre(c: ContextoOficina): boolean {
  if (!ehDiaLivre(c)) return false;
  c.worldEvents.definir('oficina:folga', -1);
  return true;
}
export function textoDoDiaLivre(c: ContextoOficina): string {
  if (ehDiaLivre(c)) return 'Dia livre. O quadro continua aí amanhã, com as mesmas vagas de amanhã. Não há bônus por voltar cedo.';
  if (ehDomingo(c)) return 'Domingo. O quadro está mais vazio, e ninguém espera resposta hoje.';
  return `Hoje: ${servicosHoje(c)} de ${cargaEscolhida(c)} serviços combinados.`;
}
