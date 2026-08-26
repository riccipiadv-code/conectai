import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  getEmailSettings,
  getEmailReadingSettings,
  saveEmailSetting,
  saveEmailReadingSetting,
  sendTestEmail,
  testGmailConnection,
  searchConectaiEmail,
  EmailSetting,
  EmailReadingSetting,
} from '@/services/email-settings'
import { Loader2, Mail, Search, Send } from 'lucide-react'

export default function EmailSettings() {
  const [settings, setSettings] = useState<EmailSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingImap, setSavingImap] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [secret, setSecret] = useState('')

  // Estados da aba E-mail Leitura
  const [imapEmail, setImapEmail] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [readingSecretConfigured, setReadingSecretConfigured] = useState(false)
  const [buscaControle, setBuscaControle] = useState('')
  const [searchingEmail, setSearchingEmail] = useState(false)
  const [searchResult, setSearchResult] = useState<{
    controle: string
    quantidade: number
    emails: Array<{ date: string; from: string; to: string; subject: string }>
  } | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
    loadReadingSettings()
  }, [])

  const loadReadingSettings = async () => {
    try {
      const data = await getEmailReadingSettings()
      if (data) {
        setImapEmail(data.email || '')
        setImapHost(data.imap_host || '')
        setImapPort(String(data.imap_port || ''))
        setReadingSecretConfigured(data.secret_configured || false)
      } else {
        setImapHost('imap.gmail.com')
        setImapPort('993')
        setReadingSecretConfigured(false)
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações de leitura',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getEmailSettings()
      if (data && data.length > 0) {
        setSettings(data[0])
      } else {
        setSettings({
          provider: 'smtp',
          sender_name: '',
          sender_email: '',
          reply_to: '',
          smtp_host: '',
          smtp_port: 587,
          smtp_user: '',
          smtp_secure: true,
          active: true,
          secret_configured: false,
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    try {
      setSaving(true)
      await saveEmailSetting(settings, secret || undefined)
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de e-mail foram atualizadas com sucesso.',
      })
      setSecret('')
      loadSettings()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveImapReading = async () => {
    if (!imapEmail.trim()) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Informe o e-mail para a leitura.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingImap(true)
      await saveEmailReadingSetting(
        imapEmail.trim(),
        imapHost.trim() || undefined,
        imapPort.trim() ? Number(imapPort) || imapPort.trim() : undefined,
        imapPassword || undefined,
      )
      toast({
        title: 'Configurações salvas',
        description: 'Configurações do E-mail Leitura salvas com sucesso.',
      })
      setImapPassword('')
      await loadReadingSettings()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações do E-mail Leitura.',
        variant: 'destructive',
      })
    } finally {
      setSavingImap(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Informe um e-mail para testar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setTesting(true)
      await sendTestEmail(testEmail)
      toast({
        title: 'E-mail enviado!',
        description: 'O e-mail de teste foi enviado com sucesso.',
      })
      setTestEmail('')
    } catch (error: any) {
      toast({
        title: 'Falha no envio',
        description: error.message || 'Ocorreu um erro ao enviar o e-mail de teste.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleTestImapConnection = async () => {
    try {
      setTesting(true)
      const data = await testGmailConnection()
      if (data?.success === true) {
        toast({
          title: 'Conexão realizada',
          description: 'Conexão com o E-mail Leitura realizada com sucesso.',
        })
      } else {
        toast({
          title: 'Falha na conexão',
          description: 'Não foi possível conectar ao E-mail Leitura.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Falha na conexão',
        description: 'Não foi possível conectar ao E-mail Leitura.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSearchEmail = async () => {
    const controleLimpo = buscaControle.trim()
    if (!controleLimpo) {
      toast({
        title: 'Controle obrigatório',
        description: 'Informe o código de controle para buscar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSearchingEmail(true)
      const data = await searchConectaiEmail(controleLimpo)

      if (data?.success === true) {
        const qtd = Number(data.quantidade) || 0
        setSearchResult({
          controle: data.controle || controleLimpo,
          quantidade: qtd,
          emails: data.emails || [],
        })

        if (qtd === 1) {
          toast({
            title: 'Busca de e-mail',
            description: `1 e-mail encontrado para o controle ${controleLimpo}.`,
          })
        } else if (qtd > 1) {
          toast({
            title: 'Busca de e-mail',
            description: `${qtd} e-mails encontrados para o controle ${controleLimpo}.`,
          })
        } else {
          toast({
            title: 'Busca de e-mail',
            description: `Nenhum e-mail encontrado para o controle ${controleLimpo}.`,
          })
        }
      } else {
        setSearchResult(null)
        toast({
          title: 'Erro na busca',
          description: data?.message || 'Não foi possível buscar e-mails.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      setSearchResult(null)
      toast({
        title: 'Erro na busca',
        description: error.message || 'Não foi possível buscar e-mails.',
        variant: 'destructive',
      })
    } finally {
      setSearchingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Configurações de E-mail</h2>
        <p className="text-muted-foreground">
          Gerencie as configurações de envio de e-mails do sistema e realize testes.
        </p>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">E-mail Geral</TabsTrigger>
          <TabsTrigger value="leitura">E-mail Leitura</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSave} className="space-y-6 md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Provedor e Remetente</CardTitle>
                  <CardDescription>
                    Defina como os e-mails serão enviados e apresentados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status da Integração</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.active}
                        onCheckedChange={(checked) => setSettings({ ...settings, active: checked })}
                      />
                      <span className="text-sm font-medium">
                        {settings.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Provedor</Label>
                    <Select
                      value={settings.provider}
                      onValueChange={(val) => setSettings({ ...settings, provider: val })}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="resend">Resend API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender_name">Nome do Remetente *</Label>
                    <Input
                      id="sender_name"
                      value={settings.sender_name}
                      onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender_email">E-mail do Remetente *</Label>
                    <Input
                      id="sender_email"
                      type="email"
                      value={settings.sender_email}
                      onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reply_to">Responder para (Opcional)</Label>
                    <Input
                      id="reply_to"
                      type="email"
                      value={settings.reply_to || ''}
                      onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credenciais {settings.provider === 'smtp' ? 'SMTP' : 'API'}</CardTitle>
                  <CardDescription>
                    Informe as credenciais de acesso ao servidor. Senhas não são exibidas após
                    salvas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.provider === 'smtp' && (
                    <>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-3">
                          <Label htmlFor="smtp_host">Host SMTP</Label>
                          <Input
                            id="smtp_host"
                            value={settings.smtp_host || ''}
                            onChange={(e) =>
                              setSettings({ ...settings, smtp_host: e.target.value })
                            }
                            required={settings.provider === 'smtp'}
                          />
                        </div>
                        <div className="space-y-2 col-span-1">
                          <Label htmlFor="smtp_port">Porta</Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            value={settings.smtp_port || ''}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                smtp_port: parseInt(e.target.value) || null,
                              })
                            }
                            required={settings.provider === 'smtp'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp_user">Usuário SMTP</Label>
                        <Input
                          id="smtp_user"
                          value={settings.smtp_user || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                          required={settings.provider === 'smtp'}
                        />
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label>Usar Conexão Segura (TLS/SSL)</Label>
                          <Switch
                            checked={settings.smtp_secure}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, smtp_secure: checked })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="secret">
                      {settings.provider === 'smtp' ? 'Senha SMTP' : 'Chave de API'}
                    </Label>
                    <Input
                      id="secret"
                      type="password"
                      placeholder={
                        settings.secret_configured
                          ? 'Preencher somente para alterar'
                          : 'Informe a credencial'
                      }
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required={!settings.secret_configured}
                    />
                    {settings.secret_configured && !secret && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Credencial já configurada. Preencha apenas se quiser atualizar.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configurações
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <div className="space-y-6 md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Testar Envio
                  </CardTitle>
                  <CardDescription>
                    Verifique se as configurações estão corretas enviando um e-mail de teste.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">E-mail de Destino</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleTest}
                    disabled={testing || !testEmail}
                  >
                    {testing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar Teste
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leitura" className="space-y-6">
          <div className="max-w-xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Leitura de E-mails (IMAP)</CardTitle>
                <CardDescription>
                  Configure o acesso à caixa de entrada para leitura de e-mails.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imap_email">E-mail</Label>
                  <Input
                    id="imap_email"
                    type="email"
                    placeholder="riccipi.adv@gmail.com"
                    value={imapEmail}
                    onChange={(e) => setImapEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="imap_host">Servidor IMAP</Label>
                    <Input
                      id="imap_host"
                      placeholder="imap.gmail.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="imap_port">Porta</Label>
                    <Input
                      id="imap_port"
                      type="number"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imap_password">Senha de aplicativo</Label>
                  <Input
                    id="imap_password"
                    type="password"
                    placeholder={
                      readingSecretConfigured ? 'Preencher somente para alterar' : '••••••••'
                    }
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                  />
                  {readingSecretConfigured && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Credencial já configurada. Preencha somente se quiser alterar.
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center gap-3">
                <Button type="button" onClick={handleSaveImapReading} disabled={savingImap}>
                  {savingImap && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestImapConnection}
                  disabled={testing}
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Testar conexão
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Teste de busca de e-mail
                </CardTitle>
                <CardDescription>
                  Verifique a busca de e-mails na caixa de entrada pelo identificador de controle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="busca_controle">Controle</Label>
                  <Input
                    id="busca_controle"
                    placeholder="Ex: 469"
                    value={buscaControle}
                    onChange={(e) => setBuscaControle(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  onClick={handleSearchEmail}
                  disabled={searchingEmail || !buscaControle.trim()}
                >
                  {searchingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Buscar e-mail
                    </>
                  )}
                </Button>
              </CardFooter>

              {searchResult && searchResult.emails.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">
                      Encontrados: {searchResult.quantidade} e-mail
                      {searchResult.quantidade !== 1 ? 's' : ''} para o controle{' '}
                      {searchResult.controle}
                    </p>
                    <div className="space-y-3">
                      {searchResult.emails.map((email, idx) => (
                        <div key={idx} className="rounded-md border bg-muted/30 p-3 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">Data:</span>{' '}
                            {email.date || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">De:</span>{' '}
                            {email.from || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">Para:</span>{' '}
                            {email.to || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">Assunto:</span>{' '}
                            {email.subject || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
