'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink, Hash, MessageSquare, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

interface RateDeckAssignment {
  id: string;
  rateDeckId: string;
  rateDeckType: 'number' | 'sms';
  rateDeckName: string;
  rateDeckDescription: string;
  assignedBy: string;
  assignedAt: string;
}

interface UserRateDecksProps {
  userId: string;
}

export function UserRateDecks({ userId }: UserRateDecksProps) {
  const [assignments, setAssignments] = useState<RateDeckAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAssignments();
    }
  }, [userId]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/assignments`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch assignments');
      }
      
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load rate deck assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const getRateDeckIcon = (type: string) => {
    return type === 'number' ? Hash : MessageSquare;
  };

  const getRateDeckBadgeVariant = (type: string) => {
    return type === 'number' ? 'default' : 'secondary';
  };

  const openRateDeck = (assignment: RateDeckAssignment) => {
    const rateDeckPath = assignment.rateDeckType === 'number' ? 'numbers' : 'sms';
    const url = `/rates/${rateDeckPath}/decks/${assignment.rateDeckId}/rates`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Hash className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">No Rate Decks Assigned</p>
            <p className="text-sm text-muted-foreground">
              This user is not currently assigned to any rate decks
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Assigned Rate Decks</h3>
          <p className="text-sm text-muted-foreground">
            Rate decks currently assigned to this user ({assignments.length})
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {assignments.map((assignment) => {
          const Icon = getRateDeckIcon(assignment.rateDeckType);
          const dateInfo = formatDate(assignment.assignedAt);
          
          return (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{assignment.rateDeckName}</CardTitle>
                      <CardDescription className="mt-1">
                        {assignment.rateDeckDescription || 'No description available'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRateDeckBadgeVariant(assignment.rateDeckType)}>
                      {assignment.rateDeckType === 'number' ? 'Number Rates' : 'SMS Rates'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRateDeck(assignment)}
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Open</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>Assigned by {assignment.assignedBy}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{dateInfo.date} at {dateInfo.time}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 