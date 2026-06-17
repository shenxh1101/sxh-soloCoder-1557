import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { SALE_PERIOD_LABELS, SalePeriod } from '../store/types';
import { calculateProductProfit } from '../utils/calculator';
import { getToday, getWeekDates, getWeekDayName } from '../utils/date';
import { Calendar, TrendingUp, TrendingDown, Award, BarChart3, PackageSearch } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

const PERIOD_ORDER: SalePeriod[] = ['morning', 'noon', 'evening'];
const PERIOD_EMOJI: Record<SalePeriod, string> = { morning: '🌅', noon: '☀️', evening: '🌆' };
const barColors = ['#FF8C42', '#FFB74D', '#FFD180', '#FFE0B2', '#FFECB3', '#FFF8E1'];

type ViewMode = 'day' | 'week' | 'product';

export default function Profit() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedProductId, setSelectedProductId] = useState<string>('');

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
    const weekDates = getWeekDates();
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

  const productTrendData = useMemo(() => {
    const pid = selectedProductId || products[0]?.id;
    if (!pid) return [];
    const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date));
    const dateMap = new Map<string, { quantity: number; revenue: number; cost: number; profit: number }>();
    sorted.forEach(sale => {
      const item = sale.items.find(i => i.productId === pid);
      if (!item || item.quantity === 0) return;
      const existing = dateMap.get(sale.date);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
        existing.cost += item.cost;
        existing.profit += item.profit;
      } else {
        dateMap.set(sale.date, { quantity: item.quantity, revenue: item.revenue, cost: item.cost, profit: item.profit });
      }
    });
    return Array.from(dateMap.entries()).map(([date, data]) => ({ date, ...data }));
  }, [sales, selectedProductId, products]);

  const productSummary = useMemo(() => {
    return products.map(product => {
      const totalQuantity = sales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.quantity || 0);
      }, 0);
      const totalRevenue = sales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.revenue || 0);
      }, 0);
      const totalCost = sales.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.cost || 0);
      }, 0);
      const totalProfit = totalRevenue - totalCost;
      const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
      const daysWithData = new Set(sales.filter(s => s.items.some(i => i.productId === product.id && i.quantity > 0)).map(s => s.date)).size;
      return {
        ...product,
        totalQuantity, totalRevenue, totalCost, totalProfit, avgProfitMargin, daysWithData,
        unitCost: totalQuantity > 0 ? totalCost / totalQuantity : calculateProductProfit(product, materials).cost,
        unitProfit: totalQuantity > 0 ? totalProfit / totalQuantity : calculateProductProfit(product, materials).profit,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [products, sales, materials]);

  const chartData = dayProductProfits.filter(p => p.soldQuantity > 0).map(p => ({
    name: p.name, profit: p.totalProfit, revenue: p.totalRevenue, emoji: p.emoji,
  }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">利润分析</h2>
          <p className="text-brown-400">多维度分析经营利润</p>
        </div>
        <div className="flex items-center gap-2">
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
                  <p className="text-xs text-green-600 mt-1">{daySales.length} 批次</p>
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-orange-50 to-orange-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-orange-700" /></div>
                    <span className="text-sm text-orange-700">原料成本</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">¥{mergedDayData.totalCost.toFixed(2)}</p>
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-primary-50 to-primary-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-200 rounded-xl flex items-center justify-center"><Award className="w-6 h-6 text-primary-700" /></div>
                    <span className="text-sm text-primary-700">毛利</span>
                  </div>
                  <p className="text-3xl font-bold text-primary-700">¥{mergedDayData.grossProfit.toFixed(2)}</p>
                </div>
                <div className="stat-card animate-fadeInUp bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center"><span className="text-xl">%</span></div>
                    <span className="text-sm text-purple-700">毛利率</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">
                    {mergedDayData.totalRevenue > 0 ? (mergedDayData.grossProfit / mergedDayData.totalRevenue * 100).toFixed(1) : '0.0'}%
                  </p>
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
                  {daySales.sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period)).map(sale => (
                    <div key={sale.id} className="card animate-fadeInUp bg-gradient-to-br from-warm-50 to-white">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{PERIOD_EMOJI[sale.period]}</span>
                        <h4 className="font-bold text-brown-500">{SALE_PERIOD_LABELS[sale.period]}</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-brown-400">收入</p><p className="font-bold text-green-600 text-sm">¥{sale.totalRevenue.toFixed(2)}</p></div>
                        <div><p className="text-xs text-brown-400">成本</p><p className="font-bold text-orange-600 text-sm">¥{sale.totalCost.toFixed(2)}</p></div>
                        <div><p className="text-xs text-brown-400">利润</p><p className="font-bold text-primary-600 text-sm">¥{sale.grossProfit.toFixed(2)}</p></div>
                      </div>
                    </div>
                  ))}
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
            <div className="flex items-center gap-2 mb-4">
              <PackageSearch className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-bold text-brown-500">选择产品查看趋势</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedProductId === product.id
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
                  }`}
                >
                  <span>{product.emoji}</span> {product.name}
                </button>
              ))}
            </div>
          </div>

          {productTrendData.length > 0 && (
            <div className="card animate-fadeInUp">
              <h3 className="text-lg font-bold text-brown-500 mb-4">
                {products.find(p => p.id === (selectedProductId || products[0]?.id))?.emoji}{' '}
                {products.find(p => p.id === (selectedProductId || products[0]?.id))?.name} 销量与利润趋势
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                    <XAxis dataKey="date" stroke="#8D6E63" />
                    <YAxis yAxisId="left" stroke="#8D6E63" />
                    <YAxis yAxisId="right" orientation="right" stroke="#FF8C42" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="quantity" name="销量(份)" stroke="#4CAF50" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="profit" name="利润(元)" stroke="#FF8C42" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card animate-fadeInUp">
            <h3 className="text-lg font-bold text-brown-500 mb-4">全部产品经营对比</h3>
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
