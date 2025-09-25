"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Users, Mail, FileText, Settings, Image, Layers, Wand2, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { type Project } from "@/lib/schemas/project"
import { type Draft } from "@/lib/schemas/draft"
import { type Asset, type GeneratedDraft } from "./types"
import { ContentIngestionForm } from "./components/content-ingestion-form"
import { AssetsList } from "./components/assets-list"
import { GenerateTab } from "./components/generate-tab"
import { DraftsTab } from "./components/drafts-tab"
import { SettingsTab } from "./components/settings-tab"
import { GetResponseModal } from "./components/getresponse-modal"
import { ChunksTab } from "./components/chunks-tab"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  
  // State for project
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  
  // State for assets
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  
  // State for drafts
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true)
  
  // State for generated draft and GetResponse modal
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null)
  const [isGetResponseModalOpen, setIsGetResponseModalOpen] = useState(false)
  
  // State for chunk selection
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([])
  
  // State for focus topic (shared between generate and chunks tabs)
  const [focusTopic, setFocusTopic] = useState<string>('')

  // Load project from API
  const loadProject = useCallback(async () => {
    try {
      setIsLoadingProject(true)
      const response = await fetch(`/api/projects/${projectId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        } else if (response.status === 403) {
          throw new Error('Access denied to this project')
        } else {
          throw new Error(`Failed to load project (${response.status})`)
        }
      }
      
      const result = await response.json()
      if (result.ok) {
        setProject(result.data)
      } else {
        throw new Error(result.error || 'Failed to load project')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      const message = error instanceof Error ? error.message : 'Failed to load project'
      toast.error(message)
    } finally {
      setIsLoadingProject(false)
    }
  }, [projectId])

  // Load assets for the project
  const loadAssets = useCallback(async () => {
    try {
      setIsLoadingAssets(true)
      const response = await fetch(`/api/projects/${projectId}/assets`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          throw new Error(`Failed to load assets (${response.status})`)
        }
      }
      
      const result = await response.json()
      if (result.ok) {
        setAssets(result.data)
      } else {
        throw new Error(result.error || 'Failed to load assets')
      }
    } catch (error) {
      console.error('Error loading assets:', error)
      const message = error instanceof Error ? error.message : 'Failed to load assets'
      toast.error(message)
    } finally {
      setIsLoadingAssets(false)
    }
  }, [projectId])

  // Load drafts for the project
  const loadDrafts = useCallback(async () => {
    try {
      setIsLoadingDrafts(true)
      const response = await fetch(`/api/projects/${projectId}/drafts`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          throw new Error(`Failed to load drafts (${response.status})`)
        }
      }
      
      const result = await response.json()
      if (result.ok) {
        setDrafts(result.data)
      } else {
        throw new Error(result.error || 'Failed to load drafts')
      }
    } catch (error) {
      console.error('Error loading drafts:', error)
      const message = error instanceof Error ? error.message : 'Failed to load drafts'
      toast.error(message)
    } finally {
      setIsLoadingDrafts(false)
    }
  }, [projectId])

  // Load project, assets, and drafts on component mount
  useEffect(() => {
    if (projectId) {
      loadProject()
      loadAssets()
      loadDrafts()
    }
  }, [projectId, loadProject, loadAssets, loadDrafts])

  // Handle draft generation
  const handleDraftGenerated = (draft: GeneratedDraft) => {
    setGeneratedDraft(draft)
  }

  // Handle draft selection from drafts tab
  const handleDraftSelected = (draft: GeneratedDraft) => {
    setGeneratedDraft(draft)
  }

  // Handle opening GetResponse modal
  const handleOpenGetResponseModal = () => {
    setIsGetResponseModalOpen(true)
  }

  // Handle closing GetResponse modal
  const handleCloseGetResponseModal = () => {
    setIsGetResponseModalOpen(false)
  }

  // Handle chunk selection changes
  const handleChunkSelectionChange = (chunkIds: string[]) => {
    setSelectedChunkIds(chunkIds)
  }

  if (isLoadingProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-charcoal/60" />
            <span className="text-charcoal/60 font-body text-lg">Loading project...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Not Found</h1>
            <p className="text-muted-foreground">The project you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.description || "No description"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No campaigns yet</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No subscribers yet</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Project created</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="chunks" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Chunks
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Drafts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                Get an overview of your project&apos;s performance and activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                  <p className="text-sm text-muted-foreground">No recent activity to show.</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button size="sm">Create Campaign</Button>
                    <Button size="sm" variant="outline">Import Contacts</Button>
                    <Button size="sm" variant="outline">View Analytics</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <ContentIngestionForm 
            projectId={projectId}
            onAssetCreated={loadAssets}
          />
          
          <AssetsList
            projectId={projectId}
            assets={assets}
            isLoading={isLoadingAssets}
            onAssetsChange={loadAssets}
          />
        </TabsContent>

        <TabsContent value="chunks" className="space-y-4">
          <ChunksTab
            projectId={projectId}
            isLoading={isLoadingProject}
            selectedChunkIds={selectedChunkIds}
            onChunkSelectionChange={handleChunkSelectionChange}
            focusTopic={focusTopic}
          />
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <GenerateTab
            projectId={projectId}
            assetsCount={assets.length}
            selectedChunkIds={selectedChunkIds}
            onDraftGenerated={handleDraftGenerated}
            onOpenGetResponseModal={handleOpenGetResponseModal}
            onDraftsChange={loadDrafts}
            focusTopic={focusTopic}
            onFocusTopicChange={setFocusTopic}
          />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <DraftsTab
            drafts={drafts}
            isLoading={isLoadingDrafts}
            onDraftSelected={handleDraftSelected}
            onOpenGetResponseModal={handleOpenGetResponseModal}
            onRefresh={loadDrafts}
            projectId={projectId}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab
            project={project}
            projectId={projectId}
            onProjectUpdated={setProject}
          />
        </TabsContent>
      </Tabs>

      <GetResponseModal
        isOpen={isGetResponseModalOpen}
        onClose={handleCloseGetResponseModal}
        generatedDraft={generatedDraft}
      />
    </div>
  )
}
