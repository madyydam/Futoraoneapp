import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    username: string;
    userId: string;
}

export const QRCodeDialog = ({ open, onOpenChange, username, userId }: QRCodeDialogProps) => {
    const { toast } = useToast();
    const profileUrl = `${window.location.origin}/profile/${userId}`;

    const handleDownload = () => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = `${username}-qr-code.png`;
            downloadLink.href = pngFile;
            downloadLink.click();

            toast({
                title: 'QR Code Downloaded',
                description: 'Your QR code has been saved.',
            });
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${username}'s Profile`,
                    text: `Check out my One profile!`,
                    url: profileUrl,
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(profileUrl);
            toast({
                title: 'Link Copied',
                description: 'Profile link copied to clipboard.',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Your Profile</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={profileUrl}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        Scan this QR code to visit @{username}'s profile
                    </p>
                    <div className="flex gap-2 w-full">
                        <Button onClick={handleDownload} variant="outline" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                        <Button onClick={handleShare} className="flex-1 gradient-primary text-white">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
