import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { calculateProductProfit } from '../utils/calculator';
import { getToday } from '../utils/date';
import { Calendar, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Profit() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const materials = useStore(state => state.materials);
  const products = useStore(state => state.products);
  const sales = useStore(state => state.sales);
  const getSaleByDate = useStore(state => state.getSaleByDate);

  const todaySale = getSaleByDate(selectedDate);

  const productProfits = useMemo(() => {
    return products.map(product => {
      const saleItem = todaySale?.items.find(item => item.productId === product.id);
      const soldQuantity = saleItem?.quantity || 0;

      let unitCost: number, unitProfit: number, profitMargin: number;

      if (soldQuantity > 0 && saleItem) {
        unitCost = saleItem.cost / soldQuantity;
        unitProfit = saleItem.profit / soldQuantity;
        profitMargin = saleItem.revenue > 0 ? (saleItem.profit / saleItem.revenue) * 100 : 0;
      } else {
        const profitData = calculateProductProfit(product, materials);
        unitCost = profitData.cost;
        unitProfit = profitData.profit;
        profitMargin = profitData.profitMargin;
      }

      return {
        ...product,
        cost: unitCost,
        profit: unitProfit,
        profitMargin,
        soldQuantity,
        totalProfit: saleItem?.profit || 0,
        totalRevenue: saleItem?.revenue || 0,
        totalCost: saleItem?.cost || 0,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [products, materials, todaySale]);

  const topProduct = productProfits[0];
  const bottomProduct = [...productProfits].sort((a, b) => a.totalProfit - b.totalProfit)[0];

  const allSalesData = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(sale => ({
        date: sale.date,
        revenue: sale.totalRevenue,
        cost: sale.totalCost,
        profit: sale.grossProfit,
        margin: sale.totalRevenue > 0 ? (sale.grossProfit / sale.totalRevenue * 100) : 0,
      }));
  }, [sales]);

  const chartData = productProfits
    .filter(p => p.soldQuantity > 0)
    .map(p => ({
      name: p.name,
      profit: p.totalProfit,
      revenue: p.totalRevenue,
      emoji: p.emoji,
    }));

  const barColors = ['#FF8C42', '#FFB74D', '#FFD180', '#FFE0B2', '#FFECB3', '#FFF8E1'];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">利润分析</h2>
          <p className="text-brown-400">分析每日利润和产品盈利情况</p>
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

      {todaySale ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="stat-card animate-fadeInUp bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
                <span className="text-sm text-green-700">销售额</span>
              </div>
              <p className="text-3xl font-bold text-green-700">
                ¥{todaySale.totalRevenue.toFixed(2)}
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-100 bg-gradient-to-br from-orange-50 to-orange-100" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-orange-700" />
                </div>
                <span className="text-sm text-orange-700">原料成本</span>
              </div>
              <p className="text-3xl font-bold text-orange-700">
                ¥{todaySale.totalCost.toFixed(2)}
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-200 bg-gradient-to-br from-primary-50 to-primary-100" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-200 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary-700" />
                </div>
                <span className="text-sm text-primary-700">毛利</span>
              </div>
              <p className="text-3xl font-bold text-primary-700">
                ¥{todaySale.grossProfit.toFixed(2)}
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-300 bg-gradient-to-br from-purple-50 to-purple-100" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                  <span className="text-xl">%</span>
                </div>
                <span className="text-sm text-purple-700">毛利率</span>
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {todaySale.totalRevenue > 0 ? (todaySale.grossProfit / todaySale.totalRevenue * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card animate-fadeInUp">
              <h3 className="text-lg font-bold text-brown-500 mb-4">产品利润排行</h3>
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                      <XAxis type="number" stroke="#8D6E63" />
                      <YAxis dataKey="name" type="category" stroke="#5D4037" width={80} />
                      <Tooltip
                        formatter={(value: number) => [`¥${value.toFixed(2)}`, '利润']}
                        contentStyle={{
                          backgroundColor: '#FFF7F0',
                          border: '2px solid #FFB784',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="profit" radius={[0, 8, 8, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-brown-400">
                  <div className="text-center">
                    <span className="text-5xl">📊</span>
                    <p className="mt-4">暂无销售数据</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card animate-fadeInUp delay-100 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🏆</span>
                  <h3 className="text-lg font-bold text-brown-500">最赚钱产品</h3>
                </div>
                {topProduct && topProduct.soldQuantity > 0 ? (
                  <div className="text-center">
                    <span className="text-5xl block mb-2">{topProduct.emoji}</span>
                    <p className="text-xl font-bold text-brown-500">{topProduct.name}</p>
                    <p className="text-3xl font-bold text-primary-600 mt-2">
                      ¥{topProduct.totalProfit.toFixed(2)}
                    </p>
                    <p className="text-sm text-brown-400 mt-1">
                      卖出 {topProduct.soldQuantity} 份 · 利润率 {topProduct.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-brown-400 py-4">暂无数据</p>
                )}
              </div>

              <div className="card animate-fadeInUp delay-200 bg-gradient-to-br from-gray-50 to-warm-50" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📉</span>
                  <h3 className="text-lg font-bold text-brown-500">利润最低产品</h3>
                </div>
                {bottomProduct && bottomProduct.soldQuantity > 0 ? (
                  <div className="text-center">
                    <span className="text-5xl block mb-2">{bottomProduct.emoji}</span>
                    <p className="text-xl font-bold text-brown-500">{bottomProduct.name}</p>
                    <p className="text-3xl font-bold text-brown-400 mt-2">
                      ¥{bottomProduct.totalProfit.toFixed(2)}
                    </p>
                    <p className="text-sm text-brown-400 mt-1">
                      卖出 {bottomProduct.soldQuantity} 份 · 利润率 {bottomProduct.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-brown-400 py-4">暂无数据</p>
                )}
              </div>
            </div>
          </div>

          <div className="card animate-fadeInUp delay-300" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-lg font-bold text-brown-500 mb-4">各产品盈利明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">排名</th>
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">产品</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">销量</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">售价</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">单位成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">单位利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总收入</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">总利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                  </tr>
                </thead>
                <tbody>
                  {productProfits.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`border-b border-warm-100 hover:bg-warm-50 ${
                        product.soldQuantity === 0 ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0 && product.soldQuantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 && product.soldQuantity > 0 ? 'bg-gray-100 text-gray-600' :
                          index === 2 && product.soldQuantity > 0 ? 'bg-orange-100 text-orange-700' :
                          'bg-warm-100 text-brown-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2">
                          <span className="text-2xl">{product.emoji}</span>
                          <span className="text-brown-500 font-medium">{product.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-brown-500 font-medium">{product.soldQuantity} 份</td>
                      <td className="py-3 px-4 text-right text-brown-500">¥{product.price}</td>
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
                        }`}>
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card animate-fadeInUp delay-400" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-lg font-bold text-brown-500 mb-4">历史利润记录</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">日期</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">销售额</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">成本</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">毛利</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">毛利率</th>
                  </tr>
                </thead>
                <tbody>
                  {allSalesData.map((data, index) => (
                    <tr key={index} className="border-b border-warm-100 hover:bg-warm-50">
                      <td className="py-3 px-4 text-brown-500 font-medium">{data.date}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">¥{data.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">¥{data.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">¥{data.profit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          data.margin >= 50 ? 'bg-green-100 text-green-700' :
                          data.margin >= 30 ? 'bg-primary-100 text-primary-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {data.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allSalesData.length === 0 && (
                <div className="text-center py-8 text-brown-400">
                  暂无历史记录
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 animate-fadeInUp">
          <span className="text-6xl">💰</span>
          <h3 className="text-xl font-bold text-brown-500 mt-4">还未录入今日销售</h3>
          <p className="text-brown-400 mt-2">去销售管理页面录入今天的销售数据吧</p>
        </div>
      )}
    </div>
  );
}
