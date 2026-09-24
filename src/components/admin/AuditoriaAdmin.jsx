import { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react'
import {
  getAuditLogs,
  verifyAuditRecordIntegrity,
  exportAuditLogJSON,
  clearAuditLogs,
} from '../../services/auditService.js'

export default function AuditoriaAdmin() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEntity, setFilterEntity] = useState('TODOS')
  const [filterStatus, setFilterStatus] = useState('TODOS')
  const [selectedLog, setSelectedLog] = useState(null)
  const [verificationResults, setVerificationResults] = useState({})
  const [verifyingAll, setVerifyingAll] = useState(false)

  const reloadLogs = () => {
    setLoading(true)
    const stored = getAuditLogs()
    setLogs(stored)
    setLoading(false)
  }

  useEffect(() => {
    reloadLogs()

    const handleNewTx = (e) => {
      if (e.detail) {
        setLogs((prev) => [e.detail, ...prev])
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('deposito:transaction-audited', handleNewTx)
      return () => window.removeEventListener('deposito:transaction-audited', handleNewTx)
    }
  }, [])

  const handleVerifyOne = async (record) => {
    const res = await verifyAuditRecordIntegrity(record)
    setVerificationResults((prev) => ({
      ...prev,
      [record.id]: res,
    }))
  }

  const handleVerifyAll = async () => {
    setVerifyingAll(true)
    const newResults = {}
    for (const record of logs) {
      const res = await verifyAuditRecordIntegrity(record)
      newResults[record.id] = res
    }
    setVerificationResults(newResults)
    setVerifyingAll(false)
  }

  const handleClear = async () => {
    if (window.confirm('¿Confirmás reiniciar el registro local de auditoría? Se guardará un evento auditado de reinicio.')) {
      const remaining = await clearAuditLogs('admin')
      setLogs(remaining)
      setVerificationResults({})
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchTerm ||
        log.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.payload || {}).toLowerCase().includes(searchTerm.toLowerCase())

      const matchEntity = filterEntity === 'TODOS' || log.entity === filterEntity
      const matchStatus = filterStatus === 'TODOS' || log.status === filterStatus

      return matchSearch && matchEntity && matchStatus
    })
  }, [logs, searchTerm, filterEntity, filterStatus])

  const totalSuccess = logs.filter((l) => l.status === 'SUCCESS').length
  const totalVerifiedValid = Object.values(verificationResults).filter((v) => v.valid).length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tarjetas de Resumen de Auditoría e Integridad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Transacciones
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{logs.length}</p>
          <span className="text-xs text-green-600 font-medium">
            {totalSuccess} exitosas registradas
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Integridad de Datos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {Object.keys(verificationResults).length > 0
              ? `${Math.round((totalVerifiedValid / Object.keys(verificationResults).length) * 100)}%`
              : 'SHA-256 Activo'}
          </p>
          <span className="text-xs text-gray-500">
            Firma criptográfica inalterable
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Acciones de Control
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleVerifyAll}
              disabled={verifyingAll || logs.length === 0}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {verifyingAll ? 'Verificando...' : 'Verificar Todo'}
            </button>
            <button
              type="button"
              onClick={exportAuditLogJSON}
              disabled={logs.length === 0}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, acción, actor o payload..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="TODOS">Todas las entidades</option>
            <option value="productos">Productos</option>
            <option value="categorias">Categorías</option>
            <option value="rubros">Rubros</option>
            <option value="usuarios">Usuarios</option>
            <option value="presupuesto">Presupuestos</option>
            <option value="logistica">Logística</option>
            <option value="consulta">Consultas</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="SUCCESS">Exitosos</option>
            <option value="ERROR">Errores</option>
          </select>

          <button
            type="button"
            onClick={reloadLogs}
            title="Recargar log"
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ID / Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad / ID</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Integridad SHA-256</th>
                <th className="px-4 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    No se encontraron transacciones registradas.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const check = verificationResults[log.id]
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-medium text-gray-900">{log.id}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString('es-AR')}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-800">{log.entity}</span>
                        {log.entityId && (
                          <span className="text-gray-400 ml-1 font-mono text-[10px]">
                            ({log.entityId.slice(0, 8)}...)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 max-w-[140px] truncate" title={log.actor}>
                        {log.actor}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            <span>OK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>FALLÓ</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {check ? (
                          check.valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Válido</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              <span>Alterado</span>
                            </span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyOne(log)}
                            className="text-[11px] font-mono text-gray-500 hover:text-[var(--primary)] hover:underline cursor-pointer"
                            title="Verificar hash de integridad"
                          >
                            {log.integrityHash?.substring(0, 10)}... 🔍
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Ver carga útil (payload)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Carga Útil */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Transacción {selectedLog.id}
                </h3>
                <span className="text-xs text-gray-500">
                  {selectedLog.action} · {selectedLog.entity} · {selectedLog.actor}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <span className="text-gray-500 block mb-1 font-sans font-semibold">Checksum SHA-256:</span>
                <div className="p-2 bg-gray-100 rounded border border-gray-200 text-gray-800 break-all">
                  {selectedLog.integrityHash}
                </div>
              </div>

              <div>
                <span className="text-gray-500 block mb-1 font-sans font-semibold">Carga útil (Payload / Cambios):</span>
                <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              {selectedLog.error && (
                <div>
                  <span className="text-red-500 block mb-1 font-sans font-semibold">Error registrado:</span>
                  <div className="p-2 bg-red-50 text-red-700 rounded border border-red-200">
                    {selectedLog.error}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
