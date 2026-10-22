import Dexie, { type EntityTable } from 'dexie'
import type { PO } from '../domain/types'

export class PoDb extends Dexie {
  pos!: EntityTable<PO, 'id'>
  constructor(name = 'posaathi') {
    super(name)
    // v1 schema. Add a new .version(n) with an upgrade() for future model changes.
    this.version(1).stores({
      pos: 'id, poNumber, platform, status, deliveryDate, expiryDate, updatedAt',
    })
  }
}

export const db = new PoDb()

export function newId(): string {
  return crypto.randomUUID()
}
