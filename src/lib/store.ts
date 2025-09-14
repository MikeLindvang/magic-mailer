import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived'
  createdAt: string
  updatedAt: string
}

interface ProjectStore {
  projects: Project[]
  addProject: (project: Omit<Project, 'id'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  getProject: (id: string) => Project | undefined
}

// Dummy data for demonstration
const dummyProjects: Project[] = [
  {
    id: '1',
    name: 'Welcome Series',
    description: 'Onboarding email sequence for new customers',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Product Launch Campaign',
    description: 'Email campaign for our new product launch',
    status: 'active',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: '3',
    name: 'Newsletter Template',
    description: 'Monthly newsletter template and content',
    status: 'inactive',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
  },
]

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: dummyProjects,
  
  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: nanoid(),
    }
    set((state) => ({
      projects: [...state.projects, newProject],
    }))
  },
  
  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      ),
    }))
  },
  
  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }))
  },
  
  getProject: (id) => {
    return get().projects.find((project) => project.id === id)
  },
}))
