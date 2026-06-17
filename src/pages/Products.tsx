import { useState } from 'react';
import { useStore } from '../store';
import { calculateProductProfit, getRecipeDisplay } from '../utils/calculator';
import { Edit2, Save, X } from 'lucide-react';

export default function Products() {
  const materials = useStore(state => state.materials);
  const products = useStore(state => state.products);
  const updateProduct = useStore(state => state.updateProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    recipe: [] as { materialId: string; quantity: string }[],
  });

  const startEdit = (product: typeof products[0]) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      recipe: product.recipe.map(r => ({
        materialId: r.materialId,
        quantity: r.quantity.toString(),
      })),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', price: '', recipe: [] });
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const product = products.find(p => p.id === editingId);
    if (!product) return;

    const existingMaterialIds = product.recipe.map(r => r.materialId);
    const formMaterialIds = editForm.recipe.map(r => r.materialId);
    
    const newRecipe = editForm.recipe
      .filter(r => r.materialId && r.quantity)
      .map(r => ({
        materialId: r.materialId,
        quantity: parseFloat(r.quantity) || 0,
      }));

    materials.forEach(material => {
      if (formMaterialIds.includes(material.id) && !existingMaterialIds.includes(material.id)) {
        const existing = newRecipe.find(r => r.materialId === material.id);
        if (!existing) {
          newRecipe.push({ materialId: material.id, quantity: 0 });
        }
      }
    });

    updateProduct(editingId, {
      name: editForm.name,
      price: parseFloat(editForm.price) || 0,
      recipe: newRecipe,
    });

    cancelEdit();
  };

  const updateRecipeQuantity = (materialId: string, value: string) => {
    setEditForm(prev => {
      const existing = prev.recipe.find(r => r.materialId === materialId);
      if (existing) {
        return {
          ...prev,
          recipe: prev.recipe.map(r =>
            r.materialId === materialId ? { ...r, quantity: value } : r
          ),
        };
      }
      return {
        ...prev,
        recipe: [...prev.recipe, { materialId, quantity: value }],
      };
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brown-500">产品管理</h2>
        <p className="text-brown-400">管理产品配方和售价，系统自动计算成本和利润</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {products.map(product => {
          const { cost, profit, profitMargin } = calculateProductProfit(product, materials);
          const isEditing = editingId === product.id;

          return (
            <div
              key={product.id}
              className="card animate-fadeInUp"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-brown-500">编辑产品</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        取消
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-500 mb-2">产品名称</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-500 mb-2">售价 (元)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-500 mb-3">配方设置</label>
                    <div className="space-y-3">
                      {materials.map(material => {
                        const recipeItem = editForm.recipe.find(r => r.materialId === material.id);
                        const originalRecipe = product.recipe.find(r => r.materialId === material.id);
                        const hasOriginal = originalRecipe !== undefined;
                        
                        return (
                          <div
                            key={material.id}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              hasOriginal || recipeItem
                                ? 'bg-primary-50 border-primary-200'
                                : 'bg-warm-50 border-warm-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{material.emoji}</span>
                                <span className="font-medium text-brown-500">{material.name}</span>
                                <span className="text-sm text-brown-400">({material.unit})</span>
                                {hasOriginal && (
                                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                    原配方
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={recipeItem?.quantity || ''}
                                onChange={(e) => updateRecipeQuantity(material.id, e.target.value)}
                                placeholder={originalRecipe?.quantity.toString() || '0'}
                                className="w-28 input-field text-right"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-warm-100 rounded-2xl flex items-center justify-center">
                        <span className="text-4xl">{product.emoji}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-brown-500">{product.name}</h3>
                        <p className="text-2xl font-bold text-primary-600">
                          ¥{product.price}
                          <span className="text-sm font-normal text-brown-400">/份</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(product)}
                      className="p-2 text-brown-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-orange-50 rounded-xl text-center">
                      <p className="text-xs text-orange-600 mb-1">单位成本</p>
                      <p className="text-lg font-bold text-orange-700">¥{cost.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-center">
                      <p className="text-xs text-green-600 mb-1">单位利润</p>
                      <p className="text-lg font-bold text-green-700">¥{profit.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl text-center">
                      <p className="text-xs text-primary-600 mb-1">利润率</p>
                      <p className="text-lg font-bold text-primary-700">{profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="bg-warm-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-brown-500 mb-2">配方</p>
                    <p className="text-brown-400">
                      {getRecipeDisplay(product.recipe, materials) || '暂无配方'}
                    </p>
                  </div>

                  <div className="mt-4 h-2 bg-warm-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(profitMargin, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
