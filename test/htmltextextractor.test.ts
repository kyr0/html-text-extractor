import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { extract } from '../dist/index.esm'

describe('extract', () => {
  it('should extract sections from html files in directory', async () => {
    const sections = await extract('./test/dist')
    expect(sections.length).toBe(69)
  })
})
