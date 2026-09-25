export const OBJETOS_PROLOGO = [
  { id: 'notebook', nome: 'Notebook', x: 331, y: 80 },
  { id: 'celular', nome: 'Celular', x: 390, y: 85 },
  { id: 'cafe', nome: 'Café', x: 81, y: 83 },
  { id: 'pia', nome: 'Pia', x: 137, y: 80 },
  { id: 'relogio', nome: 'Relógio', x: 210, y: 72 },
  { id: 'janela', nome: 'Janela', x: 66, y: 164 },
  { id: 'cama', nome: 'Cama', x: 384, y: 180 },
  { id: 'porta', nome: 'Porta', x: 234, y: 203 },
] as const;
export const MADRUGADAS = [
  { hora: '23:48', mensagem: 'Consegue olhar uma coisa rapidinho? Uma tela começou a mostrar valores diferentes. Não sei desde quando.', relato: 'O café ainda está quente. A mesa parece organizada porque tudo o que não é trabalho foi empurrado para o lado.', pistas: ['A tela mostra um valor antigo.', 'O dado salvo está correto.', 'Atualizar a página resolve por alguns segundos.'], opcoes: ['Apagar o cadastro', 'Rever a atualização da tela', 'Trocar a senha'], resposta: 1 },
  { hora: '01:17', mensagem: 'É urgente. Tem gente esperando para usar amanhã cedo. Você consegue ficar mais um pouco?', relato: 'Você volta para a cadeira com a xícara na mão. Não lembra de ter levantado para buscá-la. A cozinha continua acesa.', pistas: ['Duas solicitações chegam juntas.', 'Separadas, funcionam.', 'A segunda sobrescreve a primeira.'], opcoes: ['Ordenar as solicitações', 'Aumentar o brilho', 'Reenviar todas as mensagens'], resposta: 0 },
  { hora: '02:43', mensagem: 'Só você conhece isso. Achei melhor mandar direto para você. Prometo que depois dessa acabou.', relato: 'O celular ilumina a mesa antes de vibrar. Por um momento você sabe que poderia não pegar. Pega mesmo assim.', pistas: ['A mesma operação roda duas vezes.', 'Cada tentativa gera novo protocolo.', 'O cliente repete ao não receber resposta.'], opcoes: ['Eliminar o histórico', 'Desligar a rede', 'Reconhecer tentativas repetidas'], resposta: 2 },
  { hora: '04:06', mensagem: 'Agora parece bom. Consegue só confirmar o relatório antes de sair? Deve levar cinco minutos.', relato: 'O terceiro monitor reflete seu rosto. A palavra sair parece descrever alguém que está em outro lugar.', pistas: ['O total muda depois da meia-noite.', 'Os registros não sumiram.', 'Cada tela usa um fuso diferente.'], opcoes: ['Conferir a referência de horário', 'Excluir os dias anteriores', 'Ignorar a diferença'], resposta: 0 },
] as const;
export function textoObjetoPrologo(id: string, etapa: number): string {
  const depois = etapa >= 2;
  return ({ cafe: depois ? 'O café esfriou. Você faz outro sem terminar o primeiro. O gosto fica na boca depois que a xícara volta à bancada.' : 'Você mede o pó como sempre. É uma tarefa pequena, com começo e fim. O celular vibra antes da água ferver.',
    pia: depois ? 'Você abre a torneira. A água cobre por alguns segundos o ruído do computador. Há um prato aqui. Você não lembra quando usou.' : 'Um prato e dois talheres. Você põe água no copo e bebe em pé, olhando para a luz da outra sala.',
    relogio: depois ? 'Os números mudam. Você já calculou três vezes quanto ainda conseguiria dormir se terminasse agora.' : 'Ainda é hoje. Você pensa que dá para resolver antes de dormir.',
    janela: depois ? 'A rua está vazia. Um ônibus passa quase sem passageiros. A janela devolve seu reflexo sobre a chuva.' : 'A chuva escorre pelo vidro. Alguém fecha uma janela no prédio em frente. Você acompanha o gesto até a luz se apagar.',
    cama: depois ? 'Você senta por um instante. O telefone vibra no outro cômodo. Antes de decidir, já está de pé.' : 'O lençol continua esticado. Você deixa o celular na mesa de cabeceira, depois volta para buscá-lo.',
    porta: 'As chaves estão no mesmo lugar. Você não saiu hoje. A mochila encostada na parede ainda tem um recibo da semana passada.' } as Record<string, string>)[id] ?? '';
}
