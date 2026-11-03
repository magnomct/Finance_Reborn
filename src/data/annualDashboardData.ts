export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface DetailRow {
  id: string;
  name: string;
  pct: number;
  values: number[]; // 12 months
  isCalculated?: boolean;
  highlight?: boolean;
}

export interface DetailSection {
  id: string;
  title: string;
  colorTheme: string;
  rows: DetailRow[];
}

export const INITIAL_ANNUAL_DATA = {
  // 1. RENDAS
  rendas: [
    { id: 'rec_prev', name: 'Receitas Previstas', pct: 97, values: [4400, 4400, 4400, 4400, 4400, 4400, 4400, 4400, 4400, 4400, 4400, 4400], highlight: true },
    { id: 'sal_liq', name: 'Salário Líquido', pct: 40, values: [1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800] },
    { id: 'consultoria', name: 'consultoria', pct: 44, values: [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000] },
    { id: 'apartamento', name: 'Apartamento', pct: 0, values: [900, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'proventos', name: 'Proventos', pct: 0, values: [25, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20] },
    { id: 'conducao_renda', name: 'Condução', pct: 13, values: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600] },
    { id: 'extras', name: 'extras', pct: 0, values: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20] }
  ],

  // 2. INVESTIMENTOS
  investimentos: [
    { id: 'inv_prev', name: 'Invest. Valor Previsto', pct: 20, values: [1069, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888, 888], highlight: true },
    { id: 'inv_real', name: 'Invest. Valor Real', pct: 7, values: [280.89, 0, 0, 0, 0, 0, 0, 0, 0, 930, 1730, 1530], highlight: true }
  ],

  // 3. DESPESAS CATEGORIZADAS
  despesas: {
    habitacao: [
      { id: 'hab_aluguel', name: 'Aluguel/Prestação Imóvel', pct: 2, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 421, 421, 421] },
      { id: 'hab_condominio', name: 'Condomínio', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_iptu', name: 'IPTU', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_empregada', name: 'Empregado (a)', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_agua', name: 'Água', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_luz', name: 'Luz', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 75, 75] },
      { id: 'hab_telefones', name: 'Telefones', pct: 0, values: [70, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65] },
      { id: 'hab_gas', name: 'Gás', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_tv', name: 'TV por Assinatura', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'hab_net', name: 'Internet', pct: 1, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 138, 138, 138] },
      { id: 'hab_outros', name: 'Ajuda em Casa/Outros', pct: 1, values: [300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    alimentacao: [
      { id: 'alim_super', name: 'Supermercado', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'alim_feira', name: 'Feira', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'alim_padaria', name: 'Padaria', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    transporte: [
      { id: 'trans_carro', name: 'Prestação do carro', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'trans_uber', name: 'Uber', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'trans_combustivel', name: 'Combustível', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'trans_estacionamento', name: 'Estacionamento', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'trans_conducao', name: 'Condução', pct: 3, values: [600, 0, 0, 0, 0, 0, 0, 0, 0, 330, 330, 330] }
    ],

    saude: [
      { id: 'saude_plano', name: 'Plano de saúde', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'saude_dentista', name: 'Dentista', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'saude_medicamentos', name: 'Medicamentos', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    educacao: [
      { id: 'edu_colegio', name: 'Colégio', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'edu_faculdade', name: 'Faculdade', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'edu_curso', name: 'Curso', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    cuidados_pessoais: [
      { id: 'cuid_higiene', name: 'Higiene Pessoal', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'cuid_cosmeticos', name: 'Cosméticos', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'cuid_vestuario', name: 'Vestuário/Calçados', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'cuid_academia', name: 'Academia', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'cuid_estetica', name: 'Estética', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    lazer: [
      { id: 'laz_restaurantes', name: 'Cafés/Bares/Boates/Restaurantes', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'laz_passeios', name: 'Passeios', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'laz_outros', name: 'Outros', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    bancos: [
      { id: 'banco_caixa', name: 'Pacote de Serviços(Caixa)', pct: 0, values: [39.92, 0, 0, 0, 0, 0, 0, 0, 0, 13.25, 13.25, 13.25] },
      { id: 'banco_icatu', name: 'Icatu prev', pct: 1, values: [280.89, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105] },
      { id: 'banco_santander', name: 'Tarifa Santander conta', pct: 0, values: [10, 0, 0, 0, 0, 0, 0, 0, 0, 12.20, 12.20, 12.20] },
      { id: 'banco_brasilprev', name: 'Brasil Prev', pct: 1, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 125, 125, 125] },
      { id: 'banco_invest', name: 'Invest', pct: 6, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 700, 1500, 1300] },
      { id: 'banco_saque', name: 'saque', pct: 0, values: [60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'banco_das', name: 'Receita DAS', pct: 0, values: [60, 0, 0, 0, 0, 0, 0, 0, 0, 54.90, 54.90, 54.90] },
      { id: 'banco_tarifapj', name: 'Tarifa PJ', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    cartoes: [
      { id: 'card_nubank', name: 'NUBANK MASTER (Principal)', pct: 7, values: [1500, 0, 0, 0, 0, 0, 0, 0, 0, 700, 700, 700] },
      { id: 'card_inter', name: 'INTER MASTER (Geral)', pct: 0, values: [800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'card_next', name: 'NEXT VISA (Extra)', pct: 6, values: [250, 0, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 1000] },
      { id: 'card_carrefour', name: 'Carrefour (Mercado)', pct: 0, values: [600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'card_magalu', name: 'Magalu (Outros)', pct: 0, values: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ],

    reserva: [
      { id: 'res_imprevistos', name: 'Imprevistos', pct: 0, values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
    ]
  },

  // 4. SALDO ANTERIOR (DEZEMBRO DE 2021)
  saldoAnterior: 710.90
};
