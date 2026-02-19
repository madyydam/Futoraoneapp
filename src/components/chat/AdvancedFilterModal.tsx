import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Filter, RotateCcw, BadgeCheck, ShieldAlert, Users, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface FilterOptions {
    sortBy: "active" | "members" | "newest";
    category: string[];
    verifiedOnly: boolean;
    publicOnly: boolean;
}

interface AdvancedFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: FilterOptions;
    onApply: (filters: FilterOptions) => void;
}

const CATEGORIES = ["Tech", "Development", "Education", "College", "Design", "Gaming", "Business", "General"];

export const AdvancedFilterModal = ({
    isOpen,
    onClose,
    filters: initialFilters,
    onApply
}: AdvancedFilterModalProps) => {
    const [localFilters, setLocalFilters] = React.useState<FilterOptions>(initialFilters);

    React.useEffect(() => {
        if (isOpen) setLocalFilters(initialFilters);
    }, [isOpen, initialFilters]);

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        setLocalFilters({
            sortBy: "active",
            category: [],
            verifiedOnly: false,
            publicOnly: false
        });
    };

    const toggleCategory = (cat: string) => {
        setLocalFilters(prev => ({
            ...prev,
            category: prev.category.includes(cat)
                ? prev.category.filter(c => c !== cat)
                : [...prev.category, cat]
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] rounded-[28px] p-0 overflow-hidden border-border/40 gap-0">
                <DialogHeader className="p-6 pb-4 bg-muted/20">
                    <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Filter className="w-5 h-5" />
                        </div>
                        Discover Filters
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto overflow-x-hidden no-scrollbar">
                    {/* Sort By */}
                    <div className="space-y-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Sort Hubs By
                        </Label>
                        <RadioGroup
                            value={localFilters.sortBy}
                            onValueChange={(val: any) => setLocalFilters(prev => ({ ...prev, sortBy: val }))}
                            className="grid grid-cols-1 gap-2"
                        >
                            {[
                                { id: "active", label: "Most Active", icon: Filter, desc: "High engagement hubs" },
                                { id: "members", label: "Most Members", icon: Users, desc: "Largest communities" },
                                { id: "newest", label: "Newest Joined", icon: Calendar, desc: "Recently launched" }
                            ].map((item) => (
                                <div key={item.id} className="relative">
                                    <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                                    <Label
                                        htmlFor={item.id}
                                        className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card/40 cursor-pointer transition-all peer-data-[state=checked]:border-primary/40 peer-data-[state=checked]:bg-primary/5 hover:bg-muted/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-background border border-border/50 text-muted-foreground group-peer-data-[state=checked]:text-primary">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">{item.label}</div>
                                                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                                            </div>
                                        </div>
                                        <div className="h-4 w-4 rounded-full border-2 border-primary/20 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary transition-all flex items-center justify-center">
                                            <div className="h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-data-[state=checked]:opacity-100" />
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Categories */}
                    <div className="space-y-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Categories
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-tighter uppercase transition-all border ${localFilters.category.includes(cat)
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Switches */}
                    <div className="space-y-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Verification & Security
                        </Label>
                        <div className="space-y-3">
                            <div
                                className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-card/30 cursor-pointer hover:bg-muted/20 transition-all"
                                onClick={() => setLocalFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                                        <BadgeCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">Verified Hubs Only</div>
                                        <div className="text-[10px] text-muted-foreground">Original endorsed communities</div>
                                    </div>
                                </div>
                                <Checkbox checked={localFilters.verifiedOnly} onCheckedChange={() => { }} className="rounded-md border-2" />
                            </div>

                            <div
                                className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-card/30 cursor-pointer hover:bg-muted/20 transition-all"
                                onClick={() => setLocalFilters(prev => ({ ...prev, publicOnly: !prev.publicOnly }))}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">Public Hubs Only</div>
                                        <div className="text-[10px] text-muted-foreground">Open for anyone to join</div>
                                    </div>
                                </div>
                                <Checkbox checked={localFilters.publicOnly} onCheckedChange={() => { }} className="rounded-md border-2" />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/10 border-t border-border/40 sm:justify-between flex-row items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground h-11 px-6 rounded-xl gap-2"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleApply}
                        className="flex-1 bg-gradient-to-r from-primary to-blue-600 text-[10px] font-black uppercase tracking-[0.2em] h-11 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-white"
                    >
                        Apply Filters
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
