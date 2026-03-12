import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sheetId } = await req.json();

    const apiKey = Deno.env.get('SMARTSHEET_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SMARTSHEET_API_KEY not configured. Add it to Supabase Edge Function secrets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetSheetId = sheetId || '5750175070900100';

    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${targetSheetId}?include=columnType`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Smartsheet API error ${response.status}: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetData = await response.json();

    // Build column index map: columnId -> title
    const columnMap: Record<number, string> = {};
    for (const col of sheetData.columns || []) {
      columnMap[col.id] = col.title;
    }

    // Return ALL columns for every row — each sheet defines its own columns
    const rows = (sheetData.rows || []).map((row: any) => {
      const obj: Record<string, any> = {};
      for (const cell of row.cells || []) {
        const colName = columnMap[cell.columnId];
        if (colName) {
          // Prefer raw numeric value so calculations work (displayValue is formatted, e.g. "$480,000" or "80%")
          obj[colName] = (typeof cell.value === "number") ? cell.value : (cell.displayValue ?? cell.value ?? null);
        }
      }
      if (row.modifiedAt) obj['Modified'] = row.modifiedAt;
      return obj;
    }).filter((row: Record<string, any>) => {
      // Filter out rows with no meaningful content
      // Support both column name conventions used across sheets
      const client = row['Client'] || row['CLIENT'] || '';
      return String(client).trim() !== '';
    });

    return new Response(
      JSON.stringify({ rows, total: rows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unexpected error in smartsheet-proxy' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
