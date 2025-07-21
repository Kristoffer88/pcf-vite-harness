// PCF Data Explorer - Adapted from TanStack Query DevTools Explorer.tsx
// Original: https://github.com/TanStack/query/blob/main/packages/query-devtools/src/Explorer.tsx

import type React from 'react'
import { useMemo, useState } from 'react'
import { tokens } from '../theme'
import { copyToClipboard, getDataType, isExpandable } from '../utils'

interface ExplorerProps {
  label: string
  value: any
  editable?: boolean
  onEdit?: (path: (string | number)[], value: any) => void
  onDelete?: (path: (string | number)[]) => void
  defaultExpanded?: boolean
  theme?: 'light' | 'dark'
  path?: (string | number)[]
}

const CHUNK_SIZE = 100

export const Explorer: React.FC<ExplorerProps> = ({
  label,
  value,
  editable = false,
  onEdit,
  onDelete,
  defaultExpanded = false,
  theme = 'light',
  path = [],
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [chunkedIndex, setChunkedIndex] = useState(0)

  const dataType = getDataType(value)
  const canExpand = isExpandable(value)
  const currentPath = [...path, label]

  // Calculate chunked entries for large arrays/objects
  const chunkedEntries = useMemo(() => {
    if (!canExpand) return []

    let entries: Array<[string | number, any]> = []

    if (Array.isArray(value)) {
      entries = value.map((item, index) => [index, item])
    } else if (value && typeof value === 'object') {
      entries = Object.entries(value)
    } else if (value instanceof Map) {
      entries = Array.from(value.entries())
    } else if (value instanceof Set) {
      entries = Array.from(value.values()).map((item, index) => [index, item])
    }

    // Chunk large datasets
    const chunks = []
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      chunks.push(entries.slice(i, i + CHUNK_SIZE))
    }

    return chunks
  }, [value, canExpand])

  const handleEdit = () => {
    if (editing) {
      try {
        let parsedValue: any
        if (dataType === 'string') {
          parsedValue = editValue
        } else if (dataType === 'number') {
          parsedValue = Number(editValue)
        } else if (dataType === 'boolean') {
          parsedValue = editValue === 'true'
        } else {
          parsedValue = JSON.parse(editValue)
        }

        onEdit?.(currentPath, parsedValue)
        setEditing(false)
      } catch (err) {
        console.error('Failed to parse edit value:', err)
      }
    } else {
      setEditValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
      setEditing(true)
    }
  }

  const handleCopy = () => {
    const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    copyToClipboard(textToCopy)
  }

  const handleDelete = () => {
    onDelete?.(currentPath)
  }

  const styles = {
    container: {
      fontFamily: tokens.font.family.mono,
      fontSize: tokens.font.size['3'],
      lineHeight: tokens.font.lineHeight['3'],
      color: theme === 'dark' ? tokens.colors.neutral['100'] : tokens.colors.neutral['800'],
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.size['2'],
      padding: `${tokens.size['1']} 0`,
      borderBottom: `1px solid ${
        theme === 'dark' ? tokens.colors.neutral['800'] : tokens.colors.neutral['200']
      }`,
    },
    label: {
      fontWeight: tokens.font.weight['2'],
      color: theme === 'dark' ? tokens.colors.blue['400'] : tokens.colors.blue['600'],
    },
    expandButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: tokens.font.size['3'],
      color: theme === 'dark' ? tokens.colors.neutral['400'] : tokens.colors.neutral['600'],
      width: '16px',
      textAlign: 'left' as const,
    },
    value: {
      flex: 1,
      fontFamily: tokens.font.family.mono,
    },
    actions: {
      display: 'flex',
      gap: tokens.size['1'],
    },
    actionButton: {
      background: 'none',
      border: `1px solid ${
        theme === 'dark' ? tokens.colors.neutral['700'] : tokens.colors.neutral['300']
      }`,
      borderRadius: tokens.border.radius['2'],
      padding: `${tokens.size['1']} ${tokens.size['2']}`,
      fontSize: tokens.font.size['2'],
      cursor: 'pointer',
      color: theme === 'dark' ? tokens.colors.neutral['300'] : tokens.colors.neutral['700'],
    },
    editInput: {
      flex: 1,
      padding: tokens.size['2'],
      border: `1px solid ${
        theme === 'dark' ? tokens.colors.neutral['600'] : tokens.colors.neutral['300']
      }`,
      borderRadius: tokens.border.radius['2'],
      backgroundColor: theme === 'dark' ? tokens.colors.neutral['800'] : tokens.colors.neutral['0'],
      color: theme === 'dark' ? tokens.colors.neutral['100'] : tokens.colors.neutral['900'],
      fontFamily: tokens.font.family.mono,
      fontSize: tokens.font.size['3'],
    },
    nested: {
      marginLeft: tokens.size['4'],
      borderLeft: `1px solid ${
        theme === 'dark' ? tokens.colors.neutral['700'] : tokens.colors.neutral['300']
      }`,
      paddingLeft: tokens.size['3'],
    },
    typeLabel: {
      fontSize: tokens.font.size['2'],
      color: theme === 'dark' ? tokens.colors.neutral['500'] : tokens.colors.neutral['500'],
      fontStyle: 'italic',
    },
  }

  const renderValue = () => {
    if (editing) {
      return (
        <textarea
          style={styles.editInput}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          rows={typeof value === 'string' ? 1 : 3}
        />
      )
    }

    if (value === null) return <span style={styles.typeLabel}>null</span>
    if (value === undefined) return <span style={styles.typeLabel}>undefined</span>

    if (typeof value === 'string') {
      return <span>"{value}"</span>
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return (
        <span
          style={{
            color: theme === 'dark' ? tokens.colors.green['400'] : tokens.colors.green['600'],
          }}
        >
          {String(value)}
        </span>
      )
    }

    if (canExpand) {
      const count = Array.isArray(value)
        ? value.length
        : value instanceof Map
          ? value.size
          : value instanceof Set
            ? value.size
            : Object.keys(value).length

      return (
        <span style={styles.typeLabel}>
          {dataType} ({count} {count === 1 ? 'item' : 'items'})
        </span>
      )
    }

    return <span>{String(value)}</span>
  }

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <button
          style={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
          disabled={!canExpand}
        >
          {canExpand ? (expanded ? '▼' : '▶') : ' '}
        </button>

        <span style={styles.label}>{label}:</span>

        <div style={styles.value}>{renderValue()}</div>

        {editable && (
          <div style={styles.actions}>
            {editing ? (
              <>
                <button style={styles.actionButton} onClick={handleEdit}>
                  Save
                </button>
                <button style={styles.actionButton} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button style={styles.actionButton} onClick={handleCopy}>
                  Copy
                </button>
                <button style={styles.actionButton} onClick={handleEdit}>
                  Edit
                </button>
                {onDelete && (
                  <button style={styles.actionButton} onClick={handleDelete}>
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {expanded && canExpand && (
        <div style={styles.nested}>
          {chunkedEntries.map((chunk, chunkIndex) => (
            <div key={chunkIndex}>
              {chunkIndex === chunkedIndex &&
                chunk.map(([key, val]) => (
                  <Explorer
                    key={String(key)}
                    label={String(key)}
                    value={val}
                    editable={editable}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    theme={theme}
                    path={currentPath}
                  />
                ))}
            </div>
          ))}

          {chunkedEntries.length > 1 && (
            <div style={styles.row}>
              <span style={styles.typeLabel}>
                Showing chunk {chunkedIndex + 1} of {chunkedEntries.length}
              </span>
              <div style={styles.actions}>
                <button
                  style={styles.actionButton}
                  onClick={() => setChunkedIndex(Math.max(0, chunkedIndex - 1))}
                  disabled={chunkedIndex === 0}
                >
                  Previous
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() =>
                    setChunkedIndex(Math.min(chunkedEntries.length - 1, chunkedIndex + 1))
                  }
                  disabled={chunkedIndex === chunkedEntries.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
