'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Play, Pause, Square, Archive, Edit, Trash2, CalendarDays, Users, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCampaignModal } from './CreateCampaignModal';

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'failed' | 'archived' | 'stopped';
  contactCount: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  scheduledAt?: string;
  createdAt: string;
  message: string;
  estimatedCost: number;
  actualCost: number;
  progress: number;
  contactListId?: string;
  templateId?: string;
  providerId?: string;
  senderId?: string;
  country?: string;
}

// Utility function to format template variables as small tags
const formatMessagePreview = (message: string) => {
  // Split message into parts, keeping the template variables
  const parts = message.split(/(\{\{[^}]+\}\})/g);
  
  return parts.map((part, index) => {
    // Check if this part is a template variable
    const match = part.match(/\{\{([^}]+)\}\}/);
    if (match) {
      const variable = match[1];
      let displayName = variable;
      
      // Convert to friendly names
      switch (variable) {
        case 'fullName': displayName = 'Full Name'; break;
        case 'firstName': displayName = 'First Name'; break;
        case 'lastName': displayName = 'Last Name'; break;
        case 'phone': displayName = 'Phone'; break;
        case 'phoneNumber': displayName = 'Phone Number'; break;
        case 'email': displayName = 'Email'; break;
        case 'address': displayName = 'Address'; break;
        case 'city': displayName = 'City'; break;
        case 'zipCode': displayName = 'Zip Code'; break;
        case 'dateOfBirth': displayName = 'Date of Birth'; break;
        case 'company': displayName = 'Company'; break;
        case 'department': displayName = 'Department'; break;
        case 'notes': displayName = 'Notes'; break;
        case 'customField1': displayName = 'Custom Field 1'; break;
        case 'customField2': displayName = 'Custom Field 2'; break;
        case 'customField3': displayName = 'Custom Field 3'; break;
        case 'customField4': displayName = 'Custom Field 4'; break;
        case 'customField5': displayName = 'Custom Field 5'; break;
        default: displayName = variable;
      }
      
      return (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs px-1.5 py-0.5 h-5 mx-0.5 bg-blue-100 text-blue-700 hover:bg-blue-100"
        >
          {displayName}
        </Badge>
      );
    }
    
    // Regular text part
    return part;
  });
};

export function SmsCampaigns() {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Set up real-time updates for active campaigns
  useEffect(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'sending');
    
    if (activeCampaigns.length === 0) {
      return; // No active campaigns to monitor
    }

    // Poll for updates every 3 seconds for active campaigns
    const interval = setInterval(async () => {
      try {
        const updatePromises = activeCampaigns.map(async (campaign) => {
          const response = await fetch(`/api/sms/campaigns/${campaign._id}/progress`);
          if (response.ok) {
            const data = await response.json();
            return {
              campaignId: campaign._id,
              progress: data.progress,
              costs: data.costs,
              status: data.status,
              timestamps: data.timestamps
            };
          }
          return null;
        });

        const updates = await Promise.all(updatePromises);
        
        // Update campaigns state with new progress data
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => {
            const update = updates.find(u => u?.campaignId === campaign._id);
            if (update) {
              return {
                ...campaign,
                progress: update.progress.percentage,
                sentCount: update.progress.sentCount,
                failedCount: update.progress.failedCount,
                deliveredCount: update.progress.deliveredCount,
                actualCost: update.costs.actualCost,
                status: update.status as Campaign['status']
              };
            }
            return campaign;
          })
        );
      } catch (error) {
        console.error('Error updating campaign progress:', error);
      }
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [campaigns]); // Re-run when campaigns change

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/sms/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      } else {
        toast.error('Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'stopped': return 'bg-purple-100 text-purple-800';
      case 'archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return t('sms.campaigns.status.draft');
      case 'scheduled': return t('sms.campaigns.status.scheduled');
      case 'sending': return t('sms.campaigns.status.sending');
      case 'completed': return t('sms.campaigns.status.completed');
      case 'paused': return t('sms.campaigns.status.paused');
      case 'failed': return t('sms.campaigns.status.failed');
      case 'stopped': return t('sms.campaigns.status.stopped');
      case 'archived': return t('sms.campaigns.status.archived');
      default: return status;
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'stop' | 'archive' | 'restart') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sms/campaigns/${campaignId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(`Campaign ${action}ed successfully`);
        loadCampaigns();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} campaign`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} campaign`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sms/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCampaigns(prev => prev.filter(campaign => campaign._id !== campaignId));
        toast.success('Campaign deleted successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete campaign');
      }
    } catch (error) {
      toast.error('Failed to delete campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignCreated = () => {
    loadCampaigns();
    setIsModalOpen(false);
  };

  const canStart = (campaign: Campaign) => 
    ['draft', 'paused', 'scheduled'].includes(campaign.status);
  
  const canPause = (campaign: Campaign) => 
    campaign.status === 'sending';
  
  const canStop = (campaign: Campaign) => 
    ['sending', 'paused'].includes(campaign.status);
  
  const canArchive = (campaign: Campaign) => 
    ['completed', 'failed', 'stopped'].includes(campaign.status);

  const canRestart = (campaign: Campaign) => 
    ['completed', 'stopped', 'failed'].includes(campaign.status);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('sms.campaigns.title')}</h2>
          <p className="text-muted-foreground">{t('sms.campaigns.description')}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t('sms.campaigns.list.title')}
                </CardTitle>
                <CardDescription>
                  View and manage your SMS campaigns
                </CardDescription>
              </div>
              <Button 
                className="flex items-center gap-2"
                onClick={handleCreateCampaign}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                {t('sms.campaigns.create.button')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mt-4">{t('sms.campaigns.list.empty')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first SMS campaign to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign._id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {getStatusText(campaign.status)}
                          </Badge>
                        </div>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canStart(campaign) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign._id, 'start')}
                            disabled={isLoading}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {canPause(campaign) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign._id, 'pause')}
                            disabled={isLoading}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {canStop(campaign) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign._id, 'stop')}
                            disabled={isLoading}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive(campaign) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign._id, 'archive')}
                            disabled={isLoading}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {canRestart(campaign) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign._id, 'restart')}
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCampaign(campaign)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampaign(campaign._id)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{campaign.contactCount} contacts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{campaign.sentCount} sending</span>
                      </div>
                      {campaign.deliveredCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{campaign.deliveredCount} delivered</span>
                        </div>
                      )}
                      {campaign.failedCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span>
                          <span>{campaign.failedCount} failed</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cost:</span>
                        <span>
                          {campaign.status === 'completed' ? (
                            <span className="text-green-600 font-medium">${campaign.actualCost.toFixed(2)}</span>
                          ) : campaign.status === 'draft' ? (
                            <span className="text-muted-foreground">~${campaign.estimatedCost.toFixed(2)}</span>
                          ) : campaign.actualCost > 0 ? (
                            <span className="text-blue-600 font-medium">${campaign.actualCost.toFixed(2)} (running)</span>
                          ) : (
                            <span className="text-muted-foreground">~${campaign.estimatedCost.toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                      {campaign.scheduledAt && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {campaign.status === 'sending' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{campaign.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground border-t pt-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap items-center gap-0.5 line-clamp-2">
                          {formatMessagePreview(campaign.message)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCampaignCreated={handleCampaignCreated}
        editingCampaign={editingCampaign}
      />
    </>
  );
} 