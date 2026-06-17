import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Purchase from '@/pages/Purchase';
import Sales from '@/pages/Sales';
import Products from '@/pages/Products';
import Materials from '@/pages/Materials';
import Profit from '@/pages/Profit';
import Weekly from '@/pages/Weekly';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="purchase" element={<Purchase />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="materials" element={<Materials />} />
          <Route path="profit" element={<Profit />} />
          <Route path="weekly" element={<Weekly />} />
        </Route>
      </Routes>
    </Router>
  );
}
