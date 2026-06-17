import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { getToday } from '../utils/date';
import { Plus, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Purchase() {
  const today = getToday();
  const materials = useStore(state => state.materials);
  const purchases = useStore(state => state.purchases);
  const addPurchase = useStore(state => state.addPurchase);
  const deletePurchase = useStore(state => state.deletePurchase);
  const getPurchasesByDate = useStore(state => state.getPurchasesByDate);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [priceChartMaterial, setPriceChartMaterial] = useState<string | null>(null);

  const todayPurchases = getPurchasesByDate(selectedDate);
  const totalAmount = todayPurchases.reduce((sum, p) => sum + p.totalPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !quantity || !unitPrice) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    addPurchase({
      date: selectedDate,
      materialId: selectedMaterial,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
    });
    setSelectedMaterial('');
    setQuantity('');
    setUnitPrice('');
  };

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const calculatedTotal = selectedMaterial && quantity && unitPrice
    ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2)
    : '0.00';

  const priceChartData = useMemo(() => {
    if (!priceChartMaterial) return [];
    const material = materials.find(m => m.id === priceChartMaterial);
    if (!material) return [];
    return [...material.priceHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({ date: entry.date, price: entry.price }));
  }, [priceChartMaterial, materials]);

  const purchasePriceChartData = useMemo(() => {
    if (!priceChartMaterial) return [];
    const material = materials.find(m => m.id === priceChartMaterial);
    if (!material) return [];
    const materialPurchases = purchases
      .filter(p => p.materialId === priceChartMaterial)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return materialPurchases.map(p => ({ date: p.date, price: p.unitPrice, quantity: p.quantity }));
  }, [priceChartMaterial, purchases, materials]);

  const chartMaterial = materials.find(m => m.id === priceChartMaterial);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">采购管理</h2>
          <p className="text-brown-400">记录每日原料采购，自动更新库存和进价</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow border border-warm-200">
          <Calendar className="w-5 h-5 text-primary-500" />
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="outline-none text-brown-500 font-medium" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fadeInUp">
          <h3 className="text-lg font-bold text-brown-500 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-500" />
            新增采购记录
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brown-500 mb-2">选择原料</label>
              <select
                value={selectedMaterial}
                onChange={(e) => {
                  setSelectedMaterial(e.target.value);
                  const material = materials.find(m => m.id === e.target.value);
                  if (material) setUnitPrice(material.currentPrice.toString());
                }}
                className="input-field"
              >
                <option value="">请选择原料</option>
                {materials.map(material => (
                  <option key={material.id} value={material.id}>
                    {material.emoji} {material.name} (当前进价: ¥{material.currentPrice}/{material.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brown-500 mb-2">采购数量 ({selectedMaterialData?.unit || '单位'})</label>
                <input type="number" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="输入数量" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-500 mb-2">单价 (元/{selectedMaterialData?.unit || '单位'})</label>
                <input type="number" step="0.01" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="输入单价" className="input-field" />
              </div>
            </div>

            {selectedMaterial && quantity && unitPrice && (
              <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-brown-500 font-medium">预计金额</span>
                  <span className="text-2xl font-bold text-primary-600">¥{calculatedTotal}</span>
                </div>
                <p className="text-sm text-brown-400 mt-1">
                  {selectedMaterialData?.emoji} {selectedMaterialData?.name} × {quantity} {selectedMaterialData?.unit}
                </p>
              </div>
            )}

            <button type="submit" disabled={!selectedMaterial || !quantity || !unitPrice} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              确认采购
            </button>
          </form>
        </div>

        <div className="card animate-fadeInUp delay-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brown-500">{selectedDate} 采购记录</h3>
            <span className="text-xl font-bold text-primary-600">¥{totalAmount.toFixed(2)}</span>
          </div>

          {todayPurchases.length === 0 ? (
            <div className="text-center py-12 text-brown-400">
              <span className="text-5xl">📋</span>
              <p className="mt-4">暂无采购记录</p>
              <p className="text-sm">在左侧表单添加今天的采购吧</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {todayPurchases.map(purchase => {
                const material = materials.find(m => m.id === purchase.materialId);
                return (
                  <div key={purchase.id} className="flex items-center justify-between p-4 bg-warm-50 rounded-xl hover:bg-warm-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{material?.emoji}</span>
                      <div>
                        <p className="font-medium text-brown-500">{material?.name}</p>
                        <p className="text-sm text-brown-400">{purchase.quantity} {material?.unit} × ¥{purchase.unitPrice}/{material?.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-600 text-lg">¥{purchase.totalPrice.toFixed(2)}</span>
                      <button
                        onClick={() => { if (confirm('确定要删除这条采购记录吗？库存将同步更新。')) deletePurchase(purchase.id); }}
                        className="p-2 text-brown-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card animate-fadeInUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-brown-500 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            原料价格走势
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {materials.map(material => (
            <button
              key={material.id}
              onClick={() => setPriceChartMaterial(material.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                priceChartMaterial === material.id
                  ? 'bg-primary-500 text-white shadow'
                  : 'bg-warm-100 text-brown-500 hover:bg-warm-200'
              }`}
            >
              <span>{material.emoji}</span> {material.name}
            </button>
          ))}
        </div>

        {priceChartMaterial && chartMaterial ? (
          <div>
            {priceChartData.length >= 2 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                    <XAxis dataKey="date" stroke="#8D6E63" fontSize={12} />
                    <YAxis stroke="#8D6E63" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`, '进价']} contentStyle={{ backgroundColor: '#FFF7F0', border: '2px solid #FFB784', borderRadius: '12px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="price" name={`${chartMaterial.name}进价`} stroke="#FF8C42" strokeWidth={2} dot={{ r: 4, fill: '#FF8C42' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-brown-400">
                <p>{chartMaterial.emoji} {chartMaterial.name} 价格记录不足，至少需要2条记录才能绘制走势图</p>
              </div>
            )}

            {purchasePriceChartData.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-brown-500 mb-3">采购价记录明细</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-warm-200">
                        <th className="text-left py-2 px-3 text-brown-400 font-medium text-sm">日期</th>
                        <th className="text-right py-2 px-3 text-brown-400 font-medium text-sm">采购价</th>
                        <th className="text-right py-2 px-3 text-brown-400 font-medium text-sm">采购量</th>
                        <th className="text-right py-2 px-3 text-brown-400 font-medium text-sm">金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchasePriceChartData.map((record, i) => (
                        <tr key={i} className="border-b border-warm-100 hover:bg-warm-50 text-sm">
                          <td className="py-2 px-3 text-brown-500">{record.date}</td>
                          <td className="py-2 px-3 text-right text-primary-600 font-medium">¥{record.price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-brown-500">{record.quantity} {chartMaterial.unit}</td>
                          <td className="py-2 px-3 text-right text-brown-500">¥{(record.price * record.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-brown-400">
            <span className="text-4xl">📈</span>
            <p className="mt-2">点击上方原料标签查看价格走势</p>
          </div>
        )}
      </div>

      <div className="card animate-fadeInUp">
        <h3 className="text-lg font-bold text-brown-500 mb-4">历史采购记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-warm-200">
                <th className="text-left py-3 px-4 text-brown-400 font-medium">日期</th>
                <th className="text-left py-3 px-4 text-brown-400 font-medium">原料</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">数量</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">单价</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">金额</th>
                <th className="text-right py-3 px-4 text-brown-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {[...purchases]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 20)
                .map(purchase => {
                  const material = materials.find(m => m.id === purchase.materialId);
                  return (
                    <tr key={purchase.id} className="border-b border-warm-100 hover:bg-warm-50">
                      <td className="py-3 px-4 text-brown-500">{purchase.date}</td>
                      <td className="py-3 px-4"><span className="flex items-center gap-2"><span>{material?.emoji}</span><span className="text-brown-500">{material?.name}</span></span></td>
                      <td className="py-3 px-4 text-right text-brown-500">{purchase.quantity} {material?.unit}</td>
                      <td className="py-3 px-4 text-right text-brown-500">¥{purchase.unitPrice}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">¥{purchase.totalPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { if (confirm('确定要删除这条采购记录吗？')) deletePurchase(purchase.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {purchases.length === 0 && <div className="text-center py-8 text-brown-400">暂无历史记录</div>}
        </div>
      </div>
    </div>
  );
}
