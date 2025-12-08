import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Shield, Eye, Edit2, UserCheck, Trash2, Loader2, Mail, AlertCircle, Crown, Code, User, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer';

const roleIcons: Record<AppRole, any> = {
  admin: Crown,
  reviewer: Shield,
  analyst: Code,
  viewer: Eye,
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-danger/10 text-danger border-danger/30",
  reviewer: "bg-warning/10 text-warning border-warning/30",
  analyst: "bg-primary/10 text-primary border-primary/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const roleDescriptions: Record<AppRole, string> = {
  admin: "Full access to all features and settings",
  reviewer: "Can approve/reject models and review queue items",
  analyst: "Can run evaluations and view detailed analytics",
  viewer: "Read-only access to dashboards and reports",
};

interface UserWithRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

const emailSchema = z.string().email("Please enter a valid email address");

export function UsersTeamsSection() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  const [emailError, setEmailError] = useState("");

  // Fetch all user roles with profiles
  const { data: users, isLoading } = useQuery({
    queryKey: ['user-roles-with-profiles'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;

      // Type assertion to handle the joined data
      return (roles || []).map(r => ({
        ...r,
        profile: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })) as UserWithRole[];
    },
  });

  // Add user role mutation
  const addUserRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // In a real app, you'd invite the user or look them up
      // For now, we'll show an error since we can't create users directly
      toast.info("In production, this would send an invitation email to " + email);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      setIsAddDialogOpen(false);
      setNewUserEmail("");
      setNewUserRole("viewer");
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      toast.success("User role updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  // Delete user role mutation
  const deleteUserRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      toast.success("User removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove user: " + error.message);
    },
  });

  const handleAddUser = () => {
    const result = emailSchema.safeParse(newUserEmail);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }
    setEmailError("");
    addUserRole.mutate({ email: newUserEmail, role: newUserRole });
  };

  const filteredUsers = users?.filter(u => 
    u.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Users & Teams</h2>
          <p className="text-sm text-muted-foreground">Manage user access and permissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Invite a new user to your organization and assign their role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="user@company.com"
                  value={newUserEmail}
                  onChange={(e) => {
                    setNewUserEmail(e.target.value);
                    setEmailError("");
                  }}
                  className="bg-secondary border-border"
                />
                {emailError && (
                  <p className="text-sm text-danger mt-1">{emailError}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleDescriptions) as AppRole[]).map(role => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = roleIcons[role];
                            return <Icon className="w-4 h-4" />;
                          })()}
                          <span className="capitalize">{role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {roleDescriptions[newUserRole]}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="gradient" 
                onClick={handleAddUser}
                disabled={addUserRole.isPending}
              >
                {addUserRole.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(roleDescriptions) as AppRole[]).map(role => {
          const Icon = roleIcons[role];
          return (
            <div key={role} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className={cn("gap-1", roleColors[role])}>
                <Icon className="w-3 h-3" />
                <span className="capitalize">{role}</span>
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-secondary/30 rounded-xl border border-border">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery ? "Try a different search term" : "Add your first team member"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => {
            const Icon = roleIcons[user.role];
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {user.profile?.avatar_url ? (
                      <img 
                        src={user.profile.avatar_url} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {user.profile?.full_name || 'Unnamed User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Select 
                    value={user.role} 
                    onValueChange={(role) => updateUserRole.mutate({ id: user.id, role: role as AppRole })}
                  >
                    <SelectTrigger className={cn("w-32 h-8", roleColors[user.role])}>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <Icon className="w-3 h-3" />
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleDescriptions) as AppRole[]).map(role => {
                        const RoleIcon = roleIcons[role];
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="w-4 h-4" />
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Edit2 className="w-4 h-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2 text-danger focus:text-danger"
                        onClick={() => deleteUserRole.mutate(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
