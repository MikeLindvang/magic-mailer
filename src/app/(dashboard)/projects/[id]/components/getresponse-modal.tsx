"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { type GeneratedDraft, type GetResponseResult } from "../types"

interface GetResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedDraft: GeneratedDraft | null;
}

export function GetResponseModal({ isOpen, onClose, generatedDraft }: GetResponseModalProps) {
  const [campaignId, setCampaignId] = useState('')
  const [fromFieldId, setFromFieldId] = useState('')
  const [isSendingToGR, setIsSendingToGR] = useState(false)
  const [grResult, setGrResult] = useState<GetResponseResult | null>(null)

  // Reset modal state when closing
  const handleModalClose = () => {
    setCampaignId('')
    setFromFieldId('')
    setGrResult(null)
    onClose()
  }

  // Send draft to GetResponse
  const handleSendToGetResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!generatedDraft) {
      toast.error('No draft available to send')
      return
    }
    
    if (!campaignId.trim() || !fromFieldId.trim()) {
      toast.error('Please fill in both Campaign ID and From Field ID')
      return
    }

    try {
      setIsSendingToGR(true)
      setGrResult(null)
      
      const response = await fetch('/api/getresponse/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId.trim(),
          fromFieldId: fromFieldId.trim(),
          subject: generatedDraft.subject,
          preheader: generatedDraft.preheader,
          html: generatedDraft.html,
          plain: generatedDraft.html.replace(/<[^>]*>/g, ''), // Simple HTML to text conversion
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || `Failed to send to GetResponse (${response.status})`)
      }

      const result = await response.json()
      
      if (result.ok) {
        setGrResult(result.data)
        toast.success('Draft sent to GetResponse successfully!')
        // Keep modal open to show the result
      } else {
        throw new Error(result.error || 'Failed to send to GetResponse')
      }
    } catch (error) {
      console.error('Error sending to GetResponse:', error)
      let message = 'Failed to send to GetResponse'
      if (error instanceof Error) {
        message = error.message
        // Provide more specific error messages for common GetResponse issues
        if (message.includes('GetResponse connection not found')) {
          message = 'GetResponse not connected. Please connect your account in Settings.'
        } else if (message.includes('Invalid GetResponse API key')) {
          message = 'GetResponse connection expired. Please reconnect your account.'
        } else if (message.includes('Campaign or From Field not found')) {
          message = 'Invalid Campaign ID or From Field ID. Please check your settings.'
        }
      }
      toast.error(message)
    } finally {
      setIsSendingToGR(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleModalClose()
    }}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={handleModalClose} 
        onEscapeKeyDown={handleModalClose}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-charcoal">
            Send Draft to GetResponse
          </DialogTitle>
          <DialogDescription className="font-body text-charcoal/80">
            Enter your GetResponse campaign and from field details to create a newsletter draft.
          </DialogDescription>
        </DialogHeader>
        
        {!grResult ? (
          <form onSubmit={handleSendToGetResponse} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="campaignId" className="text-sm font-body font-medium text-charcoal">
                Campaign ID
              </label>
              <Input
                id="campaignId"
                className="tactile-input"
                placeholder="e.g., abc123"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                disabled={isSendingToGR}
                required
              />
              <p className="text-xs text-charcoal/60 font-body">
                Your GetResponse campaign ID where the newsletter will be created.
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="fromFieldId" className="text-sm font-body font-medium text-charcoal">
                From Field ID
              </label>
              <Input
                id="fromFieldId"
                className="tactile-input"
                placeholder="e.g., def456"
                value={fromFieldId}
                onChange={(e) => setFromFieldId(e.target.value)}
                disabled={isSendingToGR}
                required
              />
              <p className="text-xs text-charcoal/60 font-body">
                The from field ID to use for the newsletter sender information.
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                className="tactile-button-secondary"
                onClick={handleModalClose}
                disabled={isSendingToGR}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="tactile-button"
                disabled={isSendingToGR || !campaignId.trim() || !fromFieldId.trim()}
              >
                {isSendingToGR ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to GetResponse
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="tactile-card bg-sage/10 p-4 text-center">
              <Mail className="h-8 w-8 text-sage mx-auto mb-2" />
              <h4 className="font-headline font-semibold text-charcoal mb-2">
                Draft Created Successfully!
              </h4>
              <p className="text-sm font-body text-charcoal/80 mb-4">
                Your newsletter draft has been created in GetResponse.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-body text-charcoal/60">
                  Newsletter ID: <span className="font-mono">{grResult.newsletterId}</span>
                </p>
                <Button 
                  className="tactile-button w-full"
                  onClick={() => window.open(grResult.openUrl, '_blank')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Open in GetResponse
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                className="tactile-button-secondary w-full"
                onClick={handleModalClose}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
