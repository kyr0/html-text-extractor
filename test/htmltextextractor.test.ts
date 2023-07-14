import path from 'path'
import {
  removeWhitespaceOnlyLines,
  DEFAULT_IGNORED_TAGS,
  HtmlSection,
  extract,
  getHtmlFiles,
  parseHtml,
  readHtmlFile,
} from '../dist/index.esm'
import mockFs from 'mock-fs'

describe('HTML Parser', () => {
  test('readHtmlFile throws error', async () => {
    await expect(readHtmlFile('somepath')).rejects.toThrow("ENOENT: no such file or directory, open 'somepath'")
  })
})

describe('extract', () => {
  it('should extract sections from html files in directory', async () => {
    const sections = await extract('./test/dist')
    expect(sections.length).toBe(70)
  })
})

describe('HTML Parser', () => {
  beforeEach(() => {
    mockFs({
      dir: {
        'file1.html': '<head><title>Title 1</title></head><h1>Title 1</h1>',
        // malformed test
        'file2.html': '<head><title>Title 2</title><h1>Title 2</h1>',
        nested: {
          // malformed test 2
          'file3.html': '<head><title>Title 3</title><head<h1>Title 3</h1>',
        },
      },
    })
  })

  afterEach(() => {
    mockFs.restore()
  })

  test('readHtmlFile', async () => {
    const content = await readHtmlFile('dir/file1.html')
    expect(content).toBe('<head><title>Title 1</title></head><h1>Title 1</h1>')
  })

  test('getHtmlFiles', () => {
    const files = getHtmlFiles('dir')
    expect(files).toEqual(['dir/file1.html', 'dir/file2.html', 'dir/nested/file3.html'])
  })

  test('removeWhitespaceOnlyLines', () => {
    const input = 'Line 1\n\nLine 2\n    \nLine 3'
    const expected = 'Line 1\nLine 2\nLine 3'
    expect(removeWhitespaceOnlyLines(input)).toBe(expected)
  })

  test('parseHtml with anchors', () => {
    const html =
      '<head><title>Foo</title></head><p>Irrelevant text</p><a name="anchor">Some link</a><h1>Title</h1><p>Some text</p><a name="anchor2">Some link 2</a>'
    const url = 'url'
    const ignoreTags = DEFAULT_IGNORED_TAGS
    const parseResult = parseHtml(html, url, ignoreTags)
    const expected: HtmlSection[] = [
      { url: 'url', anchor: '', title: 'Foo', text: 'Irrelevant text' },
      {
        url: 'url',
        anchor: '#anchor',
        title: 'Title',
        text: 'Title Some text',
      },
    ]
    expect(parseResult).toEqual(expected)
  })

  test('extract', async () => {
    const directory = 'dir'
    const ignoreTags = DEFAULT_IGNORED_TAGS
    const expected: HtmlSection[] = [
      { url: 'file1.html', anchor: '', title: 'Title 1', text: 'Title 1' },
      { url: 'file2.html', anchor: '', title: 'Title 2', text: 'Title 2' },
      { url: path.join('nested', 'file3.html'), anchor: '', title: 'Title 3', text: 'Title 3' },
    ]
    const result = await extract(directory, ignoreTags)
    expect(result).toEqual(expected)
  })
})
