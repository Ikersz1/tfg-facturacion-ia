/** Definiciones OpenAI function calling (sin datos de negocio). */

export const ASSISTANT_OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_top_debtors",
      description:
        "Clientes con más deuda o morosidad: importe pendiente de cobro. NO usar para «mejor cliente» ni «más facturación».",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de clientes (1-10, default 5)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_top_clients_by_billing",
      description:
        "Mejor cliente o top por facturación: clientes con más importe facturado acumulado (facturas emitidas). Usar para «mejor cliente», «top cliente», «quién más factura».",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de clientes (1-10, default 5)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_client_summary",
      description:
        "Resumen de un cliente: cuántas facturas tiene y cuánto debe. Requiere nombre o parte del nombre.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nombre del cliente tal como lo diría el usuario" },
        },
        required: ["clientName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_client_last_invoice",
      description: "Última factura emitida de un cliente concreto.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nombre del cliente" },
        },
        required: ["clientName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_invoices",
      description: "Buscar facturas por cliente y/o estado (draft, issued, partial, paid, overdue, cancelled).",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Filtrar por nombre de cliente (opcional)" },
          status: { type: "string", description: "Estado efectivo o de base de datos" },
          limit: { type: "number", description: "Máximo de resultados (default 8)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_billing_summary",
      description: "Resumen de facturación y cobros en un periodo.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["last12", "this_month", "this_quarter"],
            description: "Periodo del resumen",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_invoices_due_soon",
      description:
        "Facturas con vencimiento próximo o ya vencidas con importe pendiente (próximos N días).",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Horizonte en días (default 7)" },
          limit: { type: "number", description: "Máximo de facturas" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_billing_periods",
      description:
        "Comparar facturación emitida entre este mes y el mes pasado (o mes pasado vs anterior).",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["month_over_month", "last_month_vs_prior"],
            description: "Tipo de comparación",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_payment_reminder",
      description:
        "Generar borrador de mensaje de recordatorio de cobro para un cliente con deuda. Requiere clientName.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nombre del cliente" },
        },
        required: ["clientName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_clients",
      description:
        "Listar clientes o contar cuántos hay. Para «cuántos clientes tengo» usar countOnly: true.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Texto a buscar en el nombre" },
          limit: { type: "number" },
          countOnly: {
            type: "boolean",
            description: "Si true, solo devuelve el total de clientes (sin listar nombres)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_filtered_view",
      description:
        "Abrir listado filtrado de facturas o de clientes en la aplicación.",
      parameters: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["invoices", "clients"],
            description: "Vista objetivo",
          },
          status: {
            type: "string",
            enum: ["overdue", "pending", "partial", "draft", "paid"],
            description: "Filtro de estado (solo facturas)",
          },
          search: { type: "string", description: "Búsqueda en nombre (clientes)" },
          kind: {
            type: "string",
            enum: ["company", "individual"],
            description: "Tipo de cliente",
          },
          client_id: { type: "string", description: "UUID de cliente (filtro facturas)" },
        },
        required: ["view"],
        additionalProperties: false,
      },
    },
  },
];
