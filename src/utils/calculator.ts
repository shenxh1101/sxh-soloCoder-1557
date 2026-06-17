import { Product, Material, SaleItem, RecipeItem } from '../store/types';

export const calculateProductCost = (
  product: Product,
  materials: Material[]
): number => {
  return product.recipe.reduce((totalCost, recipeItem) => {
    const material = materials.find(m => m.id === recipeItem.materialId);
    if (!material) return totalCost;
    return totalCost + recipeItem.quantity * material.currentPrice;
  }, 0);
};

export const calculateProductProfit = (
  product: Product,
  materials: Material[]
): { cost: number; profit: number; profitMargin: number } => {
  const cost = calculateProductCost(product, materials);
  const profit = product.price - cost;
  const profitMargin = product.price > 0 ? (profit / product.price) * 100 : 0;
  return { cost, profit, profitMargin };
};

export const calculateMaterialConsumption = (
  productId: string,
  quantity: number,
  products: Product[]
): { materialId: string; quantity: number }[] => {
  const product = products.find(p => p.id === productId);
  if (!product) return [];
  
  return product.recipe.map(recipeItem => ({
    materialId: recipeItem.materialId,
    quantity: recipeItem.quantity * quantity,
  }));
};

export const calculateSaleItem = (
  productId: string,
  quantity: number,
  products: Product[],
  materials: Material[]
): SaleItem => {
  const product = products.find(p => p.id === productId);
  if (!product) {
    return {
      productId,
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      materialConsumption: [],
    };
  }
  
  const productCost = calculateProductCost(product, materials);
  const revenue = quantity * product.price;
  const cost = quantity * productCost;
  const profit = revenue - cost;
  const materialConsumption = calculateMaterialConsumption(productId, quantity, products);
  
  return {
    productId,
    quantity,
    revenue,
    cost,
    profit,
    materialConsumption,
  };
};

export const calculateTotalMaterialConsumption = (
  saleItems: SaleItem[]
): Map<string, number> => {
  const totalConsumption = new Map<string, number>();
  
  saleItems.forEach(item => {
    item.materialConsumption.forEach(consumption => {
      const current = totalConsumption.get(consumption.materialId) || 0;
      totalConsumption.set(consumption.materialId, current + consumption.quantity);
    });
  });
  
  return totalConsumption;
};

export const getRecipeDisplay = (
  recipe: RecipeItem[],
  materials: Material[]
): string => {
  return recipe
    .map(item => {
      const material = materials.find(m => m.id === item.materialId);
      if (!material) return '';
      return `${material.name}${item.quantity}${material.unit}`;
    })
    .filter(Boolean)
    .join(' + ');
};
