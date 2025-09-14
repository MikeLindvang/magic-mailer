"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Settings, Key, User, Mail, Loader2, Plus, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { type UserConnection } from "@/lib/schemas/userConnection"

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [connections, setConnections] = useState<UserConnection[]>([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false)
  const [isSavingApiKey, setIsSavingApiKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)

  // Load user connections from API
  const loadConnections = async () => {
    try {
      setIsLoadingConnections(true)
      const response = await fetch('/api/connections')
      
      if (!response.ok) {
        throw new Error('Failed to load connections')
      }
      
      const result = await response.json()
      if (result.ok) {
        setConnections(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load connections')
    } finally {
      setIsLoadingConnections(false)
    }
  }

  // Save GetResponse API key
  const handleSaveApiKey = async () => {
    if (!newApiKey.trim()) {
      toast.error('API key is required')
      return
    }

    try {
      setIsSavingApiKey(true)
      
      const response = await fetch('/api/connections/getresponse/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: newApiKey,
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        toast.success('GetResponse API key saved successfully!')
        setNewApiKey("")
        setIsApiKeyDialogOpen(false)
        await loadConnections() // Reload connections
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setIsSavingApiKey(false)
    }
  }

  // Load connections on component mount
  useEffect(() => {
    if (isLoaded) {
      loadConnections()
    }
  }, [isLoaded])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-charcoal/60" />
        <span className="ml-3 text-charcoal/60 font-body text-lg">Loading settings...</span>
      </div>
    )
  }

  const getResponseConnection = connections.find(conn => conn.provider === 'getresponse')

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="tactile-card paper-texture p-8">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-charcoal" />
          <div>
            <h1 className="font-headline text-4xl font-bold text-charcoal mb-2">Settings</h1>
            <p className="font-body text-charcoal/80 text-lg">
              Manage your account and integrations
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* User Profile Section */}
        <div className="tactile-card paper-texture p-8">
          <div className="flex items-center space-x-3 mb-6">
            <User className="h-6 w-6 text-charcoal" />
            <h2 className="font-headline text-2xl font-semibold text-charcoal">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-charcoal mb-2">
                Full Name
              </label>
              <div className="tactile-input w-full bg-charcoal/5 cursor-not-allowed">
                {user?.fullName || 'Not provided'}
              </div>
              <p className="text-xs text-charcoal/60 mt-1 font-body">
                Managed by your authentication provider
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-body font-medium text-charcoal mb-2">
                Email Address
              </label>
              <div className="tactile-input w-full bg-charcoal/5 cursor-not-allowed">
                {user?.primaryEmailAddress?.emailAddress || 'Not provided'}
              </div>
              <p className="text-xs text-charcoal/60 mt-1 font-body">
                Managed by your authentication provider
              </p>
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-charcoal mb-2">
                User ID
              </label>
              <div className="tactile-input w-full bg-charcoal/5 cursor-not-allowed font-mono text-sm">
                {user?.id}
              </div>
              <p className="text-xs text-charcoal/60 mt-1 font-body">
                Your unique identifier in the system
              </p>
            </div>
          </div>
        </div>

        {/* API Connections Section */}
        <div className="tactile-card paper-texture p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Key className="h-6 w-6 text-charcoal" />
              <h2 className="font-headline text-2xl font-semibold text-charcoal">API Connections</h2>
            </div>
            
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
              <DialogTrigger asChild>
                <button className="tactile-button-secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Connection
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add GetResponse API Key</DialogTitle>
                  <DialogDescription>
                    Connect your GetResponse account to enable email marketing features.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="apiKey" className="block text-sm font-body font-medium text-charcoal">
                      API Key
                    </label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="Enter your GetResponse API key..."
                        className="tactile-input w-full pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-charcoal/60" />
                        ) : (
                          <Eye className="h-4 w-4 text-charcoal/60" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-charcoal/60 font-body">
                      Your API key will be encrypted and stored securely
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)} disabled={isSavingApiKey}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveApiKey} disabled={isSavingApiKey}>
                    {isSavingApiKey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save API Key'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-charcoal/60" />
              <span className="ml-3 text-charcoal/60 font-body">Loading connections...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {getResponseConnection ? (
                <div className="border border-charcoal/10 rounded-squircle p-4 bg-parchment/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-sage" />
                      <div>
                        <h3 className="font-body font-medium text-charcoal">GetResponse</h3>
                        <p className="text-sm text-charcoal/60 font-body">
                          API Key: {getResponseConnection.data.masked}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-sage/20 text-sage border-sage/30">
                        Connected
                      </Badge>
                      <button 
                        className="p-2 hover:bg-charcoal/5 rounded-squircle-sm transition-colors"
                        onClick={() => setIsApiKeyDialogOpen(true)}
                        title="Update API Key"
                      >
                        <Key className="h-4 w-4 text-charcoal/60" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-charcoal/20 rounded-squircle">
                  <Mail className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
                  <h3 className="font-headline text-lg font-medium text-charcoal mb-2">
                    No connections yet
                  </h3>
                  <p className="text-charcoal/60 font-body mb-4">
                    Connect your GetResponse account to start sending emails
                  </p>
                  <button 
                    onClick={() => setIsApiKeyDialogOpen(true)}
                    className="tactile-button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add GetResponse Connection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings Sections */}
      <div className="tactile-card paper-texture p-8">
        <h2 className="font-headline text-2xl font-semibold text-charcoal mb-6">Account Actions</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-charcoal/10 rounded-squircle">
            <div>
              <h3 className="font-body font-medium text-charcoal">Export Data</h3>
              <p className="text-sm text-charcoal/60 font-body">
                Download all your project data and settings
              </p>
            </div>
            <button className="tactile-button-secondary">
              Export
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-charcoal/10 rounded-squircle">
            <div>
              <h3 className="font-body font-medium text-charcoal">Delete Account</h3>
              <p className="text-sm text-charcoal/60 font-body">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="px-4 py-2 bg-terracotta/10 text-terracotta border border-terracotta/30 rounded-squircle font-body font-medium hover:bg-terracotta/20 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
