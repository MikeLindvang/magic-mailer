"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  File, 
  Globe, 
  Bot, 
  Loader2,
  Save,
  X,
  Wrench,
  Search,
  Filter,
  Calendar,
  SlidersHorizontal
} from "lucide-react"
import { toast } from "sonner"
import { type ChunkWithAsset, type CreateChunkRequest, type UpdateChunkRequest } from "../types"

interface ChunksTabProps {
  projectId: string
  isLoading?: boolean
  onChunksChange?: () => void
  selectedChunkIds?: string[]
  onChunkSelectionChange?: (chunkIds: string[]) => void
}

interface EditingChunk {
  _id: string
  title: string
  content: string
  section?: string
}

export function ChunksTab({ 
  projectId, 
  isLoading = false, 
  onChunksChange,
  selectedChunkIds = [],
  onChunkSelectionChange
}: ChunksTabProps) {
  const [chunks, setChunks] = useState<ChunkWithAsset[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingChunk, setEditingChunk] = useState<EditingChunk | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Form state for creating new chunk
  const [newChunk, setNewChunk] = useState<CreateChunkRequest>({
    title: '',
    content: '',
    section: ''
  })

  // Form state for AI generation
  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    count: 3,
    chunkType: 'general' as 'introduction' | 'feature' | 'benefit' | 'testimonial' | 'cta' | 'general'
  })

  // Load chunks from API
  const loadChunks = async () => {
    try {
      setIsLoadingChunks(true)
      const response = await fetch(`/api/projects/${projectId}/chunks`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          throw new Error(`Failed to load chunks (${response.status})`)
        }
      }
      
      const result = await response.json()
      if (result.ok) {
        console.log('Loaded chunks:', result.data) // Debug log
        setChunks(result.data)
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

  // Load chunks on component mount
  useEffect(() => {
    if (projectId) {
      loadChunks()
    }
  }, [projectId])

  // Create new custom chunk
  const handleCreateChunk = async () => {
    if (!newChunk.title.trim() || !newChunk.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch(`/api/projects/${projectId}/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChunk),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create chunk')
      }

      if (result.ok) {
        toast.success('Chunk created successfully')
        setIsCreateModalOpen(false)
        setNewChunk({ title: '', content: '', section: '' })
        await loadChunks()
        onChunksChange?.()
      } else {
        throw new Error(result.error || 'Failed to create chunk')
      }
    } catch (error) {
      console.error('Error creating chunk:', error)
      const message = error instanceof Error ? error.message : 'Failed to create chunk'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  // Start editing a chunk
  const handleStartEdit = (chunk: ChunkWithAsset) => {
    if (!chunk.isCustom) {
      toast.error('Cannot edit chunks derived from assets. Create a custom chunk instead.')
      return
    }

    setEditingChunk({
      _id: chunk._id,
      title: chunk.meta?.hpath?.[0] || 'Untitled',
      content: chunk.md_text,
      section: chunk.section || ''
    })
  }

  // Update chunk
  const handleUpdateChunk = async () => {
    if (!editingChunk) return

    if (!editingChunk.title.trim() || !editingChunk.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setIsUpdating(true)
      const updateData: UpdateChunkRequest = {
        title: editingChunk.title,
        content: editingChunk.content,
        section: editingChunk.section || undefined
      }

      const response = await fetch(`/api/projects/${projectId}/chunks/${editingChunk._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update chunk')
      }

      if (result.ok) {
        toast.success('Chunk updated successfully')
        setEditingChunk(null)
        await loadChunks()
        onChunksChange?.()
      } else {
        throw new Error(result.error || 'Failed to update chunk')
      }
    } catch (error) {
      console.error('Error updating chunk:', error)
      const message = error instanceof Error ? error.message : 'Failed to update chunk'
      toast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete chunk
  const handleDeleteChunk = async (chunkId: string, isCustom?: boolean) => {
    if (!isCustom) {
      toast.error('Cannot delete chunks derived from assets. Delete the asset instead.')
      return
    }

    if (!confirm('Are you sure you want to delete this chunk? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(chunkId)
      const response = await fetch(`/api/projects/${projectId}/chunks/${chunkId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete chunk')
      }

      if (result.ok) {
        toast.success('Chunk deleted successfully')
        await loadChunks()
        onChunksChange?.()
      } else {
        throw new Error(result.error || 'Failed to delete chunk')
      }
    } catch (error) {
      console.error('Error deleting chunk:', error)
      const message = error instanceof Error ? error.message : 'Failed to delete chunk'
      toast.error(message)
    } finally {
      setIsDeleting(null)
    }
  }

  // Generate chunks with AI
  const handleGenerateChunks = async () => {
    if (!generateForm.prompt.trim()) {
      toast.error('Please provide a prompt for chunk generation')
      return
    }

    try {
      setIsGenerating(true)
      const response = await fetch(`/api/projects/${projectId}/chunks/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateForm),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate chunks')
      }

      if (result.ok) {
        toast.success(result.data.message || 'Chunks generated successfully')
        setIsGenerateModalOpen(false)
        setGenerateForm({ prompt: '', count: 3, chunkType: 'general' })
        await loadChunks()
        onChunksChange?.()
      } else {
        throw new Error(result.error || 'Failed to generate chunks')
      }
    } catch (error) {
      console.error('Error generating chunks:', error)
      const message = error instanceof Error ? error.message : 'Failed to generate chunks'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  // Open AI generation modal
  const handleOpenGenerateModal = () => {
    setIsGenerateModalOpen(true)
  }

  // Repair orphaned chunks
  const handleRepairChunks = async () => {
    if (!confirm('This will convert orphaned chunks (those referencing deleted assets) to custom chunks. Continue?')) {
      return
    }

    try {
      setIsRepairing(true)
      const response = await fetch(`/api/projects/${projectId}/chunks/repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to repair chunks')
      }

      if (result.ok) {
        toast.success(result.data.message)
        await loadChunks() // Reload chunks to show the changes
        onChunksChange?.()
      } else {
        throw new Error(result.error || 'Failed to repair chunks')
      }
    } catch (error) {
      console.error('Error repairing chunks:', error)
      const message = error instanceof Error ? error.message : 'Failed to repair chunks'
      toast.error(message)
    } finally {
      setIsRepairing(false)
    }
  }

  // Filter and search logic
  const filteredChunks = chunks.filter(chunk => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = chunk.meta?.hpath?.[0]?.toLowerCase().includes(query)
      const matchesContent = chunk.md_text.toLowerCase().includes(query)
      const matchesAsset = chunk.assetTitle?.toLowerCase().includes(query)
      const matchesSection = chunk.section?.toLowerCase().includes(query)
      
      if (!matchesTitle && !matchesContent && !matchesAsset && !matchesSection) {
        return false
      }
    }

    // Asset filter
    if (selectedAsset !== 'all') {
      if (selectedAsset === 'custom' && !chunk.isCustom) return false
      if (selectedAsset === 'assets' && chunk.isCustom) return false
      if (selectedAsset !== 'custom' && selectedAsset !== 'assets' && chunk.assetTitle !== selectedAsset) return false
    }

    // Type filter
    if (selectedType !== 'all' && chunk.assetType !== selectedType) {
      return false
    }

    // Date filter
    if (selectedDateRange !== 'all') {
      const chunkDate = new Date(chunk.createdAt)
      const now = new Date()
      
      switch (selectedDateRange) {
        case 'today':
          if (chunkDate.toDateString() !== now.toDateString()) return false
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (chunkDate < weekAgo) return false
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (chunkDate < monthAgo) return false
          break
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          if (chunkDate < quarterAgo) return false
          break
      }
    }

    return true
  })

  // Get unique assets for filter dropdown
  const uniqueAssets = Array.from(new Set(
    chunks
      .filter(chunk => chunk.assetTitle && !chunk.isCustom)
      .map(chunk => chunk.assetTitle!)
  )).sort()

  // Get unique types for filter dropdown
  const uniqueTypes = Array.from(new Set(
    chunks
      .filter(chunk => chunk.assetType)
      .map(chunk => chunk.assetType!)
  )).sort()

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedAsset('all')
    setSelectedType('all')
    setSelectedDateRange('all')
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() || selectedAsset !== 'all' || selectedType !== 'all' || selectedDateRange !== 'all'

  // Handle chunk selection
  const handleChunkToggle = (chunkId: string) => {
    if (!onChunkSelectionChange) return
    
    const isSelected = selectedChunkIds.includes(chunkId)
    if (isSelected) {
      onChunkSelectionChange(selectedChunkIds.filter(id => id !== chunkId))
    } else {
      onChunkSelectionChange([...selectedChunkIds, chunkId])
    }
  }

  // Handle select all/none
  const handleSelectAll = () => {
    if (!onChunkSelectionChange) return
    
    if (selectedChunkIds.length === filteredChunks.length) {
      // If all are selected, clear selection
      onChunkSelectionChange([])
    } else {
      // Select all visible chunks
      onChunkSelectionChange(filteredChunks.map(chunk => chunk._id))
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    if (!onChunkSelectionChange) return
    onChunkSelectionChange([])
  }

  // Get icon for asset type
  const getAssetIcon = (assetType?: string) => {
    switch (assetType) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'docx':
        return <File className="h-4 w-4 text-blue-500" />
      case 'html':
        return <Globe className="h-4 w-4 text-green-500" />
      case 'md':
        return <FileText className="h-4 w-4 text-gray-500" />
      default:
        return <Layers className="h-4 w-4 text-terracotta" />
    }
  }

  if (isLoading || isLoadingChunks) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-charcoal/60" />
          <span className="font-body text-charcoal/60">Loading chunks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-charcoal text-2xl font-bold">Content Chunks</h2>
            <p className="font-body text-charcoal/80 mt-1">
              Reusable content blocks for your email campaigns
              {filteredChunks.length !== chunks.length && (
                <span className="ml-2 text-terracotta font-medium">
                  ({filteredChunks.length} of {chunks.length} shown)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Selection controls - only show if selection is enabled */}
            {onChunkSelectionChange && (
              <>
                <div className="text-sm font-body text-charcoal/60">
                  {selectedChunkIds.length > 0 ? (
                    <span className="text-terracotta font-medium">
                      {selectedChunkIds.length} selected
                    </span>
                  ) : (
                    "Select chunks for email generation"
                  )}
                </div>
                
                {filteredChunks.length > 0 && (
                  <Button
                    onClick={selectedChunkIds.length > 0 ? handleClearSelection : handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {selectedChunkIds.length === filteredChunks.length ? "Clear All" : "Select All"}
                  </Button>
                )}
              </>
            )}
            
            <Button
              onClick={() => window.open(`/api/projects/${projectId}/chunks/debug`, '_blank')}
              variant="outline"
              className="text-xs"
            >
              <Wrench className="h-3 w-3 mr-1" />
              Debug
            </Button>
            
            <Button
              onClick={handleRepairChunks}
              disabled={isRepairing}
              variant="outline"
              className="text-xs"
            >
              {isRepairing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Wrench className="h-3 w-3 mr-1" />
              )}
              Repair
            </Button>
            
            <Button
              onClick={handleOpenGenerateModal}
              disabled={isGenerating}
              className="tactile-button-secondary"
            >
              <Bot className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="tactile-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Chunk
                </Button>
              </DialogTrigger>
              <DialogContent className="tactile-card paper-texture max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-headline text-charcoal">Create New Chunk</DialogTitle>
                  <DialogDescription className="font-body text-charcoal/80">
                    Create a custom content block that you can reuse in your email campaigns.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-body font-medium text-charcoal">
                      Title
                    </label>
                    <Input
                      className="tactile-input"
                      placeholder="e.g., Welcome Message, Product Announcement..."
                      value={newChunk.title}
                      onChange={(e) => setNewChunk(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-body font-medium text-charcoal">
                      Section (Optional)
                    </label>
                    <Input
                      className="tactile-input"
                      placeholder="e.g., Introduction, Call to Action, Footer..."
                      value={newChunk.section}
                      onChange={(e) => setNewChunk(prev => ({ ...prev, section: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-body font-medium text-charcoal">
                      Content
                    </label>
                    <Textarea
                      className="tactile-input min-h-[200px] resize-none"
                      placeholder="Enter your content here. You can use Markdown formatting..."
                      value={newChunk.content}
                      onChange={(e) => setNewChunk(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="tactile-button-secondary"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateChunk}
                      disabled={isCreating}
                      className="tactile-button"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Create Chunk
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/40" />
            <Input
              className="tactile-input pl-10 pr-4"
              placeholder="Search chunks by title, content, asset, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-charcoal/10"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filter Toggle and Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="tactile-button-secondary"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="default" className="ml-2 h-5 w-5 p-0 text-xs">
                  {[searchQuery.trim() ? 1 : 0, selectedAsset !== 'all' ? 1 : 0, selectedType !== 'all' ? 1 : 0, selectedDateRange !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-terracotta hover:text-terracotta/80 hover:bg-terracotta/10"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-parchment/50 border border-charcoal/10 rounded-squircle-sm">
              {/* Asset Filter */}
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Asset Source
                </label>
                <select
                  className="tactile-input w-full text-sm"
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                >
                  <option value="all">All Sources</option>
                  <option value="custom">User Created</option>
                  <option value="assets">From Assets</option>
                  {uniqueAssets.map(asset => (
                    <option key={asset} value={asset}>{asset}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  File Type
                </label>
                <select
                  className="tactile-input w-full text-sm"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Created
                </label>
                <select
                  className="tactile-input w-full text-sm"
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="quarter">Past 3 Months</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chunks list */}
      {filteredChunks.length === 0 && chunks.length > 0 ? (
        <Card className="tactile-card paper-texture">
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
            <h3 className="font-headline text-charcoal text-lg font-semibold mb-2">No chunks match your filters</h3>
            <p className="font-body text-charcoal/60 mb-6 max-w-md mx-auto">
              Try adjusting your search query or filter settings to see more chunks.
            </p>
            <Button 
              onClick={clearFilters}
              className="tactile-button-secondary"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : chunks.length === 0 ? (
        <Card className="tactile-card paper-texture">
          <CardContent className="text-center py-12">
            <Layers className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
            <h3 className="font-headline text-charcoal text-lg font-semibold mb-2">No chunks yet</h3>
            <p className="font-body text-charcoal/60 mb-6 max-w-lg mx-auto">
              Create reusable content blocks to speed up your email campaign creation. 
              Chunks are automatically created from your uploaded documents, or you can create custom ones manually or with AI.
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="tactile-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Chunk
              </Button>
              <Button
                onClick={handleOpenGenerateModal}
                disabled={isGenerating}
                className="tactile-button-secondary"
              >
                <Bot className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChunks.map((chunk) => (
            <Card key={chunk._id} className="tactile-card paper-texture">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  {/* Selection checkbox - only show if selection is enabled */}
                  {onChunkSelectionChange && (
                    <div className="mr-3 pt-1">
                      <Checkbox
                        checked={selectedChunkIds.includes(chunk._id)}
                        onCheckedChange={() => handleChunkToggle(chunk._id)}
                        className="data-[state=checked]:bg-terracotta data-[state=checked]:border-terracotta"
                      />
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {chunk.isCustom ? (
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-sage" />
                          <span className="text-xs font-body text-sage font-medium">User Created</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getAssetIcon(chunk.assetType)}
                          <span className="text-xs font-body text-terracotta font-medium">
                            From: {chunk.assetTitle || 'Unknown Asset'}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="font-headline text-charcoal text-base font-semibold truncate">
                      {chunk.meta?.hpath?.[0] || 'Untitled Chunk'}
                    </CardTitle>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {chunk.isCustom ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(chunk)}
                          className="h-8 w-8 p-0 hover:bg-sage/20"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteChunk(chunk._id, chunk.isCustom)}
                          disabled={isDeleting === chunk._id}
                          className="h-8 w-8 p-0 hover:bg-terracotta/20 text-terracotta hover:text-terracotta"
                        >
                          {isDeleting === chunk._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {chunk.section && (
                    <Badge variant="outline" className="text-xs">
                      {chunk.section}
                    </Badge>
                  )}
                  {chunk.assetType && !chunk.isCustom && (
                    <Badge variant="outline" className="text-xs uppercase">
                      {chunk.assetType}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="font-body text-charcoal/70 text-sm line-clamp-4 mb-3">
                  {chunk.md_text}
                </p>
                
                <div className="flex items-center justify-between text-xs text-charcoal/50">
                  <span>{chunk.tokens} tokens</span>
                  <span>
                    {new Date(chunk.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Generation Modal */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="tactile-card paper-texture max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-charcoal">Generate Chunks with AI</DialogTitle>
            <DialogDescription className="font-body text-charcoal/80">
              Use AI to create multiple content blocks based on your prompt and project context.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-body font-medium text-charcoal">
                What would you like to create chunks about?
              </label>
              <Textarea
                className="tactile-input min-h-[100px] resize-none"
                placeholder="e.g., Create engaging introductions for our new product launch, or Write benefit-focused content about our software features..."
                value={generateForm.prompt}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, prompt: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal">
                  Chunk Type
                </label>
                <select
                  className="tactile-input w-full"
                  value={generateForm.chunkType}
                  onChange={(e) => setGenerateForm(prev => ({ 
                    ...prev, 
                    chunkType: e.target.value as typeof generateForm.chunkType 
                  }))}
                >
                  <option value="general">General Content</option>
                  <option value="introduction">Introduction</option>
                  <option value="feature">Features</option>
                  <option value="benefit">Benefits</option>
                  <option value="testimonial">Testimonials</option>
                  <option value="cta">Call to Action</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal">
                  Number of Chunks
                </label>
                <select
                  className="tactile-input w-full"
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm(prev => ({ 
                    ...prev, 
                    count: parseInt(e.target.value) 
                  }))}
                >
                  <option value={1}>1 chunk</option>
                  <option value={2}>2 chunks</option>
                  <option value={3}>3 chunks</option>
                  <option value={4}>4 chunks</option>
                  <option value={5}>5 chunks</option>
                </select>
              </div>
            </div>
            
            <div className="bg-sage/10 border border-sage/20 rounded-squircle-sm p-4">
              <div className="flex items-start gap-2">
                <Bot className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
                <div className="text-sm font-body text-charcoal/70">
                  <p className="font-medium text-charcoal mb-1">AI will use your project's content as context</p>
                  <p>The generated chunks will be tailored to your project and can reference your uploaded documents and assets.</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsGenerateModalOpen(false)}
                className="tactile-button-secondary"
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateChunks}
                disabled={isGenerating || !generateForm.prompt.trim()}
                className="tactile-button"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bot className="h-4 w-4 mr-2" />
                )}
                Generate {generateForm.count} Chunk{generateForm.count > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit chunk dialog */}
      {editingChunk && (
        <Dialog open={!!editingChunk} onOpenChange={() => setEditingChunk(null)}>
          <DialogContent className="tactile-card paper-texture max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-charcoal">Edit Chunk</DialogTitle>
              <DialogDescription className="font-body text-charcoal/80">
                Modify your custom content block.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal">
                  Title
                </label>
                <Input
                  className="tactile-input"
                  placeholder="Chunk title..."
                  value={editingChunk.title}
                  onChange={(e) => setEditingChunk(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal">
                  Section (Optional)
                </label>
                <Input
                  className="tactile-input"
                  placeholder="Section name..."
                  value={editingChunk.section}
                  onChange={(e) => setEditingChunk(prev => prev ? { ...prev, section: e.target.value } : null)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-body font-medium text-charcoal">
                  Content
                </label>
                <Textarea
                  className="tactile-input min-h-[200px] resize-none"
                  placeholder="Chunk content..."
                  value={editingChunk.content}
                  onChange={(e) => setEditingChunk(prev => prev ? { ...prev, content: e.target.value } : null)}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingChunk(null)}
                  className="tactile-button-secondary"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateChunk}
                  disabled={isUpdating}
                  className="tactile-button"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
