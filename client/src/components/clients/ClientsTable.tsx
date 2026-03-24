import { Box } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel, type GridValidRowModel } from "@mui/x-data-grid";

export type ClientsTableProps<R extends GridValidRowModel & { id: number }> = {
  rows: R[];
  columns: GridColDef<R>[];
  rowCount: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  pageSizeOptions?: number[];
};

/**
 * Tabela klientów (MUI Data Grid) z paginacją po stronie serwera —
 * `page` / `pageSize` muszą być zsynchronizowane z API (`paginationMode="server"`).
 */
export function ClientsTable<R extends GridValidRowModel & { id: number }>({
  rows,
  columns,
  rowCount,
  loading,
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions = [10, 25, 50, 100],
}: ClientsTableProps<R>) {
  return (
    <Box sx={{ width: "100%", height: 560 }}>
      <DataGrid<R>
        rows={rows}
        columns={columns}
        loading={loading}
        rowCount={rowCount}
        pageSizeOptions={pageSizeOptions}
        paginationModel={paginationModel}
        paginationMode="server"
        onPaginationModelChange={onPaginationModelChange}
        disableRowSelectionOnClick
        getRowId={(r) => r.id}
      />
    </Box>
  );
}
