# -*- coding: utf-8 -*-
import io
p='src/game/andares.ts'; s=io.open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)

rep("""export type CapituloAndar = 1 | 2 | 3 | 4 | 5;

export interface DefinicaoCapitulo {
  numero: CapituloAndar;""",
"""/**
 * O numero do capitulo, 1 a 15. Cada um cobre dez andares.
 *
 * Deixou de ser uniao literal quando passaram de cinco: quinze literais numa
 * uniao so servem pra o compilador cobrar um `as` toda vez que o numero sai de
 * uma conta, e o valor real ja e conferido em `capituloDoAndar`.
 */
export type CapituloAndar = number;

/** O KIT VISUAL do capitulo — qual folha de parede o gerador usa. */
export type KitDeAndar = 'usina' | 'fundo' | 'trabalho' | 'infancia';

export interface DefinicaoCapitulo {
  numero: CapituloAndar;""")

rep("""  /** multiplicador de subida da tensao dentro do capitulo */
  fatorDeTensao: number;
}""",
"""  /** multiplicador de subida da tensao dentro do capitulo */
  fatorDeTensao: number;
  /**
   * Folha de parede do capitulo. Os quatro kits existem em arte de verdade:
   * `usina` e `PAredes_internas_represa.png`, `fundo` e as pecas lisas de
   * `PAredes_internas_represa_andar_50_100.png`, `trabalho` sao as pecas
   * ROTULADAS dessa mesma folha (51-60, 61-70, ...) e `infancia` e
   * `Paredes_internas_represa_andar_101_150.png`.
   */
  kit: KitDeAndar;
  /**
   * FRACAO DAS LUMINARIAS COM ENERGIA, 0 a 1 (Parte 21).
   *
   * A infraestrutura eletrica se degrada com a profundidade: no capitulo 1
   * quase toda luminaria acende sozinha, no 15 quase nenhuma. O que sobra sai
   * do painel do andar — e o que faz restaurar energia valer a pena la embaixo.
   */
  luzes: number;
  /**
   * DECAIS do capitulo (Parte 24): desenho de crianca, escrita, aviso a mao,
   * marca de sangue. Sao sobreposicoes, e a raridade e o efeito — capitulo sem
   * entrada aqui nao recebe decal nenhum.
   */
  decais?: readonly { familia: string; quantidade: number }[];
}""")
io.open(p,'w',encoding='utf-8').write(s); print('ok')
