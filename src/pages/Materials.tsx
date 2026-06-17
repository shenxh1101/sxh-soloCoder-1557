import { useState } from 'react';
import { useStore } from '../store';
import { Edit2, Save, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getToday } from '../utils/date';

export default function Materials() {
  const today = getToday();
  const materials = useStore(state => state.materials);
  const updateMaterialPrice = useStore(state => state.updateMaterialPrice);
  const updateMaterialStock = useStore(state => state.updateMaterialStock);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    currentPrice: '',
    stock: '',
    safeStock: '',
  });

  const startEdit = (material: typeof materials[0]) => {
    setEditingId(material.id);
    setEditForm({
      currentPrice: material.currentPrice.toString(),
      stock: material.stock.toString(),
      safeStock: material.safeStock.toString(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ currentPrice: '', stock: '', safeStock: '' });
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const material = materials.find(m => m.id === editingId);
    if (!material) return;

    const newPrice = parseFloat(editForm.currentPrice) || 0;
    const newStock = parseFloat(editForm.stock) || 0;
    const newSafeStock = parseFloat(editForm.safeStock) || 0;

    if (newPrice !== material.currentPrice) {
      updateMaterialPrice(editingId, newPrice, today);
    }
    
    updateMaterialStock(editingId, newStock);

    const updatedMaterial = materials.find(m => m.id === editingId);
    if (updatedMaterial && updatedMaterial.safeStock !== newSafeStock) {
      updatedMaterial.safeStock = newSafeStock;
    }

    cancelEdit();
  };

  const getPriceTrend = (material: typeof materials[0]) => {
    if (material.priceHistory.length < 2) return 'stable';
    const sorted = [...material.priceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recent = sorted[sorted.length - 1].price;
    const previous = sorted[sorted.length - 2].price;
    if (recent > previous) return 'up';
    if (recent < previous) return 'down';
    return 'stable';
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brown-500">原料管理</h2>
        <p className="text-brown-400">管理原料进价、库存和安全库存，价格变动自动记录</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map(material => {
          const isLow = material.stock <= material.safeStock;
          const trend = getPriceTrend(material);
          const isEditing = editingId === material.id;

          return (
            <div
              key={material.id}
              className={`card animate-fadeInUp ${isLow ? 'border-red-300' : ''}`}
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-brown-500 flex items-center gap-2">
                      <span className="text-3xl">{material.emoji}</span>
                      编辑 {material.name}
                    </h3>
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
                    <label className="block text-sm font-medium text-brown-500 mb-2">
                      当前进价 (元/{material.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.currentPrice}
                      onChange={(e) => setEditForm(prev => ({ ...prev, currentPrice: e.target.value }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-500 mb-2">
                      当前库存 ({material.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.stock}
                      onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-500 mb-2">
                      安全库存 ({material.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.safeStock}
                      onChange={(e) => setEditForm(prev => ({ ...prev, safeStock: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        isLow ? 'bg-red-100' : 'bg-warm-100'
                      }`}>
                        <span className="text-3xl">{material.emoji}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-brown-500">{material.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-brown-400">单位: {material.unit}</span>
                          {trend === 'up' && (
                            <span className="flex items-center text-red-500 text-xs">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              涨价中
                            </span>
                          )}
                          {trend === 'down' && (
                            <span className="flex items-center text-green-500 text-xs">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              降价中
                            </span>
                          )}
                          {trend === 'stable' && (
                            <span className="flex items-center text-gray-500 text-xs">
                              <Minus className="w-3 h-3 mr-1" />
                              价格稳定
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(material)}
                      className="p-2 text-brown-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className={`p-3 rounded-xl text-center ${
                      isLow ? 'bg-red-50' : 'bg-warm-50'
                    }`}>
                      <p className={`text-xs mb-1 ${isLow ? 'text-red-600' : 'text-brown-500'}`}>
                        当前库存
                      </p>
                      <p className={`text-xl font-bold ${isLow ? 'text-red-700' : 'text-brown-500'}`}>
                        {material.stock.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-xl text-center">
                      <p className="text-xs text-orange-600 mb-1">当前进价</p>
                      <p className="text-xl font-bold text-orange-700">
                        ¥{material.currentPrice}
                      </p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl text-center">
                      <p className="text-xs text-primary-600 mb-1">安全库存</p>
                      <p className="text-xl font-bold text-primary-700">
                        {material.safeStock}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-brown-400">库存状态</span>
                      <span className={isLow ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {isLow ? '⚠️ 库存不足' : '✅ 库存充足'}
                      </span>
                    </div>
                    <div className="h-3 bg-warm-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((material.stock / (material.safeStock * 2)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {material.priceHistory.length > 1 && (
                    <div className="bg-warm-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-brown-500 mb-2">近期价格变动</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {[...material.priceHistory]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 5)
                          .map((record, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-brown-400">{record.date}</span>
                              <span className="font-medium text-brown-600">¥{record.price}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
