import * as fs from 'fs/promises'
import * as path from 'node:path'
import { parseFragment } from 'parse5'
import * as htmlparser2Adapter from 'parse5-htmlparser2-tree-adapter'

export interface HtmlSection {
  url: string
  href: string
  anchor?: string
  title?: string
  text: string
}

export async function readHtmlFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, 'utf8')
}
export async function getHtmlFiles(dirPath: string): Promise<string[]> {
  let dirs = [dirPath]
  let htmlFiles = []
  while (dirs.length > 0) {
    const newDirs = []
    await Promise.all(
      dirs.map(async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name)
          if (entry.isDirectory()) {
            newDirs.push(res)
          } else if (path.extname(entry.name) === '.html') {
            htmlFiles.push(res)
          }
        }
      }),
    )
    dirs = newDirs
  }
  return htmlFiles
}

export function removeWhitespaceOnlyLines(input: string): string {
  return input.replace(/^\s*[\r\n]/gm, '')
}

export const DEFAULT_IGNORED_TAGS = [
  'script',
  'style',
  'aside',
  'footer',
  'header',
  'nav',
  'select',
  'input',
  'textarea',
  'button',
  'label',
  'option',
]
export function parseHtml(html: string, url: string, ignoreTags: Array<string>): HtmlSection[] {
  const ignoreTagsSet = new Set(ignoreTags)
  const document = parseFragment(html, { treeAdapter: htmlparser2Adapter.adapter })
  let currentAnchor = ''
  let currentTitle = ''
  let currentText = ''
  let sections: Array<HtmlSection> = []
  let waitingForTitle = false

  function traverse(node: any, processChildren: boolean) {
    const tagName = node.tagName
    const attribs = node.attribs

    if (ignoreTagsSet.has(tagName)) {
      return
    }

    if (attribs && attribs['data-pagefind-body'] !== undefined) {
      processChildren = true
    }

    if (attribs && attribs['data-pagefind-ignore'] !== undefined) {
      processChildren = false
    }

    if (tagName === 'title') {
      currentTitle = (node.children[0] && node.children[0].data).trim()
      return
    }

    // link points to an anchor in the same document
    const selfReferencingAnchor = attribs && attribs.href && attribs.href.startsWith('#')

    if (processChildren && !selfReferencingAnchor) {
      let isCurrentAnchor = false
      if (tagName === 'a' && !selfReferencingAnchor) {
        const name = attribs && attribs.name

        if (name) {
          if (currentText.trim() !== '') {
            sections.push({
              href: `${url}${`${currentAnchor ? '#' : ''}`}${currentAnchor}`,
              url: url,
              anchor: currentAnchor,
              title: currentTitle,
              text: currentText.trim(),
            })
            currentText = ''
          }
          currentAnchor = name
          currentTitle = ''
          waitingForTitle = true
          isCurrentAnchor = true
        }
      }

      if (waitingForTitle && tagName && tagName.startsWith('h')) {
        const textData = node.children && node.children[0] && node.children[0].data
        if (textData) {
          currentTitle += removeWhitespaceOnlyLines(' ' + textData).trim()
          waitingForTitle = false
        }
      }

      if (!isCurrentAnchor) {
        const textData = node.children && node.children[0] && node.children[0].data
        if (textData) {
          currentText += removeWhitespaceOnlyLines(' ' + textData)
        }
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, processChildren)
      }
    }
  }

  traverse(document, true)

  if (currentText.trim() !== '') {
    sections.push({
      href: `${url}${`${currentAnchor ? '#' : ''}`}${currentAnchor}`,
      url: url,
      anchor: currentAnchor,
      title: currentTitle.trim(),
      text: currentText.trim(),
    })
  }
  return sections
}

export async function extract(directory: string, ignoreTags = DEFAULT_IGNORED_TAGS): Promise<HtmlSection[]> {
  const htmlFiles = await getHtmlFiles(directory)

  const promises = htmlFiles.map(async (htmlFile) => {
    const html = await readHtmlFile(htmlFile)
    const url = path.relative(directory, htmlFile)
    return parseHtml(html, url, ignoreTags)
  })

  const sectionsArray = await Promise.all(promises)

  // Flatten the array
  const allSections = sectionsArray.flat()

  return allSections
}
