import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

class ImapSocketClient {
  private conn: Deno.TlsConn | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private buffer = ''
  private decoder = new TextDecoder('utf-8')
  private encoder = new TextEncoder()
  private tagCounter = 0

  async connect(hostname: string, port: number, timeoutMs = 15000): Promise<void> {
    const connectPromise = Deno.connectTls({ hostname, port })
    this.conn = await this.withTimeout(connectPromise, timeoutMs, 'Connection timeout')
    this.reader = this.conn.readable.getReader()
    this.writer = this.conn.writable.getWriter()
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    let timer: number | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMsg)), ms)
    })
    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  async readGreeting(timeoutMs = 10000): Promise<string> {
    return await this.withTimeout(
      this.readUntilTaggedOrGreeting(),
      timeoutMs,
      'Timeout waiting for greeting',
    )
  }

  async sendCommand(
    command: string,
    timeoutMs = 10000,
  ): Promise<{ tag: string; response: string; isOk: boolean }> {
    this.tagCounter += 1
    const tag = `A${String(this.tagCounter).padStart(4, '0')}`
    const rawCommand = `${tag} ${command}\r\n`

    if (!this.writer) throw new Error('Not connected')
    await this.writer.write(this.encoder.encode(rawCommand))

    const response = await this.withTimeout(
      this.readUntilTagged(tag),
      timeoutMs,
      `Timeout waiting for response to ${tag}`,
    )

    const isOk = response.includes(`${tag} OK`)
    return { tag, response, isOk }
  }

  private async readUntilGreeting(): Promise<string> {
    while (true) {
      if (this.buffer.includes('\r\n') || this.buffer.includes('\n')) {
        const line = this.buffer
        this.buffer = ''
        return line
      }
      if (!this.reader) throw new Error('Reader not initialized')
      const { value, done } = await this.reader.read()
      if (done) throw new Error('Connection closed by remote host')
      if (value) {
        this.buffer += this.decoder.decode(value, { stream: true })
      }
    }
  }

  private async readUntilTaggedOrGreeting(): Promise<string> {
    return await this.readUntilGreeting()
  }

  private async readUntilTagged(tag: string): Promise<string> {
    while (true) {
      const matchIndex = this.buffer.search(new RegExp(`(^|\\r\\n|\\n)${tag} (OK|NO|BAD)`, 'm'))
      if (matchIndex !== -1) {
        const endLineIndex = this.buffer.indexOf('\n', matchIndex)
        if (endLineIndex !== -1) {
          const result = this.buffer.substring(0, endLineIndex + 1)
          this.buffer = this.buffer.substring(endLineIndex + 1)
          return result
        }
      }

      if (!this.reader) throw new Error('Reader not initialized')
      const { value, done } = await this.reader.read()
      if (done) {
        const remaining = this.buffer
        this.buffer = ''
        return remaining
      }
      if (value) {
        this.buffer += this.decoder.decode(value, { stream: true })
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.reader) {
        this.reader.releaseLock()
        this.reader = null
      }
    } catch {
      // Ignore reader release error
    }

    try {
      if (this.writer) {
        this.writer.releaseLock()
        this.writer = null
      }
    } catch {
      // Ignore writer release error
    }

    try {
      if (this.conn) {
        this.conn.close()
        this.conn = null
      }
    } catch {
      // Ignore connection close error
    }
  }
}

function escapeImapString(str: string): string {
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const client = new ImapSocketClient()

  try {
    const imapUser = Deno.env.get('GMAIL_IMAP_USER')
    const imapPass = Deno.env.get('GMAIL_IMAP_APP_PASSWORD')
    const imapHost = Deno.env.get('GMAIL_IMAP_HOST') || 'imap.gmail.com'
    const imapPortRaw = Deno.env.get('GMAIL_IMAP_PORT') || '993'
    const imapPort = parseInt(imapPortRaw, 10)

    if (!imapUser || !imapPass || !imapHost || isNaN(imapPort)) {
      console.error('IMAP configuration missing in environment secrets.')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não foi possível conectar ao Gmail.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    try {
      await client.connect(imapHost, imapPort, 10000)
    } catch (err) {
      console.error('IMAP TLS connection failed.')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não foi possível conectar ao Gmail.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Read greeting
    try {
      const greeting = await client.readGreeting(10000)
      if (!greeting.startsWith('* OK')) {
        console.error('Invalid IMAP greeting received.')
        await client.close()
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Não foi possível conectar ao Gmail.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    } catch {
      console.error('Failed reading IMAP greeting.')
      await client.close()
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não foi possível conectar ao Gmail.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Send LOGIN
    try {
      const loginRes = await client.sendCommand(
        `LOGIN ${escapeImapString(imapUser)} ${escapeImapString(imapPass)}`,
        10000,
      )
      if (!loginRes.isOk) {
        console.error('IMAP authentication failed.')
        await client.close()
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Não foi possível conectar ao Gmail.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    } catch {
      console.error('IMAP login command failed.')
      await client.close()
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não foi possível conectar ao Gmail.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Send SELECT INBOX
    try {
      const selectRes = await client.sendCommand('SELECT INBOX', 10000)
      if (!selectRes.isOk) {
        console.error('IMAP SELECT INBOX failed.')
        await client.close()
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Não foi possível conectar ao Gmail.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    } catch {
      console.error('IMAP select command failed.')
      await client.close()
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não foi possível conectar ao Gmail.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 4. Send LOGOUT
    try {
      await client.sendCommand('LOGOUT', 5000)
    } catch {
      // Best-effort logout
    }

    await client.close()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão com Gmail realizada com sucesso.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('Unexpected error during IMAP test.')
    await client.close()
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Não foi possível conectar ao Gmail.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
