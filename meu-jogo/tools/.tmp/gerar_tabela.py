# -*- coding: utf-8 -*-
"""Gera o texto TS das PLANTAS_DE_ANDAR novas e das linhas 51-150 da TABELA."""
import io

# ----------------------------------------------------------------- plantas --
# id, nome, vaos, entrada, descida, elevador, labirinto?, marcos
PLANTAS = [
    ('baias_6', 'Seis baias com eixo de servico', 6, (17, 3), (17, 19), (17, 11), False, None),
    ('corredor_longo', 'Corredor comprido com quatro salas', 4, (3, 14), (34, 14), (18, 14), False, None),
    ('duplo_anel', 'Dois aneis concentricos', 4, (3, 3), (16, 12), (16, 20), False, None),
    ('escalonado', 'Quatro faixas com portas em degrau', 4, (26, 3), (26, 20), (26, 12), False, None),
    ('atrio', 'Atrio central com quatro anexos', 4, (3, 4), (26, 19), (14, 11), False, None),
    ('espinha_7', 'Corredor central com sete salas', 7, (3, 14), (36, 14), (19, 14), False, None),
    ('pente', 'Galeria com cinco dentes', 5, (3, 3), (29, 18), (16, 3), False, None),
    ('labirinto_d', 'Labirinto das baias numeradas', 4, (2, 2), (31, 19), (16, 2), True,
     [('porta_numerada', 12, 4), ('cabo_anilha', 20, 17), ('painel_cego', 28, 4)]),
    ('cruz_6', 'Cruzamento com seis salas iguais', 6, (16, 3), (16, 20), (16, 12), False, None),
    ('galeria_6', 'Tres galerias com anexos', 6, (3, 4), (30, 20), (11, 13), False, None),
    ('poco_duplo', 'Poco de tres estagios', 3, (10, 4), (10, 21), (10, 13), False, None),
    ('anel_partido', 'Anel que nao fecha', 3, (3, 3), (26, 18), (14, 10), False, None),
    ('corredor_duplo', 'Dois corredores paralelos', 3, (3, 3), (28, 19), (16, 3), False, None),
    ('sala_espelho', 'Quatro salas em espelho', 4, (3, 3), (22, 18), (14, 11), False, None),
    ('labirinto_e', 'Espiral', 3, (2, 2), (13, 12), (24, 21), True,
     [('tubo_azul', 13, 3), ('tubo_vermelho', 4, 10), ('baia_numerada', 20, 13)]),
    ('labirinto_f', 'Malha regular', 4, (2, 2), (28, 21), (16, 12), True,
     [('porta_numerada', 10, 9), ('painel_cego', 26, 15), ('baia_numerada', 14, 19)]),
]

linhas = []
for pid, nome, vaos, ent, desc, elev, lab, marcos in PLANTAS:
    corpo = "  {\n"
    corpo += "    id: '%s', nome: '%s', vaos: %d,%s\n" % (pid, nome, vaos, ' labirinto: true,' if lab else '')
    corpo += "    entrada: [%d, %d], descida: [%d, %d], elevador: [%d, %d],\n" % (ent + desc + elev)
    if marcos:
        corpo += "    marcos: [\n"
        for mid, mx, my in marcos:
            corpo += "      { id: '%s', tx: %d, ty: %d },\n" % (mid, mx, my)
        corpo += "    ],\n"
    corpo += "  },"
    linhas.append(corpo)
io.open('tools/.tmp/plantas.txt', 'w', encoding='utf-8').write('\n'.join(linhas) + '\n')

# ------------------------------------------------------------------ tabela --
VAOS = {p[0]: p[2] for p in PLANTAS}

# Modulos por tema. Todos existem em MODULOS_DE_ANDAR (os dez novos entram junto).
TRAB = ['estacoes', 'racks', 'terminais', 'expedicao', 'ponto', 'impressao',
        'baias', 'servidores', 'arquivo', 'eletrica', 'corredor', 'deposito',
        'cabos', 'ferramentaria', 'controle', 'monitores']
INF = ['sala_vazia', 'paredao', 'refeitorio', 'arquivo', 'baias', 'corredor',
       'deposito', 'tunel', 'alagado', 'ventilacao', 'eletrica', 'controle',
       'estacoes', 'monitores', 'cabos', 'poco_seco']

