# Prompt para Claude Code: Sistema de Gestión de Presupuestos de Obra

## Contexto del Proyecto

Desarrollar una aplicación web para una empresa constructora que necesita gestionar presupuestos de obra de manera ágil, eficiente y con capacidad de reutilizar información de presupuestos anteriores. El objetivo principal es **reducir drásticamente el tiempo** desde que un cliente solicita un presupuesto hasta que se le entrega.

## Stack Tecnológico Requerido

- **Frontend**: Next.js 14+ (App Router) con TypeScript
- **Backend**: Next.js API Routes / Server Actions
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Deployment**: Vercel (sin micro-frontends, monolito)
- **UI**: Tailwind CSS + shadcn/ui
- **Arquitectura**: Multitenant desde el inicio

## Flujo de Trabajo del Sistema

### 1. Importación del Cómputo (Input)
El flujo comienza cuando se importa una planilla de cómputo generada por AutoCAD, Revit o calculada manualmente. La planilla contiene:

**Estructura de la planilla de cómputo (Excel):**
```
| Ítems                                              | U   | Cantidad    |
|----------------------------------------------------|-----|-------------|
| Tareas preliminares:                               |     |             |
| Replanteo y nivelación                             | gl  | 1.00        |
| Demolición y limpieza del terreno                  | gl  | 1.00        |
| Movimiento de suelos:                              |     |             |
| Perforación pilotes                                | ml  | 523.92      |
| Excavación para cabezales y vigas de fundación     | m3  | 78.07       |
| Estructura resistente:                             |     |             |
| Hormigón armado tabiques y columnas                | m3  | 130.11      |
| Hormigón armado vigas                              | m3  | 98.89       |
| Mamposterías:                                      |     |             |
| Mampostería de ladrillos cerámicos huecos 18x18x33 | m2  | 398.84      |
| ...                                                |     |             |
```

**Importante**: La planilla de cómputo NO tiene precios, solo ítems con cantidades y unidades. Los ítems están organizados en rubros (categorías) identificados por filas que terminan en ":" y no tienen unidad ni cantidad.

### 2. Organización en Rubros y Tareas
Una vez importado el cómputo, el sistema debe organizar automáticamente:
- **Rubros**: Categorías principales (ej: "Estructura resistente", "Mamposterías", "Revoques")
- **Tareas**: Ítems específicos dentro de cada rubro con su cantidad y unidad

### 3. Asignación de Precios (Análisis de Costos)
Para cada tarea, se debe poder cargar:
- **Mano de obra**: Cantidad de horas/jornal (HS), precio unitario, total
- **Materiales**: Lista de materiales con:
  - Nombre del material
  - Unidad (KG, M2, M3, etc.)
  - Cantidad
  - Precio unitario
  - Total

**Ejemplo de análisis de costo (de las imágenes de DataObra):**
```
Tarea: Hormigón armado tabiques y columnas - Unidad: m3

MANO DE OBRA          Total: 540,000.00
  Mano de obra        HS    40.00    13,500.00    540,000.00

MATERIALES            Total: 424,850.00
  Clavos 2" y 2 1/2"  KG     3.00     4,200.00     12,600.00
  Madera encofrado    M2    13.00     3,000.00     39,000.00
  Alambres            KG     3.00     4,250.00     12,750.00
  Hormigón elab. H-21 M3     1.00   144,500.00    144,500.00
  Acero ADN 420       KG   120.00     1,800.00    216,000.00

Total costo directo:                              964,850.00
```

### 4. Reutilización de Presupuestos Anteriores
El sistema debe permitir:
- Copiar análisis de costos de presupuestos anteriores como referencia
- Editar fácilmente los precios copiados
- Comparar precios entre diferentes fechas/versiones

### 5. Gestión de Versiones e Inflación
**CRÍTICO**: Debido al contexto inflacionario, el sistema debe:
- Guardar snapshots/versiones de cada presupuesto con fecha
- Aplicar índices de actualización por inflación
- Permitir simulación de actualización antes del guardado
- Registrar el índice y fecha de cada actualización
- Los índices se ingresan manualmente (extraídos de fuentes externas)

### 6. Generación del Presupuesto Final (Output)
El output debe seguir este formato Excel:

