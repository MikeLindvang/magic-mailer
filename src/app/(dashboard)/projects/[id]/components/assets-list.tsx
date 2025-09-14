"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Loader2, Edit2, Trash2, Check, X, Layers } from "lucide-react"
import { toast } from "sonner"
import { type Asset } from "../types"
import { type Chunk } from "@/lib/schemas/chunk"

interface AssetsListProps {
  projectId: string;
  assets: Asset[];
  isLoading: boolean;
  onAssetsChange: () => void;
}

export function AssetsList({ projectId, assets, isLoading, onAssetsChange }: AssetsListProps) {
  // State for asset editing
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isUpdatingAsset, setIsUpdatingAsset] = useState(false)
  
  // State for asset deletion
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State for chunks modal
  const [chunksModalOpen, setChunksModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)

  // Start editing an asset
  const handleStartEditAsset = (asset: Asset) => {
    setEditingAssetId(asset._id)
    setEditingTitle(asset.title)
  }

  // Cancel editing an asset
  const handleCancelEditAsset = () => {
    setEditingAssetId(null)
    setEditingTitle('')
  }

  // Save asset title changes
  const handleSaveAssetTitle = async (assetId: string) => {
    if (!editingTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }

    try {
      setIsUpdatingAsset(true)
      
      const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        setEditingAssetId(null)
        setEditingTitle('')
        toast.success('Asset title updated successfully!')
        onAssetsChange() // Refresh the assets list
      } else {
        throw new Error(result.error || 'Failed to update asset title')
      }
    } catch (error) {
      console.error('Error updating asset title:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update asset title')
    } finally {
      setIsUpdatingAsset(false)
    }
  }

  // Delete an asset
  const handleDeleteAsset = async (assetId: string) => {
    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (result.ok) {
        const deletedChunks = result.data.deletedChunks
        toast.success(`Asset deleted successfully! ${deletedChunks} chunks were also removed.`)
        onAssetsChange() // Refresh the assets list
      } else {
        throw new Error(result.error || 'Failed to delete asset')
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset')
    } finally {
      setIsDeleting(false)
      setDeletingAssetId(null)
    }
  }

  // Load chunks for a specific asset
  const loadChunks = async (asset: Asset) => {
    try {
      setIsLoadingChunks(true)
      setSelectedAsset(asset)
      setChunks([])
      
      const response = await fetch(`/api/projects/${projectId}/assets/${asset._id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Asset not found')
        } else {
          throw new Error(`Failed to load chunks (${response.status})`)
        }
      }
      
      const result = await response.json()
      if (result.ok) {
        setChunks(result.data.chunks)
        setChunksModalOpen(true)
      } else {
        throw new Error(result.error || 'Failed to load chunks')
      }
    } catch (error) {
      console.error('Error loading chunks:', error)
      const message = error instanceof Error ? error.message : 'Failed to load chunks'
      toast.error(message)
    } finally {
      setIsLoadingChunks(false)
    }
  }

  // Handle closing chunks modal
  const handleChunksModalClose = () => {
    setChunksModalOpen(false)
    setSelectedAsset(null)
    setChunks([])
  }

  return (
    <>
      <Card className="tactile-card paper-texture">
        <CardHeader>
          <CardTitle className="font-headline text-charcoal flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Assets
          </CardTitle>
          <CardDescription className="font-body text-charcoal/80">
            View and manage all ingested content for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-charcoal/60" />
              <span className="ml-2 text-charcoal/60 font-body">Loading assets...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
              <h3 className="text-lg font-headline font-semibold mb-2 text-charcoal">No assets yet</h3>
              <p className="text-charcoal/60 font-body mb-4">
                Use the form above to ingest your first piece of content.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div 
                  key={asset._id} 
                  className="flex items-center justify-between p-4 bg-parchment/50 rounded-squircle-sm border border-charcoal/10"
                >
                  <div className="flex-1">
                    {editingAssetId === asset._id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          className="tactile-input flex-1"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveAssetTitle(asset._id)
                            } else if (e.key === 'Escape') {
                              handleCancelEditAsset()
                            }
                          }}
                          disabled={isUpdatingAsset}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="tactile-button px-2"
                          onClick={() => handleSaveAssetTitle(asset._id)}
                          disabled={isUpdatingAsset || !editingTitle.trim()}
                        >
                          {isUpdatingAsset ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="tactile-button-secondary px-2"
                          onClick={handleCancelEditAsset}
                          disabled={isUpdatingAsset}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <h4 className="font-body font-medium text-charcoal">{asset.title}</h4>
                    )}
                    
                    <div className="flex items-center gap-4 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {asset.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-charcoal/60 font-body">
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </span>
                      {asset.chunkCount !== undefined && (
                        <span className="text-xs text-charcoal/60 font-body">
                          {asset.chunkCount} chunks
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="tactile-button-secondary"
                      onClick={() => loadChunks(asset)}
                      disabled={isLoadingChunks}
                    >
                      {isLoadingChunks && selectedAsset?._id === asset._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'View Chunks'
                      )}
                    </Button>
                    
                    {editingAssetId !== asset._id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="tactile-button-secondary px-2"
                          onClick={() => handleStartEditAsset(asset)}
                          disabled={editingAssetId !== null}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <Dialog 
                          open={deletingAssetId === asset._id} 
                          onOpenChange={(open) => {
                            if (!open) setDeletingAssetId(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="tactile-button-secondary px-2 hover:bg-terracotta/10 hover:border-terracotta/20"
                              onClick={() => setDeletingAssetId(asset._id)}
                              disabled={editingAssetId !== null || isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          
                          <DialogContent className="sm:max-w-md tactile-card paper-texture">
                            <DialogHeader>
                              <DialogTitle className="font-headline text-charcoal">
                                Delete Asset
                              </DialogTitle>
                              <DialogDescription className="font-body text-charcoal/80">
                                Are you sure you want to delete "{asset.title}"? This will also delete all associated chunks and cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="bg-terracotta/10 border border-terracotta/20 rounded-squircle-sm p-3 my-4">
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4 text-terracotta" />
                                <span className="text-sm font-body font-medium text-charcoal">
                                  This action is permanent
                                </span>
                              </div>
                              <p className="text-xs text-charcoal/80 font-body mt-1">
                                {asset.chunkCount || 0} chunks will also be deleted
                              </p>
                            </div>
                            
                            <DialogFooter className="gap-2">
                              <Button
                                variant="outline"
                                className="tactile-button-secondary"
                                onClick={() => setDeletingAssetId(null)}
                                disabled={isDeleting}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="bg-terracotta hover:bg-terracotta/90 text-parchment"
                                onClick={() => handleDeleteAsset(asset._id)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Asset
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chunks Modal */}
      <Dialog open={chunksModalOpen} onOpenChange={(open) => {
        if (!open) handleChunksModalClose()
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] tactile-card paper-texture">
          <DialogHeader>
            <DialogTitle className="font-headline text-charcoal flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Content Chunks - {selectedAsset?.title}
            </DialogTitle>
            <DialogDescription className="font-body text-charcoal/80">
              View all content chunks generated from this asset. Each chunk represents a section of the original content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingChunks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-charcoal/60" />
                <span className="ml-2 text-charcoal/60 font-body">Loading chunks...</span>
              </div>
            ) : chunks.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
                <h3 className="text-lg font-headline font-semibold mb-2 text-charcoal">No chunks found</h3>
                <p className="text-charcoal/60 font-body">
                  This asset doesn't have any content chunks yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-xs">
                      {selectedAsset?.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-charcoal/60 font-body">
                      {chunks.length} chunks total
                    </span>
                    <span className="text-sm text-charcoal/60 font-body">
                      {chunks.reduce((total, chunk) => total + chunk.tokens, 0)} tokens total
                    </span>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {chunks.map((chunk, index) => (
                    <div 
                      key={chunk._id} 
                      className="tactile-card bg-parchment/50 p-4 border border-charcoal/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            #{index + 1}
                          </Badge>
                          <span className="text-xs text-charcoal/60 font-body">
                            {chunk.tokens} tokens
                          </span>
                          {chunk.section && (
                            <span className="text-xs text-charcoal/60 font-body">
                              Section: {chunk.section}
                            </span>
                          )}
                          {chunk.vector && (
                            <Badge variant="secondary" className="text-xs">
                              Vectorized
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="prose prose-sm max-w-none">
                        <div 
                          className="bg-white rounded-squircle-sm p-3 border border-charcoal/10 text-sm font-body text-charcoal leading-relaxed max-h-48 overflow-y-auto"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {chunk.md_text}
                        </div>
                      </div>
                      
                      {chunk.meta?.hpath && chunk.meta.hpath.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-charcoal/10">
                          <span className="text-xs text-charcoal/60 font-body">
                            Heading Path: {chunk.meta.hpath.join(' > ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="tactile-button-secondary"
              onClick={handleChunksModalClose}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
