export interface RecipeItem {
  materialId: string;
  quantity: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  stock: number;
  safeStock: number;
  emoji: string;
  priceHistory: {
    date: string;
    price: number;
  }[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
  recipe: RecipeItem[];
}

export interface Purchase {
  id: string;
  date: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export type SalePeriod = 'morning' | 'noon' | 'evening';

export const SALE_PERIOD_LABELS: Record<SalePeriod, string> = {
  morning: '早市',
  noon: '午市',
  evening: '晚市',
};

export interface SaleItem {
  productId: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  materialConsumption: {
    materialId: string;
    quantity: number;
  }[];
}

export interface Sale {
  id: string;
  date: string;
  period: SalePeriod;
  items: SaleItem[];
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  createdAt: string;
}

export interface AppState {
  materials: Material[];
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  addMaterial: (material: Omit<Material, 'id' | 'priceHistory'>) => void;
  updateMaterialPrice: (id: string, newPrice: number, date: string) => void;
  updateMaterialStock: (id: string, stock: number) => void;
  updateMaterialSafeStock: (id: string, safeStock: number) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => void;
  deletePurchase: (id: string) => void;
  addSale: (sale: {
    date: string;
    period: SalePeriod;
    items: { productId: string; quantity: number }[];
  }) => void;
  deleteSale: (id: string) => void;
  getMaterialById: (id: string) => Material | undefined;
  getProductById: (id: string) => Product | undefined;
  getPurchasesByDate: (date: string) => Purchase[];
  getSalesByDate: (date: string) => Sale[];
  getLowStockMaterials: () => Material[];
  getWeeklyData: () => {
    date: string;
    revenue: number;
    profit: number;
  }[];
}
