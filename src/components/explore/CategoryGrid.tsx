import { memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from "./exploreConstants";

interface CategoryGridProps {
    onCategoryClick: (name: string) => void;
}

export const CategoryGrid = memo(({ onCategoryClick }: CategoryGridProps) => (
    <section id="tech-categories">
        <h2 className="text-xl font-bold text-foreground mb-4">Tech Categories</h2>
        <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((category, index) => (
                <motion.div
                    key={category.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card
                        className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                        onClick={() => onCategoryClick(category.name)}
                    >
                        <CardContent className="p-3 flex items-center gap-2">
                            <div className={`${category.color} p-2.5 rounded-lg shrink-0`}>
                                <category.icon className="text-white" size={20} />
                            </div>
                            <span className="font-semibold text-foreground text-sm sm:text-base truncate min-w-0 flex-1" title={category.name}>
                                {category.name}
                            </span>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    </section>
));

CategoryGrid.displayName = "CategoryGrid";
