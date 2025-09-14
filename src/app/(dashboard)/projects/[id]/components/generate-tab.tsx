"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wand2, Loader2, Mail, Send } from "lucide-react"
import { toast } from "sonner"
import { type GeneratedDraft } from "../types"

interface GenerateTabProps {
  projectId: string;
  assetsCount: number;
  selectedChunkIds?: string[];
  onDraftGenerated: (draft: GeneratedDraft) => void;
  onOpenGetResponseModal: () => void;
  onDraftsChange: () => void;
}

export function GenerateTab({ 
  projectId, 
  assetsCount, 
  selectedChunkIds = [],
  onDraftGenerated, 
  onOpenGetResponseModal,
  onDraftsChange 
}: GenerateTabProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null)

  // Generate PAS draft
  const handleGenerateDraft = async () => {
    try {
      setIsGenerating(true)
      setGeneratedDraft(null) // Clear previous draft
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          angle: 'PAS',
          length: 'medium',
          selectedChunkIds: selectedChunkIds.length > 0 ? selectedChunkIds : undefined,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || `Failed to generate draft (${response.status})`)
      }

      const result = await response.json()
      
      if (result.ok) {
        const { draft } = result.data
        const generatedDraftData = {
          subject: draft.subject,
          html: draft.formats.html,
          preheader: draft.preheader,
        }
        
        setGeneratedDraft(generatedDraftData)
        onDraftGenerated(generatedDraftData)
        toast.success('PAS draft generated successfully!')
        
        // Refresh drafts list to include the newly generated draft
        onDraftsChange()
      } else {
        throw new Error(result.error || 'Failed to generate draft')
      }
    } catch (error) {
      console.error('Error generating draft:', error)
      let message = 'Failed to generate draft'
      if (error instanceof Error) {
        message = error.message
        // Provide more specific error messages for common issues
        if (message.includes('No relevant content found')) {
          message = 'No content available for generation. Please add some assets first.'
        } else if (message.includes('OpenAI API error')) {
          message = 'AI service temporarily unavailable. Please try again.'
        }
      }
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="tactile-card paper-texture">
      <CardHeader>
        <CardTitle className="font-headline text-charcoal flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Generate PAS Email
        </CardTitle>
        <CardDescription className="font-body text-charcoal/80">
          Generate a Problem-Agitate-Solution email using your project content and AI.
          {selectedChunkIds.length > 0 && (
            <span className="block mt-2 text-terracotta font-medium">
              Using {selectedChunkIds.length} selected chunk{selectedChunkIds.length > 1 ? 's' : ''} as focal points
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center text-center py-4">
          <Wand2 className="h-12 w-12 text-charcoal/40 mb-4" />
          <h3 className="text-lg font-headline font-semibold mb-2 text-charcoal">
            Ready to Generate
          </h3>
          <p className="text-charcoal/60 font-body mb-6 max-w-md">
            {selectedChunkIds.length > 0 ? (
              <>Click the button below to generate a PAS-format email draft focused on your {selectedChunkIds.length} selected chunk{selectedChunkIds.length > 1 ? 's' : ''}.</>
            ) : (
              <>Click the button below to generate a PAS-format email draft using your project's content and AI. Select specific chunks in the Chunks tab to focus the email on particular content.</>
            )}
          </p>
          
          <Button 
            onClick={handleGenerateDraft}
            className="tactile-button"
            disabled={isGenerating || assetsCount === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Draft...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate PAS Draft
              </>
            )}
          </Button>
          
          {assetsCount === 0 && (
            <p className="text-xs text-charcoal/60 font-body mt-2">
              Add some content in the Assets tab first to generate emails.
            </p>
          )}
        </div>

        {/* Preview Section */}
        {generatedDraft && (
          <div className="border-t border-charcoal/10 pt-6">
            <h4 className="text-lg font-headline font-semibold mb-4 text-charcoal">
              Generated Draft Preview
            </h4>
            
            <div className="space-y-4">
              {/* Subject Line */}
              <div className="tactile-card bg-parchment/50 p-4">
                <label className="text-sm font-body font-medium text-charcoal mb-2 block">
                  Subject Line
                </label>
                <p className="font-body text-charcoal font-medium">
                  {generatedDraft.subject}
                </p>
              </div>

              {/* Preheader */}
              <div className="tactile-card bg-parchment/50 p-4">
                <label className="text-sm font-body font-medium text-charcoal mb-2 block">
                  Preheader
                </label>
                <p className="font-body text-charcoal/80 text-sm">
                  {generatedDraft.preheader}
                </p>
              </div>

              {/* HTML Preview */}
              <div className="tactile-card bg-parchment/50 p-4">
                <label className="text-sm font-body font-medium text-charcoal mb-2 block">
                  Email Content Preview
                </label>
                <div 
                  className="bg-white rounded-squircle-sm p-4 border border-charcoal/10 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generatedDraft.html }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  className="tactile-button"
                  onClick={async () => {
                    // The draft is already saved when generated, just refresh the drafts list
                    onDraftsChange()
                    toast.success('Draft saved! Check the Drafts tab.')
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                
                <Button 
                  className="tactile-button"
                  onClick={onOpenGetResponseModal}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to GetResponse
                </Button>
                
                <Button 
                  variant="outline"
                  className="tactile-button-secondary"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
