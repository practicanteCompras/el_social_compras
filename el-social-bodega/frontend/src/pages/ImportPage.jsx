import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FiUpload, FiFile } from 'react-icons/fi'
import api from '../services/api'
import { LABELS } from '../utils/labels'
import toast from 'react-hot-toast'

function ImportSection({ title, endpoint, labels }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: (accepted) => {
      setFile(accepted[0] || null)
      setResult(null)
    },
  })

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo primero')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await api.post(endpoint, formData)

      setResult(data)
      toast.success(`${data.imported_count ?? 0} registros importados correctamente`)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Error al importar'
      toast.error(typeof msg === 'string' ? msg : 'Error al importar')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6 space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{labels.dragDrop}</p>
          <p className="text-sm text-gray-500 mt-1">{labels.supportedFormats}</p>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FiFile className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Quitar
            </button>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-pulse">{LABELS.common.loading}</span>
            </>
          ) : (
            <>
              <FiUpload className="w-5 h-5" />
              {labels.importBtn}
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-800 mb-3">{labels.results}</h3>
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium text-emerald-600">{result.imported_count ?? 0}</span>{' '}
                {labels.imported}
              </p>
              {result.skipped && result.skipped.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {labels.skipped} ({result.skipped.length})
                  </p>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">{LABELS.importData.row}</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">{LABELS.importData.reason}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.skipped.map((s, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="py-2 px-3">{s.row}</td>
                            <td className="py-2 px-3 text-gray-600">{s.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {LABELS.importData.title}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportSection
          title={LABELS.importData.importSuppliers}
          endpoint="/import/suppliers"
          labels={{
            dragDrop: LABELS.importData.dragDrop,
            supportedFormats: LABELS.importData.supportedFormats,
            importBtn: LABELS.importData.importBtn,
            results: LABELS.importData.results,
            imported: LABELS.importData.imported,
            skipped: LABELS.importData.skipped,
          }}
        />
        <ImportSection
          title={LABELS.importData.importProducts}
          endpoint="/import/products"
          labels={{
            dragDrop: LABELS.importData.dragDrop,
            supportedFormats: LABELS.importData.supportedFormats,
            importBtn: LABELS.importData.importBtn,
            results: LABELS.importData.results,
            imported: LABELS.importData.imported,
            skipped: LABELS.importData.skipped,
          }}
        />
      </div>
    </div>
  )
}
