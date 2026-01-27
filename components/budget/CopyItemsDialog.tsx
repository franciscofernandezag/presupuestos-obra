'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight, Copy, Check, Loader2 } from 'lucide-react'
import { getBudgetsForCopy, copyTasksFromBudget, getTargetCategories } from '@/lib/actions/copy-items'
import type { BudgetForCopy, Category } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/format'

interface CopyItemsDialogProps {
  budgetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopyItemsDialog({ budgetId, open, onOpenChange }: CopyItemsDialogProps) {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Data
  const [budgets, setBudgets] = useState<BudgetForCopy[]>([])
  const [targetCategories, setTargetCategories] = useState<Category[]>([])

  // Selection
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Target
  const [targetCategoryId, setTargetCategoryId] = useState<string>('')
  const [createNewCategory, setCreateNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Load budgets when dialog opens
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, budgetId])

  async function loadData() {
    setLoadingData(true)
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        getBudgetsForCopy(budgetId),
        getTargetCategories(budgetId)
      ])
      setBudgets(budgetsData)
      setTargetCategories(categoriesData)
    } catch (err) {
      setError('Error cargando datos')
    } finally {
      setLoadingData(false)
    }
  }

  // Get selected budget
  const selectedBudget = budgets.find(b => b.id === selectedBudgetId)

  // Toggle category expansion
  function toggleCategory(categoryId: string) {
    const next = new Set(expandedCategories)
    if (next.has(categoryId)) {
      next.delete(categoryId)
    } else {
      next.add(categoryId)
    }
    setExpandedCategories(next)
  }

  // Toggle task selection
  function toggleTask(taskId: string) {
    const next = new Set(selectedTaskIds)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
    }
    setSelectedTaskIds(next)
  }

  // Toggle all tasks in category
  function toggleCategoryTasks(categoryId: string) {
    const category = selectedBudget?.categories.find(c => c.id === categoryId)
    if (!category) return

    const taskIds = category.tasks.map(t => t.id)
    const allSelected = taskIds.every(id => selectedTaskIds.has(id))

    const next = new Set(selectedTaskIds)
    if (allSelected) {
      taskIds.forEach(id => next.delete(id))
    } else {
      taskIds.forEach(id => next.add(id))
    }
    setSelectedTaskIds(next)
  }

  // Handle copy
  async function handleCopy() {
    if (selectedTaskIds.size === 0) {
      setError('Selecciona al menos un item')
      return
    }

    if (!createNewCategory && !targetCategoryId) {
      setError('Selecciona una categoria destino')
      return
    }

    if (createNewCategory && !newCategoryName.trim()) {
      setError('Ingresa un nombre para la nueva categoria')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await copyTasksFromBudget({
        sourceBudgetId: selectedBudgetId,
        sourceVersionId: selectedBudget?.current_version?.id || '',
        taskIds: Array.from(selectedTaskIds),
        targetBudgetId: budgetId,
        targetCategoryId: createNewCategory ? null : targetCategoryId,
        newCategoryName: createNewCategory ? newCategoryName : undefined
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
          router.refresh()
        }, 1500)
      } else {
        setError(result.errors?.join(', ') || 'Error al copiar')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al copiar')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelectedBudgetId('')
    setSelectedTaskIds(new Set())
    setExpandedCategories(new Set())
    setTargetCategoryId('')
    setCreateNewCategory(false)
    setNewCategoryName('')
    setError(null)
    setSuccess(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copiar Items de Otro Presupuesto</DialogTitle>
          <DialogDescription>
            Selecciona items de otros presupuestos para copiar con sus precios y materiales
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Items copiados correctamente!
            </AlertDescription>
          </Alert>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Cargando presupuestos...</span>
          </div>
        ) : !success && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Budget selector */}
            <div>
              <Label>Presupuesto origen</Label>
              {budgets.length === 0 ? (
                <p className="text-sm text-gray-500 mt-1">No hay otros presupuestos disponibles</p>
              ) : (
                <Select value={selectedBudgetId} onValueChange={(v) => {
                  setSelectedBudgetId(v)
                  setSelectedTaskIds(new Set())
                  setExpandedCategories(new Set())
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un presupuesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.project_name ? `- ${b.project_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Task browser */}
            {selectedBudget && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <Label>Items a copiar ({selectedTaskIds.size} seleccionados)</Label>
                <ScrollArea className="flex-1 border rounded-lg mt-2">
                  <div className="p-2">
                    {selectedBudget.categories.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Este presupuesto no tiene items
                      </p>
                    ) : (
                      selectedBudget.categories.map(category => {
                        const expanded = expandedCategories.has(category.id)
                        const categoryTaskIds = category.tasks.map(t => t.id)
                        const allSelected = categoryTaskIds.length > 0 &&
                          categoryTaskIds.every(id => selectedTaskIds.has(id))
                        const someSelected = categoryTaskIds.some(id => selectedTaskIds.has(id))

                        return (
                          <div key={category.id} className="mb-2">
                            <div className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded hover:bg-gray-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleCategory(category.id)}
                              >
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => toggleCategoryTasks(category.id)}
                                className={someSelected && !allSelected ? 'opacity-50' : ''}
                              />
                              <span className="font-medium text-sm flex-1">{category.name}</span>
                              <span className="text-xs text-gray-500">
                                ({category.tasks.length} items)
                              </span>
                            </div>

                            {expanded && (
                              <div className="ml-8 mt-1 space-y-0.5">
                                {category.tasks.map(task => (
                                  <div
                                    key={task.id}
                                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer"
                                    onClick={() => toggleTask(task.id)}
                                  >
                                    <Checkbox
                                      checked={selectedTaskIds.has(task.id)}
                                      onCheckedChange={() => toggleTask(task.id)}
                                    />
                                    <span className="text-sm flex-1 truncate">{task.name}</span>
                                    {task.unit && (
                                      <span className="text-xs text-gray-400">{task.unit}</span>
                                    )}
                                    {task.task_price && task.task_price.total > 0 && (
                                      <span className="text-xs text-gray-500 font-medium">
                                        {formatCurrency(task.task_price.total)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectedBudget && selectedTaskIds.size > 0 && (
              <>
                <Separator />

                {/* Target category */}
                <div className="space-y-3">
                  <Label>Categoria destino</Label>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="createNew"
                      checked={createNewCategory}
                      onCheckedChange={(checked) => {
                        setCreateNewCategory(!!checked)
                        if (checked) setTargetCategoryId('')
                      }}
                    />
                    <label htmlFor="createNew" className="text-sm cursor-pointer">
                      Crear nueva categoria
                    </label>
                  </div>

                  {createNewCategory ? (
                    <Input
                      placeholder="Nombre de la nueva categoria"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  ) : (
                    <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoria existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleCopy}
            disabled={loading || success || selectedTaskIds.size === 0 || budgets.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copiando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar {selectedTaskIds.size} item(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
