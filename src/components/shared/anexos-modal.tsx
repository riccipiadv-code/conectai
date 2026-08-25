import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ContatoAnexo, getContatoAnexos, saveContatoAnexos } from '@/services/contacts'
import { Loader2, Paperclip, Plus, Trash2, Edit, AlertCircle } from 'lucide-react'

export interface AnexosModalProps {
  isOpen: boolean
  onClose: () => void
  contatoId: string
}

export function AnexosModal({ isOpen, onClose, contatoId }: AnexosModalProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [savedAnexos, setSavedAnexos] = useState<ContatoAnexo[]>([])
  const [editingAnexos, setEditingAnexos] = useState<ContatoAnexo[]>([])

  const fetchAnexos = useCallback(async () => {
    if (!contatoId) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const anexos = await getContatoAnexos(contatoId)
      setSavedAnexos(anexos)
    } catch (err: any) {
      console.error('Erro ao carregar anexos:', err)
      setErrorMessage(err?.message || 'Erro ao carregar anexos do atendimento.')
    } finally {
      setLoading(false)
    }
  }, [contatoId])

  useEffect(() => {
    if (isOpen && contatoId) {
      setIsEditing(false)
      fetchAnexos()
    } else if (!isOpen) {
      setIsEditing(false)
      setErrorMessage(null)
      setSavedAnexos([])
      setEditingAnexos([])
    }
  }, [isOpen, contatoId, fetchAnexos])

  const handleOpenLink = (link: string) => {
    if (!link) return
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const handleStartEdit = () => {
    setEditingAnexos(
      savedAnexos.map((a) => ({
        id: a.id,
        nome: a.nome,
        link: a.link,
        ordem: a.ordem,
        contato_id: a.contato_id,
      })),
    )
    setIsEditing(true)
  }

  const handleStartAdd = () => {
    if (savedAnexos.length > 0) {
      setEditingAnexos([
        ...savedAnexos.map((a) => ({
          id: a.id,
          nome: a.nome,
          link: a.link,
          ordem: a.ordem,
          contato_id: a.contato_id,
        })),
        { nome: '', link: '', ordem: savedAnexos.length },
      ])
    } else {
      setEditingAnexos([{ nome: '', link: '', ordem: 0 }])
    }
    setIsEditing(true)
  }

  const handleAddNewRow = () => {
    setEditingAnexos((prev) => [...prev, { nome: '', link: '', ordem: prev.length }])
  }

  const handleRemoveRow = (index: number) => {
    setEditingAnexos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFieldChange = (index: number, field: 'nome' | 'link', value: string) => {
    setEditingAnexos((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleCancel = async () => {
    setIsEditing(false)
    await fetchAnexos()
  }

  const handleSave = async () => {
    // 1. Validação local
    for (let i = 0; i < editingAnexos.length; i++) {
      const anexo = editingAnexos[i]
      const nomeTrim = (anexo.nome || '').trim()
      const linkTrim = (anexo.link || '').trim()

      if (!nomeTrim) {
        toast({
          title: 'Atenção',
          description: `O anexo #${i + 1} deve ter um nome preenchido.`,
          variant: 'destructive',
        })
        return
      }

      if (!linkTrim) {
        toast({
          title: 'Atenção',
          description: `O anexo "${nomeTrim}" deve ter um link preenchido.`,
          variant: 'destructive',
        })
        return
      }

      if (!linkTrim.startsWith('http://') && !linkTrim.startsWith('https://')) {
        toast({
          title: 'Atenção',
          description: `O link do anexo "${nomeTrim}" deve começar com http:// ou https://`,
          variant: 'destructive',
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = editingAnexos.map((a, idx) => ({
        id: a.id,
        nome: a.nome.trim(),
        link: a.link.trim(),
        ordem: idx,
      }))

      await saveContatoAnexos(contatoId, payload)
      toast({
        title: 'Sucesso',
        description: 'Anexos salvos com sucesso.',
      })

      // Recarrega via getContatoAnexos e retorna ao modo visualização (não fecha o modal)
      await fetchAnexos()
      setIsEditing(false)
    } catch (err: any) {
      console.error('Erro ao salvar anexos:', err)
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao salvar anexos.',
        variant: 'destructive',
      })
      // Mantém modo edição
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Anexar
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando anexos...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Erro ao carregar anexos</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnexos}>
                Tentar novamente
              </Button>
            </div>
          ) : !isEditing ? (
            /* Modo Visualização */
            <div className="space-y-4">
              {savedAnexos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg border-dashed bg-slate-50/50 dark:bg-zinc-900/50 p-6">
                  <Paperclip className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nenhum anexo cadastrado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique no botão &quot;+&quot; abaixo para adicionar um anexo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {savedAnexos.map((anexo, index) => (
                    <div
                      key={anexo.id || index}
                      onClick={() => handleOpenLink(anexo.link)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleOpenLink(anexo.link)
                        }
                      }}
                      className="group flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Paperclip className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 underline-offset-4 group-hover:underline">
                          {anexo.nome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                {savedAnexos.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="gap-1.5"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                ) : (
                  <div />
                )}

                <Button type="button" size="sm" onClick={handleStartAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          ) : (
            /* Modo Edição */
            <div className="space-y-4">
              <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
                {editingAnexos.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
                    Nenhum anexo adicionado na lista. Clique no botão &quot;+&quot; para adicionar.
                  </div>
                ) : (
                  editingAnexos.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Anexo #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                          onClick={() => handleRemoveRow(index)}
                          title="Remover este anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            placeholder="Ex: Contrato assinado"
                            value={item.nome}
                            onChange={(e) => handleFieldChange(index, 'nome', e.target.value)}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Link (URL)</Label>
                          <Input
                            placeholder="https://exemplo.com/arquivo.pdf"
                            value={item.link}
                            onChange={(e) => handleFieldChange(index, 'link', e.target.value)}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewRow}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar outro anexo
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isEditing ? (
            <>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  'Gravar'
                )}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
