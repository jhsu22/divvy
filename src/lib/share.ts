export async function encodeShare(data: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const cs = new CompressionStream('deflate-raw')
  const writer = cs.writable.getWriter()
  writer.write(bytes)
  writer.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  const arr = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function decodeShare(encoded: string): Promise<unknown> {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(encoded.length / 4) * 4, '='
  )
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  writer.write(bytes)
  writer.close()
  return JSON.parse(await new Response(ds.readable).text())
}