```
Obra: [Nombre de la obra]
Ubicación: [Dirección]
Comitente: [Cliente]
Fecha: [Fecha del presupuesto]

| Item                                    | Unid | Cant | Unit Mat. | Materiales | Unit. M de O | Mano de obra | Totales    |
|-----------------------------------------|------|------|-----------|------------|--------------|--------------|------------|
| Tareas preliminares                     |      |      |           | 2,032,800  |              | 2,628,000    | 4,660,800  |
| Replanteo y nivelación                  | gl   | 1    | 0         | 0          | 2,628,000    | 2,628,000    | 2,628,000  |
| Baño químico                            | gl   | 1    | 2,032,800 | 2,032,800  | 0            | 0            | 2,032,800  |
| Movimiento de suelos                    |      |      |           | 1,497,000  |              | 13,096,160   | 14,593,160 |
| ...                                     |      |      |           |            |              |              |            |
|                                         |      |      |           |            |              |              |            |
|                                    Subtotal:   |      | 892,550,733|            |  854,773,946 |1,747,324,679 |
|                                    IVA 10,5%:  |      |            |            |              | 183,469,091  |
|                                    Total:      |      |            |            |              |1,930,793,771 |
```

## Modelo de Datos

### Entidades Principales

```typescript
// Tenant (Organización/Empresa)
interface Tenant {
  id: string;
  name: string;
  slug: string; // para subdominios o rutas
  settings: {
    iva_percentage: number;
    default_currency: string;
    inflation_index_source?: string;
  };
  created_at: Date;
}

// Usuario
interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: Date;
}

// Presupuesto
interface Budget {
  id: string;
  tenant_id: string;
  name: string;
  project_name: string; // Nombre de la obra
  location: string;
  client_name: string; // Comitente
  status: 'draft' | 'active' | 'archived';
  base_date: Date; // Mes base para inflación
  created_at: Date;
  updated_at: Date;
}

// Versión del Presupuesto (para snapshots)
interface BudgetVersion {
  id: string;
  budget_id: string;
  version_number: number;
  date: Date;
  inflation_index?: number;
  inflation_index_name?: string;
  notes?: string;
  is_simulation: boolean;
  created_at: Date;
}

// Rubro (Categoría)
interface Category {
  id: string;
  budget_id: string;
  name: string;
  order_index: number;
}

// Tarea (Ítem del presupuesto)
interface Task {
  id: string;
  budget_id: string;
  category_id: string;
  name: string;
  unit: string; // gl, m2, m3, ml, u, kg, etc.
  quantity: number;
  order_index: number;
}

// Precio de Tarea (para versionado)
interface TaskPrice {
  id: string;
  task_id: string;
  version_id: string;
  labor_unit_price: number;
  labor_quantity: number;
  labor_total: number;
  materials_total: number;
  total: number;
}

// Material en una Tarea
interface TaskMaterial {
  id: string;
  task_price_id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Catálogo de Materiales (biblioteca reutilizable)
interface MaterialCatalog {
  id: string;
  tenant_id: string;
  name: string;
  unit: string;
  category: string;
  description?: string;
}

// Precio de Material en Catálogo (histórico)
interface MaterialPrice {
  id: string;
  material_id: string;
  price: number;
  date: Date;
  source?: string; // proveedor, referencia
  notes?: string;
}

// Índice de Inflación
interface InflationIndex {
  id: string;
  tenant_id: string;
  name: string;
  date: Date;
  value: number;
  base_date: Date;
  source?: string;
}
```

## Funcionalidades Requeridas

### MVP - Fase 1

1. **Autenticación y Multitenancy**
   - Login/Registro con email
   - Aislamiento de datos por tenant
   - Roles básicos (admin, editor, viewer)

2. **Gestión de Presupuestos**
   - CRUD de presupuestos
   - Importar cómputo desde Excel (.xlsx)
   - Organización automática en rubros y tareas
   - Vista de lista de presupuestos

3. **Edición de Presupuesto**
   - Vista jerárquica: Rubros > Tareas
   - Modal de análisis de costo por tarea
   - Carga de mano de obra y materiales
   - Cálculos automáticos de totales

4. **Versionado**
   - Guardar versión/snapshot
   - Ver historial de versiones
   - Comparar versiones

5. **Actualización por Inflación**
   - Ingresar índice de inflación manualmente
   - Simular actualización (preview)
   - Aplicar actualización y guardar nueva versión

6. **Exportación**
   - Generar Excel con formato de presupuesto final
   - Incluir subtotales por rubro, IVA y total

### Futuras Funcionalidades (Dejar preparado)

- Importar precios de PDFs de proveedores
- Dashboard con analíticas
- Comparativas entre presupuestos
- Exportación a formatos adicionales (PDF)
- API para integraciones externas

