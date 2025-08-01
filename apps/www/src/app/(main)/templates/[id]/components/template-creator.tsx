import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MapPin, Calendar, Users, Star } from "lucide-react";
import { Template } from "../../data/templates";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

interface TemplateCreatorProps {
  creator: Template["creator"];
}

async function getGitHubUser(username: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    return null;
  }
}

export async function TemplateCreator({ creator }: TemplateCreatorProps) {
  const githubUser = await getGitHubUser(creator.username);
  
  if (!githubUser) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {creator.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{creator.name || creator.username}</h3>
              <p className="text-sm text-muted-foreground">@{creator.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const joinDate = new Date(githubUser.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={githubUser.avatar_url} alt={githubUser.name || githubUser.login} />
                <AvatarFallback>
                  {(githubUser.name || githubUser.login).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-xl">{githubUser.name || githubUser.login}</h3>
                <p className="text-sm text-muted-foreground">@{githubUser.login}</p>
                {githubUser.bio && (
                  <p className="text-sm text-foreground/80 mt-1 max-w-md">{githubUser.bio}</p>
                )}
              </div>
            </div>
            <a
              href={githubUser.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
              View Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {githubUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{githubUser.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {joinDate}</span>
            </div>
          </div>
          
          {/* GitHub Stats */}
          <div className="flex gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {githubUser.public_repos} repositories
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {githubUser.followers} followers
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}