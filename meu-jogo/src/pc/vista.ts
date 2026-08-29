import type Phaser from 'phaser';
import type { Retangulo } from './widgets.ts';

/**
 * Uma sub-tela de um app: o quiz de codigo e a sequencia do conserto dentro do
 * Trabalho, a memoria e o snake dentro do Jogos.
 *
 * Nao e um `AppDoPc`: nao aparece no desktop e nao tem moldura propria — abre
 * DENTRO de um app, que continua sendo o dono da janela e o unico que conversa
 * com o estado do jogo. A vista so avisa o resultado; quem decide o que fazer
 * com ele (pagar, pontuar) e o app.
 *
 * `montar` cria os objetos dentro de `raiz`. Quem troca de vista destroi os
 * filhos de `raiz`, entao a vista nao precisa devolver lista nenhuma.
 */
export interface Vista {
  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void;
  atualizar?(): void;
  /** true se consumiu a tecla */
  aoTeclar?(evento: KeyboardEvent): boolean;
}
