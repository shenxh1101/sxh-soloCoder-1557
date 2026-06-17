import { useMemo } from 'react';
import { useStore } from '../store';
import { getToday, getRecentDates } from '../utils/date';
import { calculateProductProfit } from '../utils/calculator';
import { ShoppingCart, TrendingUp, DollarSign, Percent, AlertTriangle, Lightbulb, ThumbsUp, AlertCircle, TrendingDown, Package, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../store/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const today = getToday();
  const materials = useStore(state => state.materials);
  const products = useStore(state => state.products);
  const getLowStockMaterials = useStore(state => state.getLowStockMaterials);
  const getPurchasesByDate = useStore(state => state.getPurchasesByDate);
  const getSalesByDate = useStore(state => state.getSalesByDate);
  const getWeeklyData = useStore(state => state.getWeeklyData);

  const todayPurchases = getPurchasesByDate(today);
  const todayPurchaseAmount = todayPurchases.reduce((sum, p) => sum + p.totalPrice, 0);

  const todaySales = getSalesByDate(today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const todayCost = todaySales.reduce((sum, s) => sum + s.totalCost, 0);
  const todayProfit = todayRevenue - todayCost;

  const lowStockMaterials = getLowStockMaterials();

  const productProfits = products.map(product => ({
    ...product,
    ...calculateProductProfit(product, materials),
  }));

  const topProduct = [...productProfits].sort((a, b) => b.profit - a.profit)[0];

  const weeklyData = getWeeklyData();
  const totalRevenue = weeklyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = weeklyData.reduce((sum, d) => sum + d.profit, 0);

  // ===== 经营建议分析 =====
  const recent7Days = useMemo(() => getRecentDates(7), []);

  // 最近7天每个产品的销量/收入/利润（按日聚合）
  const productRecentStats = useMemo(() => {
    const map = new Map<string, {
      product: Product;
      dailyQty: number[];
      dailyRevenue: number[];
      dailyProfit: number[];
      totalQty: number;
      totalRevenue: number;
      totalProfit: number;
      activeDays: number;
    }>();

    products.forEach(p => map.set(p.id, {
      product: p,
      dailyQty: [],
      dailyRevenue: [],
      dailyProfit: [],
      totalQty: 0,
      totalRevenue: 0,
      totalProfit: 0,
      activeDays: 0,
    }));

    recent7Days.forEach(date => {
      const sales = getSalesByDate(date);
      const perProductDay = new Map<string, { qty: number; revenue: number; profit: number }>();

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = perProductDay.get(item.productId) || { qty: 0, revenue: 0, profit: 0 };
          perProductDay.set(item.productId, {
            qty: existing.qty + item.quantity,
            revenue: existing.revenue + item.revenue,
            profit: existing.profit + item.profit,
          });
        });
      });

      products.forEach(p => {
        const stat = map.get(p.id)!;
        const dayData = perProductDay.get(p.id);
        if (dayData && dayData.qty > 0) {
          stat.dailyQty.push(dayData.qty);
          stat.dailyRevenue.push(dayData.revenue);
          stat.dailyProfit.push(dayData.profit);
          stat.totalQty += dayData.qty;
          stat.totalRevenue += dayData.revenue;
          stat.totalProfit += dayData.profit;
          stat.activeDays += 1;
        } else {
          stat.dailyQty.push(0);
          stat.dailyRevenue.push(0);
          stat.dailyProfit.push(0);
        }
      });
    });

    return Array.from(map.values());
  }, [products, recent7Days, getSalesByDate]);

  // 计算标准差系数（波动系数）
  const calcCv = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (mean === 0) return 0;
    const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance) / mean;
  };

  // 稳定产品：活跃天数多 + 利润率高 + 销量波动小
  const stableProducts = productRecentStats
    .filter(s => s.activeDays >= 4 && s.totalQty > 0)
    .map(s => {
      const pp = productProfits.find(p => p.id === s.product.id)!;
      return { ...s, profitMargin: pp.profitMargin, cv: calcCv(s.dailyQty.filter(q => q > 0)) || 999 };
    })
    .filter(s => s.profitMargin >= 25)
    .sort((a, b) => (b.activeDays * 100 + b.totalProfit) - (a.activeDays * 100 + a.totalProfit));

  // 波动较大需关注的产品：有销量但波动大
  const volatileProducts = productRecentStats
    .filter(s => s.totalQty > 0 && s.activeDays >= 3)
    .map(s => {
      const pp = productProfits.find(p => p.id === s.product.id)!;
      return { ...s, profitMargin: pp.profitMargin, cv: calcCv(s.dailyQty.filter(q => q > 0)) || 0 };
    })
    .filter(s => s.cv >= 0.5)
    .sort((a, b) => b.cv - a.cv);

  // 原料涨价分析
  const priceHikeMaterials = useMemo(() => {
    const productTotalQty: Record<string, number> = {};
    productRecentStats.forEach(s => { productTotalQty[s.product.id] = s.totalQty; });

    return materials
      .map(m => {
        const sorted = [...m.priceHistory].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        if (sorted.length < 2) return null;
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        if (prev.price <= 0) return null;
        const changePct = (last.price - prev.price) / prev.price * 100;
        if (changePct < 5) return null;

        const affectedProducts = products
          .filter(p => p.recipe.some(r => r.materialId === m.id))
          .map(p => ({
            ...p,
            totalQty: productTotalQty[p.id] || 0,
            materialRatio: p.recipe.find(r => r.materialId === m.id)!.quantity,
          }))
          .sort((a, b) => b.totalQty - a.totalQty);

        const hotProductsUse = affectedProducts.filter(p => p.totalQty > 0);

        return {
          material: m,
          oldPrice: prev.price,
          newPrice: last.price,
          changePct,
          lastDate: last.date,
          affectedProducts,
          hotUseCount: hotProductsUse.length,
          impactScore: hotProductsUse.reduce((sum, p) => sum + p.totalQty, 0),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.impactScore * b.changePct - a.impactScore * a.changePct);
  }, [materials, products, productRecentStats]);

  // ===== 明天备货建议 =====
  const stockingSuggestions = useMemo(() => {
    // 按总销量排序取前 6 个产品
    const ranked = productRecentStats
      .filter(s => s.totalQty > 0)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 6);

    if (ranked.length === 0) return { items: [], trend: 'neutral' as const };

    // 判断最近3天销量趋势
    const trend = (() => {
      let upCount = 0, downCount = 0;
      ranked.forEach(s => {
        const last3 = s.dailyQty.slice(-3);
        if (last3.length >= 2 && last3[last3.length - 1] > last3[last3.length - 2]) upCount++;
        else if (last3.length >= 2 && last3[last3.length - 1] < last3[last3.length - 2]) downCount++;
      });
      if (upCount > downCount * 1.5) return 'up' as const;
      if (downCount > upCount * 1.5) return 'down' as const;
      return 'neutral' as const;
    })();

    const items = ranked.map(s => {
      const avg = s.totalQty / Math.max(s.activeDays, 1);
      const conservative = Math.round(avg * 0.7);
      const normal = Math.round(avg);
      const aggressive = Math.round(avg * 1.3);

      // 计算受原料限制的最大可做份数
      const product = s.product;
      let maxByMaterial = Infinity;
      let limitingMaterial: string | null = null;
      product.recipe.forEach(r => {
        const mat = materials.find(m => m.id === r.materialId);
        if (mat) {
          const max = Math.floor(mat.stock / r.quantity);
          if (max < maxByMaterial) {
            maxByMaterial = max;
            limitingMaterial = mat.name;
          }
        }
      });

      return {
        product,
        avg: Math.round(avg),
        conservative,
        normal,
        aggressive,
        maxByMaterial,
        limitingMaterial,
        totalProfit: s.totalProfit,
      };
    });

    return { items, trend };
  }, [productRecentStats, materials]);

  const stockingStyle = {
    up: { label: '偏积极', color: 'text-green-600 bg-green-100', desc: '销量有上升趋势，可适度增加备货' },
    down: { label: '偏保守', color: 'text-yellow-700 bg-yellow-100', desc: '销量有下滑趋势，建议保守备货' },
    neutral: { label: '常规水平', color: 'text-blue-600 bg-blue-100', desc: '销量平稳，按常规量准备即可' },
  }[stockingSuggestions.trend];

  return (
    <div className="space-y-6 p-8">
      {lowStockMaterials.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 animate-fadeInUp">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ 库存预警</h3>
              <div className="flex flex-wrap gap-3">
                {lowStockMaterials.map(material => (
                  <div key={material.id} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-red-200 flex items-center gap-2 animate-pulse-slow">
                    <span className="text-2xl">{material.emoji}</span>
                    <span className="font-medium text-red-700">该买{material.name}了！</span>
                    <span className="text-sm text-red-500">(剩余 {material.stock}{material.unit}，安全库存 {material.safeStock}{material.unit})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card animate-fadeInUp">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary-600" />
            </div>
            <span className="text-sm text-brown-400">今日采购</span>
          </div>
          <p className="text-3xl font-bold text-brown-500">¥{todayPurchaseAmount.toFixed(2)}</p>
          <p className="text-sm text-brown-400 mt-1">{todayPurchases.length} 笔采购记录</p>
        </div>

        <div className="stat-card animate-fadeInUp delay-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-brown-400">今日销售额</span>
          </div>
          <p className="text-3xl font-bold text-green-600">¥{todayRevenue.toFixed(2)}</p>
          <p className="text-sm text-brown-400 mt-1">{todaySales.length > 0 ? `已录入 ${todaySales.length} 批次` : '还未录入销售'}</p>
        </div>

        <div className="stat-card animate-fadeInUp delay-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-brown-400">本周利润</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">¥{totalProfit.toFixed(2)}</p>
          <p className="text-sm text-brown-400 mt-1">本周累计</p>
        </div>

        <div className="stat-card animate-fadeInUp delay-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-brown-400">毛利率</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0.0'}%
          </p>
          <p className="text-sm text-brown-400 mt-1">本周平均</p>
        </div>
      </div>

      {/* 经营建议区 */}
      <div className="card animate-fadeInUp border-2 border-gradient-to-r from-primary-200 to-orange-200 bg-gradient-to-br from-primary-50 via-warm-50 to-orange-50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brown-500">经营建议</h3>
            <p className="text-sm text-brown-400">基于最近7天数据的自动分析</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 稳定拳头产品 */}
          <div className="bg-white rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-brown-600">稳定的拳头产品</h4>
            </div>
            {stableProducts.length > 0 ? (
              <div className="space-y-2">
                {stableProducts.slice(0, 3).map(s => (
                  <div key={s.product.id} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{s.product.emoji}</span>
                      <div>
                        <p className="font-medium text-brown-600">{s.product.name}</p>
                        <p className="text-xs text-brown-400">近7天卖{s.activeDays}天 · 共{s.totalQty}份</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{s.profitMargin.toFixed(0)}%毛利</p>
                      <p className="text-xs text-brown-400">¥{s.totalProfit.toFixed(0)}利润</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-green-700 mt-2 pl-1">
                  💡 销量稳定且利润好，作为主打，备货优先保障
                </p>
              </div>
            ) : (
              <p className="text-sm text-brown-400 text-center py-4">
                数据不足，继续录入销售记录后生成建议
              </p>
            )}
          </div>

          {/* 销量波动较大 */}
          {volatileProducts.length > 0 ? (
            <div className="bg-white rounded-xl p-4 border-2 border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5 text-yellow-600" />
                <h4 className="font-bold text-brown-600">销量波动较大</h4>
              </div>
              <div className="space-y-2">
                {volatileProducts.slice(0, 3).map(s => (
                  <div key={s.product.id} className="flex items-center justify-between p-2.5 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{s.product.emoji}</span>
                      <div>
                        <p className="font-medium text-brown-600">{s.product.name}</p>
                        <p className="text-xs text-brown-400">
                          日均{Math.round(s.totalQty / Math.max(s.activeDays, 1))}份
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-700">波动{(s.cv * 100).toFixed(0)}%</p>
                      <p className="text-xs text-brown-400">关注需求不稳</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-yellow-700 mt-2 pl-1">
                  ⚠️ 销量起伏大，建议灵活调整备货量避免浪费
                </p>
              </div>
            </div>
          ) : priceHikeMaterials.length === 0 ? null : null}

          {/* 原料涨价需关注定价 */}
          {priceHikeMaterials.length > 0 ? (
            <div className="bg-white rounded-xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h4 className="font-bold text-brown-600">原料涨价，关注定价</h4>
              </div>
              <div className="space-y-2">
                {priceHikeMaterials.slice(0, 3).map(h => (
                  <div key={h.material.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{h.material.emoji}</span>
                      <div>
                        <p className="font-medium text-brown-600">{h.material.name}</p>
                        <p className="text-xs text-brown-400">
                          {h.affectedProducts.slice(0, 2).map(p => p.emoji + p.name).join('、')}
                          {h.affectedProducts.length > 2 ? `等${h.affectedProducts.length}种` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">涨{h.changePct.toFixed(1)}%</p>
                      <p className="text-xs text-brown-400">¥{h.oldPrice.toFixed(2)}→¥{h.newPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-red-700 mt-2 pl-1">
                  💰 原料上涨影响大，建议核算成本后考虑调整售价
                </p>
              </div>
            </div>
          ) : null}

          {/* 无特殊提示 - 占位 */}
          {priceHikeMaterials.length === 0 && volatileProducts.length === 0 && (
            <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-brown-600">经营状况</h4>
              </div>
              <p className="text-sm text-brown-500 text-center py-4">
                🌱 近期经营平稳，继续保持
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 明天备货建议 */}
      <div className="card animate-fadeInUp delay-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brown-500">明天备货建议</h3>
              <p className="text-sm text-brown-400">基于最近7天日均销量测算</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${stockingStyle.color} flex items-center gap-1.5`}>
            {stockingSuggestions.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
            {stockingSuggestions.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
            {stockingSuggestions.trend === 'neutral' && <Minus className="w-4 h-4" />}
            {stockingStyle.label}
          </div>
        </div>

        {stockingSuggestions.items.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-2 px-3 text-brown-400 font-medium text-sm">产品</th>
                    <th className="text-center py-2 px-3 text-brown-400 font-medium text-sm">近7天日均</th>
                    <th className="text-center py-2 px-3 text-brown-400 font-medium text-sm">
                      保守
                      <span className="block text-xs text-brown-300 font-normal">×0.7</span>
                    </th>
                    <th className="text-center py-2 px-3 text-brown-400 font-medium text-sm">
                      常规
                      <span className="block text-xs text-brown-300 font-normal">×1.0</span>
                    </th>
                    <th className="text-center py-2 px-3 text-brown-400 font-medium text-sm">
                      积极
                      <span className="block text-xs text-brown-300 font-normal">×1.3</span>
                    </th>
                    <th className="text-right py-2 px-3 text-brown-400 font-medium text-sm">当前库存可做</th>
                  </tr>
                </thead>
                <tbody>
                  {stockingSuggestions.items.map(item => {
                    const limited = item.maxByMaterial < item.normal;
                    return (
                      <tr key={item.product.id} className="border-b border-warm-100 hover:bg-warm-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.product.emoji}</span>
                            <span className="font-medium text-brown-600">{item.product.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-brown-500 font-medium">{item.avg} 份</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[50px] px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg font-bold text-sm">
                            {item.conservative}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[50px] px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-sm">
                            {item.normal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[50px] px-2 py-1 bg-primary-50 text-primary-600 rounded-lg font-bold text-sm">
                            {item.aggressive}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.maxByMaterial === Infinity ? (
                            <span className="text-brown-400 text-sm">-</span>
                          ) : (
                            <div>
                              <span className={`font-bold text-sm ${limited ? 'text-red-600' : 'text-green-600'}`}>
                                {item.maxByMaterial} 份
                              </span>
                              {limited && item.limitingMaterial && (
                                <p className="text-xs text-red-500 mt-0.5">受{item.limitingMaterial}限制</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-brown-400 mt-3 pl-1">
              {stockingStyle.desc} · 保守建议不易浪费，积极建议不易缺货，请根据实际情况调整
            </p>
          </div>
        ) : (
          <p className="text-sm text-brown-400 text-center py-8">
            暂无销售数据，录入销售记录后生成备货建议
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fadeInUp">
          <h3 className="text-lg font-bold text-brown-500 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/purchase')}
              className="flex flex-col items-center justify-center p-6 bg-primary-50 rounded-2xl border-2 border-primary-200 hover:border-primary-400 transition-all duration-300 group"
            >
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🛒</span>
              <span className="font-bold text-primary-700">录入采购</span>
              <span className="text-sm text-primary-500 mt-1">记录今日采购</span>
            </button>
            <button
              onClick={() => navigate('/sales')}
              className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 group"
            >
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📊</span>
              <span className="font-bold text-green-700">录入销售</span>
              <span className="text-sm text-green-500 mt-1">记录今日销售</span>
            </button>
          </div>
        </div>

        <div className="card animate-fadeInUp delay-100">
          <h3 className="text-lg font-bold text-brown-500 mb-4">最赚钱的产品</h3>
          {topProduct && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-orange-50 rounded-2xl border border-primary-200">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-5xl">{topProduct.emoji}</span>
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-brown-500">{topProduct.name}</p>
                <p className="text-2xl font-bold text-primary-600 mt-1">
                  ¥{topProduct.profit.toFixed(2)}
                  <span className="text-sm font-normal text-brown-400">/份利润</span>
                </p>
                <p className="text-sm text-brown-400 mt-1">
                  售价 ¥{topProduct.price} · 成本 ¥{topProduct.cost.toFixed(2)} · 毛利率 {topProduct.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="bg-primary-500 text-white px-4 py-2 rounded-xl font-bold">🏆 冠军</div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {productProfits
              .filter(p => p.id !== topProduct?.id)
              .sort((a, b) => b.profit - a.profit)
              .slice(0, 3)
              .map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{product.emoji}</span>
                    <span className="font-medium text-brown-500">{product.name}</span>
                  </div>
                  <span className="font-bold text-brown-500">¥{product.profit.toFixed(2)}/份</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card animate-fadeInUp delay-200">
        <h3 className="text-lg font-bold text-brown-500 mb-4">原料库存</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {materials.map(material => {
            const isLow = material.stock <= material.safeStock;
            const percentage = (material.stock / (material.safeStock * 2)) * 100;
            return (
              <div
                key={material.id}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isLow ? 'bg-red-50 border-red-200' : 'bg-warm-50 border-warm-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{material.emoji}</span>
                  <span className="font-bold text-brown-500">{material.name}</span>
                </div>
                <p className={`text-2xl font-bold ${isLow ? 'text-red-600' : 'text-brown-500'}`}>
                  {material.stock.toFixed(1)}
                  <span className="text-sm font-normal text-brown-400">{material.unit}</span>
                </p>
                <div className="mt-2 h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-primary-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-brown-400 mt-1">安全库存: {material.safeStock}{material.unit}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
