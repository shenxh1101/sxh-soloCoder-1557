import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Material, Product, Purchase, Sale } from './types';
import { seedMaterials, seedProducts } from '../data/seed';
import { generateId, getWeekDates } from '../utils/date';
import { calculateSaleItem, calculateTotalMaterialConsumption } from '../utils/calculator';

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
          materials: state.materials.map((m) =>
            m.id === id
              ? {
                  ...m,
                  currentPrice: newPrice,
                  priceHistory: [...m.priceHistory, { date, price: newPrice }],
                }
              : m
          ),
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
          if (material) {
            state.updateMaterialStock(
              purchase.materialId,
              material.stock + purchase.quantity
            );
            if (purchase.unitPrice !== material.currentPrice) {
              state.updateMaterialPrice(
                purchase.materialId,
                purchase.unitPrice,
                purchase.date
              );
            }
          }
          return {
            purchases: [...state.purchases, newPurchase],
          };
        });
      },

      deletePurchase: (id) =>
        set((state) => {
          const purchase = state.purchases.find(p => p.id === id);
          if (purchase) {
            const material = state.materials.find(m => m.id === purchase.materialId);
            if (material) {
              state.updateMaterialStock(
                purchase.materialId,
                Math.max(0, material.stock - purchase.quantity)
              );
            }
          }
          return {
            purchases: state.purchases.filter(p => p.id !== id),
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
        consumption.forEach((quantity, materialId) => {
          const material = state.materials.find(m => m.id === materialId);
          if (material) {
            state.updateMaterialStock(
              materialId,
              Math.max(0, material.stock - quantity)
            );
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
        }));
      },

      deleteSale: (id) =>
        set((state) => {
          const sale = state.sales.find(s => s.id === id);
          if (sale) {
            const consumption = calculateTotalMaterialConsumption(sale.items);
            consumption.forEach((quantity, materialId) => {
              const material = state.materials.find(m => m.id === materialId);
              if (material) {
                state.updateMaterialStock(
                  materialId,
                  material.stock + quantity
                );
              }
            });
          }
          return {
            sales: state.sales.filter(s => s.id !== id),
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
