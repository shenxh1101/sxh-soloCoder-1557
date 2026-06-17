import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SALE_PERIOD_LABELS, SalePeriod } from '../store/types';
import { calculateProductProfit } from '../utils/calculator';
import { getToday, getRecentDates, getDateRange, getWeekDayName } from '../utils/date';
import { Calendar, TrendingUp, TrendingDown, Award, BarChart3, PackageSearch, ChevronDown, ChevronUp, AlertCircle, Sparkles, Activity, GitCompare, CheckCircle2, XCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

const PERIOD_ORDER: SalePeriod[] = ['morning', 'noon', 'evening'];
const PERIOD_EMOJI: Record<SalePeriod, string> = { morning: '🌅', noon: '☀️', evening: '🌆' };
const barColors = ['#FF8C42', '#FFB74D', '#FFD180', '#FFE0B2', '#FFECB3', '#FFF8E1'];

const COMPARE_COLORS = ['#FF8C42', '#2196F3'];

type ViewMode = 'day' | 'week' | 'product';
type TimeRangeMode = '7d' | '30d' | 'custom';

export default function Profit() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [timeRangeMode, setTimeRangeMode] = useState<TimeRangeMode>('7d');
  const [customStart, setCustomStart] = useState(getRecentDates(7)[0]);
  const [customEnd, setCustomEnd] = useState(getToday());

  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const [compareMode, setCompareMode] = useState(false);
  const [compareProductId, setCompareProductId] = useState<string>('');

  const materials = useStore(state => state.materials);
  const products = useStore(state => state.products);
  const sales = useStore(state => state.sales);
  const getSalesByDate = useStore(state => state.getSalesByDate);

  const daySales = getSalesByDate(selectedDate);

  const mergedDayData = useMemo(() => {
    if (daySales.length === 0) return null;
    const totalRevenue = daySales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = daySales.reduce((sum, s) => sum + s.totalCost, 0);
    const grossProfit = totalRevenue - totalCost;
    const allItems = new Map<string, { productId: string; quantity: number; revenue: number; cost: number; profit: number }>();
    daySales.forEach(s => {
      s.items.forEach(item => {
        const existing = allItems.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
          existing.cost += item.cost;
          existing.profit += item.profit;
        } else {
          allItems.set(item.productId, { ...item });
        }
      });
    });
    return { totalRevenue, totalCost, grossProfit, items: Array.from(allItems.values()) };
  }, [daySales]);

  // 批次合计对账（批次加总之和 vs 当天总汇总）
  const periodTotals = useMemo(() => {
    if (!mergedDayData) return null;
    const sumRevenue = daySales.reduce((s, x) => s + x.totalRevenue, 0);
    const sumCost = daySales.reduce((s, x) => s + x.totalCost, 0);
    const sumProfit = daySales.reduce((s, x) => s + x.grossProfit, 0);
    const diffRevenue = Math.abs(sumRevenue - mergedDayData.totalRevenue);
    const diffCost = Math.abs(sumCost - mergedDayData.totalCost);
    const diffProfit = Math.abs(sumProfit - mergedDayData.grossProfit);
    const balanced = diffRevenue < 0.01 && diffCost < 0.01 && diffProfit < 0.01;
    return { sumRevenue, sumCost, sumProfit, balanced, diffRevenue, diffCost, diffProfit };
  }, [daySales, mergedDayData]);

  const dayProductProfits = useMemo(() => {
    return products.map(product => {
      const saleItem = mergedDayData?.items.find(i => i.productId === product.id);
      const soldQuantity = saleItem?.quantity || 0;
      let unitCost: number, unitProfit: number, profitMargin: number;
      if (soldQuantity > 0 && saleItem) {
        unitCost = saleItem.cost / soldQuantity;
        unitProfit = saleItem.profit / soldQuantity;
        profitMargin = saleItem.revenue > 0 ? (saleItem.profit / saleItem.revenue) * 100 : 0;
      } else {
        const pd = calculateProductProfit(product, materials);
        unitCost = pd.cost;
        unitProfit = pd.profit;
        profitMargin = pd.profitMargin;
      }
      return {
        ...product, cost: unitCost, profit: unitProfit, profitMargin,
        soldQuantity,
        totalProfit: saleItem?.profit || 0,
        totalRevenue: saleItem?.revenue || 0,
        totalCost: saleItem?.cost || 0,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [products, materials, mergedDayData]);

  const weekData = useMemo(() => {
    const weekDates = getRecentDates(7);
    return weekDates.map(date => {
      const ds = sales.filter(s => s.date === date);
      const revenue = ds.reduce((sum, s) => sum + s.totalRevenue, 0);
      const cost = ds.reduce((sum, s) => sum + s.totalCost, 0);
      const profit = ds.reduce((sum, s) => sum + s.grossProfit, 0);
      return { date, name: getWeekDayName(date), revenue, cost, profit };
    });
  }, [sales]);

  const weekTotal = useMemo(() => ({
    revenue: weekData.reduce((s, d) => s + d.revenue, 0),
    cost: weekData.reduce((s, d) => s + d.cost, 0),
    profit: weekData.reduce((s, d) => s + d.profit, 0),
  }), [weekData]);

  const productRangeDates = useMemo(() => {
    if (timeRangeMode === '7d') return getRecentDates(7);
    if (timeRangeMode === '30d') return getRecentDates(30);
    return getDateRange(customStart, customEnd);
  }, [timeRangeMode, customStart, customEnd]);

  const getProductTrendData = (pid: string) => {
    if (!pid) return [];
    const dateSet = new Set(productRangeDates);
    const sorted = [...sales].filter(s => dateSet.has(s.date)).sort((a, b) => a.date.localeCompare(b.date));
    const dateMap = new Map<string, { quantity: number; revenue: number; cost: number; profit: number; margin: number }>();
    productRangeDates.forEach(d => dateMap.set(d, { quantity: 0, revenue: 0, cost: 0, profit: 0, margin: 0 }));
    sorted.forEach(sale => {
      const item = sale.items.find(i => i.productId === pid);
      if (!item) return;
      const existing = dateMap.get(sale.date);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
        existing.cost += item.cost;
        existing.profit += item.profit;
      }
    });
    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      weekday: getWeekDayName(date),
      ...data,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
    }));
  };

  const mainProductId = selectedProductId || products[0]?.id || '';
  const secondProductId = compareProductId || (products[1]?.id || '');

  const productTrendData = useMemo(() => getProductTrendData(mainProductId), [mainProductId, productRangeDates, sales]);

  const compareTrendData = useMemo(() => {
    if (!compareMode || !secondProductId) return [];
    return getProductTrendData(secondProductId);
  }, [compareMode, secondProductId, productRangeDates, sales]);

  // 合并两个产品的趋势（用于对比图）
  const compareCombinedData = useMemo(() => {
    if (!compareMode || !secondProductId) return [];
    const data1 = productTrendData;
    const data2 = compareTrendData;
    const p1 = products.find(p => p.id === mainProductId);
    const p2 = products.find(p => p.id === secondProductId);
    return data1.map((d1, i) => {
      const d2 = data2[i];
      return {
        date: d1.date,
        [`${p1?.name || '产品1'}_销量`]: d1.quantity,
        [`${p1?.name || '产品1'}_利润`]: d1.profit,
        [`${p1?.name || '产品1'}_毛利率`]: d1.margin,
        [`${p2?.name || '产品2'}_销量`]: d2?.quantity || 0,
        [`${p2?.name || '产品2'}_利润`]: d2?.profit || 0,
        [`${p2?.name || '产品2'}_毛利率`]: d2?.margin || 0,
      };
    });
  }, [compareMode, mainProductId, secondProductId, productTrendData, compareTrendData, products]);

  // 对比结论
  const compareConclusion = useMemo(() => {
    if (!compareMode || !secondProductId || productTrendData.length === 0) return null;
    const p1 = products.find(p => p.id === mainProductId)!;
    const p2 = products.find(p => p.id === secondProductId)!;
    const d1 = productTrendData;
    const d2 = compareTrendData;

    const totalQty1 = d1.reduce((s, d) => s + d.quantity, 0);
    const totalQty2 = d2.reduce((s, d) => s + d.quantity, 0);
    const totalProfit1 = d1.reduce((s, d) => s + d.profit, 0);
    const totalProfit2 = d2.reduce((s, d) => s + d.profit, 0);

    const avgMargin1 = totalQty1 > 0 ? (totalProfit1 / d1.reduce((s, d) => s + d.revenue, 0)) * 100 : 0;
    const avgMargin2 = totalQty2 > 0 ? (totalProfit2 / d2.reduce((s, d) => s + d.revenue, 0)) * 100 : 0;

    // 稳定性：按销量波动系数
    const qtyArr1 = d1.map(d => d.quantity);
    const qtyArr2 = d2.map(d => d.quantity);
    const cv1 = calcCv(qtyArr1);
    const cv2 = calcCv(qtyArr2);

    const moreProfitable = totalProfit1 > totalProfit2 ? p1 : p2;
    const higherMargin = avgMargin1 > avgMargin2 ? p1 : p2;
    const moreStable = cv1 < cv2 ? p1 : p2;
    const moreSales = totalQty1 > totalQty2 ? p1 : p2;

    return {
      p1: { name: p1.name, emoji: p1.emoji, totalQty: totalQty1, totalProfit: totalProfit1, avgMargin: avgMargin1, cv: cv1 },
      p2: { name: p2.name, emoji: p2.emoji, totalQty: totalQty2, totalProfit: totalProfit2, avgMargin: avgMargin2, cv: cv2 },
      moreProfitable,
      higherMargin,
      moreStable,
      moreSales,
    };
  }, [compareMode, mainProductId, secondProductId, productTrendData, compareTrendData, products]);

  const productVolatilityDays = useMemo(() => {
    if (productTrendData.length < 3) return [];
    const withChange = productTrendData
      .filter(d => d.quantity > 0)
      .map((d, idx, arr) => {
        const prev = idx > 0 ? arr[idx - 1].profit : 0;
        const change = prev > 0 ? ((d.profit - prev) / prev) * 100 : 0;
        return { ...d, change: Math.abs(change) };
      });
    return withChange
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)
      .filter(d => d.change > 0);
  }, [productTrendData]);

  const productSummary = useMemo(() => {
    return products.map(product => {
      const rangeSet = new Set(productRangeDates);
      const rangeSales = sales.filter(s => rangeSet.has(s.date));
      const totalQuantity = rangeSales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.quantity || 0);
      }, 0);
      const totalRevenue = rangeSales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.revenue || 0);
      }, 0);
      const totalCost = rangeSales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.cost || 0);
      }, 0);
      const totalProfit = totalRevenue - totalCost;
      const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
      const daysWithData = new Set(rangeSales.filter(s => s.items.some(i => i.productId === product.id && i.quantity > 0)).map(s => s.date)).size;
      return {
        ...product,
        totalQuantity, totalRevenue, totalCost, totalProfit, avgProfitMargin, daysWithData,
        unitCost: totalQuantity > 0 ? totalCost / totalQuantity : calculateProductProfit(product, materials).cost,
        unitProfit: totalQuantity > 0 ? totalProfit / totalQuantity : calculateProductProfit(product, materials).profit,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [products, sales, productRangeDates, materials]);

  const chartData = dayProductProfits.filter(p => p.soldQuantity > 0).map(p => ({
    name: p.name, profit: p.totalProfit, revenue: p.totalRevenue, emoji: p.emoji,
  }));

  const togglePeriod = (periodId: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(periodId)) next.delete(periodId);
      else next.add(periodId);
      return next;
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">利润分析</h2>
          <p className="text-brown-400">多维度分析经营利润</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-warm-100 rounded-xl p-1">
            {([['day', '按日'], ['week', '按周'], ['product', '按产品']] as [ViewMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === mode ? 'bg-white text-primary-600 shadow-sm' : 'text-brown-400 hover:text-brown-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {viewMode === 'day' && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow border border-warm-200">
              <Calendar className="w-5 h-5 text-primary-500" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="outline-none text-brown-500 font-medium" />
            </div>
          )}
        </div>
      </div>

      {viewMode === 'day' && (
        <>
          {mergedDayData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-green-50 to-green-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-700" /></div>
                    <span className="text-sm text-green-700">销售额</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">¥{mergedDayData.totalRevenue.toFixed(2)}</p>
                  {periodTotals && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      {periodTotals.balanced
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> 批次合计一致</>
                        : <><XCircle className="w-3.5 h-3.5" /> 差¥{periodTotals.diffRevenue.toFixed(2)}</>
                      }
                    </p>
                  )}
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-orange-50 to-orange-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-orange-700" /></div>
                    <span className="text-sm text-orange-700">原料成本</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">¥{mergedDayData.totalCost.toFixed(2)}</p>
                  {periodTotals && (
                    <p className="text-xs text-orange-600 mt-1">
                      批次合计 ¥{periodTotals.sumCost.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-primary-50 to-primary-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-200 rounded-xl flex items-center justify-center"><Award className="w-6 h-6 text-primary-700" /></div>
                    <span className="text-sm text-primary-700">毛利</span>
                  </div>
                  <p className="text-3xl font-bold text-primary-700">¥{mergedDayData.grossProfit.toFixed(2)}</p>
                  {periodTotals && (
                    <p className="text-xs text-primary-600 mt-1">
                      批次合计 ¥{periodTotals.sumProfit.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center"><span className="text-xl">%</span></div>
                    <span className="text-sm text-purple-700">毛利率</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">
                    {mergedDayData.totalRevenue > 0 ? (mergedDayData.grossProfit / mergedDayData.totalRevenue * 100).toFixed(1) : '0.0'}%
                  </p>
                  <p className="text-xs text-purple-600 mt-1">{daySales.length} 批次销售</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card animate-fadeInUp">
                  <h3 className="text-lg font-bold text-brown-500 mb-4">产品利润排行</h3>
                  {chartData.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                          <XAxis type="number" stroke="#8D6E63" />
                          <YAxis dataKey="name" type="category" stroke="#5D4037" width={80} />
                          <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`, '利润']} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} />
                          <Bar dataKey="profit" radius={[0, 8, 8, 0]}>
                            {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-brown-400"><div className="text-center"><span className="text-5xl">📊</span><p className="mt-4">暂无销售数据</p></div></div>
                  )}
                </div>
                <div className="space-y-4">
                  {daySales.sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period)).map(sale => {
                    const isExpanded = expandedPeriods.has(sale.id);
                    const itemCount = sale.items.filter(i => i.quantity > 0).length;
                    return (
                      <div key={sale.id} className="card animate-fadeInUp bg-gradient-to-br from-warm-50 to-white overflow-hidden">
                        <button
                          onClick={() => togglePeriod(sale.id)}
                          className="w-full text-left p-4 flex items-center justify-between hover:bg-warm-100/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{PERIOD_EMOJI[sale.period]}</span>
                              <h4 className="font-bold text-brown-500">{SALE_PERIOD_LABELS[sale.period]}</h4>
                              <span className="text-xs text-brown-400 bg-warm-100 px-2 py-0.5 rounded-full">{itemCount} 种产品</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-brown-400 ml-2" /> : <ChevronDown className="w-4 h-4 text-brown-400 ml-2" />}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div><p className="text-xs text-brown-400">收入</p><p className="font-bold text-green-600 text-sm">¥{sale.totalRevenue.toFixed(2)}</p></div>
                              <div><p className="text-xs text-brown-400">成本</p><p className="font-bold text-orange-600 text-sm">¥{sale.totalCost.toFixed(2)}</p></div>
                              <div><p className="text-xs text-brown-400">利润</p><p className="font-bold text-primary-600 text-sm">¥{sale.grossProfit.toFixed(2)}</p></div>
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-warm-200 bg-white/60 px-4 pb-4">
                            <table className="w-full mt-3">
                              <thead>
                                <tr className="border-b border-warm-200 text-xs text-brown-400">
                                  <th className="text-left py-2">产品</th>
                                  <th className="text-right py-2">销量</th>
                                  <th className="text-right py-2">收入</th>
                                  <th className="text-right py-2">成本</th>
                                  <th className="text-right py-2">利润</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.filter(i => i.quantity > 0).map(item => {
                                  const product = products.find(p => p.id === item.productId);
                                  return (
                                    <tr key={item.productId} className="border-b border-warm-100 text-sm">
                                      <td className="py-2"><span className="flex items-center gap-1"><span>{product?.emoji}</span><span className="text-brown-500 font-medium">{product?.name}</span></span></td>
                                      <td className="py-2 text-right text-brown-500">{item.quantity}份</td>
                                      <td className="py-2 text-right text-green-600">¥{item.revenue.toFixed(2)}</td>
                                      <td className="py-2 text-right text-orange-600">¥{item.cost.toFixed(2)}</td>
                                      <td className="py-2 text-right font-bold text-primary-600">¥{item.profit.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-primary-50 font-bold text-sm">
                                  <td className="py-2.5 text-primary-700">小计</td>
                                  <td className="py-2.5 text-right text-brown-600">
                                    {sale.items.reduce((s, i) => s + i.quantity, 0)} 份
                                  </td>
                                  <td className="py-2.5 text-right text-green-700">¥{sale.totalRevenue.toFixed(2)}</td>
                                  <td className="py-2.5 text-right text-orange-700">¥{sale.totalCost.toFixed(2)}</td>
                                  <td className="py-2.5 text-right text-primary-700">¥{sale.grossProfit.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card animate-fadeInUp">
                <h3 className="text-lg font-bold text-brown-500 mb-4">各产品盈利明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-warm-200">
                        <th className="text-left py-3 px-4 text-brown-400 font-medium">排名</th>
                        <th className="text-left py-3 px-4 text-brown-400 font-medium">产品</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">销量</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">单位成本</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">单位利润</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">总收入</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">总成本</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">总利润</th>
                        <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayProductProfits.map((product, index) => (
                        <tr key={product.id} className={`border-b border-warm-100 hover:bg-warm-50 ${product.soldQuantity === 0 ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              index === 0 && product.soldQuantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 && product.soldQuantity > 0 ? 'bg-gray-100 text-gray-600' :
                              index === 2 && product.soldQuantity > 0 ? 'bg-orange-100 text-orange-700' :
                              'bg-warm-100 text-brown-400'
                            }`}>{index + 1}</span>
                          </td>
                          <td className="py-3 px-4"><span className="flex items-center gap-2"><span className="text-2xl">{product.emoji}</span><span className="text-brown-500 font-medium">{product.name}</span></span></td>
                          <td className="py-3 px-4 text-right text-brown-500 font-medium">{product.soldQuantity} 份</td>
                          <td className="py-3 px-4 text-right text-orange-600">¥{product.cost.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-green-600">¥{product.profit.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-green-600">¥{product.totalRevenue.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-orange-600">¥{product.totalCost.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-primary-600">¥{product.totalProfit.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              product.profitMargin >= 50 ? 'bg-green-100 text-green-700' :
                              product.profitMargin >= 30 ? 'bg-primary-100 text-primary-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>{product.profitMargin.toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-16 animate-fadeInUp">
              <span className="text-6xl">💰</span>
              <h3 className="text-xl font-bold text-brown-500 mt-4">{selectedDate} 还未录入销售</h3>
              <p className="text-brown-400 mt-2">去销售管理页面录入当天的销售数据吧</p>
            </div>
          )}
        </>
      )}

      {viewMode === 'week' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card animate-fadeInUp bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-700" /></div>
                <span className="text-sm text-green-700">本周销售额</span>
              </div>
              <p className="text-3xl font-bold text-green-700">¥{weekTotal.revenue.toFixed(2)}</p>
            </div>
            <div className="stat-card animate-fadeInUp bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-orange-700" /></div>
                <span className="text-sm text-orange-700">本周总成本</span>
              </div>
              <p className="text-3xl font-bold text-orange-700">¥{weekTotal.cost.toFixed(2)}</p>
            </div>
            <div className="stat-card animate-fadeInUp bg-gradient-to-br from-primary-50 to-primary-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-200 rounded-xl flex items-center justify-center"><Award className="w-6 h-6 text-primary-700" /></div>
                <span className="text-sm text-primary-700">本周毛利</span>
              </div>
              <p className="text-3xl font-bold text-primary-700">¥{weekTotal.profit.toFixed(2)}</p>
            </div>
          </div>

          <div className="card animate-fadeInUp">
            <h3 className="text-lg font-bold text-brown-500 mb-4">本周收入/利润趋势</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                  <XAxis dataKey="name" stroke="#8D6E63" />
                  <YAxis stroke="#8D6E63" />
                  <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`]} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="收入" stroke="#4CAF50" fill="#C8E6C9" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name="利润" stroke="#FF8C42" fill="#FFE0B2" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-fadeInUp">
            <h3 className="text-lg font-bold text-brown-500 mb-4">每日明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">日期</th>
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">星期</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">收入</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map(d => (
                    <tr key={d.date} className="border-b border-warm-100 hover:bg-warm-50">
                      <td className="py-3 px-4 text-brown-500 font-medium">{d.date}</td>
                      <td className="py-3 px-4 text-brown-400">{d.name}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">¥{d.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">¥{d.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">¥{d.profit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          d.revenue > 0 ? (d.profit / d.revenue * 100) >= 50 ? 'bg-green-100 text-green-700' : (d.profit / d.revenue * 100) >= 30 ? 'bg-primary-100 text-primary-700' : 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>{d.revenue > 0 ? (d.profit / d.revenue * 100).toFixed(1) : '0.0'}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'product' && (
        <>
          <div className="card animate-fadeInUp">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-brown-500">选择产品查看趋势</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (!compareMode && !compareProductId && products[1]) {
                      setCompareProductId(products[1].id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    compareMode ? 'bg-purple-500 text-white shadow-sm' : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
                  }`}
                >
                  <GitCompare className="w-4 h-4" />
                  对比模式
                </button>
                <div className="flex bg-warm-100 rounded-lg p-1">
                  {([['7d', '最近7天'], ['30d', '最近30天'], ['custom', '自定义']] as [TimeRangeMode, string][]).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setTimeRangeMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        timeRangeMode === mode ? 'bg-white text-primary-600 shadow-sm' : 'text-brown-400 hover:text-brown-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {timeRangeMode === 'custom' && (
                  <div className="flex items-center gap-1 text-xs">
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border border-warm-200 rounded-lg px-2 py-1.5 text-brown-500 outline-none focus:border-primary-400" />
                    <span className="text-brown-400">至</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border border-warm-200 rounded-lg px-2 py-1.5 text-brown-500 outline-none focus:border-primary-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      selectedProductId === product.id || (!selectedProductId && product.id === products[0]?.id)
                        ? 'bg-primary-500 text-white shadow-lg'
                        : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
                    }`}
                  >
                    <span>{product.emoji}</span> {product.name}
                  </button>
                ))}
              </div>
              {compareMode && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-warm-200">
                  <span className="text-sm text-brown-400 font-medium">对比产品:</span>
                  {products.filter(p => p.id !== mainProductId).map(product => (
                    <button
                      key={product.id}
                      onClick={() => setCompareProductId(product.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        compareProductId === product.id
                          ? 'bg-blue-500 text-white shadow'
                          : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
                      }`}
                    >
                      <span>{product.emoji}</span> {product.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {compareMode && compareCombinedData.length > 0 && compareConclusion ? (
            <>
              <div className="card animate-fadeInUp">
                <h3 className="text-lg font-bold text-brown-500 mb-4 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-purple-500" />
                  产品对比：{compareConclusion.p1.emoji}{compareConclusion.p1.name} vs {compareConclusion.p2.emoji}{compareConclusion.p2.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-brown-600 mb-2">销量趋势</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={compareCombinedData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                          <XAxis dataKey="date" stroke="#8D6E63" fontSize={10} />
                          <YAxis stroke="#8D6E63" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '10px', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p1.name}_销量`} name={compareConclusion.p1.name} stroke={COMPARE_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p2.name}_销量`} name={compareConclusion.p2.name} stroke={COMPARE_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brown-600 mb-2">利润趋势</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={compareCombinedData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                          <XAxis dataKey="date" stroke="#8D6E63" fontSize={10} />
                          <YAxis stroke="#8D6E63" fontSize={10} />
                          <Tooltip formatter={(v: number) => [`¥${v.toFixed(2)}`, '']} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '10px', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p1.name}_利润`} name={compareConclusion.p1.name} stroke={COMPARE_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p2.name}_利润`} name={compareConclusion.p2.name} stroke={COMPARE_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brown-600 mb-2">毛利率趋势</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={compareCombinedData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                          <XAxis dataKey="date" stroke="#8D6E63" fontSize={10} />
                          <YAxis stroke="#8D6E63" fontSize={10} unit="%" />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, '']} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '10px', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p1.name}_毛利率`} name={compareConclusion.p1.name} stroke={COMPARE_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey={`${compareConclusion.p2.name}_毛利率`} name={compareConclusion.p2.name} stroke={COMPARE_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card animate-fadeInUp bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <h3 className="text-lg font-bold text-brown-600 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  对比结论
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-brown-400 mb-1">💰 更赚钱</p>
                    <p className="font-bold text-brown-600 text-lg">{compareConclusion.moreProfitable.emoji} {compareConclusion.moreProfitable.name}</p>
                    <p className="text-xs text-brown-400 mt-1">
                      多赚 ¥{Math.abs(compareConclusion.p1.totalProfit - compareConclusion.p2.totalProfit).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-brown-400 mb-1">📦 销量更高</p>
                    <p className="font-bold text-brown-600 text-lg">{compareConclusion.moreSales.emoji} {compareConclusion.moreSales.name}</p>
                    <p className="text-xs text-brown-400 mt-1">
                      多卖 {Math.abs(compareConclusion.p1.totalQty - compareConclusion.p2.totalQty).toFixed(0)} 份
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-brown-400 mb-1">📈 毛利率更高</p>
                    <p className="font-bold text-brown-600 text-lg">{compareConclusion.higherMargin.emoji} {compareConclusion.higherMargin.name}</p>
                    <p className="text-xs text-brown-400 mt-1">
                      高 {Math.abs(compareConclusion.p1.avgMargin - compareConclusion.p2.avgMargin).toFixed(1)} 个百分点
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-brown-400 mb-1">🛡️ 销量更稳</p>
                    <p className="font-bold text-brown-600 text-lg">{compareConclusion.moreStable.emoji} {compareConclusion.moreStable.name}</p>
                    <p className="text-xs text-brown-400 mt-1">
                      波动系数 {(compareConclusion.moreStable.name === compareConclusion.p1.name ? compareConclusion.p1.cv : compareConclusion.p2.cv) * 100}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            productTrendData.length > 0 && (
              <div className="card animate-fadeInUp">
                <h3 className="text-lg font-bold text-brown-500 mb-4">
                  {products.find(p => p.id === mainProductId)?.emoji}{' '}
                  {products.find(p => p.id === mainProductId)?.name} 经营趋势
                </h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                      <XAxis dataKey="date" stroke="#8D6E63" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#8D6E63" fontSize={11} />
                      <YAxis yAxisId="right" orientation="right" stroke="#8D6E63" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} formatter={(value: number, name: string) => {
                        if (name === '销量') return [`${value} 份`, name];
                        return [`¥${value.toFixed(2)}`, name];
                      }} />
                      <Legend />
                      <Line yAxisId="right" type="monotone" dataKey="quantity" name="销量" stroke="#4CAF50" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="收入" stroke="#2196F3" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="left" type="monotone" dataKey="cost" name="成本" stroke="#FF9800" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="3 3" />
                      <Line yAxisId="left" type="monotone" dataKey="profit" name="利润" stroke="#FF8C42" strokeWidth={2.5} dot={{ r: 5, strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          )}

          {!compareMode && productVolatilityDays.length > 0 && (
            <div className="card animate-fadeInUp bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold text-yellow-800">📈 波动最大日期</h3>
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">相对前日利润变动幅度</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productVolatilityDays.map((day, idx) => (
                  <div key={day.date} className="bg-white rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-brown-400">#{idx + 1} {day.weekday}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${day.change >= 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {day.change.toFixed(0)}% 波动
                      </span>
                    </div>
                    <p className="font-bold text-brown-600 text-lg">{day.date}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-brown-400">销量:</span> <span className="font-medium text-brown-600">{day.quantity}份</span></div>
                      <div><span className="text-brown-400">利润:</span> <span className="font-medium text-primary-600">¥{day.profit.toFixed(2)}</span></div>
                      <div><span className="text-brown-400">收入:</span> <span className="font-medium text-green-600">¥{day.revenue.toFixed(2)}</span></div>
                      <div><span className="text-brown-400">成本:</span> <span className="font-medium text-orange-600">¥{day.cost.toFixed(2)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card animate-fadeInUp">
            <h3 className="text-lg font-bold text-brown-500 mb-4">
              全部产品经营对比 ({timeRangeMode === '7d' ? '最近7天' : timeRangeMode === '30d' ? '最近30天' : `${customStart} ~ ${customEnd}`})
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productSummary.map(p => ({ name: p.name, emoji: p.emoji, revenue: p.totalRevenue, cost: p.totalCost, profit: p.totalProfit }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                  <XAxis dataKey="name" stroke="#8D6E63" />
                  <YAxis stroke="#8D6E63" />
                  <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`]} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} />
                  <Legend />
                  <Bar dataKey="revenue" name="收入" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="成本" fill="#FF9800" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="利润" fill="#FF8C42" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-fadeInUp">
            <h3 className="text-lg font-bold text-brown-500 mb-4">产品经营总览</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">产品</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">累计销量</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">营业天数</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">单位成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">单位利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总收入</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                  </tr>
                </thead>
                <tbody>
                  {productSummary.map(product => (
                    <tr key={product.id} className="border-b border-warm-100 hover:bg-warm-50">
                      <td className="py-3 px-4"><span className="flex items-center gap-2"><span className="text-2xl">{product.emoji}</span><span className="text-brown-500 font-medium">{product.name}</span></span></td>
                      <td className="py-3 px-4 text-right text-brown-500 font-medium">{product.totalQuantity} 份</td>
                      <td className="py-3 px-4 text-right text-brown-400">{product.daysWithData} 天</td>
                      <td className="py-3 px-4 text-right text-orange-600">¥{product.unitCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-green-600">¥{product.unitProfit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-green-600">¥{product.totalRevenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">¥{product.totalCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">¥{product.totalProfit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          product.avgProfitMargin >= 50 ? 'bg-green-100 text-green-700' :
                          product.avgProfitMargin >= 30 ? 'bg-primary-100 text-primary-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{product.avgProfitMargin.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function calcCv(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  if (mean === 0) return 0;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance) / mean;
}
