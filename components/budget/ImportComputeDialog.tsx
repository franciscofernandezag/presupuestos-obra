'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, AlertTriangle, Check } from 'lucide-react'
import { parseComputeExcel } from '@/lib/utils/excel-parser'
import { importCompute } from '@/lib/actions/budgets'
import type { ParsedCompute } from '@/lib/types'

interface ImportComputeDialogProps {
  budgetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportComputeDialog({
  budgetId,
  open,
  onOpenChange
}: ImportComputeDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCompute | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setParsed(null)
    setSuccess(false)

    // Parse the file
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer
        const result = parseComputeExcel(data)
        setParsed(result)
      } catch (err) {
        setError('Error al leer el archivo. Asegurate de que sea un Excel valido.')
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  async function handleImport() {
    if (!parsed) return

    setLoading(true)
    setError(null)

    try {
      await importCompute(budgetId, parsed)
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setFile(null)
    setParsed(null)
    setError(null)
    setSuccess(false)
    onOpenChange(false)
  }

  const totalTasks = parsed?.categories.reduce((sum, cat) => sum + cat.tasks.length, 0) || 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Computo</DialogTitle>
          <DialogDescription>
            Selecciona un archivo Excel con el computo de la obra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">
                  Click para seleccionar o arrastra un archivo Excel
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {success && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Computo importado correctamente!
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsed && !success && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Vista previa:</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Categorias:</span>{' '}
                    {parsed.categories.length}
                  </p>
                  <p>
                    <span className="text-gray-500">Items totales:</span>{' '}
                    {totalTasks}
                  </p>
                </div>

                {/* Categories preview */}
                <div className="mt-3 max-h-40 overflow-y-auto">
                  {parsed.categories.map((cat, i) => (
                    <div key={i} className="text-sm py-1 border-t first:border-t-0">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-gray-500 ml-2">
                        ({cat.tasks.length} items)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {parsed.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Advertencias:</p>
                    <ul className="text-sm list-disc list-inside">
                      {parsed.warnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {parsed.warnings.length > 5 && (
                        <li>... y {parsed.warnings.length - 5} mas</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || loading || success}
          >
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