## Estructura del Proyecto

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (lista de presupuestos)
│   │   ├── budgets/
│   │   │   ├── new/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx (vista/edición)
│   │   │   │   ├── versions/
│   │   │   │   └── export/
│   │   ├── materials/ (catálogo)
│   │   ├── inflation-indexes/
│   │   └── settings/
│   └── api/
│       ├── budgets/
│       ├── tasks/
│       ├── materials/
│       └── export/
├── components/
│   ├── ui/ (shadcn)
│   ├── budget/
│   │   ├── BudgetList.tsx
│   │   ├── BudgetEditor.tsx
│   │   ├── CategorySection.tsx
│   │   ├── TaskRow.tsx
│   │   ├── TaskCostAnalysisModal.tsx
│   │   └── ImportComputeDialog.tsx
│   ├── version/
│   │   ├── VersionHistory.tsx
│   │   └── InflationAdjustModal.tsx
│   └── export/
│       └── ExportDialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils/
│   │   ├── excel-parser.ts
│   │   ├── excel-generator.ts
│   │   └── calculations.ts
│   └── types/
│       └── index.ts
├── hooks/
│   ├── useBudget.ts
│   ├── useVersion.ts
│   └── useMaterials.ts
└── supabase/
    └── migrations/
```

## Consideraciones Técnicas

### Multitenancy
- Usar Row Level Security (RLS) de Supabase
- Todas las queries filtradas por `tenant_id`
- El `tenant_id` se obtiene del usuario autenticado

### Importación de Excel
- Usar librería `xlsx` o `sheetjs`
- Detectar rubros (filas que terminan en ":" sin cantidad)
- Parsear unidades y cantidades
- Validar formato antes de importar

### Exportación de Excel
- Usar `exceljs` para generar con formato
- Aplicar estilos según el template de presupuesto final
- Incluir fórmulas para totales

### Manejo de Decimales
- Usar tipo `numeric` en PostgreSQL para precios
- Formatear con 2 decimales para visualización
- Mantener precisión en cálculos

### Performance
- Paginación en listas largas
- Lazy loading de detalles de tareas
- Cache de catálogo de materiales

## Comandos de Inicio

```bash
# Crear proyecto Next.js
npx create-next-app@latest presupuestos-obra --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Instalar dependencias
cd presupuestos-obra
npm install @supabase/supabase-js @supabase/ssr xlsx exceljs
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog form input label select table tabs toast

# Configurar Supabase
# 1. Crear proyecto en supabase.com
# 2. Copiar URL y anon key al .env.local
```

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migraciones SQL Iniciales

```sql
-- Habilitar RLS
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.budgets enable row level security;
-- ... para todas las tablas

-- Crear tablas (ejecutar en orden)
create table public.tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  settings jsonb default '{"iva_percentage": 10.5, "default_currency": "ARS"}'::jsonb,
  created_at timestamptz default now()
);

create table public.users (
  id uuid references auth.users on delete cascade primary key,
  tenant_id uuid references public.tenants on delete cascade not null,
  email text not null,
  name text,
  role text default 'editor' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz default now()
);

create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  project_name text,
  location text,
  client_name text,
  status text default 'draft' check (status in ('draft', 'active', 'archived')),
  base_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.budget_versions (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  version_number integer not null,
  date date not null,
  inflation_index numeric,
  inflation_index_name text,
  notes text,
  is_simulation boolean default false,
  created_at timestamptz default now()
);

create table public.categories (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  name text not null,
  order_index integer default 0
);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  name text not null,
  unit text,
  quantity numeric default 0,
  order_index integer default 0
);

create table public.task_prices (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks on delete cascade not null,
  version_id uuid references public.budget_versions on delete cascade not null,
  labor_unit_price numeric default 0,
  labor_quantity numeric default 0,
  labor_total numeric default 0,
  materials_total numeric default 0,
  total numeric default 0
);

create table public.task_materials (
  id uuid default gen_random_uuid() primary key,
  task_price_id uuid references public.task_prices on delete cascade not null,
  name text not null,
  unit text,
  quantity numeric default 0,
  unit_price numeric default 0,
  total numeric default 0
);

create table public.material_catalog (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  unit text,
  category text,
  description text,
  created_at timestamptz default now()
);

create table public.material_prices (
  id uuid default gen_random_uuid() primary key,
  material_id uuid references public.material_catalog on delete cascade not null,
  price numeric not null,
  date date not null,
  source text,
  notes text
);

create table public.inflation_indexes (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  date date not null,
  value numeric not null,
  base_date date not null,
  source text
);

-- Políticas RLS básicas
create policy "Users can view own tenant data"
  on public.budgets for select
  using (tenant_id = (select tenant_id from public.users where id = auth.uid()));

-- Agregar políticas similares para todas las tablas
```

## Prioridades de Desarrollo

1. **Semana 1**: Setup inicial, autenticación, modelo de datos
2. **Semana 2**: Importación de cómputo, visualización de presupuesto
3. **Semana 3**: Edición de análisis de costos, cálculos
4. **Semana 4**: Versionado, actualización por inflación
5. **Semana 5**: Exportación a Excel, ajustes y testing

---

**Nota**: Este es el MVP. El sistema debe ser extensible para agregar funcionalidades como importación de PDFs de proveedores, analíticas avanzadas y comparativas entre presupuestos en el futuro.
