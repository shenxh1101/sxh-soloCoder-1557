import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Material, Product, Purchase, Sale } from './types';
import { seedMaterials, seedProducts } from '../data/seed';
import { generateId, getWeekDates } from '../utils/date';
import { calculateSaleItem, calculateTotalMaterialConsumption } from '../utils/calculator';

const sortPriceHistory = (history: Material['priceHistory']) =>
  [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

const getLatestPrice = (history: Material['priceHistory']) => {
  const sorted = sortPriceHistory(history);
  return sorted.length > 0 ? sorted[sorted.length - 1].price : 0;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      materials: seedMaterials,
      products: seedProducts,
      purchases: [],
      sales: [],

      addMaterial: (material) =>
        set((state) => ({
          materials: [
            ...state.materials,
            {
              ...material,
              id: generateId(),
              priceHistory: [{ date: new Date().toISOString().split('T')[0], price: material.currentPrice }],
            },
          ],
        })),

      updateMaterialPrice: (id, newPrice, date) =>
        set((state) => ({
          materials: state.materials.map((m) => {
            if (m.id !== id) return m;
            const newHistory = sortPriceHistory([...m.priceHistory, { date, price: newPrice }]);
            return {
              ...m,
              currentPrice: getLatestPrice(newHistory),
              priceHistory: newHistory,
            };
          }),
        })),

      updateMaterialStock: (id, stock) =>
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, stock } : m
          ),
        })),

      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, { ...product, id: generateId() }],
        })),

      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      addPurchase: (purchase) => {
        const newPurchase: Purchase = {
          ...purchase,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          const material = state.materials.find(m => m.id === purchase.materialId);
          if (!material) return { purchases: [...state.purchases, newPurchase] };

          const newStock = material.stock + purchase.quantity;
          const newHistory = sortPriceHistory([
            ...material.priceHistory,
            { date: purchase.date, price: purchase.unitPrice },
          ]);
          const newCurrentPrice = getLatestPrice(newHistory);

          return {
            purchases: [...state.purchases, newPurchase],
            materials: state.materials.map(m =>
              m.id === purchase.materialId
                ? { ...m, stock: newStock, currentPrice: newCurrentPrice, priceHistory: newHistory }
                : m
            ),
          };
        });
      },

      deletePurchase: (id) =>
        set((state) => {
          const purchase = state.purchases.find(p => p.id === id);
          if (!purchase) return { purchases: state.purchases.filter(p => p.id !== id) };

          const material = state.materials.find(m => m.id === purchase.materialId);
          if (!material) return { purchases: state.purchases.filter(p => p.id !== id) };

          const newStock = Math.max(0, material.stock - purchase.quantity);

          const newHistory = [...material.priceHistory];
          const entryIndex = newHistory.findIndex(
            entry => entry.date === purchase.date && entry.price === purchase.unitPrice
          );
          if (entryIndex !== -1) {
            newHistory.splice(entryIndex, 1);
          }
          const sortedHistory = sortPriceHistory(newHistory);
          const newCurrentPrice = sortedHistory.length > 0
            ? sortedHistory[sortedHistory.length - 1].price
            : material.currentPrice;

          return {
            purchases: state.purchases.filter(p => p.id !== id),
            materials: state.materials.map(m =>
              m.id === purchase.materialId
                ? { ...m, stock: newStock, currentPrice: newCurrentPrice, priceHistory: sortedHistory }
                : m
            ),
          };
        }),

      addSale: (saleData) => {
        const state = get();
        const items = saleData.items.map(item =>
          calculateSaleItem(item.productId, item.quantity, state.products, state.materials)
        );

        const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
        const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
        const grossProfit = totalRevenue - totalCost;

        const consumption = calculateTotalMaterialConsumption(items);
        const materialUpdates = new Map<string, number>();
        consumption.forEach((quantity, materialId) => {
          const material = state.materials.find(m => m.id === materialId);
          if (material) {
            materialUpdates.set(materialId, Math.max(0, material.stock - quantity));
          }
        });

        const newSale: Sale = {
          ...saleData,
          id: generateId(),
          items,
          totalRevenue,
          totalCost,
          grossProfit,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          sales: [...state.sales, newSale],
          materials: state.materials.map(m => {
            const newStock = materialUpdates.get(m.id);
            return newStock !== undefined ? { ...m, stock: newStock } : m;
          }),
        }));
      },

      deleteSale: (id) =>
        set((state) => {
          const sale = state.sales.find(s => s.id === id);
          if (!sale) return { sales: state.sales.filter(s => s.id !== id) };

          const consumption = calculateTotalMaterialConsumption(sale.items);
          const materialUpdates = new Map<string, number>();
          consumption.forEach((quantity, materialId) => {
            const material = state.materials.find(m => m.id === materialId);
            if (material) {
              materialUpdates.set(materialId, material.stock + quantity);
            }
          });

          return {
            sales: state.sales.filter(s => s.id !== id),
            materials: state.materials.map(m => {
              const newStock = materialUpdates.get(m.id);
              return newStock !== undefined ? { ...m, stock: newStock } : m;
            }),
          };
        }),

      getMaterialById: (id) => get().materials.find(m => m.id === id),

      getProductById: (id) => get().products.find(p => p.id === id),

      getPurchasesByDate: (date) => get().purchases.filter(p => p.date === date),

      getSaleByDate: (date) => get().sales.find(s => s.date === date),

      getLowStockMaterials: () =>
        get().materials.filter(m => m.stock <= m.safeStock),

      getWeeklyData: () => {
        const weekDates = getWeekDates();
        const sales = get().sales;

        return weekDates.map(date => {
          const daySales = sales.filter(s => s.date === date);
          const revenue = daySales.reduce((sum, s) => sum + s.totalRevenue, 0);
          const profit = daySales.reduce((sum, s) => sum + s.grossProfit, 0);
          return { date, revenue, profit };
        });
      },
    }),
    {
      name: 'breakfast-shop-storage',
    }
  )
);
