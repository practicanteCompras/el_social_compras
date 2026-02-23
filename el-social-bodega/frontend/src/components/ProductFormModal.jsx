import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { LABELS } from '../utils/labels'
import toast from 'react-hot-toast'

export default function ProductFormModal({ product, onClose, onSuccess }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    unit: '',
    min_stock: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code || '',
        name: product.name || '',
        category: product.category || '',
        unit: product.unit || '',
        min_stock: product.min_stock ?? 0,
      })
    } else {
      setForm({ code: '', name: '', category: '', unit: '', min_stock: 0 })
    }
  }, [product])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (product?.id) {
        await api.put(`/products/${product.id}`, form)
        toast.success('Producto actualizado correctamente')
      } else {
        await api.post('/products', form)
        toast.success('Producto creado correctamente')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {product ? LABELS.common.edit : LABELS.inventory.addProduct}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{LABELS.inventory.code}</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{LABELS.inventory.name}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{LABELS.inventory.category}</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{LABELS.inventory.unit}</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="unidad, caja, kg, litro..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{LABELS.inventory.minStock}</label>
            <input
              type="number"
              min="0"
              value={form.min_stock}
              onChange={(e) => setForm((f) => ({ ...f, min_stock: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
