import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { join, normalize, extname } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'text/javascript'
}

/**
 * Serve the report over HTTP.
 *
 * The page is the primary delivery and it is full resolution, so it wants a
 * real server rather than a file:// open: lazy loading only works over HTTP,
 * and 16 MB of screenshots is exactly the case lazy loading is for.
 *
 * @param {object} args
 * @param {string} args.root - Directory to serve
 * @param {number} args.port
 * @returns {Promise<{url: string, close: () => void}>}
 */
export const serveReport = ({ root, port }) =>
  new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requested = decodeURIComponent(request.url.split('?')[0])
      const relative = normalize(requested).replace(/^(\.\.[/\\])+/, '')
      const path = join(root, relative === '/' ? 'index.html' : relative)
      let stat
      try {
        stat = statSync(path)
      } catch {
        response.writeHead(404, { 'content-type': 'text/plain' })
        response.end(`Not found: ${relative}`)
        return
      }
      if (stat.isDirectory()) {
        response.writeHead(404, { 'content-type': 'text/plain' })
        response.end('Not found')
        return
      }
      response.writeHead(200, {
        'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
        'content-length': stat.size,
        'cache-control': 'no-store'
      })
      createReadStream(path).pipe(response)
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => server.close()
      })
    )
  })
