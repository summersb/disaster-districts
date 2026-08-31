import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PAGE_SIZE_OPTIONS = ['5', '10', '25', 'all'] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

// Large enough that any realistic table fits on a single "page".
const ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No results.',
}: DataTableProps<TData>): React.ReactElement {
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSizeChoice, setPageSizeChoice] = useState<PageSizeOption>(
    PAGE_SIZE_OPTIONS.includes(String(pageSize) as PageSizeOption)
      ? (String(pageSize) as PageSizeOption)
      : '10',
  )

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  useEffect(() => {
    table.setPageSize(
      pageSizeChoice === 'all' ? ALL_PAGE_SIZE : Number(pageSizeChoice),
    )
  }, [pageSizeChoice, table])

  // Jumping back to page one when the search narrows the results avoids
  // landing on a now out-of-range page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: globalFilter is a deliberate trigger, not read in the body
  useEffect(() => {
    table.setPageIndex(0)
  }, [globalFilter, table])

  const rows = table.getRowModel().rows
  const totalCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'result' : 'results'}
        </p>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center italic text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={pageSizeChoice}
            onValueChange={(value) =>
              setPageSizeChoice(value as PageSizeOption)
            }
          >
            <SelectTrigger className="w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