# rotulos por capitulo
ROTULOS = {
    6: ['Manutencao 51', 'Bancadas 52', 'Sala de Turno', 'Expedicao 54', 'Pavimento 55',
        'Almoxarifado 56', 'Corredores 57', 'Sala de Ordens', 'Pavimento 59', 'Chefia de Turno'],
    7: ['Quadro de Prazos', 'Pavimento 62', 'Sala de Chamados', 'Galeria 64', 'Cota 65',
        'Corredores 66', 'Pavimento 67', 'Baias 68', 'Sala 69', 'Central de Prazos'],
    8: ['Oficina Parada', 'Pavimento 72', 'Bancada 73', 'Galeria 74', 'Sala de Falhas',
        'Corredores 76', 'Pavimento 77', 'Deposito 78', 'Baias 79', 'Sala de Registro'],
    9: ['Monitores 81', 'Pavimento 82', 'Galeria de Cabos 83', 'Sala 84', 'Central 85',
        'Corredores 86', 'Pavimento 87', 'Racks 88', 'Sala 89', 'Sala de Plantao'],
    10: ['Pavimento 91', 'Alagado 92', 'Galeria 93', 'Corredores 94', 'Cota 95',
         'Sala 96', 'Pavimento 97', 'Baias 98', 'Deposito 99', 'Sala 100'],
    11: ['Nivel 101', 'Corredor 102', 'Sala 103', 'Espiral 104', 'Cota 105',
         'Galeria 106', 'Sala 107', 'Pavimento 108', 'Corredor 109', 'Sala 110'],
    12: ['Malha 111', 'Sala 112', 'Galeria 113', 'Cota 114', 'Pavimento 115',
         'Corredor 116', 'Sala 117', 'Espiral 118', 'Galeria 119', 'Sala 120'],
    13: ['Sala 121', 'Espelho 122', 'Galeria 123', 'Corredor 124', 'Cota 125',
         'Malha 126', 'Sala 127', 'Pavimento 128', 'Galeria 129', 'Sala 130'],
    14: ['Corredor 131', 'Sala 132', 'Espiral 133', 'Cota 134', 'Pavimento 135',
         'Galeria 136', 'Sala 137', 'Corredor 138', 'Espelho 139', 'Sala 140'],
    15: ['Nivel 141', 'Galeria 142', 'Sala 143', 'Cota 144', 'Pavimento 145',
         'Corredor 146', 'Malha 147', 'Sala 148', 'Galeria 149', 'Sala 150'],
}

# labirintos, andar -> planta
MAZES = {57: 'labirinto_d', 68: 'labirinto_d', 79: 'labirinto_d', 91: 'labirinto_d',
         104: 'labirinto_e', 118: 'labirinto_e', 133: 'labirinto_e',
         111: 'labirinto_f', 126: 'labirinto_f', 147: 'labirinto_f'}

CICLO_TRAB = ['baias_6', 'corredor_longo', 'atrio', 'escalonado', 'espinha_7',
              'pente', 'duplo_anel', 'corredor_longo', 'baias_6', 'atrio']
CICLO_INF = ['cruz_6', 'galeria_6', 'poco_duplo', 'anel_partido', 'corredor_duplo',
             'sala_espelho', 'galeria_6', 'cruz_6', 'poco_duplo', 'sala_espelho']

# Enigmas por faixa (Parte 17). O andar de labirinto sempre usa a familia labirinto.
FAIXA_51_75 = ['roteamento', 'valvulas', 'terminal', 'pressao', 'circuito', 'roteamento',
               'terminal', 'valvulas', 'pressao', 'alavancas']
FAIXA_76_100 = ['terminal', 'temporizado', 'roteamento', 'multiandar', 'pressao',
                'valvulas', 'temporizado', 'terminal', 'circuito', 'multiandar']
FAIXA_101_125 = ['observacao', 'terminal', 'multiandar', 'observacao', 'roteamento',
                 'observacao', 'terminal', 'multiandar', 'valvulas', 'observacao']
FAIXA_126_150 = ['multiandar', 'temporizado', 'roteamento', 'multiandar', 'circuito',
                 'temporizado', 'multiandar', 'terminal', 'temporizado', 'multiandar']


def familia(andar, i):
    if andar in MAZES:
        return 'labirinto'
    if andar <= 75:
        return FAIXA_51_75[i % 10]
    if andar <= 100:
        return FAIXA_76_100[i % 10]
    if andar <= 125:
        return FAIXA_101_125[i % 10]
    return FAIXA_126_150[i % 10]


out = []
for andar in range(51, 151):
    cap = 6 + (andar - 51) // 10
    pos = (andar - 51) % 10
    if andar in MAZES:
        planta = MAZES[andar]
    elif andar <= 100:
        planta = CICLO_TRAB[pos]
    else:
        planta = CICLO_INF[pos]
    n = VAOS[planta]
    pool = TRAB if andar <= 100 else INF
    # rotacao deterministica pela posicao do andar, sem repetir modulo no mesmo andar
    mods = [pool[(andar * 3 + k * 5) % len(pool)] for k in range(n)]
    vistos, mods2 = set(), []
    for m in mods:
        j = 0
        while m in vistos:
            j += 1
            m = pool[(pool.index(m) + j) % len(pool)]
        vistos.add(m)
        mods2.append(m)
    # todo andar tem ao menos um corredor quando a planta tem 4+ vaos
    if n >= 4 and 'corredor' not in mods2:
        mods2[-1] = 'corredor'
    rot = ROTULOS[cap][pos]
    fam = familia(andar, andar - 51)
    lista = ', '.join("'%s'" % m for m in mods2)
    if andar == 51:
        out.append('  // --------------------------------- CAPITULO 6 — Produtividade (51 a 60) --')
    elif pos == 0:
        nomes = {7: 'Prazos (61 a 70)', 8: 'Falha (71 a 80)', 9: 'Sempre Ligado (81 a 90)',
                 10: 'Colapso (91 a 100)', 11: 'Memoria (101 a 110)',
                 12: 'Expectativa (111 a 120)', 13: 'Perfeicao (121 a 130)',
                 14: 'Medo (131 a 140)', 15: 'Origem (141 a 150)'}
        out.append('  // ' + ('-' * 38) + ' CAPITULO %d — %s --' % (cap, nomes[cap]))
    out.append("  [%d, '%s', [%s], '%s', '%s']," % (andar, planta, lista, rot, fam))

io.open('tools/.tmp/tabela.txt', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('plantas:', len(PLANTAS), 'linhas:', 100)
