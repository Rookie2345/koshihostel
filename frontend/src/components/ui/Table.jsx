import React from 'react';

export default function Table({
  headers = [],
  children,
  className = '',
  empty = false,
  emptyMessage = 'No records found',
}) {
  return (
    <div className={`overflow-x-auto w-full ${className}`}>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-navy-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-navy-700/80">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className={`px-4 py-3.5 font-semibold ${
                  typeof header === 'object' && header.align === 'right'
                    ? 'text-right'
                    : typeof header === 'object' && header.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } ${typeof header === 'object' ? header.className || '' : ''}`}
              >
                {typeof header === 'object' ? header.label : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700/60">
          {children}
        </tbody>
      </table>

      {empty && (
        <div className="py-12 text-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export function TableRow({ children, className = '', onClick, hover = true }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors ${hover ? 'hover:bg-navy-700/40' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', align = 'left', colSpan }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td colSpan={colSpan} className={`px-4 py-3.5 whitespace-nowrap text-sm ${alignClass} ${className}`}>
      {children}
    </td>
  );
}
