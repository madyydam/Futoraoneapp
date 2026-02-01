import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, QrCode, Ticket } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WaitlistTicketProps {
    ticketNumber: number;
    username: string;
    avatarUrl?: string;
}

export const WaitlistTicket: React.FC<WaitlistTicketProps> = React.memo(({ ticketNumber, username, avatarUrl }) => {
    return (
        <motion.div
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative w-full max-w-sm mx-auto perspective-1000"
        >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_40px_rgba(234,179,8,0.5)] text-black p-1 border-2 border-yellow-200">

                {/* Holographic Overlay Effect */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-shimmer" />

                <div className="relative bg-black/90 h-full rounded-xl p-6 text-white border border-yellow-500/30 flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold tracking-[0.2em] text-yellow-500 uppercase">FutoraOne</h2>
                            <h1 className="text-2xl font-black italic bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">GOLDEN TICKET</h1>
                        </div>
                        <Ticket className="w-8 h-8 text-yellow-500" />
                    </div>

                    {/* Content */}
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-yellow-500">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider">Futurist</p>
                            <p className="font-bold text-lg">{username}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-xs font-bold border border-yellow-500/50">
                                    VIP ACCESS
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Number */}
                    <div className="border-t border-dashed border-white/20 pt-6 flex justify-between items-end">
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Queue Position</p>
                            <div className="text-4xl font-mono font-bold text-yellow-400 tabular-nums">
                                #{ticketNumber.toString().padStart(4, '0')}
                            </div>
                        </div>
                        <QrCode className="w-12 h-12 text-white/80 opacity-80" />
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-2 right-4 flex items-center gap-1 text-[10px] text-yellow-500/50">
                        <Sparkles className="w-3 h-3" />
                        <span>VERIFIED</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});
