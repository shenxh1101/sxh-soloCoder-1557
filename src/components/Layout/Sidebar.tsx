import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Package,
  Leaf,
  DollarSign,
  Calendar,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '首页仪表盘' },
  { path: '/purchase', icon: ShoppingCart, label: '采购管理' },
  { path: '/sales', icon: TrendingUp, label: '销售管理' },
  { path: '/products', icon: Package, label: '产品管理' },
  { path: '/materials', icon: Leaf, label: '原料管理' },
  { path: '/profit', icon: DollarSign, label: '利润分析' },
  { path: '/weekly', icon: Calendar, label: '周报统计' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-warm-200 min-h-screen shadow-lg">
      <div className="p-6 border-b border-warm-200">
        <h1 className="text-2xl font-serif font-bold text-brown-500 flex items-center gap-2">
          <span className="text-3xl">🥟</span>
          早餐店管家
        </h1>
        <p className="text-sm text-brown-400 mt-1">采购与成本核算系统</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-warm-200 bg-warm-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-xl">👨‍🍳</span>
          </div>
          <div>
            <p className="font-medium text-brown-500">店主</p>
            <p className="text-xs text-brown-400">本地数据存储</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
