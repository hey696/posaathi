import { db } from '../db/db'
import type { PO } from '../domain/types'

export interface BackupFile {
  app: 'posaathi'
  version: 1
  exportedAt: string
  pos: PO[]
}

export async function buildBackup(now = new Date()): Promise<BackupFile> {
  return { app: 'posaathi', version: 1, exportedAt: now.toISOString(), pos: await db.pos.toArray() }
}

export function validateBackup(data: unknown): BackupFile {
  const d = data as Partial<BackupFile> | null
  if (!d || d.app !== 'posaathi' || d.version !== 1 || !Array.isArray(d.pos)) {
    throw new Error('Not a PoSaathi v1 backup file')
  }
  for (const p of d.pos) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      typeof p.poNumber !== 'string' ||
      !Array.isArray(p.lines)
    ) {
      throw new Error('Backup contains a malformed PO')
    }
  }
  return d as BackupFile
}

/** Replaces all local data with the backup's POs. */
export async function restoreBackup(data: unknown): Promise<number> {
  const b = validateBackup(data)
  await db.transaction('rw', db.pos, async () => {
    await db.pos.clear()
    await db.pos.bulkPut(b.pos)
  })
  return b.pos.length
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
