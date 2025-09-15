"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { type ContentType, type IngestResponse } from "../types"

interface ContentIngestionFormProps {
  projectId: string;
  onAssetCreated: () => void;
}

export function ContentIngestionForm({ projectId, onAssetCreated }: ContentIngestionFormProps) {
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<ContentType>('text')

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      let response: Response
      
      if (activeTab === 'text') {
        if (!textContent.trim()) {
          toast.error('Please enter some text content')
          return
        }
        
        response = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            source: {
              type: 'text',
              value: textContent,
            },
            assetType: 'md',
            title: title.trim() || 'Untitled Document',
          }),
        })
      } else if (activeTab === 'url') {
        if (!urlContent.trim()) {
          toast.error('Please enter a valid URL')
          return
        }
        
        // Validate URL format
        try {
          new URL(urlContent)
        } catch {
          toast.error('Please enter a valid URL')
          return
        }
        
        response = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            source: {
              type: 'url',
              value: urlContent,
            },
            assetType: 'html',
            title: title.trim() || 'Web Content',
          }),
        })
      } else {
        // File upload
        if (!selectedFile) {
          toast.error('Please select a file to upload')
          return
        }
        
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('projectId', projectId)
        formData.append('file', selectedFile)
        if (title.trim()) {
          formData.append('title', title.trim())
        }
        
        response = await fetch('/api/ingest', {
          method: 'POST',
          body: formData, // Don't set Content-Type header, let browser set it with boundary
        })
      }

      if (!response.ok) {
        // Handle different error types
        if (response.status === 413) {
          throw new Error('File too large. Please select a file smaller than 10MB.')
        }
        
        try {
          const result = await response.json()
          throw new Error(result.error || `Failed to ingest content (${response.status})`)
        } catch (jsonError) {
          // If response is not JSON (e.g., server error page)
          if (response.status === 413) {
            throw new Error('File too large. Please select a file smaller than 10MB.')
          }
          throw new Error(`Server error (${response.status}). Please try again.`)
        }
      }

      const result = await response.json()
      
      if (result.ok) {
        const { chunkCount } = result.data as IngestResponse
        toast.success(`Content ingested successfully! Created ${chunkCount} chunks.`)
        
        // Clear form
        setTextContent('')
        setUrlContent('')
        setTitle('')
        setSelectedFile(null)
        
        // Notify parent to reload assets
        onAssetCreated()
      } else {
        throw new Error(result.error || 'Failed to ingest content')
      }
    } catch (error) {
      console.error('Error ingesting content:', error)
      let message = 'Failed to ingest content'
      if (error instanceof Error) {
        message = error.message
      }
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="tactile-card paper-texture">
      <CardHeader>
        <CardTitle className="font-headline text-charcoal flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Ingest Content
        </CardTitle>
        <CardDescription className="font-body text-charcoal/80">
          Add content to your project from text, URLs, or files for processing and chunking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Content Type Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-charcoal/5 p-1 rounded-squircle-sm">
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-body font-medium rounded-squircle-sm transition-all ${
                activeTab === 'text'
                  ? 'bg-parchment text-charcoal shadow-paper-inner'
                  : 'text-charcoal/60 hover:text-charcoal hover:bg-parchment/50'
              }`}
              onClick={() => setActiveTab('text')}
            >
              Text
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-body font-medium rounded-squircle-sm transition-all ${
                activeTab === 'url'
                  ? 'bg-parchment text-charcoal shadow-paper-inner'
                  : 'text-charcoal/60 hover:text-charcoal hover:bg-parchment/50'
              }`}
              onClick={() => setActiveTab('url')}
            >
              URL
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-body font-medium rounded-squircle-sm transition-all ${
                activeTab === 'file'
                  ? 'bg-parchment text-charcoal shadow-paper-inner'
                  : 'text-charcoal/60 hover:text-charcoal hover:bg-parchment/50'
              }`}
              onClick={() => setActiveTab('file')}
            >
              File
            </button>
          </div>
        </div>

        <form onSubmit={handleContentSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-body font-medium text-charcoal">
              Title (optional)
            </label>
            <input
              id="title"
              type="text"
              className="tactile-input w-full"
              placeholder="e.g., Product Documentation, Blog Post..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-body font-medium text-charcoal">
                Text Content
              </label>
              <Textarea
                id="content"
                className="min-h-32"
                placeholder="Paste your text content here. Markdown formatting is supported..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-charcoal/60 font-body">
                Content will be processed and chunked automatically for better organization.
              </p>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-body font-medium text-charcoal">
                URL
              </label>
              <input
                id="url"
                type="url"
                className="tactile-input w-full"
                placeholder="https://example.com/article"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-charcoal/60 font-body">
                Web content will be extracted and converted to markdown automatically.
              </p>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-2">
              <label htmlFor="file" className="text-sm font-body font-medium text-charcoal">
                File Upload
              </label>
              <div className="border-2 border-dashed border-charcoal/20 rounded-squircle-sm p-6 text-center">
                <input
                  id="file"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
                      toast.error('File size must be less than 10MB')
                      e.target.value = '' // Clear the input
                      return
                    }
                    setSelectedFile(file)
                  }}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-charcoal/40" />
                  <span className="text-sm font-body text-charcoal">
                    {selectedFile ? selectedFile.name : 'Click to select a file'}
                  </span>
                  <span className="text-xs text-charcoal/60 font-body">
                    PDF, DOCX, TXT, or MD files (max 10MB)
                  </span>
                </label>
              </div>
              <p className="text-xs text-charcoal/60 font-body">
                Files will be converted to markdown and chunked automatically.
              </p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="tactile-button"
            disabled={
              isSubmitting || 
              (activeTab === 'text' && !textContent.trim()) ||
              (activeTab === 'url' && !urlContent.trim()) ||
              (activeTab === 'file' && !selectedFile)
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {activeTab === 'file' ? 'Uploading & Processing...' : 'Processing...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Ingest {activeTab === 'text' ? 'Text' : activeTab === 'url' ? 'URL' : 'File'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
