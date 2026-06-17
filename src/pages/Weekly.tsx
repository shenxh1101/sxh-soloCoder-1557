import { useMemo } from 'react';
import { useStore } from '../store';
import { getWeekDayName } from '../utils/date';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Award } from 'lucide-react';

export default function Weekly() {
  const getWeeklyData = useStore(state => state.getWeeklyData);
  const weeklyData = getWeeklyData();

  const chartData = useMemo(() => {
    return weeklyData.map(item => ({
      ...item,
      dayName: getWeekDayName(item.date),
      shortDate: item.date.slice(5),
    }));
  }, [weeklyData]);

  const daysWithData = weeklyData.filter(d => d.revenue > 0);
  
  const bestDay = daysWithData.length > 0
    ? [...daysWithData].sort((a, b) => b.revenue - a.revenue)[0]
    : null;
  
  const worstDay = daysWithData.length > 0
    ? [...daysWithData].sort((a, b) => a.revenue - b.revenue)[0]
    : null;

  const totalRevenue = weeklyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = weeklyData.reduce((sum, d) => sum + d.profit, 0);
  const avgDailyRevenue = daysWithData.length > 0 ? totalRevenue / daysWithData.length : 0;
  const avgDailyProfit = daysWithData.length > 0 ? totalProfit / daysWithData.length : 0;

  const revenueTrend = daysWithData.length >= 2 ? (
    weeklyData[weeklyData.length - 1].revenue - weeklyData[weeklyData.length - 2].revenue
  ) : 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brown-500">周报统计</h2>
        <p className="text-brown-400">查看本周经营情况，分析销售趋势</p>
      </div>

      {daysWithData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card animate-fadeInUp bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
                <span className="text-sm text-green-700">本周总营收</span>
              </div>
              <p className="text-3xl font-bold text-green-700">
                ¥{totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {daysWithData.length} 天有销售记录
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-100 bg-gradient-to-br from-primary-50 to-primary-100" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-200 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary-700" />
                </div>
                <span className="text-sm text-primary-700">本周总利润</span>
              </div>
              <p className="text-3xl font-bold text-primary-700">
                ¥{totalProfit.toFixed(2)}
              </p>
              <p className="text-sm text-primary-600 mt-1">
                毛利率 {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-200 bg-gradient-to-br from-blue-50 to-blue-100" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-700" />
                </div>
                <span className="text-sm text-blue-700">日均营收</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">
                ¥{avgDailyRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                {revenueTrend > 0 ? (
                  <><TrendingUp className="w-4 h-4" /> 增长 ¥{revenueTrend.toFixed(2)}</>
                ) : revenueTrend < 0 ? (
                  <><TrendingDown className="w-4 h-4" /> 下降 ¥{Math.abs(revenueTrend).toFixed(2)}</>
                ) : (
                  '持平'
                )}
              </p>
            </div>

            <div className="stat-card animate-fadeInUp delay-300 bg-gradient-to-br from-purple-50 to-purple-100" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <span className="text-sm text-purple-700">日均利润</span>
              </div>
              <p className="text-3xl font-bold text-purple-700">
                ¥{avgDailyProfit.toFixed(2)}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                营业天数: {daysWithData.length} 天
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card animate-fadeInUp bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <p className="text-sm text-yellow-700">生意最好的一天</p>
                  {bestDay && (
                    <>
                      <p className="text-xl font-bold text-brown-500">
                        {bestDay.date} {getWeekDayName(bestDay.date)}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ¥{bestDay.revenue.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {bestDay && (
                <div className="bg-white bg-opacity-60 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-brown-400">利润</span>
                    <span className="font-bold text-primary-600">¥{bestDay.profit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-brown-400">利润率</span>
                    <span className="font-bold text-green-600">
                      {bestDay.revenue > 0 ? ((bestDay.profit / bestDay.revenue) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="card animate-fadeInUp delay-100 bg-gradient-to-r from-gray-50 to-warm-50 border-gray-200" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📉</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">生意最差的一天</p>
                  {worstDay && (
                    <>
                      <p className="text-xl font-bold text-brown-500">
                        {worstDay.date} {getWeekDayName(worstDay.date)}
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        ¥{worstDay.revenue.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {worstDay && (
                <div className="bg-white bg-opacity-60 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-brown-400">利润</span>
                    <span className="font-bold text-primary-600">¥{worstDay.profit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-brown-400">利润率</span>
                    <span className="font-bold text-green-600">
                      {worstDay.revenue > 0 ? ((worstDay.profit / worstDay.revenue) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card animate-fadeInUp delay-200" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-bold text-brown-500 mb-4">本周营收与利润趋势</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8C42" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF8C42" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FFE8CC" />
                  <XAxis
                    dataKey="dayName"
                    stroke="#5D4037"
                    tick={{ fill: '#5D4037' }}
                  />
                  <YAxis
                    stroke="#8D6E63"
                    tick={{ fill: '#8D6E63' }}
                    tickFormatter={(value) => `¥${value}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `¥${value.toFixed(2)}`,
                      name === 'revenue' ? '营收' : '利润'
                    ]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: '#FFF7F0',
                      border: '2px solid #FFB784',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend
                    formatter={(value) => value === 'revenue' ? '营收' : '利润'}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#FF8C42"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    name="profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-fadeInUp delay-300" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-lg font-bold text-brown-500 mb-4">每日经营详情</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-warm-200">
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">日期</th>
                    <th className="text-left py-3 px-4 text-brown-400 font-medium">星期</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">营收</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润</th>
                    <th className="text-right py-3 px-4 text-brown-400 font-medium">利润率</th>
                    <th className="text-center py-3 px-4 text-brown-400 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((day, index) => {
                    const isBest = bestDay && day.date === bestDay.date && day.revenue > 0;
                    const isWorst = worstDay && day.date === worstDay.date && day.revenue > 0 && !isBest;
                    const profitRate = day.revenue > 0 ? (day.profit / day.revenue * 100) : 0;
                    
                    return (
                      <tr
                        key={index}
                        className={`border-b border-warm-100 transition-colors ${
                          isBest ? 'bg-yellow-50 hover:bg-yellow-100' :
                          isWorst ? 'bg-gray-50 hover:bg-gray-100' :
                          'hover:bg-warm-50'
                        }`}
                      >
                        <td className="py-3 px-4 text-brown-500 font-medium">{day.date}</td>
                        <td className="py-3 px-4 text-brown-500">{getWeekDayName(day.date)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={day.revenue > 0 ? 'text-green-600 font-medium' : 'text-brown-400'}>
                            {day.revenue > 0 ? `¥${day.revenue.toFixed(2)}` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={day.profit > 0 ? 'text-primary-600 font-bold' : 'text-brown-400'}>
                            {day.revenue > 0 ? `¥${day.profit.toFixed(2)}` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {day.revenue > 0 ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              profitRate >= 50 ? 'bg-green-100 text-green-700' :
                              profitRate >= 30 ? 'bg-primary-100 text-primary-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {profitRate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-brown-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isBest && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                              🏆 最佳
                            </span>
                          )}
                          {isWorst && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                              📉 待提升
                            </span>
                          )}
                          {day.revenue === 0 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-warm-100 text-brown-400 rounded-full text-sm font-medium">
                              无记录
                            </span>
                          )}
                          {!isBest && !isWorst && day.revenue > 0 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                              ✅ 正常
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card animate-fadeInUp delay-400 bg-gradient-to-r from-primary-50 to-yellow-50" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-lg font-bold text-brown-500 mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              经营建议
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestDay && (
                <div className="bg-white bg-opacity-70 rounded-xl p-4">
                  <p className="font-medium text-green-700 mb-1">👍 做得好的地方</p>
                  <p className="text-brown-500 text-sm">
                    {getWeekDayName(bestDay.date)} 生意最好，营收达到 ¥{bestDay.revenue.toFixed(2)}，
                    可以总结当天的经验，比如是否做了促销活动，或者当天有什么特殊情况。
                  </p>
                </div>
              )}
              {worstDay && worstDay.date !== bestDay?.date && (
                <div className="bg-white bg-opacity-70 rounded-xl p-4">
                  <p className="font-medium text-orange-700 mb-1">🔍 需要关注</p>
                  <p className="text-brown-500 text-sm">
                    {getWeekDayName(worstDay.date)} 营收较低，只有 ¥{worstDay.revenue.toFixed(2)}，
                    可以分析一下原因，是否是天气原因，或者可以考虑推出特价活动提升销量。
                  </p>
                </div>
              )}
              <div className="bg-white bg-opacity-70 rounded-xl p-4">
                <p className="font-medium text-primary-700 mb-1">📊 数据洞察</p>
                <p className="text-brown-500 text-sm">
                  本周平均每天营收 ¥{avgDailyRevenue.toFixed(2)}，
                  利润 ¥{avgDailyProfit.toFixed(2)}，
                  整体毛利率 {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'}%，
                  经营状况{totalRevenue > 0 && (totalProfit / totalRevenue) >= 0.3 ? '良好' : '一般'}。
                </p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-xl p-4">
                <p className="font-medium text-blue-700 mb-1">🎯 下周目标</p>
                <p className="text-brown-500 text-sm">
                  建议下周目标：日营收突破 ¥{(avgDailyRevenue * 1.1).toFixed(0)}，
                  重点提升{worstDay ? getWeekDayName(worstDay.date) : ''}的销售，
                  继续保持{bestDay ? getWeekDayName(bestDay.date) : ''}的好势头！
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 animate-fadeInUp">
          <span className="text-6xl">📅</span>
          <h3 className="text-xl font-bold text-brown-500 mt-4">本周还没有销售数据</h3>
          <p className="text-brown-400 mt-2">先去录入今天的销售数据吧，明天就能看到趋势分析了</p>
        </div>
      )}
    </div>
  );
}
