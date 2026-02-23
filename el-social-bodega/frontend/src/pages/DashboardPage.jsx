import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FiPackage, FiShoppingCart, FiAlertTriangle, FiDollarSign } from 'react-icons/fi'
import api from '../services/api'
import { LABELS } from '../utils/labels'

const DASHBOARD_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_DASHBOARD_TIMEOUT) || 20000

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [totalSavings, setTotalSavings] = useState(0)
  const [stockSummary, setStockSummary] = useState([])
  const [movementHistory, setMovementHistory] = useState([])
  const [savingsHistory, setSavingsHistory] = useState([])
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [priceTrends, setPriceTrends] = useState([])

  useEffect(() => {
    let mounted = true

    const fetchDashboardData = async () => {
      if (mounted) setLoading(true)
      try {
        const requests = await Promise.allSettled([
          api.get('/dashboard/stock-summary', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
          api.get('/dashboard/movement-history?period_months=6', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
          api.get('/dashboard/savings-history', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
          api.get('/alerts/low-stock', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
          api.get('/orders?status=sent', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
          api.get('/products', { timeout: DASHBOARD_REQUEST_TIMEOUT_MS }),
        ])

        const getData = (result, fallback, label) => {
          if (result.status === 'fulfilled') return result.value.data
          console.error(`Dashboard request failed (${label}):`, result.reason)
          return fallback
        }

        const stockData = getData(requests[0], [], 'stock-summary')
        const movementData = getData(requests[1], [], 'movement-history')
        const savingsData = getData(requests[2], [], 'savings-history')
        const alertsData = getData(requests[3], [], 'low-stock-alerts')
        const ordersData = getData(requests[4], [], 'orders')
        const productsData = getData(requests[5], [], 'products')

        const productsList = Array.isArray(productsData)
          ? productsData
          : productsData?.items || productsData?.data || []
        const pendingOrdersCount = Array.isArray(ordersData) ? ordersData.length : ordersData?.count ?? 0
        const totalSavingsValue = (savingsData || []).reduce(
          (acc, item) => acc + (Number(item.total_savings) || 0),
          0
        )

        if (!mounted) return
        setStockSummary(stockData || [])
        setMovementHistory(movementData || [])
        setSavingsHistory(savingsData || [])
        setLowStockAlerts(alertsData || [])
        setPendingOrders(pendingOrdersCount)
        setProducts(productsList)
        setTotalProducts(productsList.length)
        setLowStockCount((alertsData || []).length)
        setTotalSavings(totalSavingsValue)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        if (!mounted) return
        setStockSummary([])
        setMovementHistory([])
        setSavingsHistory([])
        setLowStockAlerts([])
        setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchDashboardData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProductId) {
      setPriceTrends([])
      return
    }
    const fetchPriceTrends = async () => {
      try {
        const { data } = await api.get(`/dashboard/price-trends?product_id=${selectedProductId}&months=12`)
        setPriceTrends(data || [])
      } catch (err) {
        console.error('Price trends fetch error:', err)
        setPriceTrends([])
      }
    }
    fetchPriceTrends()
  }, [selectedProductId])

  const priceTrendsChartData = React.useMemo(() => {
    if (!priceTrends.length) return []
    const monthMap = {}
    priceTrends.forEach((supplier) => {
      (supplier.prices || []).forEach((p) => {
        const key = `${p.year}-${String(p.month).padStart(2, '0')}`
        if (!monthMap[key]) monthMap[key] = { month: key }
        monthMap[key][supplier.supplier_name || supplier.supplier_id] = p.price
      })
    })
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  }, [priceTrends])

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0)

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const COLORS = ['#1B5E20', '#FF8F00', '#1565C0']

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-600">{LABELS.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {LABELS.dashboard.title}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FiPackage className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{LABELS.dashboard.totalProducts}</p>
              <p className="text-2xl font-bold text-primary">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <FiShoppingCart className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{LABELS.dashboard.pendingOrders}</p>
              <p className="text-2xl font-bold text-secondary">{pendingOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{LABELS.dashboard.lowStockItems}</p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <FiDollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{LABELS.dashboard.totalSavings}</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{LABELS.dashboard.stockSummary}</h2>
          <div className="h-64">
            {stockSummary.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_quantity" fill="#1B5E20" name="Cantidad" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                {LABELS.common.noData}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{LABELS.dashboard.movementHistory}</h2>
          <div className="h-64">
            {movementHistory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movementHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="entries" stroke="#1B5E20" strokeWidth={2} name={LABELS.dashboard.entries} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="exits" stroke="#dc2626" strokeWidth={2} name={LABELS.dashboard.exits} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                {LABELS.common.noData}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2: Price Trends + Savings History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{LABELS.dashboard.priceTrends}</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{LABELS.dashboard.selectProduct}</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code || `Producto ${p.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64">
            {selectedProductId && priceTrendsChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceTrendsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  {priceTrends.map((s, i) => (
                    <Line
                      key={s.supplier_id}
                      type="monotone"
                      dataKey={s.supplier_name || s.supplier_id}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : selectedProductId ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                {LABELS.common.noData}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Selecciona un producto para ver tendencias
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{LABELS.dashboard.savingsHistory}</h2>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            {savingsHistory.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-700">{LABELS.dashboard.order}</th>
                    <th className="text-left py-2 font-medium text-gray-700">{LABELS.dashboard.date}</th>
                    <th className="text-right py-2 font-medium text-gray-700">{LABELS.dashboard.savings}</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsHistory.slice(0, 10).map((item) => (
                    <tr key={item.order_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">#{item.order_id}</td>
                      <td className="py-2 text-gray-600">{formatDate(item.created_at)}</td>
                      <td className="py-2 text-right font-medium text-emerald-600">{formatCurrency(item.total_savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-gray-500 text-sm">{LABELS.common.noData}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
