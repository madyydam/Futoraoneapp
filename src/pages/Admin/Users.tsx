import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    CheckCircle,
    Mail,
    XCircle,
    Trash2,
    Edit2,
    Settings as SettingsIcon,
    AlertTriangle,
    Search,
    Filter,
    Download,
    Shield,
    MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        full_name: "",
        username: "",
        bio: "",
        is_verified: false,
        verification_category: "",
        is_banned: false
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: any) => {
        setSelectedUser(user);
        setEditForm({
            full_name: user.full_name || "",
            username: user.username || "",
            bio: user.bio || "",
            is_verified: !!user.is_verified,
            verification_category: user.verification_category || "",
            is_banned: !!user.is_banned
        });
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (user: any) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: editForm.full_name,
                    username: editForm.username,
                    bio: editForm.bio,
                    is_verified: editForm.is_verified,
                    verification_category: editForm.verification_category,
                    is_banned: editForm.is_banned
                })
                .eq("id", selectedUser.id);

            if (error) throw error;

            toast({
                title: "User Updated",
                description: "User profile has been updated successfully.",
            });
            setIsEditDialogOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            toast({
                title: "Error",
                description: "Failed to update user profile",
                variant: "destructive",
            });
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            // Note: This only deletes the profile. Auth deletion requires edge function.
            const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("id", selectedUser.id);

            if (error) throw error;

            toast({
                title: "User Deleted",
                description: "User profile has been deleted from the database.",
            });
            setIsDeleteDialogOpen(false);
            setUsers(users.filter(u => u.id !== selectedUser.id));
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Error",
                description: "Failed to delete user profile",
                variant: "destructive",
            });
        }
    };

    const handleVerifyAll = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from("profiles")
                .update({ is_verified: true })
                .eq("is_verified", false);

            if (error) throw error;

            toast({
                title: "Action Successful",
                description: "All unverified users have been verified.",
            });
            fetchUsers();
        } catch (error) {
            console.error("Error verifying all users:", error);
            toast({
                title: "Mass Action Failed",
                description: "Could not verify all users.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleVerification = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ is_verified: !currentStatus })
                .eq("id", userId);

            if (error) throw error;

            // Update local state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, is_verified: !currentStatus } : user
            ));

            toast({
                title: currentStatus ? "User Unverified" : "User Verified",
                description: `User has been ${currentStatus ? "unverified" : "verified"} successfully.`,
            });

        } catch (error) {
            console.error("Error toggling verification:", error);
            toast({
                title: "Error",
                description: "Failed to update user status",
                variant: "destructive",
            });
        }
    };

    const toggleBan = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ is_banned: !currentStatus })
                .eq("id", userId);

            if (error) throw error;

            // Update local state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, is_banned: !currentStatus } : user
            ));

            toast({
                title: currentStatus ? "User Unbanned" : "User Banned",
                description: `User has been ${currentStatus ? "unbanned" : "banned"} from the platform.`,
                variant: currentStatus ? "default" : "destructive"
            });

        } catch (error) {
            console.error("Error toggling ban status:", error);
            toast({
                title: "Error",
                description: "Failed to update ban status",
                variant: "destructive",
            });
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user =>
    (user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Users</h2>
                        <p className="text-slate-500 font-medium">Manage user accounts and roles.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-3 h-12 px-8 rounded-xl transition-all font-bold"
                            onClick={handleVerifyAll}
                        >
                            <Shield className="w-5 h-5" />
                            Verify All
                        </Button>
                        <Button variant="outline" className="gap-3 h-12 px-8 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm">
                            <Download className="w-5 h-5" />
                            Export
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/20 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search by name or username..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="pl-14 h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 font-medium placeholder:text-slate-300 text-lg"
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="w-14 h-14 rounded-xl hover:bg-slate-50 text-slate-500">
                        <Filter className="w-6 h-6" />
                    </Button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">User</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Role</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Status</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Joined</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                                </TableRow>
                            ) : filteredUsers.map((user) => (
                                <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-10 h-10 border border-slate-200">
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback className="bg-slate-100 text-slate-900 font-bold">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm leading-none mb-1">{user.full_name || user.username}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">@{user.username}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`font-bold px-3 py-0.5 rounded-full ${user.is_admin ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-100 text-slate-600 border-slate-200"}`} variant="outline">
                                            {user.is_admin ? "Admin" : "User"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`font-black text-[10px] uppercase tracking-widest px-2 py-0.5 ${user.is_verified
                                                    ? "bg-blue-50 text-blue-600 border-blue-100 shadow-sm"
                                                    : "bg-slate-50 text-slate-300 border-slate-200"
                                                    }`}
                                            >
                                                {user.is_verified ? "Verified" : "Unverified"}
                                            </Badge>
                                            {user.is_banned && (
                                                <Badge className="bg-red-50 text-red-600 border-red-100 font-black text-[10px] uppercase tracking-widest px-2 py-0.5 shadow-sm">Banned</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs font-bold uppercase">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-10 w-10 p-0 hover:bg-slate-100 rounded-xl transition-all">
                                                    <MoreHorizontal className="h-5 w-5 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl p-2 min-w-[200px]">
                                                <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400 px-3 py-2">Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => toggleVerification(user.id, user.is_verified)}>
                                                    {user.is_verified ? (
                                                        <>
                                                            <XCircle className="mr-2 h-4 w-4" /> Unverify
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Verify
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleBan(user.id, user.is_banned)}>
                                                    <AlertTriangle className="mr-2 h-4 w-4" /> {user.is_banned ? "Unban" : "Ban"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Shield className="mr-2 h-4 w-4" /> Change Role
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit User Profile</DialogTitle>
                            <DialogDescription>
                                Make changes to the user's profile information.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right">Username</Label>
                                <Input
                                    id="username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bio" className="text-right">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Input
                                    id="category"
                                    placeholder="e.g. Developer, Founder, etc."
                                    value={editForm.verification_category}
                                    onChange={(e) => setEditForm({ ...editForm, verification_category: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="verified"
                                        checked={editForm.is_verified}
                                        onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="verified">Verified Status</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="banned"
                                        checked={editForm.is_banned}
                                        onChange={(e) => setEditForm({ ...editForm, is_banned: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="banned" className="text-destructive">Banned Status</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateUser}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="text-destructive w-5 h-5" />
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will delete the profile of <span className="font-bold text-foreground">@{selectedUser?.username}</span> and all associated private data. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Profile
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
};

export default UsersPage;
