/** Definiciones OpenAI function calling (sin datos de negocio). */

export const ASSISTANT_OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_top_debtors",
      description:
        "Clientes con más importe pendiente de cobro (facturas emitidas no pagadas o parciales).",
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
      name: "list_clients",
      description: "Listar clientes, opcionalmente filtrando por texto en el nombre.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Texto a buscar en el nombre" },
          limit: { type: "number" },
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
        "Abrir una vista de facturas directamente filtrada (vencidas, pendientes, parciales, borradores, pagadas).",
      parameters: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["invoices"],
            description: "Vista objetivo",
          },
          status: {
            type: "string",
            enum: ["overdue", "pending", "partial", "draft", "paid"],
            description: "Filtro de estado",
          },
        },
        required: ["view"],
        additionalProperties: false,
      },
    },
  },
];
