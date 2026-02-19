import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiAlertTriangle,
} from 'react-icons/fi'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LABELS } from '../utils/labels'
import toast from 'react-hot-toast'

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'purchase_entry', label: LABELS.inventory.purchaseEntry },
  { value: 'exit_by_request', label: LABELS.inventory.exitByRequest },
  { value: 'adjustment', label: LABELS.inventory.adjustment },
  { value: 'loss_damage', label: LABELS.inventory.lossDamage },
]

const MOVEMENT_TYPE_LABELS = Object.fromEntries(
  MOVEMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
)

function AddPriceModal({ productId, linkedSuppliers, onClose, onSuccess }) {
  const [form, setForm] = useState({
    supplier_id: '',
    price: '',
    recorded_month: new Date().getMonth() + 1,
    recorded_year: new Date().getFullYear(),
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplier_id || !form.price) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      await api.post(`/products/${productId}/prices`, {
        supplier_id: parseInt(form.supplier_id, 10),
        price: parseFloat(form.price),
        recorded_month: parseInt(form.recorded_month, 10),
        recorded_year: parseInt(form.recorded_year, 10),
      })
      toast.success('Precio registrado correctamente')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar precio')
    } finally {
      setSaving(false)
    }
  }

  const suppliers = linkedSuppliers.length > 0
    ? linkedSuppliers
    : []

  if (suppliers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <p className="text-gray-600 mb-4">
            Primero debes vincular al menos un proveedor al producto.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {LABELS.common.cancel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {LABELS.inventory.addPrice}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Seleccionar...</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name} (Slot {s.slot})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={form.recorded_month}
                onChange={(e) => setForm((f) => ({ ...f, recorded_month: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={form.recorded_year}
                onChange={(e) => setForm((f) => ({ ...f, recorded_year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {LABELS.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? LABELS.common.loading : LABELS.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkSupplierModal({ productId, linkedSuppliers, allSuppliers, onClose, onSuccess }) {
  const usedSlots = linkedSuppliers.map((s) => s.slot)
  const availableSlots = [1, 2, 3].filter((s) => !usedSlots.includes(s))
  const linkedIds = new Set(linkedSuppliers.map((s) => s.supplier_id))
  const availableSuppliers = allSuppliers.filter((s) => !linkedIds.has(s.id))

  const [form, setForm] = useState({ supplier_id: '', slot: availableSlots[0] || 1 })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplier_id) {
      toast.error('Selecciona un proveedor')
      return
    }
    setSaving(true)
    try {
      await api.post(`/products/${productId}/suppliers`, {
        supplier_id: parseInt(form.supplier_id, 10),
        slot: parseInt(form.slot, 10),
      })
      toast.success('Proveedor vinculado correctamente')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al vincular')
    } finally {
      setSaving(false)
    }
  }

  if (availableSlots.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <p className="text-gray-600 mb-4">
            Ya tienes los 3 slots de proveedores ocupados. Desvincula uno para agregar otro.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {LABELS.common.cancel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {LABELS.inventory.linkSupplier}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Seleccionar...</option>
              {availableSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slot</label>
            <select
              value={form.slot}
              onChange={(e) => setForm((f) => ({ ...f, slot: parseInt(e.target.value, 10) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {availableSlots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {LABELS.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? LABELS.common.loading : LABELS.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [product, setProduct] = useState(null)
  const [priceComparison, setPriceComparison] = useState([])
  const [movements, setMovements] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [showLinkSupplier, setShowLinkSupplier] = useState(false)
  const [movementForm, setMovementForm] = useState({
    movement_type: 'purchase_entry',
    quantity: '',
    notes: '',
  })
  const [submittingMovement, setSubmittingMovement] = useState(false)

  const fetchProduct = useCallback(async () => {
    try {
      const { data } = await api.get(`/products/${productId}`)
      setProduct(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Producto no encontrado')
      navigate('/inventario')
    }
  }, [productId, navigate])

  const fetchPriceComparison = useCallback(async () => {
    try {
      const { data } = await api.get(`/products/${productId}/price-comparison`)
      setPriceComparison(data)
    } catch {
      setPriceComparison([])
    }
  }, [productId])

  const fetchMovements = useCallback(async () => {
    try {
      const { data } = await api.get('/movements', { params: { product_id: productId } })
      setMovements(data)
    } catch {
      setMovements([])
    }
  }, [productId])

  const fetchSuppliers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const { data } = await api.get('/suppliers')
      setSuppliers(data)
    } catch {
      setSuppliers([])
    }
  }, [isAdmin])

  const refreshAll = useCallback(() => {
    fetchProduct()
    fetchPriceComparison()
    fetchMovements()
  }, [fetchProduct, fetchPriceComparison, fetchMovements])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchProduct(),
      fetchPriceComparison(),
      fetchMovements(),
      fetchSuppliers(),
    ]).finally(() => setLoading(false))
  }, [fetchProduct, fetchPriceComparison, fetchMovements, fetchSuppliers])

  const handleUnlinkSupplier = async (slot) => {
    if (!window.confirm('¿Desvincular este proveedor?')) return
    try {
      await api.delete(`/products/${productId}/suppliers/${slot}`)
      toast.success('Proveedor desvinculado')
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al desvincular')
    }
  }

  const handleMovementSubmit = async (e) => {
    e.preventDefault()
    const qty = parseInt(movementForm.quantity, 10)
    if (!qty || qty <= 0) {
      toast.error('Ingresa una cantidad válida')
      return
    }
    setSubmittingMovement(true)
    try {
      await api.post('/movements', {
        product_id: parseInt(productId, 10),
        movement_type: movementForm.movement_type,
        quantity: qty,
        sede_id: user?.sede_id || null,
        notes: movementForm.notes || null,
      })
      toast.success('Movimiento registrado')
      setMovementForm({ movement_type: 'purchase_entry', quantity: '', notes: '' })
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar movimiento')
    } finally {
      setSubmittingMovement(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading && !product) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!product) return null

  const isLowStock = (product.current_quantity ?? 0) < (product.min_stock ?? 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        to="/inventario"
        className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-6"
      >
        <FiArrowLeft size={18} />
        {LABELS.common.back}
      </Link>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
            <p className="text-gray-600 font-mono mt-1">{product.code}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="px-2 py-1 bg-gray-100 rounded">{product.category}</span>
              <span className="text-gray-600">UM: {product.unit}</span>
              <span className={isLowStock ? 'font-semibold text-red-600' : ''}>
                {LABELS.inventory.currentStock}: {product.current_quantity ?? 0}
              </span>
              <span className="text-gray-600">
                {LABELS.inventory.minStock}: {product.min_stock ?? 0}
              </span>
            </div>
          </div>
          {isLowStock && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <FiAlertTriangle size={18} />
              <span className="text-sm font-medium">Stock bajo</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{LABELS.inventory.priceComparison}</h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddPrice(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <FiPlus size={14} />
                {LABELS.inventory.addPrice}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            {priceComparison.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No hay proveedores vinculados o precios registrados
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">{LABELS.inventory.currentPrice}</th>
                    <th className="px-4 py-3">{LABELS.inventory.previousPrice}</th>
                    <th className="px-4 py-3">{LABELS.inventory.variation}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceComparison.map((row) => (
                    <tr
                      key={`${row.supplier_id}-${row.slot}`}
                      className={`border-t border-gray-100 ${
                        row.is_best_price ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{row.supplier_name}</span>
                        {row.is_best_price && (
                          <span className="ml-2 text-xs font-semibold text-green-700">
                            Mejor precio
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_price != null
                          ? `$${Number(row.current_price).toLocaleString('es-CO')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {row.previous_price != null
                          ? `$${Number(row.previous_price).toLocaleString('es-CO')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {row.variation_pct != null ? (
                          <span
                            className={
                              row.variation_pct < 0
                                ? 'text-green-600 font-medium'
                                : row.variation_pct > 0
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }
                          >
                            {row.variation_pct > 0 ? '+' : ''}
                            {row.variation_pct.toFixed(1)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{LABELS.inventory.linkedSuppliers}</h2>
              <button
                onClick={() => setShowLinkSupplier(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <FiPlus size={14} />
                {LABELS.inventory.linkSupplier}
              </button>
            </div>
            <div className="p-4">
              {priceComparison.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin proveedores vinculados</p>
              ) : (
                <ul className="space-y-2">
                  {priceComparison.map((row) => (
                    <li
                      key={`${row.supplier_id}-${row.slot}`}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <span>
                        {row.supplier_name} <span className="text-gray-500">(Slot {row.slot})</span>
                      </span>
                      <button
                        onClick={() => handleUnlinkSupplier(row.slot)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title={LABELS.inventory.unlinkSupplier}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      <section className="mt-6 bg-white rounded-2xl shadow-md overflow-hidden">
        <h2 className="p-4 border-b border-gray-100 font-semibold text-gray-800">
          {LABELS.inventory.registerMovement}
        </h2>
        <form onSubmit={handleMovementSubmit} className="p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={movementForm.movement_type}
              onChange={(e) =>
                setMovementForm((f) => ({ ...f, movement_type: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]"
            >
              {MOVEMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {LABELS.orders.quantity}
            </label>
            <input
              type="number"
              min="1"
              value={movementForm.quantity}
              onChange={(e) =>
                setMovementForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-24"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={movementForm.notes}
              onChange={(e) =>
                setMovementForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Observaciones..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={submittingMovement}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
          >
            {submittingMovement ? LABELS.common.loading : 'Registrar'}
          </button>
        </form>
      </section>

      <section className="mt-6 bg-white rounded-2xl shadow-md overflow-hidden">
        <h2 className="p-4 border-b border-gray-100 font-semibold text-gray-800">
          {LABELS.inventory.movements}
        </h2>
        <div className="overflow-x-auto">
          {movements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{LABELS.common.noData}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      {MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.user_email || m.user_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showAddPrice && (
        <AddPriceModal
          productId={productId}
          linkedSuppliers={priceComparison}
          onClose={() => setShowAddPrice(false)}
          onSuccess={refreshAll}
        />
      )}
      {showLinkSupplier && (
        <LinkSupplierModal
          productId={productId}
          linkedSuppliers={priceComparison}
          allSuppliers={suppliers}
          onClose={() => setShowLinkSupplier(false)}
          onSuccess={refreshAll}
        />
      )}
    </div>
  )
}
