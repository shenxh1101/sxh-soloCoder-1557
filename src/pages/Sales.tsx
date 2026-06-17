import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { SALE_PERIOD_LABELS, SalePeriod } from '../store/types';
import { getToday } from '../utils/date';
import { calculateSaleItem, calculateTotalMaterialConsumption } from '../utils/calculator';
import { Plus, Trash2, Calendar, ChefHat } from 'lucide-react';

const PERIOD_ORDER: SalePeriod[] = ['morning', 'noon', 'evening'];
const PERIOD_EMOJI: Record<SalePeriod, string> = { morning: '🌅', noon: '☀️', evening: '🌆' };

export default function Sales() {
  const today = getToday();
  const products = useStore(state => state.products);
  const materials = useStore(state => state.materials);
  const sales = useStore(state => state.sales);
  const addSale = useStore(state => state.addSale);
  const deleteSale = useStore(state => state.deleteSale);
  const getSalesByDate = useStore(state => state.getSalesByDate);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedPeriod, setSelectedPeriod] = useState<SalePeriod>('morning');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const daySales = getSalesByDate(selectedDate);
  const existingPeriods = new Set(daySales.map(s => s.period));
  const hasExistingPeriod = existingPeriods.has(selectedPeriod);

  const mergedDaySale = useMemo(() => {
    if (daySales.length === 0) return null;
    const totalRevenue = daySales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = daySales.reduce((sum, s) => sum + s.totalCost, 0);
    const grossProfit = daySales.reduce((sum, s) => sum + s.grossProfit, 0);
    const allItems = new Map<string, { productId: string; quantity: number; revenue: number; cost: number; profit: number; materialConsumption: { materialId: string; quantity: number }[] }>();
    daySales.forEach(s => {
      s.items.forEach(item => {
        const existing = allItems.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
          existing.cost += item.cost;
          existing.profit += item.profit;
          item.materialConsumption.forEach(mc => {
            const e = existing.materialConsumption.find(m => m.materialId === mc.materialId);
            if (e) e.quantity += mc.quantity;
            else existing.materialConsumption.push({ ...mc });
          });
        } else {
          allItems.set(item.productId, {
            ...item,
            materialConsumption: [...item.materialConsumption],
          });
        }
      });
    });
    return {
      totalRevenue,
      totalCost,
      grossProfit,
      items: Array.from(allItems.values()),
    };
  }, [daySales]);

  const handleQuantityChange = (productId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const previewItems = useMemo(() => {
    return products.map(product => {
      const qty = parseFloat(quantities[product.id] || '0') || 0;
      return calculateSaleItem(product.id, qty, products, materials);
    }).filter(item => item.quantity > 0);
  }, [quantities, products, materials]);

  const totalPreviewRevenue = previewItems.reduce((sum, item) => sum + item.revenue, 0);
  const totalPreviewCost = previewItems.reduce((sum, item) => sum + item.cost, 0);
  const totalPreviewProfit = totalPreviewRevenue - totalPreviewCost;

  const handleSubmit = () => {
    if (previewItems.length === 0) return;
    if (hasExistingPeriod) {
      if (!confirm(`${SALE_PERIOD_LABELS[selectedPeriod]}已经录入过了，确定要覆盖吗？`)) return;
      const existing = daySales.find(s => s.period === selectedPeriod);
      if (existing) deleteSale(existing.id);
    }

    addSale({
      date: selectedDate,
      period: selectedPeriod,
      items: previewItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    setQuantities({});
  };

  const consumption = useMemo(() => {
    if (!mergedDaySale) return new Map();
    return calculateTotalMaterialConsumption(mergedDaySale.items);
  }, [mergedDaySale]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">销售管理</h2>
          <p className="text-brown-400">录入每日销售，支持早中晚分批录入</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow border border-warm-200">
          <Calendar className="w-5 h-5 text-primary-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none text-brown-500 font-medium"
          />
        </div>
      </div>

      <div className="card animate-fadeInUp">
        <h3 className="text-lg font-bold text-brown-500 mb-4 flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary-500" />
          录入销售数量
        </h3>

        <div className="flex gap-2 mb-6">
          {PERIOD_ORDER.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                selectedPeriod === p
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
              }`}
            >
              <span>{PERIOD_EMOJI[p]}</span>
              {SALE_PERIOD_LABELS[p]}
              {existingPeriods.has(p) && (
                <span className={`w-2 h-2 rounded-full ${selectedPeriod === p ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className="p-4 bg-warm-50 rounded-2xl border-2 border-warm-200 hover:border-primary-300 transition-all duration-300"
            >
              <div className="text-center mb-3">
                <span className="text-4xl block mb-2">{product.emoji}</span>
                <p className="font-bold text-brown-500">{product.name}</p>
                <p className="text-sm text-primary-600 font-medium">¥{product.price}/份</p>
              </div>
              <input
                type="number"
                min="0"
                value={quantities[product.id] || ''}
                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                placeholder="0"
                className="input-field text-center text-xl font-bold"
              />
            </div>
          ))}
        </div>

        {previewItems.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-2xl text-center">
                <p className="text-sm text-green-600 mb-1">预计销售额</p>
                <p className="text-3xl font-bold text-green-700">¥{totalPreviewRevenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-2xl text-center">
                <p className="text-sm text-orange-600 mb-1">预计原料成本</p>
                <p className="text-3xl font-bold text-orange-700">¥{totalPreviewCost.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-2xl text-center">
                <p className="text-sm text-primary-600 mb-1">预计毛利</p>
                <p className="text-3xl font-bold text-primary-700">¥{totalPreviewProfit.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-warm-50 rounded-2xl p-4 mb-4">
              <h4 className="font-bold text-brown-500 mb-3">预计原料消耗</h4>
              <div className="flex flex-wrap gap-3">
                {Array.from(calculateTotalMaterialConsumption(previewItems).entries()).map(([materialId, qty]) => {
                  const material = materials.find(m => m.id === materialId);
                  return (
                    <span key={materialId} className="px-4 py-2 bg-white rounded-xl border border-warm-200">
                      {material?.emoji} {material?.name}: {qty.toFixed(2)}{material?.unit}
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="btn-primary w-full text-lg py-4"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              确认录入{SALE_PERIOD_LABELS[selectedPeriod]}销售
              {hasExistingPeriod ? '（覆盖）' : ''}
            </button>
          </div>
        )}
      </div>

      {daySales.length > 0 && (
        <div className="space-y-4">
          <div className="card animate-fadeInUp delay-100 bg-gradient-to-r from-green-50 to-primary-50 border-green-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1 bg-green-500 text-white rounded-full text-sm font-medium mb-3">
                  ✅ 已录入 {daySales.length} 批次
                </span>
                <h3 className="text-xl font-bold text-brown-500">{selectedDate} 销售汇总</h3>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-sm text-brown-400">销售额</p>
                  <p className="text-3xl font-bold text-green-600">¥{mergedDaySale!.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-brown-400">成本</p>
                  <p className="text-3xl font-bold text-orange-600">¥{mergedDaySale!.totalCost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-brown-400">毛利</p>
                  <p className="text-3xl font-bold text-primary-600">¥{mergedDaySale!.grossProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PERIOD_ORDER.map(p => {
              const batch = daySales.find(s => s.period === p);
              return (
                <div key={p} className={`card animate-fadeInUp ${batch ? 'border-green-200' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{PERIOD_EMOJI[p]}</span>
                      <h4 className="font-bold text-brown-500">{SALE_PERIOD_LABELS[p]}</h4>
                    </div>
                    {batch && (
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除${SALE_PERIOD_LABELS[p]}的销售记录吗？库存将同步恢复。`)) {
                            deleteSale(batch.id);
                          }
                        }}
                        className="p-1.5 text-brown-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {batch ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-400">销售额</span>
                        <span className="font-medium text-green-600">¥{batch.totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-400">成本</span>
                        <span className="font-medium text-orange-600">¥{batch.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-400">毛利</span>
                        <span className="font-bold text-primary-600">¥{batch.grossProfit.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-warm-100">
                        {batch.items.filter(i => i.quantity > 0).map(item => {
                          const prod = products.find(pr => pr.id === item.productId);
                          return (
                            <div key={item.productId} className="flex justify-between text-xs text-brown-500">
                              <span>{prod?.emoji} {prod?.name}</span>
                              <span>{item.quantity}份</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-brown-400 text-center py-4">未录入</p>
                  )}
                </div>
              );
            })}
          </div>

          {mergedDaySale && mergedDaySale.items.length > 0 && (
            <div className="card animate-fadeInUp delay-200">
              <h3 className="text-lg font-bold text-brown-500 mb-4">各产品销售明细（汇总）</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-warm-200">
                      <th className="text-left py-3 px-4 text-brown-400 font-medium">产品</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">销量</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">单位成本</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">总收入</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">总成本</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">利润</th>
                      <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedDaySale.items
                      .sort((a, b) => b.profit - a.profit)
                      .map(item => {
                        const product = products.find(p => p.id === item.productId);
                        const unitCost = item.quantity > 0 ? item.cost / item.quantity : 0;
                        const profitRate = item.revenue > 0 ? (item.profit / item.revenue * 100) : 0;
                        return (
                          <tr key={item.productId} className="border-b border-warm-100 hover:bg-warm-50">
                            <td className="py-3 px-4">
                              <span className="flex items-center gap-2">
                                <span className="text-2xl">{product?.emoji}</span>
                                <span className="text-brown-500 font-medium">{product?.name}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-brown-500 font-bold">{item.quantity} 份</td>
                            <td className="py-3 px-4 text-right text-brown-500">¥{unitCost.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-green-600">¥{item.revenue.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-orange-600">¥{item.cost.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-primary-600">¥{item.profit.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                profitRate >= 50 ? 'bg-green-100 text-green-700' :
                                profitRate >= 30 ? 'bg-primary-100 text-primary-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {profitRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card animate-fadeInUp delay-300">
            <h3 className="text-lg font-bold text-brown-500 mb-4">今日原料消耗</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from(consumption.entries()).map(([materialId, qty]) => {
                const material = materials.find(m => m.id === materialId);
                return (
                  <div key={materialId} className="p-4 bg-warm-50 rounded-2xl border border-warm-200 text-center">
                    <span className="text-3xl block mb-2">{material?.emoji}</span>
                    <p className="font-medium text-brown-500">{material?.name}</p>
                    <p className="text-2xl font-bold text-primary-600 mt-1">
                      {qty.toFixed(2)}
                      <span className="text-sm font-normal text-brown-400">{material?.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card animate-fadeInUp delay-400">
        <h3 className="text-lg font-bold text-brown-500 mb-4">历史销售记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-warm-200">
                <th className="text-left py-3 px-4 text-brown-400 font-medium">日期</th>
                <th className="text-left py-3 px-4 text-brown-400 font-medium">批次</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">销售额</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">成本</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">毛利</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">毛利率</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {[...sales]
                .sort((a, b) => {
                  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (dateDiff !== 0) return dateDiff;
                  return PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period);
                })
                .slice(0, 30)
                .map(sale => {
                  const profitRate = sale.totalRevenue > 0 ? (sale.grossProfit / sale.totalRevenue * 100) : 0;
                  return (
                    <tr key={sale.id} className="border-b border-warm-100 hover:bg-warm-50">
                      <td className="py-3 px-4 text-brown-500 font-medium">{sale.date}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-100 rounded-full text-sm">
                          {PERIOD_EMOJI[sale.period]} {SALE_PERIOD_LABELS[sale.period]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">¥{sale.totalRevenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">¥{sale.totalCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">¥{sale.grossProfit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          profitRate >= 50 ? 'bg-green-100 text-green-700' :
                          profitRate >= 30 ? 'bg-primary-100 text-primary-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {profitRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这条销售记录吗？')) {
                              deleteSale(sale.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center py-8 text-brown-400">暂无历史记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
