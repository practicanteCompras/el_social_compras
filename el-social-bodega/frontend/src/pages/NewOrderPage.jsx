import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import api from '../services/api'
import { LABELS } from '../utils/labels'
import toast from 'react-hot-toast'

const SEDES = [
  { id: 1, name: 'El Social Laureles' },
  { id: 2, name: 'El Social Poblado' },
  { id: 3, name: 'El Social Envigado' },
  { id: 4, name: 'El Social Sabaneta' },
  { id: 5, name: 'El Social Belén' },
  { id: 6, name: 'El Social Estadio' },
  { id: 7, name: 'El Social Centro' },
]

export default function NewOrderPage() {
  const navigate = useNavigate()
  const [sedeId, setSedeId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sedeId) {
      toast.error('Selecciona una sede')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/orders', { sede_id: parseInt(sedeId, 10) })
      toast.success('Pedido creado correctamente')
      navigate(`/pedidos/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Link
        to="/pedidos"
        className="inline-flex items-center gap-2 mb-6 text-primary hover:text-primary-dark font-medium transition-colors"
      >
        <FiArrowLeft className="w-5 h-5" />
        {LABELS.common.back}
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {LABELS.orders.newOrder}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="sede" className="block text-sm font-medium text-gray-700 mb-2">
              {LABELS.orders.sede}
            </label>
            <select
              id="sede"
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Selecciona una sede</option>
              {SEDES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? LABELS.common.loading : 'Crear y agregar productos'}
            </button>
            <Link
              to="/pedidos"
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {LABELS.common.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
