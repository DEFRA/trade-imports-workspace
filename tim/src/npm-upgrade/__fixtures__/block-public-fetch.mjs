const localHosts = ['127.0.0.1', 'localhost']
const realFetch = globalThis.fetch

globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url)
  if (localHosts.includes(url.hostname)) return realFetch(input, init)
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}
