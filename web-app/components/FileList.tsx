import React from 'react'
import { EyeIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export type FileItem = {
  id: string
  name: string
  size?: number
  starred?: boolean
  deleted?: boolean
}

export default function FileList({
  files,
  onPreview,
  onDelete,
  onRestore
}: {
  files: FileItem[]
  onPreview?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onRestore?: (file: FileItem) => void
}) {
  if (!files || files.length === 0) {
    return <p>No files yet.</p>
  }

  return (
    <div>
      <ul>
        {files.map((f) => (
          <li key={f.id} className="file-row">
            <div className="file-main">
              <strong>{f.name}</strong>
              {f.size ? <span className="file-meta">· {Math.round(f.size / 1024)} KB</span> : null}
              {f.starred ? <span className="file-meta">★</span> : null}
            </div>
            <div className="file-actions">
              <button type="button" onClick={() => onPreview && onPreview(f)} aria-label="Preview">
                <EyeIcon width={16} height={16} />
              </button>
              {!f.deleted ? (
                <button type="button" onClick={() => onDelete && onDelete(f)} aria-label="Delete">
                  <TrashIcon width={16} height={16} />
                </button>
              ) : (
                <button type="button" onClick={() => onRestore && onRestore(f)} aria-label="Restore">
                  <ArrowPathIcon width={16} height={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
