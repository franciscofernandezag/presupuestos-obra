import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBudget } from '@/lib/actions/budgets'
import { generateBudgetExcel } from '@/lib/utils/excel-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { budgetId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const budget = await getBudget(budgetId)

    if (!budget) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    // Get tenant settings for IVA
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    let ivaPercentage = 10.5
    if (profile) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant?.settings?.iva_percentage) {
        ivaPercentage = tenant.settings.iva_percentage
      }
    }

    const buffer = await generateBudgetExcel(budget, budget.current_version || null, {
      includeIVA: true,
      ivaPercentage
    })

    // Generate filename
    const filename = `${budget.name.replace(/[^a-zA-Z0-9]/g, '_')}_v${budget.current_version?.version_number || 1}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Error al exportar presupuesto' },
      { status: 500 }
    )
  }
}
