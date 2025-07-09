'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountStats } from "@/lib/hooks";
import { Clock, Phone, PhoneCall, Timer } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading, error } = useAccountStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold h-6 bg-muted rounded"></div>
              <p className="text-xs text-muted-foreground mt-2 h-4 bg-muted rounded w-2/3"></p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load account statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      title: "Total Calls",
      value: stats.total_calls.toLocaleString(),
      description: "Total calls tracked",
      icon: <Phone className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Connected Calls",
      value: stats.connected_calls.toLocaleString(),
      description: "Current active calls",
      icon: <PhoneCall className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Average Duration",
      value: `${Math.floor(stats.average_duration / 60)}:${(stats.average_duration % 60).toString().padStart(2, '0')}`,
      description: "Average call time (min:sec)",
      icon: <Timer className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Total Minutes",
      value: stats.total_minutes.toLocaleString(),
      description: "Total minutes used",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 