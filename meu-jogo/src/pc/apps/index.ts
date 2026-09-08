import { Calculadora } from './calculadora.ts';
import { Conquistas } from './conquistas.ts';
import { DevStore } from './devstore.ts';
import { Jogos } from './jogos/index.ts';
import { Lixeira } from './lixeira.ts';
import { Navegador } from './navegador.ts';
import { Trabalho } from './trabalho/index.ts';
import type { AppDoPc } from '../tipos.ts';

/**
 * Os sete apps do desktop, na ordem em que os icones aparecem.
 *
 * Acrescentar um app e: criar a classe em `apps/`, implementar `AppDoPc` e
 * incluir aqui. A ComputadorScene monta o desktop a partir desta lista e a
 * `JanelaApp` cuida da moldura — nao ha nada por app na cena.
 *
 * Estado de FUNCIONALIDADE hoje:
 *   DevStore    — funcional (compra de verdade, por game/loja.ts)
 *   Trabalho    — funcional (3 tipos de vaga; paga por carteira.ganhar)
 *   Jogos       — funcional (2 minijogos, sem efeito no jogo principal)
 *   Calculadora — funcional (nao depende de nada do jogo)
 *   Lixeira     — funcional (historico real do descarte do inventario)
 *   Navegador   — blog por dia/minuto e relacionamentos reais
 *   Conquistas  — fachada; idem
 */
export function criarApps(): AppDoPc[] {
  return [
    new DevStore(),
    new Trabalho(),
    new Jogos(),
    new Calculadora(),
    new Navegador(),
    new Lixeira(),
    new Conquistas(),
  ];
}
