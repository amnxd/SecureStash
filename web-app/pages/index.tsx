import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import FileList, { FileItem } from '../components/FileList'
import { supabase } from '../lib/supabaseClient'
import useSWR from 'swr'
import { db } from '../lib/firebaseClient'
import { parseCursorToken } from '../lib/cursor'
import { collection, getDocs, getDoc, query, where, doc, updateDoc, orderBy as fbOrderBy, limit as fbLimit, startAfter as fbStartAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

// parseCursorToken moved to lib/cursor.ts

// Home: shows files with simple sorting, pagination and actions wired to DB/storage
export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  // sync page and sort with URL query params
  const qparams = router.query
  const initialPage = typeof qparams.page === 'string' ? Math.max(0, parseInt(qparams.page, 10) - 1 || 0) : 0
  const initialSortBy = typeof qparams.sortBy === 'string' ? (qparams.sortBy as 'name' | 'created_at') : 'created_at'
  const initialCursor = typeof qparams.cursor === 'string' ? decodeURIComponent(qparams.cursor) : undefined

  const [page, setPage] = useState(initialPage)
  const [perPage] = useState(10)
  const [sortBy, setSortBy] = useState<'name'|'created_at'>(initialSortBy)
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  // For Supabase we keep server-side paging via SWR; for Firestore we implement cursor pagination below
  const key = user && !db ? ['files', user.uid, page, perPage, sortBy, sortDir] : null

  const { data, error, mutate } = useSWR(key, async () => {
    if (!user) return { rows: [], count: 0 }
    // Supabase: do server-side ordering and range for pagination
    const orderDir = sortDir === 'asc'
    const offset = page * perPage
    const { data: sData, count, error: sError } = await supabase
      .from('files')
      .select('id,name,starred,owner_id,created_at,size,deleted', { count: 'exact' })
      .eq('owner_id', user.uid)
      .order(sortBy, { ascending: orderDir })
      .range(offset, offset + perPage - 1)
    if (sError) throw sError
    return { rows: sData || [], count: count || 0 }
  })

  // Firestore cursor pagination state
  const [fbRows, setFbRows] = useState<FileItem[]>([])
  const [_fbLoading, setFbLoading] = useState(false)
  const [fbHasMore, setFbHasMore] = useState(false)
  const [cursors, setCursors] = useState<QueryDocumentSnapshot<DocumentData>[]>([])
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(initialCursor)

  // Map sortBy to Firestore field names if needed
  const fbSortBy = sortBy === 'created_at' ? 'createdAt' : sortBy

  useEffect(() => {
    // only run Firestore flow when db is available
    if (!db || !user) return
    let cancelled = false
    const uid = user!.uid

    async function fetchPage() {
      setFbLoading(true)
      try {
  const col = collection(db as any, 'files')
        let q
        // build query: owner filter + orderBy + limit, optionally startAfter
          if (currentCursor) {
            // parse composite cursor token: base64url encoded JSON {v: sortFieldValue, id: docId}
            let parsedToken: any = parseCursorToken(currentCursor)

            // If token contains id, fetch the document snapshot to use with startAfter for deterministic paging
            let startAfterArg: any = parsedToken
            if (parsedToken && parsedToken.id) {
              try {
                const docRef = doc(db as any, 'files', parsedToken.id)
                const snap = await getDoc(docRef)
                if (snap.exists()) startAfterArg = snap
              } catch (e) {
                // ignore and fall back to the value
                startAfterArg = parsedToken.v || parsedToken
              }
            } else if (fbSortBy === 'createdAt' && parsedToken && parsedToken.v) {
              startAfterArg = new Date(parsedToken.v)
            }

            q = query(col, where('owner_id', '==', uid), fbOrderBy(fbSortBy, sortDir === 'asc' ? 'asc' : 'desc'), fbStartAfter(startAfterArg), fbLimit(perPage))
          } else if (page === 0) {
            q = query(col, where('owner_id', '==', uid), fbOrderBy(fbSortBy, sortDir === 'asc' ? 'asc' : 'desc'), fbLimit(perPage))
          } else {
            const prevCursor = cursors[page - 1]
            if (!prevCursor) {
              // If cursor for previous page missing, reset to first page
              setPage(0)
              setFbLoading(false)
              return
            }
            q = query(col, where('owner_id', '==', uid), fbOrderBy(fbSortBy, sortDir === 'asc' ? 'asc' : 'desc'), fbStartAfter(prevCursor), fbLimit(perPage))
        }
        const snap = await getDocs(q)
        if (cancelled) return
        const docs: any[] = []
        snap.forEach((d) => docs.push({ id: d.id, ...d.data() }))
        setFbRows(docs)
        setFbHasMore(snap.docs.length === perPage)
        // set cursor for this page to last doc
        const last = snap.docs[snap.docs.length - 1]
        if (last) {
          setCursors((cur) => {
            const next = cur.slice(0, page)
            next[page] = last
            return next
          })
            // set a URL-safe cursor token based on the sort field value
            try {
              const lastData: any = last.data()
              let token = lastData[fbSortBy]
              if (token instanceof Date) token = token.toISOString()
              if (token && typeof token !== 'string') token = String(token)
              if (token) setCurrentCursor(encodeURIComponent(String(token)))
            } catch (e) {
              // ignore
            }
        }
      } catch (e) {
        console.error('Firestore page fetch error', e)
      } finally {
        setFbLoading(false)
      }
    }

    fetchPage()
    return () => { cancelled = true }
  }, [user, page, perPage, fbSortBy, sortDir, cursors, currentCursor])

  // push query params when page/sort change to make links shareable
  useEffect(() => {
    const p: any = {}
    p.page = page + 1
    p.sortBy = sortBy
    p.sortDir = sortDir
    if (currentCursor) p.cursor = currentCursor
    router.replace({ pathname: router.pathname, query: p }, undefined, { shallow: true })
  }, [page, sortBy, sortDir, currentCursor, router])

  // Choose which rows to render is computed after we read Supabase rows/count below

  const renderError = () => {
    if (!error) return null
    const errObj: any = error
    const status = errObj?.status || errObj?.statusCode || null
    const message = errObj?.message || errObj?.msg || JSON.stringify(errObj)
    return (
      <div className="error">
        <p>Error loading files: {message}</p>
        {status === 404 && (
          <p>Hint: the `files` table or REST endpoint was not found in Supabase. Confirm your database has a `files` table and Row Level Security (RLS) and permissions are configured.</p>
        )}
        <details>
          <summary>Full error (click to expand)</summary>
          <pre>{JSON.stringify(errObj, null, 2)}</pre>
        </details>
      </div>
    )
  }

  // Handlers: preview, delete (soft), restore
  async function handlePreview(file: FileItem) {
    // attempt to create a signed URL via Supabase; fall back to public URL
    try {
      const path = (file as any).path || file.name
      const signed = await supabase.storage.from('uploads').createSignedUrl(path, 60 * 60)
      const url = (signed?.data as any)?.signedURL || supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl
      if (url && typeof window !== 'undefined') window.open(url, '_blank')
    } catch (e) {
      console.error('Preview failed', e)
    }
  }

  async function handleDelete(file: FileItem) {
    if (!user) return
    // Firestore
    if (db) {
      const dref = doc(db, 'files', file.id)
      await updateDoc(dref, { deleted: true })
      mutate()
      return
    }
    // Supabase
    const { error: uErr } = await supabase.from('files').update({ deleted: true }).eq('id', file.id)
    if (uErr) console.error('Delete error', uErr)
    mutate()
  }

  async function handleRestore(file: FileItem) {
    if (!user) return
    if (db) {
      const dref = doc(db, 'files', file.id)
      await updateDoc(dref, { deleted: false })
      mutate()
      return
    }
    const { error: uErr } = await supabase.from('files').update({ deleted: false }).eq('id', file.id)
    if (uErr) console.error('Restore error', uErr)
    mutate()
  }

  const rows = (data && (data as any).rows) || []
  const count = (data && (data as any).count) || 0

  const totalPages = Math.max(1, Math.ceil(count / perPage))

  const isFirestore = !!db
  const displayRows = isFirestore ? fbRows : rows
  const canPrev = page > 0
  const canNext = isFirestore ? fbHasMore : (page + 1 < totalPages)

  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Home</h1>
        <div className="card">
          {renderError()}

          <div className="file-controls">
            <label>
              Sort by:{' '}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="created_at">Date</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label>
              Direction:{' '}
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
            <div className="file-controls-right">
              <a href="/uploads" className="cta-button">Upload</a>
            </div>
          </div>

          {data === undefined && !isFirestore ? (
            <div className="card">
              <div className="spinner" aria-hidden="true" />
            </div>
          ) : (displayRows.length === 0 ? (
            <div className="empty-cta">
              <p>No files yet.</p>
              <a href="/uploads" className="cta-button">Upload</a>
            </div>
          ) : (
            <>
              <FileList files={displayRows.map((d: any) => ({ id: d.id, name: d.name, starred: d.starred, size: d.size, deleted: d.deleted }))} onPreview={handlePreview} onDelete={handleDelete} onRestore={handleRestore} />
              <div className="pagination-controls">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!canPrev}>Prev</button>
                <span>Page {page + 1}{isFirestore ? '' : ` / ${totalPages}`}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={!canNext}>Next</button>
              </div>
            </>
          ))}
        </div>
      </main>
    </div>
  )
}
