import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'node:path'

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

export function parseHtml(html: string, url: string): HtmlSection[] {
  const $ = cheerio.load(html)
  let currentAnchor = ''
  let currentTitle = ''
  let currentText = ''
  let sections: HtmlSection[] = []
  let waitingForTitle = false

  $('title').each(function () {
    currentTitle = $(this).text()
  })

  $('body')
    .find('*[data-pagefind-body] *, *[data-clientsearch-body] *')
    .each(function () {
      const tagName = this.tagName

      if (['script', 'style', 'aside', 'footer', 'header'].indexOf(tagName) >= 0) {
        return
      }

      if (tagName === 'a') {
        const name = $(this).attr('name')
        if (name) {
          // Flush current section and prepare for next
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
        }
      }

      if (waitingForTitle && tagName.startsWith('h')) {
        currentTitle += ' ' + $(this).text()
        waitingForTitle = false
      }

      currentText += ' ' + $(this).text()
    })

  // Flush last section
  if (currentText.trim() !== '') {
    sections.push({
      url: url,
      anchor: currentAnchor,
      title: currentTitle,
      text: currentText.trim(),
    })
  }

  return sections
}

export async function extract(directory: string): Promise<HtmlSection[]> {
  const htmlFiles = getHtmlFiles(directory)
  let allSections: HtmlSection[] = []

  for (const htmlFile of htmlFiles) {
    const html = await readHtmlFile(htmlFile)
    const url = path.relative(directory, htmlFile)
    const sections = parseHtml(html, url)
    allSections = [...allSections, ...sections]
  }

  return allSections
}
