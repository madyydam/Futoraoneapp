import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const PWAUpdateHandler = () => {
    const sw = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    const {
        offlineReady: [offlineReady, setOfflineReady] = [false, () => { }],
        needUpdate: [needUpdate, setNeedUpdate] = [false, () => { }],
        updateServiceWorker = () => { },
    } = sw || {};

    const close = () => {
        setOfflineReady(false);
        setNeedUpdate(false);
    };

    useEffect(() => {
        if (needUpdate) {
            toast({
                title: "FutoraOne Update Available",
                description: "A new version of FutoraOne is available. Refresh to update?",
                action: (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateServiceWorker(true)}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                ),
                duration: 10000,
            });
        }
    }, [needUpdate, updateServiceWorker]);

    return null;
};
