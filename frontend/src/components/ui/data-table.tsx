import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
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
  defaultSort?: SortingState
  // When set, the search text, sort order, page size and current page are
  // remembered under this key and restored the next time the table is shown.
  stateKey?: string
}

// What a table remembers between visits when it is given a stateKey.
type SavedTableState = {
  globalFilter?: string
  sorting?: SortingState
  pageSizeChoice?: string
  pageIndex?: number
}

const storageKey = (stateKey: string) => `data-table:${stateKey}`

// sessionStorage: remembered while the tab is open (so coming back from an
// edit page restores the view) but not carried into the next session.
const loadSavedState = (stateKey?: string): SavedTableState => {
  if (!stateKey) return {}
  try {
    const raw = window.sessionStorage.getItem(storageKey(stateKey))
    return raw ? (JSON.parse(raw) as SavedTableState) : {}
  } catch {
    return {}
  }
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No results.',
  defaultSort = [],
  stateKey,
}: DataTableProps<TData>): React.ReactElement {
  // Read once, on mount.
  const [saved] = useState(() => loadSavedState(stateKey))
  const [globalFilter, setGlobalFilter] = useState(saved.globalFilter ?? '')
  const [sorting, setSorting] = useState<SortingState>(
    saved.sorting ?? defaultSort,
  )
  const [pageSizeChoice, setPageSizeChoice] = useState<PageSizeOption>(() => {
    const wanted = saved.pageSizeChoice ?? String(pageSize)
    return PAGE_SIZE_OPTIONS.includes(wanted as PageSizeOption)
      ? (wanted as PageSizeOption)
      : '10'
  })
  const [pageIndex, setPageIndex] = useState(saved.pageIndex ?? 0)

  const pagination = {
    pageIndex,
    pageSize: pageSizeChoice === 'all' ? ALL_PAGE_SIZE : Number(pageSizeChoice),
  }

  // Changing the search, the sort or the page size starts again from page
  // one, which also avoids landing on a now out-of-range page. These are done
  // in the handlers rather than by letting the table auto-reset, because an
  // auto-reset also fires when the data (re)loads and would throw away a
  // restored page.
  const changeFilter = (value: string) => {
    setGlobalFilter(value)
    setPageIndex(0)
  }

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: changeFilter,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPageIndex(0)
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setPageIndex(next.pageIndex)
    },
    autoResetPageIndex: false,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // If rows were removed since the page was remembered (or deleted from the
  // last page), fall back to the last page that still exists. Skipped while
  // the data is still loading, when there are no pages at all.
  const pageCount = table.getPageCount()
  useEffect(() => {
    if (pageCount > 0 && pageIndex >= pageCount) setPageIndex(pageCount - 1)
  }, [pageCount, pageIndex])

  useEffect(() => {
    if (!stateKey) return
    const state: SavedTableState = {
      globalFilter,
      sorting,
      pageSizeChoice,
      pageIndex,
    }
    try {
      window.sessionStorage.setItem(storageKey(stateKey), JSON.stringify(state))
    } catch {
      // Storage unavailable or full - the table just won't be remembered.
    }
  }, [stateKey, globalFilter, sorting, pageSizeChoice, pageIndex])

  const rows = table.getRowModel().rows
  const totalCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => changeFilter(e.target.value)}
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
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sortDirection = header.column.getIsSorted()
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                )
              })}
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
            onValueChange={(value) => {
              setPageSizeChoice(value as PageSizeOption)
              setPageIndex(0)
            }}
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
