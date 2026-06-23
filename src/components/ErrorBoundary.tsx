import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Home, MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import i18n from "@/i18n";
import { copyTextToClipboard } from "@/lib/clipboard";
import { exportBackupData } from "@/components/BackupReminder";
import { toast } from "sonner";

const ADMIN_WHATSAPP = "6282124533265";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copying: boolean;
  backingUp: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null, copying: false, backingUp: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Captured error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  reload = (): void => {
    window.location.reload();
  };

  goHome = (): void => {
    window.location.href = "/";
  };

  buildErrorDetails = (): string => {
    const { error, errorInfo } = this.state;
    if (!error) return "";

    return [
      `Message: ${error.message}`,
      `Name: ${error.name}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Time: ${new Date().toISOString()}`,
      "",
      "Stack:",
      error.stack ?? "(no stack)",
      "",
      "Component Stack:",
      errorInfo?.componentStack ?? "(no component stack)",
    ].join("\n");
  };

  copyDetails = async (): Promise<void> => {
    const details = this.buildErrorDetails();
    if (!details) return;

    this.setState({ copying: true });
    try {
      const ok = await copyTextToClipboard(details);
      if (ok) {
        toast.success(i18n.t("common:error.copySuccess"));
      } else {
        window.prompt(i18n.t("common:error.copyPrompt"), details);
      }
    } finally {
      this.setState({ copying: false });
    }
  };

  contactAdmin = (): void => {
    const details = this.buildErrorDetails();
    const msg = encodeURIComponent(
      `${i18n.t("common:error.contactAdminMessage")}\n\n${details.slice(0, 500)}`,
    );
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, "_blank");
  };

  downloadBackup = async (): Promise<void> => {
    this.setState({ backingUp: true });
    try {
      await exportBackupData();
    } catch {
      toast.error(i18n.t("common:error.backupFailed"));
    } finally {
      this.setState({ backingUp: false });
    }
  };

  render(): ReactNode {
    const { error, errorInfo, copying, backingUp } = this.state;
    const { children, fallback } = this.props;

    if (!error) {
      return children;
    }

    if (fallback) {
      return fallback({ error, reset: this.reset });
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
        <div className="w-full max-w-lg space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{i18n.t("common:error.title")}</AlertTitle>
            <AlertDescription>
              {i18n.t("common:error.description")}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-background p-4">
            <div className="mb-2 text-sm font-medium">{i18n.t("common:error.details")}</div>
            <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs leading-relaxed">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
              {errorInfo?.componentStack ? `\n\nComponent stack:${errorInfo.componentStack}` : ""}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={this.reload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {i18n.t("common:error.reload")}
            </Button>
            <Button variant="outline" onClick={this.contactAdmin} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {i18n.t("common:error.contactAdmin")}
            </Button>
            <Button variant="secondary" onClick={this.copyDetails} disabled={copying} className="gap-2">
              <Copy className="h-4 w-4" />
              {i18n.t("common:error.copyDetails")}
            </Button>
            <Button variant="outline" onClick={this.goHome} className="gap-2">
              <Home className="h-4 w-4" />
              {i18n.t("common:error.goHome")}
            </Button>
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
            <p className="text-sm font-semibold">{i18n.t("common:error.backupTitle")}</p>
            <p className="text-xs text-muted-foreground">{i18n.t("common:error.backupDescription")}</p>
            <Button
              variant="outline"
              className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10"
              onClick={this.downloadBackup}
              disabled={backingUp}
            >
              <Download className="h-4 w-4" />
              {i18n.t("common:error.downloadBackup")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
