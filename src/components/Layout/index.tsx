import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': '首页仪表盘',
  '/purchase': '采购管理',
  '/sales': '销售管理',
  '/products': '产品管理',
  '/materials': '原料管理',
  '/profit': '利润分析',
  '/weekly': '周报统计',
};

export default function Layout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '早餐店管家';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
