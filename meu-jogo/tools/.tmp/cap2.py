# -*- coding: utf-8 -*-
import io
p='src/game/andares.ts'; s=io.open(p,encoding='utf-8').read()
novos = io.open('tools/.tmp/novos_capitulos.txt',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)

for fauna, extra in [
    ("{ primaria: 'esfera_choque', secundaria: 'smartfone' },\n    fatorDeTensao: 1,", "    kit: 'usina',\n    luzes: 0.9,"),
    ("{ primaria: 'smartfone', secundaria: 'esfera_choque', rara: 'impressora' },\n    fatorDeTensao: 1.5,", "    kit: 'usina',\n    luzes: 0.78,"),
    ("{ primaria: 'impressora', secundaria: 'smartfone', rara: 'caixa_som' },\n    fatorDeTensao: 2,", "    kit: 'usina',\n    luzes: 0.66,"),
    ("{ primaria: 'robo_servico', secundaria: 'caixa_som', rara: 'maquina_lavar' },\n    fatorDeTensao: 2.5,", "    kit: 'usina',\n    luzes: 0.56,"),
    ("{ primaria: 'maquina_lavar', secundaria: 'robo_servico', rara: 'geladeira_gelo' },\n    fatorDeTensao: 3,", "    kit: 'fundo',\n    luzes: 0.46,"),
]:
    alvo = "    fauna: " + fauna + "\n  },"
    rep(alvo, "    fauna: " + fauna + "\n" + extra + "\n  },")

# insere os dez capitulos novos antes do fechamento do array
rep("""    kit: 'fundo',
    luzes: 0.46,
  },
];""",
"""    kit: 'fundo',
    luzes: 0.46,
  },

""" + novos + """];""")
io.open(p,'w',encoding='utf-8').write(s); print('ok')
