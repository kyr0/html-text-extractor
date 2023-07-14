import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseFragment } from 'parse5'
import * as htmlparser2Adapter from 'parse5-htmlparser2-tree-adapter'

export interface HtmlSection {
  url: string
  anchor?: string
  title?: string
  text: string
}

export function readHtmlFile(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export function getHtmlFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getHtmlFiles(path.join(dirPath, file), arrayOfFiles)
    } else {
      if (path.extname(file) === '.html') {
        arrayOfFiles.push(path.join(dirPath, file))
      }
    }
  })

  return arrayOfFiles
}

export function removeWhitespaceOnlyLines(input: string): string {
  const lines = input.split('\n')
  const filteredLines = lines.filter((line) => line.trim() !== '')
  return filteredLines.join('\n')
}

let processChildren = false

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
  const document = parseFragment(html, { treeAdapter: htmlparser2Adapter.adapter })
  let currentAnchor = ''
  let currentTitle = ''
  let currentText = ''
  let sections: Array<HtmlSection> = []
  let waitingForTitle = false

  function traverse(node: any) {
    const tagName = node.tagName

    if (ignoreTags.includes(tagName)) {
      return
    }

    if (node.attribs && node.attribs['data-pagefind-body'] !== undefined) {
      processChildren = true
    }

    if (node.attribs && node.attribs['data-pagefind-ignore'] !== undefined) {
      processChildren = false
    }

    if (tagName === 'title') {
      currentTitle = (node.children[0] && node.children[0].data).trim()
      return
    }

    // link points to an anchor in the same document
    const selfReferencingAnchor = node.attribs && node.attribs.href && node.attribs.href.startsWith('#')

    if (processChildren && !selfReferencingAnchor) {
      let isCurrentAnchor = false
      if (tagName === 'a' && !selfReferencingAnchor) {
        const name = node.attribs && node.attribs.name

        if (name) {
          if (currentText.trim() !== '') {
            sections.push({
              url: url,
              anchor: currentAnchor,
              title: currentTitle,
              text: currentText.trim(),
            })
          }
          currentAnchor = '#' + name
          currentTitle = ''
          currentText = ''
          waitingForTitle = true
          isCurrentAnchor = true
        }
      }

      if (waitingForTitle && tagName && tagName.startsWith('h')) {
        currentTitle += removeWhitespaceOnlyLines(
          ' ' + (node.children && node.children[0] && node.children[0].data ? node.children[0].data : ''),
        ).trim()
        waitingForTitle = false
      }

      if (!isCurrentAnchor) {
        currentText += removeWhitespaceOnlyLines(
          ' ' + (node.children && node.children[0] && node.children[0].data ? node.children[0].data : ''),
        )
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(document)

  if (currentText.trim() !== '') {
    sections.push({
      url: url,
      anchor: currentAnchor,
      title: currentTitle.trim(),
      text: currentText.trim(),
    })
  }

  return sections
}

export async function extract(directory: string, ignoreTags = DEFAULT_IGNORED_TAGS): Promise<HtmlSection[]> {
  const htmlFiles = getHtmlFiles(directory)
  let allSections: Array<HtmlSection> = []

  for (const htmlFile of htmlFiles) {
    const html = await readHtmlFile(htmlFile)
    const url = path.relative(directory, htmlFile)
    const sections = parseHtml(html, url, ignoreTags)
    allSections = [...allSections, ...sections]
  }
  return allSections
}
