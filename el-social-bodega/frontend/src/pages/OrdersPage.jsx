import React from 'react'
import { LABELS } from '../utils/labels'

export default function OrdersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {LABELS.orders.title}
      </h1>
      <p className="text-gray-600">{LABELS.common.noData}</p>
    </div>
  )
}
