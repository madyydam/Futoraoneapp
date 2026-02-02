import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FilterOption {
    label: string;
    value: string;
}

interface FilterSectionProps {
    title: string;
    options: string[] | FilterOption[];
    selectedValues: string[];
    onToggle: (value: string) => void;
}

const FilterSection = ({ title, options, selectedValues, onToggle }: FilterSectionProps) => (
    <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const label = typeof option === "string" ? option : option.label;
                const value = typeof option === "string" ? option : option.value;
                const isSelected = selectedValues.includes(value);

                return (
                    <Badge
                        key={value}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1 transition-all hover:scale-105 active:scale-95 ${isSelected
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "hover:bg-secondary text-muted-foreground"
                            }`}
                        onClick={() => onToggle(value)}
                    >
                        {label}
                        {isSelected && <X className="ml-1 w-3 h-3" />}
                    </Badge>
                );
            })}
        </div>
    </div>
);

interface MarketplaceFilterDrawerProps {
    type: "founder" | "gig";
    filters: {
        industry?: string[];
        stage?: string[];
        equity?: string[];
        category?: string[];
        priceRange?: string[];
        location?: string[];
    };
    onFilterChange: (key: string, value: string) => void;
    onReset: () => void;
}

export const MarketplaceFilterDrawer = ({ type, filters, onFilterChange, onReset }: MarketplaceFilterDrawerProps) => {
    const isFounder = type === "founder";

    const founderOptions = {
        industry: ["Fintech", "Edtech", "AI/ML", "SaaS", "HealthTech", "Gaming", "Crypto", "E-commerce"],
        stage: ["Idea Phase", "Prototype/MVP", "Early Revenue", "Growth", "Pre-seed", "Seed", "Series A+"],
        equity: ["< 1%", "1% - 5%", "5% - 10%", "10% - 20%", "> 20%"]
    };

    const gigOptions = {
        category: ["Development", "Design", "Marketing", "Writing", "Video", "Admin", "Voice-over"],
        priceRange: ["< ₹500", "₹500 - ₹2000", "₹2000 - ₹5000", "₹5000+"],
        location: ["Remote", "Hybrid", "On-site"]
    };

    const hasFilters = Object.values(filters).some(f => f && f.length > 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative border-primary/20 hover:border-primary/50 transition-colors">
                    <Filter className="w-4 h-4" />
                    Filters
                    {hasFilters && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-primary/10">
                <SheetHeader className="p-6 border-b border-primary/5">
                    <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Advanced Filters
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8">
                        {isFounder ? (
                            <>
                                <FilterSection
                                    title="Industry"
                                    options={founderOptions.industry}
                                    selectedValues={filters.industry || []}
                                    onToggle={(val) => onFilterChange("industry", val)}
                                />
                                <Separator className="bg-primary/5" />
                                <FilterSection
                                    title="Startup Stage"
                                    options={founderOptions.stage}
                                    selectedValues={filters.stage || []}
                                    onToggle={(val) => onFilterChange("stage", val)}
                                />
                                <Separator className="bg-primary/5" />
                                <FilterSection
                                    title="Equity Range"
                                    options={founderOptions.equity}
                                    selectedValues={filters.equity || []}
                                    onToggle={(val) => onFilterChange("equity", val)}
                                />
                            </>
                        ) : (
                            <>
                                <FilterSection
                                    title="Category"
                                    options={gigOptions.category}
                                    selectedValues={filters.category || []}
                                    onToggle={(val) => onFilterChange("category", val)}
                                />
                                <Separator className="bg-primary/5" />
                                <FilterSection
                                    title="Budget Range"
                                    options={gigOptions.priceRange}
                                    selectedValues={filters.priceRange || []}
                                    onToggle={(val) => onFilterChange("priceRange", val)}
                                />
                                <Separator className="bg-primary/5" />
                                <FilterSection
                                    title="Location"
                                    options={gigOptions.location}
                                    selectedValues={filters.location || []}
                                    onToggle={(val) => onFilterChange("location", val)}
                                />
                            </>
                        )}
                    </div>
                </ScrollArea>

                <SheetFooter className="p-6 border-t border-primary/5 bg-secondary/30">
                    <div className="flex w-full gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1 text-muted-foreground hover:text-foreground"
                            onClick={onReset}
                        >
                            Reset All
                        </Button>
                        <SheetClose asChild>
                            <Button className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                Apply
                            </Button>
                        </SheetClose>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
