import { useStore } from '../store';
import { getToday } from '../utils/date';
import { calculateProductProfit } from '../utils/calculator';
import { ShoppingCart, TrendingUp, DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fadeInUp">
          <h3 className="text-lg font-bold text-brown-500 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/purchase')} className="flex flex-col items-center justify-center p-6 bg-primary-50 rounded-2xl border-2 border-primary-200 hover:border-primary-400 transition-all duration-300 group">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🛒</span>
              <span className="font-bold text-primary-700">录入采购</span>
              <span className="text-sm text-primary-500 mt-1">记录今日采购</span>
            </button>
            <button onClick={() => navigate('/sales')} className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 group">
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
              <div key={material.id} className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isLow ? 'bg-red-50 border-red-200' : 'bg-warm-50 border-warm-200'}`}>
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
