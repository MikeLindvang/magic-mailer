"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { type Project } from "@/lib/schemas/project"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  })

  // Load projects from API
  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/projects')
      
      if (!response.ok) {
        throw new Error('Failed to load projects')
      }
      
      const result = await response.json()
      if (result.ok) {
        setProjects(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  // Create new project
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      setIsCreating(true)
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          status: 'active',
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        toast.success('Project created successfully!')
        setNewProject({ name: "", description: "" })
        setIsDialogOpen(false)
        await loadProjects() // Reload projects
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div className="space-y-8">
      <div className="tactile-card paper-texture p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-4xl font-bold text-charcoal mb-2">Projects</h1>
            <p className="font-body text-charcoal/80 text-lg">
              Manage your email marketing projects
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="tactile-button">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new email marketing project to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-body font-medium text-charcoal">
                  Project Name
                </label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-body font-medium text-charcoal">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Enter project description..."
                  className="tactile-input w-full min-h-[80px] resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-charcoal/60" />
          <span className="ml-3 text-charcoal/60 font-body text-lg">Loading projects...</span>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2 auto-rows-fr">
          {projects.map((project) => (
            <Link key={project._id} href={`/projects/${project._id}`}>
            <div className="tactile-card paper-texture p-8 hover:shadow-paper-lg transition-all duration-200 cursor-pointer h-full min-h-[280px]">
              <div className="flex flex-col h-full space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-squircle-sm text-xs font-body font-medium ${
                      project.status === "active" 
                        ? "bg-sage text-charcoal" 
                        : "bg-charcoal/10 text-charcoal/70"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="font-headline text-2xl font-semibold text-charcoal leading-tight">
                    {project.name}
                  </h3>
                </div>
                <div className="flex-1">
                  <p className="font-body text-charcoal/80 text-base leading-relaxed">
                    {project.description || "No description provided for this project."}
                  </p>
                </div>
                <div className="space-y-2 pt-4 border-t border-charcoal/10">
                  <div className="flex items-center gap-2 text-sm text-charcoal/60">
                    <Calendar className="h-4 w-4" />
                    <span className="font-body">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-charcoal/60">
                    <Users className="h-4 w-4" />
                    <span className="font-body">0 campaigns</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
        
        {projects.length === 0 && (
          <div className="lg:col-span-2">
            <div className="tactile-card paper-texture p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="space-y-3">
                  <h3 className="font-headline text-2xl font-semibold text-charcoal">No projects yet</h3>
                  <p className="font-body text-charcoal/80 text-lg max-w-md">
                    Create your first project to get started with email marketing.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDialogOpen(true)} 
                  className="tactile-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}
