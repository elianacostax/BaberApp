import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorDisplayProps {
  error: any;
  retry?: () => void;
  isRetrying?: boolean;
}

export function ErrorDisplay({ error, retry, isRetrying = false }: ErrorDisplayProps) {
  const isTimeout = error?.isTimeout || error?.code === 'ECONNABORTED';
  const isRateLimit = error?.isRateLimit || error?.response?.status === 429;
  const isNetworkError = !navigator.onLine || error?.message?.includes('Network Error');

  const getErrorIcon = () => {
    if (isNetworkError) return <WifiOff className="h-4 w-4" />;
    if (isTimeout) return <Wifi className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getErrorMessage = () => {
    if (isNetworkError) {
      return "Sin conexión a internet. Verifica tu conexión y vuelve a intentar.";
    }
    if (isTimeout) {
      return "La solicitud tardó demasiado tiempo. Verifica tu conexión o intenta nuevamente.";
    }
    if (isRateLimit) {
      return "Demasiadas solicitudes. Espera un momento antes de intentar nuevamente.";
    }
    return error?.message || "Ocurrió un error inesperado. Intenta nuevamente.";
  };

  const getErrorTitle = () => {
    if (isNetworkError) return "Sin Conexión";
    if (isTimeout) return "Timeout";
    if (isRateLimit) return "Demasiadas Solicitudes";
    return "Error";
  };

  return (
    <Card className="card-premium">
      <CardContent className="p-6">
        <Alert variant="destructive">
          {getErrorIcon()}
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{getErrorTitle()}</h3>
                <p>{getErrorMessage()}</p>
              </div>
              {retry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retry}
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reintentando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </>
                  )}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function PageErrorDisplay({ error, retry, isRetrying = false }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-full max-w-md">
        <ErrorDisplay error={error} retry={retry} isRetrying={isRetrying} />
      </div>
    </div>
  );
}
