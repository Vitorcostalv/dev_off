/**
 * Folhas de movel de interior que o jogo carrega em runtime.
 *
 * Uma folha vira dois arquivos em `public/assets/sprites`: o PNG reempacotado
 * (`moveis_<folha>.png`, so os pixels de cada peca) e o atlas
 * (`moveis_<folha>.atlas.json`, um frame `movel_<linha>_<indice>` por peca). Os
 * dois saem de `tools/gerar-assets.mjs`, que le esta MESMA lista pra decidir o
 * que empacotar — entao a cena e o gerador nao tem como divergir e sobrar um
 * frame apontando pra atlas que ninguem carregou.
 *
 * A ordem nao importa; o que importa e o nome bater com a chave em
 * `FOLHAS_MOVEIS` do gerador.
 */
export const FOLHAS_DE_MOVEL = [
  // comercio: utensilio dedicado de cada ramo
  'mercado',
  'academia',
  'farmacia_bar',
  // novos servicos construiveis do Bairro da Estacao
  'cafeteria',
  'hospital',
  'padaria',
  'ponto_de_onibus',
  // residencial generico: sala, decoracao e as pecas que servem em qualquer
  // comodo (sofa, poltrona, tapete, quadro, planta)
  'mobilia_v1',
  'mobilia_v2',
  // externo: mobiliario do parque (banco, chafariz, playground)
  'parque',
  // residencial DEDICADO por comodo
  'quarto',
  'cozinha',
  'banheiro',
  'eletronicos',
] as const;

export type FolhaDeMovel = (typeof FOLHAS_DE_MOVEL)[number];
