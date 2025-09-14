"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { type Project } from "@/lib/schemas/project"

interface SettingsTabProps {
  project: Project;
  projectId: string;
  onProjectUpdated: (updatedProject: Project) => void;
}

export function SettingsTab({ project, projectId, onProjectUpdated }: SettingsTabProps) {
  const [styleProfileId, setStyleProfileId] = useState(project.style_profile_id || '')
  const [isSavingStyleProfile, setIsSavingStyleProfile] = useState(false)

  // Save style profile
  const handleSaveStyleProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSavingStyleProfile(true)
      
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          style_profile_id: styleProfileId.trim() || undefined,
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        onProjectUpdated(result.data)
        toast.success('Style profile updated successfully!')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error saving style profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save style profile')
    } finally {
      setIsSavingStyleProfile(false)
    }
  }

  return (
    <Card className="tactile-card paper-texture">
      <CardHeader>
        <CardTitle className="font-headline text-charcoal">Project Settings</CardTitle>
        <CardDescription className="font-body text-charcoal/80">
          Configure your project settings and preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-body font-medium mb-2 text-charcoal">General</h4>
          <div className="space-y-2">
            <div>
              <label className="text-sm font-body text-charcoal">Project Name</label>
              <p className="text-sm text-charcoal/80 font-body">{project.name}</p>
            </div>
            <div>
              <label className="text-sm font-body text-charcoal">Description</label>
              <p className="text-sm text-charcoal/80 font-body">{project.description || "No description"}</p>
            </div>
            <div>
              <label className="text-sm font-body text-charcoal">Status</label>
              <p className="text-sm text-charcoal/80 font-body">{project.status}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-charcoal/10 pt-6">
          <h4 className="text-sm font-body font-medium mb-4 text-charcoal">Style Profile</h4>
          <form onSubmit={handleSaveStyleProfile} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="styleProfileId" className="text-sm font-body font-medium text-charcoal">
                Style Profile ID
              </label>
              <input
                id="styleProfileId"
                type="text"
                className="tactile-input w-full"
                placeholder="e.g., professional-newsletter, casual-blog..."
                value={styleProfileId}
                onChange={(e) => setStyleProfileId(e.target.value)}
                disabled={isSavingStyleProfile}
              />
              <p className="text-xs text-charcoal/60 font-body">
                Enter a style profile ID to customize the tone and formatting of generated content.
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="tactile-button"
              disabled={isSavingStyleProfile}
            >
              {isSavingStyleProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Style Profile
                </>
              )}
            </Button>
          </form>
        </div>
        
        <div className="border-t border-charcoal/10 pt-6">
          <Button variant="outline" className="tactile-button-secondary">
            Edit Project Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
