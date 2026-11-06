export const CONFIG = {
  // Configurações de Economia
  INITIAL_MONEY: 2500,
  BANKRUPT_THRESHOLD: 0,
  STARTING_REPUTATION: 100,
  STARTING_SATISFACTION: 85,
  
  // Regras de Expulsão (Baseadas no número de jogadores)
  MAX_EJECTIONS: {
    4: 2,
    5: 2,
    6: 3
  },

  // Setores do Supermercado
  SECTORS: {
    ENTRANCE: { x: 0, z: 18, name: "Entrada Principal" },
    HORTIFRUTI: { x: -14, z: 8, name: "Hortifrúti", color: 0x16a34a },
    MERCEARIA: { x: 0, z: 2, name: "Mercearia", color: 0x0284c7 },
    LATICINIOS: { x: 14, z: 8, name: "Laticínios", color: 0xe0e7ff },
    CAIXAS: { x: 0, z: 12, name: "Caixas de Pagamento", color: 0xf59e0b },
    ESTOQUE: { x: -14, z: -12, name: "Estoque & Cargas", color: 0x64748b },
    ESCRITORIO: { x: 14, z: -12, name: "Escritório Administrativo", color: 0x8b5cf6 }
  },

  // Produtos Típicos Brasileiros
  PRODUCTS: [
    { id: "arroz", name: "Arroz Tipo 1 (5kg)", sector: "MERCEARIA", price: 28.50, cost: 18.00 },
    { id: "feijao", name: "Feijão Carioca (1kg)", sector: "MERCEARIA", price: 8.90, cost: 5.20 },
    { id: "leite", name: "Leite Integral (1L)", sector: "LATICINIOS", price: 5.40, cost: 3.50 },
    { id: "queijo", name: "Queijo Minas Frescal", sector: "LATICINIOS", price: 22.00, cost: 14.00 },
    { id: "banana", name: "Banana Prata (kg)", sector: "HORTIFRUTI", price: 6.50, cost: 3.00 },
    { id: "tomate", name: "Tomate Longa Vida (kg)", sector: "HORTIFRUTI", price: 9.00, cost: 5.00 },
    { id: "detergente", name: "Detergente Líquido", sector: "MERCEARIA", price: 2.80, cost: 1.50 }
  ]
};